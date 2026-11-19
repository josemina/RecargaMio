// Cliente de la API de Wompi en modo Sandbox (https://docs.wompi.co/docs/colombia/). Se activa con PASARELA=wompi.
// - Tokens de aceptación: GET /merchants/info con x-merchant-public-key (el endpoint anterior dejó de existir el 31-10-2026).
// - Transacciones: POST /transactions con la llave privada, firma de integridad y los dos tokens de aceptación.
// - Consulta: GET /transactions/{id} con la llave privada.
// Nunca se registran el celular, el documento ni las llaves.
import type { Logger } from 'pino';
import { z } from 'zod';
import { ErrorApi } from '../../middleware/errores';
import { firmaIntegridad } from './firmas';
import type { Banco, DatosMedio, Pasarela, Transaccion } from './tipos';

interface Opciones {
  url: string;
  llavePublica: string;
  llavePrivada: string;
  secretoIntegridad: string;
  logger: Logger;
  tiempoMaximoMs?: number;
  /** Intentos para obtener la URL del banco (PSE y Bancolombia), que llega de forma asíncrona. */
  intentosUrlPago?: number;
  esperaEntreIntentosMs?: number;
}

const pasarelaNoDisponible = () =>
  new ErrorApi(502, 'PASARELA_NO_DISPONIBLE', 'No pudimos comunicarnos con la pasarela de pagos. No se hizo ningún cobro. Intenta de nuevo.');

const esquemaComercio = z.object({
  data: z.object({
    presigned_acceptance: z.object({ acceptance_token: z.string(), permalink: z.string() }),
    presigned_personal_data_auth: z.object({ acceptance_token: z.string(), permalink: z.string() }),
  }),
});

const esquemaTransaccion = z.object({
  data: z.object({
    id: z.string(),
    reference: z.string(),
    status: z.enum(['PENDING', 'APPROVED', 'DECLINED', 'VOIDED', 'ERROR']),
    amount_in_cents: z.number().int(),
    status_message: z.string().nullish(),
    payment_method: z.object({ extra: z.object({ async_payment_url: z.string().nullish() }).partial().nullish() }).partial().nullish(),
  }),
});

const esquemaBancos = z.object({
  data: z.array(
    z.object({ financial_institution_code: z.coerce.string(), financial_institution_name: z.string() }),
  ),
});

function metodoDePago(medio: DatosMedio, descripcion: string) {
  switch (medio.tipo) {
    case 'NEQUI':
      return { type: 'NEQUI', phone_number: medio.celular };
    case 'PSE':
      return {
        type: 'PSE',
        user_type: medio.tipoPersona,
        user_legal_id_type: medio.tipoDocumento,
        user_legal_id: medio.numeroDocumento,
        financial_institution_code: medio.codigoBanco,
        payment_description: descripcion,
      };
    case 'BANCOLOMBIA_TRANSFER':
      return { type: 'BANCOLOMBIA_TRANSFER', user_type: 'PERSON', payment_description: descripcion };
  }
}

export function crearPasarelaWompi({ url, llavePublica, llavePrivada, secretoIntegridad, logger, tiempoMaximoMs = 8000, intentosUrlPago = 5, esperaEntreIntentosMs = 1000 }: Opciones): Pasarela {
  const base = url.replace(/\/$/, '');
  let cacheBancos: { hasta: number; bancos: Banco[] } | null = null;

  async function pedir<T>(ruta: string, esquema: z.ZodType<T>, init: RequestInit = {}): Promise<T> {
    let respuesta: Response;
    try {
      respuesta = await fetch(`${base}${ruta}`, { ...init, signal: AbortSignal.timeout(tiempoMaximoMs) });
    } catch (err) {
      logger.warn({ err, ruta }, 'Wompi no respondió');
      throw pasarelaNoDisponible();
    }
    const cuerpo = await respuesta.json().catch(() => null);
    if (!respuesta.ok) {
      // Se registra el tipo de error de Wompi, nunca los datos enviados
      logger.error({ estado: respuesta.status, ruta, error: (cuerpo as { error?: unknown } | null)?.error }, 'Wompi rechazó la petición');
      throw pasarelaNoDisponible();
    }
    const datos = esquema.safeParse(cuerpo);
    if (!datos.success) {
      logger.error({ ruta, problemas: datos.error.issues.map((i) => i.path.join('.')) }, 'Wompi respondió con un formato inesperado');
      throw pasarelaNoDisponible();
    }
    return datos.data;
  }

  const comercio = () => pedir('/merchants/info', esquemaComercio, { headers: { 'x-merchant-public-key': llavePublica } });
  const conPrivada = { Authorization: `Bearer ${llavePrivada}` };

  const aTransaccion = ({ data }: z.infer<typeof esquemaTransaccion>): Transaccion => ({
    id: data.id,
    referencia: data.reference,
    estado: data.status,
    montoCentavos: data.amount_in_cents,
    motivo: data.status_message ?? null,
    urlPago: data.payment_method?.extra?.async_payment_url ?? null,
  });

  const consultar = async (id: string) => aTransaccion(await pedir(`/transactions/${encodeURIComponent(id)}`, esquemaTransaccion, { headers: conPrivada }));

  return {
    nombre: 'wompi',

    async terminos() {
      const { data } = await comercio();
      return { aceptacion: data.presigned_acceptance.permalink, datosPersonales: data.presigned_personal_data_auth.permalink };
    },

    async bancosPse() {
      if (cacheBancos && cacheBancos.hasta > Date.now()) return cacheBancos.bancos;
      const { data } = await pedir('/pse/financial_institutions', esquemaBancos, { headers: { Authorization: `Bearer ${llavePublica}` } });
      const bancos = data.map((b) => ({ codigo: b.financial_institution_code, nombre: b.financial_institution_name }));
      cacheBancos = { hasta: Date.now() + 60 * 60 * 1000, bancos };
      return bancos;
    },

    async crearTransaccion(solicitud) {
      const { data } = await comercio();
      const cuerpo = {
        acceptance_token: data.presigned_acceptance.acceptance_token,
        accept_personal_auth: data.presigned_personal_data_auth.acceptance_token,
        amount_in_cents: solicitud.montoCentavos,
        currency: 'COP',
        signature: firmaIntegridad(solicitud.referencia, solicitud.montoCentavos, secretoIntegridad),
        customer_email: solicitud.correo,
        reference: solicitud.referencia,
        payment_method: metodoDePago(solicitud.medio, solicitud.descripcion),
        redirect_url: solicitud.urlRetorno,
        ...(solicitud.ip ? { ip: solicitud.ip } : {}),
        ...(solicitud.medio.tipo === 'PSE' ? { customer_data: { phone_number: `57${solicitud.medio.celular}`, full_name: solicitud.nombre } } : {}),
      };
      let transaccion = aTransaccion(
        await pedir('/transactions', esquemaTransaccion, { method: 'POST', headers: { ...conPrivada, 'Content-Type': 'application/json' }, body: JSON.stringify(cuerpo) }),
      );
      // PSE y Bancolombia: la URL del banco llega unos segundos después (long polling, según la documentación)
      for (let i = 0; solicitud.medio.tipo !== 'NEQUI' && !transaccion.urlPago && transaccion.estado === 'PENDING' && i < intentosUrlPago; i += 1) {
        await new Promise((r) => setTimeout(r, esperaEntreIntentosMs));
        transaccion = await consultar(transaccion.id);
      }
      return transaccion;
    },

    consultarTransaccion: consultar,
  };
}
