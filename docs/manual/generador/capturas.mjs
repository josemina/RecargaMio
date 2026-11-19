// Toma las capturas de evidencia del manual con los servicios levantados (docker compose up -d --wait).
// - Terminal: ejecuta cada comando de verdad y dibuja su salida sin editarla.
// - Web: Adminer y Mailpit con Google Chrome sin ventana.
// - Diagrama de arquitectura en SVG.
// - Accesibilidad (T11): cada pantalla de la app que se fotografía se analiza también con axe-core (WCAG 2.1 A y AA);
//   el resultado queda en docs/metricas/datos/axe.json para `npm run metricas`.
// Uso: npm run manual:capturas (desde la raíz del repositorio)
import { execSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';

const aqui = path.dirname(fileURLToPath(import.meta.url));
const raiz = path.resolve(aqui, '../../..');
const dirEvidencias = path.resolve(aqui, '../imagenes/evidencias');
const dirDiagramas = path.resolve(aqui, '../imagenes/diagramas');
mkdirSync(dirEvidencias, { recursive: true });
mkdirSync(dirDiagramas, { recursive: true });

// Variables del .env (solo se usan para ejecutar; nunca se escriben en una imagen)
const env = Object.fromEntries(
  readFileSync(path.join(raiz, '.env'), 'utf8')
    .split('\n')
    .filter((l) => /^[A-Z_]+=/.test(l))
    .map((l) => [l.slice(0, l.indexOf('=')), l.slice(l.indexOf('=') + 1)]),
);
const entornoShell = { ...process.env, RECAUDO_API_KEY: env.RECAUDO_API_KEY, SEMILLA_CONTRASENA: env.SEMILLA_CONTRASENA };

// eslint-disable-next-line no-control-regex -- se buscan a propósito los códigos de color de la terminal
const quitarAnsi = (t) => t.replace(/\u001b\[[0-9;?]*[A-Za-z]/g, '').replace(/\r/g, '');
const escapar = (t) => t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

function ejecutar(comando) {
  try {
    return quitarAnsi(execSync(comando, { cwd: raiz, env: entornoShell, encoding: 'utf8', shell: '/bin/zsh', stdio: 'pipe' }));
  } catch (error) {
    return quitarAnsi(`${error.stdout ?? ''}${error.stderr ?? ''}`);
  }
}

/** Ejecuta cada comando y arma el HTML de una terminal con el comando y su salida real. */
function terminal(titulo, comandos) {
  const bloques = comandos
    .map(({ mostrar, ejecutar: cmd }) => {
      const salida = ejecutar(cmd ?? mostrar).trimEnd();
      if ([env.RECAUDO_API_KEY, env.DB_PASSWORD, env.SEMILLA_CONTRASENA, env.PRUEBAS_CONTRASENA].some((secreto) => secreto && salida.includes(secreto))) {
        throw new Error(`La salida de "${mostrar}" contiene un secreto; no se captura.`);
      }
      return `<div class="cmd"><span class="prompt">recargamio %</span> ${escapar(mostrar)}</div><pre>${escapar(salida)}</pre>`;
    })
    .join('');
  return `<!doctype html><html><head><meta charset="utf-8"><style>
    body{margin:0;background:#e9ecf2;font-family:-apple-system,"Segoe UI",sans-serif}
    .ventana{margin:24px;border-radius:12px;overflow:hidden;box-shadow:0 8px 24px rgba(0,0,0,.25);width:1100px}
    .barra{background:#2b2f3a;color:#c7ced8;padding:10px 14px;font-size:13px;display:flex;gap:8px;align-items:center}
    .barra i{width:12px;height:12px;border-radius:50%;display:inline-block}
    .cuerpo{background:#1b1f2a;color:#e6edf3;padding:16px 20px;font:13px/1.45 Menlo,Consolas,monospace}
    .cmd{color:#9ad1ff;margin-top:8px}.prompt{color:#7ee787}
    pre{margin:4px 0 10px;white-space:pre-wrap;overflow-wrap:anywhere;font:inherit} .cmd{overflow-wrap:anywhere}
  </style></head><body><div class="ventana" id="captura"><div class="barra"><i style="background:#ff5f57"></i><i style="background:#febc2e"></i><i style="background:#28c840"></i><span style="margin-left:8px">${escapar(titulo)}</span></div><div class="cuerpo">${bloques}</div></div></body></html>`;
}

function diagramaArquitectura() {
  const caja = (x, y, w, h, titulo, detalle, { pendiente = false, color = '#0B3D91', fondo = '#FFFFFF' } = {}) => `
    <rect x="${x}" y="${y}" width="${w}" height="${h}" rx="12" fill="${fondo}" stroke="${color}" stroke-width="2" ${pendiente ? 'stroke-dasharray="7 5"' : ''}/>
    <text x="${x + w / 2}" y="${y + h / 2 - 6}" text-anchor="middle" class="t">${titulo}</text>
    <text x="${x + w / 2}" y="${y + h / 2 + 14}" text-anchor="middle" class="d">${detalle}</text>`;
  const flecha = (puntos, etiqueta, ex, ey, { pendiente = false } = {}) => `
    <polyline points="${puntos}" fill="none" stroke="#5B6475" stroke-width="2" marker-end="url(#punta)" ${pendiente ? 'stroke-dasharray="6 5"' : ''}/>
    ${etiqueta ? `<text x="${ex}" y="${ey}" class="e" text-anchor="middle">${etiqueta}</text>` : ''}`;
  return `<!doctype html><html><head><meta charset="utf-8"><style>
    body{margin:0;background:#fff;font-family:Arial,sans-serif}
    .t{font:bold 15px Arial;fill:#1B1F2A}.d{font:12px Arial;fill:#5B6475}.e{font:12px Arial;fill:#1B1F2A}
    .r{font:bold 13px Arial;fill:#0B3D91}
  </style></head><body><svg id="captura" width="1200" height="680" viewBox="0 0 1200 680" xmlns="http://www.w3.org/2000/svg">
    <defs><marker id="punta" markerWidth="10" markerHeight="8" refX="9" refY="4" orient="auto"><path d="M0,0 L10,4 L0,8 z" fill="#5B6475"/></marker></defs>
    <rect x="270" y="30" width="620" height="605" rx="16" fill="#F4F6FA" stroke="#C7CEDB" stroke-width="2" stroke-dasharray="8 6"/>
    <text x="290" y="56" class="r">docker compose</text>
    ${caja(40, 260, 180, 90, 'App móvil', 'Expo SDK 58 · T9 y T10')}
    ${caja(320, 80, 200, 70, 'tunel', 'cloudflared · T5', { pendiente: true })}
    ${caja(320, 250, 200, 100, 'api :3000', 'Express + Prisma', { fondo: '#E6EDFA' })}
    ${caja(620, 250, 220, 110, 'db :5432', 'PostgreSQL 16', { fondo: '#FFF3D6', color: '#7A4B00' })}
    <text x="730" y="338" text-anchor="middle" class="d">recargamio · recaudo (+ bases _pruebas)</text>
    ${caja(620, 430, 220, 80, 'recaudo-sim :4000', 'Recaudo simulado', { fondo: '#E6EDFA' })}
    ${caja(320, 430, 200, 70, 'mailpit :8025', 'Correo de pruebas')}
    ${caja(320, 530, 200, 60, 'adminer :8080', 'Visor de la base')}
    ${caja(960, 80, 200, 80, 'Wompi Sandbox', 'Nequi · PSE · T5', { pendiente: true, color: '#1E8E3E' })}
    ${caja(960, 470, 200, 80, 'Firebase (FCM)', 'Notificaciones · T6', { pendiente: true, color: '#1E8E3E' })}
    ${flecha('220,305 318,305', 'HTTP + JWT', 268, 296)}
    ${flecha('520,300 618,300', 'Prisma', 569, 292)}
    ${flecha('520,335 618,462', 'X-Api-Key', 600, 392)}
    ${flecha('730,430 730,362', '', 0, 0)}
    ${flecha('420,350 420,428', 'SMTP', 446, 395)}
    ${flecha('520,560 870,560 870,305 842,305', '', 0, 0)}
    ${flecha('960,110 522,110', 'webhook', 740, 102, { pendiente: true })}
    ${flecha('420,150 420,248', '', 0, 0, { pendiente: true })}
    ${flecha('520,262 575,262 575,195 1060,195 1060,162', 'crea la transacción (HTTPS)', 815, 187, { pendiente: true })}
    ${flecha('320,330 295,330 295,620 1060,620 1060,552', 'envía la notificación', 700, 612, { pendiente: true })}
    ${flecha('960,510 935,510 935,660 130,660 130,352', 'push al teléfono', 540, 652, { pendiente: true })}
    <text x="40" y="80" class="d">Línea continua: ya construido</text>
    <text x="40" y="100" class="d">Línea punteada: tarea futura</text>
  </svg></body></html>`;
}

async function capturarHtml(pagina, html, archivo) {
  await pagina.setContent(html);
  await pagina.locator('#captura').screenshot({ path: archivo });
  console.log('✔', path.relative(raiz, archivo));
}

const navegador = await chromium.launch({ channel: 'chrome' });
const pagina = await navegador.newPage({ viewport: { width: 1200, height: 900 }, deviceScaleFactor: 2 });

await capturarHtml(
  pagina,
  terminal('Servicios levantados', [
    { mostrar: 'docker compose up -d --wait', ejecutar: 'docker compose up -d --wait 2>&1 | tail -4' },
    { mostrar: 'docker compose ps --format "table {{.Service}}\\t{{.Status}}\\t{{.Ports}}"', ejecutar: 'docker compose ps --format "table {{.Service}}\\t{{.Status}}\\t{{.Ports}}"' },
  ]),
  path.join(dirEvidencias, 'docker-compose-ps.png'),
);

await capturarHtml(
  pagina,
  terminal('Endpoints de salud', [{ mostrar: 'curl -s localhost:3000/health' }, { mostrar: 'curl -s localhost:4000/health' }]),
  path.join(dirEvidencias, 'health.png'),
);

const H = '-H "X-Api-Key: $RECAUDO_API_KEY"';
const J = '-H "Content-Type: application/json"';
ejecutar(`curl -s -X POST ${H} localhost:4000/simulacion/reiniciar`);
await capturarHtml(
  pagina,
  terminal('Idempotencia del recaudo simulado: la misma referencia dos veces', [
    { mostrar: `curl -s ${H} localhost:4000/tarjetas/1234564821` },
    { mostrar: `curl -s -X POST ${H} ${J} -d '{"monto":10000,"referencia":"RM-DEMO-1"}' localhost:4000/tarjetas/1234564821/creditos` },
    { mostrar: `curl -s -X POST ${H} ${J} -d '{"monto":10000,"referencia":"RM-DEMO-1"}' localhost:4000/tarjetas/1234564821/creditos` },
    { mostrar: `curl -s ${H} localhost:4000/tarjetas/1234564821` },
  ]),
  path.join(dirEvidencias, 'idempotencia.png'),
);
ejecutar(`curl -s -X POST ${H} localhost:4000/simulacion/reiniciar`);

await capturarHtml(
  pagina,
  terminal('Pruebas automatizadas', [
    { mostrar: 'docker compose run --rm api npm test 2>&1 | grep -E "PASS|FAIL|Tests:|Suites:"' },
    { mostrar: 'docker compose run --rm recaudo-sim npm test 2>&1 | grep -E "PASS|FAIL|Tests:|Suites:"' },
    { mostrar: 'npm run lint --silent && npm run typecheck --silent > /dev/null && echo "Lint y tipos sin errores"' },
  ]),
  path.join(dirEvidencias, 'pruebas.png'),
);

// Autenticación (HU-06)
const JSON_H = "-H 'Content-Type: application/json'";
await capturarHtml(
  pagina,
  terminal('Autenticación (HU-06): política obligatoria, contador de intentos, ingreso y /me', [
    { mostrar: `curl -s ${JSON_H} -d '{"nombre":"Ana Prueba","correo":"ana@recargamio.test","contrasena":"ClaveSegura1"}' localhost:3000/auth/registro | jq -c` },
    { mostrar: `curl -s ${JSON_H} -d '{"correo":"viviana@recargamio.test","contrasena":"Equivocada1"}' localhost:3000/auth/ingreso | jq -c` },
    { mostrar: `curl -s ${JSON_H} -d "{\\"correo\\":\\"viviana@recargamio.test\\",\\"contrasena\\":\\"$SEMILLA_CONTRASENA\\"}" localhost:3000/auth/ingreso | jq '{usuario, accesoExpiraEn, sesionExpiraEn, tokenAcceso: (.tokenAcceso[0:24] + "…")}'` },
    { mostrar: `TOKEN=$(curl -s ${JSON_H} -d "{\\"correo\\":\\"viviana@recargamio.test\\",\\"contrasena\\":\\"$SEMILLA_CONTRASENA\\"}" localhost:3000/auth/ingreso | jq -r .tokenAcceso) && curl -s -H "Authorization: Bearer $TOKEN" localhost:3000/me | jq -c` },
  ]),
  path.join(dirEvidencias, 'auth-flujo.png'),
);

// Tarjetas e historial (HU-07 y HU-03). El token se obtiene con el mismo ingreso que se muestra.
const INGRESO = `curl -s ${JSON_H} -d "{\\"correo\\":\\"viviana@recargamio.test\\",\\"contrasena\\":\\"$SEMILLA_CONTRASENA\\"}" localhost:3000/auth/ingreso | jq -r .tokenAcceso`;
entornoShell.TOKEN = ejecutar(INGRESO).trim();
const BEARER = '-H "Authorization: Bearer $TOKEN"';
await capturarHtml(
  pagina,
  terminal('Tarjetas (HU-07) y saldo e historial (HU-03)', [
    { mostrar: `TOKEN=$(${INGRESO})`, ejecutar: 'true' },
    { mostrar: `curl -s ${BEARER} localhost:3000/tarjetas | jq -c '{registradas, maximo, tarjetas: [.tarjetas[] | {alias, ultimos4, saldo, saldoBajo}]}'` },
    { mostrar: `for n in 9087654321 1234560001 1234560002; do curl -s ${BEARER} ${JSON_H} -d "{\\"numero\\":\\"$n\\",\\"alias\\":\\"Familiar $n\\"}" localhost:3000/tarjetas | jq -c '{registradas, ultimos4: .tarjeta.ultimos4, saldo: .tarjeta.saldo}'; done` },
    { mostrar: `curl -s ${BEARER} ${JSON_H} -d '{"numero":"1234560003","alias":"Sexta"}' localhost:3000/tarjetas | jq -c` },
    { mostrar: `curl -s -X POST -H "X-Api-Key: $RECAUDO_API_KEY" ${JSON_H} -d '{"numero":"1234564821","ruta":"P47"}' localhost:4000/simulacion/viaje | jq -c '{ruta, valor, saldo}'` },
    { mostrar: `ID=$(curl -s ${BEARER} localhost:3000/tarjetas | jq -r '.tarjetas[0].id') && curl -s ${BEARER} "localhost:3000/tarjetas/$ID/movimientos?tipo=viajes&limite=3" | jq -c '[.movimientos[] | {fecha: .fecha[0:16], valor, descripcion}]'` },
  ]),
  path.join(dirEvidencias, 'tarjetas-flujo.png'),
);
// Limpieza: Viviana vuelve a quedar con sus 2 tarjetas y el recaudo con sus saldos semilla
ejecutar(`for id in $(curl -s ${BEARER} localhost:3000/tarjetas | jq -r '.tarjetas[2:][].id'); do curl -s -X DELETE ${BEARER} localhost:3000/tarjetas/$id; done`);
ejecutar(`curl -s -X POST -H "X-Api-Key: $RECAUDO_API_KEY" localhost:4000/simulacion/reiniciar`);

// Recargas (HU-01, HU-02 y HU-04) con la pasarela simulada, que envía el webhook firmado
const MI = `curl -s ${BEARER} localhost:3000/tarjetas | jq -r '.tarjetas[0].id'`;
entornoShell.MI = ejecutar(MI).trim();
const PAGO = (destino, monto, medio) => `curl -s ${BEARER} ${JSON_H} -d "{${destino},\\"monto\\":${monto},${medio},\\"aceptaTerminosPasarela\\":true}" localhost:3000/recargas`;
const PROPIA = '\\"tarjetaId\\":\\"$MI\\"';
const NEQUI = (cel) => `\\"medioPago\\":\\"NEQUI\\",\\"datosMedio\\":{\\"celular\\":\\"${cel}\\"}`;
await capturarHtml(
  pagina,
  terminal('Recargas (HU-01, HU-02, HU-04) con la pasarela simulada', [
    { mostrar: `MI=$(${MI})`, ejecutar: 'true' },
    { mostrar: `${PAGO(PROPIA, 20000, NEQUI('3991111111'))} | jq -c '{referencia, estado, total, mensaje}'` },
    { mostrar: `ID=$(${PAGO(PROPIA, 10000, NEQUI('3991111111'))} | jq -r .id) && sleep 6 && curl -s ${BEARER} localhost:3000/recargas/$ID | jq -c '{estado, tiempoSegundos, comprobante}'` },
    { mostrar: `ID=$(${PAGO(PROPIA, 5000, NEQUI('3992222222'))} | jq -r .id) && sleep 6 && curl -s ${BEARER} localhost:3000/recargas/$ID | jq -c '{estado, motivo, mensaje}'` },
    { mostrar: `ID=$(${PAGO('\\"numeroDestino\\":\\"9087654321\\",\\"confirmacionNumero\\":\\"9087654321\\"', 10000, '\\"medioPago\\":\\"BANCOLOMBIA_TRANSFER\\"')} | jq -r .id) && sleep 6 && curl -s ${BEARER} localhost:3000/recargas/$ID | jq -c '{estado, comprobante}'` },
    { mostrar: `curl -s ${JSON_H} -H "X-Event-Checksum: $(printf 'A%.0s' {1..64})" -d '{"event":"transaction.updated","data":{"transaction":{"id":"falso","reference":"RM-000001-AAAA","status":"APPROVED","amount_in_cents":5000000}},"environment":"test","signature":{"properties":["transaction.id"],"checksum":"x"},"timestamp":1}' -w ' [HTTP %{http_code}]' localhost:3000/webhooks/wompi` },
  ]),
  path.join(dirEvidencias, 'recargas-flujo.png'),
);
ejecutar(`curl -s -X POST -H "X-Api-Key: $RECAUDO_API_KEY" localhost:4000/simulacion/reiniciar`);

// Alertas de saldo bajo (HU-05): desactivar, activar, viaje que dispara el aviso y regla de 12 horas
const MAMA = `curl -s ${BEARER} localhost:3000/tarjetas | jq -r '.tarjetas[] | select(.ultimos4=="7730") | .id'`;
entornoShell.MAMA = ejecutar(MAMA).trim();
// Bandeja vacía para que el conteo de la captura solo muestre los avisos de esta corrida
ejecutar('docker compose exec -T db psql -U recargamio -d recargamio -c "DELETE FROM notificacion"');
const ALERTA = (cuerpo) => `curl -s -X PUT ${BEARER} ${JSON_H} -d '${cuerpo}' localhost:3000/tarjetas/$MAMA/alerta | jq -c '{alias, saldo, saldoBajo, alerta}'`;
const VIAJE = (ruta) => `curl -s -X POST -H "X-Api-Key: $RECAUDO_API_KEY" ${JSON_H} -d '{"numero":"1234567730","ruta":"${ruta}"}' localhost:4000/simulacion/viaje`;
await capturarHtml(
  pagina,
  terminal('Alertas de saldo bajo (HU-05): configuración, aviso después de un viaje y máximo uno cada 12 horas', [
    { mostrar: `MAMA=$(${MAMA})`, ejecutar: 'true' },
    { mostrar: ALERTA('{"umbral":5000,"activa":false}') },
    { mostrar: ALERTA('{"umbral":5000,"activa":true}') },
    { mostrar: `curl -s ${BEARER} ${JSON_H} -d '{"token":"fcm_demo:APA91b-telefono-android"}' localhost:3000/dispositivos | jq -c` },
    { mostrar: `${VIAJE('E21')} | jq -c '{ruta, valor, saldo}'` },
    { mostrar: `sleep 1 && curl -s ${BEARER} "localhost:3000/notificaciones?soloNoLeidas=1" | jq -c '{noLeidas, ultima: (.notificaciones[0] | {tipo, titulo, cuerpo})}'` },
    { mostrar: `${VIAJE('T31')} | jq -c '{saldo}' && sleep 1 && curl -s ${BEARER} "localhost:3000/notificaciones?limite=50" | jq -c '{avisosSaldoBajo: ([.notificaciones[] | select(.tipo=="SALDO_BAJO")] | length)}'` },
  ]),
  path.join(dirEvidencias, 'alertas-flujo.png'),
);
// Perfil y eliminación de la cuenta (T7) con un usuario de demostración; Viviana no se toca.
// La cuenta se elimina al final, así que el correo queda libre y la captura se puede repetir.
const CARLOS = `curl -s ${JSON_H} -d '{"nombre":"Carlos Demo","correo":"carlos.demo@recargamio.test","contrasena":"ClaveSegura1","aceptaPolitica":true}' localhost:3000/auth/registro | jq -r .tokenAcceso`;
entornoShell.TC = ejecutar(CARLOS).trim();
const BEARER_C = '-H "Authorization: Bearer $TC"';
await capturarHtml(
  pagina,
  terminal('Perfil y privacidad (T7): rectificar datos y eliminar la cuenta (Ley 1581 de 2012)', [
    { mostrar: `TC=$(${CARLOS})`, ejecutar: 'true' },
    { mostrar: `curl -s ${BEARER_C} ${JSON_H} -d '{"numero":"1234560002","alias":"Trabajo"}' localhost:3000/tarjetas | jq -c '{registradas, ultimos4: .tarjeta.ultimos4}'` },
    { mostrar: `curl -s -X PATCH ${BEARER_C} ${JSON_H} -d '{"nombre":"Carlos Andrés Demo"}' localhost:3000/me | jq -c '{nombre, correo, politica}'` },
    { mostrar: `curl -s -X PATCH ${BEARER_C} ${JSON_H} -d '{"correo":"carlos.nuevo@recargamio.test","contrasenaActual":"Equivocada1"}' localhost:3000/me | jq -c` },
    { mostrar: `curl -s -X DELETE ${BEARER_C} ${JSON_H} -d '{"contrasena":"ClaveSegura1"}' localhost:3000/me | jq -c` },
    { mostrar: `curl -s ${BEARER_C} -w ' [HTTP %{http_code}]' localhost:3000/me` },
    { mostrar: `curl -s ${JSON_H} -d '{"correo":"carlos.demo@recargamio.test","contrasena":"ClaveSegura1"}' localhost:3000/auth/ingreso | jq -c .error` },
    {
      mostrar: `docker compose exec -T db psql -U recargamio -d recargamio -c "SELECT u.nombre, u.correo, u.eliminado_en IS NOT NULL AS eliminada, (SELECT count(*) FROM tarjeta t WHERE t.usuario_id = u.id) AS tarjetas, (SELECT count(*) FROM autorizacion_datos a WHERE a.usuario_id = u.id) AS autorizaciones FROM usuario u WHERE u.eliminado_en IS NOT NULL ORDER BY u.eliminado_en DESC LIMIT 1"`,
    },
  ]),
  path.join(dirEvidencias, 'perfil-eliminar-cuenta.png'),
);

// Limpieza: sin teléfono de prueba, bandeja vacía y saldos semilla
ejecutar(`curl -s -X DELETE ${BEARER} ${JSON_H} -d '{"token":"fcm_demo:APA91b-telefono-android"}' localhost:3000/dispositivos`);
ejecutar(`curl -s -X POST ${BEARER} localhost:3000/notificaciones/leidas`);
ejecutar(`curl -s -X POST -H "X-Api-Key: $RECAUDO_API_KEY" localhost:4000/simulacion/reiniciar`);

// Recuperación de contraseña: correo en Mailpit y página del enlace (sin enviar el formulario)
ejecutar('curl -s -X DELETE localhost:8025/api/v1/messages');
ejecutar(`curl -s ${JSON_H} -d '{"correo":"viviana@recargamio.test"}' localhost:3000/auth/recuperar`);
await new Promise((r) => setTimeout(r, 2000));
const bandeja = JSON.parse(ejecutar('curl -s localhost:8025/api/v1/messages'));
const idCorreo = bandeja.messages?.[0]?.ID;
if (!idCorreo) throw new Error('No llegó el correo de recuperación a Mailpit.');
const textoCorreo = JSON.parse(ejecutar(`curl -s localhost:8025/api/v1/message/${idCorreo}`)).Text;
const tokenEnlace = /token=([A-Za-z0-9_-]+)/.exec(textoCorreo)?.[1];

// Adminer (perfil herramientas)
ejecutar('docker compose --profile herramientas up -d --wait adminer');
await pagina.setViewportSize({ width: 1200, height: 760 });
await pagina.goto('http://localhost:8080');
await pagina.selectOption('select[name="auth[driver]"]', 'pgsql');
await pagina.fill('input[name="auth[server]"]', 'db');
await pagina.fill('input[name="auth[username]"]', 'recargamio');
await pagina.fill('input[name="auth[password]"]', env.DB_PASSWORD);
await pagina.fill('input[name="auth[db]"]', 'recargamio');
await Promise.all([pagina.waitForLoadState(), pagina.click('input[type="submit"]')]);
await pagina.goto('http://localhost:8080/?pgsql=db&username=recargamio&db=recargamio&ns=public');
await pagina.screenshot({ path: path.join(dirEvidencias, 'adminer-tablas.png') });
console.log('✔ docs/manual/imagenes/evidencias/adminer-tablas.png');
// Solo las columnas que muestran la protección del número (ADR 0009)
const columnas = ['alias', 'ultimos_4', 'numero_cifrado', 'numero_hmac', 'activa']
  .map((c, i) => `columns[${i}][fun]=&columns[${i}][col]=${c}`)
  .join('&');
await pagina.setViewportSize({ width: 1200, height: 520 });
await pagina.goto(`http://localhost:8080/?pgsql=db&username=recargamio&db=recargamio&ns=public&select=tarjeta&${columnas}&text_length=40`);
await pagina.screenshot({ path: path.join(dirEvidencias, 'adminer-tarjeta.png') });
console.log('✔ docs/manual/imagenes/evidencias/adminer-tarjeta.png');

// Mailpit
await pagina.setViewportSize({ width: 1200, height: 520 });
await pagina.goto('http://localhost:8025');
await pagina.waitForTimeout(1500);
await pagina.screenshot({ path: path.join(dirEvidencias, 'mailpit.png') });
console.log('✔ docs/manual/imagenes/evidencias/mailpit.png');
await pagina.setViewportSize({ width: 1200, height: 760 });
await pagina.goto(`http://localhost:8025/view/${idCorreo}`);
await pagina.waitForTimeout(1500);
await pagina.screenshot({ path: path.join(dirEvidencias, 'mailpit-correo.png') });
console.log('✔ docs/manual/imagenes/evidencias/mailpit-correo.png');

// Página del enlace en tamaño de teléfono
await pagina.setViewportSize({ width: 390, height: 640 });
await pagina.goto(`http://localhost:3000/restablecer?token=${tokenEnlace}`);
await pagina.screenshot({ path: path.join(dirEvidencias, 'restablecer.png') });
console.log('✔ docs/manual/imagenes/evidencias/restablecer.png');

// T8 · Pruebas y documentación de la API (ADR 0016). Los reportes salen de la última corrida de «npm run pruebas».
await pagina.setViewportSize({ width: 1200, height: 900 });
await pagina.goto('http://localhost:3000/docs/');
await pagina.waitForSelector('.opblock-tag', { timeout: 15000 });
await pagina.waitForTimeout(800);
await pagina.screenshot({ path: path.join(dirEvidencias, 'swagger.png') });
console.log('✔ docs/manual/imagenes/evidencias/swagger.png');

const reporteNewman = 'tests/postman/reportes/newman.json';
await capturarHtml(
  pagina,
  terminal('Pruebas de API: colección de Postman ejecutada con Newman (última corrida de npm run pruebas)', [
    {
      mostrar: `jq '.run.stats | {peticiones: .requests, scripts: .testScripts, aserciones: .assertions}' ${reporteNewman}`,
    },
    { mostrar: `jq -r '.run.executions[] | "\\(.response.code)  \\(.response.responseTime) ms  \\(.item.name)"' ${reporteNewman} | head -24` },
  ]),
  path.join(dirEvidencias, 'newman.png'),
);

await pagina.setViewportSize({ width: 1200, height: 1000 });
await pagina.goto(`file://${path.join(raiz, 'tests/jmeter/reportes/html/index.html')}`);
await pagina.waitForTimeout(2500);
await pagina.locator('#statisticsTable').scrollIntoViewIfNeeded().catch(() => undefined);
await pagina.screenshot({ path: path.join(dirEvidencias, 'jmeter.png') });
console.log('✔ docs/manual/imagenes/evidencias/jmeter.png');

await pagina.setViewportSize({ width: 1200, height: 900 });
await pagina.goto(`file://${path.join(raiz, 'tests/seguridad/reportes/zap.html')}`);
await pagina.waitForTimeout(1000);
await pagina.screenshot({ path: path.join(dirEvidencias, 'zap.png') });
console.log('✔ docs/manual/imagenes/evidencias/zap.png');

// T11 · Entorno de pruebas para la validación con usuarios (ADR 0019). Se muestra el resumen final de «npm run demo».
await capturarHtml(
  pagina,
  terminal('Entorno de pruebas para la validación', [
    { mostrar: 'npm run demo', ejecutar: `npm run --silent demo 2>/dev/null | sed -n '/Entorno de pruebas listo/,$p'` },
  ]),
  path.join(dirEvidencias, 'demo.png'),
);

// T9 · Catálogo de componentes de la app (versión web de Expo). Solo si está corriendo:
//   cd apps/mobile && npx expo start --web --port 8081
const catalogoDisponible = await fetch('http://localhost:8081').then((r) => r.ok).catch(() => false);
if (catalogoDisponible) {
  // Una ventana alta de 390 px (el ancho de Figma) para que todo el catálogo quepa sin desplazarse; luego se corta en partes
  const alto = 6400;
  await pagina.setViewportSize({ width: 390, height: alto });
  await pagina.goto('http://localhost:8081/catalogo');
  await pagina.getByRole('heading', { name: 'Selector de tarjeta' }).waitFor({ timeout: 60000 });
  await pagina.waitForTimeout(1500);
  // Se corta por grupos de secciones, para que cada figura del manual se lea bien
  const GRUPOS = [
    ['Íconos', 'Chip (monto y filtro)'],
    ['Chip (monto y filtro)', 'Aviso'],
    ['Aviso', 'Tarjeta MIO'],
    ['Tarjeta MIO', 'Movimiento del historial'],
    ['Movimiento del historial', 'Fila de ajuste'],
    ['Fila de ajuste', null],
  ];
  const posicion = async (titulo) => (await pagina.getByRole('heading', { name: titulo, exact: true }).boundingBox()).y;
  const fin = (await posicion('Barra de estado')) + 150;
  for (const [i, [desde, hasta]] of GRUPOS.entries()) {
    const y = (await posicion(desde)) - 16;
    const altoParte = (hasta ? await posicion(hasta) : fin) - 16 - y;
    const archivo = path.join(dirEvidencias, `catalogo-${i + 1}.png`);
    await pagina.screenshot({ path: archivo, clip: { x: 0, y, width: 390, height: altoParte } });
    console.log('✔', path.relative(raiz, archivo));
  }

  // T10 · Pantallas de la app con datos reales de la API. Cuenta desechable con tarjetas que no son de Viviana;
  // al final se elimina por la API (DELETE /me). La contraseña se genera aquí y no se imprime.
  const API = 'http://localhost:3000';
  const correoApp = `capturas-${Date.now()}@recargamio.test`;
  const claveApp = `Capturas${Math.floor(Math.random() * 1e8)}`;
  const llamar = async (ruta, metodo, cuerpo, token) =>
    (await fetch(`${API}${ruta}`, {
      method: metodo,
      headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: cuerpo ? JSON.stringify(cuerpo) : undefined,
    })).json();
  const { tokenAcceso } = await llamar('/auth/registro', 'POST', { nombre: 'Laura Capturas', correo: correoApp, contrasena: claveApp, aceptaPolitica: true });
  await llamar('/tarjetas', 'POST', { numero: '1234560001', alias: 'Mi tarjeta' }, tokenAcceso);
  const { tarjeta: deLaAbuela } = await llamar('/tarjetas', 'POST', { numero: '1234560003', alias: 'Tarjeta de la abuela' }, tokenAcceso);
  await llamar(`/tarjetas/${deLaAbuela.id}/alerta`, 'PUT', { umbral: 10000, activa: true }, tokenAcceso);

  const app = await navegador.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
  app.on('dialog', (d) => d.accept());

  // T11 · axe-core sobre la misma pantalla que se fotografía. La versión web es react-native-web: sirve de evidencia
  // automática, pero no reemplaza la revisión con TalkBack en el teléfono (docs/metricas/wcag.md).
  const axeFuente = readFileSync(createRequire(import.meta.url).resolve('axe-core/axe.min.js'), 'utf8');
  const axeVersion = createRequire(import.meta.url)('axe-core/package.json').version;
  const PANTALLAS_AXE = {
    '1-1-ingreso': '1.1 Inicio de sesión',
    '1-2-ingreso-error': '1.2 Error de ingreso',
    '1-3-crear-cuenta': '1.3 Crear cuenta',
    '1-4-recuperar': '1.4 Recuperar contraseña',
    '2-1-mis-tarjetas': '2.1 Mis tarjetas',
    '2-3-detalle-tarjeta': '2.3 Detalle de tarjeta',
    '2-2-agregar-tarjeta': '2.2 Agregar tarjeta',
    '3-1-recargar': '3.1 Recargar saldo',
    '3-3-pendiente': '3.3 Esperando confirmación',
    '3-4-exitosa': '3.4 Recarga exitosa',
    '4-1-historial': '4.1 Historial',
    '3-5-rechazado': '3.5 Pago rechazado',
    '3-2-otra-persona': '3.2 Recargar a otra persona',
    avisos: 'Bandeja de avisos',
    '5-1-perfil': '5.1 Perfil',
    '4-2-alertas': '4.2 Alertas de saldo bajo',
    '5-2-privacidad': '5.2 Privacidad y datos',
    '5-3-ayuda': '5.3 Ayuda y PQR',
  };
  const resultadosAxe = [];
  // Las dos funciones de evaluate corren dentro del navegador, donde existen window y document
  /* global window, document */
  const analizarAxe = async (nombre) => {
    if (!(await app.evaluate(() => 'axe' in window))) await app.addScriptTag({ content: axeFuente });
    const r = await app.evaluate(async () => {
      const res = await window.axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'] } });
      return {
        reglasAprobadas: res.passes.length,
        violaciones: res.violations.map((v) => ({
          regla: v.id,
          impacto: v.impact,
          descripcion: v.help,
          criterios: v.tags.filter((t) => /^wcag\d{3,4}$/.test(t)),
          elementos: v.nodes.length,
          ejemplos: v.nodes.slice(0, 3).map((n) => n.target.join(' ')),
          mensajes: v.nodes.slice(0, 3).map((n) => [...n.any, ...n.all, ...n.none][0]?.message ?? ''),
        })),
      };
    });
    resultadosAxe.push({ pantalla: PANTALLAS_AXE[nombre] ?? nombre, ...r });
    const total = r.violaciones.reduce((s, v) => s + v.elementos, 0);
    console.log(total ? `  ⚠ axe: ${r.violaciones.map((v) => `${v.regla} (${v.impacto}, ${v.elementos})`).join(', ')}` : '  ✔ axe: sin incumplimientos');
  };
  const foto = async (nombre) => {
    await app.waitForTimeout(700);
    await app.screenshot({ path: path.join(dirEvidencias, `app-${nombre}.png`) });
    console.log('✔', `docs/manual/imagenes/evidencias/app-${nombre}.png`);
    await analizarAxe(nombre);
  };
  const visible = (localizador) => localizador.locator('visible=true').first();
  const boton = (nombre) => visible(app.getByRole('button', { name: nombre, exact: true }));
  const encabezado = (nombre) => visible(app.getByRole('heading', { name: nombre, exact: true })).waitFor({ timeout: 20000 });
  try {
    await app.goto('http://localhost:8081/');
    await encabezado('Ingresa a tu cuenta');
    await foto('1-1-ingreso');
    await visible(app.getByLabel('Correo electrónico')).fill(correoApp);
    await visible(app.getByLabel('Contraseña', { exact: true })).fill('Equivocada1');
    await boton('Ingresar').click();
    await visible(app.getByText('Te quedan 4 intentos', { exact: false })).waitFor();
    await foto('1-2-ingreso-error');
    await boton('Crear cuenta').click();
    await encabezado('Crear cuenta');
    await foto('1-3-crear-cuenta');
    await app.goBack();
    await boton('¿Olvidaste tu contraseña?').click();
    await encabezado('¿Olvidaste tu contraseña?');
    await foto('1-4-recuperar');
    await app.goBack();
    await visible(app.getByLabel('Contraseña', { exact: true })).fill(claveApp);
    await boton('Ingresar').click();
    await encabezado('Hola, Laura');
    await visible(app.getByText('$6.000')).waitFor();
    await foto('2-1-mis-tarjetas');
    await visible(app.getByRole('button', { name: /^Tarjeta de la abuela, tarjeta terminada/ })).click();
    await visible(app.getByText('Información', { exact: true })).waitFor();
    await foto('2-3-detalle-tarjeta');
    await app.goBack();
    await boton('Agregar tarjeta (2/5)').click();
    await encabezado('Agregar tarjeta');
    await foto('2-2-agregar-tarjeta');
    await app.goBack();
    await visible(app.getByRole('tab', { name: 'Recargar' })).click();
    await encabezado('Recargar saldo');
    await visible(app.getByRole('radio', { name: 'Nequi, Billetera digital' })).click();
    await visible(app.getByLabel('Celular de Nequi')).fill('3991111111');
    await visible(app.getByRole('checkbox', { name: /Acepto los términos/ })).click();
    await foto('3-1-recargar');
    await visible(app.getByRole('button', { name: /^Pagar/ })).click();
    await encabezado('Esperando confirmación');
    await foto('3-3-pendiente');
    await encabezado('¡Recarga exitosa!');
    await foto('3-4-exitosa');
    await boton('Ver historial').click();
    await encabezado('Historial');
    await visible(app.getByText('Recarga con Nequi')).waitFor();
    await foto('4-1-historial');
    // Pago rechazado (3.5) con el celular de prueba que rechaza
    await visible(app.getByRole('tab', { name: 'Recargar' })).click();
    await encabezado('Recargar saldo');
    await visible(app.getByRole('radio', { name: '5.000 pesos' })).click();
    await visible(app.getByRole('radio', { name: 'Nequi, Billetera digital' })).click();
    await visible(app.getByLabel('Celular de Nequi')).fill('3992222222');
    await visible(app.getByRole('checkbox', { name: /Acepto los términos/ })).click();
    await visible(app.getByRole('button', { name: /^Pagar/ })).click();
    await encabezado('Pago rechazado');
    await foto('3-5-rechazado');
    await boton('Volver al inicio').click();
    await visible(app.getByRole('tab', { name: 'Recargar' })).click();
    await boton('Recargar la tarjeta de otra persona').click();
    await encabezado('Recargar a otra persona');
    await foto('3-2-otra-persona');
    await app.goBack();
    await visible(app.getByRole('tab', { name: 'Inicio' })).click();
    await visible(app.getByRole('button', { name: /^Avisos/ })).click();
    await encabezado('Avisos');
    await visible(app.getByText('Recarga exitosa', { exact: true })).waitFor();
    await foto('avisos');
    await app.goBack();
    await visible(app.getByRole('tab', { name: 'Perfil' })).click();
    await encabezado('Perfil');
    await foto('5-1-perfil');
    await boton('Alertas de saldo bajo').click();
    await encabezado('Alertas de saldo bajo');
    await foto('4-2-alertas');
    await app.goBack();
    await boton('Privacidad y datos').click();
    await encabezado('Privacidad y datos');
    await visible(app.getByText('Autorizaste el tratamiento', { exact: false })).waitFor();
    await foto('5-2-privacidad');
    await app.goBack();
    await boton('Ayuda y PQR').click();
    await encabezado('Ayuda y PQR');
    await boton('¿Cuánto tarda en verse mi recarga?').click();
    await foto('5-3-ayuda');
    const archivoAxe = path.join(raiz, 'docs/metricas/datos/axe.json');
    writeFileSync(archivoAxe, `${JSON.stringify({ generadoEn: new Date().toISOString(), herramienta: `axe-core ${axeVersion}`, normas: 'WCAG 2.0 y 2.1, niveles A y AA', pantallas: resultadosAxe }, null, 2)}\n`);
    console.log('✔', path.relative(raiz, archivoAxe));
  } finally {
    await app.close();
    // La cuenta de las capturas no queda en la base: se elimina como lo haría el usuario (ADR 0015).
    // Se usa el token del registro (dura 15 minutos): así no se gasta otro ingreso del límite por IP.
    const eliminada = await llamar('/me', 'DELETE', { contrasena: claveApp }, tokenAcceso);
    console.log('✔ Cuenta de las capturas eliminada:', JSON.stringify(eliminada));
  }
} else {
  console.log('⚠ Catálogo de la app omitido: la versión web de Expo no responde en http://localhost:8081');
}

// Diagrama
await pagina.setViewportSize({ width: 1240, height: 720 });
await capturarHtml(pagina, diagramaArquitectura(), path.join(dirDiagramas, 'arquitectura.png'));

await navegador.close();
writeFileSync(path.join(dirEvidencias, 'FECHA.txt'), `Capturas tomadas el ${new Date().toISOString()}\n`);
