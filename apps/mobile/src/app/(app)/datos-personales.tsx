// «Datos personales» (5.1) y «Actualizar o rectificar mis datos» (5.2): rectificación (Ley 1581, art. 8; ADR 0015).
// Figma no la dibuja: se arma con los componentes de la página 02. Cambiar el correo pide la contraseña actual.
import { useState } from 'react';
import { router } from 'expo-router';
import { useActualizarPerfil, usePerfil } from '@/api/hooks';
import type { Perfil } from '@/api/tipos';
import { codigoDeError, mensajeDeError } from '@/api/mensajes';
import { Aviso, Boton, CampoTexto, Texto } from '@/components';
import { Cargando } from '@/pantallas/Estados';
import { Pantalla } from '@/pantallas/Pantalla';
import { useSesion } from '@/sesion/ProveedorSesion';
import { color } from '@/theme/tokens';
import { correoValido } from '@/utilidades/validacion';

export default function PantallaDatosPersonales() {
  const perfil = usePerfil();
  if (!perfil.data) {
    return (
      <Pantalla titulo="Datos personales">
        <Cargando />
      </Pantalla>
    );
  }
  return <Formulario key={perfil.data.id} perfil={perfil.data} />;
}

function Formulario({ perfil }: { perfil: Perfil }) {
  const { actualizarUsuario } = useSesion();
  const actualizar = useActualizarPerfil();
  const [nombre, setNombre] = useState(perfil.nombre);
  const [correo, setCorreo] = useState(perfil.correo);
  const [contrasena, setContrasena] = useState('');
  const [errores, setErrores] = useState<{ nombre?: string; correo?: string; contrasena?: string; aviso?: string }>({});
  const [listo, setListo] = useState(false);


  const cambiaCorreo = correo.trim().toLowerCase() !== perfil.correo;
  const cambiaNombre = nombre.trim() !== perfil.nombre;

  async function guardar() {
    const nuevos = {
      nombre: nombre.trim().length >= 3 ? undefined : 'Escribe tu nombre completo.',
      correo: correoValido(correo) ? undefined : 'Escribe un correo electrónico válido.',
      contrasena: cambiaCorreo && !contrasena ? 'Para cambiar el correo escribe tu contraseña actual.' : undefined,
    };
    setErrores(nuevos);
    setListo(false);
    if (Object.values(nuevos).some(Boolean) || (!cambiaCorreo && !cambiaNombre)) return;
    try {
      const actualizado = await actualizar.mutateAsync({
        ...(cambiaNombre ? { nombre: nombre.trim() } : {}),
        ...(cambiaCorreo ? { correo: correo.trim(), contrasenaActual: contrasena } : {}),
      });
      actualizarUsuario({ id: actualizado.id, nombre: actualizado.nombre, correo: actualizado.correo });
      setContrasena('');
      setListo(true);
    } catch (error) {
      const codigo = codigoDeError(error);
      if (codigo === 'CONTRASENA_INCORRECTA') setErrores({ contrasena: mensajeDeError(error) });
      else if (codigo === 'CORREO_REGISTRADO') setErrores({ correo: mensajeDeError(error) });
      else setErrores({ aviso: mensajeDeError(error) });
    }
  }

  return (
    <Pantalla
      titulo="Datos personales"
      pie={
        <>
          <Boton etiqueta="Guardar cambios" onPress={guardar} cargando={actualizar.isPending} deshabilitado={!cambiaCorreo && !cambiaNombre} />
          <Boton etiqueta="Volver" tipo="texto" onPress={() => router.back()} />
        </>
      }
    >
      <Texto color={color.texto.secundario}>Puedes actualizar o corregir tu nombre y tu correo cuando quieras (Ley 1581 de 2012).</Texto>
      {listo ? <Aviso tipo="exito" mensaje="Guardamos tus datos." /> : null}
      {errores.aviso ? <Aviso tipo="error" mensaje={errores.aviso} /> : null}
      <CampoTexto etiqueta="Nombre completo" value={nombre} onChangeText={setNombre} error={errores.nombre} autoComplete="name" />
      <CampoTexto
        etiqueta="Correo electrónico"
        icono="correo"
        value={correo}
        onChangeText={setCorreo}
        error={errores.correo}
        keyboardType="email-address"
        autoCapitalize="none"
        autoComplete="email"
        ayuda="Si lo cambias, te avisaremos al correo anterior."
      />
      {cambiaCorreo ? (
        <CampoTexto
          etiqueta="Contraseña actual"
          contrasena
          value={contrasena}
          onChangeText={setContrasena}
          error={errores.contrasena}
          ayuda="La pedimos para confirmar que eres tú."
          autoComplete="current-password"
        />
      ) : null}
    </Pantalla>
  );
}
