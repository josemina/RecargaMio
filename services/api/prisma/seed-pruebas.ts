// Usuarios exclusivos de las pruebas automatizadas (T8, ADR 0016). Idempotente: se puede correr varias veces.
//   carga001…carga100@recargamio.test · JMeter (100 usuarios simultáneos), una tarjeta cada uno
//   integracion@recargamio.test         · las 200 recargas de integración, cinco tarjetas
//   zap@recargamio.test                 · escaneo de seguridad con sesión
// Nunca se usa a Viviana (usuaria de la demostración). Las tarjetas existen solo en el recaudo simulado (TARJETAS_PRUEBAS).
import { PrismaClient } from '@prisma/client';
import argon2 from 'argon2';
import { z } from 'zod';
import { VERSION_POLITICA_ACTUAL } from '../src/modulos/auth/politica';
import { crearCifradorTarjeta } from '../src/seguridad/cifradoTarjeta';

const entorno = z
  .object({
    TARJETA_LLAVE_CIFRADO: z.string(),
    TARJETA_LLAVE_HMAC: z.string(),
    PRUEBAS_CONTRASENA: z
      .string({ error: 'Falta PRUEBAS_CONTRASENA en .env' })
      .min(8, 'PRUEBAS_CONTRASENA debe tener al menos 8 caracteres')
      .regex(/\p{L}/u, 'PRUEBAS_CONTRASENA debe tener al menos una letra')
      .regex(/\d/, 'PRUEBAS_CONTRASENA debe tener al menos un número'),
  })
  .parse(process.env);

const prisma = new PrismaClient();
const cifrador = crearCifradorTarjeta({ llaveCifrado: entorno.TARJETA_LLAVE_CIFRADO, llaveHmac: entorno.TARJETA_LLAVE_HMAC });

const tresDigitos = (n: number) => String(n).padStart(3, '0');

const USUARIOS_PRUEBAS = [
  ...Array.from({ length: 100 }, (_, i) => ({
    nombre: `Usuario de carga ${tresDigitos(i + 1)}`,
    correo: `carga${tresDigitos(i + 1)}@recargamio.test`,
    tarjetas: [`77${String(i + 1).padStart(8, '0')}`],
  })),
  {
    nombre: 'Usuario de integración',
    correo: 'integracion@recargamio.test',
    tarjetas: ['7710000001', '7710000002', '7710000003', '7710000004', '7710000005'],
  },
  { nombre: 'Usuario de escaneo de seguridad', correo: 'zap@recargamio.test', tarjetas: ['7720000001'] },
];

async function main() {
  // Un solo hash para todos: argon2id es lento a propósito y los 102 usuarios comparten la contraseña de pruebas
  const hashContrasena = await argon2.hash(entorno.PRUEBAS_CONTRASENA, { type: argon2.argon2id });

  for (const { nombre, correo, tarjetas } of USUARIOS_PRUEBAS) {
    // Si una corrida anterior bloqueó la cuenta o cambió el nombre, se deja como al principio
    const usuario = await prisma.usuario.upsert({
      where: { correo },
      update: { nombre, hashContrasena, intentosFallidos: 0, bloqueadoHasta: null },
      create: { nombre, correo, hashContrasena },
    });
    const autorizada = await prisma.autorizacionDatos.findFirst({ where: { usuarioId: usuario.id, versionPolitica: VERSION_POLITICA_ACTUAL } });
    if (!autorizada) {
      await prisma.autorizacionDatos.create({ data: { usuarioId: usuario.id, versionPolitica: VERSION_POLITICA_ACTUAL, ip: '127.0.0.1' } });
    }
    for (const [i, numero] of tarjetas.entries()) {
      const protegido = cifrador.proteger(numero);
      const alias = tarjetas.length === 1 ? 'Tarjeta de pruebas' : `Tarjeta de pruebas ${i + 1}`;
      await prisma.tarjeta.upsert({
        where: { usuarioId_numeroHmac: { usuarioId: usuario.id, numeroHmac: protegido.numeroHmac } },
        update: { alias, activa: true },
        create: { usuarioId: usuario.id, alias, ...protegido },
      });
    }
  }

  const usuarios = await prisma.usuario.count({ where: { correo: { in: USUARIOS_PRUEBAS.map((u) => u.correo) } } });
  console.log('Usuarios de pruebas listos:', JSON.stringify({ usuarios, contrasena: 'la de PRUEBAS_CONTRASENA en .env' }));
}

main()
  .catch((error) => {
    console.error('Error al crear los usuarios de pruebas:', error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
