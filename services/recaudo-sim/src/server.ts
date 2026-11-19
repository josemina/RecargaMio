// Punto de entrada del simulador de recaudo.
import pino from 'pino';
import { PrismaClient } from '../generated/prisma';
import { crearApp } from './app';
import { cargarConfiguracion } from './config';

const config = cargarConfiguracion();
const logger = pino({ level: config.NIVEL_REGISTRO });
const prisma = new PrismaClient();
// Aviso a la API después de cada viaje (ADR 0014), con la misma llave compartida y un tiempo máximo de 3 s
const avisarViaje = config.API_AVISOS_URL
  ? async (numero: string) => {
      const respuesta = await fetch(config.API_AVISOS_URL!, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Api-Key': config.RECAUDO_API_KEY },
        body: JSON.stringify({ numero }),
        signal: AbortSignal.timeout(3000),
      });
      if (!respuesta.ok) throw new Error(`La API respondió ${respuesta.status}`);
    }
  : undefined;

const app = crearApp({ logger, prisma, apiKey: config.RECAUDO_API_KEY, avisarViaje });

const servidor = app.listen(config.PORT, () => {
  logger.info({ puerto: config.PORT }, 'Simulador de recaudo escuchando');
});

async function apagar(senal: string) {
  logger.info({ senal }, 'Apagando el simulador de recaudo');
  servidor.close();
  await prisma.$disconnect();
  process.exit(0);
}

process.on('SIGTERM', () => void apagar('SIGTERM'));
process.on('SIGINT', () => void apagar('SIGINT'));
