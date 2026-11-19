// Aviso · Figma 9:275 (página 02). Mensaje contextual: información, confirmación, advertencia o error.
// Ancho: llenar el contenedor.
import { StyleSheet, View } from 'react-native';
import { color, espacio, radio } from '@/theme/tokens';
import { Icono, type NombreIcono } from './Icono';
import { Texto } from './Texto';

export type TipoAviso = 'info' | 'exito' | 'advertencia' | 'error';

const APARIENCIA: Record<TipoAviso, { fondo: string; texto: string; colorIcono?: string; icono: NombreIcono }> = {
  info: { fondo: color.estado.infoSuave, texto: color.estado.info, icono: 'info' },
  // T11: texto en «principal» porque el verde da 3,6:1 sobre su fondo; el ícono sigue verde (3:1 basta) (ADR 0019)
  exito: { fondo: color.estado.exitoSuave, texto: color.texto.principal, colorIcono: color.estado.exito, icono: 'check' },
  advertencia: { fondo: color.acento.suave, texto: color.acento.texto, icono: 'alerta' },
  error: { fondo: color.estado.errorSuave, texto: color.estado.error, icono: 'alerta' },
};

export interface PropsAviso {
  mensaje: string;
  tipo?: TipoAviso;
  testID?: string;
}

export function Aviso({ mensaje, tipo = 'info', testID }: PropsAviso) {
  const { fondo, texto, colorIcono = texto, icono } = APARIENCIA[tipo];
  const urgente = tipo === 'error' || tipo === 'advertencia';
  return (
    <View
      testID={testID}
      accessible
      // Los errores y advertencias se anuncian solos al aparecer (WCAG 4.1.3)
      accessibilityRole={urgente ? 'alert' : 'text'}
      accessibilityLiveRegion={urgente ? 'assertive' : 'polite'}
      accessibilityLabel={mensaje}
      style={[estilos.base, { backgroundColor: fondo }]}
    >
      <Icono nombre={icono} tamano={20} color={colorIcono} />
      <Texto variante="etiqueta" color={texto} style={estilos.mensaje}>
        {mensaje}
      </Texto>
    </View>
  );
}

const estilos = StyleSheet.create({
  base: { flexDirection: 'row', alignItems: 'flex-start', gap: espacio[3], paddingHorizontal: 14, paddingVertical: 12, borderRadius: radio.md, alignSelf: 'stretch' },
  mensaje: { flex: 1 },
});
