// Condiciones simuladas de red para pruebas de resiliencia (POST /simulacion/latencia).
// Solo afectan a los créditos. Una falla simulada ocurre ANTES de tocar el saldo: reintentar es seguro.
import { ErrorRecaudo } from './errores';

export interface CondicionesSimuladas {
  demoraMs: number;
  tasaFallos: number;
}

export const CONDICIONES_NORMALES: CondicionesSimuladas = { demoraMs: 0, tasaFallos: 0 };

export function crearSimulador(aleatorio: () => number = Math.random) {
  let condiciones: CondicionesSimuladas = { ...CONDICIONES_NORMALES };

  return {
    obtener: () => ({ ...condiciones }),
    fijar: (nuevas: CondicionesSimuladas) => {
      condiciones = { ...nuevas };
      return { ...condiciones };
    },
    reiniciar: () => {
      condiciones = { ...CONDICIONES_NORMALES };
    },
    /** Aplica la demora y, según la tasa de fallos, lanza un 503. */
    async aplicar() {
      if (condiciones.demoraMs > 0) {
        await new Promise((resolver) => setTimeout(resolver, condiciones.demoraMs));
      }
      if (condiciones.tasaFallos > 0 && aleatorio() < condiciones.tasaFallos) {
        throw new ErrorRecaudo(503, 'FALLA_SIMULADA', 'El recaudo no está disponible (falla simulada). Intenta de nuevo.');
      }
    },
  };
}

export type Simulador = ReturnType<typeof crearSimulador>;
