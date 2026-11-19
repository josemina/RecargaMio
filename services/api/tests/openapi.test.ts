// T8 · Contrato OpenAPI (ADR 0016). El contrato se escribe a mano; estas pruebas evitan que se desactualice:
//   1. Cada ruta de Express está documentada, y cada ruta documentada existe en el código.
//   2. Cada operación documentada responde algo distinto de «ruta no existe».
//   3. Todas las referencias internas ($ref) del contrato apuntan a algo que existe.
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import pino from 'pino';
import request from 'supertest';
import { crearApp } from '../src/app';
import { cargarConfiguracion } from '../src/config';
import { crearCorreoMemoria } from '../src/integraciones/correo';
import { crearPasarelaSimulada } from '../src/integraciones/pasarela/simulada';
import { crearRecaudoMemoria } from '../src/integraciones/recaudo';
import { leerOpenApi } from '../src/modulos/docs/rutas';
import { configPruebas, crearEntorno, crearPrismaPruebas, limpiarBase, registrar, TARJETAS_RECAUDO_PRUEBAS } from './utilidades';

const prisma = crearPrismaPruebas();
const contrato = leerOpenApi() as { openapi: string; paths: Record<string, Record<string, unknown>> };
const METODOS = ['get', 'post', 'put', 'patch', 'delete'];
const SRC = join(__dirname, '..', 'src');

afterAll(() => prisma.$disconnect());

/** Operaciones del contrato como «GET /tarjetas/{id}». */
function operacionesDocumentadas() {
  return Object.entries(contrato.paths).flatMap(([ruta, item]) =>
    Object.keys(item)
      .filter((m) => METODOS.includes(m))
      .map((m) => `${m.toUpperCase()} ${ruta}`),
  );
}

/**
 * Operaciones del código, leídas de las fuentes: los prefijos de app.ts (app.use('/x', crearRutasY(...)))
 * y las rutas de cada función crearRutas* de los módulos (rutas.get('/:id', ...)).
 */
function operacionesDelCodigo() {
  const app = readFileSync(join(SRC, 'app.ts'), 'utf8');
  const prefijos = new Map<string, string>();
  for (const [, prefijo = '', funcion] of app.matchAll(/app\.use\(\s*(?:'([^']*)',\s*)?(?:autenticar,\s*)?(crear\w+)\(/g)) {
    prefijos.set(funcion, prefijo);
  }
  const operaciones = [...app.matchAll(/app\.(get|post|put|patch|delete)\(\s*'([^']+)'/g)].map(([, m, r]) => `${m.toUpperCase()} ${r}`);

  for (const modulo of readdirSync(join(SRC, 'modulos'))) {
    let fuente: string;
    try {
      fuente = readFileSync(join(SRC, 'modulos', modulo, 'rutas.ts'), 'utf8');
    } catch {
      continue;
    }
    // Cada bloque empieza en «export function crearX» y llega hasta la siguiente función exportada
    for (const bloque of fuente.split(/(?=export function )/)) {
      const funcion = /^export function (crear\w+)/.exec(bloque)?.[1];
      if (!funcion || funcion === 'crearRutasDocs') continue;
      const prefijo = prefijos.get(funcion);
      if (prefijo === undefined) throw new Error(`${funcion} no se monta en app.ts`);
      for (const [, m, r] of bloque.matchAll(/rutas\.(get|post|put|patch|delete)\(\s*'([^']*)'/g)) {
        const completa = (prefijo + (r === '/' ? '' : r)).replace(/:(\w+)/g, '{$1}') || '/';
        operaciones.push(`${m.toUpperCase()} ${completa}`);
      }
    }
  }
  return operaciones;
}

describe('T8 · Contrato OpenAPI', () => {
  it('es OpenAPI 3.1 y documenta todas las rutas del código, sin rutas de más', () => {
    expect(contrato.openapi).toBe('3.1.0');
    const documentadas = new Set(operacionesDocumentadas());
    const codigo = new Set(operacionesDelCodigo());
    expect(codigo.size).toBeGreaterThanOrEqual(30);
    expect([...codigo].filter((o) => !documentadas.has(o))).toEqual([]); // rutas sin documentar
    expect([...documentadas].filter((o) => !codigo.has(o))).toEqual([]); // documentación de rutas que no existen
  });

  it('todas las referencias $ref apuntan a un componente que existe', () => {
    const texto = JSON.stringify(contrato);
    const rotas = [...texto.matchAll(/"\$ref":"#\/([^"]+)"/g)]
      .map(([, ruta]) => ruta)
      .filter((ruta) => ruta.split('/').reduce<unknown>((nodo, parte) => (nodo as Record<string, unknown> | undefined)?.[parte], contrato) === undefined);
    expect(rotas).toEqual([]);
  });

  it('cada operación documentada existe en la aplicación (no responde NO_ENCONTRADO)', async () => {
    await limpiarBase(prisma);
    const { app } = crearEntorno(prisma);
    const { tokenAcceso } = (await registrar(app)).body;
    const idCualquiera = '3f1b0c7e-0000-4000-8000-000000000001';
    const faltantes: string[] = [];
    for (const operacion of operacionesDocumentadas()) {
      const [metodo, ruta] = operacion.split(' ');
      const url = ruta.replace(/\{\w+\}/g, idCualquiera);
      const r = await (request(app) as unknown as Record<string, (u: string) => request.Test>)[metodo.toLowerCase()](url)
        .set('Authorization', `Bearer ${tokenAcceso}`)
        .send({});
      if (r.status === 404 && r.body?.error?.codigo === 'NO_ENCONTRADO') faltantes.push(operacion);
    }
    expect(faltantes).toEqual([]);
  });

  it('publica Swagger UI en /docs y el contrato en /docs/openapi.json con el servidor de la petición', async () => {
    const { app } = crearEntorno(prisma);
    const json = await request(app).get('/docs/openapi.json').set('Host', 'api:3000');
    expect(json.status).toBe(200);
    expect(json.body.servers).toEqual([{ url: 'http://api:3000', description: 'Servidor actual' }]);
    expect(Object.keys(json.body.paths)).toContain('/recargas');
    const ui = await request(app).get('/docs/');
    expect(ui.status).toBe(200);
    expect(ui.text).toContain('swagger-ui');
  });

  it('en producción /docs no existe (decisión C del ADR 0016)', async () => {
    const config = { ...configPruebas, NODE_ENV: 'production' as const };
    const app = crearApp({
      logger: pino({ level: 'silent' }),
      prisma,
      config,
      correo: crearCorreoMemoria(),
      recaudo: crearRecaudoMemoria(TARJETAS_RECAUDO_PRUEBAS),
      pasarela: crearPasarelaSimulada({ secretoEventos: config.WOMPI_SECRETO_EVENTOS, urlPublica: config.API_URL_PUBLICA }),
      limitarPeticiones: false,
    });
    expect((await request(app).get('/docs/openapi.json')).status).toBe(404);
  });
});

describe('T8 · LIMITES_PETICIONES', () => {
  const base = {
    DATABASE_URL: 'postgresql://no-se-usa',
    TARJETA_LLAVE_CIFRADO: 'a'.repeat(64),
    TARJETA_LLAVE_HMAC: 'b'.repeat(64),
    JWT_SECRETO_ACCESO: 'secreto-de-acceso-solo-para-pruebas-123',
    JWT_SECRETO_RENOVACION: 'secreto-de-renovacion-solo-para-pruebas-456',
    RECAUDO_API_KEY: 'llave-recaudo-de-pruebas-123',
  };

  it('por defecto los límites están activos', () => {
    expect(cargarConfiguracion(base).LIMITES_PETICIONES).toBe('normal');
  });

  it('se pueden desactivar en desarrollo para las pruebas de carga y de seguridad', () => {
    expect(cargarConfiguracion({ ...base, LIMITES_PETICIONES: 'desactivados' }).LIMITES_PETICIONES).toBe('desactivados');
  });

  it('en producción no se pueden desactivar', () => {
    expect(() => cargarConfiguracion({ ...base, NODE_ENV: 'production', LIMITES_PETICIONES: 'desactivados' })).toThrow(/LIMITES_PETICIONES/);
  });
});
