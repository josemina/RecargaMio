// Datos semilla del recaudo simulado, coherentes con Figma y con el seed de la API.
// Se usa al arrancar (sin borrar nada) y desde POST /simulacion/reiniciar (vuelve a los saldos iniciales).
import type { PrismaClient } from '../generated/prisma';

export const VALOR_PASAJE = 3500;

export const TARJETAS_SEMILLA = [
  { numero: '1234564821', saldo: 12400, activa: true }, // Mi tarjeta (Viviana)
  { numero: '1234567730', saldo: 3200, activa: true }, // Mamá
  { numero: '9087654321', saldo: 1000, activa: true }, // Tercero (HU-04)
  { numero: '1234560001', saldo: 8000, activa: true }, // Extra para probar el límite de 5
  { numero: '1234560002', saldo: 20000, activa: true }, // Extra para probar el límite de 5
  { numero: '1234560003', saldo: 6000, activa: true }, // Sexta tarjeta válida: demuestra el límite de 5 (T4)
  { numero: '1234560009', saldo: 0, activa: false }, // Inactiva (bloqueada)
] as const;

/**
 * Tarjetas exclusivas de las pruebas automatizadas (T8, ADR 0016). Separadas de las de la demostración
 * para que la carga, la integración y el escaneo de seguridad nunca toquen las tarjetas de Viviana.
 *   7700000001–7700000100 · usuarios de carga de JMeter (carga001–carga100)
 *   7710000001–7710000005 · usuario de las 200 recargas de integración
 *   7720000001            · usuario del escaneo de ZAP
 *   7730000001            · colección de Postman
 */
export const TARJETAS_PRUEBAS = [
  ...Array.from({ length: 100 }, (_, i) => `77${String(i + 1).padStart(8, '0')}`),
  ...Array.from({ length: 5 }, (_, i) => `771000000${i + 1}`),
  '7720000001',
  '7730000001',
].map((numero) => ({ numero, saldo: 10000, activa: true }));

/**
 * Tarjetas de la validación con usuarios (T11, ADR 0019): una por participante, P01 a P15 (7740000001–7740000015).
 * Arrancan con $5.000 para que la recarga de la sesión se note en el saldo.
 * `npm run demo:limpiar` las devuelve a este estado.
 */
export const SALDO_INICIAL_VALIDACION = 5000;
export const TARJETAS_VALIDACION = Array.from({ length: 15 }, (_, i) => ({
  numero: `774${String(i + 1).padStart(7, '0')}`,
  saldo: SALDO_INICIAL_VALIDACION,
  activa: true,
}));

const VIAJES_HISTORICOS: Record<string, { ruta: string; diasAtras: number; hora: number }[]> = {
  '1234564821': [
    { ruta: 'E21', diasAtras: 1, hora: 7 },
    { ruta: 'T31', diasAtras: 1, hora: 18 },
    { ruta: 'P10A', diasAtras: 3, hora: 8 },
  ],
  '1234567730': [{ ruta: 'A11', diasAtras: 2, hora: 9 }],
};

export async function aplicarSemilla(prisma: PrismaClient, { reiniciar = false } = {}) {
  await prisma.$transaction(async (tx) => {
    if (reiniciar) {
      await tx.credito.deleteMany();
      await tx.viaje.deleteMany();
    }

    for (const tarjeta of [...TARJETAS_SEMILLA, ...TARJETAS_PRUEBAS, ...TARJETAS_VALIDACION]) {
      await tx.tarjetaRecaudo.upsert({
        where: { numero: tarjeta.numero },
        update: reiniciar ? { saldo: tarjeta.saldo, activa: tarjeta.activa } : {},
        create: tarjeta,
      });
    }

    for (const [numero, viajes] of Object.entries(VIAJES_HISTORICOS)) {
      if ((await tx.viaje.count({ where: { numero } })) > 0) continue;
      await tx.viaje.createMany({
        data: viajes.map(({ ruta, diasAtras, hora }) => {
          const fecha = new Date();
          fecha.setDate(fecha.getDate() - diasAtras);
          fecha.setHours(hora, 15, 0, 0);
          return { numero, ruta, valor: VALOR_PASAJE, fecha };
        }),
      });
    }
  });

  return {
    tarjetas: await prisma.tarjetaRecaudo.count(),
    creditos: await prisma.credito.count(),
    viajes: await prisma.viaje.count(),
  };
}
