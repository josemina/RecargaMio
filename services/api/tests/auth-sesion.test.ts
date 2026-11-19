// HU-06 · CA-3: la sesión se cierra cuando el token expira. También renovación rotativa, salida y /me.
import request from 'supertest';
import { USUARIO, crearEntorno, crearPrismaPruebas, ingresar, limpiarBase, registrar } from './utilidades';

const prisma = crearPrismaPruebas();
const MINUTO = 60 * 1000;
const DIA = 24 * 60 * MINUTO;
let entorno = crearEntorno(prisma);

beforeEach(async () => {
  await limpiarBase(prisma);
  entorno = crearEntorno(prisma);
  await registrar(entorno.app);
});
afterAll(() => prisma.$disconnect());

const me = (token?: string) => {
  const peticion = request(entorno.app).get('/me');
  return token ? peticion.set('Authorization', `Bearer ${token}`) : peticion;
};
const renovar = (tokenRenovacion: string) => request(entorno.app).post('/auth/renovar').send({ tokenRenovacion });

describe('GET /me con token de acceso', () => {
  it('devuelve los datos del usuario y la versión de la política aceptada', async () => {
    const { body } = await ingresar(entorno.app);
    const res = await me(body.tokenAcceso);
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ nombre: USUARIO.nombre, correo: USUARIO.correo, politica: { version: '1.0' } });
    expect(res.body).not.toHaveProperty('hashContrasena');
  });

  it('sin token responde 401 NO_AUTENTICADO', async () => {
    const res = await me();
    expect(res.status).toBe(401);
    expect(res.body.error.codigo).toBe('NO_AUTENTICADO');
  });

  it('con un token alterado responde 401 TOKEN_INVALIDO', async () => {
    const { body } = await ingresar(entorno.app);
    const res = await me(`${body.tokenAcceso.slice(0, -2)}xx`);
    expect(res.body.error.codigo).toBe('TOKEN_INVALIDO');
  });
});

describe('HU-06 · CA-3: la sesión se cierra cuando el token expira', () => {
  it('el token de acceso deja de servir a los 15 minutos (401 TOKEN_EXPIRADO)', async () => {
    const { body } = await ingresar(entorno.app);
    entorno.reloj.adelantar(14 * MINUTO);
    expect((await me(body.tokenAcceso)).status).toBe(200);
    entorno.reloj.adelantar(1 * MINUTO + 1000);
    const res = await me(body.tokenAcceso);
    expect(res.status).toBe(401);
    expect(res.body.error.codigo).toBe('TOKEN_EXPIRADO');
  });

  it('con el token de renovación se obtiene un nuevo token de acceso mientras la sesión no venza', async () => {
    const { body } = await ingresar(entorno.app);
    entorno.reloj.adelantar(20 * MINUTO);
    const res = await renovar(body.tokenRenovacion);
    expect(res.status).toBe(200);
    expect((await me(res.body.tokenAcceso)).status).toBe(200);
  });

  it('a los 7 días la sesión vence y ya no se puede renovar (401 SESION_EXPIRADA)', async () => {
    const { body } = await ingresar(entorno.app);
    entorno.reloj.adelantar(7 * DIA + 1000);
    const res = await renovar(body.tokenRenovacion);
    expect(res.status).toBe(401);
    expect(res.body.error.codigo).toBe('SESION_EXPIRADA');
  });

  it('al cerrar sesión, el token de acceso y el de renovación dejan de servir de inmediato', async () => {
    const { body } = await ingresar(entorno.app);
    const salida = await request(entorno.app).post('/auth/salir').send({ tokenRenovacion: body.tokenRenovacion });
    expect(salida.status).toBe(204);
    expect((await me(body.tokenAcceso)).body.error.codigo).toBe('SESION_INVALIDA');
    expect((await renovar(body.tokenRenovacion)).status).toBe(401);
  });

  it('cerrar sesión dos veces no produce error', async () => {
    const { body } = await ingresar(entorno.app);
    await request(entorno.app).post('/auth/salir').send({ tokenRenovacion: body.tokenRenovacion });
    expect((await request(entorno.app).post('/auth/salir').send({ tokenRenovacion: body.tokenRenovacion })).status).toBe(204);
  });
});

describe('Renovación rotativa', () => {
  it('cada renovación entrega un token nuevo y revoca el anterior', async () => {
    const { body } = await ingresar(entorno.app);
    const primera = await renovar(body.tokenRenovacion);
    expect(primera.body.tokenRenovacion).not.toBe(body.tokenRenovacion);
    expect((await renovar(primera.body.tokenRenovacion)).status).toBe(200);
  });

  it('si se reutiliza un token ya rotado (posible robo), se cierran todas las sesiones del usuario', async () => {
    const { body } = await ingresar(entorno.app);
    const legitima = await renovar(body.tokenRenovacion);

    const reuso = await renovar(body.tokenRenovacion);
    expect(reuso.status).toBe(401);
    expect(reuso.body.error.codigo).toBe('SESION_INVALIDA');

    expect((await renovar(legitima.body.tokenRenovacion)).status).toBe(401);
    expect((await me(legitima.body.tokenAcceso)).status).toBe(401);
    expect((await prisma.auditoria.findMany()).map((a) => a.accion)).toContain('REUSO_TOKEN_RENOVACION');
  });

  it('en la base solo se guarda el resumen del token de renovación, no el token', async () => {
    const { body } = await ingresar(entorno.app);
    const sesiones = await prisma.sesion.findMany();
    expect(JSON.stringify(sesiones)).not.toContain(body.tokenRenovacion);
  });
});
