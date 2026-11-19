// Envío de correos. En desarrollo van a Mailpit (http://localhost:8025); ningún correo sale a Internet.
import nodemailer from 'nodemailer';

export interface MensajeCorreo {
  para: string;
  asunto: string;
  texto: string;
  html: string;
}

export interface Correo {
  enviar(mensaje: MensajeCorreo): Promise<void>;
}

export function crearCorreoSmtp({ host, puerto, remitente }: { host: string; puerto: number; remitente: string }): Correo {
  const transporte = nodemailer.createTransport({ host, port: puerto, secure: false, ignoreTLS: true });
  return {
    async enviar({ para, asunto, texto, html }) {
      await transporte.sendMail({ from: remitente, to: para, subject: asunto, text: texto, html });
    },
  };
}

/** Correo en memoria para las pruebas automatizadas. */
export function crearCorreoMemoria() {
  const enviados: MensajeCorreo[] = [];
  const correo: Correo & { enviados: MensajeCorreo[] } = {
    enviados,
    async enviar(mensaje) {
      enviados.push(mensaje);
    },
  };
  return correo;
}
