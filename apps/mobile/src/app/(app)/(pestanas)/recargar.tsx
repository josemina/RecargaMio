// Pantalla 3.1 Recargar saldo · Figma 13:376 (HU-01 y HU-02). Datos del medio y términos: ADR 0018, decisiones A y B.
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useTarjetas } from '@/api/hooks';
import type { MedioPago } from '@/api/tipos';
import { Aviso, Boton, SelectorTarjeta, Texto } from '@/components';
import { ElegirTarjeta } from '@/pantallas/ElegirTarjeta';
import { Cargando, ErrorDeCarga } from '@/pantallas/Estados';
import { Pantalla } from '@/pantallas/Pantalla';
import { datosPagoIniciales, FormularioPago, medioParaSolicitud, TotalYPagar, validarPago, type ErroresPago } from '@/pantallas/recarga/FormularioPago';
import { usePago } from '@/pantallas/recarga/usePago';
import { color } from '@/theme/tokens';
import { pesos } from '@/utilidades/formato';

type Parametros = { tarjetaId?: string; monto?: string; medio?: MedioPago };

export default function PantallaRecargar() {
  // Llega desde «Recargar» de una tarjeta (2.1 y 2.3) o desde «Intentar de nuevo» (3.5): si cambian, el formulario empieza de nuevo
  const parametros = useLocalSearchParams<Parametros>();
  return <FormularioRecargar key={`${parametros.tarjetaId}-${parametros.monto}-${parametros.medio}`} parametros={parametros} />;
}

function FormularioRecargar({ parametros }: { parametros: Parametros }) {
  const tarjetas = useTarjetas();
  const { pagar, pagando } = usePago();
  const [tarjetaId, setTarjetaId] = useState<string | undefined>(parametros.tarjetaId);
  const [datos, setDatos] = useState(() => datosPagoIniciales(Number(parametros.monto) || 20000, parametros.medio ?? null));
  const [errores, setErrores] = useState<ErroresPago & { aviso?: string }>({});
  const [eligiendo, setEligiendo] = useState(false);
  const lista = tarjetas.data?.tarjetas ?? [];
  const tarjeta = lista.find((t) => t.id === tarjetaId) ?? lista[0];


  async function enviar() {
    const nuevos = validarPago(datos);
    setErrores(nuevos);
    if (!tarjeta || Object.values(nuevos).some(Boolean)) return;
    const { error } = await pagar({ tarjetaId: tarjeta.id, monto: datos.monto!, aceptaTerminosPasarela: true, ...medioParaSolicitud(datos) });
    if (error) setErrores({ aviso: error });
  }

  return (
    <Pantalla conPestanas separacion={12}>
      <Texto variante="titulo1" accessibilityRole="header">
        Recargar saldo
      </Texto>
      {tarjetas.isPending ? <Cargando etiqueta="Cargando tus tarjetas" /> : null}
      {tarjetas.isError ? <ErrorDeCarga error={tarjetas.error} onReintentar={() => void tarjetas.refetch()} /> : null}
      {tarjetas.data && lista.length === 0 ? (
        <>
          <Aviso tipo="info" mensaje="Aún no tienes tarjetas registradas. Agrega una o recarga la tarjeta de otra persona." />
          <Boton etiqueta="Agregar tarjeta" tipo="secundario" icono="mas" onPress={() => router.push('/tarjetas/agregar')} />
        </>
      ) : null}
      {tarjeta ? (
        <View style={estilos.grupo}>
          <Texto variante="etiqueta" color={color.texto.secundario}>
            Tarjeta
          </Texto>
          <SelectorTarjeta
            tarjeta={`${tarjeta.alias} •••• ${tarjeta.ultimos4}`}
            detalle={tarjeta.saldo === null ? 'Saldo no disponible' : `Saldo actual ${pesos(tarjeta.saldo)}`}
            onPress={() => setEligiendo(true)}
            testID="selector-tarjeta"
          />
        </View>
      ) : null}
      <Boton etiqueta="Recargar la tarjeta de otra persona" tipo="texto" icono="usuarios" onPress={() => router.push('/recarga/tercero')} />
      {errores.aviso ? <Aviso tipo="error" mensaje={errores.aviso} /> : null}
      {tarjeta ? (
        <>
          <FormularioPago datos={datos} onCambiar={setDatos} errores={errores} />
          <TotalYPagar monto={datos.monto} onPagar={enviar} pagando={pagando} />
        </>
      ) : null}

      <ElegirTarjeta
        visible={eligiendo}
        titulo="¿Qué tarjeta quieres recargar?"
        tarjetas={lista}
        seleccionada={tarjeta?.id}
        onElegir={(id) => {
          setTarjetaId(id);
          setEligiendo(false);
        }}
        onCerrar={() => setEligiendo(false)}
      />
    </Pantalla>
  );
}

const estilos = StyleSheet.create({
  grupo: { gap: 6 },
});
