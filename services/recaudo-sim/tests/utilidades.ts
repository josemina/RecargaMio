// Ayudas compartidas por las pruebas del simulador.
import pino from 'pino';
import { PrismaClient } from '../generated/prisma';
import { crearApp } from '../src/app';
import { aplicarSemilla } from '../src/semilla';

export const API_KEY_PRUEBAS = 'llave-de-pruebas-1234567890';
export const encabezados = { 'X-Api-Key': API_KEY_PRUEBAS };

export function crearPrismaPruebas() {
  return new PrismaClient({ datasourceUrl: process.env.DATABASE_URL_PRUEBAS });
}

export function crearAppPruebas(prisma: PrismaClient, aleatorio?: () => number, avisarViaje?: (numero: string) => Promise<void>) {
  return crearApp({ logger: pino({ level: 'silent' }), prisma, apiKey: API_KEY_PRUEBAS, aleatorio, avisarViaje });
}

/** Deja la base de pruebas con los datos semilla y sin créditos. */
export async function reiniciarBase(prisma: PrismaClient) {
  await aplicarSemilla(prisma, { reiniciar: true });
}
