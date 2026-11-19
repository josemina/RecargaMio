// Validación de las entradas de /auth (regla 5 de CLAUDE.md).
import { z } from 'zod';

const correo = z
  .string({ error: 'Escribe tu correo electrónico.' })
  .trim()
  .toLowerCase()
  .max(254, 'El correo es demasiado largo.')
  .pipe(z.email('Escribe un correo electrónico válido.'));

/** HU-06 CA-1: ocho caracteres o más. Figma (1.3) agrega: con letras y números. */
export const contrasenaNueva = z
  .string({ error: 'Escribe una contraseña.' })
  .min(8, 'La contraseña debe tener mínimo 8 caracteres.')
  .max(128, 'La contraseña puede tener máximo 128 caracteres.')
  .regex(/\p{L}/u, 'La contraseña debe tener al menos una letra.')
  .regex(/\d/, 'La contraseña debe tener al menos un número.');

const tokenOpaco = z.string({ error: 'Falta el token.' }).regex(/^[A-Za-z0-9_-]{20,100}$/, 'El token no es válido.');

export const esquemaRegistro = z.object({
  nombre: z.string({ error: 'Escribe tu nombre completo.' }).trim().min(3, 'Escribe tu nombre completo.').max(80, 'El nombre es demasiado largo.'),
  correo,
  contrasena: contrasenaNueva,
  // HU-06 CA-2: aceptación expresa de la política (Ley 1581 de 2012). Se valida aparte para dar un código propio.
  aceptaPolitica: z.unknown().optional(),
});

export const esquemaIngreso = z.object({
  correo,
  contrasena: z.string({ error: 'Escribe tu contraseña.' }).min(1, 'Escribe tu contraseña.').max(128),
});

export const esquemaTokenRenovacion = z.object({ tokenRenovacion: tokenOpaco });

export const esquemaRecuperar = z.object({ correo });

export const esquemaRestablecer = z.object({ token: tokenOpaco, contrasena: contrasenaNueva });

/** Formulario web de /restablecer: además pide confirmar la contraseña. */
export const esquemaFormularioRestablecer = esquemaRestablecer
  .extend({ confirmacion: z.string() })
  .refine((d) => d.contrasena === d.confirmacion, { message: 'Las contraseñas no coinciden.', path: ['confirmacion'] });
