// HU-01 (recarga), HU-02 (PSE, Nequi o Bancolombia) y HU-04 (terceros), con pasarela simulada,
// webhook verificado y reconciliación (reglas 2, 3 y 4 de CLAUDE.md).
import request from 'supertest';
import type { EventoPasarela } from '../src/integraciones/pasarela/tipos';
import { crearEntorno, crearPrismaPruebas, limpiarBase, registrar } from './utilidades';

const prisma = crearPrismaPruebas();
let entorno = crearEntorno(prisma);
let token = '';
let miTarjeta = '';

const NEQUI_APRUEBA = { medioPago: 'NEQUI', datosMedio: { celular: '3991111111' } };
const NEQUI_RECHAZA = { medioPago: 'NEQUI', datosMedio: { celular: '3992222222' } };
const PSE = (codigoBanco: string) => ({
  medioPago: 'PSE',
  datosMedio: { tipoPersona: 'NATURAL', tipoDocumento: 'CC', numeroDocumento: '1099888777', codigoBanco, celular: '3001234567' },
});

beforeEach(async () => {
  await limpiarBase(prisma);
  entorno = crearEntorno(prisma);
  token = (await registrar(entorno.app)).body.tokenAcceso;
  miTarjeta = (await conSesion(request(entorno.app).post('/tarjetas').send({ numero: '1234564821', alias: 'Mi tarjeta' }))).body.tarjeta.id;
});
afterAll(() => prisma.$disconnect());

function conSesion(peticion: request.Test) {
  return peticion.set('Authorization', `Bearer ${token}`);
}
const recargar = (cuerpo: Record<string, unknown>) =>
  conSesion(request(entorno.app).post('/recargas').send({ tarjetaId: miTarjeta, monto: 20000, aceptaTerminosPasarela: true, ...NEQUI_APRUEBA, ...cuerpo }));
const consultar = (id: string, actualizar = false) => conSesion(request(entorno.app).get(`/recargas/${id}${actualizar ? '?actualizar=1' : ''}`));
const idTransaccion = async (id: string) => (await prisma.recarga.findUniqueOrThrow({ where: { id } })).idTransaccion!;
const enviarWebhook = (evento: EventoPasarela, checksum = evento.signature.checksum) =>
  request(entorno.app).post('/webhooks/wompi').set('Content-Type', 'application/json').set('X-Event-Checksum', checksum).send(JSON.stringify(evento));

/** La pasarela llega a su estado final y avisa por webhook, como Wompi. */
async function confirmarPorWebhook(recargaId: string) {
  const evento = entorno.pasarela.finalizar(await idTransaccion(recargaId));
  const res = await enviarWebhook(evento);
  expect(res.status).toBe(200);
  return evento;
}

describe('HU-01 · CA-1: puedo elegir una tarjeta registrada y un monto de $5.000, $10.000, $20.000 o $50.000', () => {
  it.each([5000, 10000, 20000, 50000])('acepta $%i', async (monto) => {
    const res = await recargar({ monto });
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ estado: 'PENDIENTE', monto, destino: { ultimos4: '4821', alias: 'Mi tarjeta', tercero: false } });
    expect(res.body.referencia).toMatch(/^RM-\d{6}$/);
  });

  it.each([3000, 15000, 100000, 20000.5])('rechaza el monto %p', async (monto) => {
    const res = await recargar({ monto });
    expect(res.status).toBe(400);
    expect(res.body.error.mensaje).toMatch(/\$5\.000, \$10\.000, \$20\.000 o \$50\.000/);
  });

  it('no permite recargar una tarjeta de otro usuario', async () => {
    const otro = (await registrar(entorno.app, { correo: 'otro@recargamio.test' })).body.tokenAcceso;
    const res = await request(entorno.app)
      .post('/recargas')
      .set('Authorization', `Bearer ${otro}`)
      .send({ tarjetaId: miTarjeta, monto: 5000, aceptaTerminosPasarela: true, ...NEQUI_APRUEBA });
    expect(res.status).toBe(404);
  });

  it('las referencias son consecutivas y la enviada a la pasarela lleva un sufijo propio', async () => {
    const a = await recargar({ monto: 5000 });
    const b = await recargar({ monto: 10000 });
    expect(Number(b.body.referencia.slice(3))).toBe(Number(a.body.referencia.slice(3)) + 1);
    const guardada = await prisma.recarga.findUniqueOrThrow({ where: { id: a.body.id } });
    expect(guardada.referenciaPasarela).toMatch(new RegExp(`^${a.body.referencia}-[0-9A-F]{4}$`));
  });
});

describe('HU-01 · CA-2: veo el total a pagar antes de confirmar', () => {
  it('la respuesta trae el total, igual al monto (sin comisiones en el prototipo)', async () => {
    const res = await recargar({ monto: 50000 });
    expect(res.body).toMatchObject({ monto: 50000, total: 50000 });
  });
});

describe('HU-01 · CA-3: si el pago se aprueba, veo el comprobante con la referencia y el nuevo saldo', () => {
  it('APPROVED por webhook → ACREDITADA, con comprobante y saldo acreditado en el recaudo', async () => {
    const { body } = await recargar({});
    await confirmarPorWebhook(body.id);
    const res = await consultar(body.id);
    expect(res.body).toMatchObject({
      estado: 'ACREDITADA',
      mensaje: 'Se acreditaron $20.000 a Mi tarjeta •••• 4821.',
      comprobante: { referencia: body.referencia, medioPago: 'Nequi', monto: 20000, nuevoSaldo: 32400, tarjeta: 'MIO •••• 4821' },
    });
    expect((await entorno.recaudo.consultarTarjeta('1234564821')).saldo).toBe(32400);
  });

  it('la recarga acreditada aparece en el historial de la tarjeta (HU-03)', async () => {
    const { body } = await recargar({});
    await confirmarPorWebhook(body.id);
    const mov = await conSesion(request(entorno.app).get(`/tarjetas/${miTarjeta}/movimientos?tipo=recargas`));
    expect(mov.body.movimientos[0]).toMatchObject({ tipo: 'RECARGA', valor: 20000, descripcion: 'Recarga con Nequi', referencia: body.referencia });
  });
});

describe('HU-01 · CA-4: el proceso completo tarda 180 segundos o menos', () => {
  it('registra iniciadaEn y acreditadaEn, y calcula el tiempo de recarga', async () => {
    const { body } = await recargar({});
    entorno.reloj.adelantar(12_000); // el usuario autoriza en Nequi a los 12 s
    await confirmarPorWebhook(body.id);
    const res = await consultar(body.id);
    expect(res.body.tiempoSegundos).toBe(12);
    expect(res.body.tiempoSegundos).toBeLessThanOrEqual(180);
  });
});

describe('HU-01 · CA-5: si el pago se rechaza, el saldo no cambia y se me informa', () => {
  it('DECLINED → RECHAZADA con motivo; el saldo en el recaudo no cambia', async () => {
    const { body } = await recargar(NEQUI_RECHAZA);
    await confirmarPorWebhook(body.id);
    const res = await consultar(body.id);
    expect(res.body).toMatchObject({ estado: 'RECHAZADA', motivo: expect.any(String), comprobante: null });
    expect(res.body.mensaje).toMatch(/no cambió y no se hizo ningún cobro/);
    expect((await entorno.recaudo.consultarTarjeta('1234564821')).saldo).toBe(12400);
  });

  it('un error de la pasarela termina en ERROR sin acreditar', async () => {
    const { body } = await recargar({ datosMedio: { celular: '3001112233' } });
    await confirmarPorWebhook(body.id);
    expect((await consultar(body.id)).body.estado).toBe('ERROR');
    expect((await entorno.recaudo.consultarTarjeta('1234564821')).saldo).toBe(12400);
  });
});

describe('HU-02 · CA-1: los tres medios aparecen como opciones', () => {
  it.each([
    ['NEQUI', NEQUI_APRUEBA, 'Nequi'],
    ['PSE', PSE('1'), 'PSE'],
    ['BANCOLOMBIA_TRANSFER', { medioPago: 'BANCOLOMBIA_TRANSFER' }, 'Bancolombia'],
  ])('%s inicia el pago y se acredita al aprobarse', async (_medio, cuerpo, nombre) => {
    const { body, status } = await recargar(cuerpo);
    expect(status).toBe(201);
    expect(body.medioPago).toBe(nombre);
    await confirmarPorWebhook(body.id);
    expect((await consultar(body.id)).body.estado).toBe('ACREDITADA');
  });

  it('PSE con el banco que rechaza termina en RECHAZADA', async () => {
    const { body } = await recargar(PSE('2'));
    await confirmarPorWebhook(body.id);
    expect((await consultar(body.id)).body).toMatchObject({ estado: 'RECHAZADA', motivo: 'Fondos insuficientes' });
  });

  it('GET /pasarela/bancos lista los bancos de PSE', async () => {
    const res = await conSesion(request(entorno.app).get('/pasarela/bancos'));
    expect(res.body.bancos).toEqual([{ codigo: '1', nombre: 'Banco que aprueba' }, { codigo: '2', nombre: 'Banco que rechaza' }]);
  });

  it('rechaza un medio de pago desconocido', async () => {
    expect((await recargar({ medioPago: 'EFECTIVO' })).status).toBe(400);
  });
});

describe('HU-02 · CA-2: la autorización del pago ocurre en el banco o la billetera, no en la aplicación', () => {
  it('Nequi: la app indica autorizar en la app de Nequi', async () => {
    const { body } = await recargar({});
    expect(body.mensaje).toBe('Autoriza el pago de $20.000 en la app de Nequi. No cierres esta pantalla.');
    expect(body.urlPago).toBeNull();
  });

  it.each([['PSE', PSE('1')], ['Bancolombia', { medioPago: 'BANCOLOMBIA_TRANSFER' }]])('%s: devuelve la URL del banco donde se autoriza', async (_m, cuerpo) => {
    const { body } = await recargar(cuerpo);
    expect(body.urlPago).toMatch(/^http:\/\/localhost:3000\/pasarela-simulada\/banco\//);
    expect(body.mensaje).toMatch(/página de tu banco/);
  });

  it('exige aceptar los términos y la autorización de datos de la pasarela', async () => {
    const res = await recargar({ aceptaTerminosPasarela: undefined });
    expect(res.status).toBe(400);
    expect(res.body.error.codigo).toBe('TERMINOS_PASARELA_NO_ACEPTADOS');
    expect((await conSesion(request(entorno.app).get('/pasarela/terminos'))).body).toMatchObject({ aceptacion: expect.any(String), datosPersonales: expect.any(String) });
  });
});

describe('HU-02 · CA-3: la aplicación no pide ni guarda datos bancarios', () => {
  it('el celular de Nequi y el documento de PSE no quedan en la base (recargas, eventos ni auditoría)', async () => {
    const nequi = await recargar({ datosMedio: { celular: '3991111111' } });
    const pse = await recargar(PSE('1'));
    await confirmarPorWebhook(nequi.body.id);
    await confirmarPorWebhook(pse.body.id);
    const todo = JSON.stringify([
      await prisma.recarga.findMany(),
      await prisma.transaccionPasarela.findMany(),
      await prisma.auditoria.findMany(),
    ]);
    for (const dato of ['3991111111', '1099888777', '3001234567']) expect(todo).not.toContain(dato);
  });
});

describe('HU-02 · CA-4: mientras el pago está pendiente, veo ese estado en pantalla', () => {
  it('GET /recargas/:id responde PENDIENTE hasta que la pasarela confirme', async () => {
    const { body } = await recargar({});
    expect((await consultar(body.id)).body).toMatchObject({ estado: 'PENDIENTE', comprobante: null });
  });
});

describe('HU-04 · CA-1: ingreso el número de la tarjeta y lo confirmo antes de pagar', () => {
  const tercero = (extra: Record<string, unknown> = {}) => recargar({ tarjetaId: undefined, numeroDestino: '9087654321', confirmacionNumero: '9087654321', monto: 10000, ...extra });

  it('recarga la tarjeta de un tercero y la acredita', async () => {
    const { body } = await tercero();
    expect(body.destino).toEqual({ ultimos4: '4321', alias: null, tercero: true });
    await confirmarPorWebhook(body.id);
    expect((await entorno.recaudo.consultarTarjeta('9087654321')).saldo).toBe(11000);
  });

  it('si la confirmación no coincide, no inicia el pago (400 NUMEROS_NO_COINCIDEN)', async () => {
    const res = await tercero({ confirmacionNumero: '9087654322' });
    expect(res.status).toBe(400);
    expect(res.body.error.codigo).toBe('NUMEROS_NO_COINCIDEN');
    expect(await prisma.recarga.count()).toBe(0);
  });

  it('valida el número del tercero con el recaudo antes de cobrar', async () => {
    expect((await tercero({ numeroDestino: '5555555555', confirmacionNumero: '5555555555' })).body.error.codigo).toBe('TARJETA_NO_EXISTE');
    expect((await tercero({ numeroDestino: '1234560009', confirmacionNumero: '1234560009' })).body.error.codigo).toBe('TARJETA_INACTIVA');
    expect(await prisma.recarga.count()).toBe(0);
  });

  it('exige elegir una tarjeta propia o escribir la del tercero, no ambas', async () => {
    expect((await recargar({ numeroDestino: '9087654321', confirmacionNumero: '9087654321' })).status).toBe(400);
  });

  describe('HU-04 · CA-2: la tarjeta no queda guardada, salvo que yo lo solicite', () => {
    it('por defecto no la guarda', async () => {
      await tercero();
      expect((await conSesion(request(entorno.app).get('/tarjetas'))).body.registradas).toBe(1);
    });

    it('con guardarTarjeta la agrega a la cuenta con el nombre elegido', async () => {
      const { body } = await tercero({ guardarTarjeta: true, aliasTarjeta: 'Tarjeta de Juan' });
      expect(body.destino).toMatchObject({ alias: 'Tarjeta de Juan', ultimos4: '4321' });
      const lista = (await conSesion(request(entorno.app).get('/tarjetas'))).body;
      expect(lista.registradas).toBe(2);
      expect(lista.tarjetas.map((t: { alias: string }) => t.alias)).toContain('Tarjeta de Juan');
    });
  });

  describe('HU-04 · CA-3: el comprobante muestra la tarjeta de destino con el número enmascarado', () => {
    it('el comprobante muestra MIO •••• 4321 y nunca el número completo', async () => {
      const { body } = await tercero();
      await confirmarPorWebhook(body.id);
      const res = await consultar(body.id);
      expect(res.body.comprobante.tarjeta).toBe('MIO •••• 4321');
      expect(JSON.stringify(res.body)).not.toContain('9087654321');
    });
  });
});

describe('Webhook de la pasarela (regla 4)', () => {
  it('un checksum falso responde 401 y no cambia la recarga', async () => {
    const { body } = await recargar({});
    const evento = entorno.pasarela.finalizar(await idTransaccion(body.id));
    const res = await enviarWebhook(evento, 'A'.repeat(64));
    expect(res.status).toBe(401);
    expect(res.body.error.codigo).toBe('FIRMA_INVALIDA');
    expect((await consultar(body.id)).body.estado).toBe('PENDIENTE');
    expect((await prisma.auditoria.findMany()).map((a) => a.accion)).toContain('WEBHOOK_RECHAZADO');
  });

  it('un evento alterado (otro estado con la firma original) responde 401', async () => {
    const { body } = await recargar(NEQUI_RECHAZA);
    const evento = entorno.pasarela.finalizar(await idTransaccion(body.id));
    evento.data.transaction.status = 'APPROVED';
    expect((await enviarWebhook(evento)).status).toBe(401);
    expect((await entorno.recaudo.consultarTarjeta('1234564821')).saldo).toBe(12400);
  });

  it('el mismo evento recibido tres veces acredita una sola vez (RNF-02)', async () => {
    const { body } = await recargar({});
    const evento = await confirmarPorWebhook(body.id);
    await enviarWebhook(evento);
    await enviarWebhook(evento);
    expect((await entorno.recaudo.consultarTarjeta('1234564821')).saldo).toBe(32400);
    expect(await prisma.transaccionPasarela.count({ where: { recargaId: body.id, estado: 'APPROVED' } })).toBe(1);
  });

  it('si el monto aprobado no coincide, no acredita', async () => {
    const { body } = await recargar({});
    const evento = entorno.pasarela.finalizar(await idTransaccion(body.id));
    evento.data.transaction.amount_in_cents = 100;
    const { checksumEvento } = await import('../src/integraciones/pasarela/firmas');
    evento.signature.checksum = checksumEvento(evento, 'test_events_simulado_local');
    expect((await enviarWebhook(evento)).status).toBe(200);
    expect((await consultar(body.id)).body.estado).toBe('ERROR');
    expect((await entorno.recaudo.consultarTarjeta('1234564821')).saldo).toBe(12400);
  });

  it('responde 200 sin procesar un evento de una referencia desconocida', async () => {
    const { body } = await recargar({});
    const evento = entorno.pasarela.finalizar(await idTransaccion(body.id));
    await prisma.recarga.update({ where: { id: body.id }, data: { referenciaPasarela: 'OTRA-REFERENCIA' } });
    expect((await enviarWebhook(evento)).body).toEqual({ recibido: true, procesado: false });
  });
});

describe('Reconciliación (decisión D8): funciona aunque el webhook no llegue', () => {
  it('confirma y acredita una recarga aprobada cuyo webhook se perdió', async () => {
    const { body } = await recargar({});
    entorno.pasarela.finalizar(await idTransaccion(body.id)); // la pasarela aprobó, pero el webhook no llega
    entorno.reloj.adelantar(25_000);
    await entorno.app.recargas.reconciliar();
    expect((await consultar(body.id)).body).toMatchObject({ estado: 'ACREDITADA', tiempoSegundos: 25 });
  });

  it('no consulta recargas de menos de 20 segundos', async () => {
    const { body } = await recargar({});
    entorno.pasarela.finalizar(await idTransaccion(body.id));
    entorno.reloj.adelantar(5_000);
    expect((await entorno.app.recargas.reconciliar()).consultadas).toBe(0);
    expect((await consultar(body.id)).body.estado).toBe('PENDIENTE');
  });

  it('«Actualizar estado» (?actualizar=1) consulta la pasarela de inmediato', async () => {
    const { body } = await recargar({});
    entorno.pasarela.finalizar(await idTransaccion(body.id));
    expect((await consultar(body.id, true)).body.estado).toBe('ACREDITADA');
  });

  it('si el recaudo falla después del pago, queda FALLA_ACREDITACION y se reintenta sin cobrar de nuevo', async () => {
    const { body } = await recargar({});
    entorno.recaudo.estado.caido = true;
    await confirmarPorWebhook(body.id);
    const fallida = (await consultar(body.id)).body;
    expect(fallida.estado).toBe('FALLA_ACREDITACION');
    expect(fallida.mensaje).toMatch(/No necesitas pagar de nuevo/);

    entorno.recaudo.estado.caido = false;
    await entorno.app.recargas.reconciliar();
    await entorno.app.recargas.reconciliar(); // repetirla no suma dos veces
    expect((await consultar(body.id)).body.estado).toBe('ACREDITADA');
    expect((await entorno.recaudo.consultarTarjeta('1234564821')).saldo).toBe(32400);
  });
});

describe('Protecciones adicionales', () => {
  it('doble clic en «Pagar»: una segunda recarga idéntica pendiente responde 409 RECARGA_EN_CURSO', async () => {
    const primera = await recargar({});
    const segunda = await recargar({});
    expect(segunda.status).toBe(409);
    expect(segunda.body.error).toMatchObject({ codigo: 'RECARGA_EN_CURSO', recargaId: primera.body.id });
  });

  it('pasado un minuto sí permite otra recarga igual', async () => {
    await recargar({});
    entorno.reloj.adelantar(61_000);
    expect((await recargar({})).status).toBe(201);
  });

  it('la recarga de otro usuario responde 404', async () => {
    const { body } = await recargar({});
    const otro = (await registrar(entorno.app, { correo: 'otro@recargamio.test' })).body.tokenAcceso;
    expect((await request(entorno.app).get(`/recargas/${body.id}`).set('Authorization', `Bearer ${otro}`)).status).toBe(404);
  });

  it('registra el inicio y la acreditación en la auditoría (RF-12)', async () => {
    const { body } = await recargar({});
    await confirmarPorWebhook(body.id);
    const acciones = (await prisma.auditoria.findMany()).map((a) => a.accion);
    expect(acciones).toEqual(expect.arrayContaining(['RECARGA_INICIADA', 'RECARGA_ACREDITADA']));
  });
});
