import request from 'supertest';
import { cargarConfiguracion } from '../src/config';
import { crearAppPruebas, crearPrismaPruebas } from './utilidades';

const prisma = crearPrismaPruebas();
const app = crearAppPruebas(prisma);

afterAll(() => prisma.$disconnect());

describe('GET /health', () => {
  it('responde 200 sin llave y verifica la base', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ estado: 'ok', servicio: 'recaudo-sim', baseDatos: 'ok' });
  });
});

describe('Configuración', () => {
  const base = { DATABASE_URL: 'postgresql://x' };

  it('exige una RECAUDO_API_KEY de al menos 16 caracteres', () => {
    expect(() => cargarConfiguracion({ ...base, RECAUDO_API_KEY: 'corta' })).toThrow(/RECAUDO_API_KEY/);
  });

  it('exige DATABASE_URL', () => {
    expect(() => cargarConfiguracion({ RECAUDO_API_KEY: 'x'.repeat(16) })).toThrow(/DATABASE_URL/);
  });

  it('usa el puerto 4000 por defecto', () => {
    expect(cargarConfiguracion({ ...base, RECAUDO_API_KEY: 'x'.repeat(16) }).PORT).toBe(4000);
  });
});
