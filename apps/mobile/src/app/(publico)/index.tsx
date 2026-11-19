// Pantalla 1.1 Inicio de sesión y 1.2, su estado de error · Figma 12:3 y 12:73 (HU-06 CA-3 y CA-4).
import { useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { codigoDeError, mensajeDeError } from '@/api/mensajes';
import { ErrorApi } from '@/api/errores';
import { Aviso, Boton, CampoTexto, Insignia, Texto, type RefCampo } from '@/components';
import { Pantalla } from '@/pantallas/Pantalla';
import { useSesion } from '@/sesion/ProveedorSesion';
import { color, espacio, radio } from '@/theme/tokens';
import { correoValido } from '@/utilidades/validacion';

export function Marca() {
  return (
    <View style={estilos.marca} accessible accessibilityRole="header" accessibilityLabel="RecargaMIO. Recarga tu tarjeta MIO desde el celular">
      <View style={estilos.logo}>
        <Texto variante="titulo1" color={color.texto.invertido}>
          R
        </Texto>
      </View>
      <View style={estilos.nombre}>
        <Texto variante="titulo1" color={color.marca.primarioOscuro}>
          RecargaMIO
        </Texto>
        <Texto variante="pequeno" color={color.texto.secundario}>
          Recarga tu tarjeta MIO desde el celular
        </Texto>
      </View>
    </View>
  );
}

export default function PantallaIngreso() {
  const { ingresar } = useSesion();
  const [correo, setCorreo] = useState('');
  const [contrasena, setContrasena] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [errores, setErrores] = useState<{ correo?: string; contrasena?: string; aviso?: string }>({});
  const campoContrasena = useRef<RefCampo>(null);

  async function enviar() {
    const nuevos = {
      correo: correoValido(correo) ? undefined : 'Escribe un correo electrónico válido.',
      contrasena: contrasena ? undefined : 'Escribe tu contraseña.',
    };
    setErrores(nuevos);
    if (nuevos.correo || nuevos.contrasena) return;
    setEnviando(true);
    try {
      // Si sale bien, el diseño raíz cambia a las pestañas (rutas protegidas)
      await ingresar(correo.trim(), contrasena);
    } catch (error) {
      if (codigoDeError(error) === 'CREDENCIALES_INVALIDAS') {
        const restantes = (error as ErrorApi).datos.intentosRestantes as number | undefined;
        setErrores({
          contrasena:
            restantes === undefined
              ? 'Correo o contraseña incorrectos.'
              : `Correo o contraseña incorrectos. Te ${restantes === 1 ? 'queda 1 intento' : `quedan ${restantes} intentos`}.`,
          aviso: 'Por seguridad, después de 5 intentos fallidos el ingreso se bloquea durante 15 minutos.',
        });
      } else {
        setErrores({ aviso: mensajeDeError(error) });
      }
    } finally {
      setEnviando(false);
    }
  }

  return (
    <Pantalla
      rellenoSuperior={28}
      pie={
        <View style={estilos.pie}>
          <Texto variante="pequeno" color={color.texto.secundario} style={estilos.centrado}>
            Al continuar aceptas el tratamiento de tus datos personales conforme a la Ley 1581 de 2012.
          </Texto>
          <Insignia etiqueta="Prototipo académico · Pagos en modo de pruebas" tipo="neutral" centrada />
        </View>
      }
    >
      <Marca />
      <View style={estilos.separacion} />
      <Texto variante="titulo1" accessibilityRole="header">
        Ingresa a tu cuenta
      </Texto>
      {errores.aviso ? <Aviso tipo="error" mensaje={errores.aviso} testID="aviso-ingreso" /> : null}
      <CampoTexto
        etiqueta="Correo electrónico"
        icono="correo"
        value={correo}
        onChangeText={setCorreo}
        error={errores.correo}
        keyboardType="email-address"
        autoCapitalize="none"
        autoComplete="email"
        textContentType="emailAddress"
        returnKeyType="next"
        onSubmitEditing={() => campoContrasena.current?.focus()}
      />
      <CampoTexto
        ref={campoContrasena}
        etiqueta="Contraseña"
        contrasena
        value={contrasena}
        onChangeText={setContrasena}
        error={errores.contrasena}
        autoComplete="current-password"
        textContentType="password"
        returnKeyType="go"
        onSubmitEditing={enviar}
      />
      <Boton etiqueta="¿Olvidaste tu contraseña?" tipo="texto" onPress={() => router.push('/recuperar')} />
      <Boton etiqueta="Ingresar" onPress={enviar} cargando={enviando} />
      <Texto variante="pequeno" color={color.texto.secundario} style={estilos.centrado}>
        ¿Aún no tienes cuenta?
      </Texto>
      <Boton etiqueta="Crear cuenta" tipo="secundario" onPress={() => router.push('/registro')} />
    </Pantalla>
  );
}

const estilos = StyleSheet.create({
  marca: { flexDirection: 'row', alignItems: 'center', gap: espacio[3] },
  logo: { width: 56, height: 56, borderRadius: radio.lg, backgroundColor: color.marca.primario, alignItems: 'center', justifyContent: 'center' },
  nombre: { flex: 1, gap: 2 },
  separacion: { height: 8 },
  centrado: { textAlign: 'center' },
  pie: { gap: 14 },
});
