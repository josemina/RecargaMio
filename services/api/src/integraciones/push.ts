// Envío de notificaciones push (decisión D7, ADR 0007 y 0014): FCM solo en Android.
// Si FCM no está configurado, el aviso igual queda en la bandeja de la app (tabla notificacion).
import { readFileSync } from 'node:fs';
import type { Logger } from 'pino';

export interface MensajePush {
  titulo: string;
  cuerpo: string;
  /** Datos para abrir la pantalla correcta. FCM exige que todos los valores sean texto. */
  datos: Record<string, string>;
}

export interface EnviadorPush {
  nombre: 'fcm' | 'ninguno' | 'memoria';
  /** Devuelve los tokens que FCM ya no reconoce, para borrarlos. */
  enviar(tokens: string[], mensaje: MensajePush): Promise<{ enviados: number; invalidos: string[] }>;
}

/** Sin FCM: no se envía nada al teléfono. */
export function crearPushNinguno(): EnviadorPush {
  return { nombre: 'ninguno', enviar: async () => ({ enviados: 0, invalidos: [] }) };
}

/** Para las pruebas: guarda los envíos y permite marcar tokens como inválidos o simular una caída. */
export function crearPushMemoria() {
  const enviados: { token: string; mensaje: MensajePush }[] = [];
  const invalidos = new Set<string>();
  const estado = { caido: false };
  const push: EnviadorPush & { enviados: typeof enviados; invalidos: typeof invalidos; estado: typeof estado } = {
    nombre: 'memoria',
    enviados,
    invalidos,
    estado,
    async enviar(tokens, mensaje) {
      if (estado.caido) throw new Error('FCM no disponible');
      const validos = tokens.filter((t) => !invalidos.has(t));
      validos.forEach((token) => enviados.push({ token, mensaje }));
      return { enviados: validos.length, invalidos: tokens.filter((t) => invalidos.has(t)) };
    },
  };
  return push;
}

const ERRORES_TOKEN_INVALIDO = new Set(['messaging/registration-token-not-registered', 'messaging/invalid-registration-token']);

/** FCM con firebase-admin. Las credenciales salen de un archivo fuera del repositorio (regla 1). */
export async function crearPushFcm({ rutaCredenciales, logger }: { rutaCredenciales: string; logger: Logger }): Promise<EnviadorPush> {
  const { cert, initializeApp } = await import('firebase-admin/app');
  const { getMessaging } = await import('firebase-admin/messaging');
  const credenciales = JSON.parse(readFileSync(rutaCredenciales, 'utf8'));
  const mensajeria = getMessaging(initializeApp({ credential: cert(credenciales) }, 'recargamio'));

  return {
    nombre: 'fcm',
    async enviar(tokens, { titulo, cuerpo, datos }) {
      if (tokens.length === 0) return { enviados: 0, invalidos: [] };
      const respuesta = await mensajeria.sendEachForMulticast({
        tokens,
        notification: { title: titulo, body: cuerpo },
        data: datos,
        android: { priority: 'high', notification: { channelId: 'alertas' } },
      });
      const invalidos = respuesta.responses.flatMap((r, i) => (!r.success && ERRORES_TOKEN_INVALIDO.has(r.error?.code ?? '') ? [tokens[i]] : []));
      if (respuesta.failureCount > invalidos.length) logger.warn({ fallidos: respuesta.failureCount }, 'FCM no entregó algunos avisos');
      return { enviados: respuesta.successCount, invalidos };
    },
  };
}
