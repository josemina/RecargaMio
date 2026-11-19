// Barra superior · Figma 11:232 (página 02). Botón Atrás (objetivo táctil 44 px), título y acción opcional.
import { Pressable, StyleSheet, View } from 'react-native';
import { color, TACTIL_MINIMO } from '@/theme/tokens';
import { Icono, type NombreIcono } from './Icono';
import { Texto } from './Texto';

export interface PropsBarraSuperior {
  titulo: string;
  /** Sin esta función no se muestra el botón Atrás. */
  onAtras?: () => void;
  accion?: { icono: NombreIcono; etiqueta: string; onPress: () => void };
}

export function BarraSuperior({ titulo, onAtras, accion }: PropsBarraSuperior) {
  return (
    <View style={[estilos.base, !onAtras && estilos.sinAtras]}>
      {onAtras ? (
        <Pressable accessibilityRole="button" accessibilityLabel="Volver" onPress={onAtras} style={estilos.boton}>
          <Icono nombre="atras" color={color.texto.principal} />
        </Pressable>
      ) : null}
      <Texto variante="titulo2" accessibilityRole="header" style={estilos.titulo} numberOfLines={2}>
        {titulo}
      </Texto>
      {accion ? (
        <Pressable accessibilityRole="button" accessibilityLabel={accion.etiqueta} onPress={accion.onPress} style={estilos.boton}>
          <Icono nombre={accion.icono} color={color.texto.principal} />
        </Pressable>
      ) : null}
    </View>
  );
}

const estilos = StyleSheet.create({
  base: { minHeight: 56, flexDirection: 'row', alignItems: 'center', gap: 4, paddingLeft: 12, paddingRight: 16, alignSelf: 'stretch' },
  sinAtras: { paddingLeft: 24 },
  boton: { width: TACTIL_MINIMO, height: TACTIL_MINIMO, borderRadius: TACTIL_MINIMO / 2, alignItems: 'center', justifyContent: 'center' },
  titulo: { flex: 1 },
});
