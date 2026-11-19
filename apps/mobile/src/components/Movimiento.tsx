// Movimiento del historial · Figma 11:122 (página 02). Recarga (ingreso) o viaje (débito) (HU-03).
import { StyleSheet, View } from 'react-native';
import { color, espacio, radio } from '@/theme/tokens';
import { pesos, pesosHablados } from '@/utilidades/formato';
import { Icono } from './Icono';
import { Texto } from './Texto';

export interface PropsMovimiento {
  tipo: 'recarga' | 'viaje';
  titulo: string;
  /** Fecha ya formateada, por ejemplo «24 oct 2026 · 7:45 p. m.». */
  fecha: string;
  /** Positivo en recargas y negativo en viajes, como lo devuelve la API. */
  valor: number;
}

export function Movimiento({ tipo, titulo, fecha, valor }: PropsMovimiento) {
  const recarga = tipo === 'recarga';
  const textoValor = recarga ? `+${pesos(valor)}` : pesos(valor);
  return (
    <View
      accessible
      accessibilityLabel={`${titulo}, ${fecha}, ${recarga ? 'ingreso de' : 'débito de'} ${pesosHablados(Math.abs(valor))}`}
      style={estilos.base}
    >
      <View style={[estilos.icono, { backgroundColor: recarga ? color.estado.exitoSuave : color.marca.primarioSuave }]}>
        <Icono nombre={recarga ? 'entrada' : 'bus'} tamano={20} color={recarga ? color.estado.exito : color.marca.primario} />
      </View>
      <View style={estilos.texto}>
        <Texto variante="cuerpoFuerte" numberOfLines={1}>
          {titulo}
        </Texto>
        <Texto variante="pequeno" color={color.texto.secundario}>
          {fecha}
        </Texto>
      </View>
      <Texto variante="cuerpoFuerte" color={color.texto.principal}>
        {textoValor}
      </Texto>
    </View>
  );
}

const estilos = StyleSheet.create({
  base: {
    minHeight: 68,
    flexDirection: 'row',
    alignItems: 'center',
    gap: espacio[3],
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: radio.md,
    borderWidth: 1,
    borderColor: color.borde.sutil,
    backgroundColor: color.superficie.tarjeta,
    alignSelf: 'stretch',
  },
  icono: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  texto: { flex: 1, gap: 2 },
});
