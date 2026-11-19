// T10 · Bloques 4 y 5: alertas (4.2), avisos, perfil (5.1), privacidad (5.2), datos personales y ayuda (5.3).
import { Alert } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { fireEvent, screen, waitFor } from 'expo-router/testing-library';
import { abrirApp, CLAVE, crearApiFalsa } from './ayudas/apiFalsa';

beforeEach(() => jest.spyOn(Alert, 'alert').mockImplementation((_t, _m, botones) => botones?.find((b) => b.style !== 'cancel')?.onPress?.()));

describe('T10 · 4.2 Alertas de saldo bajo (HU-05 CA-1 y CA-4)', () => {
  it('cambia el valor de una tarjeta y apaga la de otra, y las guarda juntas', async () => {
    const api = crearApiFalsa();
    await abrirApp('/alertas');
    await fireEvent.press(await screen.findByRole('radio', { name: 'Menos de 10.000 pesos, Mi tarjeta' }));
    await fireEvent.press(screen.getByRole('switch', { name: 'Alerta de saldo bajo de Tarjeta de mamá' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Guardar cambios' }));
    expect(await screen.findByText('Guardamos tus alertas.')).toBeTruthy();
    expect(api.llamadas('PUT', '/tarjetas/t1/alerta')[0].cuerpo).toEqual({ umbral: 10000, activa: true });
    expect(api.llamadas('PUT', '/tarjetas/t2/alerta')[0].cuerpo).toEqual({ umbral: 5000, activa: false });
  });
});

describe('T10 · Bandeja de avisos (HU-05 CA-2)', () => {
  it('la campana de la 2.1 anuncia los avisos sin leer y la bandeja los marca como leídos', async () => {
    const api = crearApiFalsa();
    api.estado.notificaciones.push({
      id: 'n1', tipo: 'SALDO_BAJO', titulo: 'Saldo bajo en Tarjeta de mamá', cuerpo: 'Te quedan $3.200.', datos: { tarjetaId: 't2' }, leida: false, creadaEn: new Date().toISOString(),
    });
    await abrirApp('/');
    await fireEvent.press(await screen.findByRole('button', { name: 'Avisos, 1 sin leer' }));
    expect(await screen.findByText('Saldo bajo en Tarjeta de mamá')).toBeTruthy();
    await waitFor(() => expect(api.llamadas('POST', '/notificaciones/leidas')).toHaveLength(1));
  });
});

describe('T10 · 5.1 Perfil', () => {
  it('muestra el nombre y el correo, y cerrar sesión pide confirmación y vuelve a la 1.1', async () => {
    crearApiFalsa();
    await abrirApp('/perfil');
    expect(await screen.findByLabelText('Viviana Andrade Torres, viviana@recargamio.test')).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'Cerrar sesión' }));
    expect(await screen.findByRole('header', { name: 'Ingresa a tu cuenta' })).toBeTruthy();
    await expect(SecureStore.getItemAsync('recargamio.tokenRenovacion')).resolves.toBeNull();
  });
});

describe('T10 · Datos personales (rectificación, Ley 1581 art. 8)', () => {
  it('cambia el nombre sin contraseña; cambiar el correo la pide', async () => {
    const api = crearApiFalsa();
    await abrirApp('/datos-personales');
    await fireEvent.changeText(await screen.findByLabelText('Nombre completo'), 'Viviana Andrade');
    await fireEvent.press(screen.getByRole('button', { name: 'Guardar cambios' }));
    expect(await screen.findByText('Guardamos tus datos.')).toBeTruthy();
    expect(api.llamadas('PATCH', '/me')[0].cuerpo).toEqual({ nombre: 'Viviana Andrade' });

    await fireEvent.changeText(screen.getByLabelText('Correo electrónico'), 'nueva@recargamio.test');
    await fireEvent.press(screen.getByRole('button', { name: 'Guardar cambios' }));
    expect(screen.getByText('Para cambiar el correo escribe tu contraseña actual.')).toBeTruthy();
    await fireEvent.changeText(screen.getByLabelText('Contraseña actual'), CLAVE);
    await fireEvent.press(screen.getByRole('button', { name: 'Guardar cambios' }));
    await waitFor(() => expect(api.llamadas('PATCH', '/me')[1].cuerpo).toEqual({ correo: 'nueva@recargamio.test', contrasenaActual: CLAVE }));
  });
});

describe('T10 · 5.2 Privacidad y datos (RNF-04)', () => {
  it('muestra la autorización registrada y «Descargar mis datos» como próximamente', async () => {
    crearApiFalsa();
    await abrirApp('/privacidad');
    expect(await screen.findByText('Autorizaste el tratamiento de tus datos el 12 sep 2026 (política versión 1.0).')).toBeTruthy();
    expect(screen.getByRole('button', { name: /Descargar mis datos. Próximamente/ })).toBeTruthy();
  });

  it('eliminar la cuenta pide confirmación y contraseña; con la correcta vuelve a la 1.1', async () => {
    const api = crearApiFalsa();
    await abrirApp('/privacidad');
    await fireEvent.press(await screen.findByRole('button', { name: /Eliminar mi cuenta/ }));
    expect(Alert.alert).toHaveBeenCalledWith('Eliminar mi cuenta', expect.stringContaining('no se puede deshacer'), expect.any(Array), expect.any(Object));
    await fireEvent.changeText(await screen.findByLabelText('Contraseña'), 'Equivocada1');
    await fireEvent.press(screen.getByRole('button', { name: 'Eliminar cuenta' }));
    expect(await screen.findByText('La contraseña no es correcta.')).toBeTruthy();
    await fireEvent.changeText(screen.getByLabelText('Contraseña'), CLAVE);
    await fireEvent.press(screen.getByRole('button', { name: 'Eliminar cuenta' }));
    expect(await screen.findByRole('header', { name: 'Ingresa a tu cuenta' })).toBeTruthy();
    expect(api.llamadas('DELETE', '/me').map((p) => p.cuerpo)).toEqual([{ contrasena: 'Equivocada1' }, { contrasena: CLAVE }]);
  });
});

describe('T10 · 5.3 Ayuda y PQR', () => {
  it('abre las respuestas de las preguntas frecuentes y marca las PQR como próximamente', async () => {
    crearApiFalsa();
    await abrirApp('/ayuda');
    await fireEvent.press(await screen.findByRole('button', { name: 'Pagué y no veo el saldo' }));
    expect(screen.getByText(/no pagues de nuevo/)).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Radicar una PQR (próximamente)' }).props.accessibilityState).toMatchObject({ disabled: true });
  });
});
