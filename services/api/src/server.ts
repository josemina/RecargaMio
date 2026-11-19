// Punto de entrada de la API.
import { existsSync } from 'node:fs';
import { PrismaClient } from '@prisma/client';
import pino from 'pino';
import { crearApp } from './app';
import { cargarConfiguracion } from './config';
import { crearCorreoSmtp } from './integraciones/correo';
import { crearPasarelaSimulada } from './integraciones/pasarela/simulada';
import type { Pasarela } from './integraciones/pasarela/tipos';
import { crearPasarelaWompi } from './integraciones/pasarela/wompi';
import { crearPushFcm, crearPushNinguno, type EnviadorPush } from './integraciones/push';
import { crearClienteRecaudoHttp } from './integraciones/recaudo';

const INTERVALO_RECONCILIACION_MS = 30 * 1000; // decisión D8

const config = cargarConfiguracion();
const logger = pino({ level: config.NIVEL_REGISTRO });
const prisma = new PrismaClient();
const correo = crearCorreoSmtp({ host: config.SMTP_HOST, puerto: config.SMTP_PORT, remitente: config.CORREO_REMITENTE });
const recaudo = crearClienteRecaudoHttp({ url: config.RECAUDO_URL, apiKey: config.RECAUDO_API_KEY, logger });

const pasarela: Pasarela =
  config.PASARELA === 'wompi'
    ? crearPasarelaWompi({
        url: config.WOMPI_URL,
        llavePublica: config.WOMPI_LLAVE_PUBLICA!,
        llavePrivada: config.WOMPI_LLAVE_PRIVADA!,
        secretoIntegridad: config.WOMPI_SECRETO_INTEGRIDAD!,
        logger,
      })
    : crearPasarelaSimulada({
        secretoEventos: config.WOMPI_SECRETO_EVENTOS,
        urlPublica: config.API_URL_PUBLICA,
        demoraMs: config.PASARELA_SIMULADA_DEMORA_MS,
        // Igual que Wompi: el resultado llega al webhook con su checksum
        enviarEvento: async (evento) => {
          await fetch(`http://localhost:${config.PORT}/webhooks/wompi`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'X-Event-Checksum': evento.signature.checksum },
            body: JSON.stringify(evento),
          });
        },
      });

// FCM solo si existe el archivo de la cuenta de servicio (ADR 0007): sin él, los avisos quedan en la bandeja de la app
async function crearPush(): Promise<EnviadorPush> {
  const ruta = config.FIREBASE_CREDENCIALES_JSON;
  if (!ruta || !existsSync(ruta)) {
    logger.info('FCM no está configurado: los avisos se guardan solo en la bandeja de la app');
    return crearPushNinguno();
  }
  try {
    return await crearPushFcm({ rutaCredenciales: ruta, logger });
  } catch (err) {
    logger.error({ err }, 'No se pudo iniciar FCM; los avisos se guardan solo en la bandeja de la app');
    return crearPushNinguno();
  }
}

// FCM carga en segundo plano (CommonJS no permite await en el nivel superior); mientras tanto no se envía al teléfono
let enviador: EnviadorPush = crearPushNinguno();
void crearPush().then((listo) => (enviador = listo));
const push: EnviadorPush = {
  get nombre() {
    return enviador.nombre;
  },
  enviar: (tokens, mensaje) => enviador.enviar(tokens, mensaje),
};
const limitarPeticiones = config.LIMITES_PETICIONES === 'normal';
if (!limitarPeticiones) logger.warn('Límites de peticiones DESACTIVADOS para las pruebas (ADR 0016). No usar así en una demostración.');
const app = crearApp({ logger, prisma, config, correo, recaudo, pasarela, push, limitarPeticiones });

const servidor = app.listen(config.PORT, () => {
  logger.info({ puerto: config.PORT, pasarela: pasarela.nombre }, 'API de RecargaMIO escuchando');
});

// Reconciliación cada 30 s: confirma pagos aunque el webhook no llegue y reintenta acreditaciones fallidas
let reconciliando = false;
const reconciliacion = setInterval(async () => {
  if (reconciliando) return;
  reconciliando = true;
  try {
    const resumen = await app.recargas.reconciliar();
    if (resumen.consultadas || resumen.reintentosAcreditacion) logger.info(resumen, 'Reconciliación de recargas');
  } catch (err) {
    logger.error({ err }, 'Falló la reconciliación de recargas');
  } finally {
    reconciliando = false;
  }
}, INTERVALO_RECONCILIACION_MS);
reconciliacion.unref();

// Revisión de alertas de saldo bajo cada 5 minutos (HU-05). Los viajes la disparan antes por /internos/recaudo/viajes.
let revisandoAlertas = false;
const revisionAlertas = setInterval(async () => {
  if (revisandoAlertas) return;
  revisandoAlertas = true;
  try {
    const resumen = await app.alertas.revisarTodas();
    if (resumen.avisos || resumen.sinSaldo) logger.info(resumen, 'Revisión de alertas de saldo bajo');
  } catch (err) {
    logger.error({ err }, 'Falló la revisión de alertas');
  } finally {
    revisandoAlertas = false;
  }
}, config.INTERVALO_ALERTAS_MS);
revisionAlertas.unref();

async function apagar(senal: string) {
  logger.info({ senal }, 'Apagando la API');
  clearInterval(reconciliacion);
  clearInterval(revisionAlertas);
  servidor.close();
  await prisma.$disconnect();
  process.exit(0);
}

process.on('SIGTERM', () => void apagar('SIGTERM'));
process.on('SIGINT', () => void apagar('SIGINT'));
