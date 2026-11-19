// Errores del simulador con el formato único { error: { codigo, mensaje } }.
import type { ErrorRequestHandler, RequestHandler } from 'express';
import { ZodError } from 'zod';

export class ErrorRecaudo extends Error {
  constructor(
    public readonly estadoHttp: number,
    public readonly codigo: string,
    mensaje: string,
  ) {
    super(mensaje);
    this.name = 'ErrorRecaudo';
  }
}

export const rutaNoEncontrada: RequestHandler = (_req, res) => {
  res.status(404).json({ error: { codigo: 'NO_ENCONTRADO', mensaje: 'La ruta solicitada no existe.' } });
};

export const manejadorErrores: ErrorRequestHandler = (err, req, res, _next) => {
  if (err instanceof ErrorRecaudo) {
    res.status(err.estadoHttp).json({ error: { codigo: err.codigo, mensaje: err.message } });
    return;
  }
  if (err instanceof ZodError) {
    const mensaje = err.issues.map((i) => (i.path.length ? `${i.path.join('.')}: ${i.message}` : i.message)).join('; ');
    res.status(400).json({ error: { codigo: 'DATOS_INVALIDOS', mensaje } });
    return;
  }
  if (err?.type === 'entity.parse.failed') {
    res.status(400).json({ error: { codigo: 'DATOS_INVALIDOS', mensaje: 'El cuerpo no es un JSON válido.' } });
    return;
  }
  req.log?.error({ err }, 'Error no controlado');
  res.status(500).json({ error: { codigo: 'ERROR_INTERNO', mensaje: 'Ocurrió un error inesperado en el recaudo.' } });
};
