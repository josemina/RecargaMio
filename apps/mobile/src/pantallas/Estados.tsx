// Estados comunes mientras se cargan los datos o si fallan.
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { mensajeDeError } from '@/api/mensajes';
import { Aviso, Boton } from '@/components';
import { color, espacio } from '@/theme/tokens';

export function Cargando({ etiqueta = 'Cargando' }: { etiqueta?: string }) {
  return (
    <View style={estilos.cargando} accessible accessibilityLabel={etiqueta} accessibilityRole="progressbar">
      <ActivityIndicator color={color.marca.primario} size="large" />
    </View>
  );
}

export function ErrorDeCarga({ error, onReintentar }: { error: unknown; onReintentar: () => void }) {
  return (
    <View style={estilos.error}>
      <Aviso tipo="error" mensaje={mensajeDeError(error)} />
      <Boton etiqueta="Intentar de nuevo" tipo="secundario" icono="refrescar" onPress={onReintentar} />
    </View>
  );
}

const estilos = StyleSheet.create({
  cargando: { paddingVertical: espacio[8], alignItems: 'center' },
  error: { gap: espacio[3] },
});
