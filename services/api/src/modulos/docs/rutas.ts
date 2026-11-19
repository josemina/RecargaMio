// Documentación de la API (T8, ADR 0016): Swagger UI en /docs y el contrato en /docs/openapi.json.
// Solo se monta fuera de producción (decisión C del ADR 0016).
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { Router } from 'express';
import swaggerUi from 'swagger-ui-express';
import { parse } from 'yaml';

/** Ruta del contrato: services/api/openapi.yaml, tanto desde src/ como desde dist/. */
export const RUTA_OPENAPI = resolve(__dirname, '../../../openapi.yaml');

export function leerOpenApi(): Record<string, unknown> {
  return parse(readFileSync(RUTA_OPENAPI, 'utf8'));
}

export function crearRutasDocs() {
  const rutas = Router();
  const contrato = leerOpenApi();

  // El servidor del contrato es el mismo que atiende la petición: así ZAP, desde Docker, ataca http://api:3000
  rutas.get('/openapi.json', (req, res) => {
    res.json({ ...contrato, servers: [{ url: `${req.protocol}://${req.get('host')}`, description: 'Servidor actual' }] });
  });

  // Swagger UI necesita sus propios scripts y estilos; esta política solo aplica a /docs, que no existe en producción
  rutas.use((_req, res, next) => {
    res.set(
      'Content-Security-Policy',
      "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'",
    );
    next();
  });
  rutas.use('/', swaggerUi.serve, swaggerUi.setup(undefined, { swaggerOptions: { url: '/docs/openapi.json' }, customSiteTitle: 'API de RecargaMIO' }));
  return rutas;
}
