// Validación de PATCH /me y DELETE /me (regla 5).
import { z } from 'zod';

const contrasena = z.string({ error: 'Escribe tu contraseña.' }).min(1, 'Escribe tu contraseña.').max(128);

// Pantalla 5.2 «Actualizar o rectificar mis datos» (Ley 1581 de 2012, art. 8)
export const esquemaActualizar = z
  .object({
    nombre: z.string().trim().min(3, 'Escribe tu nombre completo.').max(80, 'El nombre es demasiado largo.').optional(),
    correo: z
      .string()
      .trim()
      .toLowerCase()
      .max(254, 'El correo es demasiado largo.')
      .pipe(z.email('Escribe un correo electrónico válido.'))
      .optional(),
    // Cambiar el correo exige la contraseña: el correo es la llave para recuperar la cuenta
    contrasenaActual: contrasena.optional(),
  })
  .refine((d) => d.nombre !== undefined || d.correo !== undefined, { message: 'Indica qué dato quieres cambiar.', path: ['nombre'] })
  .refine((d) => d.correo === undefined || d.contrasenaActual !== undefined, {
    message: 'Para cambiar el correo escribe tu contraseña actual.',
    path: ['contrasenaActual'],
  });

// Pantalla 5.2 «Eliminar mi cuenta»: se confirma con la contraseña
export const esquemaEliminar = z.object({ contrasena });
