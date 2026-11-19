// Los SVG de assets/ se importan como componentes de react-native-svg (metro.config.js).
declare module '*.svg' {
  import type { FC } from 'react';
  import type { SvgProps } from 'react-native-svg';
  const contenido: FC<SvgProps>;
  export default contenido;
}
