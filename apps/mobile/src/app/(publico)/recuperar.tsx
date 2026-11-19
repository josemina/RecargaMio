// Pantalla 1.4 Recuperar contraseña · Figma 12:223 (HU-06). El enlace llega al correo y abre la página /restablecer de la API.
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { mensajeDeError } from '@/api/mensajes';
import { Aviso, Boton, CampoTexto, Icono, Texto } from '@/components';
import { Pantalla } from '@/pantallas/Pantalla';
import { useSesion } from '@/sesion/ProveedorSesion';
import { color } from '@/theme/tokens';
import { correoValido } from '@/utilidades/validacion';

export default function PantallaRecuperar() {
  const { cliente } = useSesion();
  const [correo, setCorreo] = useState('');
  const [error, setError] = useState<string>();
  const [resultado, setResultado] = useState<{ tipo: 'exito' | 'error'; mensaje: string }>();
  const [enviando, setEnviando] = useState(false);

  async function enviar() {
    if (!correoValido(correo)) return setError('Escribe un correo electrónico válido.');
    setError(undefined);
    setEnviando(true);
    try {
      const { mensaje } = await cliente.peticion<{ mensaje: string }>('/auth/recuperar', { metodo: 'POST', cuerpo: { correo: correo.trim() }, autenticada: false });
      setResultado({ tipo: 'exito', mensaje });
    } catch (e) {
      setResultado({ tipo: 'error', mensaje: mensajeDeError(e) });
    } finally {
      setEnviando(false);
    }
  }

  return (
    <Pantalla
      titulo="Recuperar contraseña"
      separacion={16}
      rellenoSuperior={16}
      pie={<Boton etiqueta="Volver a iniciar sesión" tipo="texto" onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))} />}
    >
      <View style={estilos.centrado}>
        <View style={estilos.circulo}>
          <Icono nombre="candado" tamano={32} color={color.marca.primario} />
        </View>
      </View>
      <Texto variante="titulo2" accessibilityRole="header" style={estilos.texto}>
        ¿Olvidaste tu contraseña?
      </Texto>
      <Texto color={color.texto.secundario} style={estilos.texto}>
        Escribe el correo con el que te registraste y te enviaremos un enlace para crear una nueva contraseña.
      </Texto>
      <CampoTexto
        etiqueta="Correo electrónico"
        icono="correo"
        value={correo}
        onChangeText={setCorreo}
        error={error}
        keyboardType="email-address"
        autoCapitalize="none"
        autoComplete="email"
        returnKeyType="send"
        onSubmitEditing={enviar}
      />
      <Boton etiqueta="Enviar enlace" onPress={enviar} cargando={enviando} />
      {resultado ? <Aviso tipo={resultado.tipo} mensaje={resultado.mensaje} /> : null}
    </Pantalla>
  );
}

const estilos = StyleSheet.create({
  centrado: { alignItems: 'center' },
  circulo: { width: 72, height: 72, borderRadius: 36, backgroundColor: color.marca.primarioSuave, alignItems: 'center', justifyContent: 'center' },
  texto: { textAlign: 'center' },
});
