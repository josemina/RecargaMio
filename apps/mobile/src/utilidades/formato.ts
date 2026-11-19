// Formato de valores para la app, en español de Colombia.

/** $12.400 · -$300. Se escribe a mano para no depender de Intl, que varía entre Hermes, Android y la web. */
export function pesos(valor: number): string {
  const signo = valor < 0 ? '-' : '';
  const miles = Math.abs(Math.round(valor))
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `${signo}$${miles}`;
}

/** Lo que dice el lector de pantalla: «12.400 pesos». Con «$», TalkBack lee «dólares». */
export function pesosHablados(valor: number): string {
  return `${pesos(valor).replace('$', '')} pesos`;
}

/** «MIO •••• 4821»: la app nunca muestra el número completo de la tarjeta (ADR 0009). */
export const numeroOculto = (ultimos4: string) => `MIO •••• ${ultimos4}`;
