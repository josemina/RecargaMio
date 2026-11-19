// Cliente HTTP del recaudo contra un servidor falso: llave, errores, formato inesperado y tiempo máximo.
import type { AddressInfo } from 'node:net';
import type { Server } from 'node:http';
import express from 'express';
import pino from 'pino';
import { crearClienteRecaudoHttp } from '../src/integraciones/recaudo';

let servidor: Server;
let url = '';
const llavesRecibidas: (string | undefined)[] = [];

beforeAll(async () => {
  const app = express();
  app.use((req, _res, next) => {
    llavesRecibidas.push(req.header('x-api-key'));
    next();
  });
  app.get('/tarjetas/1234564821', (_req, res) => res.json({ numero: '1234564821', existe: true, activa: true, saldo: 12400 }));
  app.get('/tarjetas/1234564821/viajes', (req, res) =>
    res.json({ numero: '1234564821', viajes: [{ id: 'v1', ruta: 'E21', valor: 3500, fecha: '2026-10-24T06:52:00.000Z', hasta: req.query.hasta }] }),
  );
  app.get('/tarjetas/5555555555', (_req, res) => res.status(404).json({ error: { codigo: 'TARJETA_NO_EXISTE' } }));
  app.get('/tarjetas/1111111111', (_req, res) => res.status(500).send('falla'));
  app.get('/tarjetas/2222222222', (_req, res) => res.json({ saldo: 'mucho' }));
  app.get('/tarjetas/3333333333', (_req, res) => setTimeout(() => res.json({ activa: true, saldo: 1 }), 500));
  servidor = app.listen(0);
  url = `http://127.0.0.1:${(servidor.address() as AddressInfo).port}`;
});
afterAll(() => servidor.close());

const cliente = () => crearClienteRecaudoHttp({ url, apiKey: 'llave-secreta-de-prueba', logger: pino({ level: 'silent' }), tiempoMaximoMs: 200 });

describe('Cliente HTTP del recaudo', () => {
  it('consulta la tarjeta enviando la llave X-Api-Key', async () => {
    expect(await cliente().consultarTarjeta('1234564821')).toEqual({ numero: '1234564821', activa: true, saldo: 12400 });
    expect(llavesRecibidas.at(-1)).toBe('llave-secreta-de-prueba');
  });

  it('lista viajes y convierte las fechas', async () => {
    const [viaje] = await cliente().listarViajes('1234564821', { limite: 10 });
    expect(viaje.fecha).toEqual(new Date('2026-10-24T06:52:00.000Z'));
  });

  it.each([
    ['404 del recaudo', '5555555555', 'TARJETA_NO_EXISTE'],
    ['500 del recaudo', '1111111111', 'RECAUDO_NO_DISPONIBLE'],
    ['formato inesperado', '2222222222', 'RECAUDO_NO_DISPONIBLE'],
    ['respuesta que tarda más del tiempo máximo', '3333333333', 'RECAUDO_NO_DISPONIBLE'],
  ])('traduce %s', async (_caso, numero, codigo) => {
    await expect(cliente().consultarTarjeta(numero)).rejects.toMatchObject({ codigo });
  });

  it('si el recaudo está apagado responde RECAUDO_NO_DISPONIBLE', async () => {
    const apagado = crearClienteRecaudoHttp({ url: 'http://127.0.0.1:1', apiKey: 'x'.repeat(16), logger: pino({ level: 'silent' }) });
    await expect(apagado.consultarTarjeta('1234564821')).rejects.toMatchObject({ codigo: 'RECAUDO_NO_DISPONIBLE' });
  });
});
