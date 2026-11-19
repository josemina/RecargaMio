// T7 · Perfil y privacidad (RNF-04, Ley 1581 de 2012, pantallas 5.1 y 5.2). Decisiones en ADR 0015.
// T7 no tiene historia en la Tabla 13: los criterios salen de RNF-04 y de la pantalla 5.2 de Figma.
import request from 'supertest';
import { crearEntorno, crearPrismaPruebas, ingresar, limpiarBase, registrar, USUARIO } from './utilidades';

const prisma = crearPrismaPruebas();
let entorno = crearEntorno(prisma);
let sesion: { tokenAcceso: string; tokenRenovacion: string; usuario: { id: string } };
let miTarjeta = '';

const TABLAS = [
  'usuario', 'autorizacion_datos', 'sesion', 'token_recuperacion', 'tarjeta', 'alerta', 'recarga',
  'transaccion_pasarela', 'dispositivo', 'notificacion', 'auditoria', 'pqr',
];

beforeEach(async () => {
  await limpiarBase(prisma);
  entorno = crearEntorno(prisma);
  sesion = (await registrar(entorno.app)).body;
  miTarjeta = (await conSesion(request(entorno.app).post('/tarjetas').send({ numero: '1234564821', alias: 'Mi tarjeta' }))).body.tarjeta.id;
});
afterAll(() => prisma.$disconnect());

function conSesion(peticion: request.Test, token = sesion.tokenAcceso) {
  return peticion.set('Authorization', `Bearer ${token}`);
}
const actualizar = (cuerpo: Record<string, unknown>) => conSesion(request(entorno.app).patch('/me').send(cuerpo));
const eliminar = (contrasena = USUARIO.contrasena, token = sesion.tokenAcceso) =>
  conSesion(request(entorno.app).delete('/me').send({ contrasena }), token);

/** Recarga con Nequi; si `confirmar`, la pasarela aprueba y el webhook la acredita. */
async function recargar(confirmar: boolean, token = sesion.tokenAcceso) {
  const { body } = await conSesion(
    request(entorno.app)
      .post('/recargas')
      .send({ tarjetaId: miTarjeta, monto: 10000, aceptaTerminosPasarela: true, medioPago: 'NEQUI', datosMedio: { celular: '3991111111' } }),
    token,
  );
  if (confirmar) {
    const { idTransaccion } = await prisma.recarga.findUniqueOrThrow({ where: { id: body.id } });
    const evento = entorno.pasarela.finalizar(idTransaccion!);
    await request(entorno.app)
      .post('/webhooks/wompi')
      .set('Content-Type', 'application/json')
      .set('X-Event-Checksum', evento.signature.checksum)
      .send(JSON.stringify(evento))
      .expect(200);
  }
  return body.id as string;
}

/** Todo el contenido de la base de la API como texto, para buscar datos personales. */
async function volcado() {
  const partes = await Promise.all(
    TABLAS.map((t) => prisma.$queryRawUnsafe<{ texto: string | null }[]>(`SELECT string_agg(t::text, ' ') AS texto FROM ${t} t`)),
  );
  return partes.map(([fila]) => fila.texto ?? '').join(' ');
}

describe('T7 · CA-1: veo mis datos y la versión de la política que acepté (pantallas 5.1 y 5.2)', () => {
  it('GET /me devuelve nombre, correo y la autorización de datos', async () => {
    const res = await conSesion(request(entorno.app).get('/me'));
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ nombre: USUARIO.nombre, correo: USUARIO.correo, politica: { version: '1.0' } });
  });
});

describe('T7 · CA-2: puedo actualizar o rectificar mis datos (Ley 1581, art. 8)', () => {
  it('cambia el nombre y queda en la auditoría', async () => {
    const res = await actualizar({ nombre: '  Viviana Andrade  ' });
    expect(res.status).toBe(200);
    expect(res.body.nombre).toBe('Viviana Andrade');
    const registro = await prisma.auditoria.findFirstOrThrow({ where: { accion: 'PERFIL_ACTUALIZADO' } });
    expect(registro.detalle).toMatchObject({ campos: 'nombre' });
  });

  it('cambia el correo con la contraseña actual, avisa al correo anterior y el nuevo sirve para ingresar', async () => {
    const res = await actualizar({ correo: 'Viviana.Nueva@RecargaMIO.test', contrasenaActual: USUARIO.contrasena });
    expect(res.status).toBe(200);
    expect(res.body.correo).toBe('viviana.nueva@recargamio.test');

    expect(entorno.correo.enviados.at(-1)).toMatchObject({ para: USUARIO.correo, asunto: 'Cambiaste el correo de tu cuenta de RecargaMIO' });
    expect((await ingresar(entorno.app, USUARIO.contrasena, 'viviana.nueva@recargamio.test')).status).toBe(200);
    expect((await ingresar(entorno.app)).status).toBe(401);
  });

  it('para cambiar el correo exige la contraseña, y debe ser la correcta', async () => {
    const sinContrasena = await actualizar({ correo: 'otro@recargamio.test' });
    expect(sinContrasena.status).toBe(400);
    expect(sinContrasena.body.error.campos).toContain('contrasenaActual');

    const equivocada = await actualizar({ correo: 'otro@recargamio.test', contrasenaActual: 'Equivocada1' });
    expect(equivocada.status).toBe(403);
    expect(equivocada.body.error.codigo).toBe('CONTRASENA_INCORRECTA');
    expect((await prisma.usuario.findFirstOrThrow()).correo).toBe(USUARIO.correo);
  });

  it('no permite usar el correo de otra cuenta', async () => {
    await registrar(entorno.app, { correo: 'ocupado@recargamio.test' });
    const res = await actualizar({ correo: 'ocupado@recargamio.test', contrasenaActual: USUARIO.contrasena });
    expect(res.status).toBe(409);
    expect(res.body.error.codigo).toBe('CORREO_REGISTRADO');
  });

  it.each([
    ['sin campos', {}],
    ['nombre muy corto', { nombre: 'V' }],
    ['correo inválido', { correo: 'no-es-correo', contrasenaActual: USUARIO.contrasena }],
  ])('rechaza la petición %s', async (_caso, cuerpo) => {
    expect((await actualizar(cuerpo)).status).toBe(400);
  });

  it('el nombre se escapa en el correo de aviso', async () => {
    await actualizar({ nombre: '<b>Viviana</b>' });
    await actualizar({ correo: 'nueva@recargamio.test', contrasenaActual: USUARIO.contrasena });
    const aviso = entorno.correo.enviados.at(-1)!;
    expect(aviso.html).toContain('&lt;b&gt;Viviana&lt;/b&gt;');
    expect(aviso.html).not.toContain('<b>Viviana</b>');
  });
});

describe('T7 · CA-3: puedo eliminar mi cuenta y se borran mis tarjetas, alertas e historial (RNF-04)', () => {
  beforeEach(async () => {
    await conSesion(request(entorno.app).put(`/tarjetas/${miTarjeta}/alerta`).send({ umbral: 50000 }));
    await conSesion(request(entorno.app).post('/dispositivos').send({ token: 'fcm_token_de_prueba:APA91b-telefono' }));
    await recargar(true);
    await request(entorno.app).post('/auth/recuperar').send({ correo: USUARIO.correo });
  });

  it('con la contraseña incorrecta no borra nada', async () => {
    const res = await eliminar('Equivocada1');
    expect(res.status).toBe(403);
    expect(res.body.error.codigo).toBe('CONTRASENA_INCORRECTA');
    expect(await prisma.tarjeta.count()).toBe(1);
    expect((await prisma.usuario.findFirstOrThrow()).eliminadoEn).toBeNull();
  });

  it('borra tarjetas, alertas, dispositivos, notificaciones y enlaces de recuperación', async () => {
    const res = await eliminar();
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ eliminada: true, tarjetas: 1, recargasAnonimizadas: 1 });

    expect(await prisma.tarjeta.count()).toBe(0);
    expect(await prisma.alerta.count()).toBe(0);
    expect(await prisma.dispositivo.count()).toBe(0);
    expect(await prisma.notificacion.count()).toBe(0);
    expect(await prisma.tokenRecuperacion.count()).toBe(0);
  });

  it('no queda el nombre, el correo ni el número completo de la tarjeta en ninguna tabla', async () => {
    await eliminar();
    const texto = await volcado();
    expect(texto).not.toContain('Viviana');
    expect(texto).not.toContain(USUARIO.correo);
    expect(texto).not.toContain('1234564821');
  });

  it('conserva, anonimizados, la recarga, la autorización de datos y la auditoría', async () => {
    await eliminar();
    expect(await prisma.usuario.findFirstOrThrow()).toMatchObject({ nombre: 'Cuenta eliminada', correo: expect.stringMatching(/@recargamio\.invalid$/) });
    expect(await prisma.recarga.findFirstOrThrow()).toMatchObject({ estado: 'ACREDITADA', monto: 10000, tarjetaId: null, numeroDestino: '••••4821' });
    expect(await prisma.autorizacionDatos.count()).toBe(1);
    const registro = await prisma.auditoria.findFirstOrThrow({ where: { accion: 'CUENTA_ELIMINADA' } });
    expect(registro.detalle).toMatchObject({ tarjetas: 1, recargasAnonimizadas: 1 });
  });

  it('envía un correo que confirma la eliminación', async () => {
    await eliminar();
    expect(entorno.correo.enviados.at(-1)).toMatchObject({ para: USUARIO.correo, asunto: 'Eliminamos tu cuenta de RecargaMIO' });
  });

  it('la tarjeta queda libre para registrarla en otra cuenta, y el recaudo no pierde el saldo', async () => {
    await eliminar();
    const otra = (await registrar(entorno.app, { correo: 'otra@recargamio.test' })).body.tokenAcceso;
    const res = await conSesion(request(entorno.app).post('/tarjetas').send({ numero: '1234564821', alias: 'Mía' }), otra);
    expect(res.status).toBe(201);
    expect(res.body.tarjeta.saldo).toBe(22400); // $12.400 + la recarga de $10.000
  });
});

describe('T7 · CA-4: después de eliminarla, la cuenta ya no se puede usar', () => {
  beforeEach(async () => {
    await eliminar();
  });

  it('el token de acceso y el de renovación dejan de servir', async () => {
    expect((await conSesion(request(entorno.app).get('/me'))).status).toBe(401);
    expect((await request(entorno.app).post('/auth/renovar').send({ tokenRenovacion: sesion.tokenRenovacion })).status).toBe(401);
  });

  it('no se puede ingresar ni recuperar la contraseña', async () => {
    expect((await ingresar(entorno.app)).status).toBe(401);
    const enviados = entorno.correo.enviados.length;
    await request(entorno.app).post('/auth/recuperar').send({ correo: USUARIO.correo }).expect(200);
    expect(entorno.correo.enviados).toHaveLength(enviados);
  });

  it('el mismo correo puede registrarse de nuevo, con una cuenta vacía', async () => {
    const nueva = await registrar(entorno.app);
    expect(nueva.status).toBe(201);
    const tarjetas = await conSesion(request(entorno.app).get('/tarjetas'), nueva.body.tokenAcceso);
    expect(tarjetas.body.registradas).toBe(0);
    expect(await prisma.autorizacionDatos.count()).toBe(2); // la nueva cuenta acepta de nuevo la política
  });
});

describe('T7 · CA-5: no se elimina la cuenta mientras hay dinero en camino', () => {
  it('con una recarga pendiente responde 409 y no borra nada', async () => {
    await recargar(false);
    const res = await eliminar();
    expect(res.status).toBe(409);
    expect(res.body.error.codigo).toBe('RECARGA_EN_CURSO');
    expect(await prisma.tarjeta.count()).toBe(1);
  });

  it('con una recarga aprobada que falta acreditar también responde 409, sin importar su antigüedad', async () => {
    const id = await recargar(false);
    await prisma.recarga.update({ where: { id }, data: { estado: 'FALLA_ACREDITACION' } });
    entorno.reloj.adelantar(3 * 24 * 60 * 60 * 1000);
    const token = (await ingresar(entorno.app)).body.tokenAcceso;
    expect((await eliminar(USUARIO.contrasena, token)).status).toBe(409);
  });

  it('una recarga pendiente abandonada hace más de 24 horas no bloquea y queda cerrada como ERROR', async () => {
    const id = await recargar(false);
    entorno.reloj.adelantar(25 * 60 * 60 * 1000);
    const token = (await ingresar(entorno.app)).body.tokenAcceso;
    expect((await eliminar(USUARIO.contrasena, token)).status).toBe(200);
    expect(await prisma.recarga.findUniqueOrThrow({ where: { id } })).toMatchObject({ estado: 'ERROR', numeroDestino: '••••4821' });
  });
});
