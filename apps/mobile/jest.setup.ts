// Configuración común de las pruebas de la app (jest-expo).
// Almacén seguro en memoria: jest-expo no trae una implementación de expo-secure-store.
jest.mock('expo-secure-store', () => {
  const datos = new Map<string, string>();
  return {
    WHEN_UNLOCKED_THIS_DEVICE_ONLY: 'WHEN_UNLOCKED_THIS_DEVICE_ONLY',
    getItemAsync: jest.fn(async (clave: string) => datos.get(clave) ?? null),
    setItemAsync: jest.fn(async (clave: string, valor: string) => void datos.set(clave, valor)),
    deleteItemAsync: jest.fn(async (clave: string) => void datos.delete(clave)),
  };
});
