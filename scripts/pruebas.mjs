// npm run pruebas (T8, ADR 0016): corre las pruebas de API, integración, carga y seguridad desde Docker,
// genera docs/metricas/resultados.md y deja la API como estaba (límites de peticiones activos).
//
//   npm run pruebas                       todas
//   npm run pruebas -- newman recargas    solo algunas (newman, recargas, jmeter, zap)
//
// Las pruebas salen de una sola IP y chocarían con el límite de peticiones; por eso, mientras corren,
// la API se reinicia con LIMITES_PETICIONES=desactivados (solo se acepta fuera de producción).
// Cada comando de docker compose lleva la variable: si faltara en uno, compose recrearía la API con los límites.
import { spawn, spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';

const TODAS = ['newman', 'recargas', 'jmeter', 'zap'];
const pedidas = process.argv.slice(2).filter((a) => !a.startsWith('-'));
const desconocidas = pedidas.filter((p) => !TODAS.includes(p));
if (desconocidas.length) {
  console.error(`Pruebas desconocidas: ${desconocidas.join(', ')}. Opciones: ${TODAS.join(', ')}`);
  process.exit(2);
}
const elegidas = pedidas.length ? pedidas : TODAS;

if (!existsSync('.env')) {
  console.error('Falta el archivo .env en la raíz (copia .env.example).');
  process.exit(2);
}
process.loadEnvFile('.env');
if (!process.env.PRUEBAS_CONTRASENA) {
  console.error('Falta PRUEBAS_CONTRASENA en .env (ver .env.example).');
  process.exit(2);
}

const API = 'http://localhost:3000';

// Si el equipo entra en reposo, Docker se congela y los tiempos medidos dejan de servir (pasó en la primera corrida de T8).
// En macOS, caffeinate evita el reposo por inactividad mientras este proceso siga vivo.
if (process.platform === 'darwin') {
  spawn('caffeinate', ['-i', '-w', String(process.pid)], { stdio: 'ignore', detached: true }).unref();
}
const entornoPruebas = { ...process.env, LIMITES_PETICIONES: 'desactivados' };
const resultados = [];

function compose(args, entorno = entornoPruebas) {
  console.log(`\n$ docker compose ${args.join(' ')}`);
  return spawnSync('docker', ['compose', ...args], { stdio: 'inherit', env: entorno }).status ?? 1;
}

function paso(nombre, fn) {
  const inicio = Date.now();
  let codigo;
  try {
    codigo = fn();
  } catch (err) {
    console.error(err);
    codigo = 1;
  }
  resultados.push({ nombre, codigo, segundos: Math.round((Date.now() - inicio) / 1000) });
  return codigo;
}

async function tokenZap() {
  const res = await fetch(`${API}/auth/ingreso`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ correo: 'zap@recargamio.test', contrasena: process.env.PRUEBAS_CONTRASENA }),
  });
  if (!res.ok) throw new Error(`No se pudo ingresar con zap@recargamio.test (${res.status}). ¿Corrió el paso de usuarios de pruebas?`);
  return (await res.json()).tokenAcceso;
}

try {
  console.log(`Pruebas de T8: ${elegidas.join(', ')}. La API se reinicia con los límites de peticiones desactivados.`);
  if (compose(['up', '-d', '--wait', 'api', 'recaudo-sim']) !== 0) throw new Error('No se pudo levantar la API');
  if (paso('Usuarios de pruebas', () => compose(['run', '--rm', 'api', 'npm', 'run', 'seed:pruebas'])) !== 0) {
    throw new Error('No se pudieron crear los usuarios de pruebas');
  }

  if (elegidas.includes('newman')) paso('API (Postman + Newman)', () => compose(['--profile', 'pruebas', 'run', '--rm', 'newman']));
  if (elegidas.includes('recargas')) paso('Integración (200 recargas)', () => compose(['--profile', 'pruebas', 'run', '--rm', 'recargas']));
  if (elegidas.includes('jmeter')) paso('Carga (JMeter, 100 usuarios)', () => compose(['--profile', 'pruebas', 'run', '--rm', 'jmeter']));
  if (elegidas.includes('zap')) {
    // El token dura 15 minutos: se pide justo antes del escaneo
    const token = await tokenZap();
    paso('Seguridad (OWASP ZAP)', () => compose(['--profile', 'pruebas', 'run', '--rm', 'zap'], { ...entornoPruebas, ZAP_TOKEN: token }));
  }

  // T11: con todo el tráfico de las pruebas en los registros, se revisa que no haya datos sensibles escritos (MASVS)
  // T11: la revisión automática de accesibilidad de la app corre en el equipo anfitrión (la app no corre en Docker, D5)
  paso('Accesibilidad de la app (WCAG 2.1 AA)', () => spawnSync('npm', ['run', 'accesibilidad'], { stdio: 'inherit' }).status ?? 1);
  paso('Dependencias (npm audit, MASVS)', () => spawnSync('node', ['scripts/auditar-dependencias.mjs'], { stdio: 'inherit' }).status ?? 1);
  paso('Revisión de registros (MASVS)', () => spawnSync('node', ['scripts/revisar-registros.mjs'], { stdio: 'inherit' }).status ?? 1);
  paso('Métricas (docs/metricas/resultados.md)', () => spawnSync('node', ['scripts/metricas.mjs'], { stdio: 'inherit' }).status ?? 1);
} catch (err) {
  console.error(`\n${err.message}`);
  resultados.push({ nombre: 'Preparación', codigo: 1, segundos: 0 });
} finally {
  // Sin la variable, compose vuelve a crear la API con los límites normales
  const entornoNormal = { ...process.env };
  delete entornoNormal.LIMITES_PETICIONES;
  console.log('\nRestaurando la API con los límites de peticiones activos…');
  const restaurada = compose(['up', '-d', '--wait', 'api'], entornoNormal) === 0;

  console.log('\nResumen de las pruebas');
  for (const r of resultados) console.log(`  ${r.codigo === 0 ? 'OK   ' : 'FALLA'}  ${r.nombre} (${r.segundos} s)`);
  console.log(restaurada ? '  OK     API restaurada con límites normales' : '  FALLA  No se pudo restaurar la API: corre «docker compose up -d api»');
  console.log('\nResultados: docs/metricas/resultados.md · Reportes completos: tests/*/reportes/');
  process.exitCode = resultados.every((r) => r.codigo === 0) && restaurada ? 0 : 1;
}
