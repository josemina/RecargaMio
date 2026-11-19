// Pasarela simulada con el mismo contrato y los mismos datos de prueba de Wompi Sandbox (ADR 0013).
// Se usa mientras el equipo no tenga las llaves del Sandbox, en las pruebas automatizadas y en demostraciones sin Internet.
//   Nequi: 3991111111 aprueba · 3992222222 rechaza · otro número → ERROR
//   PSE:   banco "1" aprueba · banco "2" rechaza · otro → ERROR
//   Bancolombia: aprueba
import { randomBytes } from 'node:crypto';
import { checksumEvento } from './firmas';
import type { EstadoPasarela, EventoPasarela, Pasarela, SolicitudTransaccion, Transaccion } from './tipos';

interface Opciones {
  secretoEventos: string;
  urlPublica: string;
  /** Tiempo hasta el estado final. Si es 0 o no hay `enviarEvento`, el estado final se aplica con `finalizar`. */
  demoraMs?: number;
  /** Envía el evento al webhook, como lo haría Wompi. */
  enviarEvento?: (evento: EventoPasarela) => Promise<void>;
  ahora?: () => Date;
}

function resultadoEsperado({ medio }: SolicitudTransaccion): { estado: EstadoPasarela; motivo: string | null } {
  switch (medio.tipo) {
    case 'NEQUI':
      if (medio.celular === '3991111111') return { estado: 'APPROVED', motivo: null };
      if (medio.celular === '3992222222') return { estado: 'DECLINED', motivo: 'El usuario rechazó el pago en Nequi' };
      return { estado: 'ERROR', motivo: 'Número de Nequi no válido en el entorno de pruebas' };
    case 'PSE':
      if (medio.codigoBanco === '1') return { estado: 'APPROVED', motivo: null };
      if (medio.codigoBanco === '2') return { estado: 'DECLINED', motivo: 'Fondos insuficientes' };
      return { estado: 'ERROR', motivo: 'Banco no válido en el entorno de pruebas' };
    case 'BANCOLOMBIA_TRANSFER':
      return { estado: 'APPROVED', motivo: null };
  }
}

export function crearPasarelaSimulada({ secretoEventos, urlPublica, demoraMs = 0, enviarEvento, ahora = () => new Date() }: Opciones) {
  const transacciones = new Map<string, Transaccion & { final: { estado: EstadoPasarela; motivo: string | null }; tipo: string }>();

  function construirEvento(t: Transaccion & { tipo: string }): EventoPasarela {
    const evento = {
      event: 'transaction.updated',
      data: {
        transaction: {
          id: t.id,
          reference: t.referencia,
          status: t.estado,
          status_message: t.motivo ?? null,
          amount_in_cents: t.montoCentavos,
          currency: 'COP',
          payment_method_type: t.tipo,
        },
      },
      environment: 'test',
      signature: { properties: ['transaction.id', 'transaction.status', 'transaction.amount_in_cents'], checksum: '' },
      timestamp: Math.floor(ahora().getTime() / 1000),
      sent_at: ahora().toISOString(),
    };
    evento.signature.checksum = checksumEvento(evento, secretoEventos).toUpperCase();
    return evento;
  }

  /** Lleva la transacción a su estado final y devuelve el evento firmado. */
  function finalizar(id: string): EventoPasarela {
    const t = transacciones.get(id);
    if (!t) throw new Error(`Transacción simulada desconocida: ${id}`);
    t.estado = t.final.estado;
    t.motivo = t.final.motivo;
    t.urlPago = null;
    return construirEvento(t);
  }

  const vista = ({ final: _final, tipo: _tipo, ...t }: Transaccion & { final: unknown; tipo: string }): Transaccion => ({ ...t });

  const pasarela: Pasarela & { finalizar: typeof finalizar; construirEvento: (id: string) => EventoPasarela } = {
    nombre: 'simulada',
    finalizar,
    construirEvento: (id) => construirEvento(transacciones.get(id)!),

    async terminos() {
      return {
        aceptacion: `${urlPublica}/pasarela-simulada/terminos`,
        datosPersonales: `${urlPublica}/pasarela-simulada/datos-personales`,
      };
    },

    async bancosPse() {
      return [
        { codigo: '1', nombre: 'Banco que aprueba' },
        { codigo: '2', nombre: 'Banco que rechaza' },
      ];
    },

    async crearTransaccion(solicitud) {
      const id = `sim-${randomBytes(6).toString('hex')}`;
      const asincrono = solicitud.medio.tipo !== 'NEQUI';
      const t = {
        id,
        referencia: solicitud.referencia,
        estado: 'PENDING' as EstadoPasarela,
        montoCentavos: solicitud.montoCentavos,
        motivo: null,
        urlPago: asincrono ? `${urlPublica}/pasarela-simulada/banco/${id}` : null,
        final: resultadoEsperado(solicitud),
        tipo: solicitud.medio.tipo,
      };
      transacciones.set(id, t);
      if (demoraMs > 0 && enviarEvento) {
        setTimeout(() => {
          void enviarEvento(finalizar(id)).catch(() => undefined);
        }, demoraMs).unref();
      }
      return vista(t);
    },

    async consultarTransaccion(id) {
      const t = transacciones.get(id);
      if (!t) throw new Error(`Transacción simulada desconocida: ${id}`);
      return vista(t);
    },
  };
  return pasarela;
}

export type PasarelaSimulada = ReturnType<typeof crearPasarelaSimulada>;
