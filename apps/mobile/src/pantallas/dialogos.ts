// Confirmaciones con el diálogo del sistema (accesible con TalkBack). En la web, Alert no muestra nada: se usa window.confirm.
import { Alert, Platform } from 'react-native';

export function confirmar({ titulo, mensaje, aceptar, peligro = false }: { titulo: string; mensaje: string; aceptar: string; peligro?: boolean }): Promise<boolean> {
  if (Platform.OS === 'web') return Promise.resolve(window.confirm(`${titulo}\n\n${mensaje}`));
  return new Promise((resolver) =>
    Alert.alert(titulo, mensaje, [
      { text: 'Cancelar', style: 'cancel', onPress: () => resolver(false) },
      { text: aceptar, style: peligro ? 'destructive' : 'default', onPress: () => resolver(true) },
    ], { cancelable: true, onDismiss: () => resolver(false) }),
  );
}

export function avisar(titulo: string, mensaje: string) {
  if (Platform.OS === 'web') window.alert(`${titulo}\n\n${mensaje}`);
  else Alert.alert(titulo, mensaje);
}
