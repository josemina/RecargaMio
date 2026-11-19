// T10 · Bloque 2: pantallas 2.1 a 2.4 (HU-03, HU-05, HU-07).
import { Alert } from 'react-native';
import { fireEvent, screen, waitFor } from 'expo-router/testing-library';
import { abrirApp, crearApiFalsa } from './ayudas/apiFalsa';

// Los diálogos de confirmación responden «sí»
beforeEach(() => jest.spyOn(Alert, 'alert').mockImplementation((_t, _m, botones) => botones?.find((b) => b.style !== 'cancel')?.onPress?.()));

describe('T10 · 2.1 Mis tarjetas', () => {
  it('saluda, cuenta las tarjetas y muestra cada una con su saldo y la insignia de saldo bajo', async () => {
    crearApiFalsa();
    await abrirApp('/');
    expect(await screen.findByText('Tienes 2 de 5 tarjetas registradas')).toBeTruthy();
    expect(screen.getByText('$12.400')).toBeTruthy();
    expect(screen.getByLabelText(/Tarjeta de mamá, tarjeta terminada en 7 7 3 0, saldo 3.200 pesos, saldo bajo/)).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Agregar tarjeta (2/5)' })).toBeTruthy();
  });
});

describe('T10 · 2.2 y 2.4 Agregar tarjeta (HU-07 CA-1 y CA-3)', () => {
  it('valida los 10 dígitos y muestra en el campo el error de la API si la tarjeta no existe', async () => {
    crearApiFalsa();
    await abrirApp('/tarjetas/agregar');
    await fireEvent.press(await screen.findByRole('button', { name: 'Guardar tarjeta' }));
    expect(screen.getByText('El número de la tarjeta MIO debe tener 10 dígitos.')).toBeTruthy();
    await fireEvent.changeText(screen.getByLabelText('Número de la tarjeta'), '1111111111');
    await fireEvent.changeText(screen.getByLabelText('Nombre para identificarla'), 'Prueba');
    await fireEvent.press(screen.getByRole('button', { name: 'Guardar tarjeta' }));
    expect(await screen.findByText('No encontramos una tarjeta MIO con ese número. Revísalo.')).toBeTruthy();
  });

  it('guarda la tarjeta con el número sin espacios y dice cuál será (3 de 5)', async () => {
    const api = crearApiFalsa();
    await abrirApp('/tarjetas/agregar');
    expect(await screen.findByText('Será la tarjeta 3 de 5')).toBeTruthy();
    await fireEvent.changeText(screen.getByLabelText('Número de la tarjeta'), '9087654321');
    expect(screen.getByLabelText('Número de la tarjeta').props.value).toBe('9087 6543 21');
    await fireEvent.changeText(screen.getByLabelText('Nombre para identificarla'), 'Tarjeta de Juan');
    await fireEvent.press(screen.getByRole('button', { name: 'Guardar tarjeta' }));
    await waitFor(() => expect(api.llamadas('POST', '/tarjetas')[0].cuerpo).toEqual({ numero: '9087654321', alias: 'Tarjeta de Juan' }));
  });

  it('con 5 de 5 tarjetas muestra la pantalla 2.4: aviso, insignia y botón deshabilitado', async () => {
    const tarjetas = Array.from({ length: 5 }, (_, i) => ({ id: `t${i}`, alias: `Tarjeta ${i}`, numero: `123456000${i}`, saldo: 8000, alerta: null }));
    crearApiFalsa({ tarjetas });
    await abrirApp('/tarjetas/agregar');
    expect(await screen.findByText('Ya tienes 5 de 5 tarjetas registradas. Para agregar una nueva, elimina una que ya no uses.')).toBeTruthy();
    expect(screen.getByLabelText('5 de 5 tarjetas')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Guardar tarjeta' }).props.accessibilityState).toMatchObject({ disabled: true });
    expect(screen.getByRole('button', { name: 'Administrar mis tarjetas' })).toBeTruthy();
  });
});

describe('T10 · 2.3 Detalle de tarjeta (HU-07 CA-4, HU-05)', () => {
  it('muestra la información, cambia el nombre, apaga la alerta y elimina la tarjeta con confirmación', async () => {
    const api = crearApiFalsa();
    await abrirApp('/tarjetas/t2');
    expect(await screen.findByLabelText('Número: terminada en 7 7 3 0')).toBeTruthy();
    expect(screen.getByLabelText('Alerta de saldo: menor a 5.000 pesos')).toBeTruthy();

    // Se llega por el lápiz de la barra superior o por la fila «Renombrar tarjeta»
    await fireEvent.press(screen.getAllByRole('button', { name: 'Renombrar tarjeta' })[0]);
    const campo = await screen.findByDisplayValue('Tarjeta de mamá');
    await fireEvent.changeText(campo, 'Tarjeta de Rosa');
    await fireEvent.press(screen.getByRole('button', { name: 'Guardar' }));
    await waitFor(() => expect(api.llamadas('PATCH', '/tarjetas/t2')[0].cuerpo).toEqual({ alias: 'Tarjeta de Rosa' }));

    await fireEvent.press(screen.getByRole('switch', { name: 'Alerta de saldo bajo' }));
    await waitFor(() => expect(api.llamadas('PUT', '/tarjetas/t2/alerta')[0].cuerpo).toEqual({ umbral: 5000, activa: false }));

    await fireEvent.press(screen.getByRole('button', { name: 'Eliminar tarjeta' }));
    await waitFor(() => expect(api.llamadas('DELETE', '/tarjetas/t2')).toHaveLength(1));
    expect(Alert.alert).toHaveBeenCalledWith('Eliminar tarjeta', expect.stringContaining('MIO •••• 7730'), expect.any(Array), expect.any(Object));
  });
});

describe('T10 · 4.1 Historial (HU-03 CA-2 y CA-3)', () => {
  it('agrupa por fecha y filtra por recargas o viajes', async () => {
    const api = crearApiFalsa();
    await abrirApp('/historial');
    expect(await screen.findByRole('header', { name: 'HOY' })).toBeTruthy();
    expect(screen.getByText('+$20.000')).toBeTruthy();
    expect(screen.getByText('-$3.500')).toBeTruthy();
    await fireEvent.press(screen.getByRole('radio', { name: 'Ver viajes' }));
    await waitFor(() => expect(screen.queryByText('+$20.000')).toBeNull());
    expect(api.llamadas('GET', '/tarjetas/t1/movimientos').length).toBeGreaterThanOrEqual(2);
  });
});
