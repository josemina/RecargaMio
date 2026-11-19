// Chip · Figma 9:223 (página 02). Selección única de montos y filtros del historial.
import { Pressable, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import { color, radio, TACTIL_MINIMO } from '@/theme/tokens';
import { Texto } from './Texto';

export interface PropsChip {
  etiqueta: string;
  activo?: boolean;
  onPress?: () => void;
  /** Lo que lee el lector de pantalla si la etiqueta es solo un número, por ejemplo «10.000 pesos». */
  etiquetaAccesible?: string;
  /** Por ejemplo flex: 1, para repartir el ancho como los montos de la pantalla 3.1. */
  estilo?: StyleProp<ViewStyle>;
  testID?: string;
}

const ALTO = 40;

export function Chip({ etiqueta, activo = false, onPress, etiquetaAccesible, estilo, testID }: PropsChip) {
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityLabel={etiquetaAccesible ?? etiqueta}
      aria-checked={activo}
      onPress={onPress}
      testID={testID}
      // Figma lo dibuja de 40 px: el área táctil se amplía a 44 sin cambiar el dibujo
      hitSlop={{ top: (TACTIL_MINIMO - ALTO) / 2, bottom: (TACTIL_MINIMO - ALTO) / 2 }}
      style={[estilos.base, activo ? estilos.activo : estilos.inactivo, estilo]}
    >
      <Texto variante="etiqueta" color={activo ? color.texto.invertido : color.texto.principal}>
        {etiqueta}
      </Texto>
    </Pressable>
  );
}

const estilos = StyleSheet.create({
  base: { minHeight: ALTO, minWidth: 80, paddingHorizontal: 16, borderRadius: radio.total, alignItems: 'center', justifyContent: 'center' },
  activo: { backgroundColor: color.marca.primario },
  inactivo: { backgroundColor: color.superficie.tarjeta, borderWidth: 1, borderColor: color.borde.predeterminado },
});
