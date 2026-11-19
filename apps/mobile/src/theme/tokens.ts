// Tokens de diseño copiados de las variables de Figma (archivo yKHSYSKwagdMvEKL5tA1Xn, página 02 · Sistema de diseño):
// colecciones «RecargaMIO · Color» y «RecargaMIO · Medidas», estilos de texto y el efecto «Sombra tarjeta».
// No se inventan colores ni tamaños: si algo falta aquí, primero se agrega en Figma (CLAUDE.md, sección Diseño).
import type { TextStyle, ViewStyle } from 'react-native';

export const color = {
  marca: { primario: '#0B3D91', primarioOscuro: '#072A66', primarioSuave: '#E6EDFA', primarioBorde: '#C9D6F2' },
  acento: { principal: '#F5A623', suave: '#FFF3D6', texto: '#7A4B00' },
  texto: { principal: '#1B1F2A', secundario: '#5B6475', terciario: '#6F7889', invertido: '#FFFFFF' },
  superficie: { fondo: '#F4F6FA', tarjeta: '#FFFFFF', deshabilitado: '#E9ECF2' },
  borde: { predeterminado: '#C7CEDB', sutil: '#E3E8F0' },
  estado: {
    exito: '#1E8E3E',
    exitoSuave: '#DDF3E3',
    error: '#C62828',
    errorSuave: '#FDE8E8',
    info: '#1565C0',
    infoSuave: '#E3F0FC',
  },
} as const;

export const espacio = { 1: 4, 2: 8, 3: 12, 4: 16, 5: 20, 6: 24, 8: 32 } as const;

export const radio = { sm: 8, md: 12, lg: 16, xl: 24, total: 999 } as const;

/** Objetivo táctil mínimo (WCAG 2.5.5 y regla 7 de CLAUDE.md). */
export const TACTIL_MINIMO = 44;

/** Familias de Inter cargadas con @expo-google-fonts/inter (src/theme/fuentes.ts). */
export const fuente = {
  regular: 'Inter_400Regular',
  media: 'Inter_500Medium',
  seminegrita: 'Inter_600SemiBold',
  negrita: 'Inter_700Bold',
} as const;

// En Android, fontWeight no elige el archivo de una fuente propia: cada peso usa su propia familia.
const estilo = (fontFamily: string, fontSize: number, lineHeight: number, letterSpacing = 0): TextStyle => ({
  fontFamily,
  fontSize,
  lineHeight,
  letterSpacing,
});

/** Estilos de texto de Figma (grupo «RecargaMIO/…»). */
export const tipografia = {
  display: estilo(fuente.negrita, 32, 40),
  titulo1: estilo(fuente.negrita, 24, 30, -0.3),
  titulo2: estilo(fuente.seminegrita, 18, 24),
  titulo3: estilo(fuente.seminegrita, 16, 22),
  cuerpo: estilo(fuente.regular, 15, 22),
  cuerpoFuerte: estilo(fuente.seminegrita, 15, 22),
  etiqueta: estilo(fuente.media, 13, 18),
  pequeno: estilo(fuente.regular, 12, 16),
  pequenoFuerte: estilo(fuente.seminegrita, 12, 16),
  boton: estilo(fuente.seminegrita, 16, 20),
  saldo: estilo(fuente.negrita, 32, 38, -0.5),
} as const satisfies Record<string, TextStyle>;

export type VarianteTexto = keyof typeof tipografia;

/** Efecto «RecargaMIO/Sombra tarjeta»: #081A40 al 8 %, desplazamiento (0, 4), desenfoque 16. */
export const sombraTarjeta: ViewStyle = {
  boxShadow: '0px 4px 16px 0px rgba(8, 26, 64, 0.08)',
};

/**
 * Tope del agrandamiento de texto del sistema. El texto respeta el tamaño de letra del teléfono (WCAG 1.4.4),
 * pero hasta el doble, para que las pantallas de 390 px de Figma sigan siendo usables.
 */
export const ESCALA_TEXTO_MAXIMA = 2;
