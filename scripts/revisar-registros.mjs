// Revisión automática de los registros de Docker (T11, lista MASVS: MASVS-STORAGE y MASVS-PRIVACY, ADR 0019).
// Busca en los registros de la API y del recaudo simulado datos que nunca deben quedar escritos:
// tokens, contraseñas, celulares, correos, llaves de Wompi y datos de PSE.
// Guarda en docs/metricas/datos/registros.json solo los conteos y ejemplos enmascarados, nunca el dato.
//
//   npm run registros     (también corre al final de `npm run pruebas`, cuando la API ya recibió todo el tráfico de las pruebas)
import { spawnSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';

const SALIDA = 'docs/metricas/datos/registros.json';

const PATRONES = [
  { id: 'jwt', descripcion: 'Token JWT (de acceso)', regex: /eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/g },
  { id: 'bearer', descripcion: 'Encabezado Authorization con token', regex: /Bearer\s+[A-Za-z0-9._~+/-]{10,}/gi },
  { id: 'contrasena', descripcion: 'Contraseña con valor', regex: /"contrase(?:n|ñ)a(?:Actual)?"\s*:\s*"[^"]+"/gi },
  { id: 'token-url', descripcion: 'Token de recuperación en una URL', regex: /token=(?!\[OCULTO\])[A-Za-z0-9_-]{8,}/g },
  { id: 'token-renovacion', descripcion: 'Token de renovación con valor', regex: /"tokenRenovacion"\s*:\s*"[^"]+"/g },
  { id: 'celular', descripcion: 'Número de celular (Nequi o PSE)', regex: /(?<![\d.])3\d{9}(?![\d.])/g },
  // El dominio termina en letras: así no cuentan los nombres de paquetes de npm («@recargamio/api@0.1.0»)
  { id: 'correo', descripcion: 'Correo electrónico', regex: /[A-Za-z0-9._%+-]+@(?:[A-Za-z0-9-]+\.)+[A-Za-z]{2,}/g },
  { id: 'documento', descripcion: 'Número de documento de PSE', regex: /"numeroDocumento"\s*:\s*"[^"]+"/g },
  { id: 'llave-wompi', descripcion: 'Llave o secreto de Wompi', regex: /(?:prv_test_|prv_prod_|test_events_|prod_events_|test_integrity_|prod_integrity_)[A-Za-z0-9]+/g },
  { id: 'llave-recaudo', descripcion: 'Llave del recaudo (X-Api-Key) con valor', regex: /"x-api-key"\s*:\s*"[^"]+"/gi },
];

/** Deja ver solo la forma del hallazgo: «eyJh…(48)». */
const enmascarar = (texto) => `${texto.slice(0, 4)}…(${texto.length})`;

/** Dónde apareció, sin el dato: el último campo JSON antes del hallazgo y, si es una URL, la ruta hasta ahí. */
function contexto(linea, posicion) {
  const antes = linea.slice(Math.max(0, posicion - 120), posicion);
  const campo = [...antes.matchAll(/"([A-Za-z_-]+)"\s*:/g)].at(-1)?.[1];
  const ruta = /"url"\s*:\s*"([^"]*)$/.exec(antes)?.[1];
  return `${campo ? `campo «${campo}»` : 'texto'}${ruta ? ` (${ruta.replace(/[0-9]{6,}/g, '#')})` : ''}: `;
}

function registros(servicio) {
  const r = spawnSync('docker', ['compose', 'logs', '--no-color', '--no-log-prefix', servicio], { encoding: 'utf8', maxBuffer: 512 * 1024 * 1024 });
  if (r.status !== 0) throw new Error(`No se pudieron leer los registros de ${servicio}. ¿Está levantado Docker?`);
  return r.stdout.split('\n').filter(Boolean);
}

const servicios = { api: registros('api'), 'recaudo-sim': registros('recaudo-sim') };
const hallazgos = PATRONES.map(({ id, descripcion, regex }) => {
  const porServicio = {};
  const ejemplos = [];
  for (const [servicio, lineas] of Object.entries(servicios)) {
    let total = 0;
    for (const linea of lineas) {
      for (const m of linea.matchAll(regex)) {
        total += 1;
        if (ejemplos.length < 3) ejemplos.push(`${servicio}: ${contexto(linea, m.index)}${enmascarar(m[0])}`);
      }
    }
    porServicio[servicio] = total;
  }
  return { id, descripcion, ...porServicio, ejemplos };
});

const resumen = {
  generadoEn: new Date().toISOString(),
  lineas: Object.fromEntries(Object.entries(servicios).map(([s, l]) => [s, l.length])),
  hallazgos,
};
mkdirSync('docs/metricas/datos', { recursive: true });
writeFileSync(SALIDA, `${JSON.stringify(resumen, null, 2)}\n`);

const total = hallazgos.reduce((s, h) => s + h.api + h['recaudo-sim'], 0);
console.log(`Registros revisados: ${resumen.lineas.api} líneas de la API y ${resumen.lineas['recaudo-sim']} del recaudo.`);
for (const h of hallazgos) console.log(`  ${h.api + h['recaudo-sim'] === 0 ? 'OK     ' : 'REVISAR'}  ${h.descripcion}: API ${h.api}, recaudo ${h['recaudo-sim']}`);
console.log(total === 0 ? 'Ningún dato sensible en los registros.' : `Hay ${total} coincidencias: revisa ${SALIDA}.`);
process.exitCode = total === 0 ? 0 : 1;
