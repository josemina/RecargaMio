// Ingreso y HU-06 · CA-4: tras cinco intentos fallidos, el ingreso se bloquea temporalmente (15 minutos).
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

const fallar = (veces: number) =>
  Array.from({ length: veces }).reduce<Promise<unknown>>((p) => p.then(() => ingresar(entorno.app, 'ClaveEquivocada1')), Promise.resolve());

describe('Ingreso con correo y contraseña', () => {
  it('entrega token de acceso de 15 minutos y token de renovación de 7 días', async () => {
    const res = await ingresar(entorno.app);
    expect(res.status).toBe(200);
    expect(res.body.usuario.correo).toBe(USUARIO.correo);
    const ahora = entorno.reloj.ahora().getTime();
    expect(Date.parse(res.body.accesoExpiraEn) - ahora).toBe(15 * MINUTO);
    expect(Date.parse(res.body.sesionExpiraEn) - ahora).toBe(7 * 24 * 60 * MINUTO);
  });

  it('acepta el correo con mayúsculas y espacios', async () => {
    expect((await ingresar(entorno.app, USUARIO.contrasena, ' Viviana@RECARGAMIO.test')).status).toBe(200);
  });

  it('con contraseña incorrecta responde 401 e indica los intentos restantes (pantalla 1.2)', async () => {
    const res = await ingresar(entorno.app, 'ClaveEquivocada1');
    expect(res.status).toBe(401);
    expect(res.body.error).toMatchObject({ codigo: 'CREDENCIALES_INVALIDAS', mensaje: 'Correo o contraseña incorrectos.', intentosRestantes: 4 });
  });

  it('con un correo no registrado responde el mismo 401, sin contador', async () => {
    const res = await ingresar(entorno.app, USUARIO.contrasena, 'nadie@recargamio.test');
    expect(res.status).toBe(401);
    expect(res.body.error).toEqual({ codigo: 'CREDENCIALES_INVALIDAS', mensaje: 'Correo o contraseña incorrectos.' });
  });

  it('un ingreso exitoso reinicia el contador de intentos', async () => {
    await fallar(3);
    await ingresar(entorno.app);
    const res = await ingresar(entorno.app, 'ClaveEquivocada1');
    expect(res.body.error.intentosRestantes).toBe(4);
  });
});

describe('HU-06 · CA-4: tras cinco intentos fallidos, el ingreso se bloquea temporalmente', () => {
  it('el quinto intento fallido bloquea la cuenta (423 CUENTA_BLOQUEADA)', async () => {
    await fallar(4);
    const quinto = await ingresar(entorno.app, 'ClaveEquivocada1');
    expect(quinto.status).toBe(423);
    expect(quinto.body.error.codigo).toBe('CUENTA_BLOQUEADA');
    expect(Date.parse(quinto.body.error.desbloqueoEn) - entorno.reloj.ahora().getTime()).toBe(15 * MINUTO);
  });

  it('durante el bloqueo, ni la contraseña correcta permite ingresar', async () => {
    await fallar(5);
    entorno.reloj.adelantar(14 * MINUTO);
    const res = await ingresar(entorno.app);
    expect(res.status).toBe(423);
    expect(res.body.error.codigo).toBe('CUENTA_BLOQUEADA');
  });

  it('a los 15 minutos el bloqueo termina y se puede ingresar', async () => {
    await fallar(5);
    entorno.reloj.adelantar(15 * MINUTO + 1000);
    expect((await ingresar(entorno.app)).status).toBe(200);
  });

  it('después del bloqueo el contador vuelve a empezar en 5 intentos', async () => {
    await fallar(5);
    entorno.reloj.adelantar(16 * MINUTO);
    const res = await ingresar(entorno.app, 'ClaveEquivocada1');
    expect(res.body.error.intentosRestantes).toBe(4);
  });

  it('registra en la auditoría los intentos fallidos y el bloqueo', async () => {
    await fallar(5);
    const acciones = (await prisma.auditoria.findMany()).map((a) => a.accion);
    expect(acciones.filter((a) => a === 'INGRESO_FALLIDO')).toHaveLength(5);
    expect(acciones).toContain('CUENTA_BLOQUEADA');
  });
});

describe('Límite de peticiones', () => {
  it('responde 429 DEMASIADAS_PETICIONES después de 10 ingresos seguidos desde la misma IP', async () => {
    const limitado = crearEntorno(prisma, { limitarPeticiones: true });
    let ultima;
    for (let i = 0; i < 11; i += 1) {
      ultima = await ingresar(limitado.app, USUARIO.contrasena, `otro${i}@recargamio.test`);
    }
    expect(ultima!.status).toBe(429);
    expect(ultima!.body.error.codigo).toBe('DEMASIADAS_PETICIONES');
  });
});
