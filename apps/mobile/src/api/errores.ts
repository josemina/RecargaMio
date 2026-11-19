// Errores de la API con el formato único { error: { codigo, mensaje, ...datos } } (plan, sección 6).

export class ErrorApi extends Error {
  constructor(
    /** Código HTTP; 0 si no hubo respuesta (sin conexión o tiempo agotado). */
    public readonly estadoHttp: number,
    public readonly codigo: string,
    mensaje: string,
    public readonly datos: Record<string, unknown> = {},
  ) {
    super(mensaje);
    this.name = 'ErrorApi';
  }
}

export const sinConexion = () =>
  new ErrorApi(0, 'SIN_CONEXION', 'No pudimos conectarnos con RecargaMIO. Revisa tu conexión a Internet e intenta de nuevo.');

export const tiempoAgotado = () =>
  new ErrorApi(0, 'TIEMPO_AGOTADO', 'RecargaMIO está tardando en responder. Intenta de nuevo en unos segundos.');

export const sesionVencida = () => new ErrorApi(401, 'SESION_VENCIDA', 'Tu sesión terminó. Vuelve a ingresar.');

/** Convierte el cuerpo de una respuesta fallida en un ErrorApi, aunque no traiga el formato esperado. */
export function errorDesdeRespuesta(estadoHttp: number, cuerpo: unknown): ErrorApi {
  const error = (cuerpo as { error?: { codigo?: unknown; mensaje?: unknown } } | null)?.error;
  if (error && typeof error.codigo === 'string' && typeof error.mensaje === 'string') {
    const { codigo, mensaje, ...datos } = error as Record<string, unknown>;
    return new ErrorApi(estadoHttp, codigo as string, mensaje as string, datos);
  }
  return new ErrorApi(estadoHttp, 'ERROR_INESPERADO', 'Ocurrió un error inesperado. Intenta de nuevo.');
}
