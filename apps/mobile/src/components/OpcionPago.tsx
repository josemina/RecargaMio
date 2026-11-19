// Opción de pago · Figma 11:96 (página 02). Medio de pago de la pasarela (PSE, Nequi, Bancolombia) con selección única (HU-02).
import { Pressable, StyleSheet, View } from 'react-native';
import { color, espacio, radio } from '@/theme/tokens';
import SvgRadio from '../../assets/graficos/radio-seleccionado.svg';
import { Texto } from './Texto';

export interface PropsOpcionPago {
  nombre: string;
  descripcion: string;
  /** Letras del logo, por ejemplo «N» o «PSE». */
  sigla: string;
  seleccionada?: boolean;
  onPress?: () => void;
  testID?: string;
}

export function OpcionPago({ nombre, descripcion, sigla, seleccionada = false, onPress, testID }: PropsOpcionPago) {
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityLabel={`${nombre}, ${descripcion}`}
      aria-checked={seleccionada}
      onPress={onPress}
      testID={testID}
      style={[estilos.base, seleccionada ? estilos.seleccionada : estilos.normal]}
    >
      {seleccionada ? <SvgRadio width={22} height={22} /> : <View style={estilos.radioVacio} />}
      <View style={estilos.logo}>
        <Texto variante="pequenoFuerte" color={color.marca.primarioOscuro}>
          {sigla}
        </Texto>
      </View>
      <View style={estilos.texto}>
        <Texto variante="cuerpoFuerte">{nombre}</Texto>
        <Texto variante="pequeno" color={color.texto.secundario}>
          {descripcion}
        </Texto>
      </View>
    </Pressable>
  );
}

const estilos = StyleSheet.create({
  base: { minHeight: 64, flexDirection: 'row', alignItems: 'center', gap: espacio[3], paddingHorizontal: 16, borderRadius: radio.md, alignSelf: 'stretch' },
  normal: { backgroundColor: color.superficie.tarjeta, borderWidth: 1, borderColor: color.borde.predeterminado },
  // Borde de 2 px: se resta 1 px al relleno para que el contenido no se mueva al seleccionar
  seleccionada: { backgroundColor: color.marca.primarioSuave, borderWidth: 2, borderColor: color.marca.primario, paddingHorizontal: 15 },
  radioVacio: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: color.borde.predeterminado, backgroundColor: color.superficie.tarjeta },
  logo: { width: 40, height: 40, borderRadius: radio.sm, backgroundColor: color.superficie.fondo, alignItems: 'center', justifyContent: 'center' },
  texto: { flex: 1 },
});
