// HU-03 · CA-2 y CA-3: historial de recargas y viajes con fecha y valor, filtrable por tipo.
import request from 'supertest';
import { crearEntorno, crearPrismaPruebas, limpiarBase, registrar } from './utilidades';

const prisma = crearPrismaPruebas();
let entorno = crearEntorno(prisma);
let token = '';
let tarjetaId = '';

const fecha = (texto: string) => new Date(`2026-10-${texto}Z`);

beforeEach(async () => {
  await limpiarBase(prisma);
  entorno = crearEntorno(prisma);
  const registro = await registrar(entorno.app);
  token = registro.body.tokenAcceso;
  tarjetaId = (await request(entorno.app).post('/tarjetas').set('Authorization', `Bearer ${token}`).send({ numero: '1234564821', alias: 'Mi tarjeta' })).body.tarjeta.id;

  // Mismos movimientos que la pantalla 4.1 de Figma
  const recarga = (referencia: string, monto: number, medioPago: 'NEQUI' | 'PSE', acreditadaEn: Date, estado: 'ACREDITADA' | 'RECHAZADA' = 'ACREDITADA') =>
    prisma.recarga.create({
      data: { referencia, referenciaPasarela: `${referencia}-PRB1`, usuarioId: registro.body.usuario.id, tarjetaId, numeroDestino: '1234564821', monto, medioPago, estado, acreditadaEn: estado === 'ACREDITADA' ? acreditadaEn : null },
    });
  await recarga('RM-000123', 20000, 'NEQUI', fecha('24T19:45:00'));
  await recarga('RM-000110', 10000, 'PSE', fecha('20T17:10:00'));
  await recarga('RM-000125', 50000, 'PSE', fecha('23T10:00:00'), 'RECHAZADA');
  entorno.recaudo.agregarViaje('1234564821', { ruta: 'Est. Universidades', valor: 3500, fecha: fecha('24T06:52:00') });
  entorno.recaudo.agregarViaje('1234564821', { ruta: 'Term. Paso del Comercio', valor: 3500, fecha: fecha('20T06:40:00') });
  entorno.recaudo.agregarViaje('1234564821', { ruta: 'Est. Universidades', valor: 3500, fecha: fecha('19T18:55:00') });
});
afterAll(() => prisma.$disconnect());

const movimientos = (query: Record<string, string | number> = {}) =>
  request(entorno.app).get(`/tarjetas/${tarjetaId}/movimientos`).query(query).set('Authorization', `Bearer ${token}`);

describe('HU-03 · CA-2: el historial lista recargas y viajes con fecha y valor', () => {
  it('une recargas acreditadas y viajes, del más reciente al más antiguo', async () => {
    const res = await movimientos();
    expect(res.status).toBe(200);
    expect(res.body.movimientos).toEqual([
      { tipo: 'RECARGA', fecha: '2026-10-24T19:45:00.000Z', valor: 20000, descripcion: 'Recarga con Nequi', referencia: 'RM-000123' },
      { tipo: 'VIAJE', fecha: '2026-10-24T06:52:00.000Z', valor: -3500, descripcion: 'Viaje · Est. Universidades' },
      { tipo: 'RECARGA', fecha: '2026-10-20T17:10:00.000Z', valor: 10000, descripcion: 'Recarga con PSE', referencia: 'RM-000110' },
      { tipo: 'VIAJE', fecha: '2026-10-20T06:40:00.000Z', valor: -3500, descripcion: 'Viaje · Term. Paso del Comercio' },
      { tipo: 'VIAJE', fecha: '2026-10-19T18:55:00.000Z', valor: -3500, descripcion: 'Viaje · Est. Universidades' },
    ]);
  });

  it('no incluye recargas rechazadas (no cambiaron el saldo)', async () => {
    const referencias = (await movimientos()).body.movimientos.map((m: { referencia?: string }) => m.referencia);
    expect(referencias).not.toContain('RM-000125');
  });

  it('pagina con limite y siguienteCursor sin repetir ni saltar movimientos', async () => {
    const primera = await movimientos({ limite: 2 });
    expect(primera.body.movimientos).toHaveLength(2);
    expect(primera.body.siguienteCursor).toBe('2026-10-24T06:52:00.000Z');

    const segunda = await movimientos({ limite: 2, antesDe: primera.body.siguienteCursor });
    expect(segunda.body.movimientos.map((m: { fecha: string }) => m.fecha)).toEqual(['2026-10-20T17:10:00.000Z', '2026-10-20T06:40:00.000Z']);

    const tercera = await movimientos({ limite: 2, antesDe: segunda.body.siguienteCursor });
    expect(tercera.body.movimientos).toHaveLength(1);
    expect(tercera.body.siguienteCursor).toBeNull();
  });

  it('si el recaudo no responde, muestra las recargas y un aviso', async () => {
    entorno.recaudo.estado.caido = true;
    const res = await movimientos();
    expect(res.status).toBe(200);
    expect(res.body.aviso).toMatch(/viajes/);
    expect(res.body.movimientos.every((m: { tipo: string }) => m.tipo === 'RECARGA')).toBe(true);
  });
});

describe('HU-03 · CA-3: puedo filtrar por todo, recargas o viajes', () => {
  it.each([
    ['todo', 5, ['RECARGA', 'VIAJE']],
    ['recargas', 2, ['RECARGA']],
    ['viajes', 3, ['VIAJE']],
  ])('?tipo=%s', async (tipo, cantidad, tipos) => {
    const res = await movimientos({ tipo: tipo as string });
    expect(res.body.tipo).toBe(tipo);
    expect(res.body.movimientos).toHaveLength(cantidad as number);
    expect([...new Set(res.body.movimientos.map((m: { tipo: string }) => m.tipo))].sort()).toEqual(tipos);
  });

  it('rechaza un filtro desconocido', async () => {
    const res = await movimientos({ tipo: 'pagos' });
    expect(res.status).toBe(400);
    expect(res.body.error.codigo).toBe('DATOS_INVALIDOS');
  });

  it('el historial de una tarjeta ajena responde 404', async () => {
    const intruso = (await registrar(entorno.app, { correo: 'intruso@recargamio.test' })).body.tokenAcceso;
    const res = await request(entorno.app).get(`/tarjetas/${tarjetaId}/movimientos`).set('Authorization', `Bearer ${intruso}`);
    expect(res.status).toBe(404);
  });
});
