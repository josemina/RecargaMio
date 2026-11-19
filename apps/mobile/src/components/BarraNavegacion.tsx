// Barra de navegación · Figma 11:229 (página 02). Navegación principal con cuatro pestañas; incluye el área segura inferior.
// Se usa como barra de pestañas de expo-router (src/app/(app)/(pestanas)/_layout.tsx) y en el catálogo.
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { color, radio, TACTIL_MINIMO } from '@/theme/tokens';
import { Icono, type NombreIcono } from './Icono';
import { Texto } from './Texto';

export type Pestana = 'inicio' | 'recargar' | 'historial' | 'perfil';

export const PESTANAS: { clave: Pestana; etiqueta: string; icono: NombreIcono }[] = [
  { clave: 'inicio', etiqueta: 'Inicio', icono: 'inicio' },
  { clave: 'recargar', etiqueta: 'Recargar', icono: 'recargar' },
  { clave: 'historial', etiqueta: 'Historial', icono: 'historial' },
  { clave: 'perfil', etiqueta: 'Perfil', icono: 'perfil' },
];

export interface PropsBarraNavegacion {
  activa: Pestana;
  onCambiar: (pestana: Pestana) => void;
}

export function BarraNavegacion({ activa, onCambiar }: PropsBarraNavegacion) {
  const { bottom } = useSafeAreaInsets();
  return (
    // Figma: 84 px de alto con 24 px de área segura; en el teléfono se usa la del sistema si es mayor
    <View accessibilityRole="tablist" style={[estilos.barra, { paddingBottom: Math.max(bottom, 24) }]}>
      {PESTANAS.map(({ clave, etiqueta, icono }) => {
        const seleccionada = clave === activa;
        // T11: la pestaña inactiva usa «secundario»; «terciario» no llegaba a 4,5:1 (WCAG 1.4.3, ADR 0019)
        const tono = seleccionada ? color.marca.primario : color.texto.secundario;
        return (
          <Pressable
            key={clave}
            accessibilityRole="tab"
            accessibilityLabel={etiqueta}
            aria-selected={seleccionada}
            onPress={() => onCambiar(clave)}
            testID={`pestana-${clave}`}
            style={estilos.pestana}
          >
            <View style={[estilos.indicador, seleccionada && estilos.indicadorActivo]}>
              <Icono nombre={icono} tamano={22} color={tono} />
            </View>
            <Texto variante={seleccionada ? 'pequenoFuerte' : 'pequeno'} color={tono}>
              {etiqueta}
            </Texto>
          </Pressable>
        );
      })}
    </View>
  );
}

const estilos = StyleSheet.create({
  barra: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingTop: 10,
    paddingHorizontal: 8,
    backgroundColor: color.superficie.tarjeta,
    borderTopWidth: 1,
    borderTopColor: color.borde.sutil,
  },
  pestana: { flex: 1, alignItems: 'center', gap: 4, minHeight: TACTIL_MINIMO },
  indicador: { width: 56, height: 30, borderRadius: radio.total, alignItems: 'center', justifyContent: 'center' },
  indicadorActivo: { backgroundColor: color.marca.primarioSuave },
});
