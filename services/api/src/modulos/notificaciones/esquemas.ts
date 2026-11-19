// Validación de /dispositivos y /notificaciones (regla 5).
import { z } from 'zod';

// El token de FCM va en el cuerpo y no en la URL, para que nunca quede en los registros de peticiones.
export const esquemaDispositivo = z.object({
  token: z
    .string({ error: 'Falta el token del dispositivo.' })
    .trim()
    .min(20, 'El token del dispositivo no es válido.')
    .max(4096, 'El token del dispositivo no es válido.')
    .regex(/^[\w:-]+$/, 'El token del dispositivo no es válido.'),
  // iOS queda fuera del PMV (decisión D7)
  plataforma: z.enum(['android'], { error: 'Por ahora las notificaciones solo funcionan en Android.' }).default('android'),
});

export const esquemaQuitarDispositivo = esquemaDispositivo.pick({ token: true });

export const esquemaListar = z.object({
  limite: z.coerce.number().int().min(1).max(50).default(20),
  soloNoLeidas: z.enum(['1', 'true']).optional(),
});

export const esquemaIdNotificacion = z.object({ id: z.uuid('La notificación no existe.') });
