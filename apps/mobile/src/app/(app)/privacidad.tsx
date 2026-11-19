// Pantalla 5.2 Privacidad y datos · Figma 14:971 (RNF-04, Ley 1581 de 2012, ADR 0015).
// «Descargar mis datos» quedó fuera del PMV: se muestra como «Próximamente». Eliminar la cuenta pide confirmación
// en dos pasos: un diálogo y luego la contraseña (ADR 0018, decisión E).
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { usePerfil } from '@/api/hooks';
import { codigoDeError, mensajeDeError } from '@/api/mensajes';
import { Aviso, FilaAjuste, Icono, Texto } from '@/components';
import { DialogoTexto } from '@/pantallas/DialogoTexto';
import { avisar, confirmar } from '@/pantallas/dialogos';
import { Pantalla } from '@/pantallas/Pantalla';
import { useSesion } from '@/sesion/ProveedorSesion';
import { color, radio } from '@/theme/tokens';
import { fechaCorta } from '@/utilidades/fechas';

export default function PantallaPrivacidad() {
  const { cliente, olvidarSesion } = useSesion();
  const perfil = usePerfil();
  const [pidiendoClave, setPidiendoClave] = useState(false);
  const [eliminando, setEliminando] = useState(false);
  const [error, setError] = useState<string>();
  const politica = perfil.data?.politica;

  async function empezarEliminacion() {
    const si = await confirmar({
      titulo: 'Eliminar mi cuenta',
      mensaje:
        'Se borrarán tus tarjetas, alertas e historial, y no podrás volver a ingresar con esta cuenta. Las recargas se conservan sin tu nombre ni tu correo. Esta acción no se puede deshacer.',
      aceptar: 'Continuar',
      peligro: true,
    });
    if (si) setPidiendoClave(true);
  }

  async function eliminar(contrasena: string) {
    if (!contrasena) return setError('Escribe tu contraseña.');
    setEliminando(true);
    try {
      await cliente.peticion('/me', { metodo: 'DELETE', cuerpo: { contrasena } });
      setPidiendoClave(false);
      avisar('Cuenta eliminada', 'Tu cuenta de RecargaMIO fue eliminada. Te enviamos una confirmación por correo.');
      await olvidarSesion();
    } catch (e) {
      if (codigoDeError(e) === 'CONTRASENA_INCORRECTA') setError(mensajeDeError(e));
      else {
        setPidiendoClave(false);
        avisar('No se pudo eliminar la cuenta', mensajeDeError(e));
      }
    } finally {
      setEliminando(false);
    }
  }

  return (
    <Pantalla
      titulo="Privacidad y datos"
      pie={
        <View style={estilos.opciones}>
          <FilaAjuste tipo="peligro" titulo="Eliminar mi cuenta" descripcion="Se borrarán tus tarjetas, alertas e historial." icono="eliminar" onPress={empezarEliminacion} />
        </View>
      }
    >
      {politica ? (
        <Aviso tipo="exito" mensaje={`Autorizaste el tratamiento de tus datos el ${fechaCorta(politica.aceptadaEn).split(' · ')[0]} (política versión ${politica.version}).`} />
      ) : null}
      <View style={estilos.opciones}>
        <FilaAjuste titulo="Política de tratamiento de datos" icono="documento" onPress={() => router.push('/politica')} />
        <FilaAjuste
          titulo="Descargar mis datos"
          descripcion="Próximamente: recibirás un archivo con tu información."
          icono="descargar"
          onPress={() => avisar('Próximamente', 'La descarga de tus datos llegará en una próxima versión de RecargaMIO.')}
        />
        <FilaAjuste titulo="Actualizar o rectificar mis datos" icono="editar" onPress={() => router.push('/datos-personales')} />
      </View>
      <View style={estilos.nota}>
        <Icono nombre="escudo" tamano={20} color={color.estado.exito} />
        <Texto variante="etiqueta" color={color.texto.secundario} style={estilos.textoNota}>
          RecargaMIO no guarda datos de tus cuentas ni de tus tarjetas bancarias: el pago lo procesa directamente la pasarela.
        </Texto>
      </View>
      <DialogoTexto
        visible={pidiendoClave}
        titulo="Confirma con tu contraseña"
        mensaje="Para eliminar tu cuenta, escribe tu contraseña."
        etiqueta="Contraseña"
        contrasena
        error={error}
        aceptar="Eliminar cuenta"
        peligro
        guardando={eliminando}
        onAceptar={eliminar}
        onCancelar={() => {
          setPidiendoClave(false);
          setError(undefined);
        }}
      />
    </Pantalla>
  );
}

const estilos = StyleSheet.create({
  opciones: { backgroundColor: color.superficie.tarjeta, borderWidth: 1, borderColor: color.borde.sutil, borderRadius: radio.lg, overflow: 'hidden' },
  nota: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  textoNota: { flex: 1 },
});
