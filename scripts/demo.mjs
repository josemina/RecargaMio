// Entorno de pruebas para la validación con usuarios (T11, HT-03, ADR 0019).
//
//   npm run demo              levanta Docker, migra y siembra, y deja la app apuntando a la IP de este computador
//   npm run demo:exportar     guarda en docs/metricas/datos/validacion.json las recargas de los participantes (sin correos)
//   npm run demo:limpiar      exporta y después borra las cuentas de los participantes y reinicia sus tarjetas
//
// Los participantes crean su cuenta en la sesión con p01@usuarios.test … p15@usuarios.test y agregan la tarjeta
// 7740000001 … 7740000015. Nunca se toca a Viviana (usuaria de la demostración) ni a los usuarios de las pruebas automatizadas.
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { networkInterfaces } from 'node:os';

const accion = process.argv[2] ?? 'iniciar';
const ACCIONES = ['iniciar', 'exportar', 'limpiar'];
if (!ACCIONES.includes(accion)) {
  console.error(`Acción desconocida: ${accion}. Opciones: ${ACCIONES.join(', ')}`);
  process.exit(2);
}
if (!existsSync('.env')) {
  console.error('Falta el archivo .env en la raíz (copia .env.example).');
  process.exit(2);
}

const ARCHIVO_APP = 'apps/mobile/.env';
const ARCHIVO_DATOS = 'docs/metricas/datos/validacion.json';
const PARTICIPANTES = 15;

function compose(args, { capturar = false } = {}) {
  if (!capturar) console.log(`\n$ docker compose ${args.join(' ')}`);
  const r = spawnSync('docker', ['compose', ...args], { stdio: capturar ? ['ignore', 'pipe', 'inherit'] : 'inherit', encoding: 'utf8' });
  if (r.status !== 0) {
    throw new Error(`Falló «docker compose ${args.join(' ')}». ¿Está abierto Docker Desktop?`);
  }
  return r.stdout ?? '';
}

/** IPv4 de la red local. Se prefiere la Wi-Fi de macOS (en0); se descartan las redes internas de Docker. */
function ipLocal() {
  const candidatas = Object.entries(networkInterfaces())
    .flatMap(([nombre, direcciones]) => (direcciones ?? []).map((d) => ({ nombre, ...d })))
    .filter((d) => d.family === 'IPv4' && !d.internal && !/^(docker|br-|veth|utun|bridge)/.test(d.nombre));
  return (candidatas.find((d) => d.nombre === 'en0') ?? candidatas[0])?.address;
}

/** Cambia o agrega una variable en un archivo .env sin tocar las demás líneas. */
function fijarVariable(archivo, nombre, valor) {
  const lineas = existsSync(archivo) ? readFileSync(archivo, 'utf8').split('\n') : [];
  const i = lineas.findIndex((l) => l.startsWith(`${nombre}=`));
  if (i >= 0) lineas[i] = `${nombre}=${valor}`;
  else lineas.splice(lineas.at(-1) === '' ? lineas.length - 1 : lineas.length, 0, `${nombre}=${valor}`);
  writeFileSync(archivo, `${lineas.join('\n').replace(/\n*$/, '')}\n`);
}

/** Tres intentos: la API puede tardar un momento después de la siembra, y macOS pide permiso de «red local» la primera vez. */
async function responde(url) {
  for (let intento = 1; intento <= 3; intento++) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
      if (res.ok) return true;
    } catch {
      // se vuelve a intentar
    }
    await new Promise((r) => setTimeout(r, 2000));
  }
  return false;
}

async function iniciar() {
  const ip = ipLocal();
  if (!ip) throw new Error('No se encontró la IP de este computador en la red local. ¿Está conectado a la Wi-Fi?');

  // --build: las tarjetas y los scripts de la validación viven en la imagen, no en las carpetas montadas
  compose(['up', '-d', '--build', '--wait', 'db', 'api', 'recaudo-sim', 'mailpit']);
  compose(['run', '--rm', 'api', 'npx', 'prisma', 'migrate', 'deploy']);
  compose(['run', '--rm', 'api', 'npm', 'run', 'seed']);
  compose(['run', '--rm', 'recaudo-sim', 'npm', 'run', 'seed']);

  if (!existsSync(ARCHIVO_APP)) writeFileSync(ARCHIVO_APP, readFileSync('apps/mobile/.env.example', 'utf8'));
  fijarVariable(ARCHIVO_APP, 'EXPO_PUBLIC_API_URL', `http://${ip}:3000`);

  const local = await responde('http://localhost:3000/health');
  const red = await responde(`http://${ip}:3000/health`);
  if (!local) throw new Error('La API no responde en http://localhost:3000/health. Revisa «docker compose logs api».');

  const tarjeta = (n) => `774${String(n).padStart(7, '0')}`;
  console.log(`
Entorno de pruebas listo.

  API:            http://${ip}:3000 ${red ? '(responde desde la red local)' : '(NO responde por la IP de la red: revisa el firewall y, en macOS, el permiso de «Red local» de la terminal)'}
  App:            ${ARCHIVO_APP} apunta a http://${ip}:3000
  Correo:         http://localhost:8025 (Mailpit, para «Olvidé mi contraseña»)

Para abrir la app en los teléfonos (misma red Wi-Fi que este computador):

  cd apps/mobile && npx expo start --clear

y escanea el código QR con Expo Go.

Cuentas de los participantes (cada uno la crea en la tarea 1 con una contraseña inventada en el momento;
protocolo completo en docs/metricas/protocolo-usabilidad.md):

  P01  nombre «Participante 01»  p01@usuarios.test  tarjeta ${tarjeta(1)}
  …
  P${PARTICIPANTES}  nombre «Participante ${PARTICIPANTES}»  p${PARTICIPANTES}@usuarios.test  tarjeta ${tarjeta(PARTICIPANTES)}

Pago de prueba con Nequi: 3991111111 (aprueba). Al terminar todas las sesiones: npm run demo:limpiar`);
}

function exportar() {
  const salida = compose(['run', '--rm', '-T', 'api', 'npm', 'run', '--silent', 'validacion', 'exportar'], { capturar: true });
  const linea = salida.trim().split('\n').filter((l) => l.startsWith('[')).at(-1);
  if (!linea) throw new Error('El exportador no devolvió datos.');
  const nuevos = JSON.parse(linea);

  // Se combina con lo exportado antes: las sesiones pueden hacerse en varios días con una limpieza entre ellas
  const anteriores = existsSync(ARCHIVO_DATOS) ? JSON.parse(readFileSync(ARCHIVO_DATOS, 'utf8')).participantes ?? [] : [];
  const porCodigo = new Map(anteriores.map((p) => [p.participante, p]));
  for (const p of nuevos) porCodigo.set(p.participante, p);
  const participantes = [...porCodigo.values()].sort((a, b) => a.participante.localeCompare(b.participante));

  if (nuevos.length === 0) {
    console.log(`No hay cuentas de participantes en la base. ${ARCHIVO_DATOS} queda como estaba (${anteriores.length} participantes).`);
    return;
  }
  mkdirSync('docs/metricas/datos', { recursive: true });
  writeFileSync(ARCHIVO_DATOS, `${JSON.stringify({ exportadoEn: new Date().toISOString(), participantes }, null, 2)}\n`);
  console.log(`Exportados ${nuevos.length} participantes a ${ARCHIVO_DATOS} (${participantes.length} en total).`);
}

function limpiar() {
  exportar();
  compose(['run', '--rm', 'api', 'npm', 'run', '--silent', 'validacion', 'limpiar']);
  compose(['run', '--rm', 'recaudo-sim', 'npm', 'run', '--silent', 'validacion:reiniciar']);
  console.log('\nListo: las cuentas de los participantes se borraron y sus tarjetas volvieron a $5.000. Viviana no se tocó.');
}

try {
  if (accion === 'iniciar') await iniciar();
  else if (accion === 'exportar') exportar();
  else limpiar();
} catch (error) {
  console.error(`\n${error.message}`);
  process.exit(1);
}
