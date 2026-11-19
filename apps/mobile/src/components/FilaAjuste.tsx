// Fila de ajuste · Figma 11:270 (página 02). Fila de lista para perfil, privacidad y alertas.
// Tipo «peligro» para acciones destructivas (por ejemplo, eliminar la cuenta).
import { Pressable, StyleSheet, View } from 'react-native';
import { color, espacio } from '@/theme/tokens';
import { Icono, type NombreIcono } from './Icono';
import { Interruptor } from './Interruptor';
import { Texto } from './Texto';

interface PropsComunes {
  titulo: string;
  descripcion?: string;
  icono?: NombreIcono;
  testID?: string;
}

export type PropsFilaAjuste =
  | (PropsComunes & { tipo?: 'navegacion' | 'peligro'; onPress?: () => void })
  | (PropsComunes & { tipo: 'interruptor'; activado: boolean; onCambiar: (activado: boolean) => void });

export function FilaAjuste(props: PropsFilaAjuste) {
  const { titulo, descripcion, icono = 'campana', testID } = props;
  const peligro = props.tipo === 'peligro';
  const colorPrincipal = peligro ? color.estado.error : color.texto.principal;
  const colorIcono = peligro ? color.estado.error : color.marca.primario;

  const contenido = (
    <>
      <Icono nombre={icono} tamano={22} color={colorIcono} />
      <View style={estilos.texto}>
        <Texto variante="cuerpoFuerte" color={colorPrincipal}>
          {titulo}
        </Texto>
        {descripcion ? (
          <Texto variante="pequeno" color={color.texto.secundario}>
            {descripcion}
          </Texto>
        ) : null}
      </View>
    </>
  );

  if (props.tipo === 'interruptor') {
    // Toda la fila cambia el interruptor; el lector de pantalla la anuncia como un solo interruptor
    return (
      <Pressable
        accessibilityRole="switch"
        accessibilityLabel={descripcion ? `${titulo}. ${descripcion}` : titulo}
        aria-checked={props.activado}
        onPress={() => props.onCambiar(!props.activado)}
        testID={testID}
        style={[estilos.base, estilos.conInterruptor]}
      >
        {contenido}
        <Interruptor activado={props.activado} etiqueta={titulo} decorativo />
      </Pressable>
    );
  }

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={descripcion ? `${titulo}. ${descripcion}` : titulo}
      onPress={props.onPress}
      testID={testID}
      style={({ pressed }) => [estilos.base, pressed && estilos.presionada]}
    >
      {contenido}
      <Icono nombre="siguiente" tamano={20} color={color.texto.terciario} />
    </Pressable>
  );
}

const estilos = StyleSheet.create({
  base: {
    minHeight: 50,
    flexDirection: 'row',
    alignItems: 'center',
    gap: espacio[3],
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: color.superficie.tarjeta,
    alignSelf: 'stretch',
  },
  conInterruptor: { minHeight: 56 },
  texto: { flex: 1, gap: 2 },
  presionada: { backgroundColor: color.superficie.fondo },
});
