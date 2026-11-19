// Firmas de Wompi (https://docs.wompi.co/docs/colombia/widget-checkout-web/ y /eventos/).
import { createHash, timingSafeEqual } from 'node:crypto';
import type { EventoPasarela } from './tipos';

const sha256 = (texto: string) => createHash('sha256').update(texto).digest('hex');

/** Firma de integridad: SHA256(referencia + monto en centavos + moneda + secreto de integridad). */
export function firmaIntegridad(referencia: string, montoCentavos: number, secretoIntegridad: string, moneda = 'COP') {
  return sha256(`${referencia}${montoCentavos}${moneda}${secretoIntegridad}`);
}

/** Lee una ruta como "transaction.id" dentro de `data`. */
function valorEn(datos: unknown, ruta: string): string {
  const valor = ruta.split('.').reduce<unknown>((actual, clave) => (actual && typeof actual === 'object' ? (actual as Record<string, unknown>)[clave] : undefined), datos);
  return valor === undefined || valor === null ? '' : String(valor);
}

/** Checksum del evento: SHA256(valores de signature.properties en orden + timestamp + secreto de eventos). */
export function checksumEvento(evento: Pick<EventoPasarela, 'data' | 'signature' | 'timestamp'>, secretoEventos: string) {
  const valores = evento.signature.properties.map((ruta) => valorEn(evento.data, ruta)).join('');
  return sha256(`${valores}${evento.timestamp}${secretoEventos}`);
}

/**
 * Regla 4 de CLAUDE.md: se verifica el checksum antes de usar el contenido del evento.
 * Se compara en tiempo constante y sin distinguir mayúsculas (Wompi lo envía en mayúsculas).
 */
export function verificarEvento(evento: unknown, checksumRecibido: string | undefined, secretoEventos: string): evento is EventoPasarela {
  if (!evento || typeof evento !== 'object') return false;
  const e = evento as Partial<EventoPasarela>;
  if (!e.signature || !Array.isArray(e.signature.properties) || typeof e.timestamp !== 'number' || !e.data) return false;
  const recibido = (checksumRecibido ?? e.signature.checksum ?? '').toLowerCase();
  const esperado = checksumEvento(e as EventoPasarela, secretoEventos);
  if (!/^[0-9a-f]{64}$/.test(recibido)) return false;
  return timingSafeEqual(Buffer.from(recibido, 'hex'), Buffer.from(esperado, 'hex'));
}
