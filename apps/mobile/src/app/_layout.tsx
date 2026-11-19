// Diseño raíz de la app (T9, ADR 0017): fuente Inter, sesión, datos del servidor y rutas protegidas.
// Con sesión se ven las pestañas (app); sin sesión, las pantallas de acceso (publico). El catálogo solo existe en desarrollo.
import { useEffect, useState } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { SplashScreen, Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { crearClienteConsultas } from '@/api/consultas';
import { ProveedorSesion, useSesion } from '@/sesion/ProveedorSesion';
import { useFuentesRecargaMIO } from '@/theme/fuentes';
import { color } from '@/theme/tokens';

void SplashScreen.preventAutoHideAsync();

export default function DisenoRaiz() {
  const [fuentesListas, errorFuentes] = useFuentesRecargaMIO();
  const [clienteConsultas] = useState(crearClienteConsultas);

  // Si la fuente no carga, la app sigue con la del sistema en vez de quedarse en la pantalla de carga
  if (!fuentesListas && !errorFuentes) return null;

  return (
    <SafeAreaProvider>
      <QueryClientProvider client={clienteConsultas}>
        <ProveedorSesion>
          <StatusBar style="dark" />
          <Navegacion />
        </ProveedorSesion>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}

function Navegacion() {
  const { estado } = useSesion();

  useEffect(() => {
    if (estado !== 'cargando') void SplashScreen.hideAsync();
  }, [estado]);

  if (estado === 'cargando') return null;
  const conSesion = estado === 'con-sesion';

  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: color.superficie.fondo } }}>
      <Stack.Protected guard={conSesion}>
        <Stack.Screen name="(app)" />
      </Stack.Protected>
      <Stack.Protected guard={!conSesion}>
        <Stack.Screen name="(publico)" />
      </Stack.Protected>
      {/* La política se puede leer antes de crear la cuenta (1.3) y con sesión (5.2) */}
      <Stack.Screen name="politica" />
      <Stack.Protected guard={__DEV__}>
        <Stack.Screen name="catalogo" />
      </Stack.Protected>
    </Stack>
  );
}
