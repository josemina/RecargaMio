// Diálogo con un campo de texto (por ejemplo, «Renombrar tarjeta» en la 2.3). Figma no lo dibuja: se arma con
// los componentes de la página 02. Alert.prompt solo existe en iOS.
import { useState } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import { Boton, CampoTexto, Texto } from '@/components';
import { color, espacio, radio, sombraTarjeta } from '@/theme/tokens';

interface Props {
  visible: boolean;
  titulo: string;
  etiqueta: string;
  valorInicial?: string;
  ayuda?: string;
  error?: string;
  aceptar: string;
  guardando?: boolean;
  maxLength?: number;
  /** El campo es una contraseña (paso 2 de «Eliminar mi cuenta»). */
  contrasena?: boolean;
  /** El botón de aceptar es de tipo Peligro. */
  peligro?: boolean;
  /** Texto explicativo antes del campo. */
  mensaje?: string;
  onAceptar: (valor: string) => void;
  onCancelar: () => void;
}

export function DialogoTexto(props: Props) {
  return (
    <Modal visible={props.visible} transparent animationType="fade" onRequestClose={props.onCancelar} accessibilityViewIsModal>
      {/* El contenido se monta al abrirse: así el campo empieza siempre con el valor inicial */}
      {props.visible ? <Contenido {...props} /> : null}
    </Modal>
  );
}

function Contenido({ titulo, etiqueta, valorInicial = '', ayuda, error, aceptar, guardando, maxLength, contrasena, peligro, mensaje, onAceptar, onCancelar }: Props) {
  const [valor, setValor] = useState(valorInicial);
  return (
    <>
      <Pressable style={estilos.fondo} onPress={onCancelar} accessibilityLabel="Cerrar" accessibilityRole="button">
        <Pressable style={estilos.caja} onPress={() => undefined} accessible={false}>
          <Texto variante="titulo2" accessibilityRole="header">
            {titulo}
          </Texto>
          {mensaje ? <Texto color={color.texto.secundario}>{mensaje}</Texto> : null}
          <CampoTexto
            etiqueta={etiqueta}
            value={valor}
            onChangeText={setValor}
            ayuda={ayuda}
            error={error}
            autoFocus
            maxLength={maxLength}
            contrasena={contrasena}
            onSubmitEditing={() => onAceptar(valor)}
          />
          <View style={estilos.botones}>
            <View style={estilos.boton}>
              <Boton etiqueta="Cancelar" tipo="secundario" onPress={onCancelar} />
            </View>
            <View style={estilos.boton}>
              <Boton etiqueta={aceptar} tipo={peligro ? 'peligro' : 'primario'} onPress={() => onAceptar(valor)} cargando={guardando} />
            </View>
          </View>
        </Pressable>
      </Pressable>
    </>
  );
}

const estilos = StyleSheet.create({
  fondo: { flex: 1, backgroundColor: 'rgba(27, 31, 42, 0.5)', justifyContent: 'center', padding: espacio[6] },
  caja: { backgroundColor: color.superficie.tarjeta, borderRadius: radio.xl, padding: espacio[6], gap: espacio[4], width: '100%', maxWidth: 420, alignSelf: 'center', ...sombraTarjeta },
  botones: { flexDirection: 'row', gap: espacio[3] },
  boton: { flex: 1 },
});
