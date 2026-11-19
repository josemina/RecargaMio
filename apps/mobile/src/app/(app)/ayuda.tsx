// Pantalla 5.3 Ayuda y PQR · Figma 14:1053. Las PQR y el canal de soporte quedaron fuera del PMV (ADR 0015):
// los botones se muestran deshabilitados y marcados como «Próximamente».
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Aviso, Boton, FilaAjuste, Texto } from '@/components';
import { Pantalla } from '@/pantallas/Pantalla';
import { color, radio } from '@/theme/tokens';

const PREGUNTAS = [
  {
    pregunta: '¿Cuánto tarda en verse mi recarga?',
    respuesta:
      'Normalmente menos de un minuto: el saldo se acredita cuando la pasarela confirma el pago. Si pasan más de 3 minutos, abre la recarga desde tus avisos y toca «Actualizar estado».',
  },
  {
    pregunta: 'Pagué y no veo el saldo',
    respuesta:
      'Si la pasarela aprobó el pago, RecargaMIO reintenta la acreditación sola cada 30 segundos: no pagues de nuevo. Revisa el estado en tus avisos o en el Historial de la tarjeta.',
  },
  {
    pregunta: '¿Cómo pido la reversión de un pago?',
    respuesta:
      'En este prototipo los pagos son de prueba y no se cobra dinero real. En la versión final podrás pedirla con una PQR y la referencia de la recarga (Ley 1480 de 2011).',
  },
  {
    pregunta: '¿Qué hago si pierdo mi tarjeta?',
    respuesta:
      'Elimínala de tu cuenta desde su detalle para que no aparezca al recargar. El bloqueo de la tarjeta física lo atiende el MIO en sus puntos de atención.',
  },
];

export default function PantallaAyuda() {
  const [abierta, setAbierta] = useState<number | null>(null);
  return (
    <Pantalla
      titulo="Ayuda y PQR"
      pie={
        <>
          <Boton etiqueta="Radicar una PQR (próximamente)" icono="mensaje" deshabilitado />
          <Boton etiqueta="Escribir a soporte (próximamente)" tipo="secundario" icono="correo" deshabilitado />
        </>
      }
    >
      <Texto variante="titulo3" accessibilityRole="header">
        Preguntas frecuentes
      </Texto>
      <View style={estilos.opciones}>
        {PREGUNTAS.map((p, i) => (
          <View key={p.pregunta}>
            <FilaAjuste titulo={p.pregunta} icono="ayuda" onPress={() => setAbierta(abierta === i ? null : i)} />
            {abierta === i ? (
              <Texto color={color.texto.secundario} style={estilos.respuesta} accessibilityLiveRegion="polite">
                {p.respuesta}
              </Texto>
            ) : null}
          </View>
        ))}
      </View>
      <Texto variante="titulo3" accessibilityRole="header">
        ¿Necesitas algo más?
      </Texto>
      <Texto color={color.texto.secundario}>Radica una petición, queja o reclamo y recibe un número de seguimiento. Te responderemos por correo.</Texto>
      <Aviso tipo="info" mensaje="Las PQR y el canal de soporte llegarán en una próxima versión de RecargaMIO." />
    </Pantalla>
  );
}

const estilos = StyleSheet.create({
  opciones: { backgroundColor: color.superficie.tarjeta, borderWidth: 1, borderColor: color.borde.sutil, borderRadius: radio.lg, overflow: 'hidden' },
  respuesta: { paddingHorizontal: 16, paddingBottom: 14, paddingLeft: 50 },
});
