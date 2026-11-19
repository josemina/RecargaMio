// Estado de la sesión de toda la app (T9, ADR 0017). Las pantallas 1.1 a 1.4 (T10) usan ingresar, registrar y recuperar.
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { crearClienteApi, type ClienteApi, type Tokens } from '@/api/cliente';
import { API_URL } from '@/api/configuracion';
import { crearAlmacenSeguro, type AlmacenSeguro } from './almacen';
import { quitarDispositivo } from './push';

export interface Usuario {
  id: string;
  nombre: string;
  correo: string;
}

export type EstadoSesion = 'cargando' | 'sin-sesion' | 'con-sesion';

interface ValorSesion {
  estado: EstadoSesion;
  usuario: Usuario | null;
  cliente: ClienteApi;
  ingresar(correo: string, contrasena: string): Promise<void>;
  registrar(datos: { nombre: string; correo: string; contrasena: string; aceptaPolitica: boolean }): Promise<void>;
  salir(): Promise<void>;
  /** Después de rectificar los datos (pantalla de datos personales). */
  actualizarUsuario(usuario: Usuario): void;
  /** Después de eliminar la cuenta: la sesión ya no existe en el servidor. */
  olvidarSesion(): Promise<void>;
}

const ContextoSesion = createContext<ValorSesion | null>(null);

interface Props {
  children: ReactNode;
  /** Solo para pruebas: almacén y cliente simulados. */
  almacen?: AlmacenSeguro;
  fetch?: typeof fetch;
}

export function ProveedorSesion({ children, almacen, fetch: hacerFetch }: Props) {
  const [estado, setEstado] = useState<EstadoSesion>('cargando');
  const [usuario, setUsuario] = useState<Usuario | null>(null);

  const cliente = useMemo(
    () =>
      crearClienteApi({
        urlBase: API_URL,
        almacen: almacen ?? crearAlmacenSeguro(),
        fetch: hacerFetch,
        // La renovación falló: la sesión terminó en el servidor (se cerró, venció o se eliminó la cuenta)
        alCerrarSesion: () => {
          setUsuario(null);
          setEstado('sin-sesion');
        },
      }),
    [almacen, hacerFetch],
  );

  // Al abrir la app se intenta recuperar la sesión guardada
  useEffect(() => {
    let vigente = true;
    (async () => {
      const restaurada = await cliente.restaurarSesion();
      if (!vigente) return;
      if (!restaurada) return setEstado('sin-sesion');
      setEstado('con-sesion');
      try {
        const perfil = await cliente.peticion<Usuario>('/me');
        if (vigente) setUsuario({ id: perfil.id, nombre: perfil.nombre, correo: perfil.correo });
      } catch {
        // Sin conexión: la app sigue en la sesión y las pantallas muestran el error al pedir datos
      }
    })();
    return () => {
      vigente = false;
    };
  }, [cliente]);

  const abrir = useCallback(
    async (respuesta: Tokens & { usuario: Usuario }) => {
      await cliente.iniciarSesion(respuesta);
      setUsuario(respuesta.usuario);
      setEstado('con-sesion');
    },
    [cliente],
  );

  const valor = useMemo<ValorSesion>(
    () => ({
      estado,
      usuario,
      cliente,
      async ingresar(correo, contrasena) {
        await abrir(await cliente.peticion('/auth/ingreso', { metodo: 'POST', cuerpo: { correo, contrasena }, autenticada: false }));
      },
      async registrar(datos) {
        await abrir(await cliente.peticion('/auth/registro', { metodo: 'POST', cuerpo: datos, autenticada: false }));
      },
      async salir() {
        await quitarDispositivo(cliente);
        await cliente.cerrarSesion();
        setUsuario(null);
        setEstado('sin-sesion');
      },
      actualizarUsuario: setUsuario,
      async olvidarSesion() {
        await cliente.cerrarSesion();
        setUsuario(null);
        setEstado('sin-sesion');
      },
    }),
    [estado, usuario, cliente, abrir],
  );

  return <ContextoSesion.Provider value={valor}>{children}</ContextoSesion.Provider>;
}

export function useSesion(): ValorSesion {
  const valor = useContext(ContextoSesion);
  if (!valor) throw new Error('useSesion debe usarse dentro de <ProveedorSesion>');
  return valor;
}
