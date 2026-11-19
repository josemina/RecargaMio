import request from 'supertest';
import { crearAppPruebas, crearPrismaPruebas, encabezados, reiniciarBase } from './utilidades';

const prisma = crearPrismaPruebas();
const MI_TARJETA = '1234564821';

beforeEach(() => reiniciarBase(prisma));
afterAll(() => prisma.$disconnect());

describe('POST /simulacion/latencia', () => {
  it('con tasa de fallos, responde 503 sin tocar el saldo y el reintento acredita una vez', async () => {
    let tirada = 0; // primera petición falla (0 < 0.5), la segunda pasa (0.9 ≥ 0.5)
    const app = crearAppPruebas(prisma, () => [0, 0.9][tirada++] ?? 0.9);

    await request(app).post('/simulacion/latencia').set(encabezados).send({ demoraMs: 0, tasaFallos: 0.5 }).expect(200);

    const fallida = await request(app)
      .post(`/tarjetas/${MI_TARJETA}/creditos`)
      .set(encabezados)
      .send({ monto: 5000, referencia: 'RM-100001' });
    expect(fallida.status).toBe(503);
    expect(fallida.body.error.codigo).toBe('FALLA_SIMULADA');
    expect((await prisma.tarjetaRecaudo.findUniqueOrThrow({ where: { numero: MI_TARJETA } })).saldo).toBe(12400);

    const reintento = await request(app)
      .post(`/tarjetas/${MI_TARJETA}/creditos`)
      .set(encabezados)
      .send({ monto: 5000, referencia: 'RM-100001' });
    expect(reintento.status).toBe(201);
    expect(reintento.body.saldo).toBe(17400);
  });

  it('aplica la demora configurada a los créditos', async () => {
    const app = crearAppPruebas(prisma);
    await request(app).post('/simulacion/latencia').set(encabezados).send({ demoraMs: 300, tasaFallos: 0 });

    const inicio = Date.now();
    await request(app).post(`/tarjetas/${MI_TARJETA}/creditos`).set(encabezados).send({ monto: 5000, referencia: 'RM-100002' });
    expect(Date.now() - inicio).toBeGreaterThanOrEqual(290);
  });

  it('rechaza valores fuera de rango', async () => {
    const app = crearAppPruebas(prisma);
    const res = await request(app).post('/simulacion/latencia').set(encabezados).send({ demoraMs: 0, tasaFallos: 2 });
    expect(res.status).toBe(400);
  });
});

describe('POST /simulacion/reiniciar', () => {
  it('devuelve los saldos semilla, borra créditos y quita la latencia', async () => {
    const app = crearAppPruebas(prisma);
    await request(app).post(`/tarjetas/${MI_TARJETA}/creditos`).set(encabezados).send({ monto: 50000, referencia: 'RM-100003' });
    await request(app).post('/simulacion/latencia').set(encabezados).send({ demoraMs: 500, tasaFallos: 1 });

    const res = await request(app).post('/simulacion/reiniciar').set(encabezados);

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ reiniciado: true, creditos: 0, condiciones: { demoraMs: 0, tasaFallos: 0 } });
    expect((await prisma.tarjetaRecaudo.findUniqueOrThrow({ where: { numero: MI_TARJETA } })).saldo).toBe(12400);
  });

  it('exige la llave', async () => {
    const app = crearAppPruebas(prisma);
    expect((await request(app).post('/simulacion/reiniciar')).status).toBe(401);
  });
});
