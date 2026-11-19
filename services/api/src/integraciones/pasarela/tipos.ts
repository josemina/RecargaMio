// Contrato común de la pasarela de pagos (ADR 0013). Lo cumplen la pasarela simulada y el cliente de Wompi Sandbox.
// Los datos del medio de pago (celular de Nequi, documento de PSE) solo viajan hacia la pasarela: nunca se guardan (regla 2).

export type EstadoPasarela = 'PENDING' | 'APPROVED' | 'DECLINED' | 'VOIDED' | 'ERROR';

export type DatosMedio =
  | { tipo: 'NEQUI'; celular: string }
  | { tipo: 'PSE'; tipoPersona: 0 | 1; tipoDocumento: string; numeroDocumento: string; codigoBanco: string; celular: string }
  | { tipo: 'BANCOLOMBIA_TRANSFER' };

export interface SolicitudTransaccion {
  referencia: string;
  montoCentavos: number;
  correo: string;
  nombre: string;
  /** Máximo 30 caracteres (Wompi, PSE). */
  descripcion: string;
  medio: DatosMedio;
  urlRetorno: string;
  ip?: string;
}

export interface Transaccion {
  id: string;
  referencia: string;
  estado: EstadoPasarela;
  montoCentavos: number;
  motivo?: string | null;
  /** PSE y Bancolombia: página del banco donde el usuario autoriza el pago (HU-02 CA-2). */
  urlPago?: string | null;
}

export interface Banco {
  codigo: string;
  nombre: string;
}

export interface Terminos {
  /** Términos y condiciones de la pasarela (acceptance_token). */
  aceptacion: string;
  /** Autorización de tratamiento de datos personales de la pasarela (accept_personal_auth). */
  datosPersonales: string;
}

export interface Pasarela {
  nombre: 'simulada' | 'wompi';
  terminos(): Promise<Terminos>;
  bancosPse(): Promise<Banco[]>;
  crearTransaccion(solicitud: SolicitudTransaccion): Promise<Transaccion>;
  consultarTransaccion(id: string): Promise<Transaccion>;
}

/** Evento transaction.updated, con el mismo formato de Wompi. */
export interface EventoPasarela {
  event: string;
  data: { transaction: { id: string; reference: string; status: EstadoPasarela; amount_in_cents: number; status_message?: string | null; [k: string]: unknown } };
  environment: string;
  signature: { properties: string[]; checksum: string };
  timestamp: number;
  sent_at?: string;
}
