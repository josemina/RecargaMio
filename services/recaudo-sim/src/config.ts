// Configuración del simulador de recaudo, validada con zod.
import { z } from 'zod';

const esquemaEntorno = z.object({
  PORT: z.coerce.number().int().positive().default(4000),
  DATABASE_URL: z.string().min(1, 'Falta DATABASE_URL'),
  RECAUDO_API_KEY: z.string().min(16, 'RECAUDO_API_KEY debe tener al menos 16 caracteres'),
  // URL de la API que recibe el aviso de cada viaje (alertas de saldo bajo). Sin ella no se avisa.
  API_AVISOS_URL: z.url('API_AVISOS_URL debe ser una URL').optional(),
  NIVEL_REGISTRO: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).default('info'),
});

export type Configuracion = z.infer<typeof esquemaEntorno>;

export function cargarConfiguracion(entorno: NodeJS.ProcessEnv = process.env): Configuracion {
  const resultado = esquemaEntorno.safeParse(entorno);
  if (!resultado.success) {
    const detalle = resultado.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ');
    throw new Error(`Configuración inválida: ${detalle}`);
  }
  return resultado.data;
}
