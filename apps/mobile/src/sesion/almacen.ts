// Dónde vive el token de renovación (ADR 0017, MASVS-STORAGE).
// - En el teléfono: expo-secure-store (Keystore en Android, Keychain en iOS). Nunca AsyncStorage.
// - En la web, que solo se usa para el catálogo de componentes: en memoria. No se usa el almacenamiento del navegador.
// El token de acceso nunca se guarda: vive en memoria (src/api/cliente.ts).
import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

export interface AlmacenSeguro {
  leer(): Promise<string | null>;
  guardar(valor: string): Promise<void>;
  borrar(): Promise<void>;
}

const CLAVE = 'recargamio.tokenRenovacion';

export function crearAlmacenSeguro(): AlmacenSeguro {
  if (Platform.OS === 'web') return crearAlmacenMemoria();
  // Solo se puede leer con el teléfono desbloqueado y no se copia a otro dispositivo en un respaldo
  const opciones: SecureStore.SecureStoreOptions = { keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY };
  return {
    leer: () => SecureStore.getItemAsync(CLAVE, opciones),
    guardar: (valor) => SecureStore.setItemAsync(CLAVE, valor, opciones),
    borrar: () => SecureStore.deleteItemAsync(CLAVE, opciones),
  };
}

export function crearAlmacenMemoria(inicial: string | null = null): AlmacenSeguro & { valor: () => string | null } {
  let valor = inicial;
  return {
    valor: () => valor,
    leer: async () => valor,
    guardar: async (nuevo) => {
      valor = nuevo;
    },
    borrar: async () => {
      valor = null;
    },
  };
}
