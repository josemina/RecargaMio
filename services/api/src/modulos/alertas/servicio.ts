// Alertas de saldo bajo (HU-05, ADR 0014).
// Se revisan cada 5 minutos y justo después de cada viaje que informa el recaudo.
// Regla de negocio: como máximo un aviso cada 12 horas por tarjeta.
import type { Alerta, PrismaClient, Tarjeta } from '@prisma/client';
import type { Logger } from 'pino';
import { registrarAuditoria } from '../../auditoria';
import type { ClienteRecaudo } from '../../integraciones/recaudo';
import { ErrorApi } from '../../middleware/errores';
import type { CifradorTarjeta } from '../../seguridad/cifradoTarjeta';
import type { ServicioNotificaciones } from '../notificaciones/servicio';
import type { ServicioTarjetas } from '../tarjetas/servicio';

export const VENTANA_AVISO_MS = 12 * 60 * 60 * 1000;
const PASAJE = 3500;

const formato = new Intl.NumberFormat('es-CO');
const pesos = (valor: number) => `${valor < 0 ? '-' : ''}$${formato.format(Math.abs(valor))}`;

/** Texto de la pantalla 4.3 de Figma, ajustado a cuánto saldo queda. */
export function textoSaldoBajo(alias: string, saldo: number, umbral: number) {
  const detalle =
    saldo < PASAJE
      ? 'no alcanza para un pasaje'
      : saldo < 2 * PASAJE
        ? 'menos de un pasaje de ida y vuelta'
        : `menos de los ${pesos(umbral)} que elegiste`;
  return { titulo: `Saldo bajo en ${alias}`, cuerpo: `Te quedan ${pesos(saldo)}, ${detalle}. Toca para recargarla.` };
}

interface Dependencias {
  prisma: PrismaClient;
  recaudo: ClienteRecaudo;
  cifrador: CifradorTarjeta;
  tarjetas: ServicioTarjetas;
  notificaciones: ServicioNotificaciones;
  logger: Logger;
  ahora: () => Date;
}

type AlertaConTarjeta = Alerta & { tarjeta: Tarjeta };

export function crearServicioAlertas({ prisma, recaudo, cifrador, tarjetas, notificaciones, logger, ahora }: Dependencias) {
  // Solo alertas activas de tarjetas activas de cuentas vigentes
  const alertasVigentes = { activa: true, tarjeta: { activa: true, usuario: { eliminadoEn: null } } } as const;

  /** Avisa si el saldo está por debajo del umbral y ya pasaron 12 horas. Devuelve true si avisó. */
  async function evaluar(alerta: AlertaConTarjeta, saldo: number) {
    if (saldo >= alerta.umbral) return false;
    const limite = new Date(ahora().getTime() - VENTANA_AVISO_MS);
    // Reserva condicional: si dos revisiones coinciden, solo una gana y se envía un único aviso
    const { count } = await prisma.alerta.updateMany({
      where: { id: alerta.id, activa: true, umbral: alerta.umbral, OR: [{ ultimaNotificacion: null }, { ultimaNotificacion: { lte: limite } }] },
      data: { ultimaNotificacion: ahora() },
    });
    if (count === 0) return false;
    await notificaciones.notificar(alerta.tarjeta.usuarioId, {
      tipo: 'SALDO_BAJO',
      ...textoSaldoBajo(alerta.tarjeta.alias, saldo, alerta.umbral),
      datos: { tarjetaId: alerta.tarjetaId },
    });
    logger.info({ tarjetaId: alerta.tarjetaId }, 'Aviso de saldo bajo');
    return true;
  }

  /** Revisa un grupo de alertas consultando cada número una sola vez en el recaudo. */
  async function revisar(alertas: AlertaConTarjeta[]) {
    const saldos = new Map<string, number | null>();
    let avisos = 0;
    let sinSaldo = 0;
    for (const alerta of alertas) {
      const clave = alerta.tarjeta.numeroHmac;
      if (!saldos.has(clave)) {
        try {
          saldos.set(clave, (await recaudo.consultarTarjeta(cifrador.descifrar(alerta.tarjeta.numeroCifrado))).saldo);
        } catch (err) {
          logger.warn({ err, tarjetaId: alerta.tarjetaId }, 'No se pudo consultar el saldo para la alerta');
          saldos.set(clave, null);
        }
      }
      const saldo = saldos.get(clave);
      if (saldo === null || saldo === undefined) {
        sinSaldo += 1;
        continue;
      }
      if (await evaluar(alerta, saldo)) avisos += 1;
    }
    return { revisadas: alertas.length, avisos, sinSaldo };
  }

  return {
    /** HU-05 CA-1 y CA-4: fijar el valor de la alerta o desactivarla. */
    async configurar(usuarioId: string, tarjetaId: string, { umbral, activa }: { umbral: number; activa: boolean }, ip?: string) {
      const tarjeta = await prisma.tarjeta.findFirst({ where: { id: tarjetaId, usuarioId, activa: true }, include: { alerta: true } });
      if (!tarjeta) throw new ErrorApi(404, 'TARJETA_NO_ENCONTRADA', 'La tarjeta no existe o no está registrada en tu cuenta.');
      const previa = tarjeta.alerta;
      // Si cambia el valor o se vuelve a activar, la ventana de 12 horas empieza de nuevo (ADR 0014)
      const reiniciar = !previa || previa.umbral !== umbral || (!previa.activa && activa);
      await prisma.alerta.upsert({
        where: { tarjetaId },
        create: { tarjetaId, umbral, activa },
        update: { umbral, activa, ...(reiniciar ? { ultimaNotificacion: null } : {}) },
      });
      await registrarAuditoria(prisma, 'ALERTA_CONFIGURADA', usuarioId, { tarjetaId, ultimos4: tarjeta.ultimos4, umbral, activa, ip: ip ?? null });
      return tarjetas.detalle(usuarioId, tarjetaId);
    },

    /** Tarea de cada 5 minutos. */
    async revisarTodas() {
      const alertas = await prisma.alerta.findMany({ where: alertasVigentes, include: { tarjeta: true } });
      return revisar(alertas);
    },

    /** Después de un viaje: revisa las alertas de ese número en todas las cuentas que lo tengan registrado. */
    async revisarNumero(numero: string) {
      const alertas = await prisma.alerta.findMany({
        where: { ...alertasVigentes, tarjeta: { ...alertasVigentes.tarjeta, numeroHmac: cifrador.hmac(numero) } },
        include: { tarjeta: true },
      });
      return revisar(alertas);
    },
  };
}

export type ServicioAlertas = ReturnType<typeof crearServicioAlertas>;
