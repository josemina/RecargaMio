// Pantalla 2.3 Detalle de tarjeta · Figma 12:447 (HU-07 CA-4, HU-05 CA-1 y CA-4).
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useConfigurarAlerta, useEliminarTarjeta, useRenombrarTarjeta, useTarjeta } from '@/api/hooks';
import { mensajeDeError } from '@/api/mensajes';
import { Aviso, FilaAjuste, FilaDetalle, TarjetaMIO, Texto } from '@/components';
import { DialogoTexto } from '@/pantallas/DialogoTexto';
import { avisar, confirmar } from '@/pantallas/dialogos';
import { Cargando, ErrorDeCarga } from '@/pantallas/Estados';
import { Pantalla } from '@/pantallas/Pantalla';
import { color, radio } from '@/theme/tokens';
import { fechaCorta } from '@/utilidades/fechas';
import { numeroOculto, pesos, pesosHablados } from '@/utilidades/formato';

/** Valor de la alerta cuando se activa por primera vez (el mínimo de la pantalla 4.2 después del pasaje). */
const UMBRAL_INICIAL = 5000;

export default function PantallaDetalleTarjeta() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const tarjeta = useTarjeta(id);
  const renombrar = useRenombrarTarjeta(id);
  const eliminar = useEliminarTarjeta(id);
  const alerta = useConfigurarAlerta();
  const [renombrando, setRenombrando] = useState(false);
  const [errorNombre, setErrorNombre] = useState<string>();
  const t = tarjeta.data;

  async function guardarNombre(alias: string) {
    if (!alias.trim()) return setErrorNombre('Ponle un nombre para identificarla.');
    try {
      await renombrar.mutateAsync(alias.trim());
      setRenombrando(false);
      setErrorNombre(undefined);
      void tarjeta.refetch();
    } catch (error) {
      setErrorNombre(mensajeDeError(error));
    }
  }

  async function quitar() {
    if (!t) return;
    const si = await confirmar({
      titulo: 'Eliminar tarjeta',
      mensaje: `¿Eliminar «${t.alias}» (${numeroOculto(t.ultimos4)}) de tu cuenta? El historial de sus recargas se conserva.`,
      aceptar: 'Eliminar',
      peligro: true,
    });
    if (!si) return;
    try {
      await eliminar.mutateAsync();
      router.back();
    } catch (error) {
      avisar('No se pudo eliminar', mensajeDeError(error));
    }
  }

  async function cambiarAlerta(activa: boolean) {
    if (!t) return;
    try {
      await alerta.mutateAsync({ tarjetaId: t.id, umbral: t.alerta?.umbral ?? UMBRAL_INICIAL, activa });
      void tarjeta.refetch();
    } catch (error) {
      avisar('No se pudo cambiar la alerta', mensajeDeError(error));
    }
  }

  return (
    <Pantalla titulo={t?.alias ?? 'Tarjeta'} accion={t ? { icono: 'editar', etiqueta: 'Renombrar tarjeta', onPress: () => setRenombrando(true) } : undefined}>
      {tarjeta.isPending ? <Cargando etiqueta="Cargando la tarjeta" /> : null}
      {tarjeta.isError ? <ErrorDeCarga error={tarjeta.error} onReintentar={() => void tarjeta.refetch()} /> : null}
      {t ? (
        <>
          <TarjetaMIO
            alias={t.alias}
            ultimos4={t.ultimos4}
            saldo={t.saldo}
            saldoBajo={t.saldoBajo}
            onRecargar={() => router.navigate({ pathname: '/recargar', params: { tarjetaId: t.id } })}
          />
          {t.saldo === null ? <Aviso tipo="advertencia" mensaje="No pudimos consultar el saldo en este momento. Intenta de nuevo en unos minutos." /> : null}
          <Texto variante="titulo3" accessibilityRole="header">
            Información
          </Texto>
          <View style={estilos.informacion}>
            <FilaDetalle etiqueta="Número" valor={numeroOculto(t.ultimos4)} valorHablado={`terminada en ${t.ultimos4.split('').join(' ')}`} />
            <FilaDetalle
              etiqueta="Última recarga"
              valor={t.ultimaRecarga ? `${fechaCorta(t.ultimaRecarga.fecha).split(' · ')[0]} · ${pesos(t.ultimaRecarga.monto)}` : 'Sin recargas'}
              valorHablado={t.ultimaRecarga ? `${fechaCorta(t.ultimaRecarga.fecha).split(' · ')[0]}, ${pesosHablados(t.ultimaRecarga.monto)}` : undefined}
            />
            <FilaDetalle
              etiqueta="Alerta de saldo"
              valor={t.alerta?.activa ? `Menor a ${pesos(t.alerta.umbral)}` : 'Desactivada'}
              valorHablado={t.alerta?.activa ? `menor a ${pesosHablados(t.alerta.umbral)}` : undefined}
            />
          </View>
          <View style={estilos.opciones}>
            <FilaAjuste titulo="Renombrar tarjeta" icono="editar" onPress={() => setRenombrando(true)} />
            <FilaAjuste tipo="interruptor" titulo="Alerta de saldo bajo" activado={Boolean(t.alerta?.activa)} onCambiar={cambiarAlerta} />
            <FilaAjuste tipo="peligro" titulo="Eliminar tarjeta" icono="eliminar" onPress={quitar} />
          </View>
          <DialogoTexto
            visible={renombrando}
            titulo="Renombrar tarjeta"
            etiqueta="Nombre para identificarla"
            valorInicial={t.alias}
            ayuda="Ejemplos: Mi tarjeta, Tarjeta de mamá."
            error={errorNombre}
            aceptar="Guardar"
            guardando={renombrar.isPending}
            maxLength={30}
            onAceptar={guardarNombre}
            onCancelar={() => {
              setRenombrando(false);
              setErrorNombre(undefined);
            }}
          />
        </>
      ) : null}
    </Pantalla>
  );
}

const estilos = StyleSheet.create({
  informacion: { backgroundColor: color.superficie.tarjeta, borderWidth: 1, borderColor: color.borde.sutil, borderRadius: radio.lg, padding: 16 },
  opciones: { backgroundColor: color.superficie.tarjeta, borderWidth: 1, borderColor: color.borde.sutil, borderRadius: radio.lg, overflow: 'hidden' },
});
