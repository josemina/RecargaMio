// Pantalla 2.1 Mis tarjetas · Figma 12:279 (HU-03 CA-1, HU-05 CA-3, HU-07 CA-2).
import { Pressable, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { useNotificaciones, useTarjetas } from '@/api/hooks';
import { Aviso, Boton, Icono, TarjetaMIO, Texto } from '@/components';
import { Cargando, ErrorDeCarga } from '@/pantallas/Estados';
import { Pantalla } from '@/pantallas/Pantalla';
import { useSesion } from '@/sesion/ProveedorSesion';
import { color, espacio, TACTIL_MINIMO } from '@/theme/tokens';

export default function PantallaInicio() {
  const { usuario } = useSesion();
  const tarjetas = useTarjetas();
  const avisos = useNotificaciones();
  const noLeidas = avisos.data?.noLeidas ?? 0;
  const lista = tarjetas.data;

  return (
    <Pantalla conPestanas separacion={16} refrescar={{ refrescando: tarjetas.isRefetching, onRefrescar: () => void tarjetas.refetch() }}>
      <View style={estilos.saludo}>
        <View style={estilos.textoSaludo}>
          <Texto variante="titulo1" accessibilityRole="header">
            {usuario ? `Hola, ${usuario.nombre.split(' ')[0]}` : 'Hola'}
          </Texto>
          {lista ? (
            <Texto variante="etiqueta" color={color.texto.secundario}>
              Tienes {lista.registradas} de {lista.maximo} tarjetas registradas
            </Texto>
          ) : null}
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={noLeidas > 0 ? `Avisos, ${noLeidas} sin leer` : 'Avisos'}
          onPress={() => router.push('/notificaciones')}
          style={estilos.campana}
          testID="boton-avisos"
        >
          <Icono nombre="campana" tamano={22} color={color.texto.principal} />
          {noLeidas > 0 ? <View style={estilos.punto} /> : null}
        </Pressable>
      </View>

      {tarjetas.isPending ? <Cargando etiqueta="Cargando tus tarjetas" /> : null}
      {tarjetas.isError ? <ErrorDeCarga error={tarjetas.error} onReintentar={() => void tarjetas.refetch()} /> : null}
      {lista?.aviso ? <Aviso tipo="advertencia" mensaje={lista.aviso} /> : null}
      {lista && lista.tarjetas.length === 0 ? (
        <Aviso tipo="info" mensaje="Agrega tu primera tarjeta MIO para ver su saldo y recargarla desde aquí." />
      ) : null}
      {lista?.tarjetas.map((t) => (
        <TarjetaMIO
          key={t.id}
          alias={t.alias}
          ultimos4={t.ultimos4}
          saldo={t.saldo}
          saldoBajo={t.saldoBajo}
          onPress={() => router.push({ pathname: '/tarjetas/[id]', params: { id: t.id } })}
          onRecargar={() => router.navigate({ pathname: '/recargar', params: { tarjetaId: t.id } })}
          testID={`tarjeta-${t.ultimos4}`}
        />
      ))}
      {lista ? (
        <Boton
          etiqueta={`Agregar tarjeta (${lista.registradas}/${lista.maximo})`}
          tipo="secundario"
          punteado
          icono="mas"
          onPress={() => router.push('/tarjetas/agregar')}
        />
      ) : null}
    </Pantalla>
  );
}

const estilos = StyleSheet.create({
  saludo: { flexDirection: 'row', alignItems: 'center', gap: espacio[3] },
  textoSaludo: { flex: 1, gap: 2 },
  campana: {
    width: TACTIL_MINIMO,
    height: TACTIL_MINIMO,
    borderRadius: TACTIL_MINIMO / 2,
    borderWidth: 1,
    borderColor: color.borde.sutil,
    backgroundColor: color.superficie.tarjeta,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Avisos sin leer (no está en Figma; ADR 0018)
  punto: { position: 'absolute', top: 9, right: 10, width: 9, height: 9, borderRadius: 5, backgroundColor: color.estado.error, borderWidth: 1.5, borderColor: color.superficie.tarjeta },
});
