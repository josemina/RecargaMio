// Ayudas compartidas por las pruebas de la API.
import { PrismaClient } from '@prisma/client';
import pino from 'pino';
import request from 'supertest';
import { crearApp } from '../src/app';
import { cargarConfiguracion } from '../src/config';
import { crearCorreoMemoria } from '../src/integraciones/correo';
import { crearPasarelaSimulada } from '../src/integraciones/pasarela/simulada';
import { crearPushMemoria } from '../src/integraciones/push';
import { crearRecaudoMemoria } from '../src/integraciones/recaudo';

export const configPruebas = cargarConfiguracion({
  DATABASE_URL: 'postgresql://no-se-usa',
  TARJETA_LLAVE_CIFRADO: 'a'.repeat(64),
  TARJETA_LLAVE_HMAC: 'b'.repeat(64),
  JWT_SECRETO_ACCESO: 'secreto-de-acceso-solo-para-pruebas-123',
  JWT_SECRETO_RENOVACION: 'secreto-de-renovacion-solo-para-pruebas-456',
  API_URL_PUBLICA: 'http://localhost:3000',
  RECAUDO_API_KEY: 'llave-recaudo-de-pruebas-123',
});

export function crearPrismaPruebas() {
  return new PrismaClient({ datasourceUrl: process.env.DATABASE_URL_PRUEBAS });
}

/** Reloj controlable: las pruebas lo adelantan para simular vencimientos. */
export function crearReloj(inicio = new Date('2026-11-17T12:00:00Z')) {
  let actual = inicio;
  return {
    ahora: () => actual,
    adelantar: (ms: number) => {
      actual = new Date(actual.getTime() + ms);
    },
  };
}

export function crearEntorno(prisma: PrismaClient, { limitarPeticiones = false } = {}) {
  const reloj = crearReloj();
  const correo = crearCorreoMemoria();
  const recaudo = crearRecaudoMemoria(TARJETAS_RECAUDO_PRUEBAS);
  // Sin demora: cada prueba decide cuándo la pasarela llega al estado final (pasarela.finalizar)
  const pasarela = crearPasarelaSimulada({ secretoEventos: configPruebas.WOMPI_SECRETO_EVENTOS, urlPublica: configPruebas.API_URL_PUBLICA, ahora: reloj.ahora });
  const push = crearPushMemoria();
  const app = crearApp({ logger: pino({ level: 'silent' }), prisma, config: configPruebas, correo, recaudo, pasarela, push, ahora: reloj.ahora, limitarPeticiones });
  return { app, reloj, correo, recaudo, pasarela, push };
}

/** Mismas tarjetas que la semilla de recaudo-sim. */
export const TARJETAS_RECAUDO_PRUEBAS = {
  '1234564821': { saldo: 12400 },
  '1234567730': { saldo: 3200 },
  '9087654321': { saldo: 1000 },
  '1234560001': { saldo: 8000 },
  '1234560002': { saldo: 20000 },
  '1234560003': { saldo: 6000 },
  '1234560009': { saldo: 0, activa: false },
};

export async function limpiarBase(prisma: PrismaClient) {
  await prisma.$executeRawUnsafe('TRUNCATE TABLE usuario, token_recuperacion, auditoria, recarga, transaccion_pasarela RESTART IDENTITY CASCADE');
}

export const USUARIO = {
  nombre: 'Viviana Andrade Torres',
  correo: 'viviana@recargamio.test',
  contrasena: 'MiClave2026',
  aceptaPolitica: true,
};

/** Registra al usuario de prueba y devuelve la respuesta (tokens incluidos). */
export async function registrar(app: Parameters<typeof request>[0], datos: Partial<typeof USUARIO> = {}) {
  return request(app).post('/auth/registro').send({ ...USUARIO, ...datos });
}

export const ingresar = (app: Parameters<typeof request>[0], contrasena = USUARIO.contrasena, correo = USUARIO.correo) =>
  request(app).post('/auth/ingreso').send({ correo, contrasena });
