// Tipos de las respuestas de la API (services/api/openapi.yaml). Solo lo que usa la app.

export interface Alerta {
  umbral: number;
  activa: boolean;
}

export interface Tarjeta {
  id: string;
  alias: string;
  ultimos4: string;
  saldo: number | null;
  saldoBajo: boolean;
  alerta: Alerta | null;
  creadaEn: string;
}

export interface ListaTarjetas {
  registradas: number;
  maximo: number;
  recaudoDisponible: boolean;
  aviso?: string;
  tarjetas: Tarjeta[];
}

export interface DetalleTarjeta extends Tarjeta {
  ultimaRecarga: { fecha: string; monto: number; medioPago: string } | null;
}

export type FiltroMovimientos = 'todo' | 'recargas' | 'viajes';

export interface Movimiento {
  tipo: 'RECARGA' | 'VIAJE';
  fecha: string;
  valor: number;
  descripcion: string;
  referencia?: string;
}

export interface ListaMovimientos {
  tarjeta: { id: string; alias: string; ultimos4: string };
  tipo: FiltroMovimientos;
  movimientos: Movimiento[];
  siguienteCursor: string | null;
  aviso?: string;
}

export type EstadoRecarga = 'PENDIENTE' | 'APROBADA' | 'ACREDITADA' | 'RECHAZADA' | 'ERROR' | 'FALLA_ACREDITACION';
export type MedioPago = 'NEQUI' | 'PSE' | 'BANCOLOMBIA_TRANSFER';

export interface Recarga {
  id: string;
  referencia: string;
  estado: EstadoRecarga;
  mensaje: string;
  monto: number;
  total: number;
  medioPago: string;
  destino: { ultimos4: string; alias: string | null; tercero: boolean };
  urlPago: string | null;
  motivo: string | null;
  iniciadaEn: string;
  confirmadaEn: string | null;
  acreditadaEn: string | null;
  tiempoSegundos: number | null;
  comprobante: { referencia: string; fecha: string; medioPago: string; monto: number; nuevoSaldo: number | null; tarjeta: string } | null;
}

export interface DatosPse {
  tipoPersona: 'NATURAL' | 'JURIDICA';
  tipoDocumento: 'CC' | 'CE' | 'NIT' | 'PP' | 'TI';
  numeroDocumento: string;
  codigoBanco: string;
  celular: string;
}

export type SolicitudRecarga = {
  monto: number;
  aceptaTerminosPasarela: boolean;
  guardarTarjeta?: boolean;
  aliasTarjeta?: string;
} & ({ tarjetaId: string } | { numeroDestino: string; confirmacionNumero: string }) &
  (
    | { medioPago: 'NEQUI'; datosMedio: { celular: string } }
    | { medioPago: 'PSE'; datosMedio: DatosPse }
    | { medioPago: 'BANCOLOMBIA_TRANSFER' }
  );

export interface Banco {
  codigo: string;
  nombre: string;
}

export interface TerminosPasarela {
  pasarela: 'simulada' | 'wompi';
  aceptacion: string;
  datosPersonales: string;
}

export interface Notificacion {
  id: string;
  tipo: 'SALDO_BAJO' | 'RECARGA_EXITOSA';
  titulo: string;
  cuerpo: string;
  datos: Record<string, unknown>;
  leida: boolean;
  creadaEn: string;
}

export interface Perfil {
  id: string;
  nombre: string;
  correo: string;
  creadoEn: string;
  politica: { version: string; aceptadaEn: string } | null;
}

export const ESTADOS_FINALES: EstadoRecarga[] = ['ACREDITADA', 'RECHAZADA', 'ERROR'];
