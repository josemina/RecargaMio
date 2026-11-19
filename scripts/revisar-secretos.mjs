// Revisión antes de subir al repositorio (T12, ADR 0020; regla 1 de CLAUDE.md y riesgo «Secretos subidos a GitHub»).
// Recorre los archivos que irían al repositorio (los que git ya sigue y los nuevos que no están en .gitignore) y falla si:
//   - hay un archivo que nunca debe subirse: .env, secrets/, reportes de pruebas, llaves privadas o credenciales de Firebase;
//   - aparece el valor real de una variable secreta del .env local (si existe; en la CI no hay .env);
//   - aparece una llave con forma real: Wompi de producción, llave privada PEM, token de GitHub o de AWS;
//   - un archivo pesa más de 10 MB.
// Las excepciones revisadas viven en tests/seguridad/secretos-aceptados.json, con su justificación.
//
//   npm run revisar:secretos     (también corre en la integración continua)
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, statSync } from 'node:fs';

const LIMITE_BYTES = 10 * 1024 * 1024;
const ACEPTADOS = 'tests/seguridad/secretos-aceptados.json';

const git = (...args) => execFileSync('git', args, { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
const archivos = [...new Set([...git('ls-files', '-z').split('\0'), ...git('ls-files', '--others', '--exclude-standard', '-z').split('\0')])]
  .filter(Boolean)
  .filter((a) => existsSync(a));

const RUTAS_PROHIBIDAS = [
  { regex: /(^|\/)\.env(\.(?!example$)[^/]*)?$/, motivo: 'archivo .env (solo se sube .env.example)' },
  { regex: /^secrets\//, motivo: 'carpeta secrets/' },
  { regex: /^tests\/[^/]+\/reportes\//, motivo: 'reporte de pruebas (va al Release, no al repositorio)' },
  { regex: /(^|\/)node_modules\//, motivo: 'node_modules' },
  { regex: /\.(pem|key|p12|jks|keystore)$/i, motivo: 'llave o almacén de llaves' },
  { regex: /(^|\/)google-services\.json$|(^|\/)GoogleService-Info\.plist$/, motivo: 'configuración de Firebase del proyecto real' },
];

const PATRONES = [
  { regex: /(?:pub_prod_|prv_prod_|prod_events_|prod_integrity_)[A-Za-z0-9]{16,}/g, motivo: 'llave de Wompi de producción (regla 1)' },
  { regex: /-----BEGIN [A-Z ]*PRIVATE KEY-----/g, motivo: 'llave privada PEM' },
  { regex: /"type"\s*:\s*"service_account"/g, motivo: 'cuenta de servicio de Google o Firebase' },
  { regex: /\bgh[pousr]_[A-Za-z0-9]{36,}\b/g, motivo: 'token de GitHub' },
  { regex: /\bAKIA[0-9A-Z]{16}\b/g, motivo: 'llave de AWS' },
];

/** Variables del .env local cuyo nombre indica un secreto y cuyo valor no es el marcador de .env.example. */
function secretosLocales() {
  if (!existsSync('.env')) return [];
  const leer = (ruta) =>
    Object.fromEntries(
      readFileSync(ruta, 'utf8')
        .split('\n')
        .map((l) => /^([A-Z0-9_]+)=(.*)$/.exec(l.trim()))
        .filter(Boolean)
        .map((m) => [m[1], m[2].replace(/^["']|["']$/g, '')]),
    );
  const local = leer('.env');
  const ejemplo = existsSync('.env.example') ? leer('.env.example') : {};
  return Object.entries(local)
    .filter(([nombre, valor]) => /SECRETO|LLAVE|KEY|PASSWORD|CONTRASENA|TOKEN|JWT|HMAC|CREDENCIAL/.test(nombre) && valor.length >= 8 && valor !== ejemplo[nombre])
    .map(([nombre, valor]) => ({ nombre, valor }));
}

const aceptados = existsSync(ACEPTADOS) ? JSON.parse(readFileSync(ACEPTADOS, 'utf8')).excepciones : [];
// El archivo de excepciones contiene, a propósito, las mismas cadenas que excusa
const aceptado = (archivo, texto) =>
  aceptados.some((e) => (e.archivo === archivo || archivo === ACEPTADOS) && texto.includes(e.contiene));

const secretos = secretosLocales();
const hallazgos = [];
for (const archivo of archivos) {
  const ruta = RUTAS_PROHIBIDAS.find((r) => r.regex.test(archivo));
  if (ruta) hallazgos.push({ archivo, motivo: ruta.motivo });
  const tamano = statSync(archivo).size;
  if (tamano > LIMITE_BYTES) hallazgos.push({ archivo, motivo: `pesa ${(tamano / 1048576).toFixed(1)} MB (límite: 10 MB)` });

  const contenido = readFileSync(archivo);
  if (contenido.includes(0)) continue; // binario: imágenes, PDF, Word
  const texto = contenido.toString('utf8');
  for (const { nombre, valor } of secretos) {
    if (texto.includes(valor)) hallazgos.push({ archivo, motivo: `contiene el valor real de ${nombre} del .env` });
  }
  for (const { regex, motivo } of PATRONES) {
    for (const m of texto.matchAll(regex)) {
      if (!aceptado(archivo, m[0])) hallazgos.push({ archivo, motivo });
    }
  }
}

console.log(`Revisados ${archivos.length} archivos${secretos.length ? ` contra ${secretos.length} valores secretos del .env local` : ' (sin .env local)'}.`);
if (aceptados.length) console.log(`Excepciones revisadas: ${aceptados.length} (${ACEPTADOS}).`);
if (hallazgos.length) {
  console.error('\nNO SUBAS ESTOS CAMBIOS:');
  for (const h of hallazgos) console.error(`  ${h.archivo}: ${h.motivo}`);
  process.exitCode = 1;
} else {
  console.log('Nada que no deba subirse.');
}
