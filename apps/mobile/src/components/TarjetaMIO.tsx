// Tarjeta MIO · Figma 11:78 (página 02). Tarjeta registrada con su saldo (HU-03, HU-05, HU-07).
// Con saldo bajo muestra la insignia «Saldo bajo» en lugar del ícono de tarjeta.
import { Pressable, StyleSheet, View } from 'react-native';
import { color, espacio, radio, sombraTarjeta, TACTIL_MINIMO } from '@/theme/tokens';
import { numeroOculto, pesos, pesosHablados } from '@/utilidades/formato';
import SvgDecoracion from '../../assets/graficos/decoracion-tarjeta.svg';
import { Boton } from './Boton';
import { Icono } from './Icono';
import { Insignia } from './Insignia';
import { Texto } from './Texto';

export interface PropsTarjetaMIO {
  alias: string;
  ultimos4: string;
  /** Nulo si el recaudo no respondió (la API devuelve saldo: null). */
  saldo: number | null;
  saldoBajo?: boolean;
  /** Si se pasa, aparece el botón «Recargar». */
  onRecargar?: () => void;
  /** Abre el detalle de la tarjeta (pantalla 2.3). */
  onPress?: () => void;
  testID?: string;
}

export function TarjetaMIO({ alias, ultimos4, saldo, saldoBajo = false, onRecargar, onPress, testID }: PropsTarjetaMIO) {
  const textoSaldo = saldo === null ? 'No disponible' : pesos(saldo);
  const resumen = [
    alias,
    `tarjeta terminada en ${ultimos4.split('').join(' ')}`,
    saldo === null ? 'saldo no disponible' : `saldo ${pesosHablados(saldo)}`,
    saldoBajo ? 'saldo bajo' : null,
  ]
    .filter(Boolean)
    .join(', ');

  return (
    <View style={estilos.tarjeta} testID={testID}>
      <View style={estilos.decoracion} pointerEvents="none">
        <SvgDecoracion width={220} height={220} />
      </View>
      <Pressable
        disabled={!onPress}
        onPress={onPress}
        accessibilityRole={onPress ? 'button' : 'summary'}
        accessibilityLabel={resumen}
        accessibilityHint={onPress ? 'Abre el detalle y el historial de la tarjeta' : undefined}
        style={estilos.datos}
      >
        <View style={estilos.encabezado}>
          <View style={estilos.nombre}>
            <Texto variante="cuerpoFuerte" color={color.texto.invertido} numberOfLines={1}>
              {alias}
            </Texto>
            <Texto variante="pequeno" color={color.marca.primarioBorde}>
              {numeroOculto(ultimos4)}
            </Texto>
          </View>
          {saldoBajo ? <Insignia etiqueta="Saldo bajo" tipo="advertencia" /> : <Icono nombre="tarjeta" color={color.texto.invertido} />}
        </View>
        <View style={estilos.saldo}>
          <Texto variante="pequeno" color={color.marca.primarioBorde}>
            Saldo disponible
          </Texto>
          <Texto variante="saldo" color={color.texto.invertido}>
            {textoSaldo}
          </Texto>
        </View>
      </Pressable>
      {onRecargar ? <Boton etiqueta="Recargar" tipo="acento" onPress={onRecargar} pista={`Recarga la tarjeta ${alias}`} /> : null}
    </View>
  );
}

const estilos = StyleSheet.create({
  tarjeta: {
    backgroundColor: color.marca.primario,
    borderRadius: radio.xl,
    padding: 20,
    gap: espacio[4],
    overflow: 'hidden',
    alignSelf: 'stretch',
    ...sombraTarjeta,
  },
  // Círculo decorativo de Figma: 220 px, a 200 px de la izquierda y 90 px por encima del borde
  decoracion: { position: 'absolute', left: 200, top: -90 },
  // El contenido ya mide más de 44 px; el mínimo lo deja asegurado (regla 7)
  datos: { gap: espacio[4], minHeight: TACTIL_MINIMO },
  encabezado: { flexDirection: 'row', alignItems: 'flex-start', gap: espacio[2] },
  nombre: { flex: 1, gap: 2 },
  saldo: { gap: 2 },
});
