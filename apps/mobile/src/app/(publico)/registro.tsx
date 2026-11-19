// Pantalla 1.3 Crear cuenta · Figma 12:146 (HU-06 CA-1 y CA-2, Ley 1581 de 2012).
import { useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { codigoDeError, mensajeDeError } from '@/api/mensajes';
import { Aviso, Boton, CampoTexto, Casilla, Texto, type RefCampo } from '@/components';
import { Pantalla } from '@/pantallas/Pantalla';
import { useSesion } from '@/sesion/ProveedorSesion';
import { color, fuente } from '@/theme/tokens';
import { correoValido, errorContrasena } from '@/utilidades/validacion';

type Campo = 'nombre' | 'correo' | 'contrasena' | 'confirmacion' | 'politica' | 'aviso';

export default function PantallaRegistro() {
  const { registrar } = useSesion();
  const [nombre, setNombre] = useState('');
  const [correo, setCorreo] = useState('');
  const [contrasena, setContrasena] = useState('');
  const [confirmacion, setConfirmacion] = useState('');
  const [aceptaPolitica, setAceptaPolitica] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [errores, setErrores] = useState<Partial<Record<Campo, string>>>({});
  const refCorreo = useRef<RefCampo>(null);
  const refContrasena = useRef<RefCampo>(null);
  const refConfirmacion = useRef<RefCampo>(null);

  async function enviar() {
    const nuevos: Partial<Record<Campo, string>> = {
      nombre: nombre.trim().length >= 3 ? undefined : 'Escribe tu nombre completo.',
      correo: correoValido(correo) ? undefined : 'Escribe un correo electrónico válido.',
      contrasena: errorContrasena(contrasena),
      confirmacion: confirmacion === contrasena ? undefined : 'Las contraseñas no coinciden.',
      // HU-06 CA-2: sin autorización expresa no se crea la cuenta
      politica: aceptaPolitica ? undefined : 'Para crear la cuenta debes autorizar el tratamiento de tus datos personales.',
    };
    setErrores(nuevos);
    if (Object.values(nuevos).some(Boolean)) return;
    setEnviando(true);
    try {
      await registrar({ nombre: nombre.trim(), correo: correo.trim(), contrasena, aceptaPolitica });
    } catch (error) {
      if (codigoDeError(error) === 'CORREO_REGISTRADO') setErrores({ correo: mensajeDeError(error) });
      else setErrores({ aviso: mensajeDeError(error) });
    } finally {
      setEnviando(false);
    }
  }

  return (
    <Pantalla titulo="Crear cuenta" pie={<Boton etiqueta="Crear cuenta" onPress={enviar} cargando={enviando} />}>
      <Texto color={color.texto.secundario}>Crea tu cuenta para recargar y administrar tus tarjetas MIO.</Texto>
      {errores.aviso ? <Aviso tipo="error" mensaje={errores.aviso} /> : null}
      <CampoTexto
        etiqueta="Nombre completo"
        value={nombre}
        onChangeText={setNombre}
        error={errores.nombre}
        autoComplete="name"
        textContentType="name"
        returnKeyType="next"
        onSubmitEditing={() => refCorreo.current?.focus()}
      />
      <CampoTexto
        ref={refCorreo}
        etiqueta="Correo electrónico"
        value={correo}
        onChangeText={setCorreo}
        error={errores.correo}
        keyboardType="email-address"
        autoCapitalize="none"
        autoComplete="email"
        textContentType="emailAddress"
        returnKeyType="next"
        onSubmitEditing={() => refContrasena.current?.focus()}
      />
      <CampoTexto
        ref={refContrasena}
        etiqueta="Contraseña"
        contrasena
        ayuda="Mínimo 8 caracteres, con letras y números."
        value={contrasena}
        onChangeText={setContrasena}
        error={errores.contrasena}
        autoComplete="new-password"
        textContentType="newPassword"
        returnKeyType="next"
        onSubmitEditing={() => refConfirmacion.current?.focus()}
      />
      <CampoTexto
        ref={refConfirmacion}
        etiqueta="Confirmar contraseña"
        contrasena
        value={confirmacion}
        onChangeText={setConfirmacion}
        error={errores.confirmacion}
        autoComplete="new-password"
        textContentType="newPassword"
      />
      <View>
        <Casilla
          marcada={aceptaPolitica}
          onCambiar={setAceptaPolitica}
          etiqueta="Autorizo el tratamiento de mis datos personales según la Política de tratamiento de datos, Ley 1581 de 2012"
          testID="casilla-politica"
        >
          <Texto variante="pequeno" color={color.texto.secundario}>
            Autorizo el tratamiento de mis datos personales según la{' '}
            {/* Solo resalta: el control para leerla es el botón de abajo, de 48 px (regla 7; revisión de accesibilidad de T11) */}
            <Texto variante="pequeno" color={color.marca.primario} style={estilos.resaltado}>
              Política de tratamiento de datos
            </Texto>{' '}
            (Ley 1581 de 2012).
          </Texto>
        </Casilla>
        {errores.politica ? (
          <Texto variante="pequeno" color={color.estado.error} accessibilityLiveRegion="polite">
            {errores.politica}
          </Texto>
        ) : null}
      </View>
      <Boton etiqueta="Leer la política de tratamiento de datos" tipo="texto" onPress={() => router.push('/politica')} />
    </Pantalla>
  );
}

const estilos = StyleSheet.create({
  resaltado: { fontFamily: fuente.seminegrita },
});
