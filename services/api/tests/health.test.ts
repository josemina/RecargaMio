import pino from 'pino';
import request from 'supertest';
import { crearApp } from '../src/app';
import { cargarConfiguracion } from '../src/config';
import { crearCorreoMemoria } from '../src/integraciones/correo';
import { crearPasarelaSimulada } from '../src/integraciones/pasarela/simulada';
import { crearRecaudoMemoria } from '../src/integraciones/recaudo';
import { configPruebas, crearEntorno, crearPrismaPruebas } from './utilidades';

const prisma = crearPrismaPruebas();
afterAll(() => prisma.$disconnect());

describe('GET /health', () => {
  it('responde 200 cuando la base de datos está disponible', async () => {
    const { app } = crearEntorno(prisma);
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ estado: 'ok', servicio: 'api', baseDatos: 'ok' });
  });

  it('responde 503 cuando la base de datos no responde', async () => {
    const app = crearApp({
      logger: pino({ level: 'silent' }),
      prisma,
      config: configPruebas,
      correo: crearCorreoMemoria(),
      recaudo: crearRecaudoMemoria(),
      pasarela: crearPasarelaSimulada({ secretoEventos: 'test_events_x', urlPublica: 'http://localhost:3000' }),
      verificarBase: async () => {
        throw new Error('sin conexión');
      },
    });
    const res = await request(app).get('/health');
    expect(res.status).toBe(503);
    expect(res.body.baseDatos).toBe('sin conexión');
  });
});

describe('Errores', () => {
  it('una ruta inexistente devuelve el formato único de error', async () => {
    const res = await request(crearEntorno(prisma).app).get('/no-existe');
    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: { codigo: 'NO_ENCONTRADO', mensaje: expect.any(String) } });
  });

  it('incluye encabezados de seguridad de helmet y oculta x-powered-by', async () => {
    const res = await request(crearEntorno(prisma).app).get('/health');
    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.headers['x-powered-by']).toBeUndefined();
  });
});

describe('Configuración', () => {
  const base = {
    DATABASE_URL: 'postgresql://x',
    TARJETA_LLAVE_CIFRADO: 'a'.repeat(64),
    TARJETA_LLAVE_HMAC: 'b'.repeat(64),
    JWT_SECRETO_ACCESO: 'x'.repeat(32),
    JWT_SECRETO_RENOVACION: 'y'.repeat(32),
    RECAUDO_API_KEY: 'z'.repeat(16),
  };

  it('falla con un mensaje claro si falta DATABASE_URL', () => {
    expect(() => cargarConfiguracion({ ...base, DATABASE_URL: undefined })).toThrow(/DATABASE_URL/);
  });

  it('exige las llaves del número de tarjeta', () => {
    expect(() => cargarConfiguracion({ ...base, TARJETA_LLAVE_CIFRADO: undefined })).toThrow(/TARJETA_LLAVE_CIFRADO/);
  });

  it('exige secretos JWT de al menos 32 caracteres y distintos entre sí', () => {
    expect(() => cargarConfiguracion({ ...base, JWT_SECRETO_ACCESO: 'corto' })).toThrow(/JWT_SECRETO_ACCESO/);
    expect(() => cargarConfiguracion({ ...base, JWT_SECRETO_RENOVACION: base.JWT_SECRETO_ACCESO })).toThrow(/distintos/);
  });

  it('aplica valores por defecto', () => {
    const config = cargarConfiguracion(base);
    expect(config.PORT).toBe(3000);
    expect(config.NODE_ENV).toBe('development');
    expect(config.SMTP_PORT).toBe(1025);
  });
});
