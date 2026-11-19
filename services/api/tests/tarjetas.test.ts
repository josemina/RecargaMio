// HU-07: administrar hasta cinco tarjetas. HU-03 CA-1: el saldo de cada tarjeta aparece en el inicio.
import request from 'supertest';
import { crearEntorno, crearPrismaPruebas, limpiarBase, registrar } from './utilidades';

const prisma = crearPrismaPruebas();
let entorno = crearEntorno(prisma);
let token = '';

beforeEach(async () => {
  await limpiarBase(prisma);
  entorno = crearEntorno(prisma);
  token = (await registrar(entorno.app)).body.tokenAcceso;
});
afterAll(() => prisma.$disconnect());

const conSesion = (peticion: request.Test, t = token) => peticion.set('Authorization', `Bearer ${t}`);
const agregar = (numero: string, alias: string, t = token) =>
  conSesion(request(entorno.app).post('/tarjetas').send({ numero, alias }), t);
const listar = (t = token) => conSesion(request(entorno.app).get('/tarjetas'), t);
const CINCO = ['1234564821', '1234567730', '9087654321', '1234560001', '1234560002'];

describe('HU-07 · CA-1: agrego una tarjeta con su número y un nombre', () => {
  it('registra la tarjeta validándola con el recaudo y devuelve el saldo', async () => {
    const res = await agregar('1234 5648 21', 'Mi tarjeta');
    expect(res.status).toBe(201);
    expect(res.body.tarjeta).toMatchObject({ alias: 'Mi tarjeta', ultimos4: '4821', saldo: 12400, saldoBajo: false, alerta: null });
    expect(res.body).toMatchObject({ registradas: 1, maximo: 5 });
  });

  it('nunca devuelve ni guarda el número completo en texto plano', async () => {
    const res = await agregar('1234564821', 'Mi tarjeta');
    expect(JSON.stringify(res.body)).not.toContain('1234564821');
    expect(JSON.stringify(await prisma.tarjeta.findMany())).not.toContain('1234564821');
  });

  it.each([
    ['un número de 9 dígitos', { numero: '123456789', alias: 'X' }, 'DATOS_INVALIDOS', 400],
    ['un nombre vacío', { numero: '1234564821', alias: '   ' }, 'DATOS_INVALIDOS', 400],
    ['un nombre de más de 30 caracteres', { numero: '1234564821', alias: 'x'.repeat(31) }, 'DATOS_INVALIDOS', 400],
    ['un número que el recaudo no conoce', { numero: '5555555555', alias: 'X' }, 'TARJETA_NO_EXISTE', 422],
    ['una tarjeta bloqueada en el recaudo', { numero: '1234560009', alias: 'X' }, 'TARJETA_INACTIVA', 422],
  ])('rechaza %s', async (_caso, cuerpo, codigo, estado) => {
    const res = await conSesion(request(entorno.app).post('/tarjetas').send(cuerpo));
    expect(res.status).toBe(estado);
    expect(res.body.error.codigo).toBe(codigo);
    expect(await prisma.tarjeta.count()).toBe(0);
  });

  it('no permite registrar dos veces la misma tarjeta (409 TARJETA_YA_REGISTRADA)', async () => {
    await agregar('1234564821', 'Mi tarjeta');
    const res = await agregar('1234564821', 'Otra vez');
    expect(res.status).toBe(409);
    expect(res.body.error.codigo).toBe('TARJETA_YA_REGISTRADA');
  });

  it('dos usuarios distintos sí pueden registrar la misma tarjeta (por ejemplo, la de un familiar)', async () => {
    const otro = (await registrar(entorno.app, { correo: 'otro@recargamio.test' })).body.tokenAcceso;
    await agregar('1234567730', 'Tarjeta de mamá');
    expect((await agregar('1234567730', 'Mamá', otro)).status).toBe(201);
  });

  it('si el recaudo no responde, no registra la tarjeta (503 RECAUDO_NO_DISPONIBLE)', async () => {
    entorno.recaudo.estado.caido = true;
    const res = await agregar('1234564821', 'Mi tarjeta');
    expect(res.status).toBe(503);
    expect(res.body.error.codigo).toBe('RECAUDO_NO_DISPONIBLE');
  });

  it('exige sesión', async () => {
    expect((await request(entorno.app).get('/tarjetas')).status).toBe(401);
  });

  it('registra la operación en la auditoría (RF-12)', async () => {
    await agregar('1234564821', 'Mi tarjeta');
    expect((await prisma.auditoria.findMany()).map((a) => a.accion)).toContain('TARJETA_AGREGADA');
  });
});

describe('HU-07 · CA-2: veo cuántas tarjetas llevo registradas de las cinco permitidas', () => {
  it('GET /tarjetas indica registradas y máximo', async () => {
    await agregar('1234564821', 'Mi tarjeta');
    await agregar('1234567730', 'Tarjeta de mamá');
    const res = await listar();
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ registradas: 2, maximo: 5 });
    expect(res.body.tarjetas.map((t: { alias: string }) => t.alias)).toEqual(['Mi tarjeta', 'Tarjeta de mamá']);
  });

  it('con cero tarjetas responde 0 de 5', async () => {
    expect((await listar()).body).toMatchObject({ registradas: 0, maximo: 5, tarjetas: [] });
  });
});

describe('HU-07 · CA-3: la aplicación no permite registrar una sexta', () => {
  it('la sexta tarjeta, aunque sea válida, responde 409 LIMITE_TARJETAS', async () => {
    for (const [i, numero] of CINCO.entries()) expect((await agregar(numero, `Tarjeta ${i + 1}`)).status).toBe(201);

    const sexta = await agregar('1234560003', 'Sexta');
    expect(sexta.status).toBe(409);
    expect(sexta.body.error).toMatchObject({ codigo: 'LIMITE_TARJETAS', registradas: 5, maximo: 5 });
    expect(sexta.body.error.mensaje).toMatch(/5 de 5/);
    expect(await prisma.tarjeta.count({ where: { activa: true } })).toBe(5);
  });

  it('con cuatro tarjetas, dos peticiones simultáneas no superan el límite', async () => {
    for (const numero of CINCO.slice(0, 4)) await agregar(numero, 'X');
    const respuestas = await Promise.all([agregar('1234560002', 'A'), agregar('1234560003', 'B')]);
    expect(respuestas.map((r) => r.status).sort()).toEqual([201, 409]);
    expect(await prisma.tarjeta.count({ where: { activa: true } })).toBe(5);
  });

  it('al eliminar una, se puede agregar otra', async () => {
    for (const numero of CINCO) await agregar(numero, 'X');
    const { body } = await listar();
    await conSesion(request(entorno.app).delete(`/tarjetas/${body.tarjetas[0].id}`));
    expect((await agregar('1234560003', 'Nueva')).status).toBe(201);
  });
});

describe('HU-07 · CA-4: puedo renombrar o eliminar una tarjeta', () => {
  it('PATCH cambia el nombre', async () => {
    const { body } = await agregar('1234567730', 'Mamá');
    const res = await conSesion(request(entorno.app).patch(`/tarjetas/${body.tarjeta.id}`).send({ alias: 'Tarjeta de mamá' }));
    expect(res.status).toBe(200);
    expect(res.body.alias).toBe('Tarjeta de mamá');
  });

  it('DELETE la quita de la lista y del conteo, pero conserva el registro (borrado lógico)', async () => {
    const { body } = await agregar('1234567730', 'Tarjeta de mamá');
    const res = await conSesion(request(entorno.app).delete(`/tarjetas/${body.tarjeta.id}`));
    expect(res.status).toBe(204);
    expect((await listar()).body).toMatchObject({ registradas: 0, tarjetas: [] });
    expect(await prisma.tarjeta.findUnique({ where: { id: body.tarjeta.id } })).toMatchObject({ activa: false });
  });

  it('volver a agregar una tarjeta eliminada la reactiva con el nombre nuevo', async () => {
    const { body } = await agregar('1234567730', 'Mamá');
    await conSesion(request(entorno.app).delete(`/tarjetas/${body.tarjeta.id}`));
    const otra = await agregar('1234567730', 'Tarjeta de mamá');
    expect(otra.status).toBe(201);
    expect(otra.body.tarjeta).toMatchObject({ id: body.tarjeta.id, alias: 'Tarjeta de mamá' });
  });

  it('no permite ver, renombrar ni eliminar la tarjeta de otro usuario (404)', async () => {
    const { body } = await agregar('1234564821', 'Mi tarjeta');
    const intruso = (await registrar(entorno.app, { correo: 'intruso@recargamio.test' })).body.tokenAcceso;
    const ruta = `/tarjetas/${body.tarjeta.id}`;
    expect((await conSesion(request(entorno.app).get(ruta), intruso)).status).toBe(404);
    expect((await conSesion(request(entorno.app).patch(ruta).send({ alias: 'Mía' }), intruso)).status).toBe(404);
    expect((await conSesion(request(entorno.app).delete(ruta), intruso)).status).toBe(404);
    expect((await prisma.tarjeta.findUnique({ where: { id: body.tarjeta.id } }))?.alias).toBe('Mi tarjeta');
  });

  it('registra el cambio de nombre y la eliminación en la auditoría (RF-12)', async () => {
    const { body } = await agregar('1234567730', 'Mamá');
    await conSesion(request(entorno.app).patch(`/tarjetas/${body.tarjeta.id}`).send({ alias: 'Tarjeta de mamá' }));
    await conSesion(request(entorno.app).delete(`/tarjetas/${body.tarjeta.id}`));
    const acciones = (await prisma.auditoria.findMany()).map((a) => a.accion);
    expect(acciones).toEqual(expect.arrayContaining(['TARJETA_RENOMBRADA', 'TARJETA_ELIMINADA']));
  });
});

describe('HU-03 · CA-1: el saldo de cada tarjeta aparece en la pantalla de inicio', () => {
  it('GET /tarjetas trae el saldo en vivo del recaudo', async () => {
    await agregar('1234564821', 'Mi tarjeta');
    await agregar('1234567730', 'Tarjeta de mamá');
    const saldos = (await listar()).body.tarjetas.map((t: { saldo: number }) => t.saldo);
    expect(saldos).toEqual([12400, 3200]);
  });

  it('marca «Saldo bajo» solo si la alerta está configurada y el saldo está por debajo', async () => {
    const { body } = await agregar('1234567730', 'Tarjeta de mamá');
    expect((await listar()).body.tarjetas[0].saldoBajo).toBe(false); // sin alerta
    await prisma.alerta.create({ data: { tarjetaId: body.tarjeta.id, umbral: 5000 } });
    expect((await listar()).body.tarjetas[0]).toMatchObject({ saldoBajo: true, alerta: { umbral: 5000, activa: true } });
  });

  it('si el recaudo no responde, lista las tarjetas con saldo null y un aviso (respuesta degradada)', async () => {
    await agregar('1234564821', 'Mi tarjeta');
    entorno.recaudo.estado.caido = true;
    const res = await listar();
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ recaudoDisponible: false, aviso: expect.any(String) });
    expect(res.body.tarjetas[0]).toMatchObject({ alias: 'Mi tarjeta', saldo: null });
  });

  it('GET /tarjetas/:id trae el detalle con la última recarga acreditada (pantalla 2.3)', async () => {
    const { body } = await agregar('1234567730', 'Tarjeta de mamá');
    const usuario = await prisma.usuario.findFirstOrThrow();
    await prisma.recarga.create({
      data: {
        referencia: 'RM-000001', referenciaPasarela: 'RM-000001-PRB1', usuarioId: usuario.id, tarjetaId: body.tarjeta.id, numeroDestino: '1234567730',
        monto: 10000, medioPago: 'PSE', estado: 'ACREDITADA', acreditadaEn: new Date('2026-10-20T15:00:00Z'),
      },
    });
    const res = await conSesion(request(entorno.app).get(`/tarjetas/${body.tarjeta.id}`));
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ ultimos4: '7730', saldo: 3200, ultimaRecarga: { monto: 10000, medioPago: 'PSE' } });
  });
});
