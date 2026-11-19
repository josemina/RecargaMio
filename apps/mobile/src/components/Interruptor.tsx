// Interruptor · Figma 9:230 (página 02). Activa o desactiva una opción (alertas, guardar tarjeta).
// El dibujo son los SVG exportados de Figma (pista y perilla con sombra).
import { Pressable, View } from 'react-native';
import { TACTIL_MINIMO } from '@/theme/tokens';
import SvgActivado from '../../assets/graficos/interruptor-activado.svg';
import SvgDesactivado from '../../assets/graficos/interruptor-desactivado.svg';

export interface PropsInterruptor {
  activado: boolean;
  onCambiar?: (activado: boolean) => void;
  /** Obligatoria: el interruptor no tiene texto propio (regla 7). */
  etiqueta: string;
  deshabilitado?: boolean;
  /**
   * Solo el dibujo, sin control propio: cuando toda la fila es el interruptor (FilaAjuste).
   * Así no hay un control dentro de otro (WCAG 4.1.2; lo detectó axe-core en T11).
   */
  decorativo?: boolean;
  testID?: string;
}

const ANCHO = 48;
const ALTO = 28;

export function Interruptor({ activado, onCambiar, etiqueta, deshabilitado = false, decorativo = false, testID }: PropsInterruptor) {
  const Dibujo = activado ? SvgActivado : SvgDesactivado;
  const margen = (TACTIL_MINIMO - ALTO) / 2;
  if (decorativo) {
    return (
      <View aria-hidden style={{ width: ANCHO, height: ALTO }} testID={testID}>
        <Dibujo width={ANCHO} height={29} />
      </View>
    );
  }
  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityLabel={etiqueta}
      aria-checked={activado}
      aria-disabled={deshabilitado}
      disabled={deshabilitado}
      onPress={() => onCambiar?.(!activado)}
      hitSlop={{ top: margen, bottom: margen }}
      testID={testID}
      style={{ width: ANCHO, height: ALTO, opacity: deshabilitado ? 0.5 : 1 }}
    >
      {/* El SVG mide 48 × 29: la fila extra es la sombra de la perilla, que sobresale como en Figma */}
      <Dibujo width={ANCHO} height={29} />
    </Pressable>
  );
}
