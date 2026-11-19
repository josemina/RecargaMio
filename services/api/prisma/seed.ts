// Datos semilla de la base `recargamio` (T1). Idempotente: se puede correr varias veces.
// Las tarjetas coinciden con las del recaudo simulado y con las pantallas de Figma.
import { PrismaClient } from '@prisma/client';
import argon2 from 'argon2';
import { z } from 'zod';
import { VERSION_POLITICA_ACTUAL } from '../src/modulos/auth/politica';
import { crearCifradorTarjeta } from '../src/seguridad/cifradoTarjeta';

const entorno = z
  .object({
    TARJETA_LLAVE_CIFRADO: z.string(),
    TARJETA_LLAVE_HMAC: z.string(),
    SEMILLA_CONTRASENA: z.string().min(8, 'SEMILLA_CONTRASENA debe tener al menos 8 caracteres'),
  })
  .parse(process.env);

const prisma = new PrismaClient();
const cifrador = crearCifradorTarjeta({
  llaveCifrado: entorno.TARJETA_LLAVE_CIFRADO,
  llaveHmac: entorno.TARJETA_LLAVE_HMAC,
});

// Nombres y alias iguales a los de Figma (pantallas 2.1 y 5.1)
const USUARIA = { nombre: 'Viviana Andrade Torres', correo: 'viviana@recargamio.test' };

const TARJETAS = [
  { numero: '1234564821', alias: 'Mi tarjeta', umbralAlerta: 5000 },
  { numero: '1234567730', alias: 'Tarjeta de mamá', umbralAlerta: 5000 },
];

async function main() {
  const hashContrasena = await argon2.hash(entorno.SEMILLA_CONTRASENA, { type: argon2.argon2id });

  const usuaria = await prisma.usuario.upsert({
    where: { correo: USUARIA.correo },
    update: { nombre: USUARIA.nombre },
    create: { ...USUARIA, hashContrasena },
  });

  // Ley 1581: toda cuenta tiene registrada la versión de la política que aceptó.
  const autorizacion = await prisma.autorizacionDatos.findFirst({
    where: { usuarioId: usuaria.id, versionPolitica: VERSION_POLITICA_ACTUAL },
  });
  if (!autorizacion) {
    await prisma.autorizacionDatos.create({
      data: { usuarioId: usuaria.id, versionPolitica: VERSION_POLITICA_ACTUAL, ip: '127.0.0.1' },
    });
  }

  for (const { numero, alias, umbralAlerta } of TARJETAS) {
    const protegido = cifrador.proteger(numero);
    const tarjeta = await prisma.tarjeta.upsert({
      where: { usuarioId_numeroHmac: { usuarioId: usuaria.id, numeroHmac: protegido.numeroHmac } },
      update: { alias },
      create: { usuarioId: usuaria.id, alias, ...protegido },
    });
    await prisma.alerta.upsert({
      where: { tarjetaId: tarjeta.id },
      update: {},
      create: { tarjetaId: tarjeta.id, umbral: umbralAlerta },
    });
  }

  const resumen = {
    usuarios: await prisma.usuario.count(),
    autorizaciones: await prisma.autorizacionDatos.count(),
    tarjetas: await prisma.tarjeta.count(),
    alertas: await prisma.alerta.count(),
  };
  console.log('Seed aplicado:', JSON.stringify(resumen));
}

main()
  .catch((error) => {
    console.error('Error al aplicar el seed:', error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
