// HU-06 · CA-5: puedo recuperar la contraseña por correo (enlace de un uso, válido 30 minutos).
import request from 'supertest';
import { USUARIO, crearEntorno, crearPrismaPruebas, ingresar, limpiarBase, registrar } from './utilidades';

const prisma = crearPrismaPruebas();
const MINUTO = 60 * 1000;
let entorno = crearEntorno(prisma);

beforeEach(async () => {
  await limpiarBase(prisma);
  entorno = crearEntorno(prisma);
  await registrar(entorno.app);
});
afterAll(() => prisma.$disconnect());

const recuperar = (correo = USUARIO.correo) => request(entorno.app).post('/auth/recuperar').send({ correo });
const restablecer = (token: string, contrasena = 'NuevaClave2026') =>
  request(entorno.app).post('/auth/restablecer').send({ token, contrasena });
const tokenDelCorreo = () => {
  const ultimo = entorno.correo.enviados.at(-1);
  return /token=([A-Za-z0-9_-]+)/.exec(ultimo?.texto ?? '')?.[1] ?? '';
};

describe('HU-06 · CA-5: puedo recuperar la contraseña por correo', () => {
  it('envía un correo al usuario con el enlace para crear una nueva contraseña', async () => {
    const res = await recuperar();
    expect(res.status).toBe(200);
    expect(res.body.mensaje).toBe('Si el correo está registrado, recibirás un enlace válido por 30 minutos.');

    expect(entorno.correo.enviados).toHaveLength(1);
    const [mensaje] = entorno.correo.enviados;
    expect(mensaje.para).toBe(USUARIO.correo);
    expect(mensaje.asunto).toMatch(/Restablece tu contraseña/);
    expect(mensaje.texto).toMatch(/http:\/\/localhost:3000\/restablecer\?token=/);
    expect(mensaje.texto).toMatch(/30 minutos/);
  });

  it('con el enlace se cambia la contraseña: la nueva funciona y la anterior no', async () => {
    await recuperar();
    expect((await restablecer(tokenDelCorreo())).status).toBe(200);
    expect((await ingresar(entorno.app, 'NuevaClave2026')).status).toBe(200);
    expect((await ingresar(entorno.app, USUARIO.contrasena)).status).toBe(401);
  });

  it('responde lo mismo si el correo no está registrado y no envía nada', async () => {
    const res = await recuperar('nadie@recargamio.test');
    expect(res.status).toBe(200);
    expect(res.body.mensaje).toBe('Si el correo está registrado, recibirás un enlace válido por 30 minutos.');
    expect(entorno.correo.enviados).toHaveLength(0);
  });

  it('el enlace sirve una sola vez', async () => {
    await recuperar();
    const token = tokenDelCorreo();
    await restablecer(token);
    const segunda = await restablecer(token, 'OtraClave2027');
    expect(segunda.status).toBe(400);
    expect(segunda.body.error.codigo).toBe('ENLACE_INVALIDO');
  });

  it('el enlace vence a los 30 minutos', async () => {
    await recuperar();
    const token = tokenDelCorreo();
    entorno.reloj.adelantar(30 * MINUTO + 1000);
    expect((await restablecer(token)).body.error.codigo).toBe('ENLACE_INVALIDO');
  });

  it('pedir un enlace nuevo invalida el anterior', async () => {
    await recuperar();
    const anterior = tokenDelCorreo();
    await recuperar();
    expect((await restablecer(anterior)).status).toBe(400);
    expect((await restablecer(tokenDelCorreo())).status).toBe(200);
  });

  it('restablecer cierra las sesiones abiertas y quita el bloqueo por intentos', async () => {
    const { body } = await ingresar(entorno.app);
    for (let i = 0; i < 5; i += 1) await ingresar(entorno.app, 'ClaveEquivocada1');
    await recuperar();
    await restablecer(tokenDelCorreo());

    expect((await request(entorno.app).get('/me').set('Authorization', `Bearer ${body.tokenAcceso}`)).status).toBe(401);
    expect((await ingresar(entorno.app, 'NuevaClave2026')).status).toBe(200);
  });

  it('exige una contraseña nueva válida', async () => {
    await recuperar();
    const res = await restablecer(tokenDelCorreo(), 'corta1');
    expect(res.status).toBe(400);
    expect(res.body.error.codigo).toBe('DATOS_INVALIDOS');
  });

  it('en la base no se guarda el token del enlace', async () => {
    await recuperar();
    expect(JSON.stringify(await prisma.tokenRecuperacion.findMany())).not.toContain(tokenDelCorreo());
  });
});

describe('Página web del enlace (/restablecer)', () => {
  it('GET muestra el formulario accesible con el token', async () => {
    await recuperar();
    const token = tokenDelCorreo();
    const res = await request(entorno.app).get(`/restablecer?token=${token}`);
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/html/);
    expect(res.headers['cache-control']).toBe('no-store');
    expect(res.text).toContain('<label for="contrasena">Nueva contraseña</label>');
    expect(res.text).toContain(`value="${token}"`);
  });

  it('POST del formulario cambia la contraseña y muestra la confirmación', async () => {
    await recuperar();
    const res = await request(entorno.app)
      .post('/restablecer')
      .type('form')
      .send({ token: tokenDelCorreo(), contrasena: 'NuevaClave2026', confirmacion: 'NuevaClave2026' });
    expect(res.status).toBe(200);
    expect(res.text).toContain('Tu contraseña se cambió');
    expect((await ingresar(entorno.app, 'NuevaClave2026')).status).toBe(200);
  });

  it('si las contraseñas no coinciden, muestra el error sin cambiar nada', async () => {
    await recuperar();
    const res = await request(entorno.app)
      .post('/restablecer')
      .type('form')
      .send({ token: tokenDelCorreo(), contrasena: 'NuevaClave2026', confirmacion: 'OtraClave2026' });
    expect(res.status).toBe(400);
    expect(res.text).toContain('Las contraseñas no coinciden.');
    expect((await ingresar(entorno.app)).status).toBe(200);
  });

  it('escapa el token para evitar inyección de HTML', async () => {
    const res = await request(entorno.app).get('/restablecer').query({ token: '"><script>alert(1)</script>' });
    expect(res.text).not.toContain('<script>alert(1)</script>');
  });
});
