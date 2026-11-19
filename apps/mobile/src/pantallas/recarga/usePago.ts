// Envía la recarga y lleva a la pantalla 3.3. Con PSE y Bancolombia abre antes la página del banco (expo-web-browser);
// el enlace de regreso recargamio://recarga coincide con APP_URL_RETORNO de la API.
import { Platform } from 'react-native';
import { router } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useCrearRecarga } from '@/api/hooks';
import { codigoDeError, mensajeDeError } from '@/api/mensajes';
import { ErrorApi } from '@/api/errores';
import type { Recarga, SolicitudRecarga } from '@/api/tipos';

export async function abrirPaginaDePago(url: string) {
  if (Platform.OS === 'web') {
    window.open(url, '_blank', 'noopener');
    return;
  }
  // Se cierra sola cuando el banco redirige a recargamio://recarga (Wompi); con la pasarela simulada, al cerrarla
  await WebBrowser.openAuthSessionAsync(url, 'recargamio://recarga');
}

export function usePago() {
  const crear = useCrearRecarga();

  async function pagar(solicitud: SolicitudRecarga): Promise<{ error?: string }> {
    let recarga: Recarga;
    try {
      recarga = await crear.mutateAsync(solicitud);
    } catch (error) {
      // Doble toque en «Pagar»: ya hay una igual en curso, se muestra esa
      const previa = codigoDeError(error) === 'RECARGA_EN_CURSO' ? ((error as ErrorApi).datos.recargaId as string | undefined) : undefined;
      if (previa) {
        router.push({ pathname: '/recarga/[id]', params: { id: previa } });
        return {};
      }
      return { error: mensajeDeError(error) };
    }
    if (recarga.urlPago) await abrirPaginaDePago(recarga.urlPago);
    router.push({ pathname: '/recarga/[id]', params: { id: recarga.id } });
    return {};
  }

  return { pagar, pagando: crear.isPending };
}
