// Política de tratamiento de datos personales (Ley 1581 de 2012). Sin pantalla propia en Figma: se abre desde 1.3 y 5.2.
// BORRADOR (ADR 0018, decisión D): el equipo debe revisar y aprobar este texto antes de la validación con usuarios (T11).
import { StyleSheet, View } from 'react-native';
import { Aviso, Texto } from '@/components';
import { Pantalla } from '@/pantallas/Pantalla';
import { color, espacio } from '@/theme/tokens';

/** Versión que se registra al aceptar (services/api/src/modulos/auth/politica.ts). */
export const VERSION_POLITICA = '1.0';

const SECCIONES: { titulo: string; parrafos: string[] }[] = [
  {
    titulo: 'Responsable',
    parrafos: [
      'RecargaMIO es un prototipo académico del proyecto de grado de la Universidad Nacional Abierta y a Distancia (UNAD). El equipo del proyecto es el responsable del tratamiento de los datos que se recogen en la app.',
    ],
  },
  {
    titulo: 'Qué datos recogemos',
    parrafos: [
      'Tu nombre, tu correo electrónico, tu contraseña (guardada solo como un resumen cifrado que nadie puede leer), el número de las tarjetas MIO que registras (cifrado) y el registro de tus recargas.',
      'No guardamos números de cuentas ni de tarjetas bancarias. El celular de Nequi y los datos de PSE solo viajan a la pasarela de pagos para hacer el pago.',
    ],
  },
  {
    titulo: 'Para qué los usamos',
    parrafos: [
      'Para crear y proteger tu cuenta, consultar el saldo y los viajes de tus tarjetas, hacer las recargas, avisarte cuando el saldo esté bajo y atender tus solicitudes. También usamos datos sin identificarte para medir el funcionamiento del prototipo.',
    ],
  },
  {
    titulo: 'Tus derechos',
    parrafos: [
      'Puedes conocer, actualizar y rectificar tus datos desde Perfil, y eliminar tu cuenta en cualquier momento desde Privacidad y datos. También puedes revocar esta autorización, salvo cuando la ley nos obligue a conservar un registro (por ejemplo, el de las recargas, sin tu nombre ni tu correo).',
    ],
  },
  {
    titulo: 'Contacto',
    parrafos: ['[PENDIENTE: el equipo debe indicar el correo de contacto para consultas y reclamos sobre datos personales.]'],
  },
];

export default function PantallaPolitica() {
  return (
    <Pantalla titulo="Política de tratamiento de datos" separacion={16}>
      <Aviso tipo="advertencia" mensaje="Borrador pendiente de revisión por el equipo del proyecto. Versión 1.0." />
      {SECCIONES.map(({ titulo, parrafos }) => (
        <View key={titulo} style={estilos.seccion}>
          <Texto variante="titulo3" accessibilityRole="header">
            {titulo}
          </Texto>
          {parrafos.map((p) => (
            <Texto key={p} color={color.texto.secundario}>
              {p}
            </Texto>
          ))}
        </View>
      ))}
      <Texto variante="pequeno" color={color.texto.secundario}>
        Versión {VERSION_POLITICA} · Ley 1581 de 2012 y Decreto 1377 de 2013.
      </Texto>
    </Pantalla>
  );
}

const estilos = StyleSheet.create({
  seccion: { gap: espacio[2] },
});
