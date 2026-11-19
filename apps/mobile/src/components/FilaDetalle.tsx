// Fila de detalle · Figma 11:273 (página 02). Par etiqueta-valor del comprobante y del detalle de tarjeta.
import { StyleSheet, View } from 'react-native';
import { color } from '@/theme/tokens';
import { Texto } from './Texto';

export interface PropsFilaDetalle {
  etiqueta: string;
  valor: string;
  /** Lo que lee el lector de pantalla si el valor visible no se entiende hablado (por ejemplo, montos con «$»). */
  valorHablado?: string;
  /** La última fila de un grupo va sin línea inferior (Figma: detalle de las pantallas 3.3 a 3.5). */
  ultima?: boolean;
}

export function FilaDetalle({ etiqueta, valor, valorHablado, ultima = false }: PropsFilaDetalle) {
  return (
    <View accessible accessibilityLabel={`${etiqueta}: ${valorHablado ?? valor}`} style={[estilos.base, ultima && estilos.ultima]}>
      <Texto variante="etiqueta" color={color.texto.secundario}>
        {etiqueta}
      </Texto>
      <Texto variante="cuerpoFuerte" style={estilos.valor}>
        {valor}
      </Texto>
    </View>
  );
}

const estilos = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    columnGap: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: color.borde.sutil,
    alignSelf: 'stretch',
  },
  ultima: { borderBottomWidth: 0 },
  valor: { textAlign: 'right', flexShrink: 1 },
});
