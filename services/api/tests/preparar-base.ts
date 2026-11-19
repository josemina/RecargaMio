// Configuración global de Jest: prepara la base `recargamio_pruebas` antes de correr las pruebas.
// Nunca usa la base de la demostración: el nombre de la base debe terminar en `_pruebas`.
import { execSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import path from 'node:path';

export default async function prepararBase() {
  let url = process.env.DATABASE_URL_PRUEBAS;

  // Fuera de Docker: se arma la URL con el .env de la raíz y el puerto publicado en el equipo.
  if (!url) {
    const archivoEnv = path.resolve(__dirname, '../../../.env');
    if (existsSync(archivoEnv)) process.loadEnvFile(archivoEnv);
    if (process.env.DB_PASSWORD) {
      url = `postgresql://recargamio:${process.env.DB_PASSWORD}@localhost:5432/recargamio_pruebas`;
    }
  }
  if (!url) {
    throw new Error('Falta DATABASE_URL_PRUEBAS. Corre las pruebas con: docker compose run --rm api npm test');
  }

  const nombreBase = new URL(url).pathname.slice(1);
  if (!nombreBase.endsWith('_pruebas')) {
    throw new Error(`Por seguridad, las pruebas solo corren en una base que termine en "_pruebas" (recibí "${nombreBase}").`);
  }

  process.env.DATABASE_URL_PRUEBAS = url;
  execSync('npx prisma migrate deploy', {
    cwd: path.resolve(__dirname, '..'),
    env: { ...process.env, DATABASE_URL: url, PRISMA_HIDE_UPDATE_MESSAGE: '1' },
    stdio: 'pipe',
  });
}
