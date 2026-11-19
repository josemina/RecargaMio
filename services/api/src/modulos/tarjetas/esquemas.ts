// Validación de las entradas de /tarjetas (regla 5 de CLAUDE.md).
import { z } from 'zod';

const numero = z
  .string({ error: 'Escribe el número de la tarjeta.' })
  .transform((v) => v.replace(/[\s-]/g, ''))
  .pipe(z.string().regex(/^\d{10}$/, 'El número de la tarjeta MIO debe tener 10 dígitos.'));

const alias = z
  .string({ error: 'Ponle un nombre para identificarla.' })
  .trim()
  .min(1, 'Ponle un nombre para identificarla.')
  .max(30, 'El nombre puede tener máximo 30 caracteres.');

export const esquemaAgregar = z.object({ numero, alias });
export const esquemaRenombrar = z.object({ alias });
export const esquemaId = z.object({ id: z.uuid('La tarjeta no existe.') });

export const esquemaMovimientos = z.object({
  tipo: z.enum(['todo', 'recargas', 'viajes'], { error: 'El filtro debe ser todo, recargas o viajes.' }).default('todo'),
  limite: z.coerce.number().int().min(1).max(100).default(20),
  antesDe: z.coerce.date({ error: 'antesDe debe ser una fecha.' }).optional(),
});
