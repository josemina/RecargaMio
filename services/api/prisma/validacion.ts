// Cuentas de la validación con usuarios (T11, ADR 0019).
// Cada participante crea su cuenta durante la sesión con un correo de prueba asignado: p01@usuarios.test … p15@usuarios.test.
// Así no se guarda ningún dato personal real (Ley 1581 de 2012).
//
//   tsx prisma/validacion.ts exportar   imprime en JSON, sin correos ni nombres, las recargas de cada participante
//   tsx prisma/validacion.ts limpiar    borra por completo esas cuentas y sus recargas (son datos de prueba)
//
// Lo llaman `npm run demo:exportar` y `npm run demo:limpiar` (scripts/demo.mjs). Nunca toca a Viviana ni a otras cuentas.
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';

const DOMINIO = '@usuarios.test';
const PATRON_CORREO = /^p(\d{2})@usuarios\.test$/;

const accion = z.enum(['exportar', 'limpiar']).parse(process.argv[2]);
const prisma = new PrismaClient();

async function participantes() {
  const usuarios = await prisma.usuario.findMany({
    where: { correo: { startsWith: 'p', endsWith: DOMINIO } },
    select: { id: true, correo: true, creadoEn: true },
  });
  return usuarios
    .map((u) => ({ ...u, codigo: PATRON_CORREO.exec(u.correo)?.[1] }))
    .filter((u): u is typeof u & { codigo: string } => u.codigo !== undefined)
    .sort((a, b) => a.codigo.localeCompare(b.codigo));
}

const segundos = (desde: Date, hasta: Date | null) => (hasta ? Math.round((hasta.getTime() - desde.getTime()) / 100) / 10 : null);

async function exportar() {
  const lista = await participantes();
  const datos = [];
  for (const p of lista) {
    const recargas = await prisma.recarga.findMany({
      where: { usuarioId: p.id },
      orderBy: { iniciadaEn: 'asc' },
      select: { medioPago: true, monto: true, estado: true, iniciadaEn: true, acreditadaEn: true, tarjetaId: true },
    });
    const tarjetas = await prisma.tarjeta.count({ where: { usuarioId: p.id } });
    datos.push({
      participante: `P${p.codigo}`,
      cuentaCreadaEn: p.creadoEn.toISOString(),
      tarjetas,
      recargas: recargas.map((r) => ({
        medioPago: r.medioPago,
        monto: r.monto,
        estado: r.estado,
        aTercero: r.tarjetaId === null,
        iniciadaEn: r.iniciadaEn.toISOString(),
        acreditadaEn: r.acreditadaEn?.toISOString() ?? null,
        // Métrica clave del proyecto: tiempo de recarga = acreditadaEn − iniciadaEn
        segundosRecarga: segundos(r.iniciadaEn, r.acreditadaEn),
      })),
    });
  }
  // Una sola línea de JSON en la salida estándar: la lee scripts/demo.mjs
  process.stdout.write(`${JSON.stringify(datos)}\n`);
}

async function limpiar() {
  const lista = await participantes();
  const ids = lista.map((p) => p.id);
  if (ids.length === 0) {
    console.log('No hay cuentas de participantes para borrar.');
    return;
  }
  const resumen = await prisma.$transaction(async (tx) => {
    const recargas = await tx.recarga.findMany({ where: { usuarioId: { in: ids } }, select: { id: true } });
    const idsRecargas = recargas.map((r) => r.id);
    await tx.transaccionPasarela.deleteMany({ where: { recargaId: { in: idsRecargas } } });
    await tx.recarga.deleteMany({ where: { id: { in: idsRecargas } } });
    // Las alertas se borran en cascada con las tarjetas; sesiones, dispositivos, avisos y enlaces de recuperación, con el usuario
    const tarjetas = await tx.tarjeta.deleteMany({ where: { usuarioId: { in: ids } } });
    await tx.autorizacionDatos.deleteMany({ where: { usuarioId: { in: ids } } });
    await tx.auditoria.deleteMany({ where: { usuarioId: { in: ids } } });
    await tx.pqr.deleteMany({ where: { usuarioId: { in: ids } } });
    const usuarios = await tx.usuario.deleteMany({ where: { id: { in: ids } } });
    return { usuarios: usuarios.count, tarjetas: tarjetas.count, recargas: idsRecargas.length };
  });
  console.log(`API: cuentas de participantes borradas: ${resumen.usuarios} (con ${resumen.tarjetas} tarjetas y ${resumen.recargas} recargas).`);
}

(accion === 'exportar' ? exportar() : limpiar())
  .catch((error) => {
    console.error(`No se pudo ${accion} la validación:`, error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
