// Consultas y cambios de datos de la API con TanStack Query (T10). Las pantallas solo usan estos ganchos.
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useSesion } from '@/sesion/ProveedorSesion';
import type {
  Banco, DetalleTarjeta, FiltroMovimientos, ListaMovimientos, ListaTarjetas, Notificacion, Perfil, Recarga, SolicitudRecarga, Tarjeta,
  TerminosPasarela,
} from './tipos';
import { ESTADOS_FINALES } from './tipos';

export const claves = {
  tarjetas: ['tarjetas'] as const,
  tarjeta: (id: string) => ['tarjetas', id] as const,
  movimientos: (id: string, tipo: FiltroMovimientos) => ['tarjetas', id, 'movimientos', tipo] as const,
  recarga: (id: string) => ['recargas', id] as const,
  notificaciones: ['notificaciones'] as const,
  perfil: ['perfil'] as const,
  bancos: ['pasarela', 'bancos'] as const,
  terminos: ['pasarela', 'terminos'] as const,
};

// ── Tarjetas (HU-03, HU-07) ──
export function useTarjetas() {
  const { cliente } = useSesion();
  return useQuery({ queryKey: claves.tarjetas, queryFn: ({ signal }) => cliente.peticion<ListaTarjetas>('/tarjetas', { senal: signal }) });
}

export function useTarjeta(id: string) {
  const { cliente } = useSesion();
  return useQuery({ queryKey: claves.tarjeta(id), queryFn: ({ signal }) => cliente.peticion<DetalleTarjeta>(`/tarjetas/${id}`, { senal: signal }) });
}

export function useMovimientos(id: string | undefined, tipo: FiltroMovimientos) {
  const { cliente } = useSesion();
  return useQuery({
    queryKey: claves.movimientos(id ?? '', tipo),
    enabled: Boolean(id),
    queryFn: ({ signal }) => cliente.peticion<ListaMovimientos>(`/tarjetas/${id}/movimientos?tipo=${tipo}&limite=50`, { senal: signal }),
  });
}

export function useAgregarTarjeta() {
  const { cliente } = useSesion();
  const cache = useQueryClient();
  return useMutation({
    mutationFn: (datos: { numero: string; alias: string }) =>
      cliente.peticion<{ tarjeta: Tarjeta; registradas: number; maximo: number }>('/tarjetas', { metodo: 'POST', cuerpo: datos }),
    onSuccess: () => cache.invalidateQueries({ queryKey: claves.tarjetas }),
  });
}

export function useRenombrarTarjeta(id: string) {
  const { cliente } = useSesion();
  const cache = useQueryClient();
  return useMutation({
    mutationFn: (alias: string) => cliente.peticion<Tarjeta>(`/tarjetas/${id}`, { metodo: 'PATCH', cuerpo: { alias } }),
    onSuccess: () => cache.invalidateQueries({ queryKey: claves.tarjetas }),
  });
}

export function useEliminarTarjeta(id: string) {
  const { cliente } = useSesion();
  const cache = useQueryClient();
  return useMutation({
    mutationFn: () => cliente.peticion<void>(`/tarjetas/${id}`, { metodo: 'DELETE' }),
    onSuccess: () => cache.invalidateQueries({ queryKey: claves.tarjetas }),
  });
}

// ── Alertas (HU-05) ──
export function useConfigurarAlerta() {
  const { cliente } = useSesion();
  const cache = useQueryClient();
  return useMutation({
    mutationFn: ({ tarjetaId, umbral, activa }: { tarjetaId: string; umbral: number; activa: boolean }) =>
      cliente.peticion<Tarjeta>(`/tarjetas/${tarjetaId}/alerta`, { metodo: 'PUT', cuerpo: { umbral, activa } }),
    onSuccess: () => cache.invalidateQueries({ queryKey: claves.tarjetas }),
  });
}

// ── Pasarela y recargas (HU-01, HU-02, HU-04) ──
export function useBancos(habilitada: boolean) {
  const { cliente } = useSesion();
  return useQuery({
    queryKey: claves.bancos,
    enabled: habilitada,
    staleTime: 10 * 60_000,
    queryFn: ({ signal }) => cliente.peticion<{ bancos: Banco[] }>('/pasarela/bancos', { senal: signal }).then((r) => r.bancos),
  });
}

export function useTerminosPasarela() {
  const { cliente } = useSesion();
  return useQuery({ queryKey: claves.terminos, staleTime: 10 * 60_000, queryFn: ({ signal }) => cliente.peticion<TerminosPasarela>('/pasarela/terminos', { senal: signal }) });
}

export function useCrearRecarga() {
  const { cliente } = useSesion();
  const cache = useQueryClient();
  return useMutation({
    mutationFn: (solicitud: SolicitudRecarga) => cliente.peticion<Recarga>('/recargas', { metodo: 'POST', cuerpo: solicitud }),
    onSuccess: (recarga) => cache.setQueryData(claves.recarga(recarga.id), recarga),
  });
}

/** Estado de la recarga (3.3). Mientras no termine, se consulta cada 2 s; al terminar, se refrescan saldos y avisos. */
export function useRecarga(id: string) {
  const { cliente } = useSesion();
  const cache = useQueryClient();
  return useQuery({
    queryKey: claves.recarga(id),
    queryFn: async ({ signal }) => {
      const recarga = await cliente.peticion<Recarga>(`/recargas/${id}`, { senal: signal });
      if (ESTADOS_FINALES.includes(recarga.estado)) {
        void cache.invalidateQueries({ queryKey: claves.tarjetas });
        void cache.invalidateQueries({ queryKey: claves.notificaciones });
      }
      return recarga;
    },
    // Se consulta al abrir la pantalla aunque la recarga recién creada esté en caché
    staleTime: 0,
    refetchInterval: (consulta) => (consulta.state.data && ESTADOS_FINALES.includes(consulta.state.data.estado) ? false : 2000),
  });
}

/** «Actualizar estado» (3.3): pide a la API que pregunte a la pasarela. */
export function useActualizarRecarga(id: string) {
  const { cliente } = useSesion();
  const cache = useQueryClient();
  return useMutation({
    mutationFn: () => cliente.peticion<Recarga>(`/recargas/${id}?actualizar=1`),
    onSuccess: (recarga) => cache.setQueryData(claves.recarga(id), recarga),
  });
}

// ── Notificaciones (HU-05) ──
export function useNotificaciones() {
  const { cliente } = useSesion();
  return useQuery({
    queryKey: claves.notificaciones,
    queryFn: ({ signal }) => cliente.peticion<{ noLeidas: number; notificaciones: Notificacion[] }>('/notificaciones?limite=30', { senal: signal }),
  });
}

export function useMarcarLeidas() {
  const { cliente } = useSesion();
  const cache = useQueryClient();
  return useMutation({
    mutationFn: () => cliente.peticion<{ marcadas: number }>('/notificaciones/leidas', { metodo: 'POST' }),
    onSuccess: () => cache.invalidateQueries({ queryKey: claves.notificaciones }),
  });
}

// ── Perfil (T7, RNF-04) ──
export function usePerfil() {
  const { cliente } = useSesion();
  return useQuery({ queryKey: claves.perfil, queryFn: ({ signal }) => cliente.peticion<Perfil>('/me', { senal: signal }) });
}

export function useActualizarPerfil() {
  const { cliente } = useSesion();
  const cache = useQueryClient();
  return useMutation({
    mutationFn: (datos: { nombre?: string; correo?: string; contrasenaActual?: string }) => cliente.peticion<Perfil>('/me', { metodo: 'PATCH', cuerpo: datos }),
    onSuccess: (perfil) => cache.setQueryData(claves.perfil, perfil),
  });
}
