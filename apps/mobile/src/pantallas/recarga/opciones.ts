// Montos y medios de pago de la recarga (reglas de negocio de CLAUDE.md y pantalla 3.1 de Figma).
import type { MedioPago } from '@/api/tipos';

export const MONTOS = [5000, 10000, 20000, 50000] as const;

export const MEDIOS: { codigo: MedioPago; nombre: string; descripcion: string; sigla: string }[] = [
  { codigo: 'PSE', nombre: 'PSE', descripcion: 'Débito desde tu cuenta bancaria', sigla: 'PSE' },
  { codigo: 'NEQUI', nombre: 'Nequi', descripcion: 'Billetera digital', sigla: 'N' },
  { codigo: 'BANCOLOMBIA_TRANSFER', nombre: 'Bancolombia', descripcion: 'Botón o app Bancolombia', sigla: 'B' },
];

export const TIPOS_DOCUMENTO = [
  { codigo: 'CC', nombre: 'C.C.', hablado: 'Cédula de ciudadanía' },
  { codigo: 'CE', nombre: 'C.E.', hablado: 'Cédula de extranjería' },
  { codigo: 'NIT', nombre: 'NIT', hablado: 'NIT' },
  { codigo: 'PP', nombre: 'Pasaporte', hablado: 'Pasaporte' },
  { codigo: 'TI', nombre: 'T.I.', hablado: 'Tarjeta de identidad' },
] as const;
