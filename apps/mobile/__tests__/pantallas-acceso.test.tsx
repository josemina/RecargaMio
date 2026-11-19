// T10 · Bloque 1: pantallas 1.1 a 1.4 y la política de datos (HU-06).
import { fireEvent, screen, waitFor } from 'expo-router/testing-library';
import { abrirApp, CLAVE, crearApiFalsa } from './ayudas/apiFalsa';

describe('T10 · 1.1 Inicio de sesión (HU-06 CA-3 y CA-4)', () => {
  it('sin datos, avisa en cada campo y no llama a la API', async () => {
    const api = crearApiFalsa();
    await abrirApp('/', { conSesion: false });
    await fireEvent.press(await screen.findByRole('button', { name: 'Ingresar' }));
    expect(screen.getByText('Escribe un correo electrónico válido.')).toBeTruthy();
    expect(screen.getByText('Escribe tu contraseña.')).toBeTruthy();
    expect(api.llamadas('POST', '/auth/ingreso')).toHaveLength(0);
  });

  it('con una contraseña equivocada muestra la pantalla 1.2: intentos restantes y aviso del bloqueo', async () => {
    crearApiFalsa();
    await abrirApp('/', { conSesion: false });
    await fireEvent.changeText(await screen.findByLabelText('Correo electrónico'), 'viviana@recargamio.test');
    await fireEvent.changeText(screen.getByLabelText('Contraseña'), 'Equivocada1');
    await fireEvent.press(screen.getByRole('button', { name: 'Ingresar' }));
    expect(await screen.findByText('Correo o contraseña incorrectos. Te quedan 4 intentos.')).toBeTruthy();
    expect(screen.getByRole('alert', { name: 'Por seguridad, después de 5 intentos fallidos el ingreso se bloquea durante 15 minutos.' })).toBeTruthy();
  });

  it('con la cuenta bloqueada muestra el mensaje de la API', async () => {
    crearApiFalsa({ bloqueada: true });
    await abrirApp('/', { conSesion: false });
    await fireEvent.changeText(await screen.findByLabelText('Correo electrónico'), 'viviana@recargamio.test');
    await fireEvent.changeText(screen.getByLabelText('Contraseña'), CLAVE);
    await fireEvent.press(screen.getByRole('button', { name: 'Ingresar' }));
    expect(await screen.findByText(/el ingreso está bloqueado por 15 minutos/)).toBeTruthy();
  });

  it('con los datos correctos entra a la pantalla 2.1', async () => {
    crearApiFalsa();
    await abrirApp('/', { conSesion: false });
    await fireEvent.changeText(await screen.findByLabelText('Correo electrónico'), 'viviana@recargamio.test');
    await fireEvent.changeText(screen.getByLabelText('Contraseña'), CLAVE);
    await fireEvent.press(screen.getByRole('button', { name: 'Ingresar' }));
    expect(await screen.findByRole('header', { name: 'Hola, Viviana' })).toBeTruthy();
  });
});

describe('T10 · 1.3 Crear cuenta (HU-06 CA-1 y CA-2)', () => {
  async function llenar(correo = 'ana@recargamio.test') {
    await abrirApp('/registro', { conSesion: false });
    await fireEvent.changeText(await screen.findByLabelText('Nombre completo'), 'Ana Prueba');
    await fireEvent.changeText(screen.getByLabelText('Correo electrónico'), correo);
    await fireEvent.changeText(screen.getByLabelText('Contraseña'), CLAVE);
    await fireEvent.changeText(screen.getByLabelText('Confirmar contraseña'), CLAVE);
  }

  it('sin autorizar el tratamiento de datos no se crea la cuenta (Ley 1581)', async () => {
    const api = crearApiFalsa();
    await llenar();
    await fireEvent.press(screen.getByRole('button', { name: 'Crear cuenta' }));
    expect(screen.getByText('Para crear la cuenta debes autorizar el tratamiento de tus datos personales.')).toBeTruthy();
    expect(api.llamadas('POST', '/auth/registro')).toHaveLength(0);
  });

  it('pide una contraseña con letras y números, y que las dos coincidan', async () => {
    crearApiFalsa();
    await abrirApp('/registro', { conSesion: false });
    await fireEvent.changeText(await screen.findByLabelText('Contraseña'), 'solotexto');
    await fireEvent.changeText(screen.getByLabelText('Confirmar contraseña'), 'otra');
    await fireEvent.press(screen.getByRole('button', { name: 'Crear cuenta' }));
    expect(screen.getByText('La contraseña debe tener al menos un número.')).toBeTruthy();
    expect(screen.getByText('Las contraseñas no coinciden.')).toBeTruthy();
  });

  it('con el correo ya registrado muestra el error en el campo', async () => {
    crearApiFalsa();
    await llenar('ocupado@recargamio.test');
    await fireEvent.press(screen.getByRole('checkbox', { name: /Autorizo el tratamiento/ }));
    await fireEvent.press(screen.getByRole('button', { name: 'Crear cuenta' }));
    expect(await screen.findByText('Ya existe una cuenta con ese correo.')).toBeTruthy();
  });

  it('con todo correcto envía aceptaPolitica: true y entra a la app', async () => {
    const api = crearApiFalsa();
    await llenar();
    await fireEvent.press(screen.getByRole('checkbox', { name: /Autorizo el tratamiento/ }));
    await fireEvent.press(screen.getByRole('button', { name: 'Crear cuenta' }));
    expect(await screen.findByRole('header', { name: 'Hola, Ana' })).toBeTruthy();
    expect(api.llamadas('POST', '/auth/registro')[0].cuerpo).toMatchObject({ aceptaPolitica: true, nombre: 'Ana Prueba' });
  });

  it('la política de datos se puede leer antes de crear la cuenta', async () => {
    crearApiFalsa();
    await abrirApp('/registro', { conSesion: false });
    await fireEvent.press(await screen.findByRole('button', { name: 'Leer la política de tratamiento de datos' }));
    expect(await screen.findByRole('header', { name: 'Política de tratamiento de datos' })).toBeTruthy();
    expect(screen.getByText(/Borrador pendiente de revisión/)).toBeTruthy();
  });
});

describe('T10 · 1.4 Recuperar contraseña', () => {
  it('muestra el mensaje genérico de la API, sin revelar si el correo existe', async () => {
    crearApiFalsa();
    await abrirApp('/recuperar', { conSesion: false });
    await fireEvent.changeText(await screen.findByLabelText('Correo electrónico'), 'quien@recargamio.test');
    await fireEvent.press(screen.getByRole('button', { name: 'Enviar enlace' }));
    await waitFor(() => expect(screen.getByText('Si el correo está registrado, recibirás un enlace válido por 30 minutos.')).toBeTruthy());
  });
});
