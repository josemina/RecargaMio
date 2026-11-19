// Lista de tarjetas para elegir una (se abre desde el Selector de tarjeta de las pantallas 3.1 y 4.1).
import { Modal, Pressable, StyleSheet } from 'react-native';
import type { Tarjeta } from '@/api/tipos';
import { Boton, OpcionPago, Texto } from '@/components';
import { color, espacio, radio, sombraTarjeta } from '@/theme/tokens';
import { pesos } from '@/utilidades/formato';

interface Props {
  visible: boolean;
  titulo: string;
  tarjetas: Tarjeta[];
  seleccionada?: string;
  onElegir: (id: string) => void;
  onCerrar: () => void;
}

export function ElegirTarjeta({ visible, titulo, tarjetas, seleccionada, onElegir, onCerrar }: Props) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onCerrar}>
      <Pressable style={estilos.fondo} onPress={onCerrar} accessibilityRole="button" accessibilityLabel="Cerrar la lista de tarjetas">
        <Pressable style={estilos.hoja} onPress={() => undefined} accessible={false}>
          <Texto variante="titulo2" accessibilityRole="header">
            {titulo}
          </Texto>
          {tarjetas.map((t) => (
            <OpcionPago
              key={t.id}
              nombre={t.alias}
              descripcion={`•••• ${t.ultimos4} · ${t.saldo === null ? 'Saldo no disponible' : `Saldo ${pesos(t.saldo)}`}`}
              sigla="MIO"
              seleccionada={t.id === seleccionada}
              onPress={() => onElegir(t.id)}
            />
          ))}
          <Boton etiqueta="Cancelar" tipo="texto" onPress={onCerrar} />
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const estilos = StyleSheet.create({
  fondo: { flex: 1, backgroundColor: 'rgba(27, 31, 42, 0.5)', justifyContent: 'flex-end' },
  hoja: { backgroundColor: color.superficie.fondo, borderTopLeftRadius: radio.xl, borderTopRightRadius: radio.xl, padding: espacio[6], gap: espacio[3], ...sombraTarjeta },
});
