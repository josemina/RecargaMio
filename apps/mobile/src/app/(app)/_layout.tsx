// Rutas con sesión: las cuatro pestañas y las pantallas que se abren encima (2.2 a 2.4, 3.2 a 3.5, 4.2, avisos y 5.2).
// Aquí se registra el teléfono para las notificaciones push (solo en una development build de Android).
import { Stack } from 'expo-router';
import { usePush } from '@/sesion/push';
import { useSesion } from '@/sesion/ProveedorSesion';

export default function DisenoApp() {
  const { cliente } = useSesion();
  usePush(cliente);
  return <Stack screenOptions={{ headerShown: false }} />;
}
