// Firmas de Wompi y validación de credenciales de prueba (reglas 1 y 4 de CLAUDE.md).
import { createHash } from 'node:crypto';
import { cargarConfiguracion } from '../src/config';
import { checksumEvento, firmaIntegridad, verificarEvento } from '../src/integraciones/pasarela/firmas';
import { crearPasarelaSimulada } from '../src/integraciones/pasarela/simulada';

describe('Firma de integridad', () => {
  it('coincide con el ejemplo de la documentación de Wompi', () => {
    // https://docs.wompi.co/docs/colombia/widget-checkout-web/ (Paso 3)
    // Excepción revisada a la regla 1 de CLAUDE.md: el secreto «prod_integrity_…» es el ejemplo público de esa página,
    // no una llave del proyecto ni de nadie. Se deja para comparar la firma con el valor que publica Wompi.
    expect(firmaIntegridad('sk8-438k4-xmxm392-sn2m', 2490000, 'prod_integrity_Z5mMke9x0k8gpErbDqwrJXMqsI6SFli6')).toBe(
      '37c8407747e595535433ef8f6a811d853cd943046624a0ec04662b17bbf33bf5',
    );
  });
});

describe('Checksum de eventos', () => {
  const secreto = 'test_events_secreto_de_prueba';
  const evento = {
    event: 'transaction.updated',
    data: { transaction: { id: '1234-1610641025-49201', status: 'APPROVED' as const, amount_in_cents: 4490000, reference: 'RM-000001-AB12' } },
    environment: 'test',
    signature: { properties: ['transaction.id', 'transaction.status', 'transaction.amount_in_cents'], checksum: '' },
    timestamp: 1530291411,
  };

  it('concatena los valores de signature.properties, el timestamp y el secreto, y aplica SHA256', () => {
    const esperado = createHash('sha256').update(`1234-1610641025-49201APPROVED44900001530291411${secreto}`).digest('hex');
    expect(checksumEvento(evento, secreto)).toBe(esperado);
  });

  it('acepta el checksum en mayúsculas (como lo envía Wompi) en el encabezado o en el cuerpo', () => {
    const checksum = checksumEvento(evento, secreto).toUpperCase();
    expect(verificarEvento(evento, checksum, secreto)).toBe(true);
    expect(verificarEvento({ ...evento, signature: { ...evento.signature, checksum } }, undefined, secreto)).toBe(true);
  });

  it.each([
    ['otro secreto', (c: string) => verificarEvento(evento, c, 'test_events_otro')],
    ['estado alterado', (c: string) => verificarEvento({ ...evento, data: { transaction: { ...evento.data.transaction, status: 'DECLINED' as const } } }, c, secreto)],
    ['monto alterado', (c: string) => verificarEvento({ ...evento, data: { transaction: { ...evento.data.transaction, amount_in_cents: 1 } } }, c, secreto)],
    ['timestamp alterado', (c: string) => verificarEvento({ ...evento, timestamp: 1 }, c, secreto)],
  ])('rechaza el evento con %s', (_caso, verificar) => {
    expect(verificar(checksumEvento(evento, secreto))).toBe(false);
  });

  it('rechaza un checksum vacío o con formato inválido', () => {
    expect(verificarEvento(evento, '', secreto)).toBe(false);
    expect(verificarEvento(evento, 'no-es-hex', secreto)).toBe(false);
    expect(verificarEvento(null, 'a'.repeat(64), secreto)).toBe(false);
  });

  it('los eventos de la pasarela simulada pasan la misma verificación', async () => {
    const pasarela = crearPasarelaSimulada({ secretoEventos: secreto, urlPublica: 'http://localhost:3000' });
    const tx = await pasarela.crearTransaccion({
      referencia: 'RM-000001-AB12', montoCentavos: 2000000, correo: 'a@b.co', nombre: 'A', descripcion: 'x',
      medio: { tipo: 'NEQUI', celular: '3991111111' }, urlRetorno: 'recargamio://recarga',
    });
    const ev = pasarela.finalizar(tx.id);
    expect(ev.data.transaction.status).toBe('APPROVED');
    expect(verificarEvento(ev, ev.signature.checksum, secreto)).toBe(true);
  });
});

describe('Regla 1: solo credenciales de prueba de Wompi', () => {
  const base = {
    DATABASE_URL: 'postgresql://x', TARJETA_LLAVE_CIFRADO: 'a'.repeat(64), TARJETA_LLAVE_HMAC: 'b'.repeat(64),
    JWT_SECRETO_ACCESO: 'x'.repeat(32), JWT_SECRETO_RENOVACION: 'y'.repeat(32), RECAUDO_API_KEY: 'z'.repeat(16),
  };
  const llavesPrueba = {
    WOMPI_LLAVE_PUBLICA: 'pub_test_abc', WOMPI_LLAVE_PRIVADA: 'prv_test_abc',
    WOMPI_SECRETO_EVENTOS: 'test_events_abc', WOMPI_SECRETO_INTEGRIDAD: 'test_integrity_abc',
  };

  it.each([
    ['WOMPI_LLAVE_PUBLICA', 'pub_prod_abc'],
    ['WOMPI_LLAVE_PRIVADA', 'prv_prod_abc'],
    ['WOMPI_SECRETO_EVENTOS', 'prod_events_abc'],
    ['WOMPI_SECRETO_INTEGRIDAD', 'prod_integrity_abc'],
  ])('rechaza %s de producción y pide avisar al equipo', (variable, valor) => {
    expect(() => cargarConfiguracion({ ...base, ...llavesPrueba, [variable]: valor })).toThrow(/detente y avisa/);
  });

  it('con PASARELA=wompi exige las cuatro llaves (no acepta los marcadores _xxx)', () => {
    expect(() => cargarConfiguracion({ ...base, PASARELA: 'wompi', WOMPI_LLAVE_PUBLICA: 'pub_test_xxx' })).toThrow(/con PASARELA=wompi/);
    expect(cargarConfiguracion({ ...base, ...llavesPrueba, PASARELA: 'wompi' }).PASARELA).toBe('wompi');
  });

  it('por defecto usa la pasarela simulada', () => {
    expect(cargarConfiguracion(base).PASARELA).toBe('simulada');
  });
});
