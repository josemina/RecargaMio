// T10 · Bloque 3: pantallas 3.1 a 3.5 (HU-01, HU-02, HU-04) y el criterio de aceptación de T10:
// el flujo 1.1 → 2.1 → 3.1 → 3.3 → 3.4 → 4.1 funciona de punta a punta.
import { fireEvent, screen, waitFor } from 'expo-router/testing-library';
import { abrirApp, CLAVE, crearApiFalsa } from './ayudas/apiFalsa';

jest.mock('expo-web-browser', () => ({ openBrowserAsync: jest.fn(), openAuthSessionAsync: jest.fn(async () => ({ type: 'dismiss' })) }));

async function pagarConNequi(celular = '3991111111') {
  await fireEvent.press(await screen.findByRole('radio', { name: 'Nequi, Billetera digital' }));
  await fireEvent.changeText(screen.getByLabelText('Celular de Nequi'), celular);
  await fireEvent.press(screen.getByRole('checkbox', { name: /Acepto los términos/ }));
  await fireEvent.press(screen.getByRole('button', { name: /^Pagar/ }));
}

describe('T10 · Criterio de aceptación: 1.1 → 2.1 → 3.1 → 3.3 → 3.4 → 4.1', () => {
  it('ingresa, recarga Mi tarjeta con Nequi, ve la recarga exitosa y la encuentra en el historial', async () => {
    const api = crearApiFalsa();
    // 1.1
    await abrirApp('/', { conSesion: false });
    await fireEvent.changeText(await screen.findByLabelText('Correo electrónico'), 'viviana@recargamio.test');
    await fireEvent.changeText(screen.getByLabelText('Contraseña'), CLAVE);
    await fireEvent.press(screen.getByRole('button', { name: 'Ingresar' }));
    // 2.1 → 3.1 con «Recargar» de Mi tarjeta
    await screen.findByRole('header', { name: 'Hola, Viviana' });
    await fireEvent.press((await screen.findAllByRole('button', { name: 'Recargar' }))[0]);
    expect(await screen.findByRole('header', { name: 'Recargar saldo' })).toBeTruthy();
    expect(screen.getByRole('button', { name: /Tarjeta a recargar: Mi tarjeta terminada en 4821/ })).toBeTruthy();
    // 3.1 → 3.3 → 3.4
    await pagarConNequi();
    expect(await screen.findByRole('header', { name: '¡Recarga exitosa!' })).toBeTruthy();
    expect(screen.getByText('Se acreditaron $20.000 a Mi tarjeta •••• 4821.')).toBeTruthy();
    expect(screen.getByLabelText('Nuevo saldo: 32.400 pesos')).toBeTruthy();
    // La solicitud lleva la tarjeta, el monto de Figma por defecto y el medio, pero la app no guarda el celular
    expect(api.llamadas('POST', '/recargas')[0].cuerpo).toEqual({
      tarjetaId: 't1',
      monto: 20000,
      aceptaTerminosPasarela: true,
      medioPago: 'NEQUI',
      datosMedio: { celular: '3991111111' },
    });
    // 3.4 → 4.1
    await fireEvent.press(screen.getByRole('button', { name: 'Ver historial' }));
    expect(await screen.findByRole('header', { name: 'Historial' })).toBeTruthy();
    expect(await screen.findByText('Recarga con Nequi')).toBeTruthy();
  });
});

describe('T10 · 3.1 Recargar saldo (HU-01, HU-02)', () => {
  it('sin aceptar los términos de la pasarela ni escribir el celular no paga', async () => {
    const api = crearApiFalsa();
    await abrirApp('/recargar');
    await fireEvent.press(await screen.findByRole('radio', { name: 'Nequi, Billetera digital' }));
    await fireEvent.changeText(screen.getByLabelText('Celular de Nequi'), '12345');
    await fireEvent.press(screen.getByRole('button', { name: 'Pagar $20.000' }));
    expect(screen.getByText('El celular debe tener 10 dígitos y empezar por 3.')).toBeTruthy();
    expect(screen.getByText(/Para pagar debes aceptar los términos/)).toBeTruthy();
    expect(api.llamadas('POST', '/recargas')).toHaveLength(0);
  });

  it('con PSE pide documento, banco y celular, y los envía a la pasarela', async () => {
    const api = crearApiFalsa();
    await abrirApp('/recargar');
    await fireEvent.press(await screen.findByRole('radio', { name: '5.000 pesos' }));
    await fireEvent.press(screen.getByRole('radio', { name: 'PSE, Débito desde tu cuenta bancaria' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Pagar $5.000' }));
    expect(screen.getByText('Escribe un número de documento válido.')).toBeTruthy();
    expect(screen.getAllByText('Elige tu banco.').length).toBeGreaterThan(0);
    await fireEvent.changeText(screen.getByLabelText('Número de documento'), '1000000001');
    await fireEvent.press(screen.getByRole('button', { name: /Banco: sin elegir/ }));
    await fireEvent.press(await screen.findByRole('radio', { name: 'Banco que aprueba, Pago con PSE' }));
    await fireEvent.changeText(screen.getByLabelText('Celular'), '3001234567');
    await fireEvent.press(screen.getByRole('checkbox', { name: /Acepto los términos/ }));
    await fireEvent.press(screen.getByRole('button', { name: 'Pagar $5.000' }));
    await waitFor(() =>
      expect(api.llamadas('POST', '/recargas')[0].cuerpo).toMatchObject({
        monto: 5000,
        medioPago: 'PSE',
        datosMedio: { tipoPersona: 'NATURAL', tipoDocumento: 'CC', numeroDocumento: '1000000001', codigoBanco: '1', celular: '3001234567' },
      }),
    );
  });
});

describe('T10 · 3.5 Pago rechazado (HU-02)', () => {
  it('explica que no hubo cobro, muestra el motivo y permite intentar de nuevo', async () => {
    crearApiFalsa({ resultadoPago: 'RECHAZADA' });
    await abrirApp('/recargar');
    await pagarConNequi('3992222222');
    expect(await screen.findByRole('header', { name: 'Pago rechazado' })).toBeTruthy();
    expect(screen.getByText(/no se hizo ningún cobro/)).toBeTruthy();
    expect(screen.getByLabelText('Motivo: Fondos insuficientes')).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'Intentar de nuevo' }));
    expect(await screen.findByRole('header', { name: 'Recargar saldo' })).toBeTruthy();
  });
});

describe('T10 · 3.2 Recargar a otra persona (HU-04)', () => {
  it('exige escribir dos veces el mismo número antes de pagar', async () => {
    const api = crearApiFalsa();
    await abrirApp('/recarga/tercero');
    await fireEvent.changeText(await screen.findByLabelText('Número de la tarjeta de destino'), '9087654321');
    await fireEvent.changeText(screen.getByLabelText('Confirma el número'), '9087654320');
    await fireEvent.press(screen.getByRole('button', { name: 'Pagar $10.000' }));
    expect(screen.getByText('Los dos números no coinciden. Revísalos antes de pagar.')).toBeTruthy();
    expect(api.llamadas('POST', '/recargas')).toHaveLength(0);
  });

  it('envía el número, la confirmación y si se guarda la tarjeta', async () => {
    const api = crearApiFalsa();
    await abrirApp('/recarga/tercero');
    await fireEvent.changeText(await screen.findByLabelText('Número de la tarjeta de destino'), '9087654321');
    await fireEvent.changeText(screen.getByLabelText('Confirma el número'), '9087654321');
    await fireEvent.press(screen.getByRole('switch', { name: 'Guardar esta tarjeta' }));
    await pagarConNequi();
    await waitFor(() =>
      expect(api.llamadas('POST', '/recargas')[0].cuerpo).toMatchObject({ numeroDestino: '9087654321', confirmacionNumero: '9087654321', guardarTarjeta: true, monto: 10000 }),
    );
  });
});
