// Rutas de recargas (exigen sesión), del webhook de la pasarela y de la pasarela simulada.
import express, { Router } from 'express';
import type { Logger } from 'pino';
import type { PrismaClient } from '@prisma/client';
import { registrarAuditoria } from '../../auditoria';
import { verificarEvento } from '../../integraciones/pasarela/firmas';
import type { Pasarela } from '../../integraciones/pasarela/tipos';
import { usuarioDe } from '../../middleware/autenticar';
import { enviarHtml } from '../../seguridad/html';
import { escaparHtml } from '../auth/servicio';
import { esquemaConsulta, esquemaIdRecarga, esquemaRecarga } from './esquemas';
import type { ServicioRecargas } from './servicio';

export function crearRutasRecargas(recargas: ServicioRecargas) {
  const rutas = Router();

  rutas.post('/', async (req, res) => {
    res.status(201).json(await recargas.crear(usuarioDe(req).usuarioId, esquemaRecarga.parse(req.body), req.ip));
  });

  rutas.get('/:id', async (req, res) => {
    const { id } = esquemaIdRecarga.parse(req.params);
    const { actualizar } = esquemaConsulta.parse(req.query);
    res.json(await recargas.obtener(usuarioDe(req).usuarioId, id, Boolean(actualizar)));
  });

  return rutas;
}

/** Bancos de PSE y términos de la pasarela, para la pantalla 3.1. */
export function crearRutasPasarela(pasarela: Pasarela) {
  const rutas = Router();
  rutas.get('/bancos', async (_req, res) => {
    res.json({ bancos: await pasarela.bancosPse() });
  });
  rutas.get('/terminos', async (_req, res) => {
    res.json({ pasarela: pasarela.nombre, ...(await pasarela.terminos()) });
  });
  return rutas;
}

/**
 * Webhook de la pasarela (regla 4): primero se verifica el checksum; si falla, 401.
 * Se monta antes de express.json para recibir el cuerpo tal como llegó.
 */
export function crearRutaWebhook({ prisma, recargas, secretoEventos, logger }: { prisma: PrismaClient; recargas: ServicioRecargas; secretoEventos: string; logger: Logger }) {
  const rutas = Router();
  rutas.post('/wompi', express.raw({ type: '*/*', limit: '50kb' }), async (req, res) => {
    let evento: unknown;
    try {
      evento = JSON.parse(Buffer.isBuffer(req.body) ? req.body.toString('utf8') : '');
    } catch {
      res.status(400).json({ error: { codigo: 'EVENTO_INVALIDO', mensaje: 'El cuerpo no es un JSON válido.' } });
      return;
    }
    if (!verificarEvento(evento, req.header('x-event-checksum'), secretoEventos)) {
      logger.warn({ ip: req.ip }, 'Webhook con checksum inválido: rechazado');
      await registrarAuditoria(prisma, 'WEBHOOK_RECHAZADO', null, { ip: req.ip ?? null });
      res.status(401).json({ error: { codigo: 'FIRMA_INVALIDA', mensaje: 'La firma del evento no es válida.' } });
      return;
    }
    if (evento.event !== 'transaction.updated' || evento.environment !== 'test') {
      // Solo se procesan eventos de transacciones del entorno de pruebas (regla 1)
      res.status(200).json({ recibido: true, procesado: false });
      return;
    }
    const t = evento.data.transaction;
    const recarga = await prisma.recarga.findUnique({ where: { referenciaPasarela: t.reference } });
    if (!recarga) {
      logger.warn({ referencia: t.reference }, 'Evento de una referencia desconocida');
      res.status(200).json({ recibido: true, procesado: false });
      return;
    }
    await recargas.procesarTransaccion(
      recarga,
      { id: t.id, referencia: t.reference, estado: t.status, montoCentavos: t.amount_in_cents, motivo: t.status_message ?? null },
      'webhook',
      evento,
    );
    res.status(200).json({ recibido: true, procesado: true });
  });
  return rutas;
}

/** Páginas del «banco» de la pasarela simulada (solo con PASARELA=simulada). */
export function crearRutasPasarelaSimulada() {
  const rutas = Router();
  const pagina = (titulo: string, cuerpo: string) => `<!doctype html><html lang="es-CO"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1"><title>${titulo} · Pasarela simulada</title>
<style>body{margin:0;background:#F4F6FA;color:#1B1F2A;font:16px/1.5 -apple-system,"Segoe UI",Roboto,sans-serif}
main{max-width:390px;margin:0 auto;padding:32px 24px}.aviso{background:#FFF3D6;color:#7A4B00;border-radius:12px;padding:12px 16px}
h1{font-size:22px}</style></head><body><main><p class="aviso">Pasarela simulada · modo de pruebas · no se mueve dinero real</p>
<h1>${titulo}</h1>${cuerpo}</main></body></html>`;

  rutas.get('/banco/:id', (req, res) => {
    enviarHtml(
      res,
      pagina(
        'Banco de pruebas',
        `<p>Estás autorizando el pago de tu recarga en la página de tu banco (transacción <code>${escaparHtml(req.params.id)}</code>).</p>
<p>En unos segundos el banco confirmará el resultado. Puedes volver a la app RecargaMIO.</p>`,
      ),
    );
  });
  rutas.get('/terminos', (_req, res) => {
    enviarHtml(res, pagina('Términos de la pasarela', '<p>Texto de ejemplo de los términos y condiciones de la pasarela de pagos (simulada).</p>'));
  });
  rutas.get('/datos-personales', (_req, res) => {
    enviarHtml(res, pagina('Autorización de datos de la pasarela', '<p>Texto de ejemplo de la autorización de tratamiento de datos de la pasarela (simulada).</p>'));
  });
  return rutas;
}
