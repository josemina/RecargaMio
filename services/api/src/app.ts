// Construcción de la aplicación Express. Las dependencias se inyectan para poder probarla
// (base de pruebas, correo en memoria y reloj controlable).
import type { PrismaClient } from '@prisma/client';
import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import { pinoHttp } from 'pino-http';
import type { Logger } from 'pino';
import type { Configuracion } from './config';
import type { Correo } from './integraciones/correo';
import type { Pasarela } from './integraciones/pasarela/tipos';
import { crearPushNinguno, type EnviadorPush } from './integraciones/push';
import type { ClienteRecaudo } from './integraciones/recaudo';
import { crearAutenticar } from './middleware/autenticar';
import { manejadorErrores, rutaNoEncontrada } from './middleware/errores';
import { crearLimites } from './middleware/limites';
import { crearRutasInternas } from './modulos/alertas/rutas';
import { crearServicioAlertas, type ServicioAlertas } from './modulos/alertas/servicio';
import { crearRutasAuth, crearRutasPaginaRestablecer } from './modulos/auth/rutas';
import { crearServicioAuth } from './modulos/auth/servicio';
import { crearRutasDocs } from './modulos/docs/rutas';
import { crearRutasMe } from './modulos/me/rutas';
import { crearServicioMe } from './modulos/me/servicio';
import { crearRutasDispositivos, crearRutasNotificaciones } from './modulos/notificaciones/rutas';
import { crearServicioNotificaciones } from './modulos/notificaciones/servicio';
import { crearRutasPasarela, crearRutasPasarelaSimulada, crearRutasRecargas, crearRutaWebhook } from './modulos/recargas/rutas';
import { crearServicioRecargas, type ServicioRecargas } from './modulos/recargas/servicio';
import { crearRutasTarjetas } from './modulos/tarjetas/rutas';
import { crearServicioTarjetas } from './modulos/tarjetas/servicio';
import { crearCifradorTarjeta } from './seguridad/cifradoTarjeta';
import { crearServicioTokens } from './seguridad/tokens';

export interface DependenciasApp {
  logger: Logger;
  prisma: PrismaClient;
  config: Configuracion;
  correo: Correo;
  recaudo: ClienteRecaudo;
  pasarela: Pasarela;
  /** Envío de avisos al teléfono (FCM). Sin él, los avisos solo quedan en la bandeja de la app. */
  push?: EnviadorPush;
  /** Reloj de la aplicación; en pruebas se adelanta para simular vencimientos. */
  ahora?: () => Date;
  /** Límite de peticiones por IP. Se desactiva en la mayoría de pruebas. */
  limitarPeticiones?: boolean;
  /** Permite simular una caída de la base en las pruebas de /health. */
  verificarBase?: () => Promise<boolean>;
}

export function crearApp({ logger, prisma, config, correo, recaudo, pasarela, push = crearPushNinguno(), ahora = () => new Date(), limitarPeticiones = true, verificarBase }: DependenciasApp) {
  const app = express();
  const tokens = crearServicioTokens(config.JWT_SECRETO_ACCESO, config.JWT_SECRETO_RENOVACION, ahora);
  const auth = crearServicioAuth({ prisma, tokens, correo, logger, ahora, apiUrlPublica: config.API_URL_PUBLICA });
  const cifrador = crearCifradorTarjeta({ llaveCifrado: config.TARJETA_LLAVE_CIFRADO, llaveHmac: config.TARJETA_LLAVE_HMAC });
  const tarjetas = crearServicioTarjetas({ prisma, recaudo, cifrador, logger });
  const me = crearServicioMe({ prisma, correo, logger, ahora });
  const notificaciones = crearServicioNotificaciones({ prisma, push, logger, ahora });
  const alertas = crearServicioAlertas({ prisma, recaudo, cifrador, tarjetas, notificaciones, logger, ahora });
  const recargas = crearServicioRecargas({ prisma, pasarela, recaudo, cifrador, tarjetas, notificaciones, logger, ahora, urlRetorno: config.APP_URL_RETORNO });
  const limites = crearLimites(limitarPeticiones);
  const autenticar = crearAutenticar(prisma, tokens, ahora);
  const baseDisponible = verificarBase ?? (() => prisma.$queryRaw`SELECT 1`.then(() => true));

  app.disable('x-powered-by');
  // Encabezados de seguridad (T8, hallazgos de ZAP, ADR 0016). La API responde JSON: no carga nada, no se enmarca
  // y no recibe formularios. Las páginas HTML y /docs ponen su propia política.
  app.use(
    helmet({
      contentSecurityPolicy: {
        useDefaults: false,
        directives: { defaultSrc: ["'none'"], frameAncestors: ["'none'"], baseUri: ["'none'"], formAction: ["'none'"] },
      },
      crossOriginEmbedderPolicy: true,
    }),
  );
  app.use((_req, res, next) => {
    res.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=(), usb=()');
    next();
  });
  // CORS solo para los orígenes configurados: la app nativa no lo necesita (hallazgo 10098 de ZAP)
  if (config.CORS_ORIGENES.length > 0) app.use(cors({ origin: config.CORS_ORIGENES }));
  app.use(
    pinoHttp({
      logger,
      // Nunca registrar tokens: se ocultan los encabezados de autorización y la URL con el token de recuperación.
      redact: ['req.headers.authorization', 'req.headers.cookie'],
      serializers: { req: (req) => ({ id: req.id, method: req.method, url: String(req.url).replace(/token=[^&]+/, 'token=[OCULTO]') }) },
    }),
  );

  // El webhook va antes de express.json: necesita el cuerpo tal como llegó para verificar la firma (regla 4)
  app.use('/webhooks', crearRutaWebhook({ prisma, recargas, secretoEventos: config.WOMPI_SECRETO_EVENTOS, logger }));
  app.use(express.json({ limit: '100kb' }));

  app.get('/health', async (_req, res) => {
    const baseOk = await baseDisponible().catch(() => false);
    res.status(baseOk ? 200 : 503).json({
      estado: baseOk ? 'ok' : 'degradado',
      servicio: 'api',
      baseDatos: baseOk ? 'ok' : 'sin conexión',
    });
  });

  // Contrato OpenAPI y Swagger UI (T8): solo fuera de producción
  if (config.NODE_ENV !== 'production') app.use('/docs', crearRutasDocs());

  // Aviso del recaudo después de cada viaje: servicio a servicio, por eso va antes del límite por IP
  app.use('/internos', crearRutasInternas({ alertas, apiKey: config.RECAUDO_API_KEY }));

  app.use(limites.general);
  app.use('/auth', crearRutasAuth(auth, limites));
  app.use(crearRutasPaginaRestablecer(auth, limites));
  app.use('/me', autenticar, crearRutasMe(me));
  app.use('/tarjetas', autenticar, crearRutasTarjetas(tarjetas, alertas));
  app.use('/dispositivos', autenticar, crearRutasDispositivos(notificaciones));
  app.use('/notificaciones', autenticar, crearRutasNotificaciones(notificaciones));
  app.use('/recargas', autenticar, crearRutasRecargas(recargas));
  app.use('/pasarela', autenticar, crearRutasPasarela(pasarela));
  if (pasarela.nombre === 'simulada') app.use('/pasarela-simulada', crearRutasPasarelaSimulada());

  app.use(rutaNoEncontrada);
  app.use(manejadorErrores);

  return Object.assign(app, { recargas, alertas });
}

export type AppRecargaMIO = ReturnType<typeof crearApp> & { recargas: ServicioRecargas; alertas: ServicioAlertas };
