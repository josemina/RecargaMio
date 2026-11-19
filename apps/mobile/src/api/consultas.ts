// Cliente de TanStack Query: caché de los datos del servidor para las pantallas (T10).
import { QueryClient } from '@tanstack/react-query';
import { ErrorApi } from './errores';

export function crearClienteConsultas() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        // Un error 4xx no se arregla reintentando; la falta de conexión y los 5xx sí, dos veces
        retry: (intentos, error) => intentos < 2 && !(error instanceof ErrorApi && error.estadoHttp >= 400 && error.estadoHttp < 500),
      },
      // Nunca se reintenta una escritura: podría crear dos recargas
      mutations: { retry: false },
    },
  });
}
