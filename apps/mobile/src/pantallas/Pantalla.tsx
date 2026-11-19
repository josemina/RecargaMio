// Contenedor de las pantallas de Figma (390 × 844): área segura, barra superior opcional, contenido con márgenes de 24 px
// y un «pie» que queda abajo (los botones finales de Figma, después del «Espaciador»). Se desplaza si no cabe,
// por ejemplo con letra grande o con el teclado abierto.
import type { ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, useCanGoBack } from 'expo-router';
import { BarraSuperior } from '@/components';
import type { NombreIcono } from '@/components/Icono';
import { color, espacio } from '@/theme/tokens';

interface Props {
  children: ReactNode;
  /** Título de la barra superior. Sin título, la pantalla no tiene barra (pestañas y pantallas de resultado). */
  titulo?: string;
  /** Por defecto, Atrás regresa a la pantalla anterior. */
  onAtras?: () => void;
  accion?: { icono: NombreIcono; etiqueta: string; onPress: () => void };
  /** Contenido que va al final de la pantalla (botones). */
  pie?: ReactNode;
  /** Separación vertical entre bloques; en Figma es de 14 o 16 px según la pantalla. */
  separacion?: number;
  rellenoSuperior?: number;
  /** La pantalla está dentro de las pestañas: la barra de navegación ya cubre el área segura inferior. */
  conPestanas?: boolean;
  refrescar?: { refrescando: boolean; onRefrescar: () => void };
  testID?: string;
}

export function Pantalla({ children, titulo, onAtras, accion, pie, separacion = 14, rellenoSuperior, conPestanas = false, refrescar, testID }: Props) {
  const { top, bottom } = useSafeAreaInsets();
  const puedeVolver = useCanGoBack();
  const atras = onAtras ?? (puedeVolver ? () => router.back() : undefined);
  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={[estilos.fondo, { paddingTop: top }]} testID={testID}>
      {titulo ? <BarraSuperior titulo={titulo} onAtras={atras} accion={accion} /> : null}
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={[
          estilos.contenido,
          { gap: separacion, paddingTop: rellenoSuperior ?? (titulo ? espacio[2] : espacio[3]), paddingBottom: (conPestanas ? 0 : bottom) + espacio[6] },
        ]}
        refreshControl={refrescar ? <RefreshControl refreshing={refrescar.refrescando} onRefresh={refrescar.onRefrescar} colors={[color.marca.primario]} /> : undefined}
      >
        {children}
        {pie ? (
          <>
            <View style={estilos.espaciador} />
            {pie}
          </>
        ) : null}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const estilos = StyleSheet.create({
  fondo: { flex: 1, backgroundColor: color.superficie.fondo },
  contenido: { flexGrow: 1, paddingHorizontal: espacio[6], width: '100%', maxWidth: 480, alignSelf: 'center' },
  espaciador: { flex: 1 },
});
