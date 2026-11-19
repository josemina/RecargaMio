import request from 'supertest';
import { crearAppPruebas, crearPrismaPruebas, encabezados, reiniciarBase } from './utilidades';

const prisma = crearPrismaPruebas();
const app = crearAppPruebas(prisma);

const viajar = (numero: string, ruta?: string) =>
  request(app).post('/simulacion/viaje').set(encabezados).send({ numero, ruta });

beforeEach(() => reiniciarBase(prisma));
afterAll(() => prisma.$disconnect());

describe('POST /simulacion/viaje', () => {
  it('descuenta el pasaje de $3.500 y registra el viaje', async () => {
    const res = await viajar('1234564821', 'T31');
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ numero: '1234564821', ruta: 'T31', valor: 3500, saldo: 8900 });
  });

  it('permite que el saldo quede negativo (ADR 0010)', async () => {
    const res = await viajar('9087654321'); // saldo semilla $1.000
    expect(res.status).toBe(201);
    expect(res.body.saldo).toBe(-2500);
  });

  it('responde 422 si la tarjeta está inactiva', async () => {
    const res = await viajar('1234560009');
    expect(res.status).toBe(422);
    expect(res.body.error.codigo).toBe('TARJETA_INACTIVA');
  });

  it('responde 404 si la tarjeta no existe', async () => {
    expect((await viajar('5555555555')).status).toBe(404);
  });
});

describe('Aviso del viaje a la API (alertas de saldo bajo, ADR 0014)', () => {
  it('después de un viaje avisa a la API con el número de la tarjeta', async () => {
    const avisos: string[] = [];
    const conAviso = crearAppPruebas(prisma, undefined, async (numero) => {
      avisos.push(numero);
    });
    await request(conAviso).post('/simulacion/viaje').set(encabezados).send({ numero: '1234567730' }).expect(201);
    expect(avisos).toEqual(['1234567730']);
  });

  it('si la API no responde, el viaje igual queda registrado', async () => {
    const conAviso = crearAppPruebas(prisma, undefined, async () => {
      throw new Error('API caída');
    });
    const res = await request(conAviso).post('/simulacion/viaje').set(encabezados).send({ numero: '1234567730' });
    expect(res.status).toBe(201);
    expect(res.body.saldo).toBe(-300);
  });

  it('no avisa si el viaje falla', async () => {
    const avisos: string[] = [];
    const conAviso = crearAppPruebas(prisma, undefined, async (numero) => {
      avisos.push(numero);
    });
    await request(conAviso).post('/simulacion/viaje').set(encabezados).send({ numero: '1234560009' }).expect(422);
    expect(avisos).toEqual([]);
  });
});

describe('GET /tarjetas/:numero/viajes', () => {
  it('devuelve los viajes del más reciente al más antiguo', async () => {
    await viajar('1234564821', 'P47');
    const res = await request(app).get('/tarjetas/1234564821/viajes').set(encabezados);

    expect(res.status).toBe(200);
    expect(res.body.viajes).toHaveLength(4); // 3 de la semilla + 1 nuevo
    expect(res.body.viajes[0].ruta).toBe('P47');
    const fechas = res.body.viajes.map((v: { fecha: string }) => Date.parse(v.fecha));
    expect(fechas).toEqual([...fechas].sort((a, b) => b - a));
  });

  it('filtra con ?desde=', async () => {
    const haceUnaHora = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    await viajar('1234564821', 'P47');
    const res = await request(app)
      .get('/tarjetas/1234564821/viajes')
      .query({ desde: haceUnaHora })
      .set(encabezados);
    expect(res.body.viajes).toHaveLength(1);
  });

  it('filtra con ?hasta= (exclusivo) para paginar', async () => {
    const todos = (await request(app).get('/tarjetas/1234564821/viajes').set(encabezados)).body.viajes;
    const res = await request(app).get('/tarjetas/1234564821/viajes').query({ hasta: todos[0].fecha }).set(encabezados);
    expect(res.body.viajes).toHaveLength(todos.length - 1);
    expect(res.body.viajes[0].fecha).toBe(todos[1].fecha);
  });

  it('respeta ?limite=', async () => {
    const res = await request(app).get('/tarjetas/1234564821/viajes').query({ limite: 2 }).set(encabezados);
    expect(res.body.viajes).toHaveLength(2);
  });

  it('responde 400 con una fecha inválida', async () => {
    const res = await request(app).get('/tarjetas/1234564821/viajes').query({ desde: 'ayer' }).set(encabezados);
    expect(res.status).toBe(400);
  });

  it('responde 404 si la tarjeta no existe', async () => {
    expect((await request(app).get('/tarjetas/5555555555/viajes').set(encabezados)).status).toBe(404);
  });
});
