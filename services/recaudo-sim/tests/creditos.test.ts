import request from 'supertest';
import { crearAppPruebas, crearPrismaPruebas, encabezados, reiniciarBase } from './utilidades';

const prisma = crearPrismaPruebas();
const app = crearAppPruebas(prisma);
const MI_TARJETA = '1234564821'; // saldo semilla $12.400

const saldoDe = async (numero: string) =>
  (await prisma.tarjetaRecaudo.findUniqueOrThrow({ where: { numero } })).saldo;

const acreditar = (numero: string, monto: number, referencia: string) =>
  request(app).post(`/tarjetas/${numero}/creditos`).set(encabezados).send({ monto, referencia });

beforeEach(() => reiniciarBase(prisma));
afterAll(() => prisma.$disconnect());

describe('Autenticación con X-Api-Key', () => {
  it('responde 401 sin llave', async () => {
    const res = await request(app).get(`/tarjetas/${MI_TARJETA}`);
    expect(res.status).toBe(401);
    expect(res.body.error.codigo).toBe('NO_AUTORIZADO');
  });

  it('responde 401 con una llave equivocada', async () => {
    const res = await request(app).get(`/tarjetas/${MI_TARJETA}`).set('X-Api-Key', 'otra-llave-cualquiera');
    expect(res.status).toBe(401);
  });
});

describe('GET /tarjetas/:numero', () => {
  it('devuelve existencia, estado y saldo', async () => {
    const res = await request(app).get(`/tarjetas/${MI_TARJETA}`).set(encabezados);
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ numero: MI_TARJETA, existe: true, activa: true, saldo: 12400 });
  });

  it('responde 404 TARJETA_NO_EXISTE si el recaudo no la conoce', async () => {
    const res = await request(app).get('/tarjetas/5555555555').set(encabezados);
    expect(res.status).toBe(404);
    expect(res.body.error.codigo).toBe('TARJETA_NO_EXISTE');
  });

  it('responde 400 si el número no tiene 10 dígitos', async () => {
    const res = await request(app).get('/tarjetas/12345').set(encabezados);
    expect(res.status).toBe(400);
    expect(res.body.error.codigo).toBe('DATOS_INVALIDOS');
  });
});

describe('POST /tarjetas/:numero/creditos (idempotencia por referencia)', () => {
  it('CRITERIO T2: acreditar dos veces la misma referencia suma una sola vez', async () => {
    const primera = await acreditar(MI_TARJETA, 10000, 'RM-000001');
    const segunda = await acreditar(MI_TARJETA, 10000, 'RM-000001');

    expect(primera.status).toBe(201);
    expect(primera.body).toMatchObject({ saldo: 22400, duplicado: false });
    expect(segunda.status).toBe(200);
    expect(segunda.body).toMatchObject({ saldo: 22400, duplicado: true });
    expect(segunda.body.acreditadoEn).toBe(primera.body.acreditadoEn);

    expect(await saldoDe(MI_TARJETA)).toBe(22400);
    expect(await prisma.credito.count({ where: { referencia: 'RM-000001' } })).toBe(1);
  });

  it('10 créditos simultáneos con la misma referencia suman una sola vez', async () => {
    const respuestas = await Promise.all(Array.from({ length: 10 }, () => acreditar(MI_TARJETA, 5000, 'RM-000002')));

    expect(respuestas.every((r) => r.status === 200 || r.status === 201)).toBe(true);
    expect(respuestas.filter((r) => r.body.duplicado === false)).toHaveLength(1);
    expect(respuestas.every((r) => r.body.saldo === 17400)).toBe(true);
    expect(await saldoDe(MI_TARJETA)).toBe(17400);
  });

  it('referencias distintas sí se suman', async () => {
    await acreditar(MI_TARJETA, 5000, 'RM-000003');
    await acreditar(MI_TARJETA, 20000, 'RM-000004');
    expect(await saldoDe(MI_TARJETA)).toBe(37400);
  });

  it('responde 409 REFERENCIA_EN_CONFLICTO si la referencia llega con otro monto u otra tarjeta', async () => {
    await acreditar(MI_TARJETA, 5000, 'RM-000005');

    const otroMonto = await acreditar(MI_TARJETA, 50000, 'RM-000005');
    const otraTarjeta = await acreditar('1234567730', 5000, 'RM-000005');

    expect(otroMonto.status).toBe(409);
    expect(otroMonto.body.error.codigo).toBe('REFERENCIA_EN_CONFLICTO');
    expect(otraTarjeta.status).toBe(409);
    expect(await saldoDe(MI_TARJETA)).toBe(17400);
    expect(await saldoDe('1234567730')).toBe(3200);
  });

  it('responde 404 si la tarjeta no existe y no crea el crédito', async () => {
    const res = await acreditar('5555555555', 5000, 'RM-000006');
    expect(res.status).toBe(404);
    expect(await prisma.credito.count()).toBe(0);
  });

  it('responde 422 TARJETA_INACTIVA y no cambia el saldo', async () => {
    const res = await acreditar('1234560009', 5000, 'RM-000007');
    expect(res.status).toBe(422);
    expect(res.body.error.codigo).toBe('TARJETA_INACTIVA');
    expect(await saldoDe('1234560009')).toBe(0);
  });

  it.each([
    [{ monto: -100, referencia: 'RM-1' }],
    [{ monto: 1500.5, referencia: 'RM-1' }],
    [{ monto: 5000 }],
    [{ monto: '5000', referencia: 'RM-1' }],
  ])('responde 400 con datos inválidos: %j', async (cuerpo) => {
    const res = await request(app).post(`/tarjetas/${MI_TARJETA}/creditos`).set(encabezados).send(cuerpo);
    expect(res.status).toBe(400);
    expect(res.body.error.codigo).toBe('DATOS_INVALIDOS');
  });
});
