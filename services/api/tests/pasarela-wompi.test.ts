// Cliente de Wompi contra un servidor falso con el contrato documentado (docs.wompi.co).
// La prueba contra el Sandbox real se hace en T5b, cuando el equipo tenga las llaves.
import type { Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import express from 'express';
import pino from 'pino';
import { firmaIntegridad } from '../src/integraciones/pasarela/firmas';
import { crearPasarelaWompi } from '../src/integraciones/pasarela/wompi';

const LLAVES = { llavePublica: 'pub_test_publica', llavePrivada: 'prv_test_privada', secretoIntegridad: 'test_integrity_secreto' };
let servidor: Server;
let url = '';
const recibido: { ruta: string; auth?: string; publica?: string; cuerpo?: Record<string, unknown> }[] = [];
let consultasPse = 0;
let fallar = false;

beforeAll(() => {
  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => {
    recibido.push({ ruta: `${req.method} ${req.path}`, auth: req.header('authorization'), publica: req.header('x-merchant-public-key'), cuerpo: req.body });
    next();
  });
  app.get('/v1/merchants/info', (_req, res) =>
    res.json({
      data: {
        presigned_acceptance: { acceptance_token: 'tok-aceptacion', permalink: 'https://wompi.co/terminos.pdf', type: 'END_USER_POLICY' },
        presigned_personal_data_auth: { acceptance_token: 'tok-datos', permalink: 'https://wompi.co/datos.pdf', type: 'PERSONAL_DATA_AUTH' },
      },
    }),
  );
  app.post('/v1/transactions', (req, res) => {
    if (fallar) return res.status(422).json({ error: { type: 'INPUT_VALIDATION_ERROR' } });
    res.status(201).json({ data: { id: `tx-${req.body.payment_method.type}`, reference: req.body.reference, status: 'PENDING', amount_in_cents: req.body.amount_in_cents, status_message: null, payment_method: { type: req.body.payment_method.type, extra: {} } } });
  });
  app.get('/v1/transactions/:id', (req, res) => {
    consultasPse += 1;
    const conUrl = consultasPse >= 2;
    res.json({ data: { id: req.params.id, reference: 'RM-000001-AB12', status: 'PENDING', amount_in_cents: 2000000, payment_method: { extra: conUrl ? { async_payment_url: 'https://banco.ejemplo/pagar' } : {} } } });
  });
  app.get('/v1/pse/financial_institutions', (_req, res) =>
    res.json({ data: [{ financial_institution_code: '1', financial_institution_name: 'Banco que aprueba' }, { financial_institution_code: '2', financial_institution_name: 'Banco que rechaza' }] }),
  );
  servidor = app.listen(0);
  url = `http://127.0.0.1:${(servidor.address() as AddressInfo).port}/v1`;
});
afterAll(() => servidor.close());
beforeEach(() => {
  recibido.length = 0;
  consultasPse = 0;
  fallar = false;
});

const wompi = () => crearPasarelaWompi({ url, ...LLAVES, logger: pino({ level: 'silent' }), esperaEntreIntentosMs: 10 });
const solicitud = (medio: Parameters<ReturnType<typeof wompi>['crearTransaccion']>[0]['medio']) => ({
  referencia: 'RM-000001-AB12', montoCentavos: 2000000, correo: 'viviana@recargamio.test', nombre: 'Viviana Andrade Torres',
  descripcion: 'Recarga MIO RM-000001', medio, urlRetorno: 'recargamio://recarga',
});

describe('Cliente de Wompi Sandbox', () => {
  it('pide los tokens de aceptación con la llave pública en x-merchant-public-key', async () => {
    expect(await wompi().terminos()).toEqual({ aceptacion: 'https://wompi.co/terminos.pdf', datosPersonales: 'https://wompi.co/datos.pdf' });
    expect(recibido[0]).toMatchObject({ ruta: 'GET /v1/merchants/info', publica: 'pub_test_publica' });
  });

  it('crea la transacción de Nequi con llave privada, firma de integridad y los dos tokens de aceptación', async () => {
    const tx = await wompi().crearTransaccion(solicitud({ tipo: 'NEQUI', celular: '3991111111' }));
    expect(tx).toMatchObject({ id: 'tx-NEQUI', estado: 'PENDING', referencia: 'RM-000001-AB12' });
    const post = recibido.find((r) => r.ruta === 'POST /v1/transactions')!;
    expect(post.auth).toBe('Bearer prv_test_privada');
    expect(post.cuerpo).toMatchObject({
      acceptance_token: 'tok-aceptacion',
      accept_personal_auth: 'tok-datos',
      amount_in_cents: 2000000,
      currency: 'COP',
      reference: 'RM-000001-AB12',
      customer_email: 'viviana@recargamio.test',
      signature: firmaIntegridad('RM-000001-AB12', 2000000, 'test_integrity_secreto'),
      payment_method: { type: 'NEQUI', phone_number: '3991111111' },
    });
  });

  it('PSE: envía los datos exigidos y espera la URL del banco (async_payment_url)', async () => {
    const tx = await wompi().crearTransaccion(
      solicitud({ tipo: 'PSE', tipoPersona: 0, tipoDocumento: 'CC', numeroDocumento: '1099888777', codigoBanco: '1', celular: '3001234567' }),
    );
    expect(tx.urlPago).toBe('https://banco.ejemplo/pagar');
    const post = recibido.find((r) => r.ruta === 'POST /v1/transactions')!;
    expect(post.cuerpo).toMatchObject({
      payment_method: { type: 'PSE', user_type: 0, user_legal_id_type: 'CC', user_legal_id: '1099888777', financial_institution_code: '1', payment_description: 'Recarga MIO RM-000001' },
      customer_data: { phone_number: '573001234567', full_name: 'Viviana Andrade Torres' },
    });
    expect(recibido.filter((r) => r.ruta.startsWith('GET /v1/transactions/')).every((r) => r.auth === 'Bearer prv_test_privada')).toBe(true);
  });

  it('Bancolombia: user_type PERSON y descripción', async () => {
    await wompi().crearTransaccion(solicitud({ tipo: 'BANCOLOMBIA_TRANSFER' }));
    expect(recibido.find((r) => r.ruta === 'POST /v1/transactions')!.cuerpo).toMatchObject({
      payment_method: { type: 'BANCOLOMBIA_TRANSFER', user_type: 'PERSON', payment_description: 'Recarga MIO RM-000001' },
    });
  });

  it('lista los bancos de PSE', async () => {
    expect(await wompi().bancosPse()).toEqual([{ codigo: '1', nombre: 'Banco que aprueba' }, { codigo: '2', nombre: 'Banco que rechaza' }]);
  });

  it('si Wompi rechaza la petición responde PASARELA_NO_DISPONIBLE', async () => {
    fallar = true;
    await expect(wompi().crearTransaccion(solicitud({ tipo: 'NEQUI', celular: '3991111111' }))).rejects.toMatchObject({ codigo: 'PASARELA_NO_DISPONIBLE' });
  });
});
