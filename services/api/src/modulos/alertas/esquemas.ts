// Validación de PUT /tarjetas/:id/alerta y del aviso interno del recaudo (regla 5).
import { z } from 'zod';

export const UMBRAL_MINIMO = 3500;
export const UMBRAL_MAXIMO = 50000;

export const esquemaAlerta = z.object({
  umbral: z
    .number({ error: 'Elige el valor de la alerta.' })
    .int('El valor de la alerta debe ser un número entero de pesos.')
    .min(UMBRAL_MINIMO, 'El valor de la alerta debe estar entre $3.500 y $50.000.')
    .max(UMBRAL_MAXIMO, 'El valor de la alerta debe estar entre $3.500 y $50.000.'),
  activa: z.boolean({ error: 'Indica si la alerta está activa.' }).default(true),
});

export const esquemaAvisoViaje = z.object({
  numero: z.string().regex(/^\d{10}$/, 'El número de la tarjeta MIO debe tener 10 dígitos.'),
});
