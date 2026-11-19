// Campo de texto · Figma 11:40 (página 02). Entrada con etiqueta visible, ayuda y estado de error (WCAG 3.3.1 y 3.3.2).
import { useState, type ComponentRef, type Ref } from 'react';
import { Platform, Pressable, StyleSheet, TextInput, View, type TextInputProps } from 'react-native';
import { color, ESCALA_TEXTO_MAXIMA, espacio, radio, TACTIL_MINIMO, tipografia } from '@/theme/tokens';
import { Icono, type NombreIcono } from './Icono';
import { Texto } from './Texto';

/** Referencia a un campo, para mover el foco al siguiente con «Siguiente» del teclado. */
export type RefCampo = ComponentRef<typeof TextInput>;

export interface PropsCampoTexto extends Omit<TextInputProps, 'style' | 'secureTextEntry'> {
  etiqueta: string;
  ayuda?: string;
  /** Mensaje de error: pinta el borde en rojo y reemplaza la ayuda. */
  error?: string;
  /** Campo de contraseña: oculta el texto y agrega el botón del ojo para mostrarlo. */
  contrasena?: boolean;
  /** Ícono decorativo al final del campo (Figma: «correo» en los campos de correo). */
  icono?: NombreIcono;
  /** Solo para el catálogo: dibuja el estado de foco sin tener el foco. */
  mostrarFoco?: boolean;
  /** En React 19 la referencia es una propiedad normal (para mover el foco al siguiente campo). */
  ref?: Ref<RefCampo>;
}

export function CampoTexto({ etiqueta, ayuda, error, contrasena = false, icono, mostrarFoco = false, onFocus, onBlur, testID, ref, ...props }: PropsCampoTexto) {
  const [foco, setFoco] = useState(false);
  const [visible, setVisible] = useState(false);
  const borde = error ? estilos.error : foco || mostrarFoco ? estilos.foco : estilos.normal;
  const textoAyuda = error ?? ayuda;

  return (
    <View style={estilos.contenedor}>
      <Texto variante="etiqueta" color={color.texto.secundario}>
        {etiqueta}
      </Texto>
      <View style={[estilos.entrada, borde]}>
        <TextInput
          ref={ref}
          accessibilityLabel={etiqueta}
          accessibilityHint={textoAyuda}
          aria-invalid={Boolean(error)}
          maxFontSizeMultiplier={ESCALA_TEXTO_MAXIMA}
          placeholderTextColor={color.texto.secundario}
          secureTextEntry={contrasena && !visible}
          onFocus={(e) => {
            setFoco(true);
            onFocus?.(e);
          }}
          onBlur={(e) => {
            setFoco(false);
            onBlur?.(e);
          }}
          testID={testID}
          style={estilos.texto}
          {...props}
        />
        {contrasena ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={visible ? 'Ocultar contraseña' : 'Mostrar contraseña'}
            onPress={() => setVisible((v) => !v)}
            style={estilos.ojo}
          >
            <Icono nombre="ojo" tamano={20} color={color.texto.secundario} />
          </Pressable>
        ) : icono ? (
          <View style={estilos.icono}>
            <Icono nombre={icono} tamano={20} color={color.texto.secundario} />
          </View>
        ) : null}
      </View>
      {textoAyuda ? (
        <Texto variante="pequeno" color={error ? color.estado.error : color.texto.secundario} accessibilityLiveRegion={error ? 'polite' : 'none'}>
          {textoAyuda}
        </Texto>
      ) : null}
    </View>
  );
}

const estilos = StyleSheet.create({
  contenedor: { gap: 6, alignSelf: 'stretch' },
  entrada: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    gap: espacio[2],
    paddingLeft: 16,
    paddingRight: 4,
    borderRadius: radio.md,
    backgroundColor: color.superficie.tarjeta,
  },
  // El borde de foco y de error es de 2 px; se compensa el relleno para que el texto no salte
  normal: { borderWidth: 1, borderColor: color.borde.predeterminado },
  foco: { borderWidth: 2, borderColor: color.marca.primario, paddingLeft: 15, paddingRight: 3 },
  error: { borderWidth: 2, borderColor: color.estado.error, paddingLeft: 15, paddingRight: 3 },
  // En la web se quita el contorno del navegador: el foco ya se ve con el borde azul de 2 px de Figma
  texto: { ...tipografia.cuerpo, flex: 1, color: color.texto.principal, paddingVertical: 14, paddingRight: 12, ...(Platform.OS === 'web' ? ({ outlineStyle: 'none' } as object) : {}) },
  icono: { paddingRight: 12 },
  ojo: { width: TACTIL_MINIMO, height: TACTIL_MINIMO, alignItems: 'center', justifyContent: 'center' },
});
