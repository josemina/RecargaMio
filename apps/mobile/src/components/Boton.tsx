// Botón · Figma 9:216 (página 02). Primario = acción principal; Acento = recargar; Secundario = alternativa;
// Texto = enlace; Peligro = acciones destructivas. Alto 48 px (objetivo táctil ≥ 44 px).
import { ActivityIndicator, Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { color, espacio, radio } from '@/theme/tokens';
import { Icono, type NombreIcono } from './Icono';
import { Texto } from './Texto';

export type TipoBoton = 'primario' | 'acento' | 'secundario' | 'texto' | 'peligro';

export interface PropsBoton {
  etiqueta: string;
  onPress?: () => void;
  tipo?: TipoBoton;
  deshabilitado?: boolean;
  /** Muestra un indicador de carga y bloquea el botón (por ejemplo, mientras se paga). */
  cargando?: boolean;
  icono?: NombreIcono;
  /** Texto adicional para el lector de pantalla, si la etiqueta sola no basta. */
  pista?: string;
  /** Borde punteado (Figma: «Agregar tarjeta» en la pantalla 2.1). */
  punteado?: boolean;
  estilo?: StyleProp<ViewStyle>;
  testID?: string;
}

// Colores de cada tipo en estado normal (fondo, borde y texto), tal como están en Figma
const APARIENCIA: Record<TipoBoton, { fondo?: string; borde?: string; texto: string }> = {
  primario: { fondo: color.marca.primario, texto: color.texto.invertido },
  acento: { fondo: color.acento.principal, texto: color.texto.principal },
  secundario: { fondo: color.superficie.tarjeta, borde: color.marca.primario, texto: color.marca.primario },
  texto: { texto: color.marca.primario },
  peligro: { fondo: color.superficie.tarjeta, borde: color.estado.error, texto: color.estado.error },
};

export function Boton({ etiqueta, onPress, tipo = 'primario', deshabilitado = false, cargando = false, icono, pista, punteado = false, estilo, testID }: PropsBoton) {
  const inactivo = deshabilitado || cargando;
  const apariencia = APARIENCIA[tipo];
  // Deshabilitado: fondo gris para todos menos «Texto», que no tiene fondo; texto terciario
  const fondo = deshabilitado ? (tipo === 'texto' ? undefined : color.superficie.deshabilitado) : apariencia.fondo;
  const colorTexto = deshabilitado ? color.texto.terciario : apariencia.texto;
  const borde = !deshabilitado && apariencia.borde ? { borderWidth: 1.5, borderColor: apariencia.borde, borderStyle: punteado ? ('dashed' as const) : ('solid' as const) } : null;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={etiqueta}
      accessibilityHint={pista}
      aria-disabled={inactivo}
      aria-busy={cargando}
      disabled={inactivo}
      onPress={onPress}
      testID={testID}
      style={({ pressed }) => [estilos.base, { backgroundColor: fondo }, borde, pressed && estilos.presionado, estilo]}
    >
      {cargando ? (
        <ActivityIndicator color={colorTexto} />
      ) : (
        <View style={estilos.contenido}>
          {icono ? <Icono nombre={icono} tamano={20} color={colorTexto} /> : null}
          <Texto variante="boton" color={colorTexto} style={estilos.etiqueta}>
            {etiqueta}
          </Texto>
        </View>
      )}
    </Pressable>
  );
}

const estilos = StyleSheet.create({
  // minHeight y no height: con letra grande del sistema, el botón crece en vez de cortar el texto
  base: { minHeight: 48, paddingHorizontal: 20, paddingVertical: 14, borderRadius: radio.md, alignItems: 'center', justifyContent: 'center' },
  contenido: { flexDirection: 'row', alignItems: 'center', gap: espacio[2] },
  etiqueta: { textAlign: 'center', flexShrink: 1 },
  presionado: { opacity: 0.85 },
});
