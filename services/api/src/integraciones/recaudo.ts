// Cliente del sistema de recaudo (en el prototipo, el servicio recaudo-sim).
// Traduce sus respuestas a los códigos de error de la API. Nunca registra el número completo de la tarjeta.
import type { Logger } from 'pino';
import { z } from 'zod';
import { ErrorApi } from '../middleware/errores';

export interface EstadoTarjetaRecaudo {
  numero: string;
  activa: boolean;
  saldo: number;
}

export interface ViajeRecaudo {
  id: string;
  ruta: string;
  valor: number;
  fecha: Date;
}

export interface ClienteRecaudo {
  consultarTarjeta(numero: string): Promise<EstadoTarjetaRecaudo>;
  /** Viajes del más reciente al más antiguo, anteriores a `hasta` (exclusivo). */
  listarViajes(numero: string, opciones: { hasta?: Date; limite: number }): Promise<ViajeRecaudo[]>;
  /** Acredita el saldo. Idempotente por referencia: repetirla no suma dos veces (regla 3). */
  acreditar(numero: string, monto: number, referencia: string): Promise<{ saldo: number; duplicado: boolean }>;
}

export const tarjetaNoExiste = () =>
  new ErrorApi(422, 'TARJETA_NO_EXISTE', 'El número no corresponde a una tarjeta MIO. Revisa los 10 dígitos del reverso de la tarjeta.');
export const tarjetaInactiva = () =>
  new ErrorApi(422, 'TARJETA_INACTIVA', 'La tarjeta MIO está inactiva o bloqueada en el sistema de recaudo.');
export const recaudoNoDisponible = () =>
  new ErrorApi(503, 'RECAUDO_NO_DISPONIBLE', 'No pudimos comunicarnos con el sistema de recaudo del MIO. Intenta de nuevo en unos minutos.');

const enmascarar = (numero: string) => `••••${numero.slice(-4)}`;

// Las respuestas del recaudo también se validan (regla 5): un servicio externo puede cambiar o fallar.
const esquemaTarjeta = z.object({ activa: z.boolean(), saldo: z.number().int() });
const esquemaCredito = z.object({ saldo: z.number().int(), duplicado: z.boolean() });
const esquemaViajes = z.object({
  viajes: z.array(z.object({ id: z.string(), ruta: z.string(), valor: z.number().int(), fecha: z.coerce.date() })),
});

export function crearClienteRecaudoHttp({ url, apiKey, logger, tiempoMaximoMs = 3000 }: { url: string; apiKey: string; logger: Logger; tiempoMaximoMs?: number }): ClienteRecaudo {
  const base = url.replace(/\/$/, '');

  async function pedir<T>(ruta: string, numero: string, esquema: z.ZodType<T>, cuerpo?: unknown): Promise<T> {
    let respuesta: Response;
    try {
      respuesta = await fetch(`${base}${ruta}`, {
        method: cuerpo ? 'POST' : 'GET',
        headers: { 'X-Api-Key': apiKey, ...(cuerpo ? { 'Content-Type': 'application/json' } : {}) },
        body: cuerpo ? JSON.stringify(cuerpo) : undefined,
        signal: AbortSignal.timeout(tiempoMaximoMs),
      });
    } catch (err) {
      logger.warn({ err, tarjeta: enmascarar(numero) }, 'El recaudo no respondió');
      throw recaudoNoDisponible();
    }
    if (respuesta.status === 404) throw tarjetaNoExiste();
    if (respuesta.status === 422) throw tarjetaInactiva();
    if (!respuesta.ok) {
      logger.error({ estado: respuesta.status, tarjeta: enmascarar(numero) }, 'Respuesta inesperada del recaudo');
      throw recaudoNoDisponible();
    }
    const datos = esquema.safeParse(await respuesta.json().catch(() => null));
    if (!datos.success) {
      logger.error({ tarjeta: enmascarar(numero) }, 'El recaudo respondió con un formato inesperado');
      throw recaudoNoDisponible();
    }
    return datos.data;
  }

  return {
    async consultarTarjeta(numero) {
      const datos = await pedir(`/tarjetas/${numero}`, numero, esquemaTarjeta);
      return { numero, activa: datos.activa, saldo: datos.saldo };
    },
    async listarViajes(numero, { hasta, limite }) {
      const parametros = new URLSearchParams({ limite: String(limite), ...(hasta ? { hasta: hasta.toISOString() } : {}) });
      return (await pedir(`/tarjetas/${numero}/viajes?${parametros}`, numero, esquemaViajes)).viajes;
    },
    async acreditar(numero, monto, referencia) {
      return pedir(`/tarjetas/${numero}/creditos`, numero, esquemaCredito, { monto, referencia });
    },
  };
}

/** Recaudo en memoria para las pruebas automatizadas. */
export function crearRecaudoMemoria(inicial: Record<string, { saldo: number; activa?: boolean }> = {}) {
  const tarjetas = structuredClone(inicial);
  const viajes: Record<string, ViajeRecaudo[]> = {};
  const estado = { caido: false };
  const creditos = new Map<string, { numero: string; monto: number; saldo: number }>();
  const cliente: ClienteRecaudo & {
    estado: typeof estado;
    agregarViaje: (numero: string, viaje: Omit<ViajeRecaudo, 'id'>) => void;
    fijarSaldo: (numero: string, saldo: number) => void;
  } = {
    estado,
    fijarSaldo(numero, saldo) {
      tarjetas[numero].saldo = saldo;
    },
    agregarViaje(numero, viaje) {
      (viajes[numero] ??= []).push({ id: `v-${numero}-${viaje.fecha.getTime()}`, ...viaje });
    },
    async consultarTarjeta(numero) {
      if (estado.caido) throw recaudoNoDisponible();
      const t = tarjetas[numero];
      if (!t) throw tarjetaNoExiste();
      return { numero, activa: t.activa ?? true, saldo: t.saldo };
    },
    async listarViajes(numero, { hasta, limite }) {
      if (estado.caido) throw recaudoNoDisponible();
      if (!tarjetas[numero]) throw tarjetaNoExiste();
      return (viajes[numero] ?? [])
        .filter((v) => !hasta || v.fecha < hasta)
        .sort((a, b) => b.fecha.getTime() - a.fecha.getTime())
        .slice(0, limite);
    },
    async acreditar(numero, monto, referencia) {
      if (estado.caido) throw recaudoNoDisponible();
      const previo = creditos.get(referencia);
      if (previo) return { saldo: previo.saldo, duplicado: true };
      const t = tarjetas[numero];
      if (!t) throw tarjetaNoExiste();
      if (t.activa === false) throw tarjetaInactiva();
      t.saldo += monto;
      creditos.set(referencia, { numero, monto, saldo: t.saldo });
      return { saldo: t.saldo, duplicado: false };
    },
  };
  return cliente;
}
