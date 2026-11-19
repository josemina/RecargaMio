// Rutas de /dispositivos y /notificaciones. Todas exigen sesión.
import { Router } from 'express';
import { usuarioDe } from '../../middleware/autenticar';
import { esquemaDispositivo, esquemaIdNotificacion, esquemaListar, esquemaQuitarDispositivo } from './esquemas';
import type { ServicioNotificaciones } from './servicio';

export function crearRutasDispositivos(notificaciones: ServicioNotificaciones) {
  const rutas = Router();

  rutas.post('/', async (req, res) => {
    res.status(201).json(await notificaciones.registrarDispositivo(usuarioDe(req).usuarioId, esquemaDispositivo.parse(req.body)));
  });

  rutas.delete('/', async (req, res) => {
    await notificaciones.quitarDispositivo(usuarioDe(req).usuarioId, esquemaQuitarDispositivo.parse(req.body).token);
    res.status(204).end();
  });

  return rutas;
}

export function crearRutasNotificaciones(notificaciones: ServicioNotificaciones) {
  const rutas = Router();

  rutas.get('/', async (req, res) => {
    res.json(await notificaciones.listar(usuarioDe(req).usuarioId, esquemaListar.parse(req.query)));
  });

  rutas.post('/leidas', async (req, res) => {
    res.json(await notificaciones.marcarTodas(usuarioDe(req).usuarioId));
  });

  rutas.post('/:id/leida', async (req, res) => {
    await notificaciones.marcarLeida(usuarioDe(req).usuarioId, esquemaIdNotificacion.parse(req.params).id);
    res.status(204).end();
  });

  return rutas;
}
