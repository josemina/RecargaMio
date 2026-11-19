// HU-05 · Alertas de saldo bajo (Tabla 13 del documento maestro) y bandeja de notificaciones (ADR 0014).
import request from 'supertest';
import { VENTANA_AVISO_MS } from '../src/modulos/alertas/servicio';
import { configPruebas, crearEntorno, crearPrismaPruebas, limpiarBase, registrar } from './utilidades';

const prisma = crearPrismaPruebas();
let entorno = crearEntorno(prisma);
let token = '';
let miTarjeta = '';
let tarjetaMama = '';

const TOKEN_FCM = 'fcm_token_de_prueba:APA91bH-telefono-android-123';
const MAMA = '1234567730'; // saldo semilla $3.200, como en Figma

beforeEach(async () => {
  await limpiarBase(prisma);
  entorno = crearEntorno(prisma);
  token = (await registrar(entorno.app)).body.tokenAcceso;
  miTarjeta = (await conSesion(request(entorno.app).post('/tarjetas').send({ numero: '1234564821', alias: 'Mi tarjeta' }))).body.tarjeta.id;
  tarjetaMama = (await conSesion(request(entorno.app).post('/tarjetas').send({ numero: MAMA, alias: 'Tarjeta de mamá' }))).body.tarjeta.id;
});
afterAll(() => prisma.$disconnect());

function conSesion(peticion: request.Test, conToken = token) {
  return peticion.set('Authorization', `Bearer ${conToken}`);
}
const configurar = (tarjetaId: string, cuerpo: Record<string, unknown>, conToken = token) =>
  conSesion(request(entorno.app).put(`/tarjetas/${tarjetaId}/alerta`).send(cuerpo), conToken);
const listarTarjetas = () => conSesion(request(entorno.app).get('/tarjetas'));
const bandeja = (conToken = token) => conSesion(request(entorno.app).get('/notificaciones'), conToken);
const registrarTelefono = (tokenFcm = TOKEN_FCM, conToken = token) =>
  conSesion(request(entorno.app).post('/dispositivos').send({ token: tokenFcm, plataforma: 'android' }), conToken);
/** Lo que hace el recaudo después de cada viaje. */
const avisarViaje = (numero = MAMA, llave = configPruebas.RECAUDO_API_KEY) =>
  request(entorno.app).post('/internos/recaudo/viajes').set('X-Api-Key', llave).send({ numero });

describe('HU-05 · CA-1: puedo fijar un valor de alerta por cada tarjeta', () => {
  it('guarda un valor distinto para cada tarjeta y lo devuelve en la lista', async () => {
    const res = await configurar(miTarjeta, { umbral: 10000, activa: true });
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ id: miTarjeta, alerta: { umbral: 10000, activa: true }, saldo: 12400, saldoBajo: false });
    await configurar(tarjetaMama, { umbral: 3500 });

    const { tarjetas } = (await listarTarjetas()).body;
    expect(tarjetas.map((t: { alerta: unknown }) => t.alerta)).toEqual([
      { umbral: 10000, activa: true },
      { umbral: 3500, activa: true },
    ]);
  });

  it('acepta los extremos $3.500 y $50.000', async () => {
    expect((await configurar(miTarjeta, { umbral: 3500 })).status).toBe(200);
    expect((await configurar(miTarjeta, { umbral: 50000 })).status).toBe(200);
  });

  it.each([3000, 50100, 5000.5, '5000', undefined])('rechaza el valor %p', async (umbral) => {
    const res = await configurar(miTarjeta, { umbral, activa: true });
    expect(res.status).toBe(400);
    expect(res.body.error.codigo).toBe('DATOS_INVALIDOS');
    expect(res.body.error.campos).toContain('umbral');
  });

  it('no permite configurar la alerta de una tarjeta de otra cuenta', async () => {
    const otro = (await registrar(entorno.app, { correo: 'otro@recargamio.test' })).body.tokenAcceso;
    const res = await configurar(tarjetaMama, { umbral: 5000 }, otro);
    expect(res.status).toBe(404);
    expect(await prisma.alerta.count()).toBe(0);
  });

  it('exige sesión y deja el cambio en la auditoría', async () => {
    expect((await request(entorno.app).put(`/tarjetas/${miTarjeta}/alerta`).send({ umbral: 5000 })).status).toBe(401);
    await configurar(miTarjeta, { umbral: 5000 });
    const registro = await prisma.auditoria.findFirstOrThrow({ where: { accion: 'ALERTA_CONFIGURADA' } });
    expect(registro.detalle).toMatchObject({ tarjetaId: miTarjeta, ultimos4: '4821', umbral: 5000, activa: true });
  });
});

describe('HU-05 · CA-2: recibo una notificación en el teléfono cuando el saldo queda por debajo', () => {
  beforeEach(async () => {
    await configurar(tarjetaMama, { umbral: 5000 });
    await registrarTelefono();
  });

  it('aceptación de T6: un viaje sobre la tarjeta de mamá dispara el aviso al teléfono y a la bandeja', async () => {
    entorno.recaudo.fijarSaldo(MAMA, -300); // $3.200 − pasaje de $3.500
    const res = await avisarViaje();
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ revisadas: 1, avisos: 1, sinSaldo: 0 });

    expect(entorno.push.enviados).toEqual([
      {
        token: TOKEN_FCM,
        mensaje: {
          titulo: 'Saldo bajo en Tarjeta de mamá',
          cuerpo: 'Te quedan -$300, no alcanza para un pasaje. Toca para recargarla.',
          datos: expect.objectContaining({ tipo: 'SALDO_BAJO', tarjetaId: tarjetaMama }),
        },
      },
    ]);
    const { body } = await bandeja();
    expect(body.noLeidas).toBe(1);
    expect(body.notificaciones[0]).toMatchObject({ tipo: 'SALDO_BAJO', titulo: 'Saldo bajo en Tarjeta de mamá', leida: false, datos: { tarjetaId: tarjetaMama } });
    expect(await prisma.notificacion.findFirstOrThrow()).toMatchObject({ enviadaPush: true });
  });

  it('ajusta el texto de la pantalla 4.3 según el saldo que queda', async () => {
    await entorno.app.alertas.revisarTodas();
    expect(entorno.push.enviados[0].mensaje).toMatchObject({
      titulo: 'Saldo bajo en Tarjeta de mamá',
      cuerpo: 'Te quedan $3.200, no alcanza para un pasaje. Toca para recargarla.',
    });
    await configurar(miTarjeta, { umbral: 50000 });
    entorno.recaudo.fijarSaldo('1234564821', 6000);
    await entorno.app.alertas.revisarTodas();
    expect(entorno.push.enviados[1].mensaje.cuerpo).toBe('Te quedan $6.000, menos de un pasaje de ida y vuelta. Toca para recargarla.');
  });

  it('si el saldo sigue por encima del valor elegido no avisa', async () => {
    entorno.recaudo.fijarSaldo(MAMA, 5000); // igual al umbral: no está «por debajo»
    expect((await avisarViaje()).body.avisos).toBe(0);
    expect(entorno.push.enviados).toHaveLength(0);
    expect(await prisma.notificacion.count()).toBe(0);
  });

  it('máximo un aviso cada 12 horas por tarjeta', async () => {
    await avisarViaje();
    entorno.reloj.adelantar(VENTANA_AVISO_MS - 60_000);
    await avisarViaje();
    await entorno.app.alertas.revisarTodas();
    expect(await prisma.notificacion.count()).toBe(1);

    entorno.reloj.adelantar(60_000);
    await avisarViaje();
    expect(await prisma.notificacion.count()).toBe(2);
  });

  it('si varias revisiones coinciden, se envía un solo aviso', async () => {
    await Promise.all([entorno.app.alertas.revisarTodas(), avisarViaje(), entorno.app.alertas.revisarTodas(), avisarViaje()]);
    expect(await prisma.notificacion.count()).toBe(1);
    expect(entorno.push.enviados).toHaveLength(1);
  });

  it('cambiar el valor de la alerta reinicia la ventana de 12 horas', async () => {
    await avisarViaje();
    await configurar(tarjetaMama, { umbral: 10000 });
    await avisarViaje();
    expect(await prisma.notificacion.count()).toBe(2);

    await configurar(tarjetaMama, { umbral: 10000 }); // mismo valor: no reinicia
    await avisarViaje();
    expect(await prisma.notificacion.count()).toBe(2);
  });

  it('avisa a cada cuenta que tenga registrada la misma tarjeta, con su propio nombre', async () => {
    const hija = (await registrar(entorno.app, { correo: 'hija@recargamio.test' })).body.tokenAcceso;
    const { body } = await conSesion(request(entorno.app).post('/tarjetas').send({ numero: MAMA, alias: 'Mamá' }), hija);
    await configurar(body.tarjeta.id, { umbral: 5000 }, hija);

    expect((await avisarViaje()).body).toMatchObject({ revisadas: 2, avisos: 2 });
    expect((await bandeja(hija)).body.notificaciones[0].titulo).toBe('Saldo bajo en Mamá');
    expect((await bandeja()).body.notificaciones[0].titulo).toBe('Saldo bajo en Tarjeta de mamá');
  });

  it('sin teléfono registrado el aviso queda en la bandeja de la app (FCM no configurado, ADR 0007)', async () => {
    await conSesion(request(entorno.app).delete('/dispositivos').send({ token: TOKEN_FCM })).expect(204);
    await avisarViaje();
    expect(entorno.push.enviados).toHaveLength(0);
    expect(await prisma.notificacion.findFirstOrThrow()).toMatchObject({ tipo: 'SALDO_BAJO', enviadaPush: false });
  });

  it('si FCM falla, el aviso igual queda en la bandeja', async () => {
    entorno.push.estado.caido = true;
    expect((await avisarViaje()).body.avisos).toBe(1);
    expect((await bandeja()).body.noLeidas).toBe(1);
  });

  it('borra los tokens que FCM ya no reconoce', async () => {
    entorno.push.invalidos.add(TOKEN_FCM);
    await avisarViaje();
    expect(await prisma.dispositivo.count()).toBe(0);
  });

  it('si el recaudo no responde, la revisión no falla y lo intenta en la siguiente', async () => {
    entorno.recaudo.estado.caido = true;
    expect(await entorno.app.alertas.revisarTodas()).toEqual({ revisadas: 1, avisos: 0, sinSaldo: 1 });
    entorno.recaudo.estado.caido = false;
    expect((await entorno.app.alertas.revisarTodas()).avisos).toBe(1);
  });

  it('no revisa tarjetas eliminadas', async () => {
    await conSesion(request(entorno.app).delete(`/tarjetas/${tarjetaMama}`)).expect(204);
    expect((await avisarViaje()).body).toMatchObject({ revisadas: 0, avisos: 0 });
  });

  it('el aviso no lleva el número de la tarjeta, solo su identificador', async () => {
    await avisarViaje();
    const texto = JSON.stringify([await prisma.notificacion.findMany(), entorno.push.enviados]);
    expect(texto).not.toContain(MAMA);
  });
});

describe('HU-05 · CA-3: la tarjeta muestra la etiqueta «Saldo bajo» en el inicio', () => {
  it('aparece cuando el saldo está por debajo del valor elegido', async () => {
    await configurar(tarjetaMama, { umbral: 5000 });
    await configurar(miTarjeta, { umbral: 5000 });
    const { tarjetas } = (await listarTarjetas()).body;
    expect(tarjetas.map((t: { alias: string; saldoBajo: boolean }) => [t.alias, t.saldoBajo])).toEqual([
      ['Mi tarjeta', false],
      ['Tarjeta de mamá', true],
    ]);
  });
});

describe('HU-05 · CA-4: puedo desactivar la alerta', () => {
  beforeEach(() => configurar(tarjetaMama, { umbral: 5000 }));

  it('desactivada, conserva el valor, quita la etiqueta y no envía avisos', async () => {
    const res = await configurar(tarjetaMama, { umbral: 5000, activa: false });
    expect(res.body).toMatchObject({ alerta: { umbral: 5000, activa: false }, saldoBajo: false });
    expect((await avisarViaje()).body).toMatchObject({ revisadas: 0, avisos: 0 });
    expect((await entorno.app.alertas.revisarTodas()).avisos).toBe(0);
    expect(await prisma.notificacion.count()).toBe(0);
  });

  it('al volver a activarla avisa de nuevo aunque no hayan pasado 12 horas', async () => {
    await avisarViaje();
    await configurar(tarjetaMama, { umbral: 5000, activa: false });
    await configurar(tarjetaMama, { umbral: 5000, activa: true });
    await avisarViaje();
    expect(await prisma.notificacion.count()).toBe(2);
  });
});

describe('Aviso interno del recaudo (POST /internos/recaudo/viajes)', () => {
  it('exige la llave compartida del recaudo', async () => {
    expect((await request(entorno.app).post('/internos/recaudo/viajes').send({ numero: MAMA })).status).toBe(401);
    const res = await avisarViaje(MAMA, 'llave-equivocada-1234567');
    expect(res.status).toBe(401);
    expect(res.body.error.codigo).toBe('NO_AUTORIZADO');
  });

  it('valida el número de la tarjeta', async () => {
    expect((await avisarViaje('12345')).status).toBe(400);
  });

  it('un número sin alertas no hace nada', async () => {
    expect((await avisarViaje('9087654321')).body).toEqual({ revisadas: 0, avisos: 0, sinSaldo: 0 });
  });
});

describe('Dispositivos (POST y DELETE /dispositivos)', () => {
  it('registra el token de FCM del teléfono Android', async () => {
    const res = await registrarTelefono();
    expect(res.status).toBe(201);
    expect(res.body).toEqual({ registrado: true, envioPush: true });
    expect(await prisma.dispositivo.findFirstOrThrow()).toMatchObject({ tokenFcm: TOKEN_FCM, plataforma: 'android' });
  });

  it('registrar el mismo token dos veces no lo duplica', async () => {
    await registrarTelefono();
    await registrarTelefono();
    expect(await prisma.dispositivo.count()).toBe(1);
  });

  it('si el teléfono cambia de cuenta, el token pasa a la cuenta nueva', async () => {
    await registrarTelefono();
    const otro = (await registrar(entorno.app, { correo: 'otro@recargamio.test' })).body;
    await registrarTelefono(TOKEN_FCM, otro.tokenAcceso);
    expect(await prisma.dispositivo.findFirstOrThrow()).toMatchObject({ usuarioId: otro.usuario.id });
  });

  it.each([
    ['token vacío', { token: '' }],
    ['token con caracteres extraños', { token: 'abc def <script>alert(1)</script>' }],
    ['plataforma iOS (fuera del PMV)', { token: TOKEN_FCM, plataforma: 'ios' }],
  ])('rechaza %s', async (_caso, cuerpo) => {
    const res = await conSesion(request(entorno.app).post('/dispositivos').send(cuerpo));
    expect(res.status).toBe(400);
  });

  it('al cerrar sesión la app quita el token; no puede quitar el de otra cuenta', async () => {
    await registrarTelefono();
    const otro = (await registrar(entorno.app, { correo: 'otro@recargamio.test' })).body.tokenAcceso;
    await conSesion(request(entorno.app).delete('/dispositivos').send({ token: TOKEN_FCM }), otro).expect(204);
    expect(await prisma.dispositivo.count()).toBe(1);
    await conSesion(request(entorno.app).delete('/dispositivos').send({ token: TOKEN_FCM })).expect(204);
    expect(await prisma.dispositivo.count()).toBe(0);
  });
});

describe('Bandeja de notificaciones (GET /notificaciones)', () => {
  beforeEach(async () => {
    await configurar(tarjetaMama, { umbral: 5000 });
    await avisarViaje();
  });

  it('marca una notificación como leída; no deja tocar las de otra cuenta', async () => {
    const id = (await bandeja()).body.notificaciones[0].id;
    const otro = (await registrar(entorno.app, { correo: 'otro@recargamio.test' })).body.tokenAcceso;
    expect((await conSesion(request(entorno.app).post(`/notificaciones/${id}/leida`), otro)).status).toBe(404);
    expect((await bandeja(otro)).body).toEqual({ noLeidas: 0, notificaciones: [] });

    await conSesion(request(entorno.app).post(`/notificaciones/${id}/leida`)).expect(204);
    expect((await bandeja()).body).toMatchObject({ noLeidas: 0, notificaciones: [{ id, leida: true }] });
  });

  it('marca todas como leídas y filtra las no leídas', async () => {
    await configurar(miTarjeta, { umbral: 50000 });
    await entorno.app.alertas.revisarTodas();
    expect((await bandeja()).body.noLeidas).toBe(2);
    expect((await conSesion(request(entorno.app).post('/notificaciones/leidas'))).body).toEqual({ marcadas: 2 });
    expect((await conSesion(request(entorno.app).get('/notificaciones?soloNoLeidas=1'))).body.notificaciones).toEqual([]);
  });
});

describe('Aviso de «Recarga exitosa» (pantalla 4.3)', () => {
  it('al acreditar una recarga queda el aviso con el monto y la tarjeta', async () => {
    await registrarTelefono();
    const { body } = await conSesion(
      request(entorno.app)
        .post('/recargas')
        .send({ tarjetaId: miTarjeta, monto: 20000, aceptaTerminosPasarela: true, medioPago: 'NEQUI', datosMedio: { celular: '3991111111' } }),
    );
    const { idTransaccion } = await prisma.recarga.findUniqueOrThrow({ where: { id: body.id } });
    const evento = entorno.pasarela.finalizar(idTransaccion!);
    await request(entorno.app)
      .post('/webhooks/wompi')
      .set('Content-Type', 'application/json')
      .set('X-Event-Checksum', evento.signature.checksum)
      .send(JSON.stringify(evento))
      .expect(200);

    const aviso = (await bandeja()).body.notificaciones[0];
    expect(aviso).toMatchObject({ tipo: 'RECARGA_EXITOSA', titulo: 'Recarga exitosa', cuerpo: 'Se acreditaron $20.000 a Mi tarjeta •••• 4821.', datos: { recargaId: body.id } });
    expect(entorno.push.enviados.map((e) => e.mensaje.titulo)).toEqual(['Recarga exitosa']);
  });
});
