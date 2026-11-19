// Aplicación Express del simulador de recaudo (sección 8 del plan).
import express from 'express';
import helmet from 'helmet';
import { pinoHttp } from 'pino-http';
import type { Logger } from 'pino';
import { z } from 'zod';
import type { PrismaClient } from '../generated/prisma';
import { exigirApiKey } from './autenticacion';
import { manejadorErrores, rutaNoEncontrada } from './errores';
import { aplicarSemilla } from './semilla';
import { crearServicioRecaudo } from './servicio';
import { crearSimulador } from './simulacion';

export interface DependenciasApp {
  logger: Logger;
  prisma: PrismaClient;
  apiKey: string;
  /** Avisa a la API de RecargaMIO que hubo un viaje, para revisar las alertas de saldo bajo (ADR 0014). */
  avisarViaje?: (numero: string) => Promise<void>;
  /** Fuente de aleatoriedad para las fallas simuladas (inyectable en pruebas). */
  aleatorio?: () => number;
}

const numeroTarjeta = z.string().regex(/^\d{10}$/, 'El número de la tarjeta MIO debe tener 10 dígitos.');
const esquemaParametros = z.object({ numero: numeroTarjeta });
const esquemaCredito = z.object({
  monto: z.number().int('El monto debe ser un número entero de pesos.').positive().max(1_000_000),
  referencia: z.string().trim().min(1).max(64),
});
const esquemaViajes = z.object({
  desde: z.coerce.date().optional(),
  hasta: z.coerce.date().optional(),
  limite: z.coerce.number().int().min(1).max(100).default(50),
});
const esquemaViaje = z.object({
  numero: numeroTarjeta,
  ruta: z.string().trim().min(1).max(10).default('E21'),
});
const esquemaLatencia = z.object({
  demoraMs: z.number().int().min(0).max(10_000),
  tasaFallos: z.number().min(0).max(1),
});

export function crearApp({ logger, prisma, apiKey, avisarViaje, aleatorio }: DependenciasApp) {
  const app = express();
  const servicio = crearServicioRecaudo(prisma);
  const simulador = crearSimulador(aleatorio);

  app.disable('x-powered-by');
  app.use(helmet());
  app.use(express.json({ limit: '50kb' }));
  // Solo método y URL de cada petición: los encabezados traen la llave X-Api-Key de la API, que nunca se registra
  // (lo encontró la revisión de registros de T11, MASVS-STORAGE, ADR 0019).
  app.use(pinoHttp({ logger, serializers: { req: (req) => ({ id: req.id, method: req.method, url: req.url }) } }));

  app.get('/health', async (_req, res) => {
    const baseOk = await prisma.$queryRaw`SELECT 1`.then(() => true).catch(() => false);
    res.status(baseOk ? 200 : 503).json({
      estado: baseOk ? 'ok' : 'degradado',
      servicio: 'recaudo-sim',
      baseDatos: baseOk ? 'ok' : 'sin conexión',
    });
  });

  // Todo lo demás exige la llave compartida con la API.
  app.use(exigirApiKey(apiKey));

  app.get('/tarjetas/:numero', async (req, res) => {
    const { numero } = esquemaParametros.parse(req.params);
    const { activa, saldo } = await servicio.buscarTarjeta(numero);
    res.json({ numero, existe: true, activa, saldo });
  });

  app.post('/tarjetas/:numero/creditos', async (req, res) => {
    const { numero } = esquemaParametros.parse(req.params);
    const { monto, referencia } = esquemaCredito.parse(req.body);
    await simulador.aplicar();
    const resultado = await servicio.acreditar(numero, monto, referencia);
    res.status(resultado.duplicado ? 200 : 201).json(resultado);
  });

  app.get('/tarjetas/:numero/viajes', async (req, res) => {
    const { numero } = esquemaParametros.parse(req.params);
    const { desde, hasta, limite } = esquemaViajes.parse(req.query);
    res.json(await servicio.listarViajes(numero, { desde, hasta }, limite));
  });

  app.post('/simulacion/viaje', async (req, res) => {
    const { numero, ruta } = esquemaViaje.parse(req.body);
    const viaje = await servicio.registrarViaje(numero, ruta);
    res.status(201).json(viaje);
    // Después de responder y sin esperar: si la API no está disponible, la revisión de cada 5 minutos lo cubre
    avisarViaje?.(numero).catch((err) => logger.warn({ err }, 'No se pudo avisar el viaje a la API'));
  });

  app.post('/simulacion/latencia', (req, res) => {
    res.json(simulador.fijar(esquemaLatencia.parse(req.body)));
  });

  app.post('/simulacion/reiniciar', async (_req, res) => {
    simulador.reiniciar();
    const resumen = await aplicarSemilla(prisma, { reiniciar: true });
    res.json({ reiniciado: true, ...resumen, condiciones: simulador.obtener() });
  });

  app.use(rutaNoEncontrada);
  app.use(manejadorErrores);

  return app;
}
