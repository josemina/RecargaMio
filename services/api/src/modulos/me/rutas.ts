// Perfil y privacidad del usuario autenticado: pantallas 5.1 y 5.2 (T7, ADR 0015).
import { Router } from 'express';
import { usuarioDe } from '../../middleware/autenticar';
import { esquemaActualizar, esquemaEliminar } from './esquemas';
import type { ServicioMe } from './servicio';

export function crearRutasMe(me: ServicioMe) {
  const rutas = Router();

  rutas.get('/', async (req, res) => {
    res.json(await me.perfil(usuarioDe(req).usuarioId));
  });

  // «Actualizar o rectificar mis datos»
  rutas.patch('/', async (req, res) => {
    res.json(await me.actualizar(usuarioDe(req).usuarioId, esquemaActualizar.parse(req.body), req.ip));
  });

  // «Eliminar mi cuenta»: la contraseña va en el cuerpo
  rutas.delete('/', async (req, res) => {
    const { contrasena } = esquemaEliminar.parse(req.body);
    res.json({ eliminada: true, ...(await me.eliminar(usuarioDe(req).usuarioId, contrasena, req.ip)) });
  });

  return rutas;
}
