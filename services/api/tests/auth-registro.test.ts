// HU-06 · CA-1 y CA-2: registro con contraseña de ocho caracteres o más y aceptación expresa de la política.
import argon2 from 'argon2';
import request from 'supertest';
import { USUARIO, crearEntorno, crearPrismaPruebas, limpiarBase, registrar } from './utilidades';

const prisma = crearPrismaPruebas();
const { app } = crearEntorno(prisma);

beforeEach(() => limpiarBase(prisma));
afterAll(() => prisma.$disconnect());

describe('HU-06 · CA-1: me registro con correo y una contraseña de ocho caracteres o más', () => {
  it('crea la cuenta, entrega los tokens y guarda la contraseña con argon2id', async () => {
    const res = await registrar(app);

    expect(res.status).toBe(201);
    expect(res.body.usuario).toEqual({ id: expect.any(String), nombre: USUARIO.nombre, correo: USUARIO.correo });
    expect(res.body.tokenAcceso).toEqual(expect.any(String));
    expect(res.body.tokenRenovacion).toEqual(expect.any(String));

    const usuario = await prisma.usuario.findUniqueOrThrow({ where: { correo: USUARIO.correo } });
    expect(usuario.hashContrasena).toMatch(/^\$argon2id\$/);
    expect(usuario.hashContrasena).not.toContain(USUARIO.contrasena);
    expect(await argon2.verify(usuario.hashContrasena, USUARIO.contrasena)).toBe(true);
  });

  it('acepta exactamente 8 caracteres', async () => {
    expect((await registrar(app, { contrasena: 'abcdef12' })).status).toBe(201);
  });

  it.each([
    ['7 caracteres', 'abcde12', /mínimo 8/],
    ['sin números', 'soloLetrasAqui', /un número/],
    ['sin letras', '1234567890', /una letra/],
  ])('rechaza una contraseña %s', async (_caso, contrasena, mensaje) => {
    const res = await registrar(app, { contrasena });
    expect(res.status).toBe(400);
    expect(res.body.error.codigo).toBe('DATOS_INVALIDOS');
    expect(res.body.error.mensaje).toMatch(mensaje);
    expect(await prisma.usuario.count()).toBe(0);
  });

  it('rechaza un correo inválido', async () => {
    const res = await registrar(app, { correo: 'no-es-un-correo' });
    expect(res.status).toBe(400);
    expect(res.body.error.campos).toContain('correo');
  });

  it('normaliza el correo y no permite registrarlo dos veces (409 CORREO_REGISTRADO)', async () => {
    await registrar(app);
    const res = await registrar(app, { correo: '  VIVIANA@RecargaMIO.test ' });
    expect(res.status).toBe(409);
    expect(res.body.error.codigo).toBe('CORREO_REGISTRADO');
    expect(await prisma.usuario.count()).toBe(1);
  });
});

describe('HU-06 · CA-2: debo aceptar de forma expresa la política de tratamiento de datos', () => {
  it.each([
    ['ausente', undefined],
    ['en false', false],
    ['como texto "true"', 'true'],
    ['como 1', 1],
  ])('no crea la cuenta con aceptaPolitica %s', async (_caso, valor) => {
    const res = await request(app).post('/auth/registro').send({ ...USUARIO, aceptaPolitica: valor });
    expect(res.status).toBe(400);
    expect(res.body.error.codigo).toBe('POLITICA_NO_ACEPTADA');
    expect(res.body.error.mensaje).toMatch(/Ley 1581/);
    expect(await prisma.usuario.count()).toBe(0);
  });

  it('registra la versión de la política aceptada, la fecha y la IP', async () => {
    const { body } = await registrar(app);
    const autorizaciones = await prisma.autorizacionDatos.findMany({ where: { usuarioId: body.usuario.id } });
    expect(autorizaciones).toHaveLength(1);
    expect(autorizaciones[0]).toMatchObject({ versionPolitica: '1.0', aceptadoEn: expect.any(Date), ip: expect.any(String) });
  });

  it('deja el registro en la auditoría (RF-12) sin datos sensibles', async () => {
    const { body } = await registrar(app);
    const auditoria = await prisma.auditoria.findMany({ where: { usuarioId: body.usuario.id } });
    expect(auditoria.map((a) => a.accion)).toContain('REGISTRO');
    expect(JSON.stringify(auditoria)).not.toContain(USUARIO.contrasena);
  });
});
