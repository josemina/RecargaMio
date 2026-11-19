// Reglas de HU-07 (hasta cinco tarjetas) y HU-03 (saldo e historial). Decisiones en ADR 0012.
import type { MedioPago, PrismaClient, Tarjeta, Alerta } from '@prisma/client';
import type { Logger } from 'pino';
import { registrarAuditoria } from '../../auditoria';
import { tarjetaInactiva, type ClienteRecaudo } from '../../integraciones/recaudo';
import { ErrorApi } from '../../middleware/errores';
import type { CifradorTarjeta } from '../../seguridad/cifradoTarjeta';

export const MAXIMO_TARJETAS = 5;

const NOMBRE_MEDIO: Record<MedioPago, string> = { NEQUI: 'Nequi', PSE: 'PSE', BANCOLOMBIA_TRANSFER: 'Bancolombia' };

const noEncontrada = () => new ErrorApi(404, 'TARJETA_NO_ENCONTRADA', 'La tarjeta no existe o no está registrada en tu cuenta.');

export interface Movimiento {
  tipo: 'RECARGA' | 'VIAJE';
  fecha: string;
  valor: number;
  descripcion: string;
  referencia?: string;
}

interface Dependencias {
  prisma: PrismaClient;
  recaudo: ClienteRecaudo;
  cifrador: CifradorTarjeta;
  logger: Logger;
}

export function crearServicioTarjetas({ prisma, recaudo, cifrador, logger }: Dependencias) {
  /** Saldo en vivo; si el recaudo falla se devuelve null (respuesta degradada, ADR 0012). */
  async function saldoSeguro(tarjeta: Tarjeta): Promise<number | null> {
    try {
      return (await recaudo.consultarTarjeta(cifrador.descifrar(tarjeta.numeroCifrado))).saldo;
    } catch (err) {
      logger.warn({ err, tarjetaId: tarjeta.id }, 'Saldo no disponible');
      return null;
    }
  }

  function vista(tarjeta: Tarjeta & { alerta: Alerta | null }, saldo: number | null) {
    const alerta = tarjeta.alerta ? { umbral: tarjeta.alerta.umbral, activa: tarjeta.alerta.activa } : null;
    return {
      id: tarjeta.id,
      alias: tarjeta.alias,
      ultimos4: tarjeta.ultimos4,
      saldo,
      // HU-05 CA-3: etiqueta «Saldo bajo» solo si el usuario configuró la alerta
      saldoBajo: Boolean(alerta?.activa && saldo !== null && saldo < alerta.umbral),
      alerta,
      creadaEn: tarjeta.creadaEn,
    };
  }

  async function tarjetaDelUsuario(usuarioId: string, id: string) {
    const tarjeta = await prisma.tarjeta.findFirst({ where: { id, usuarioId, activa: true }, include: { alerta: true } });
    if (!tarjeta) throw noEncontrada();
    return tarjeta;
  }

  return {
    /** HU-03 CA-1 y HU-07 CA-2. */
    async listar(usuarioId: string) {
      const tarjetas = await prisma.tarjeta.findMany({
        where: { usuarioId, activa: true },
        include: { alerta: true },
        orderBy: { creadaEn: 'asc' },
      });
      const saldos = await Promise.all(tarjetas.map(saldoSeguro));
      const recaudoDisponible = saldos.every((s) => s !== null);
      return {
        registradas: tarjetas.length,
        maximo: MAXIMO_TARJETAS,
        recaudoDisponible,
        ...(recaudoDisponible ? {} : { aviso: 'No pudimos consultar el saldo de algunas tarjetas. Intenta de nuevo en unos minutos.' }),
        tarjetas: tarjetas.map((t, i) => vista(t, saldos[i])),
      };
    },

    /** HU-07 CA-1 y CA-3. */
    async agregar(usuarioId: string, { numero, alias }: { numero: string; alias: string }, ip?: string) {
      const numeroHmac = cifrador.hmac(numero);

      const verificarReglas = async (bd: Pick<PrismaClient, 'tarjeta'>) => {
        const activas = await bd.tarjeta.count({ where: { usuarioId, activa: true } });
        if (activas >= MAXIMO_TARJETAS) {
          throw new ErrorApi(409, 'LIMITE_TARJETAS', `Ya tienes ${MAXIMO_TARJETAS} de ${MAXIMO_TARJETAS} tarjetas registradas. Para agregar una nueva, elimina una que ya no uses.`, {
            registradas: activas,
            maximo: MAXIMO_TARJETAS,
          });
        }
        const existente = await bd.tarjeta.findUnique({ where: { usuarioId_numeroHmac: { usuarioId, numeroHmac } } });
        if (existente?.activa) {
          throw new ErrorApi(409, 'TARJETA_YA_REGISTRADA', `Esta tarjeta ya está registrada en tu cuenta como «${existente.alias}».`);
        }
        return existente;
      };

      // 1. Reglas propias (rápido, sin bloqueo) y 2. validación en el recaudo
      await verificarReglas(prisma);
      const enRecaudo = await recaudo.consultarTarjeta(numero);
      if (!enRecaudo.activa) throw tarjetaInactiva();

      // 3. Se vuelven a verificar dentro de una transacción con bloqueo por usuario,
      //    para que dos peticiones simultáneas no pasen el límite de cinco.
      const tarjeta = await prisma.$transaction(async (tx) => {
        await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtext(${usuarioId}))::text`;
        const existente = await verificarReglas(tx);
        const protegido = cifrador.proteger(numero);
        const guardada = existente
          ? await tx.tarjeta.update({ where: { id: existente.id }, data: { ...protegido, alias, activa: true }, include: { alerta: true } })
          : await tx.tarjeta.create({ data: { usuarioId, alias, ...protegido }, include: { alerta: true } });
        await registrarAuditoria(tx, 'TARJETA_AGREGADA', usuarioId, {
          tarjetaId: guardada.id,
          ultimos4: guardada.ultimos4,
          reactivada: Boolean(existente),
          ip: ip ?? null,
        });
        return guardada;
      });
      const registradas = await prisma.tarjeta.count({ where: { usuarioId, activa: true } });
      return { tarjeta: vista(tarjeta, enRecaudo.saldo), registradas, maximo: MAXIMO_TARJETAS };
    },

    /** Detalle de la pantalla 2.3. */
    async detalle(usuarioId: string, id: string) {
      const tarjeta = await tarjetaDelUsuario(usuarioId, id);
      const [saldo, ultima] = await Promise.all([
        saldoSeguro(tarjeta),
        prisma.recarga.findFirst({ where: { tarjetaId: id, estado: 'ACREDITADA' }, orderBy: { acreditadaEn: 'desc' } }),
      ]);
      return {
        ...vista(tarjeta, saldo),
        ultimaRecarga: ultima ? { fecha: ultima.acreditadaEn, monto: ultima.monto, medioPago: NOMBRE_MEDIO[ultima.medioPago] } : null,
      };
    },

    /** HU-07 CA-4. */
    async renombrar(usuarioId: string, id: string, alias: string, ip?: string) {
      const tarjeta = await tarjetaDelUsuario(usuarioId, id);
      const actualizada = await prisma.tarjeta.update({ where: { id: tarjeta.id }, data: { alias }, include: { alerta: true } });
      await registrarAuditoria(prisma, 'TARJETA_RENOMBRADA', usuarioId, { tarjetaId: id, ultimos4: tarjeta.ultimos4, ip: ip ?? null });
      return vista(actualizada, await saldoSeguro(actualizada));
    },

    /** HU-07 CA-4. Borrado lógico: la tarjeta deja de contar y de verse, pero su historial se conserva (ADR 0012). */
    async eliminar(usuarioId: string, id: string, ip?: string) {
      const tarjeta = await tarjetaDelUsuario(usuarioId, id);
      await prisma.tarjeta.update({ where: { id: tarjeta.id }, data: { activa: false } });
      await registrarAuditoria(prisma, 'TARJETA_ELIMINADA', usuarioId, { tarjetaId: id, ultimos4: tarjeta.ultimos4, ip: ip ?? null });
    },

    /** HU-03 CA-2 y CA-3: recargas (base de RecargaMIO) y viajes (recaudo), del más reciente al más antiguo. */
    async movimientos(usuarioId: string, id: string, { tipo, limite, antesDe }: { tipo: 'todo' | 'recargas' | 'viajes'; limite: number; antesDe?: Date }) {
      const tarjeta = await tarjetaDelUsuario(usuarioId, id);
      let viajesDisponibles = true;

      const recargas: Movimiento[] =
        tipo === 'viajes'
          ? []
          : (
              await prisma.recarga.findMany({
                where: { tarjetaId: id, estado: 'ACREDITADA', ...(antesDe ? { acreditadaEn: { lt: antesDe } } : {}) },
                orderBy: { acreditadaEn: 'desc' },
                take: limite,
              })
            ).map((r) => ({
              tipo: 'RECARGA',
              fecha: (r.acreditadaEn ?? r.iniciadaEn).toISOString(),
              valor: r.monto,
              descripcion: `Recarga con ${NOMBRE_MEDIO[r.medioPago]}`,
              referencia: r.referencia,
            }));

      let viajes: Movimiento[] = [];
      if (tipo !== 'recargas') {
        try {
          viajes = (await recaudo.listarViajes(cifrador.descifrar(tarjeta.numeroCifrado), { hasta: antesDe, limite })).map((v) => ({
            tipo: 'VIAJE',
            fecha: v.fecha.toISOString(),
            valor: -v.valor,
            descripcion: `Viaje · ${v.ruta}`,
          }));
        } catch (err) {
          logger.warn({ err, tarjetaId: id }, 'Viajes no disponibles');
          viajesDisponibles = false;
        }
      }

      const movimientos = [...recargas, ...viajes].sort((a, b) => Date.parse(b.fecha) - Date.parse(a.fecha)).slice(0, limite);
      return {
        tarjeta: { id: tarjeta.id, alias: tarjeta.alias, ultimos4: tarjeta.ultimos4 },
        tipo,
        movimientos,
        siguienteCursor: movimientos.length === limite ? movimientos[movimientos.length - 1].fecha : null,
        ...(viajesDisponibles ? {} : { aviso: 'No pudimos consultar los viajes en este momento. Se muestran solo las recargas.' }),
      };
    },
  };
}

export type ServicioTarjetas = ReturnType<typeof crearServicioTarjetas>;
