// Pantallas de acceso, sin sesión: 1.1 (y su estado de error 1.2), 1.3 y 1.4.
import { Stack } from 'expo-router';

export default function DisenoPublico() {
  return <Stack screenOptions={{ headerShown: false }} />;
}
