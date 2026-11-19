// Cliente HTTP de la API (T9, ADR 0017).
// - Agrega Authorization: Bearer con el token de acceso, que vive solo en memoria (15 minutos).
// - Renovación automática: si el token venció o está por vencer, lo renueva con POST /auth/renovar.
//   Si varias peticiones lo necesitan a la vez, se hace una sola renovación y todas la esperan
//   (el token de renovación es de un solo uso: dos renovaciones simultáneas cerrarían la sesión).
// - Si la renovación falla, borra la sesión y avisa con alCerrarSesion (la app vuelve a la pantalla 1.1).
import { errorDesdeRespuesta, ErrorApi, sesionVencida, sinConexion, tiempoAgotado } from './errores';
import type { AlmacenSeguro } from '@/sesion/almacen';

export interface Tokens {
  tokenAcceso: string;
  accesoExpiraEn: string;
  tokenRenovacion: string;
  sesionExpiraEn: string;
}

export interface OpcionesPeticion {
  metodo?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  cuerpo?: unknown;
  /** Falso en las rutas públicas (registro, ingreso, recuperación). */
  autenticada?: boolean;
  /** Para cancelar la petición, por ejemplo al salir de la pantalla. */
  senal?: AbortSignal;
}

interface Dependencias {
  urlBase: string;
  almacen: AlmacenSeguro;
  alCerrarSesion?: () => void;
  fetch?: typeof fetch;
  ahora?: () => number;
  tiempoMaximoMs?: number;
}

/** Se renueva un poco antes de que venza, para no mandar una petición con un token a punto de expirar. */
const MARGEN_RENOVACION_MS = 30_000;

export function crearClienteApi({ urlBase, almacen, alCerrarSesion, fetch: hacerFetch = fetch, ahora = Date.now, tiempoMaximoMs = 15_000 }: Dependencias) {
  let acceso: { token: string; expiraEn: number } | null = null;
  let renovacionEnCurso: Promise<void> | null = null;

  async function llamar(ruta: string, { metodo = 'GET', cuerpo, senal }: OpcionesPeticion, token?: string) {
    const control = new AbortController();
    const temporizador = setTimeout(() => control.abort(), tiempoMaximoMs);
    senal?.addEventListener('abort', () => control.abort());
    try {
      return await hacerFetch(`${urlBase}${ruta}`, {
        method: metodo,
        headers: {
          Accept: 'application/json',
          ...(cuerpo !== undefined ? { 'Content-Type': 'application/json' } : {}),
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: cuerpo !== undefined ? JSON.stringify(cuerpo) : undefined,
        signal: control.signal,
      });
    } catch {
      throw senal?.aborted ? new ErrorApi(0, 'CANCELADA', 'La petición se canceló.') : control.signal.aborted ? tiempoAgotado() : sinConexion();
    } finally {
      clearTimeout(temporizador);
    }
  }

  async function leerRespuesta<T>(respuesta: Response): Promise<T> {
    if (respuesta.status === 204) return undefined as T;
    const cuerpo = await respuesta.json().catch(() => null);
    if (!respuesta.ok) throw errorDesdeRespuesta(respuesta.status, cuerpo);
    return cuerpo as T;
  }

  async function guardarTokens(tokens: Tokens) {
    acceso = { token: tokens.tokenAcceso, expiraEn: Date.parse(tokens.accesoExpiraEn) };
    await almacen.guardar(tokens.tokenRenovacion);
  }

  async function olvidarSesion() {
    acceso = null;
    await almacen.borrar();
  }

  function renovar(): Promise<void> {
    renovacionEnCurso ??= (async () => {
      try {
        const tokenRenovacion = await almacen.leer();
        if (!tokenRenovacion) throw sesionVencida();
        const respuesta = await llamar('/auth/renovar', { metodo: 'POST', cuerpo: { tokenRenovacion } });
        if (respuesta.status === 401 || respuesta.status === 400) {
          // Sesión revocada, vencida o token ya usado: no hay forma de seguir sin volver a ingresar
          await olvidarSesion();
          alCerrarSesion?.();
          throw sesionVencida();
        }
        await guardarTokens(await leerRespuesta<Tokens>(respuesta));
      } finally {
        renovacionEnCurso = null;
      }
    })();
    return renovacionEnCurso;
  }

  async function tokenVigente(): Promise<string> {
    if (!acceso || acceso.expiraEn - ahora() < MARGEN_RENOVACION_MS) await renovar();
    return acceso!.token;
  }

  async function peticion<T>(ruta: string, opciones: OpcionesPeticion = {}): Promise<T> {
    if (opciones.autenticada === false) return leerRespuesta<T>(await llamar(ruta, opciones));

    let respuesta = await llamar(ruta, opciones, await tokenVigente());
    if (respuesta.status === 401) {
      // El servidor rechazó el token (venció antes de lo esperado o el reloj del teléfono está corrido): un solo reintento
      acceso = null;
      respuesta = await llamar(ruta, opciones, await tokenVigente());
      if (respuesta.status === 401) {
        await olvidarSesion();
        alCerrarSesion?.();
      }
    }
    return leerRespuesta<T>(respuesta);
  }

  return {
    peticion,
    /** Guarda los tokens de /auth/ingreso o /auth/registro. */
    iniciarSesion: guardarTokens,
    /** Al abrir la app: si hay un token de renovación guardado, recupera la sesión sin pedir la contraseña. */
    async restaurarSesion(): Promise<boolean> {
      if (!(await almacen.leer())) return false;
      try {
        await renovar();
        return true;
      } catch (error) {
        // Sin conexión no se borra la sesión: el usuario puede seguir cuando vuelva la red
        if (error instanceof ErrorApi && error.estadoHttp === 0) return true;
        return false;
      }
    },
    /** Cierra la sesión en el servidor (si se puede) y borra los tokens del teléfono. */
    async cerrarSesion() {
      const tokenRenovacion = await almacen.leer();
      await olvidarSesion();
      if (tokenRenovacion) {
        await llamar('/auth/salir', { metodo: 'POST', cuerpo: { tokenRenovacion } }).catch(() => undefined);
      }
    },
    tieneTokenAcceso: () => acceso !== null,
  };
}

export type ClienteApi = ReturnType<typeof crearClienteApi>;
