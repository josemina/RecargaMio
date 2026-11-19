// Insignia · Figma 9:250 (página 02). Etiqueta de estado corta (saldo bajo, modo de pruebas, aprobada, rechazada).
import { StyleSheet, View } from 'react-native';
import { color, radio } from '@/theme/tokens';
import { Texto } from './Texto';

export type TipoInsignia = 'advertencia' | 'exito' | 'info' | 'error' | 'neutral';

const COLORES: Record<TipoInsignia, { fondo: string; texto: string }> = {
  advertencia: { fondo: color.acento.suave, texto: color.acento.texto },
  // T11: el verde de «éxito» sobre su fondo suave da 3,6:1; el texto va en «principal» (WCAG 1.4.3, ADR 0019)
  exito: { fondo: color.estado.exitoSuave, texto: color.texto.principal },
  info: { fondo: color.estado.infoSuave, texto: color.estado.info },
  error: { fondo: color.estado.errorSuave, texto: color.estado.error },
  neutral: { fondo: color.borde.sutil, texto: color.texto.secundario },
};

export interface PropsInsignia {
  etiqueta: string;
  tipo?: TipoInsignia;
  /** Centrada en su contenedor (Figma: marco «Centrado» de las pantallas 1.1 y 3.4). */
  centrada?: boolean;
}

export function Insignia({ etiqueta, tipo = 'advertencia', centrada = false }: PropsInsignia) {
  const { fondo, texto } = COLORES[tipo];
  return (
    <View style={[estilos.base, { backgroundColor: fondo }, centrada && estilos.centrada]} accessible accessibilityRole="text" accessibilityLabel={etiqueta}>
      <Texto variante="pequenoFuerte" color={texto}>
        {etiqueta}
      </Texto>
    </View>
  );
}

const estilos = StyleSheet.create({
  base: { alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 4, borderRadius: radio.total },
  centrada: { alignSelf: 'center' },
});
