// Fechas en español de Colombia, sin depender de Intl (varía entre Hermes, Android y la web).
const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
const MESES_LARGOS = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

/** «7:45 p. m.» */
export function hora(fecha: Date): string {
  const h = fecha.getHours();
  const minutos = String(fecha.getMinutes()).padStart(2, '0');
  return `${h % 12 === 0 ? 12 : h % 12}:${minutos} ${h < 12 ? 'a. m.' : 'p. m.'}`;
}

/** «24 oct 2026 · 7:45 p. m.» (Figma, componente Movimiento) */
export function fechaCorta(iso: string): string {
  const f = new Date(iso);
  return `${f.getDate()} ${MESES[f.getMonth()]} ${f.getFullYear()} · ${hora(f)}`;
}

/** «18 de noviembre de 2026» */
export function fechaLarga(iso: string): string {
  const f = new Date(iso);
  return `${f.getDate()} de ${MESES_LARGOS[f.getMonth()]} de ${f.getFullYear()}`;
}

/** Grupo del historial (pantalla 4.1): «HOY», «ESTA SEMANA» o el mes. */
export function grupoDeFecha(iso: string, ahora = new Date()): string {
  const f = new Date(iso);
  const inicioHoy = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate());
  if (f >= inicioHoy) return 'HOY';
  const hace7Dias = new Date(inicioHoy.getTime() - 6 * 86_400_000);
  if (f >= hace7Dias) return 'ESTA SEMANA';
  return `${MESES_LARGOS[f.getMonth()]} de ${f.getFullYear()}`.toUpperCase();
}
