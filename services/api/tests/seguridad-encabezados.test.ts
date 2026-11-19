// T8 · Encabezados de seguridad corregidos a partir del escaneo de OWASP ZAP (ADR 0016).
import { createHash } from 'node:crypto';
import pino from 'pino';
import request from 'supertest';
import { crearApp } from '../src/app';
import { crearCorreoMemoria } from '../src/integraciones/correo';
import { crearPasarelaSimulada } from '../src/integraciones/pasarela/simulada';
import { crearRecaudoMemoria } from '../src/integraciones/recaudo';
import { configPruebas, crearEntorno, crearPrismaPruebas, TARJETAS_RECAUDO_PRUEBAS } from './utilidades';

const prisma = crearPrismaPruebas();
afterAll(() => prisma.$disconnect());

function appConCors(origenes: string[]) {
  const config = { ...configPruebas, CORS_ORIGENES: origenes };
  return crearApp({
    logger: pino({ level: 'silent' }),
    prisma,
    config,
    correo: crearCorreoMemoria(),
    recaudo: crearRecaudoMemoria(TARJETAS_RECAUDO_PRUEBAS),
    pasarela: crearPasarelaSimulada({ secretoEventos: config.WOMPI_SECRETO_EVENTOS, urlPublica: config.API_URL_PUBLICA }),
    limitarPeticiones: false,
  });
}

describe('T8 · Encabezados de seguridad (hallazgos de ZAP)', () => {
  it('las respuestas JSON no permiten cargar nada ni enmarcarse, y fijan Permissions-Policy y el aislamiento entre orígenes', async () => {
    const r = await request(crearEntorno(prisma).app).get('/health');
    expect(r.headers['content-security-policy']).toBe("default-src 'none';frame-ancestors 'none';base-uri 'none';form-action 'none'");
    expect(r.headers['permissions-policy']).toContain('camera=()');
    expect(r.headers['cross-origin-embedder-policy']).toBe('require-corp');
    expect(r.headers['cross-origin-opener-policy']).toBe('same-origin');
    expect(r.headers['cross-origin-resource-policy']).toBe('same-origin');
  });

  it('por defecto no hay CORS: ningún sitio web puede leer la API desde un navegador (10098)', async () => {
    const r = await request(crearEntorno(prisma).app).get('/health').set('Origin', 'https://sitio-ajeno.example');
    expect(r.headers['access-control-allow-origin']).toBeUndefined();
  });

  it('con CORS_ORIGENES, solo los orígenes configurados reciben CORS', async () => {
    const app = appConCors(['http://localhost:8081']);
    const permitido = await request(app).get('/health').set('Origin', 'http://localhost:8081');
    expect(permitido.headers['access-control-allow-origin']).toBe('http://localhost:8081');
    const ajeno = await request(app).get('/health').set('Origin', 'https://sitio-ajeno.example');
    expect(ajeno.headers['access-control-allow-origin']).toBeUndefined();
  });

  it.each(['/restablecer?token=abc', '/pasarela-simulada/terminos', '/pasarela-simulada/banco/sim-123'])(
    'la página %s autoriza solo su propio estilo, por hash, sin comodines ni unsafe-inline (10055)',
    async (ruta) => {
      const r = await request(crearEntorno(prisma).app).get(ruta);
      expect(r.status).toBe(200);
      const politica = r.headers['content-security-policy'];
      const css = /<style>([\s\S]*?)<\/style>/.exec(r.text)![1];
      expect(politica).toContain(`style-src 'sha256-${createHash('sha256').update(css).digest('base64')}'`);
      expect(politica).toContain("default-src 'none'");
      expect(politica).toContain("frame-ancestors 'none'");
      expect(politica).not.toMatch(/unsafe-inline|https:|\*/);
    },
  );

  it('CORS_ORIGENES rechaza valores que no son URL', async () => {
    const { cargarConfiguracion } = await import('../src/config');
    expect(() =>
      cargarConfiguracion({
        DATABASE_URL: 'postgresql://no-se-usa',
        TARJETA_LLAVE_CIFRADO: 'a'.repeat(64),
        TARJETA_LLAVE_HMAC: 'b'.repeat(64),
        JWT_SECRETO_ACCESO: 'secreto-de-acceso-solo-para-pruebas-123',
        JWT_SECRETO_RENOVACION: 'secreto-de-renovacion-solo-para-pruebas-456',
        RECAUDO_API_KEY: 'llave-recaudo-de-pruebas-123',
        CORS_ORIGENES: 'cualquiera',
      }),
    ).toThrow(/CORS_ORIGENES/);
  });
});
