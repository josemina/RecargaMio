// T9 · Proveedor de sesión: al abrir la app recupera la sesión guardada; salir la cierra en el servidor y en el teléfono.
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { Pressable, Text } from 'react-native';
import { crearAlmacenMemoria } from '@/sesion/almacen';
import { ProveedorSesion, useSesion } from '@/sesion/ProveedorSesion';

const respuesta = (estado: number, cuerpo?: unknown) => ({ status: estado, ok: estado < 300, json: async () => cuerpo }) as Response;
const tokens = { tokenAcceso: 'a2', accesoExpiraEn: new Date(Date.now() + 900_000).toISOString(), tokenRenovacion: 'r2', sesionExpiraEn: new Date(Date.now() + 86_400_000).toISOString() };

function servidor() {
  const rutas: string[] = [];
  const fetch = jest.fn(async (url: string) => {
    const ruta = new URL(url).pathname;
    rutas.push(ruta);
    if (ruta === '/auth/renovar') return respuesta(200, tokens);
    if (ruta === '/me') return respuesta(200, { id: 'u1', nombre: 'Viviana Andrade Torres', correo: 'viviana@recargamio.test' });
    if (ruta === '/auth/ingreso') return respuesta(200, { ...tokens, usuario: { id: 'u1', nombre: 'Viviana Andrade Torres', correo: 'viviana@recargamio.test' } });
    if (ruta === '/auth/salir') return respuesta(204);
    return respuesta(404, { error: { codigo: 'NO_ENCONTRADO', mensaje: 'x' } });
  });
  return { fetch: fetch as unknown as typeof globalThis.fetch, rutas };
}

function Estado() {
  const { estado, usuario, salir, ingresar } = useSesion();
  return (
    <>
      <Text testID="estado">{estado}</Text>
      <Text testID="usuario">{usuario?.nombre ?? '-'}</Text>
      <Pressable accessibilityRole="button" accessibilityLabel="Salir" onPress={() => void salir()} />
      <Pressable accessibilityRole="button" accessibilityLabel="Ingresar" onPress={() => void ingresar('viviana@recargamio.test', 'Clave1234')} />
    </>
  );
}

describe('T9 · Sesión de la app', () => {
  it('sin token guardado, la app abre en las pantallas de acceso', async () => {
    const { fetch } = servidor();
    await render(<ProveedorSesion almacen={crearAlmacenMemoria()} fetch={fetch}><Estado /></ProveedorSesion>);
    await waitFor(() => expect(screen.getByTestId('estado')).toHaveTextContent('sin-sesion'));
  });

  it('con token guardado, recupera la sesión y el perfil sin pedir la contraseña', async () => {
    const { fetch, rutas } = servidor();
    const almacen = crearAlmacenMemoria('r1');
    await render(<ProveedorSesion almacen={almacen} fetch={fetch}><Estado /></ProveedorSesion>);
    await waitFor(() => expect(screen.getByTestId('usuario')).toHaveTextContent('Viviana Andrade Torres'));
    expect(screen.getByTestId('estado')).toHaveTextContent('con-sesion');
    expect(rutas).toEqual(['/auth/renovar', '/me']);
    expect(almacen.valor()).toBe('r2');
  });

  it('ingresar abre la sesión y salir la cierra en el servidor y en el teléfono', async () => {
    const { fetch, rutas } = servidor();
    const almacen = crearAlmacenMemoria();
    await render(<ProveedorSesion almacen={almacen} fetch={fetch}><Estado /></ProveedorSesion>);
    await waitFor(() => expect(screen.getByTestId('estado')).toHaveTextContent('sin-sesion'));
    await fireEvent.press(screen.getByRole('button', { name: 'Ingresar' }));
    await waitFor(() => expect(screen.getByTestId('estado')).toHaveTextContent('con-sesion'));
    expect(almacen.valor()).toBe('r2');
    await fireEvent.press(screen.getByRole('button', { name: 'Salir' }));
    await waitFor(() => expect(screen.getByTestId('estado')).toHaveTextContent('sin-sesion'));
    expect(rutas).toContain('/auth/salir');
    expect(almacen.valor()).toBeNull();
    await act(async () => undefined);
  });
});
