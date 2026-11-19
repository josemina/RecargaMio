// Notificaciones push con FCM (decisión D7: solo Android). La API envía con firebase-admin al token del teléfono.
// - En Expo Go y en la web no hay push remoto: no se registra nada y los avisos quedan en la bandeja (/notificaciones).
// - En una development build: pide permiso, crea el canal «alertas» (el mismo que usa la API) y registra el token.
// - Al cerrar sesión se quita el token para que el teléfono deje de recibir avisos de esa cuenta.
// expo-notifications se carga solo cuando hay push: en Expo Go, importarlo ya muestra una advertencia.
import { useEffect } from 'react';
import { Platform } from 'react-native';
import { isRunningInExpoGo } from 'expo';
import { router } from 'expo-router';
import type { ClienteApi } from '@/api/cliente';

let tokenRegistrado: string | null = null;

export const pushDisponible = () => Platform.OS === 'android' && !isRunningInExpoGo();

export async function registrarDispositivo(cliente: ClienteApi): Promise<boolean> {
  if (!pushDisponible()) return false;
  const Notifications = await import('expo-notifications');
  const { status } = await Notifications.requestPermissionsAsync();
  if (status !== 'granted') return false;
  await Notifications.setNotificationChannelAsync('alertas', {
    name: 'Alertas de saldo y recargas',
    importance: Notifications.AndroidImportance.HIGH,
  });
  const { data } = await Notifications.getDevicePushTokenAsync();
  const token = String(data);
  await cliente.peticion('/dispositivos', { metodo: 'POST', cuerpo: { token, plataforma: 'android' } });
  tokenRegistrado = token;
  return true;
}

export async function quitarDispositivo(cliente: ClienteApi) {
  if (!tokenRegistrado) return;
  const token = tokenRegistrado;
  tokenRegistrado = null;
  await cliente.peticion('/dispositivos', { metodo: 'DELETE', cuerpo: { token } }).catch(() => undefined);
}

/** Al tocar un aviso: la recarga exitosa abre su comprobante (3.4); el saldo bajo abre la recarga de esa tarjeta (3.1). */
function abrirDesdeAviso(datos: Record<string, unknown>) {
  if (typeof datos.recargaId === 'string') router.push({ pathname: '/recarga/[id]', params: { id: datos.recargaId } });
  else if (typeof datos.tarjetaId === 'string') router.navigate({ pathname: '/recargar', params: { tarjetaId: datos.tarjetaId } });
}

/** Se usa una vez, en el diseño de las rutas con sesión. */
export function usePush(cliente: ClienteApi) {
  useEffect(() => {
    if (!pushDisponible()) return;
    let suscripcion: { remove(): void } | undefined;
    let vigente = true;
    registrarDispositivo(cliente).catch(() => undefined);
    void import('expo-notifications').then((Notifications) => {
      if (!vigente) return;
      suscripcion = Notifications.addNotificationResponseReceivedListener((respuesta) =>
        abrirDesdeAviso(respuesta.notification.request.content.data ?? {}),
      );
    });
    return () => {
      vigente = false;
      suscripcion?.remove();
    };
  }, [cliente]);
}
