// Aplica la semilla del recaudo simulado sin borrar datos existentes (idempotente).
import { PrismaClient } from '../generated/prisma';
import { aplicarSemilla } from '../src/semilla';

const prisma = new PrismaClient();

aplicarSemilla(prisma)
  .then((resumen) => console.log('Seed del recaudo aplicado:', JSON.stringify(resumen)))
  .catch((error) => {
    console.error('Error al aplicar el seed del recaudo:', error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
