// Texto para el usuario a partir de cualquier error (los de la API ya traen un mensaje en español).
import { ErrorApi } from './errores';

export function mensajeDeError(error: unknown): string {
  if (error instanceof ErrorApi) return error.message;
  return 'Ocurrió un error inesperado. Intenta de nuevo.';
}

export const codigoDeError = (error: unknown): string | null => (error instanceof ErrorApi ? error.codigo : null);
