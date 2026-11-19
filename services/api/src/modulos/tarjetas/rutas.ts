// Rutas de tarjetas (HU-07), movimientos (HU-03) y alerta de saldo bajo (HU-05). Todas exigen sesión.
import { Router } from 'express';
import { usuarioDe } from '../../middleware/autenticar';
import { esquemaAlerta } from '../alertas/esquemas';
import type { ServicioAlertas } from '../alertas/servicio';
import { esquemaAgregar, esquemaId, esquemaMovimientos, esquemaRenombrar } from './esquemas';
import type { ServicioTarjetas } from './servicio';

export function crearRutasTarjetas(tarjetas: ServicioTarjetas, alertas: ServicioAlertas) {
  const rutas = Router();

  rutas.get('/', async (req, res) => {
    res.json(await tarjetas.listar(usuarioDe(req).usuarioId));
  });

  rutas.post('/', async (req, res) => {
    res.status(201).json(await tarjetas.agregar(usuarioDe(req).usuarioId, esquemaAgregar.parse(req.body), req.ip));
  });

  rutas.get('/:id', async (req, res) => {
    res.json(await tarjetas.detalle(usuarioDe(req).usuarioId, esquemaId.parse(req.params).id));
  });

  rutas.patch('/:id', async (req, res) => {
    const { alias } = esquemaRenombrar.parse(req.body);
    res.json(await tarjetas.renombrar(usuarioDe(req).usuarioId, esquemaId.parse(req.params).id, alias, req.ip));
  });

  rutas.delete('/:id', async (req, res) => {
    await tarjetas.eliminar(usuarioDe(req).usuarioId, esquemaId.parse(req.params).id, req.ip);
    res.status(204).end();
  });

  rutas.get('/:id/movimientos', async (req, res) => {
    const { id } = esquemaId.parse(req.params);
    res.json(await tarjetas.movimientos(usuarioDe(req).usuarioId, id, esquemaMovimientos.parse(req.query)));
  });

  // HU-05 CA-1 y CA-4: valor de la alerta de saldo bajo, o desactivarla (pantalla 4.2)
  rutas.put('/:id/alerta', async (req, res) => {
    const { id } = esquemaId.parse(req.params);
    res.json(await alertas.configurar(usuarioDe(req).usuarioId, id, esquemaAlerta.parse(req.body), req.ip));
  });

  return rutas;
}
