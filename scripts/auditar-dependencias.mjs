// Auditoría de dependencias con `npm audit` (T11, lista MASVS: MASVS-CODE, ADR 0019).
// Guarda en docs/metricas/datos/dependencias.json el conteo por severidad y el detalle de las altas y críticas,
// con la justificación de las que se aceptan (tests/seguridad/dependencias-aceptadas.json).
//
//   npm run dependencias     (también corre dentro de `npm run pruebas`)
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';

const SALIDA = 'docs/metricas/datos/dependencias.json';
const ACEPTADAS = 'tests/seguridad/dependencias-aceptadas.json';

function auditar(soloProduccion) {
  const args = ['audit', '--json', ...(soloProduccion ? ['--omit=dev'] : [])];
  // npm audit sale con código 1 cuando encuentra algo: se lee igual su JSON
  const r = spawnSync('npm', args, { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  const datos = JSON.parse(r.stdout || '{}');
  if (datos.error) throw new Error(`npm audit falló: ${datos.error.summary ?? JSON.stringify(datos.error)}`);
  return datos;
}

const aceptadas = existsSync(ACEPTADAS) ? JSON.parse(readFileSync(ACEPTADAS, 'utf8')).paquetes : {};
const todas = auditar(false);
const produccion = auditar(true);

const graves = Object.entries(todas.vulnerabilities ?? {})
  .filter(([, v]) => v.severity === 'high' || v.severity === 'critical')
  .map(([paquete, v]) => ({
    paquete,
    severidad: v.severity,
    directa: v.isDirect,
    avisos: v.via.filter((x) => typeof x === 'object').map((x) => ({ titulo: x.title, rango: x.range, url: x.url })),
    // Si el aviso viene por otro paquete, la justificación es la del paquete de origen
    origen: v.via.filter((x) => typeof x === 'string'),
    correccion: typeof v.fixAvailable === 'object' ? `${v.fixAvailable.name}@${v.fixAvailable.version}${v.fixAvailable.isSemVerMajor ? ' (cambio mayor)' : ''}` : v.fixAvailable ? 'npm audit fix' : 'Sin corrección publicada',
    justificacion: aceptadas[paquete] ?? null,
  }));

const resumen = {
  generadoEn: new Date().toISOString(),
  todas: todas.metadata.vulnerabilities,
  produccion: produccion.metadata.vulnerabilities,
  dependencias: todas.metadata.dependencies,
  graves,
};
mkdirSync('docs/metricas/datos', { recursive: true });
writeFileSync(SALIDA, `${JSON.stringify(resumen, null, 2)}\n`);

const sinJustificar = graves.filter((g) => !g.justificacion);
console.log(`npm audit: ${resumen.todas.critical} críticas, ${resumen.todas.high} altas, ${resumen.todas.moderate} moderadas, ${resumen.todas.low} bajas.`);
for (const g of graves) console.log(`  ${g.justificacion ? 'ACEPTADA' : 'REVISAR '}  ${g.paquete} (${g.severidad}) · corrección: ${g.correccion}`);
console.log(sinJustificar.length ? `Hay ${sinJustificar.length} altas o críticas sin justificar en ${ACEPTADAS}.` : 'Ninguna alta o crítica sin justificar.');
process.exitCode = sinJustificar.length ? 1 : 0;
