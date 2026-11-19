// T9 · Cliente HTTP: token de acceso en memoria, renovación automática y única, y cierre de sesión (ADR 0017).
import { crearClienteApi, type Tokens } from '@/api/cliente';
import { ErrorApi } from '@/api/errores';
import { crearAlmacenMemoria } from '@/sesion/almacen';

const URL_BASE = 'http://api.prueba';
const AHORA = Date.parse('2026-11-18T12:00:00Z');

const tokens = (n: number, vigenciaMs = 15 * 60_000): Tokens => ({
  tokenAcceso: `acceso-${n}`,
  accesoExpiraEn: new Date(AHORA + vigenciaMs).toISOString(),
  tokenRenovacion: `renovacion-${n}`,
  sesionExpiraEn: new Date(AHORA + 7 * 86_400_000).toISOString(),
});

const respuesta = (estado: number, cuerpo?: unknown) =>
  ({ status: estado, ok: estado >= 200 && estado < 300, json: async () => cuerpo }) as Response;

/** Servidor falso: responde según la ruta y guarda cada petición para revisarla. */
function servidorFalso(rutas: Record<string, (cuerpo: unknown, autorizacion?: string) => Response | Promise<Response>>) {
  const peticiones: { ruta: string; autorizacion?: string; cuerpo?: unknown }[] = [];
  const fetch = jest.fn(async (url: string, init: RequestInit) => {
    const ruta = url.replace(URL_BASE, '');
    const autorizacion = (init.headers as Record<string, string>).Authorization;
    const cuerpo = init.body ? JSON.parse(init.body as string) : undefined;
    peticiones.push({ ruta, autorizacion, cuerpo });
    const manejador = rutas[ruta];
    if (!manejador) throw new TypeError('Network request failed');
    return manejador(cuerpo, autorizacion);
  });
  return { fetch: fetch as unknown as typeof globalThis.fetch, peticiones };
}

function crear(rutas: Parameters<typeof servidorFalso>[0], renovacionGuardada: string | null = null) {
  const servidor = servidorFalso(rutas);
  const almacen = crearAlmacenMemoria(renovacionGuardada);
  const alCerrarSesion = jest.fn();
  const cliente = crearClienteApi({ urlBase: URL_BASE, almacen, fetch: servidor.fetch, alCerrarSesion, ahora: () => AHORA });
  return { cliente, almacen, alCerrarSesion, ...servidor };
}

describe('T9 · Cliente HTTP', () => {
  it('envía el token de acceso como Bearer y no lo guarda en el almacén (solo el de renovación)', async () => {
    const { cliente, almacen, peticiones } = crear({ '/me': () => respuesta(200, { id: 'u1' }) });
    await cliente.iniciarSesion(tokens(1));
    await cliente.peticion('/me');
    expect(peticiones[0].autorizacion).toBe('Bearer acceso-1');
    expect(almacen.valor()).toBe('renovacion-1');
  });

  it('las rutas públicas van sin Authorization', async () => {
    const { cliente, peticiones } = crear({ '/auth/ingreso': () => respuesta(200, tokens(1)) });
    await cliente.peticion('/auth/ingreso', { metodo: 'POST', cuerpo: { correo: 'a@b.co', contrasena: 'x' }, autenticada: false });
    expect(peticiones[0].autorizacion).toBeUndefined();
  });

  it('renueva antes de que venza el token de acceso y guarda el token de renovación nuevo (rotación)', async () => {
    const { cliente, almacen, peticiones } = crear({
      '/auth/renovar': () => respuesta(200, tokens(2)),
      '/tarjetas': () => respuesta(200, { tarjetas: [] }),
    });
    await cliente.iniciarSesion(tokens(1, 10_000)); // vence en 10 s: menos que el margen de 30 s
    await cliente.peticion('/tarjetas');
    expect(peticiones.map((p) => p.ruta)).toEqual(['/auth/renovar', '/tarjetas']);
    expect(peticiones[0].cuerpo).toEqual({ tokenRenovacion: 'renovacion-1' });
    expect(peticiones[1].autorizacion).toBe('Bearer acceso-2');
    expect(almacen.valor()).toBe('renovacion-2');
  });

  it('con varias peticiones a la vez hace una sola renovación (el token de renovación es de un solo uso)', async () => {
    let liberar!: () => void;
    const espera = new Promise<void>((r) => (liberar = r));
    const { cliente, peticiones } = crear({
      '/auth/renovar': async () => {
        await espera;
        return respuesta(200, tokens(2));
      },
      '/tarjetas': () => respuesta(200, {}),
      '/notificaciones': () => respuesta(200, {}),
      '/me': () => respuesta(200, {}),
    }, 'renovacion-1');
    const todas = Promise.all([cliente.peticion('/tarjetas'), cliente.peticion('/notificaciones'), cliente.peticion('/me')]);
    liberar();
    await todas;
    expect(peticiones.filter((p) => p.ruta === '/auth/renovar')).toHaveLength(1);
    expect(peticiones.filter((p) => p.ruta !== '/auth/renovar').every((p) => p.autorizacion === 'Bearer acceso-2')).toBe(true);
  });

  it('si el servidor rechaza el token con 401, renueva y repite la petición una vez', async () => {
    const { cliente, peticiones } = crear({
      '/auth/renovar': () => respuesta(200, tokens(2)),
      '/me': (_c, autorizacion) =>
        autorizacion === 'Bearer acceso-1'
          ? respuesta(401, { error: { codigo: 'TOKEN_EXPIRADO', mensaje: 'Tu sesión expiró.' } })
          : respuesta(200, { id: 'u1' }),
    });
    await cliente.iniciarSesion(tokens(1));
    await expect(cliente.peticion('/me')).resolves.toEqual({ id: 'u1' });
    expect(peticiones.map((p) => p.ruta)).toEqual(['/me', '/auth/renovar', '/me']);
  });

  it('si la renovación falla, borra la sesión del teléfono y avisa para volver a la pantalla 1.1', async () => {
    const { cliente, almacen, alCerrarSesion } = crear(
      { '/auth/renovar': () => respuesta(401, { error: { codigo: 'SESION_INVALIDA', mensaje: 'x' } }) },
      'renovacion-revocada',
    );
    await expect(cliente.peticion('/me')).rejects.toMatchObject({ codigo: 'SESION_VENCIDA' });
    expect(almacen.valor()).toBeNull();
    expect(alCerrarSesion).toHaveBeenCalledTimes(1);
  });

  it('traduce los errores de la API a ErrorApi con su código y sus datos', async () => {
    const { cliente } = crear({
      '/tarjetas': () => respuesta(409, { error: { codigo: 'LIMITE_TARJETAS', mensaje: 'Ya tienes 5 de 5 tarjetas.', registradas: 5, maximo: 5 } }),
    });
    await cliente.iniciarSesion(tokens(1));
    const error = await cliente.peticion('/tarjetas', { metodo: 'POST', cuerpo: {} }).catch((e) => e);
    expect(error).toBeInstanceOf(ErrorApi);
    expect(error).toMatchObject({ estadoHttp: 409, codigo: 'LIMITE_TARJETAS', datos: { registradas: 5, maximo: 5 } });
  });

  it('sin conexión responde SIN_CONEXION con un mensaje para el usuario', async () => {
    const { cliente } = crear({});
    await cliente.iniciarSesion(tokens(1));
    await expect(cliente.peticion('/me')).rejects.toMatchObject({ codigo: 'SIN_CONEXION', estadoHttp: 0 });
  });

  describe('restaurar la sesión al abrir la app', () => {
    it('sin token guardado no hay sesión', async () => {
      const { cliente, peticiones } = crear({});
      await expect(cliente.restaurarSesion()).resolves.toBe(false);
      expect(peticiones).toHaveLength(0);
    });

    it('con token guardado renueva y recupera la sesión sin pedir la contraseña', async () => {
      const { cliente, almacen } = crear({ '/auth/renovar': () => respuesta(200, tokens(2)) }, 'renovacion-1');
      await expect(cliente.restaurarSesion()).resolves.toBe(true);
      expect(almacen.valor()).toBe('renovacion-2');
      expect(cliente.tieneTokenAcceso()).toBe(true);
    });

    it('sin conexión conserva la sesión guardada para intentarlo después', async () => {
      const { cliente, almacen } = crear({}, 'renovacion-1');
      await expect(cliente.restaurarSesion()).resolves.toBe(true);
      expect(almacen.valor()).toBe('renovacion-1');
    });
  });

  it('cerrar sesión avisa al servidor y borra el token del teléfono, aunque no haya conexión', async () => {
    const conRed = crear({ '/auth/salir': () => respuesta(204) });
    await conRed.cliente.iniciarSesion(tokens(1));
    await conRed.cliente.cerrarSesion();
    expect(conRed.peticiones[0]).toMatchObject({ ruta: '/auth/salir', cuerpo: { tokenRenovacion: 'renovacion-1' } });
    expect(conRed.almacen.valor()).toBeNull();
    expect(conRed.cliente.tieneTokenAcceso()).toBe(false);

    const sinRed = crear({});
    await sinRed.cliente.iniciarSesion(tokens(1));
    await expect(sinRed.cliente.cerrarSesion()).resolves.toBeUndefined();
    expect(sinRed.almacen.valor()).toBeNull();
  });
});
