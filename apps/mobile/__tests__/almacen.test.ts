// T9 · El token de renovación se guarda en expo-secure-store, nunca en AsyncStorage (MASVS-STORAGE).
import * as SecureStore from 'expo-secure-store';
import { crearAlmacenSeguro } from '@/sesion/almacen';

describe('T9 · Almacén seguro', () => {
  it('guarda, lee y borra con SecureStore, solo con el teléfono desbloqueado y sin copiarse a otro dispositivo', async () => {
    const almacen = crearAlmacenSeguro();
    await almacen.guardar('renovacion-1');
    await expect(almacen.leer()).resolves.toBe('renovacion-1');
    await almacen.borrar();
    await expect(almacen.leer()).resolves.toBeNull();
    const opciones = { keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY };
    expect(SecureStore.setItemAsync).toHaveBeenCalledWith('recargamio.tokenRenovacion', 'renovacion-1', opciones);
    expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith('recargamio.tokenRenovacion', opciones);
  });

  it('la app no depende de AsyncStorage', () => {
    const dependencias = Object.keys(require('../package.json').dependencies);
    expect(dependencias).not.toContain('@react-native-async-storage/async-storage');
  });
});
