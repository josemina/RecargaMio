// Devuelve las tarjetas de la validación con usuarios (T11, ADR 0019) a su saldo inicial y borra sus créditos y viajes.
// Lo llama `npm run demo:limpiar` después de exportar los resultados. No toca ninguna otra tarjeta.
import { PrismaClient } from '../generated/prisma';
import { TARJETAS_VALIDACION } from '../src/semilla';

const prisma = new PrismaClient();
const numeros = TARJETAS_VALIDACION.map((t) => t.numero);

prisma
  .$transaction(async (tx) => {
    const creditos = await tx.credito.deleteMany({ where: { numero: { in: numeros } } });
    const viajes = await tx.viaje.deleteMany({ where: { numero: { in: numeros } } });
    for (const tarjeta of TARJETAS_VALIDACION) {
      await tx.tarjetaRecaudo.upsert({
        where: { numero: tarjeta.numero },
        update: { saldo: tarjeta.saldo, activa: tarjeta.activa },
        create: tarjeta,
      });
    }
    return { tarjetas: numeros.length, creditos: creditos.count, viajes: viajes.count };
  })
  .then((r) => console.log(`Recaudo: ${r.tarjetas} tarjetas de la validación reiniciadas (${r.creditos} créditos y ${r.viajes} viajes borrados).`))
  .catch((error) => {
    console.error('No se pudieron reiniciar las tarjetas de la validación:', error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
