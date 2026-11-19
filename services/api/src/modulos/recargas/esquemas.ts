// Validación de POST /recargas (regla 5). Los datos del medio de pago solo viajan a la pasarela (regla 2).
import { z } from 'zod';

export const MONTOS_PERMITIDOS = [5000, 10000, 20000, 50000] as const;

const numeroTarjeta = z
  .string()
  .transform((v) => v.replace(/[\s-]/g, ''))
  .pipe(z.string().regex(/^\d{10}$/, 'El número de la tarjeta MIO debe tener 10 dígitos.'));

const celular = z
  .string({ error: 'Escribe el número de celular.' })
  .transform((v) => v.replace(/[\s-]/g, ''))
  .pipe(z.string().regex(/^3\d{9}$/, 'El celular debe tener 10 dígitos y empezar por 3.'));

const comunes = {
  tarjetaId: z.uuid('La tarjeta no existe.').optional(),
  numeroDestino: numeroTarjeta.optional(),
  confirmacionNumero: numeroTarjeta.optional(),
  guardarTarjeta: z.boolean().default(false),
  aliasTarjeta: z.string().trim().min(1).max(30, 'El nombre puede tener máximo 30 caracteres.').optional(),
  monto: z
    .number({ error: 'Elige el monto de la recarga.' })
    .refine((m) => (MONTOS_PERMITIDOS as readonly number[]).includes(m), 'El monto debe ser $5.000, $10.000, $20.000 o $50.000.'),
  // Wompi exige que el usuario acepte sus términos y su autorización de datos (se valida aparte para dar un código propio)
  aceptaTerminosPasarela: z.unknown().optional(),
};

export const esquemaRecarga = z
  .discriminatedUnion(
    'medioPago',
    [
      z.object({ ...comunes, medioPago: z.literal('NEQUI'), datosMedio: z.object({ celular }) }),
      z.object({
        ...comunes,
        medioPago: z.literal('PSE'),
        datosMedio: z.object({
          tipoPersona: z.enum(['NATURAL', 'JURIDICA'], { error: 'Elige si eres persona natural o jurídica.' }),
          tipoDocumento: z.enum(['CC', 'CE', 'NIT', 'PP', 'TI'], { error: 'Elige el tipo de documento.' }),
          numeroDocumento: z.string().trim().regex(/^[0-9A-Za-z]{5,15}$/, 'Escribe un número de documento válido.'),
          codigoBanco: z.string({ error: 'Elige tu banco.' }).trim().min(1, 'Elige tu banco.').max(10),
          celular,
        }),
      }),
      z.object({ ...comunes, medioPago: z.literal('BANCOLOMBIA_TRANSFER'), datosMedio: z.object({}).optional() }),
    ],
    { error: 'Elige el medio de pago: PSE, Nequi o Bancolombia.' },
  )
  .refine((d) => Boolean(d.tarjetaId) !== Boolean(d.numeroDestino), {
    message: 'Elige una de tus tarjetas o escribe el número de la tarjeta de otra persona.',
    path: ['tarjetaId'],
  });

export type DatosRecarga = z.infer<typeof esquemaRecarga>;

export const esquemaIdRecarga = z.object({ id: z.uuid('La recarga no existe.') });
export const esquemaConsulta = z.object({ actualizar: z.enum(['1', 'true']).optional() });
