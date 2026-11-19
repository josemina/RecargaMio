// Selector de tarjeta · Figma 11:278 (página 02). Lista desplegable para elegir la tarjeta a recargar (HU-01).
import { Pressable, StyleSheet, View } from 'react-native';
import { color, espacio, radio } from '@/theme/tokens';
import { Icono, type NombreIcono } from './Icono';
import { Texto } from './Texto';

export interface PropsSelectorTarjeta {
  /** Por ejemplo «Mi tarjeta •••• 4821». */
  tarjeta: string;
  /** Por ejemplo «Saldo actual $12.400». */
  detalle: string;
  onPress?: () => void;
  /** Ícono de la izquierda; por defecto, «tarjeta». También sirve para elegir el banco de PSE. */
  icono?: NombreIcono;
  /** Lo que lee el lector de pantalla, si no es una tarjeta. */
  etiquetaAccesible?: string;
  pista?: string;
  testID?: string;
}

export function SelectorTarjeta({ tarjeta, detalle, onPress, icono = 'tarjeta', etiquetaAccesible, pista = 'Abre la lista de tus tarjetas', testID }: PropsSelectorTarjeta) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={etiquetaAccesible ?? `Tarjeta a recargar: ${tarjeta.replace('••••', 'terminada en')}. ${detalle}`}
      accessibilityHint={pista}
      onPress={onPress}
      testID={testID}
      style={estilos.base}
    >
      <Icono nombre={icono} tamano={22} color={color.marca.primario} />
      <View style={estilos.texto}>
        <Texto variante="cuerpoFuerte" numberOfLines={1}>
          {tarjeta}
        </Texto>
        <Texto variante="pequeno" color={color.texto.secundario}>
          {detalle}
        </Texto>
      </View>
      <Icono nombre="desplegar" tamano={20} color={color.texto.secundario} />
    </Pressable>
  );
}

const estilos = StyleSheet.create({
  base: {
    minHeight: 64,
    flexDirection: 'row',
    alignItems: 'center',
    gap: espacio[3],
    paddingHorizontal: 16,
    borderRadius: radio.md,
    borderWidth: 1,
    borderColor: color.borde.predeterminado,
    backgroundColor: color.superficie.tarjeta,
    alignSelf: 'stretch',
  },
  texto: { flex: 1, gap: 2 },
});
