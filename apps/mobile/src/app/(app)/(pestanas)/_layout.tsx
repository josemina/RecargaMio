// Cuatro pestañas: Inicio (2.1), Recargar (3.1), Historial (4.1) y Perfil (5.1).
// La barra es la de Figma (componente BarraNavegacion, nodo 11:229), no la predeterminada de expo-router.
import { Tabs, type BottomTabBarProps } from 'expo-router/js-tabs';
import { BarraNavegacion, type Pestana } from '@/components';

const RUTA_DE_PESTANA: Record<Pestana, string> = { inicio: 'index', recargar: 'recargar', historial: 'historial', perfil: 'perfil' };
const PESTANA_DE_RUTA = Object.fromEntries(Object.entries(RUTA_DE_PESTANA).map(([p, r]) => [r, p])) as Record<string, Pestana>;

function BarraPestanas({ state, navigateToTab }: BottomTabBarProps) {
  const activa = PESTANA_DE_RUTA[state.routes[state.index].name] ?? 'inicio';
  return (
    <BarraNavegacion
      activa={activa}
      onCambiar={(pestana) => {
        const ruta = state.routes.find((r) => r.name === RUTA_DE_PESTANA[pestana]);
        if (ruta) navigateToTab(ruta.key);
      }}
    />
  );
}

export default function DisenoPestanas() {
  return (
    <Tabs screenOptions={{ headerShown: false }} tabBar={(props) => <BarraPestanas {...props} />}>
      <Tabs.Screen name="index" options={{ title: 'Inicio' }} />
      <Tabs.Screen name="recargar" options={{ title: 'Recargar' }} />
      <Tabs.Screen name="historial" options={{ title: 'Historial' }} />
      <Tabs.Screen name="perfil" options={{ title: 'Perfil' }} />
    </Tabs>
  );
}
