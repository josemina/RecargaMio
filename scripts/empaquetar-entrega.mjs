// Empaqueta lo que va al Release de GitHub de la entrega (T12, ADR 0020, decisión D).
// El repositorio guarda el código, el PDF del manual y los resúmenes de docs/metricas/; los archivos pesados o que cambian
// en cada corrida van en un .zip que se adjunta al Release:
//   - el manual en Word (el PDF ya está en el repositorio),
//   - los insumos para el documento maestro en Word,
//   - los reportes completos de la última corrida de `npm run pruebas` (Newman, JMeter y ZAP),
//   - los resúmenes de docs/metricas/.
//
// El Release puede ser público: el paquete se arma sobre una copia en la que se ocultan los tokens JWT de los reportes
// (Newman guarda las peticiones con su encabezado Authorization) y se revisa que no quede ningún valor secreto del .env.
//
//   npm run entrega:paquete     → entrega/RecargaMIO-entrega-AAAA-MM-DD.zip (la carpeta entrega/ está en .gitignore)
import { execFileSync } from 'node:child_process';
import { cpSync, existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

const fecha = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Bogota' }).format(new Date());
const destino = path.resolve(`entrega/RecargaMIO-entrega-${fecha}.zip`);

const CONTENIDO = [
  { ruta: 'docs/manual/entregables/Manual_RecargaMIO.docx', obligatorio: true, como: 'npm run manual' },
  { ruta: 'docs/manual/entregables/Manual_RecargaMIO.pdf', obligatorio: true, como: 'npm run manual' },
  { ruta: 'docs/manual/entregables/Insumos_documento_maestro.docx', obligatorio: true, como: 'npm run manual' },
  { ruta: 'docs/metricas', obligatorio: true, como: 'npm run pruebas' },
  { ruta: 'tests/postman/reportes', obligatorio: false, como: 'npm run pruebas -- newman' },
  { ruta: 'tests/jmeter/reportes', obligatorio: false, como: 'npm run pruebas -- jmeter' },
  { ruta: 'tests/seguridad/reportes', obligatorio: false, como: 'npm run pruebas -- zap' },
];

const faltan = CONTENIDO.filter((c) => !existsSync(c.ruta));
for (const f of faltan) console.log(`${f.obligatorio ? 'FALTA  ' : 'Omitido'}  ${f.ruta} (se genera con «${f.como}»)`);
if (faltan.some((f) => f.obligatorio)) {
  console.error('No se armó el paquete: faltan archivos obligatorios.');
  process.exit(1);
}

/** Valores de las variables secretas del .env local que no son el marcador de .env.example. */
function secretosLocales() {
  if (!existsSync('.env')) return [];
  const leer = (ruta) =>
    Object.fromEntries(readFileSync(ruta, 'utf8').split('\n').map((l) => /^([A-Z0-9_]+)=(.*)$/.exec(l.trim())).filter(Boolean).map((m) => [m[1], m[2]]));
  const local = leer('.env');
  const ejemplo = existsSync('.env.example') ? leer('.env.example') : {};
  return Object.entries(local).filter(([n, v]) => /SECRETO|LLAVE|KEY|PASSWORD|CONTRASENA|TOKEN|JWT|HMAC|CREDENCIAL/.test(n) && v.length >= 8 && v !== ejemplo[n]);
}

function* archivosDe(carpeta) {
  for (const nombre of readdirSync(carpeta)) {
    const ruta = path.join(carpeta, nombre);
    if (statSync(ruta).isDirectory()) yield* archivosDe(ruta);
    else yield ruta;
  }
}

const copia = mkdtempSync(path.join(tmpdir(), 'recargamio-entrega-'));
try {
  for (const c of CONTENIDO.filter((x) => existsSync(x.ruta))) cpSync(c.ruta, path.join(copia, c.ruta), { recursive: true });

  const secretos = secretosLocales();
  let tokens = 0;
  const problemas = [];
  for (const archivo of archivosDe(copia)) {
    const datos = readFileSync(archivo);
    if (datos.includes(0)) continue; // binario: Word, PDF, imágenes
    let texto = datos.toString('utf8');
    texto = texto.replace(/eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/g, () => {
      tokens += 1;
      return '[TOKEN-OCULTO]';
    });
    writeFileSync(archivo, texto);
    for (const [nombre, valor] of secretos) if (texto.includes(valor)) problemas.push(`${path.relative(copia, archivo)}: valor de ${nombre}`);
  }
  if (problemas.length) {
    console.error('No se armó el paquete: quedan secretos del .env en estos archivos:');
    for (const p of problemas) console.error(`  ${p}`);
    process.exit(1);
  }

  mkdirSync(path.dirname(destino), { recursive: true });
  rmSync(destino, { force: true });
  // -X: sin atributos de macOS; los archivos ._* y .DS_Store no entran
  execFileSync('zip', ['-q', '-r', '-X', destino, '.', '-x', '*.DS_Store', '*/._*'], { cwd: copia, stdio: 'inherit' });
  const tamano = execFileSync('du', ['-h', destino], { encoding: 'utf8' }).split('\t')[0].trim();
  console.log(`Tokens JWT ocultos en los reportes: ${tokens}. Ningún valor secreto del .env en el paquete.`);
  console.log(`Listo: ${path.relative(process.cwd(), destino)} (${tamano}). Adjúntalo al Release de la entrega en GitHub.`);
} finally {
  rmSync(copia, { recursive: true, force: true });
}
