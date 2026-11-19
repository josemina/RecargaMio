// T9 y T10 · Navegación: con sesión, cuatro pestañas (2.1, 3.1, 4.1, 5.1); sin sesión, solo las pantallas de acceso.
// Se montan las rutas reales de src/app con el enrutador de pruebas de expo-router.
import { Alert } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { fireEvent, screen } from 'expo-router/testing-library';
import { abrirApp, crearApiFalsa } from './ayudas/apiFalsa';

beforeEach(() => jest.spyOn(Alert, 'alert').mockImplementation((_t, _m, botones) => botones?.find((b) => b.style !== 'cancel')?.onPress?.()));

describe('T9 · Navegación', () => {
  it('sin sesión, una ruta privada lleva a la pantalla 1.1 de inicio de sesión', async () => {
    crearApiFalsa();
    await abrirApp('/historial', { conSesion: false });
    expect(await screen.findByRole('header', { name: 'Ingresa a tu cuenta' })).toBeTruthy();
    expect(screen.queryByRole('tab')).toBeNull();
  });

  it('con sesión guardada, abre en Inicio (2.1) con las cuatro pestañas de Figma y cambia entre ellas', async () => {
    crearApiFalsa();
    const enrutador = await abrirApp('/');
    expect(await screen.findByRole('header', { name: 'Hola, Viviana' })).toBeTruthy();
    expect(screen.getAllByRole('tab').map((t) => t.props.accessibilityLabel)).toEqual(['Inicio', 'Recargar', 'Historial', 'Perfil']);
    await fireEvent.press(screen.getByRole('tab', { name: 'Historial' }));
    expect(await screen.findByRole('header', { name: 'Historial' })).toBeTruthy();
    expect(enrutador.getPathname()).toBe('/historial');
    expect(screen.getByRole('tab', { name: 'Historial' }).props.accessibilityState).toMatchObject({ selected: true });
  });

  it('cerrar sesión desde Perfil (5.1) vuelve a la pantalla 1.1 y borra el token del teléfono', async () => {
    crearApiFalsa();
    await abrirApp('/perfil');
    await fireEvent.press(await screen.findByRole('button', { name: 'Cerrar sesión' }));
    expect(await screen.findByRole('header', { name: 'Ingresa a tu cuenta' })).toBeTruthy();
    await expect(SecureStore.getItemAsync('recargamio.tokenRenovacion')).resolves.toBeNull();
  });
});
