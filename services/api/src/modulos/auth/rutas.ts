// Rutas de autenticación (HU-06) y página web de restablecimiento.
import express, { Router } from 'express';
import { ZodError } from 'zod';
import type { crearLimites } from '../../middleware/limites';
import {
  esquemaFormularioRestablecer, esquemaIngreso, esquemaRecuperar, esquemaRegistro, esquemaRestablecer, esquemaTokenRenovacion,
} from './esquemas';
import { paginaRestablecer } from './paginaRestablecer';
import type { ServicioAuth } from './servicio';
import { ErrorApi } from '../../middleware/errores';
import { enviarHtml } from '../../seguridad/html';

const MENSAJE_RECUPERACION = 'Si el correo está registrado, recibirás un enlace válido por 30 minutos.';

export function crearRutasAuth(auth: ServicioAuth, limites: ReturnType<typeof crearLimites>) {
  const rutas = Router();
  const contexto = (req: express.Request) => ({ ip: req.ip });

  rutas.post('/registro', limites.registro, async (req, res) => {
    const datos = esquemaRegistro.parse(req.body);
    res.status(201).json(await auth.registrar(datos, contexto(req)));
  });

  rutas.post('/ingreso', limites.ingreso, async (req, res) => {
    res.json(await auth.ingresar(esquemaIngreso.parse(req.body), contexto(req)));
  });

  rutas.post('/renovar', limites.ingreso, async (req, res) => {
    const { tokenRenovacion } = esquemaTokenRenovacion.parse(req.body);
    res.json(await auth.renovar(tokenRenovacion, contexto(req)));
  });

  rutas.post('/salir', async (req, res) => {
    const { tokenRenovacion } = esquemaTokenRenovacion.parse(req.body);
    await auth.salir(tokenRenovacion, contexto(req));
    res.status(204).end();
  });

  rutas.post('/recuperar', limites.recuperacion, async (req, res) => {
    const { correo } = esquemaRecuperar.parse(req.body);
    await auth.solicitarRecuperacion(correo, contexto(req));
    res.json({ mensaje: MENSAJE_RECUPERACION });
  });

  rutas.post('/restablecer', limites.recuperacion, async (req, res) => {
    await auth.restablecer(esquemaRestablecer.parse(req.body), contexto(req));
    res.json({ mensaje: 'Tu contraseña se cambió. Ya puedes ingresar con la nueva contraseña.' });
  });

  return rutas;
}

/** Página web del enlace del correo: GET muestra el formulario y POST lo procesa. */
export function crearRutasPaginaRestablecer(auth: ServicioAuth, limites: ReturnType<typeof crearLimites>) {
  const rutas = Router();
  const html = (res: express.Response, estado: number, contenido: string) =>
    enviarHtml(res.set('Cache-Control', 'no-store').set('Referrer-Policy', 'no-referrer'), contenido, estado);

  rutas.get('/restablecer', (req, res) => {
    const token = typeof req.query.token === 'string' ? req.query.token : '';
    html(res, 200, paginaRestablecer({ token }));
  });

  rutas.post('/restablecer', limites.recuperacion, express.urlencoded({ extended: false, limit: '5kb' }), async (req, res) => {
    const token = typeof req.body?.token === 'string' ? req.body.token : '';
    try {
      const datos = esquemaFormularioRestablecer.parse(req.body);
      await auth.restablecer(datos, { ip: req.ip });
      html(res, 200, paginaRestablecer({ exito: true }));
    } catch (error) {
      if (error instanceof ZodError) return html(res, 400, paginaRestablecer({ token, error: error.issues[0]?.message }));
      if (error instanceof ErrorApi) return html(res, error.estadoHttp, paginaRestablecer({ token, error: error.message }));
      throw error;
    }
  });

  return rutas;
}
