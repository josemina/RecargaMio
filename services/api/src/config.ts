// Configuración de la API leída de variables de entorno y validada con zod.
// En T5 se agregan aquí las llaves de Wompi con validación de prefijos de prueba.
import { z } from 'zod';

const llaveHex = /^[0-9a-fA-F]{64}$/;

// Regla 1 de CLAUDE.md: solo se aceptan credenciales de Wompi de prueba.
const PREFIJOS_WOMPI = {
  WOMPI_LLAVE_PUBLICA: 'pub_test_',
  WOMPI_LLAVE_PRIVADA: 'prv_test_',
  WOMPI_SECRETO_EVENTOS: 'test_events_',
  WOMPI_SECRETO_INTEGRIDAD: 'test_integrity_',
} as const;

const esquemaEntorno = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    PORT: z.coerce.number().int().positive().default(3000),
    DATABASE_URL: z.string().min(1, 'Falta DATABASE_URL'),
    NIVEL_REGISTRO: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).default('info'),
    // Llaves del número de tarjeta (ADR 0009): 32 bytes en hexadecimal
    TARJETA_LLAVE_CIFRADO: z.string().regex(llaveHex, 'TARJETA_LLAVE_CIFRADO debe tener 64 caracteres hexadecimales'),
    TARJETA_LLAVE_HMAC: z.string().regex(llaveHex, 'TARJETA_LLAVE_HMAC debe tener 64 caracteres hexadecimales'),
    // Autenticación (T3, ADR 0011)
    JWT_SECRETO_ACCESO: z.string().min(32, 'JWT_SECRETO_ACCESO debe tener al menos 32 caracteres'),
    JWT_SECRETO_RENOVACION: z.string().min(32, 'JWT_SECRETO_RENOVACION debe tener al menos 32 caracteres'),
    // Correo de recuperación (Mailpit en desarrollo)
    SMTP_HOST: z.string().default('localhost'),
    SMTP_PORT: z.coerce.number().int().positive().default(1025),
    CORREO_REMITENTE: z.string().default('RecargaMIO <no-responder@recargamio.test>'),
    // Recaudo simulado (T4): consulta de tarjetas, saldo y viajes
    RECAUDO_URL: z.url('RECAUDO_URL debe ser una URL').default('http://localhost:4000'),
    RECAUDO_API_KEY: z.string().min(16, 'RECAUDO_API_KEY debe tener al menos 16 caracteres'),
    // Pasarela de pagos (T5, ADR 0013): 'simulada' mientras no haya llaves del Sandbox de Wompi
    PASARELA: z.enum(['simulada', 'wompi']).default('simulada'),
    PASARELA_SIMULADA_DEMORA_MS: z.coerce.number().int().min(0).max(60_000).default(4000),
    WOMPI_URL: z.url().default('https://sandbox.wompi.co/v1'),
    WOMPI_LLAVE_PUBLICA: z.string().optional(),
    WOMPI_LLAVE_PRIVADA: z.string().optional(),
    WOMPI_SECRETO_EVENTOS: z.string().default('test_events_simulado_local'),
    WOMPI_SECRETO_INTEGRIDAD: z.string().optional(),
    APP_URL_RETORNO: z.string().default('recargamio://recarga'),
    // Notificaciones push (T6, D7): ruta al JSON de la cuenta de servicio de Firebase. Si no existe, no hay FCM.
    FIREBASE_CREDENCIALES_JSON: z.string().optional(),
    // Orígenes web a los que se permite CORS, separados por comas (T8, hallazgo 10098 de ZAP).
    // Vacío por defecto: la app nativa no necesita CORS, y así ningún sitio web puede llamar la API desde un navegador.
    CORS_ORIGENES: z
      .string()
      .default('')
      .transform((v) => v.split(',').map((o) => o.trim()).filter(Boolean))
      .pipe(z.array(z.url('Cada valor de CORS_ORIGENES debe ser una URL, por ejemplo http://localhost:8081'))),
    // Límite de peticiones por IP (T8, ADR 0016): las pruebas de carga y de seguridad salen de una sola IP.
    // 'desactivados' solo se acepta fuera de producción.
    LIMITES_PETICIONES: z.enum(['normal', 'desactivados']).default('normal'),
    INTERVALO_ALERTAS_MS: z.coerce.number().int().min(10_000).default(5 * 60 * 1000),
    // Dirección pública de la API, usada en el enlace del correo de recuperación
    API_URL_PUBLICA: z.url('API_URL_PUBLICA debe ser una URL').default('http://localhost:3000'),
  })
  .refine((c) => c.JWT_SECRETO_ACCESO !== c.JWT_SECRETO_RENOVACION, {
    message: 'JWT_SECRETO_ACCESO y JWT_SECRETO_RENOVACION deben ser distintos',
    path: ['JWT_SECRETO_RENOVACION'],
  })
  .refine((c) => !(c.NODE_ENV === 'production' && c.LIMITES_PETICIONES === 'desactivados'), {
    message: 'en producción los límites de peticiones no se pueden desactivar',
    path: ['LIMITES_PETICIONES'],
  })
  .superRefine((c, ctx) => {
    for (const [variable, prefijo] of Object.entries(PREFIJOS_WOMPI)) {
      const valor = c[variable as keyof typeof PREFIJOS_WOMPI];
      if (valor && !valor.startsWith(prefijo)) {
        ctx.addIssue({
          code: 'custom',
          path: [variable],
          message: `debe empezar por ${prefijo}. Solo se aceptan credenciales de prueba de Wompi: detente y avisa al equipo`,
        });
      }
      const marcador = !valor || valor.endsWith('_xxx');
      if (c.PASARELA === 'wompi' && marcador) {
        ctx.addIssue({ code: 'custom', path: [variable], message: 'falta: con PASARELA=wompi se necesitan las cuatro llaves del Sandbox' });
      }
    }
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
