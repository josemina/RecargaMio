// Aviso interno del recaudo después de cada viaje (ADR 0014).
// Se protege con la misma llave compartida que la API usa para llamar al recaudo (X-Api-Key).
import { createHash, timingSafeEqual } from 'node:crypto';
import { Router } from 'express';
import { ErrorApi } from '../../middleware/errores';
import { esquemaAvisoViaje } from './esquemas';
import type { ServicioAlertas } from './servicio';

const resumen = (valor: string) => createHash('sha256').update(valor).digest();

export function crearRutasInternas({ alertas, apiKey }: { alertas: ServicioAlertas; apiKey: string }) {
  const rutas = Router();

  rutas.use((req, _res, next) => {
    // Se comparan los resúmenes para que la comparación tome el mismo tiempo sin importar la longitud
    if (!timingSafeEqual(resumen(req.header('x-api-key') ?? ''), resumen(apiKey))) {
      throw new ErrorApi(401, 'NO_AUTORIZADO', 'Falta la llave del recaudo o no es válida.');
    }
    next();
  });

  rutas.post('/recaudo/viajes', async (req, res) => {
    const { numero } = esquemaAvisoViaje.parse(req.body);
    res.json(await alertas.revisarNumero(numero));
  });

  return rutas;
}
