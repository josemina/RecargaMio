// Casilla de verificación · Figma 9:237 (página 02). Aceptación expresa (autorización de datos, Ley 1581 de 2012).
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { color, espacio, TACTIL_MINIMO } from '@/theme/tokens';
import { Icono } from './Icono';

export interface PropsCasilla {
  marcada: boolean;
  onCambiar?: (marcada: boolean) => void;
  /** Lo que lee el lector de pantalla, por ejemplo «Acepto la política de tratamiento de datos». */
  etiqueta: string;
  /** Texto visible a la derecha de la casilla; toda la fila es táctil. */
  children?: ReactNode;
  testID?: string;
}

const LADO = 22;

export function Casilla({ marcada, onCambiar, etiqueta, children, testID }: PropsCasilla) {
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityLabel={etiqueta}
      aria-checked={marcada}
      onPress={() => onCambiar?.(!marcada)}
      testID={testID}
      style={estilos.fila}
    >
      <View style={estilos.area}>
        <View style={[estilos.caja, marcada ? estilos.marcada : estilos.vacia]}>
          {marcada ? <Icono nombre="check" tamano={16} color={color.texto.invertido} /> : null}
        </View>
      </View>
      {children ? <View style={estilos.texto}>{children}</View> : null}
    </Pressable>
  );
}

const estilos = StyleSheet.create({
  fila: { flexDirection: 'row', alignItems: 'flex-start', gap: espacio[1], minHeight: TACTIL_MINIMO },
  // Área de 44 × 44 alrededor de la caja de 22 px
  area: { width: TACTIL_MINIMO, height: TACTIL_MINIMO, alignItems: 'center', justifyContent: 'center', marginLeft: -11 },
  caja: { width: LADO, height: LADO, borderRadius: 6, alignItems: 'center', justifyContent: 'center' },
  marcada: { backgroundColor: color.marca.primario },
  vacia: { backgroundColor: color.superficie.tarjeta, borderWidth: 1.5, borderColor: color.borde.predeterminado },
  texto: { flex: 1, paddingTop: 11 },
});
