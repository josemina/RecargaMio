// Prueba de integración de la Tabla 18 (T8, ADR 0016): al menos 200 recargas de punta a punta,
// con la pasarela en modo de pruebas y el recaudo simulado. Meta de la Tabla 9: 98 % o más aprobadas.
//
// Corre desde Docker:   docker compose --profile pruebas run --rm recargas
// o con todo lo demás:  npm run pruebas
//
// Usa solo el usuario integracion@recargamio.test y sus cinco tarjetas (7710000001–7710000005).
// Cada trabajador usa siempre la misma tarjeta, así dos recargas simultáneas nunca chocan con la protección
// contra el doble pago (misma tarjeta, monto y medio en el mismo minuto).
// Solo se usan los datos de prueba que aprueban: Nequi 3991111111, PSE banco «1» y Bancolombia.
// La Tabla 9 no cuenta los rechazos por fondos, así que una recarga que no se aprueba aquí es una falla del flujo.
import { writeFile } from 'node:fs/promises';

const BASE_URL = process.env.BASE_URL ?? 'http://localhost:3000';
const TOTAL = Number(process.env.TOTAL ?? 200);
const CORREO = process.env.PRUEBAS_CORREO ?? 'integracion@recargamio.test';
const CLAVE = process.env.PRUEBAS_CONTRASENA;
const SALIDA = process.env.SALIDA ?? '/datos/recargas.json';
const ESPERA_MAXIMA_MS = 240_000; // más que la meta de 180 s: así una recarga lenta se mide en vez de cortarse
const FINALES = new Set(['ACREDITADA', 'RECHAZADA', 'ERROR']);
const MONTOS = [5000, 10000, 20000, 50000];
const MEDIOS = [
  { medioPago: 'NEQUI', datosMedio: { celular: '3991111111' } },
  {
    medioPago: 'PSE',
    datosMedio: { tipoPersona: 'NATURAL', tipoDocumento: 'CC', numeroDocumento: '1000000001', codigoBanco: '1', celular: '3001234567' },
  },
  { medioPago: 'BANCOLOMBIA_TRANSFER' },
];

if (!CLAVE) {
  console.error('Falta PRUEBAS_CONTRASENA (en .env). Corre primero: docker compose run --rm api npm run seed:pruebas');
  process.exit(2);
}

const pausa = (ms) => new Promise((r) => setTimeout(r, ms));
let token = '';

async function api(metodo, ruta, cuerpo) {
  for (let intento = 0; intento < 2; intento++) {
    const inicio = performance.now();
    const res = await fetch(BASE_URL + ruta, {
      method: metodo,
      headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: cuerpo ? JSON.stringify(cuerpo) : undefined,
    });
    const datos = res.status === 204 ? null : await res.json();
    // El token de acceso dura 15 minutos: si vence a mitad de la prueba, se vuelve a ingresar una vez
    if (res.status === 401 && ruta !== '/auth/ingreso' && intento === 0) {
      await ingresar();
      continue;
    }
    return { estado: res.status, datos, ms: performance.now() - inicio };
  }
}

async function ingresar() {
  token = '';
  const r = await api('POST', '/auth/ingreso', { correo: CORREO, contrasena: CLAVE });
  if (r.estado !== 200) throw new Error(`No se pudo ingresar con ${CORREO}: ${r.estado} ${JSON.stringify(r.datos)}`);
  token = r.datos.tokenAcceso;
}

async function unaRecarga(n, tarjeta) {
  const medio = MEDIOS[n % MEDIOS.length];
  const monto = MONTOS[Math.floor(n / MEDIOS.length) % MONTOS.length];
  const resultado = { n, medioPago: medio.medioPago, monto, tarjeta: tarjeta.ultimos4 };
  const inicio = Date.now();
  const creada = await api('POST', '/recargas', { tarjetaId: tarjeta.id, monto, ...medio, aceptaTerminosPasarela: true });
  resultado.msCrear = Math.round(creada.ms);
  if (creada.estado !== 201) {
    return { ...resultado, estado: `HTTP_${creada.estado}`, codigo: creada.datos?.error?.codigo ?? null, tiempoSegundos: null };
  }
  let recarga = creada.datos;
  while (!FINALES.has(recarga.estado) && Date.now() - inicio < ESPERA_MAXIMA_MS) {
    await pausa(500);
    const r = await api('GET', `/recargas/${recarga.id}`);
    if (r.estado === 200) recarga = r.datos;
  }
  if (!FINALES.has(recarga.estado)) {
    // Última consulta, pidiendo a la API que pregunte a la pasarela («Actualizar estado» de la pantalla 3.3)
    const r = await api('GET', `/recargas/${recarga.id}?actualizar=1`);
    if (r.estado === 200) recarga = r.datos;
  }
  return {
    ...resultado,
    referencia: recarga.referencia,
    estado: recarga.estado,
    motivo: recarga.motivo,
    // Métrica de la Tabla 9: acreditadaEn − iniciadaEn, medida por la API
    tiempoSegundos: recarga.tiempoSegundos,
    segundosObservados: Math.round((Date.now() - inicio) / 100) / 10,
  };
}

async function main() {
  console.log(`Prueba de integración: ${TOTAL} recargas contra ${BASE_URL}`);
  await ingresar();
  const { datos: lista } = await api('GET', '/tarjetas');
  const tarjetas = lista.tarjetas;
  if (tarjetas.length === 0) throw new Error(`${CORREO} no tiene tarjetas. Corre: docker compose run --rm api npm run seed:pruebas`);
  const concurrencia = Math.min(Number(process.env.CONCURRENCIA ?? 5), tarjetas.length);
  const { datos: terminos } = await api('GET', '/pasarela/terminos');

  const resultados = [];
  let siguiente = 0;
  const inicio = new Date();
  await Promise.all(
    Array.from({ length: concurrencia }, async (_, trabajador) => {
      while (siguiente < TOTAL) {
        const n = siguiente++;
        const r = await unaRecarga(n, tarjetas[trabajador]).catch((err) => ({ n, estado: 'FALLA_CLIENTE', motivo: String(err?.message ?? err) }));
        resultados.push(r);
        if (resultados.length % 20 === 0) console.log(`  ${resultados.length}/${TOTAL} terminadas`);
      }
    }),
  );
  resultados.sort((a, b) => a.n - b.n);

  const aprobadas = resultados.filter((r) => r.estado === 'ACREDITADA').length;
  const resumen = {
    fecha: inicio.toISOString(),
    duracionSegundos: Math.round((Date.now() - inicio.getTime()) / 1000),
    pasarela: terminos?.pasarela ?? 'desconocida',
    baseUrl: BASE_URL,
    total: resultados.length,
    concurrencia,
    aprobadas,
    tasa: aprobadas / resultados.length,
    resultados,
  };
  await writeFile(SALIDA, JSON.stringify(resumen, null, 2) + '\n');
  console.log(`Acreditadas: ${aprobadas} de ${resultados.length} (${(resumen.tasa * 100).toFixed(1)} %) en ${resumen.duracionSegundos} s. Datos en ${SALIDA}`);
  const otras = resultados.filter((r) => r.estado !== 'ACREDITADA');
  for (const r of otras.slice(0, 10)) console.log(`  #${r.n} ${r.medioPago ?? ''} ${r.estado} ${r.codigo ?? r.motivo ?? ''}`);
  process.exitCode = resumen.tasa >= 0.98 ? 0 : 1;
}

main().catch((err) => {
  console.error('La prueba de integración no pudo correr:', err.message);
  process.exitCode = 2;
});
