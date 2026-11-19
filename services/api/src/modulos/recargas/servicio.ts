// Recargas (HU-01, HU-02, HU-04) con pasarela de pagos, webhook y reconciliación (ADR 0013).
// Regla 3: el saldo se acredita solo cuando la pasarela confirma APPROVED, y siempre de forma idempotente por referencia.
import { randomBytes } from 'node:crypto';
import { Prisma, type EstadoRecarga, type MedioPago, type PrismaClient, type Recarga } from '@prisma/client';
import type { Logger } from 'pino';
import { registrarAuditoria } from '../../auditoria';
import type { DatosMedio, EventoPasarela, Pasarela, Transaccion } from '../../integraciones/pasarela/tipos';
import { tarjetaInactiva, type ClienteRecaudo } from '../../integraciones/recaudo';
import { ErrorApi } from '../../middleware/errores';
import type { CifradorTarjeta } from '../../seguridad/cifradoTarjeta';
import type { ServicioNotificaciones } from '../notificaciones/servicio';
import type { ServicioTarjetas } from '../tarjetas/servicio';
import type { DatosRecarga } from './esquemas';

const NOMBRE_MEDIO: Record<MedioPago, string> = { NEQUI: 'Nequi', PSE: 'PSE', BANCOLOMBIA_TRANSFER: 'Bancolombia' };
const pesos = (valor: number) => `$${new Intl.NumberFormat('es-CO').format(valor)}`;
const VENTANA_DUPLICADO_MS = 60 * 1000;
const ESPERA_RECONCILIACION_MS = 20 * 1000;

interface Dependencias {
  prisma: PrismaClient;
  pasarela: Pasarela;
  recaudo: ClienteRecaudo;
  cifrador: CifradorTarjeta;
  tarjetas: ServicioTarjetas;
  notificaciones: ServicioNotificaciones;
  logger: Logger;
  ahora: () => Date;
  urlRetorno: string;
}

type RecargaConTarjeta = Recarga & { tarjeta: { alias: string } | null };

function mensaje(r: RecargaConTarjeta): string {
  const tarjeta = `${r.tarjeta?.alias ?? 'la tarjeta'} •••• ${r.numeroDestino.slice(-4)}`;
  switch (r.estado as EstadoRecarga) {
    case 'PENDIENTE':
      return r.medioPago === 'NEQUI'
        ? `Autoriza el pago de ${pesos(r.monto)} en la app de Nequi. No cierres esta pantalla.`
        : `Completa el pago de ${pesos(r.monto)} en la página de tu banco y vuelve a RecargaMIO.`;
    case 'APROBADA':
      return 'Pago aprobado. Estamos acreditando el saldo en tu tarjeta.';
    case 'ACREDITADA':
      return `Se acreditaron ${pesos(r.monto)} a ${tarjeta}.`;
    case 'RECHAZADA':
      return 'Tu banco no aprobó el pago. El saldo de tu tarjeta no cambió y no se hizo ningún cobro.';
    case 'FALLA_ACREDITACION':
      return 'Tu pago fue aprobado y estamos terminando de acreditar el saldo. No necesitas pagar de nuevo.';
    default:
      return 'No se pudo completar el pago. El saldo de tu tarjeta no cambió.';
  }
}

/** Vista de la recarga para la app: pantallas 3.3, 3.4 y 3.5. Nunca incluye el número completo ni datos bancarios. */
export function vistaRecarga(r: RecargaConTarjeta) {
  const ultimos4 = r.numeroDestino.slice(-4);
  return {
    id: r.id,
    referencia: r.referencia,
    estado: r.estado,
    mensaje: mensaje(r),
    monto: r.monto,
    total: r.monto, // HU-01 CA-2: el total a pagar es el monto (sin comisiones en el prototipo)
    medioPago: NOMBRE_MEDIO[r.medioPago],
    destino: { ultimos4, alias: r.tarjeta?.alias ?? null, tercero: !r.tarjetaId },
    urlPago: r.estado === 'PENDIENTE' ? r.urlPago : null,
    motivo: r.motivo,
    iniciadaEn: r.iniciadaEn,
    confirmadaEn: r.confirmadaEn,
    acreditadaEn: r.acreditadaEn,
    tiempoSegundos: r.acreditadaEn ? Math.round((r.acreditadaEn.getTime() - r.iniciadaEn.getTime()) / 100) / 10 : null,
    comprobante:
      r.estado === 'ACREDITADA'
        ? { referencia: r.referencia, fecha: r.acreditadaEn, medioPago: NOMBRE_MEDIO[r.medioPago], monto: r.monto, nuevoSaldo: r.saldoResultante, tarjeta: `MIO •••• ${ultimos4}` }
        : null,
  };
}

function medioParaPasarela(datos: DatosRecarga): DatosMedio {
  switch (datos.medioPago) {
    case 'NEQUI':
      return { tipo: 'NEQUI', celular: datos.datosMedio.celular };
    case 'PSE':
      return {
        tipo: 'PSE',
        tipoPersona: datos.datosMedio.tipoPersona === 'NATURAL' ? 0 : 1,
        tipoDocumento: datos.datosMedio.tipoDocumento,
        numeroDocumento: datos.datosMedio.numeroDocumento,
        codigoBanco: datos.datosMedio.codigoBanco,
        celular: datos.datosMedio.celular,
      };
    case 'BANCOLOMBIA_TRANSFER':
      return { tipo: 'BANCOLOMBIA_TRANSFER' };
  }
}

/** Solo se guarda lo necesario del evento: nunca el método de pago (celular, documento). Regla 2. */
function eventoSaneado(evento: EventoPasarela | undefined, tx: Transaccion, origen: string) {
  const t = evento?.data.transaction;
  return {
    origen,
    event: evento?.event ?? null,
    environment: evento?.environment ?? null,
    timestamp: evento?.timestamp ?? null,
    transaction: {
      id: tx.id,
      reference: tx.referencia,
      status: tx.estado,
      status_message: tx.motivo ?? null,
      amount_in_cents: tx.montoCentavos,
      payment_method_type: (t?.payment_method_type as string | undefined) ?? null,
    },
  };
}

export function crearServicioRecargas({ prisma, pasarela, recaudo, cifrador, tarjetas, notificaciones, logger, ahora, urlRetorno }: Dependencias) {
  const conTarjeta = { tarjeta: { select: { alias: true } } } as const;
  const buscar = (id: string) => prisma.recarga.findUniqueOrThrow({ where: { id }, include: conTarjeta });

  async function siguienteReferencia() {
    const [{ n }] = await prisma.$queryRaw<{ n: bigint }[]>`SELECT nextval('recarga_referencia_seq') AS n`;
    const referencia = `RM-${String(n).padStart(6, '0')}`;
    return { referencia, referenciaPasarela: `${referencia}-${randomBytes(2).toString('hex').toUpperCase()}` };
  }

  /** Acredita en el recaudo. Idempotente: el recaudo no suma dos veces la misma referencia. */
  async function acreditar(id: string) {
    const r = await prisma.recarga.findUniqueOrThrow({ where: { id } });
    if (r.estado !== 'APROBADA' && r.estado !== 'FALLA_ACREDITACION') return;
    try {
      const { saldo } = await recaudo.acreditar(r.numeroDestino, r.monto, r.referencia);
      const acreditadaEn = ahora();
      const { count } = await prisma.recarga.updateMany({
        where: { id, estado: { in: ['APROBADA', 'FALLA_ACREDITACION'] } },
        data: { estado: 'ACREDITADA', acreditadaEn, saldoResultante: saldo },
      });
      if (count > 0) {
        const segundos = (acreditadaEn.getTime() - r.iniciadaEn.getTime()) / 1000;
        await registrarAuditoria(prisma, 'RECARGA_ACREDITADA', r.usuarioId, { referencia: r.referencia, monto: r.monto, segundos });
        logger.info({ referencia: r.referencia, segundos }, 'Recarga acreditada');
        // Aviso «Recarga exitosa» de la pantalla 4.3 (ADR 0014). Si falla, la recarga ya quedó acreditada.
        await notificaciones
          .notificar(r.usuarioId, { tipo: 'RECARGA_EXITOSA', titulo: 'Recarga exitosa', cuerpo: mensaje(await buscar(id)), datos: { recargaId: id } })
          .catch((err) => logger.warn({ err, referencia: r.referencia }, 'No se pudo registrar el aviso de recarga exitosa'));
      }
    } catch (err) {
      await prisma.recarga.updateMany({ where: { id, estado: 'APROBADA' }, data: { estado: 'FALLA_ACREDITACION' } });
      logger.error({ err, referencia: r.referencia }, 'No se pudo acreditar en el recaudo; se reintentará en la reconciliación');
    }
  }

  /** Aplica un estado informado por la pasarela (webhook o reconciliación). Es idempotente. */
  async function procesarTransaccion(recarga: Recarga, tx: Transaccion, origen: 'webhook' | 'reconciliacion' | 'creacion' | 'consulta', evento?: EventoPasarela) {
    if (recarga.idTransaccion && tx.id !== recarga.idTransaccion) {
      logger.warn({ referencia: recarga.referencia }, 'La transacción no corresponde a la recarga; se ignora');
      return;
    }
    try {
      await prisma.transaccionPasarela.create({
        data: {
          recargaId: recarga.id,
          idExterno: tx.id,
          estado: tx.estado,
          checksumEvento: evento?.signature.checksum ?? null,
          cuerpo: eventoSaneado(evento, tx, origen),
          recibidaEn: ahora(),
        },
      });
    } catch (err) {
      // El mismo estado de la misma transacción ya se registró: evento repetido (RNF-02)
      if (!(err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002')) throw err;
    }

    const desdePendiente = { id: recarga.id, estado: 'PENDIENTE' as const };
    switch (tx.estado) {
      case 'APPROVED': {
        if (tx.montoCentavos !== recarga.monto * 100) {
          await prisma.recarga.updateMany({ where: desdePendiente, data: { estado: 'ERROR', motivo: 'El monto aprobado no coincide con el de la recarga' } });
          await registrarAuditoria(prisma, 'MONTO_NO_COINCIDE', recarga.usuarioId, { referencia: recarga.referencia, esperado: recarga.monto * 100, recibido: tx.montoCentavos });
          logger.error({ referencia: recarga.referencia }, 'Monto aprobado distinto al de la recarga: no se acredita');
          return;
        }
        await prisma.recarga.updateMany({ where: desdePendiente, data: { estado: 'APROBADA', confirmadaEn: ahora(), idTransaccion: tx.id, urlPago: null } });
        await acreditar(recarga.id);
        return;
      }
      case 'DECLINED': {
        const { count } = await prisma.recarga.updateMany({ where: desdePendiente, data: { estado: 'RECHAZADA', motivo: tx.motivo ?? 'Pago rechazado', urlPago: null } });
        if (count) await registrarAuditoria(prisma, 'RECARGA_RECHAZADA', recarga.usuarioId, { referencia: recarga.referencia, motivo: tx.motivo ?? null });
        return;
      }
      case 'ERROR':
      case 'VOIDED': {
        const { count } = await prisma.recarga.updateMany({ where: desdePendiente, data: { estado: 'ERROR', motivo: tx.motivo ?? 'Error en la pasarela', urlPago: null } });
        if (count) await registrarAuditoria(prisma, 'RECARGA_ERROR', recarga.usuarioId, { referencia: recarga.referencia, motivo: tx.motivo ?? null });
        return;
      }
      case 'PENDING':
        if (tx.urlPago && !recarga.urlPago) await prisma.recarga.updateMany({ where: desdePendiente, data: { urlPago: tx.urlPago } });
    }
  }

  return {
    procesarTransaccion,
    acreditar,

    /** HU-01, HU-02 y HU-04: valida, crea la recarga PENDIENTE e inicia el pago en la pasarela. */
    async crear(usuarioId: string, datos: DatosRecarga, ip?: string) {
      if (datos.aceptaTerminosPasarela !== true) {
        throw new ErrorApi(400, 'TERMINOS_PASARELA_NO_ACEPTADOS', 'Para pagar debes aceptar los términos y la autorización de datos de la pasarela de pagos.');
      }
      const usuario = await prisma.usuario.findUniqueOrThrow({ where: { id: usuarioId } });

      // Destino: tarjeta propia o de un tercero (HU-04)
      let tarjetaId: string | null = null;
      let numeroDestino: string;
      if (datos.tarjetaId) {
        const tarjeta = await prisma.tarjeta.findFirst({ where: { id: datos.tarjetaId, usuarioId, activa: true } });
        if (!tarjeta) throw new ErrorApi(404, 'TARJETA_NO_ENCONTRADA', 'La tarjeta no existe o no está registrada en tu cuenta.');
        tarjetaId = tarjeta.id;
        numeroDestino = cifrador.descifrar(tarjeta.numeroCifrado);
      } else {
        // HU-04 CA-1: el número se confirma antes de pagar
        if (datos.numeroDestino !== datos.confirmacionNumero) {
          throw new ErrorApi(400, 'NUMEROS_NO_COINCIDEN', 'Los dos números de la tarjeta de destino no coinciden. Revísalos antes de pagar.');
        }
        numeroDestino = datos.numeroDestino!;
      }

      // La tarjeta debe existir y estar activa en el recaudo antes de cobrar
      const enRecaudo = await recaudo.consultarTarjeta(numeroDestino);
      if (!enRecaudo.activa) throw tarjetaInactiva();

      // HU-04 CA-2: la tarjeta del tercero solo se guarda si el usuario lo pide
      if (!tarjetaId && datos.guardarTarjeta) {
        const existente = await prisma.tarjeta.findUnique({ where: { usuarioId_numeroHmac: { usuarioId, numeroHmac: cifrador.hmac(numeroDestino) } } });
        tarjetaId = existente?.activa
          ? existente.id
          : (await tarjetas.agregar(usuarioId, { numero: numeroDestino, alias: datos.aliasTarjeta ?? `Tarjeta •••• ${numeroDestino.slice(-4)}` }, ip)).tarjeta.id;
      }

      // Doble clic en «Pagar»: no se crea una segunda recarga idéntica pendiente
      const previa = await prisma.recarga.findFirst({
        where: {
          usuarioId,
          numeroDestino,
          monto: datos.monto,
          medioPago: datos.medioPago,
          estado: 'PENDIENTE',
          iniciadaEn: { gt: new Date(ahora().getTime() - VENTANA_DUPLICADO_MS) },
        },
      });
      if (previa) {
        throw new ErrorApi(409, 'RECARGA_EN_CURSO', 'Ya tienes una recarga igual en curso. Espera su resultado antes de intentar de nuevo.', { recargaId: previa.id });
      }

      const { referencia, referenciaPasarela } = await siguienteReferencia();
      const recarga = await prisma.recarga.create({
        data: { referencia, referenciaPasarela, usuarioId, tarjetaId, numeroDestino, monto: datos.monto, medioPago: datos.medioPago, iniciadaEn: ahora() },
      });
      await registrarAuditoria(prisma, 'RECARGA_INICIADA', usuarioId, {
        referencia,
        monto: datos.monto,
        medioPago: datos.medioPago,
        destino: `••••${numeroDestino.slice(-4)}`,
        tercero: !datos.tarjetaId,
        ip: ip ?? null,
      });

      let transaccion: Transaccion;
      try {
        transaccion = await pasarela.crearTransaccion({
          referencia: referenciaPasarela,
          montoCentavos: datos.monto * 100,
          correo: usuario.correo,
          nombre: usuario.nombre,
          descripcion: `Recarga MIO ${referencia}`.slice(0, 30),
          medio: medioParaPasarela(datos),
          urlRetorno,
          ip,
        });
      } catch (err) {
        await prisma.recarga.update({ where: { id: recarga.id }, data: { estado: 'ERROR', motivo: 'No se pudo iniciar el pago en la pasarela' } });
        throw err instanceof ErrorApi ? err : new ErrorApi(502, 'PASARELA_NO_DISPONIBLE', 'No pudimos comunicarnos con la pasarela de pagos. No se hizo ningún cobro.');
      }

      await prisma.recarga.update({ where: { id: recarga.id }, data: { idTransaccion: transaccion.id, urlPago: transaccion.urlPago ?? null } });
      if (transaccion.estado !== 'PENDING') {
        await procesarTransaccion(await prisma.recarga.findUniqueOrThrow({ where: { id: recarga.id } }), transaccion, 'creacion');
      }
      return vistaRecarga(await buscar(recarga.id));
    },

    /** Estado de la recarga (pantalla 3.3). Con `actualizar`, consulta la pasarela («Actualizar estado»). */
    async obtener(usuarioId: string, id: string, actualizar = false) {
      const recarga = await prisma.recarga.findFirst({ where: { id, usuarioId }, include: conTarjeta });
      if (!recarga) throw new ErrorApi(404, 'RECARGA_NO_ENCONTRADA', 'La recarga no existe.');
      if (actualizar && recarga.estado === 'PENDIENTE' && recarga.idTransaccion) {
        try {
          await procesarTransaccion(recarga, await pasarela.consultarTransaccion(recarga.idTransaccion), 'consulta');
        } catch (err) {
          logger.warn({ err, referencia: recarga.referencia }, 'No se pudo consultar la pasarela');
        }
        return vistaRecarga(await buscar(id));
      }
      if (actualizar && (recarga.estado === 'APROBADA' || recarga.estado === 'FALLA_ACREDITACION')) {
        await acreditar(id);
        return vistaRecarga(await buscar(id));
      }
      return vistaRecarga(recarga);
    },

    /** Reconciliación (decisión D8): funciona aunque el webhook no llegue. */
    async reconciliar() {
      const resumen = { consultadas: 0, reintentosAcreditacion: 0 };
      const pendientes = await prisma.recarga.findMany({
        where: { estado: 'PENDIENTE', idTransaccion: { not: null }, iniciadaEn: { lt: new Date(ahora().getTime() - ESPERA_RECONCILIACION_MS) } },
        orderBy: { iniciadaEn: 'asc' },
        take: 50,
      });
      for (const r of pendientes) {
        try {
          await procesarTransaccion(r, await pasarela.consultarTransaccion(r.idTransaccion!), 'reconciliacion');
          resumen.consultadas += 1;
        } catch (err) {
          logger.warn({ err, referencia: r.referencia }, 'Reconciliación: no se pudo consultar la transacción');
        }
      }
      const porAcreditar = await prisma.recarga.findMany({ where: { estado: { in: ['APROBADA', 'FALLA_ACREDITACION'] } }, take: 50 });
      for (const r of porAcreditar) {
        await acreditar(r.id);
        resumen.reintentosAcreditacion += 1;
      }
      return resumen;
    },
  };
}

export type ServicioRecargas = ReturnType<typeof crearServicioRecargas>;
