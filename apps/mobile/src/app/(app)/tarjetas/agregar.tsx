// Pantallas 2.2 Agregar tarjeta y 2.4 Límite de tarjetas · Figma 12:388 y 12:540 (HU-07 CA-1 y CA-3).
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { useAgregarTarjeta, useTarjetas } from '@/api/hooks';
import { codigoDeError, mensajeDeError } from '@/api/mensajes';
import { Aviso, Boton, CampoTexto, Insignia, Texto } from '@/components';
import { Pantalla } from '@/pantallas/Pantalla';
import { color, espacio, fuente, radio } from '@/theme/tokens';
import { formatearNumeroTarjeta, numeroTarjetaValido, soloDigitos } from '@/utilidades/validacion';

export default function PantallaAgregarTarjeta() {
  const tarjetas = useTarjetas();
  const agregar = useAgregarTarjeta();
  const [numero, setNumero] = useState('');
  const [alias, setAlias] = useState('');
  const [errores, setErrores] = useState<{ numero?: string; alias?: string; aviso?: string }>({});
  const registradas = tarjetas.data?.registradas ?? 0;
  const maximo = tarjetas.data?.maximo ?? 5;
  // 2.4: con 5 de 5 tarjetas no se puede agregar otra (HU-07 CA-3)
  const enLimite = registradas >= maximo || codigoDeError(agregar.error) === 'LIMITE_TARJETAS';

  async function guardar() {
    const nuevos = {
      numero: numeroTarjetaValido(numero) ? undefined : 'El número de la tarjeta MIO debe tener 10 dígitos.',
      alias: alias.trim() ? undefined : 'Ponle un nombre para identificarla.',
    };
    setErrores(nuevos);
    if (nuevos.numero || nuevos.alias) return;
    try {
      await agregar.mutateAsync({ numero: soloDigitos(numero), alias: alias.trim() });
      router.back();
    } catch (error) {
      const codigo = codigoDeError(error);
      if (codigo === 'TARJETA_NO_EXISTE' || codigo === 'TARJETA_INACTIVA' || codigo === 'TARJETA_YA_REGISTRADA') setErrores({ numero: mensajeDeError(error) });
      else if (codigo !== 'LIMITE_TARJETAS') setErrores({ aviso: mensajeDeError(error) });
    }
  }

  return (
    <Pantalla
      titulo="Agregar tarjeta"
      separacion={16}
      pie={
        <View style={estilos.pie}>
          <Boton etiqueta="Guardar tarjeta" onPress={guardar} cargando={agregar.isPending} deshabilitado={enLimite} />
          {enLimite ? <Boton etiqueta="Administrar mis tarjetas" tipo="texto" onPress={() => router.navigate('/')} /> : null}
        </View>
      }
    >
      {enLimite ? (
        <Aviso tipo="advertencia" mensaje={`Ya tienes ${maximo} de ${maximo} tarjetas registradas. Para agregar una nueva, elimina una que ya no uses.`} />
      ) : (
        <>
          <Aviso tipo="info" mensaje="Encuentra el número de 10 dígitos en el reverso de tu tarjeta MIO." />
          <View style={estilos.reverso} accessible accessibilityLabel="Ejemplo del reverso de la tarjeta MIO: el número está debajo del texto">
            <Texto variante="pequeno" color={color.texto.secundario}>
              Reverso de la tarjeta MIO
            </Texto>
            <Texto variante="titulo1" color={color.marca.primarioOscuro} style={estilos.numeroEjemplo}>
              1234 5678 90
            </Texto>
            <View style={estilos.barras} />
          </View>
        </>
      )}
      {errores.aviso ? <Aviso tipo="error" mensaje={errores.aviso} /> : null}
      <CampoTexto
        etiqueta="Número de la tarjeta"
        value={numero}
        onChangeText={(v) => setNumero(formatearNumeroTarjeta(v))}
        error={errores.numero}
        placeholder="0000 0000 00"
        keyboardType="number-pad"
        maxLength={12}
        editable={!enLimite}
      />
      <CampoTexto
        etiqueta="Nombre para identificarla"
        value={alias}
        onChangeText={setAlias}
        error={errores.alias}
        ayuda={enLimite ? undefined : 'Ejemplos: Mi tarjeta, Tarjeta de mamá.'}
        placeholder="Ej.: Tarjeta de Juan"
        maxLength={30}
        editable={!enLimite}
      />
      {tarjetas.data ? (
        enLimite ? (
          <Insignia etiqueta={`${maximo} de ${maximo} tarjetas`} tipo="error" />
        ) : (
          <Insignia etiqueta={`Será la tarjeta ${registradas + 1} de ${maximo}`} tipo="neutral" />
        )
      ) : null}
    </Pantalla>
  );
}

const estilos = StyleSheet.create({
  reverso: { backgroundColor: color.marca.primarioSuave, borderRadius: radio.xl, padding: 20, gap: 6 },
  numeroEjemplo: { fontFamily: fuente.negrita, letterSpacing: 2 },
  barras: { width: 120, height: 8, borderRadius: 2, backgroundColor: color.marca.primarioBorde },
  pie: { gap: espacio[4] },
});
