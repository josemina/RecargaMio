// Texto base: aplica un estilo de Figma y respeta el tamaño de letra del sistema hasta el doble (WCAG 1.4.4).
import { Text, type TextProps } from 'react-native';
import { color as colores, ESCALA_TEXTO_MAXIMA, tipografia, type VarianteTexto } from '@/theme/tokens';

export interface PropsTexto extends TextProps {
  variante?: VarianteTexto;
  color?: string;
}

export function Texto({ variante = 'cuerpo', color = colores.texto.principal, style, ...props }: PropsTexto) {
  return <Text maxFontSizeMultiplier={ESCALA_TEXTO_MAXIMA} style={[tipografia[variante], { color }, style]} {...props} />;
}
