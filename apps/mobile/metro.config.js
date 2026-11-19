// Configuración de Metro (T9, ADR 0017). Los SVG de Figma se importan como componentes con react-native-svg-transformer.
// En el monorepo no hace falta configurar nada más: Expo detecta los workspaces de npm (SDK 52 o posterior).
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);
const { transformer, resolver } = config;

config.transformer = {
  ...transformer,
  babelTransformerPath: require.resolve('react-native-svg-transformer/expo'),
};
config.resolver = {
  ...resolver,
  assetExts: resolver.assetExts.filter((ext) => ext !== 'svg'),
  sourceExts: [...resolver.sourceExts, 'svg'],
};

module.exports = config;
