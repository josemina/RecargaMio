// npm run metricas (T8, ADR 0016; ampliado en T11, ADR 0019): compara los resultados de las pruebas con las metas de la Tabla 9
// y escribe docs/metricas/resultados.md, que el manual incluye en el capítulo 04.
//
// Lee los reportes completos de tests/*/reportes/ (que no se suben a GitHub) y guarda un resumen pequeño
// en docs/metricas/datos/ (que sí se sube). Si un reporte completo no está, usa el último resumen guardado.
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';

const DATOS = 'docs/metricas/datos';
const SALIDA = 'docs/metricas/resultados.md';
mkdirSync(DATOS, { recursive: true });

const leerJson = (ruta) => (existsSync(ruta) ? JSON.parse(readFileSync(ruta, 'utf8')) : null);
const guardarJson = (nombre, datos) => writeFileSync(`${DATOS}/${nombre}`, JSON.stringify(datos, null, 2) + '\n');

// ── Estadística ──
const ordenar = (v) => [...v].sort((a, b) => a - b);
const media = (v) => v.reduce((s, x) => s + x, 0) / v.length;
function mediana(v) {
  const o = ordenar(v);
  const m = Math.floor(o.length / 2);
  return o.length % 2 ? o[m] : (o[m - 1] + o[m]) / 2;
}
/** Percentil por el método del rango más cercano (el mismo que usa JMeter). */
const percentil = (v, p) => ordenar(v)[Math.max(0, Math.ceil((p / 100) * v.length) - 1)];
/** Intervalo de confianza de Wilson al 95 %: se comporta bien con proporciones cercanas a 1 y muestras pequeñas. */
function wilson(exitos, n, z = 1.96) {
  if (n === 0) return [0, 0];
  const p = exitos / n;
  const centro = (p + (z * z) / (2 * n)) / (1 + (z * z) / n);
  const margen = (z * Math.sqrt((p * (1 - p)) / n + (z * z) / (4 * n * n))) / (1 + (z * z) / n);
  return [Math.max(0, centro - margen), Math.min(1, centro + margen)];
}

// ── Formato (español de Colombia) ──
const num = (x, decimales = 1) => x.toLocaleString('es-CO', { minimumFractionDigits: decimales, maximumFractionDigits: decimales });
const pct = (x, decimales = 1) => `${num(x * 100, decimales)} %`;
const seg = (ms) => `${num(ms / 1000, 2)} s`;
// Hora de 24 horas, en la hora de Colombia: «18 de noviembre de 2026, 08:47»
const fecha = (iso) =>
  `${new Date(iso).toLocaleString('es-CO', { timeZone: 'America/Bogota', dateStyle: 'long', timeStyle: 'short', hourCycle: 'h23' })} (hora de Colombia)`;
const veredicto = (cumple) => (cumple ? '**Cumple**' : '**No cumple**');
const MEDIOS = { NEQUI: 'Nequi', PSE: 'PSE', BANCOLOMBIA_TRANSFER: 'Bancolombia' };

const md = [];
const resumenMetas = [];

// ── 1. Integración: 200 recargas ──
function seccionRecargas() {
  const datos = leerJson(`${DATOS}/recargas.json`);
  md.push('## Tiempo de recarga y éxito de pagos (prueba de integración)', '');
  if (!datos) {
    md.push('Todavía no hay datos. Corre `npm run pruebas -- recargas`.', '');
    resumenMetas.push(['Tiempo de recarga (p95)', '≤ 180 s', 'sin datos', '—'], ['Éxito de pagos', '≥ 98 %', 'sin datos', '—']);
    return;
  }
  const { resultados } = datos;
  const n = resultados.length;
  const aprobadas = resultados.filter((r) => r.estado === 'ACREDITADA');
  const tiempos = aprobadas.map((r) => r.tiempoSegundos).filter((t) => typeof t === 'number');
  const [bajo, alto] = wilson(aprobadas.length, n);
  const tasa = aprobadas.length / n;
  const p95 = tiempos.length ? percentil(tiempos, 95) : null;

  md.push(
    `Corrida del ${fecha(datos.fecha)}: ${n} recargas de punta a punta con el usuario \`integracion@recargamio.test\`, ` +
      `${datos.concurrencia} a la vez, contra la pasarela **${datos.pasarela}** y el recaudo simulado. Duración: ${datos.duracionSegundos} s.`,
    '',
  );
  if (datos.pasarela === 'simulada') {
    md.push(
      '> **Cómo leer este resultado.** Con la pasarela simulada, los datos de prueba que aprueban siempre aprueban. ' +
        'La tasa mide que el **flujo completo** (pago, webhook firmado, acreditación idempotente en el recaudo y consulta del estado) ' +
        'funcione sin perder recargas; no mide la confiabilidad de Wompi. El número definitivo de la Tabla 9 se obtiene ' +
        'repitiendo esta prueba con el Sandbox de Wompi (T5b). Decisión D del ADR 0016.',
      '',
    );
  }
  md.push(
    '<!-- tabla: Tiempo de recarga y éxito de pagos frente a las metas de la Tabla 9 -->',
    '| Indicador | Resultado | Meta (Tabla 9) | Veredicto |',
    '|---|---|---|---|',
    `| Recargas iniciadas | ${n} | ≥ 200 (Tabla 18) | ${veredicto(n >= 200)} |`,
    `| Recargas acreditadas | ${aprobadas.length} (${pct(tasa)}) | ≥ 98 % | ${veredicto(tasa >= 0.98)} |`,
    `| Intervalo de confianza del 95 % de la tasa (Wilson) | ${pct(bajo)} a ${pct(alto)} | — | — |`,
    ...(tiempos.length
      ? [
          `| Tiempo de recarga: media | ${num(media(tiempos))} s | — | — |`,
          `| Tiempo de recarga: mediana | ${num(mediana(tiempos))} s | — | — |`,
          `| Tiempo de recarga: percentil 95 | ${num(p95)} s | ≤ 180 s | ${veredicto(p95 <= 180)} |`,
          `| Tiempo de recarga: máximo | ${num(Math.max(...tiempos))} s | ≤ 180 s | ${veredicto(Math.max(...tiempos) <= 180)} |`,
        ]
      : []),
    '',
    'El tiempo de recarga es `acreditadaEn − iniciadaEn`, medido por la API. Con la pasarela simulada incluye la demora configurada ' +
      'en `PASARELA_SIMULADA_DEMORA_MS` (4 s por defecto), que imita la espera de la confirmación.',
    '',
    '<!-- tabla: Resultado de la prueba de integración por medio de pago -->',
    '| Medio de pago | Iniciadas | Acreditadas | Tasa | Mediana del tiempo | Percentil 95 del tiempo |',
    '|---|---|---|---|---|---|',
  );
  for (const [codigo, nombre] of Object.entries(MEDIOS)) {
    const delMedio = resultados.filter((r) => r.medioPago === codigo);
    if (!delMedio.length) continue;
    const ok = delMedio.filter((r) => r.estado === 'ACREDITADA');
    const t = ok.map((r) => r.tiempoSegundos).filter((x) => typeof x === 'number');
    md.push(
      `| ${nombre} | ${delMedio.length} | ${ok.length} | ${pct(ok.length / delMedio.length)} | ${t.length ? `${num(mediana(t))} s` : '—'} | ${t.length ? `${num(percentil(t, 95))} s` : '—'} |`,
    );
  }
  md.push('');
  const otras = resultados.filter((r) => r.estado !== 'ACREDITADA');
  if (otras.length) {
    const porEstado = Object.entries(Object.groupBy(otras, (r) => r.codigo ?? r.estado)).map(([e, l]) => `${e}: ${l.length}`);
    md.push(`Recargas que no se acreditaron: ${porEstado.join(' · ')}.`, '');
  }
  resumenMetas.push(
    ['Tiempo de recarga (percentil 95)', '≤ 180 s', p95 === null ? 'sin datos' : `${num(p95)} s`, p95 === null ? '—' : veredicto(p95 <= 180)],
    ['Éxito de pagos', '≥ 98 %', `${pct(tasa)} (IC 95 %: ${pct(bajo)}–${pct(alto)})`, veredicto(tasa >= 0.98)],
  );
}

// ── 2. Carga: JMeter ──
function resumenJmeter() {
  const estadisticas = leerJson('tests/jmeter/reportes/html/statistics.json');
  if (!estadisticas) return leerJson(`${DATOS}/jmeter.json`);
  // Usuarios simultáneos y duración, desde el archivo de resultados (.jtl en CSV)
  let usuarios = null;
  let inicio = null;
  let fin = null;
  const jtl = 'tests/jmeter/reportes/resultados.jtl';
  if (existsSync(jtl)) {
    const [encabezado, ...filas] = readFileSync(jtl, 'utf8').trim().split('\n');
    const columnas = encabezado.split(',');
    const iTiempo = columnas.indexOf('timeStamp');
    const iHilos = columnas.indexOf('allThreads');
    for (const fila of filas) {
      const c = fila.split(',');
      const t = Number(c[iTiempo]);
      usuarios = Math.max(usuarios ?? 0, Number(c[iHilos]) || 0);
      inicio = Math.min(inicio ?? t, t);
      fin = Math.max(fin ?? t, t);
    }
  }
  const resumen = {
    fecha: inicio ? new Date(inicio).toISOString() : new Date().toISOString(),
    duracionSegundos: inicio ? Math.round((fin - inicio) / 1000) : null,
    usuariosSimultaneos: usuarios,
    peticiones: Object.fromEntries(
      Object.entries(estadisticas).map(([etiqueta, e]) => [
        etiqueta,
        {
          muestras: e.sampleCount,
          errores: e.errorCount,
          media: e.meanResTime,
          mediana: e.medianResTime,
          p90: e.pct1ResTime,
          p95: e.pct2ResTime,
          p99: e.pct3ResTime,
          maximo: e.maxResTime,
          porSegundo: e.throughput,
        },
      ]),
    ),
  };
  guardarJson('jmeter.json', resumen);
  return resumen;
}

function seccionJmeter() {
  const r = resumenJmeter();
  md.push('## Tiempo de respuesta con 100 usuarios simultáneos (prueba de carga)', '');
  if (!r) {
    md.push('Todavía no hay datos. Corre `npm run pruebas -- jmeter`.', '');
    resumenMetas.push(['Tiempo de respuesta (percentil 95)', '≤ 2 s con 100 usuarios', 'sin datos', '—']);
    return;
  }
  const total = r.peticiones.Total;
  md.push(
    `Corrida del ${fecha(r.fecha)} con JMeter 5.6.3: ${r.usuariosSimultaneos ?? '—'} usuarios simultáneos como máximo, ` +
      `${total.muestras} peticiones en ${r.duracionSegundos ?? '—'} s. Cada usuario ingresa una vez y luego, en cada iteración, ` +
      'consulta sus tarjetas y su historial, hace una recarga con Nequi y consulta el estado hasta que termina, con pausas de 0,5 a 1,5 s.',
    '',
    '<!-- tabla: Tiempos de respuesta de la API por endpoint con 100 usuarios simultáneos -->',
    '| Petición | Muestras | Errores | Media | Mediana | Percentil 95 | Máximo | Veredicto (p95 ≤ 2 s) |',
    '|---|---|---|---|---|---|---|---|',
  );
  const filas = Object.entries(r.peticiones).sort(([a], [b]) => (a === 'Total') - (b === 'Total') || a.localeCompare(b));
  for (const [etiqueta, e] of filas) {
    const nombre = etiqueta === 'Total' ? '**Total**' : `\`${etiqueta}\``;
    md.push(
      `| ${nombre} | ${e.muestras} | ${e.errores} (${pct(e.errores / e.muestras)}) | ${seg(e.media)} | ${seg(e.mediana)} | ${seg(e.p95)} | ${seg(e.maximo)} | ${veredicto(e.p95 <= 2000)} |`,
    );
  }
  md.push('');
  const usuariosOk = (r.usuariosSimultaneos ?? 0) >= 100;
  resumenMetas.push([
    'Tiempo de respuesta (percentil 95)',
    '≤ 2 s con 100 usuarios',
    `${seg(total.p95)} con ${r.usuariosSimultaneos ?? '—'} usuarios; ${pct(total.errores / total.muestras)} de errores`,
    veredicto(total.p95 <= 2000 && usuariosOk),
  ]);
}

// ── 3. API: Postman + Newman ──
function resumenNewman() {
  const reporte = leerJson('tests/postman/reportes/newman.json');
  if (!reporte) return leerJson(`${DATOS}/newman.json`);
  const { stats, timings, failures } = reporte.run;
  const resumen = {
    fecha: new Date(timings.started).toISOString(),
    duracionSegundos: Math.round((timings.completed - timings.started) / 1000),
    peticiones: { total: stats.requests.total, fallidas: stats.requests.failed },
    aserciones: { total: stats.assertions.total, fallidas: stats.assertions.failed },
    tiempoMedioMs: Math.round(timings.responseAverage),
    fallas: failures.map((f) => ({ peticion: f.source?.name ?? '—', prueba: f.error?.test ?? f.error?.name ?? '—', mensaje: f.error?.message ?? '' })),
  };
  guardarJson('newman.json', resumen);
  return resumen;
}

function seccionNewman() {
  const r = resumenNewman();
  md.push('## Contrato de la API (Postman y Newman)', '');
  if (!r) {
    md.push('Todavía no hay datos. Corre `npm run pruebas -- newman`.', '');
    resumenMetas.push(['Pruebas de API (Tabla 18)', 'Respuestas según el contrato', 'sin datos', '—']);
    return;
  }
  md.push(
    `Corrida del ${fecha(r.fecha)}: la colección \`tests/postman/RecargaMIO.postman_collection.json\` crea una cuenta, recorre ` +
      'registro, ingreso, tarjetas, alerta, recargas aprobada y rechazada, webhook con firma falsa, notificaciones y cierre de sesión, ' +
      'y al final elimina la cuenta.',
    '',
    '<!-- tabla: Resultado de la colección de Postman ejecutada con Newman -->',
    '| Indicador | Resultado |',
    '|---|---|',
    `| Peticiones ejecutadas | ${r.peticiones.total} (${r.peticiones.fallidas} fallidas) |`,
    `| Aserciones | ${r.aserciones.total} (${r.aserciones.fallidas} fallidas) |`,
    `| Tiempo medio de respuesta | ${r.tiempoMedioMs} ms |`,
    `| Duración | ${r.duracionSegundos} s |`,
    '',
  );
  if (r.fallas.length) {
    md.push('Aserciones que fallaron:', '', ...r.fallas.map((f) => `- ${f.peticion}: ${f.prueba}. ${f.mensaje}`), '');
  }
  resumenMetas.push([
    'Pruebas de API (Tabla 18)',
    'Respuestas según el contrato',
    `${r.aserciones.total - r.aserciones.fallidas} de ${r.aserciones.total} aserciones`,
    veredicto(r.aserciones.fallidas === 0 && r.peticiones.fallidas === 0),
  ]);
}

// ── 4. Seguridad: OWASP ZAP ──
const RIESGOS = { 3: 'Alto', 2: 'Medio', 1: 'Bajo', 0: 'Informativo' };

/** Justificación de cada regla tratada en tests/seguridad/reglas-zap.conf (id → texto). */
function justificacionesZap() {
  const ruta = 'tests/seguridad/reglas-zap.conf';
  if (!existsSync(ruta)) return {};
  return Object.fromEntries(
    readFileSync(ruta, 'utf8')
      .split('\n')
      .map((l) => /^(\d+)\t\w+\t\(([^)]*)\)\s*(.*)$/.exec(l))
      .filter(Boolean)
      .map(([, id, , texto]) => [id, texto]),
  );
}

function resumenZap() {
  const ruta = 'tests/seguridad/reportes/zap.json';
  const reporte = leerJson(ruta);
  if (!reporte) return leerJson(`${DATOS}/zap.json`);
  const alertas = (reporte.site ?? []).flatMap((s) =>
    (s.alerts ?? []).map((a) => ({ id: a.pluginid, nombre: a.name ?? a.alert, riesgo: Number(a.riskcode), confianza: a.confidence, instancias: Number(a.count ?? a.instances?.length ?? 0) })),
  );
  const resumen = {
    // La fecha interna del reporte no trae zona horaria: se usa la del archivo
    fecha: statSync(ruta).mtime.toISOString(),
    version: reporte['@version'] ?? null,
    alertas: alertas.sort((a, b) => b.riesgo - a.riesgo || a.nombre.localeCompare(b.nombre)),
  };
  guardarJson('zap.json', resumen);
  return resumen;
}

function seccionZap() {
  const r = resumenZap();
  md.push('## Seguridad (OWASP ZAP)', '');
  if (!r) {
    md.push('Todavía no hay datos. Corre `npm run pruebas -- zap`.', '');
    resumenMetas.push(['Seguridad', '0 vulnerabilidades críticas o altas', 'sin datos', '—']);
    return;
  }
  const cuenta = (riesgo) => r.alertas.filter((a) => a.riesgo === riesgo).length;
  md.push(
    `Escaneo de la API del ${r.fecha ? fecha(r.fecha) : '—'} con ZAP ${r.version ?? ''} (\`zap-api-scan\`), a partir del contrato OpenAPI y con la sesión ` +
      'del usuario `zap@recargamio.test`. ZAP no tiene nivel «crítico»: su nivel más grave es «alto». Las reglas tratadas, ' +
      'con su justificación, están en `tests/seguridad/reglas-zap.conf`; ninguna se esconde del reporte.',
    '',
    '<!-- tabla: Hallazgos de OWASP ZAP por nivel de riesgo -->',
    '| Riesgo | Tipos de hallazgo |',
    '|---|---|',
    ...[3, 2, 1, 0].map((n) => `| ${RIESGOS[n]} | ${cuenta(n)} |`),
    '',
  );
  if (r.alertas.length) {
    const justificaciones = justificacionesZap();
    md.push(
      '<!-- tabla: Detalle de los hallazgos de OWASP ZAP y su tratamiento -->',
      '| Regla | Hallazgo | Riesgo | Instancias | Tratamiento |',
      '|---|---|---|---|---|',
      ...r.alertas.map((a) => `| ${a.id} | ${a.nombre} | ${RIESGOS[a.riesgo]} | ${a.instancias} | ${justificaciones[a.id] ?? 'Sin tratar: revisar'} |`),
      '',
    );
  }
  resumenMetas.push(['Seguridad (ZAP)', '0 vulnerabilidades críticas o altas', `altos: ${cuenta(3)} · medios: ${cuenta(2)} · bajos: ${cuenta(1)}`, veredicto(cuenta(3) === 0)]);
}

// ── T11 · Utilidades para las plantillas que llena el equipo ──
/** CSV sencillo con comillas dobles opcionales (las observaciones pueden llevar comas). */
function leerCsv(ruta) {
  if (!existsSync(ruta)) return [];
  const filas = [];
  for (const linea of readFileSync(ruta, 'utf8').split(/\r?\n/)) {
    if (!linea.trim()) continue;
    const campos = [];
    let actual = '';
    let entreComillas = false;
    for (let i = 0; i < linea.length; i++) {
      const c = linea[i];
      if (c === '"' && entreComillas && linea[i + 1] === '"') {
        actual += '"';
        i++;
      } else if (c === '"') entreComillas = !entreComillas;
      else if (c === ',' && !entreComillas) {
        campos.push(actual.trim());
        actual = '';
      } else actual += c;
    }
    campos.push(actual.trim());
    filas.push(campos);
  }
  const [encabezado, ...resto] = filas;
  return resto.map((f) => Object.fromEntries(encabezado.map((c, i) => [c, f[i] ?? ''])));
}
const esSi = (v) => /^s[ií]$/i.test(v ?? '');
const esNo = (v) => /^no$/i.test(v ?? '');
/** Cuantil 0,975 de la t de Student (intervalo del 95 %) para muestras pequeñas. */
const T975 = [12.706, 4.303, 3.182, 2.776, 2.571, 2.447, 2.365, 2.306, 2.262, 2.228, 2.201, 2.179, 2.16, 2.145, 2.131, 2.12, 2.11, 2.101, 2.093, 2.086, 2.08, 2.074, 2.069, 2.064, 2.06, 2.056, 2.052, 2.048, 2.045, 2.042];
const t975 = (gl) => (gl >= 1 && gl <= 30 ? T975[gl - 1] : 1.96);
function desviacion(v) {
  const m = media(v);
  return Math.sqrt(v.reduce((s, x) => s + (x - m) ** 2, 0) / (v.length - 1));
}

// ── 5. Accesibilidad (T11) ──
function seccionAccesibilidad() {
  md.push('## Accesibilidad (WCAG 2.1 AA)', '');
  md.push('La revisión tiene tres partes, descritas en `docs/metricas/wcag.md`: una prueba automática de cada pantalla de la app, axe-core sobre la versión web y la revisión con TalkBack en un teléfono Android.', '');

  const app = leerJson(`${DATOS}/accesibilidad-app.json`);
  let problemasApp = null;
  if (app) {
    problemasApp = app.pantallas.reduce((s, p) => s + p.problemas.length, 0);
    const controles = app.pantallas.reduce((s, p) => s + p.controles, 0);
    md.push(
      `**Prueba automática de la app** (${fecha(app.generadoEn)}): ${app.pantallas.length} pantallas y estados, ${controles} controles y ` +
        `${app.pantallas.reduce((s, p) => s + p.campos, 0)} campos de texto revisados; ${problemasApp === 0 ? 'ninguno sin rol, sin etiqueta o con menos de 44 px' : `${problemasApp} problemas`}.`,
      '',
      '<!-- tabla: Revisión automática de accesibilidad por pantalla -->',
      '| Pantalla | Controles | Campos | Problemas |',
      '|---|---|---|---|',
      ...app.pantallas.map((p) => `| ${p.pantalla} | ${p.controles} | ${p.campos} | ${p.problemas.length ? p.problemas.join('; ') : 'Ninguno'} |`),
      '',
    );
  } else {
    md.push('Todavía no hay resultados de la prueba automática de la app. Corre `npm run accesibilidad`.', '');
  }

  const axe = leerJson(`${DATOS}/axe.json`);
  const excepciones = leerJson('tests/accesibilidad/excepciones-axe.json')?.reglas ?? {};
  let criticosAxe = null;
  if (axe) {
    const todas = axe.pantallas.flatMap((p) => p.violaciones.map((v) => ({ ...v, pantalla: p.pantalla })));
    const sinJustificar = todas.filter((v) => !excepciones[v.regla]);
    criticosAxe = sinJustificar.filter((v) => v.impacto === 'critical').length;
    md.push(
      `**axe-core** (${axe.herramienta}, ${axe.normas}; ${fecha(axe.generadoEn)}): ${axe.pantallas.length} pantallas analizadas en el mismo estado de las capturas del manual.`,
      '',
      '<!-- tabla: Resultados de axe-core por pantalla -->',
      '| Pantalla | Reglas aprobadas | Incumplimientos | Aceptados con justificación |',
      '|---|---|---|---|',
      ...axe.pantallas.map((p) => {
        const propios = p.violaciones.filter((v) => !excepciones[v.regla]);
        const aceptados = p.violaciones.filter((v) => excepciones[v.regla]);
        const listar = (l) => (l.length ? l.map((v) => `${v.regla} (${v.impacto}, ${v.elementos})`).join('; ') : 'Ninguno');
        return `| ${p.pantalla} | ${p.reglasAprobadas} | ${listar(propios)} | ${listar(aceptados)} |`;
      }),
      '',
    );
    const reglasAceptadas = [...new Set(todas.filter((v) => excepciones[v.regla]).map((v) => v.regla))];
    for (const r of reglasAceptadas) md.push(`- **${r}**: ${excepciones[r]}`);
    if (reglasAceptadas.length) md.push('');
    if (sinJustificar.length) md.push(`Quedan ${sinJustificar.length} incumplimientos sin justificar: ${criticosAxe} críticos.`, '');
  } else {
    md.push('Todavía no hay resultados de axe-core. Corre `npm run manual:capturas` con la versión web de Expo levantada.', '');
  }

  const talkback = leerCsv(`${DATOS}/talkback.csv`);
  const columnas = ['nombres_y_estados', 'orden_de_lectura', 'avisos_anunciados', 'texto_200'];
  const revisadas = talkback.filter((f) => columnas.every((c) => f[c]));
  const fallas = revisadas.filter((f) => columnas.some((c) => esNo(f[c])));
  const criticosTalkback = revisadas.filter((f) => esSi(f.critico)).length;
  if (revisadas.length) {
    md.push(
      `**Revisión con TalkBack** (equipo): ${revisadas.length} de ${talkback.length} pantallas revisadas; ${fallas.length} con alguna falla y ${criticosTalkback} con fallas críticas.`,
      '',
      '<!-- tabla: Revisión con TalkBack por pantalla -->',
      '| Pantalla | Nombres y estados | Orden de lectura | Avisos anunciados | Texto al 200 % | Crítico | Observaciones |',
      '|---|---|---|---|---|---|---|',
      ...revisadas.map((f) => `| ${f.pantalla} | ${columnas.map((c) => f[c]).join(' | ')} | ${f.critico || 'no'} | ${f.observaciones || '—'} |`),
      '',
    );
  } else {
    md.push('**Revisión con TalkBack:** pendiente. La hace el equipo en un teléfono Android con `docs/metricas/datos/talkback.csv` (instrucciones en `docs/metricas/wcag.md`).', '');
  }

  const automatica = problemasApp === 0 && criticosAxe === 0;
  const completa = talkback.length > 0 && revisadas.length === talkback.length;
  const resultado = [
    problemasApp === null ? 'app: sin datos' : `app: ${problemasApp} problemas`,
    criticosAxe === null ? 'axe: sin datos' : `axe: ${criticosAxe} críticos sin justificar`,
    completa ? `TalkBack: ${criticosTalkback} críticos` : `TalkBack: ${revisadas.length} de ${talkback.length} pantallas`,
  ].join(' · ');
  resumenMetas.push([
    'Accesibilidad (WCAG 2.1 AA)',
    '0 incumplimientos críticos',
    resultado,
    !automatica ? veredicto(false) : completa ? veredicto(criticosTalkback === 0) : '**Pendiente** (TalkBack)',
  ]);
}

// ── 6. Dependencias y registros (lista MASVS, T11) ──
function seccionMasvs() {
  md.push('## Dependencias y registros (lista MASVS)', '');
  md.push('La lista completa de controles está en `docs/metricas/masvs.md`. Estas dos revisiones corren solas dentro de `npm run pruebas`.', '');

  const dep = leerJson(`${DATOS}/dependencias.json`);
  if (dep) {
    const fila = (n, d) => `| ${n} | ${d.critical} | ${d.high} | ${d.moderate} | ${d.low} |`;
    md.push(
      `**Dependencias** (\`npm audit\`, ${fecha(dep.generadoEn)}):`,
      '',
      '<!-- tabla: Avisos de seguridad de las dependencias según npm audit -->',
      '| Alcance | Críticos | Altos | Moderados | Bajos |',
      '|---|---|---|---|---|',
      fila('Todas las dependencias', dep.todas),
      fila('Solo las de producción', dep.produccion),
      '',
    );
    if (dep.graves.length) {
      md.push(
        '<!-- tabla: Avisos altos o críticos de las dependencias y su tratamiento -->',
        '| Paquete | Severidad | Corrección disponible | Tratamiento |',
        '|---|---|---|---|',
        ...dep.graves.map((g) => `| \`${g.paquete}\` | ${g.severidad === 'critical' ? 'Crítica' : 'Alta'} | ${g.correccion} | ${g.justificacion ?? '**Sin justificar: hay que corregirlo**'} |`),
        '',
      );
    }
    const sinJustificar = dep.graves.filter((g) => !g.justificacion).length;
    resumenMetas.push([
      'Dependencias (npm audit)',
      '0 críticas; altas solo con justificación',
      `críticas: ${dep.todas.critical} · altas: ${dep.todas.high} (${dep.graves.length - sinJustificar} aceptadas)`,
      sinJustificar || dep.todas.critical ? veredicto(false) : dep.todas.high ? '**Cumple con observación**' : veredicto(true),
    ]);
  } else {
    md.push('Todavía no hay resultados de `npm audit`. Corre `npm run dependencias`.', '');
  }

  const reg = leerJson(`${DATOS}/registros.json`);
  if (reg) {
    const total = reg.hallazgos.reduce((s, h) => s + h.api + h['recaudo-sim'], 0);
    md.push(
      `**Registros** (${fecha(reg.generadoEn)}): ${reg.lineas.api} líneas de la API y ${reg.lineas['recaudo-sim']} del recaudo simulado, revisadas después de las pruebas.`,
      '',
      '<!-- tabla: Datos sensibles buscados en los registros de Docker -->',
      '| Dato buscado | API | Recaudo simulado |',
      '|---|---|---|',
      ...reg.hallazgos.map((h) => `| ${h.descripcion} | ${h.api} | ${h['recaudo-sim']} |`),
      '',
    );
    resumenMetas.push(['Registros sin datos sensibles (MASVS)', '0 coincidencias', `${total} coincidencias`, veredicto(total === 0)]);
  } else {
    md.push('Todavía no hay revisión de registros. Corre `npm run registros` después de las pruebas.', '');
  }
}

// ── 7. Usabilidad: SUS y tareas (T11) ──
function seccionUsabilidad() {
  md.push('## Usabilidad (SUS y tareas)', '');
  const filas = leerCsv(`${DATOS}/sus.csv`);
  const conSus = filas.filter((f) => Array.from({ length: 10 }, (_, i) => Number(f[`sus${i + 1}`])).every((x) => Number.isInteger(x) && x >= 1 && x <= 5));
  const validacion = leerJson(`${DATOS}/validacion.json`);

  if (!conSus.length) {
    md.push(
      '**Pendiente.** La prueba con 15 personas la hace el equipo con el protocolo de `docs/metricas/protocolo-usabilidad.md`; ' +
        'los resultados se escriben en `docs/metricas/datos/sus.csv` y aparecen aquí al correr `npm run metricas`.',
      '',
    );
    resumenMetas.push(['Usabilidad (SUS)', '≥ 68', 'sin datos: prueba con usuarios pendiente', '**Pendiente**']);
    resumenMetas.push(['Recarga en la prueba de usabilidad (percentil 95)', '≤ 180 s', 'sin datos', '**Pendiente**']);
    return;
  }

  const puntajes = conSus.map((f) => {
    let suma = 0;
    for (let i = 1; i <= 10; i++) suma += i % 2 ? Number(f[`sus${i}`]) - 1 : 5 - Number(f[`sus${i}`]);
    return { participante: f.participante, puntaje: suma * 2.5 };
  });
  const v = puntajes.map((p) => p.puntaje);
  const n = v.length;
  const m = media(v);
  const margen = n > 1 ? t975(n - 1) * (desviacion(v) / Math.sqrt(n)) : 0;
  // El SUS va de 0 a 100: con pocas personas el intervalo se recorta a esa escala
  const icBajo = Math.max(0, m - margen);
  const icAlto = Math.min(100, m + margen);
  md.push(
    `**Cuestionario SUS:** ${n} participantes${n < 15 ? ` de los 15 previstos` : ''}.`,
    '',
    '<!-- tabla: Puntaje SUS de la app -->',
    '| Indicador | Resultado | Meta | Veredicto |',
    '|---|---|---|---|',
    `| Media del SUS | ${num(m)} | ≥ 68 | ${veredicto(m >= 68)} |`,
    `| Intervalo de confianza del 95 % (t de Student) | ${n > 1 ? `${num(icBajo)} a ${num(icAlto)}` : '—'} | — | — |`,
    `| Mediana | ${num(mediana(v))} | — | — |`,
    `| Desviación estándar | ${n > 1 ? num(desviacion(v)) : '—'} | — | — |`,
    `| Mínimo y máximo | ${num(Math.min(...v))} y ${num(Math.max(...v))} | — | — |`,
    `| Participantes con 68 o más | ${v.filter((x) => x >= 68).length} de ${n} | — | — |`,
    '',
  );

  const TAREAS = [
    ['t1', 'T1 · Crear la cuenta'],
    ['t2', 'T2 · Agregar la tarjeta MIO'],
    ['t3', 'T3 · Recargar'],
    ['t4', 'T4 · Consultar el historial'],
  ];
  const conTareas = filas.filter((f) => TAREAS.some(([t]) => f[`${t}_completada`]));
  md.push(
    '<!-- tabla: Éxito y tiempo de cada tarea de la prueba de usabilidad -->',
    '| Tarea | Completada | Tasa (IC 95 %, Wilson) | Mediana del tiempo | Percentil 95 del tiempo |',
    '|---|---|---|---|---|',
  );
  let p95Recarga = null;
  for (const [t, nombre] of TAREAS) {
    const hechas = conTareas.filter((f) => f[`${t}_completada`]);
    const ok = hechas.filter((f) => esSi(f[`${t}_completada`]));
    const tiempos = ok.map((f) => Number(f[`${t}_segundos`])).filter((x) => Number.isFinite(x) && x > 0);
    const [bajo, alto] = wilson(ok.length, hechas.length);
    if (t === 't3' && tiempos.length) p95Recarga = percentil(tiempos, 95);
    md.push(
      `| ${nombre} | ${ok.length} de ${hechas.length} | ${hechas.length ? `${pct(ok.length / hechas.length)} (${pct(bajo)}–${pct(alto)})` : '—'} | ` +
        `${tiempos.length ? `${num(mediana(tiempos))} s` : '—'} | ${tiempos.length ? `${num(percentil(tiempos, 95))} s` : '—'} |`,
    );
  }
  md.push('', 'El tiempo de cada tarea lo toma quien modera con un cronómetro, desde el primer toque hasta el criterio de éxito.', '');

  if (validacion?.participantes?.length) {
    const tiemposApi = validacion.participantes.flatMap((p) => p.recargas.filter((r) => r.estado === 'ACREDITADA').map((r) => r.segundosRecarga)).filter((x) => typeof x === 'number');
    if (tiemposApi.length) {
      md.push(
        `Tiempo de recarga medido por la API en las sesiones (\`acreditadaEn − iniciadaEn\`, ${tiemposApi.length} recargas de ${validacion.participantes.length} participantes): ` +
          `mediana ${num(mediana(tiemposApi))} s, percentil 95 ${num(percentil(tiemposApi, 95))} s.`,
        '',
      );
    }
  }

  resumenMetas.push(['Usabilidad (SUS)', '≥ 68', `${num(m)} (IC 95 %: ${n > 1 ? `${num(icBajo)}–${num(icAlto)}` : '—'}; ${n} participantes)`, veredicto(m >= 68)]);
  resumenMetas.push([
    'Recarga en la prueba de usabilidad (percentil 95)',
    '≤ 180 s',
    p95Recarga === null ? 'sin datos' : `${num(p95Recarga)} s`,
    p95Recarga === null ? '—' : veredicto(p95Recarga <= 180),
  ]);
}

seccionRecargas();
seccionJmeter();
seccionNewman();
seccionZap();
seccionAccesibilidad();
seccionMasvs();
seccionUsabilidad();

const encabezado = [
  '<!-- Archivo generado por «npm run metricas» (scripts/metricas.mjs). No lo edites a mano: vuelve a correr las pruebas. -->',
  '# Resultados de las pruebas',
  '',
  `Fecha de generación: ${fecha(new Date().toISOString())}.`,
  '',
  `Las metas son las de la Tabla 9 y los criterios de aceptación de la Tabla 18 del documento maestro. ` +
    'Las métricas se reportan con media, mediana y percentil 95, y la tasa de éxito con su intervalo de confianza del 95 %.',
  '',
  '## Resumen frente a las metas',
  '',
  '<!-- tabla: Resultados de las pruebas frente a las metas de la Tabla 9 -->',
  '| Indicador | Meta | Resultado | Veredicto |',
  '|---|---|---|---|',
  ...resumenMetas.map((f) => `| ${f.join(' | ')} |`),
  '',
  'Las filas de accesibilidad, dependencias, registros y usabilidad se agregaron en T11 (ADR 0019). La revisión con TalkBack y la prueba SUS las hace el equipo con personas; ' +
    'mientras falten, su veredicto dice «Pendiente».',
  '',
];
writeFileSync(SALIDA, [...encabezado, ...md].join('\n'));
console.log(`Escrito ${SALIDA}`);
for (const f of resumenMetas) console.log(`  ${f[0]}: ${f[2]} → ${f[3].replace(/\*/g, '')}`);
