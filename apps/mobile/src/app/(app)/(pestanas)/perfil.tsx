// Pantalla 5.1 Perfil · Figma 14:846 (RNF-04).
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { usePerfil } from '@/api/hooks';
import { Boton, FilaAjuste, Texto } from '@/components';
import { confirmar } from '@/pantallas/dialogos';
import { Pantalla } from '@/pantallas/Pantalla';
import { useSesion } from '@/sesion/ProveedorSesion';
import { color, espacio, radio } from '@/theme/tokens';

const iniciales = (nombre: string) =>
  nombre
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join('');

export default function PantallaPerfil() {
  const { usuario, salir } = useSesion();
  const perfil = usePerfil();
  const [saliendo, setSaliendo] = useState(false);
  const nombre = perfil.data?.nombre ?? usuario?.nombre ?? '';
  const correo = perfil.data?.correo ?? usuario?.correo ?? '';

  async function cerrarSesion() {
    if (!(await confirmar({ titulo: 'Cerrar sesión', mensaje: '¿Quieres cerrar la sesión en este teléfono?', aceptar: 'Cerrar sesión' }))) return;
    setSaliendo(true);
    await salir();
  }

  return (
    <Pantalla
      conPestanas
      separacion={12}
      pie={
        <View style={estilos.pie}>
          <Boton etiqueta="Cerrar sesión" tipo="secundario" icono="salir" cargando={saliendo} onPress={cerrarSesion} />
          <Texto variante="pequeno" color={color.texto.secundario} style={estilos.centrado}>
            Versión 1.0 · Prototipo académico UNAD
          </Texto>
        </View>
      }
    >
      <Texto variante="titulo1" accessibilityRole="header">
        Perfil
      </Texto>
      <View style={estilos.usuario} accessible accessibilityLabel={`${nombre}, ${correo}`}>
        <View style={estilos.avatar}>
          <Texto variante="titulo3" color={color.texto.invertido}>
            {iniciales(nombre)}
          </Texto>
        </View>
        <View style={estilos.datos}>
          <Texto variante="cuerpoFuerte">{nombre}</Texto>
          <Texto variante="pequeno" color={color.texto.secundario}>
            {correo}
          </Texto>
        </View>
      </View>
      <Texto variante="pequenoFuerte" color={color.texto.secundario} accessibilityRole="header">
        CUENTA
      </Texto>
      <View style={estilos.opciones}>
        <FilaAjuste titulo="Datos personales" icono="perfil" onPress={() => router.push('/datos-personales')} />
        <FilaAjuste titulo="Mis tarjetas" icono="tarjeta" onPress={() => router.navigate('/')} />
        <FilaAjuste titulo="Alertas de saldo bajo" icono="campana" onPress={() => router.push('/alertas')} />
      </View>
      <Texto variante="pequenoFuerte" color={color.texto.secundario} accessibilityRole="header">
        PRIVACIDAD Y AYUDA
      </Texto>
      <View style={estilos.opciones}>
        <FilaAjuste titulo="Privacidad y datos" icono="escudo" onPress={() => router.push('/privacidad')} />
        <FilaAjuste titulo="Ayuda y PQR" icono="mensaje" onPress={() => router.push('/ayuda')} />
      </View>
    </Pantalla>
  );
}

const estilos = StyleSheet.create({
  usuario: {
    minHeight: 100,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 16,
    backgroundColor: color.superficie.tarjeta,
    borderWidth: 1,
    borderColor: color.borde.sutil,
    borderRadius: radio.lg,
  },
  avatar: { width: 56, height: 56, borderRadius: 28, backgroundColor: color.marca.primario, alignItems: 'center', justifyContent: 'center' },
  datos: { flex: 1, gap: 2 },
  opciones: { backgroundColor: color.superficie.tarjeta, borderWidth: 1, borderColor: color.borde.sutil, borderRadius: radio.lg, overflow: 'hidden' },
  pie: { gap: espacio[3] },
  centrado: { textAlign: 'center' },
});
