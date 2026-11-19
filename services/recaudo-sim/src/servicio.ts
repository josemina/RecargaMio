// Reglas del recaudo simulado: consulta de tarjetas, créditos idempotentes y viajes.
import { Prisma, type PrismaClient } from '../generated/prisma';
import { ErrorRecaudo } from './errores';
import { VALOR_PASAJE } from './semilla';

export interface ResultadoCredito {
  referencia: string;
  numero: string;
  monto: number;
  saldo: number;
  acreditadoEn: Date;
  duplicado: boolean;
}

const tarjetaNoExiste = () => new ErrorRecaudo(404, 'TARJETA_NO_EXISTE', 'La tarjeta MIO no existe en el recaudo.');
const tarjetaInactiva = () => new ErrorRecaudo(422, 'TARJETA_INACTIVA', 'La tarjeta MIO está inactiva o bloqueada.');

function esReferenciaDuplicada(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002';
}

export function crearServicioRecaudo(prisma: PrismaClient) {
  async function buscarTarjeta(numero: string) {
    const tarjeta = await prisma.tarjetaRecaudo.findUnique({ where: { numero } });
    if (!tarjeta) throw tarjetaNoExiste();
    return tarjeta;
  }

  /** Devuelve el crédito ya aplicado con esa referencia, o un 409 si los datos no coinciden. */
  async function resultadoExistente(referencia: string, numero: string, monto: number): Promise<ResultadoCredito | null> {
    const credito = await prisma.credito.findUnique({ where: { referencia } });
    if (!credito) return null;
    if (credito.numero !== numero || credito.monto !== monto) {
      throw new ErrorRecaudo(
        409,
        'REFERENCIA_EN_CONFLICTO',
        'La referencia ya se usó para un crédito con otra tarjeta u otro monto.',
      );
    }
    return {
      referencia,
      numero,
      monto,
      saldo: credito.saldoResultante,
      acreditadoEn: credito.acreditadoEn,
      duplicado: true,
    };
  }

  /**
   * Acredita una sola vez por referencia. Si dos peticiones llegan a la vez, la restricción
   * única de `credito.referencia` hace fallar la segunda transacción y su suma se revierte.
   */
  async function acreditar(numero: string, monto: number, referencia: string): Promise<ResultadoCredito> {
    const previo = await resultadoExistente(referencia, numero, monto);
    if (previo) return previo;

    try {
      return await prisma.$transaction(async (tx) => {
        const tarjeta = await tx.tarjetaRecaudo.findUnique({ where: { numero } });
        if (!tarjeta) throw tarjetaNoExiste();
        if (!tarjeta.activa) throw tarjetaInactiva();

        const actualizada = await tx.tarjetaRecaudo.update({
          where: { numero },
          data: { saldo: { increment: monto } },
        });
        const credito = await tx.credito.create({
          data: { referencia, numero, monto, saldoResultante: actualizada.saldo },
        });
        return { referencia, numero, monto, saldo: actualizada.saldo, acreditadoEn: credito.acreditadoEn, duplicado: false };
      });
    } catch (error) {
      if (esReferenciaDuplicada(error)) {
        const existente = await resultadoExistente(referencia, numero, monto);
        if (existente) return existente;
      }
      throw error;
    }
  }

  /** Descuenta un pasaje. El saldo puede quedar negativo (ADR 0010). */
  async function registrarViaje(numero: string, ruta: string) {
    return prisma.$transaction(async (tx) => {
      const tarjeta = await tx.tarjetaRecaudo.findUnique({ where: { numero } });
      if (!tarjeta) throw tarjetaNoExiste();
      if (!tarjeta.activa) throw tarjetaInactiva();

      const actualizada = await tx.tarjetaRecaudo.update({
        where: { numero },
        data: { saldo: { decrement: VALOR_PASAJE } },
      });
      const viaje = await tx.viaje.create({ data: { numero, ruta, valor: VALOR_PASAJE } });
      return { numero, ruta, valor: viaje.valor, fecha: viaje.fecha, saldo: actualizada.saldo };
    });
  }

  /** Viajes del más reciente al más antiguo. `desde` es inclusivo y `hasta` exclusivo (para paginar). */
  async function listarViajes(numero: string, { desde, hasta }: { desde?: Date; hasta?: Date }, limite: number) {
    await buscarTarjeta(numero);
    const viajes = await prisma.viaje.findMany({
      where: { numero, ...(desde || hasta ? { fecha: { ...(desde ? { gte: desde } : {}), ...(hasta ? { lt: hasta } : {}) } } : {}) },
      orderBy: { fecha: 'desc' },
      take: limite,
      select: { id: true, ruta: true, valor: true, fecha: true },
    });
    return { numero, viajes };
  }

  return { buscarTarjeta, acreditar, registrarViaje, listarViajes };
}

export type ServicioRecaudo = ReturnType<typeof crearServicioRecaudo>;
