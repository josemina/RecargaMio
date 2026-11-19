import { randomBytes } from 'node:crypto';
import { crearCifradorTarjeta, normalizarNumeroTarjeta } from '../src/seguridad/cifradoTarjeta';

const llaves = { llaveCifrado: randomBytes(32).toString('hex'), llaveHmac: randomBytes(32).toString('hex') };
const cifrador = crearCifradorTarjeta(llaves);

describe('Cifrado del número de la tarjeta MIO (ADR 0009)', () => {
  it('cifra y descifra el mismo número', () => {
    const cifrado = cifrador.cifrar('1234564821');
    expect(cifrado).not.toContain('1234564821');
    expect(cifrador.descifrar(cifrado)).toBe('1234564821');
  });

  it('usa un IV aleatorio: el mismo número produce cifrados distintos', () => {
    expect(cifrador.cifrar('1234564821')).not.toBe(cifrador.cifrar('1234564821'));
  });

  it('rechaza un cifrado manipulado (autenticación GCM)', () => {
    const [v, iv, tag, datos] = cifrador.cifrar('1234564821').split(':');
    const alterado = Buffer.from(datos, 'base64url');
    alterado[0] ^= 0xff;
    expect(() => cifrador.descifrar([v, iv, tag, alterado.toString('base64url')].join(':'))).toThrow();
  });

  it('no descifra con otra llave', () => {
    const otro = crearCifradorTarjeta({ llaveCifrado: randomBytes(32).toString('hex'), llaveHmac: llaves.llaveHmac });
    expect(() => otro.descifrar(cifrador.cifrar('1234564821'))).toThrow();
  });

  it('el HMAC es estable e independiente del formato de entrada', () => {
    expect(cifrador.hmac('1234564821')).toBe(cifrador.hmac('123 456 4821'));
    expect(cifrador.hmac('1234564821')).not.toBe(cifrador.hmac('1234567730'));
  });

  it('proteger devuelve cifrado, HMAC y últimos 4', () => {
    const protegido = cifrador.proteger('1234-564-821');
    expect(protegido.ultimos4).toBe('4821');
    expect(protegido.numeroHmac).toBe(cifrador.hmac('1234564821'));
    expect(cifrador.descifrar(protegido.numeroCifrado)).toBe('1234564821');
  });

  it('exige 10 dígitos', () => {
    expect(() => normalizarNumeroTarjeta('12345')).toThrow(/10 dígitos/);
    expect(() => normalizarNumeroTarjeta('12345abcde')).toThrow(/10 dígitos/);
  });

  it('valida las llaves', () => {
    expect(() => crearCifradorTarjeta({ llaveCifrado: 'corta', llaveHmac: llaves.llaveHmac })).toThrow(/64 caracteres/);
    expect(() => crearCifradorTarjeta({ llaveCifrado: llaves.llaveHmac, llaveHmac: llaves.llaveHmac })).toThrow(/distintas/);
  });
});
