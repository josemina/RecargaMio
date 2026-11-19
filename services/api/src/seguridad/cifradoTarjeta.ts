// Cifrado del número de la tarjeta MIO (ADR 0009).
// AES-256-GCM con IV aleatorio para guardarlo, y HMAC-SHA256 determinístico para detectar duplicados.
import { createCipheriv, createDecipheriv, createHmac, randomBytes } from 'node:crypto';

const VERSION = 'v1';
const ALGORITMO = 'aes-256-gcm';
const LARGO_IV = 12;

export interface LlavesTarjeta {
  /** 32 bytes en hexadecimal (64 caracteres). */
  llaveCifrado: string;
  /** 32 bytes en hexadecimal (64 caracteres), distinta de la de cifrado. */
  llaveHmac: string;
}

export interface NumeroProtegido {
  numeroCifrado: string;
  numeroHmac: string;
  ultimos4: string;
}

/** Quita espacios y guiones y exige 10 dígitos. */
export function normalizarNumeroTarjeta(numero: string): string {
  const limpio = numero.replace(/[\s-]/g, '');
  if (!/^\d{10}$/.test(limpio)) {
    throw new Error('El número de la tarjeta MIO debe tener 10 dígitos.');
  }
  return limpio;
}

function aBuffer(llaveHex: string, nombre: string): Buffer {
  if (!/^[0-9a-fA-F]{64}$/.test(llaveHex)) {
    throw new Error(`${nombre} debe ser de 32 bytes en hexadecimal (64 caracteres).`);
  }
  return Buffer.from(llaveHex, 'hex');
}

export function crearCifradorTarjeta({ llaveCifrado, llaveHmac }: LlavesTarjeta) {
  const llaveC = aBuffer(llaveCifrado, 'TARJETA_LLAVE_CIFRADO');
  const llaveH = aBuffer(llaveHmac, 'TARJETA_LLAVE_HMAC');
  if (llaveC.equals(llaveH)) {
    throw new Error('TARJETA_LLAVE_CIFRADO y TARJETA_LLAVE_HMAC deben ser distintas.');
  }

  function hmac(numero: string): string {
    return createHmac('sha256', llaveH).update(normalizarNumeroTarjeta(numero)).digest('hex');
  }

  function cifrar(numero: string): string {
    const normalizado = normalizarNumeroTarjeta(numero);
    const iv = randomBytes(LARGO_IV);
    const cifrador = createCipheriv(ALGORITMO, llaveC, iv);
    const cifrado = Buffer.concat([cifrador.update(normalizado, 'utf8'), cifrador.final()]);
    const tag = cifrador.getAuthTag();
    return [VERSION, iv, tag, cifrado].map((p) => (typeof p === 'string' ? p : p.toString('base64url'))).join(':');
  }

  function descifrar(valor: string): string {
    const partes = valor.split(':');
    if (partes.length !== 4 || partes[0] !== VERSION) {
      throw new Error('Formato de número cifrado no reconocido.');
    }
    const [, iv, tag, cifrado] = partes.map((p) => Buffer.from(p, 'base64url'));
    const descifrador = createDecipheriv(ALGORITMO, llaveC, iv);
    descifrador.setAuthTag(tag);
    return Buffer.concat([descifrador.update(cifrado), descifrador.final()]).toString('utf8');
  }

  function proteger(numero: string): NumeroProtegido {
    const normalizado = normalizarNumeroTarjeta(numero);
    return { numeroCifrado: cifrar(normalizado), numeroHmac: hmac(normalizado), ultimos4: normalizado.slice(-4) };
  }

  return { cifrar, descifrar, hmac, proteger };
}

export type CifradorTarjeta = ReturnType<typeof crearCifradorTarjeta>;
