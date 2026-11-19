// Bandeja de avisos (campana de la pantalla 2.1, HU-05 CA-2). Figma no la dibuja: se arma con los componentes de la
// página 02. Muestra lo mismo que llega por FCM, para que nadie se pierda un aviso aunque las push no lleguen.
import { useEffect } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { useMarcarLeidas, useNotificaciones } from '@/api/hooks';
import type { Notificacion } from '@/api/tipos';
import { Aviso, Icono, Texto } from '@/components';
import { Cargando, ErrorDeCarga } from '@/pantallas/Estados';
import { Pantalla } from '@/pantallas/Pantalla';
import { color, espacio, radio } from '@/theme/tokens';
import { fechaCorta } from '@/utilidades/fechas';

function abrir(n: Notificacion) {
  const recargaId = typeof n.datos.recargaId === 'string' ? n.datos.recargaId : undefined;
  const tarjetaId = typeof n.datos.tarjetaId === 'string' ? n.datos.tarjetaId : undefined;
  if (n.tipo === 'RECARGA_EXITOSA' && recargaId) router.push({ pathname: '/recarga/[id]', params: { id: recargaId } });
  else if (n.tipo === 'SALDO_BAJO') router.navigate({ pathname: '/recargar', params: tarjetaId ? { tarjetaId } : {} });
}

export default function PantallaNotificaciones() {
  const avisos = useNotificaciones();
  const marcar = useMarcarLeidas();
  const lista = avisos.data?.notificaciones ?? [];
  const noLeidas = avisos.data?.noLeidas ?? 0;

  // Al abrir la bandeja, los avisos quedan leídos (se siguen viendo resaltados hasta salir)
  useEffect(() => {
    if (noLeidas > 0 && !marcar.isPending) marcar.mutate();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- solo al llegar avisos sin leer
  }, [noLeidas]);

  return (
    <Pantalla titulo="Avisos" refrescar={{ refrescando: avisos.isRefetching, onRefrescar: () => void avisos.refetch() }}>
      {avisos.isPending ? <Cargando etiqueta="Cargando tus avisos" /> : null}
      {avisos.isError ? <ErrorDeCarga error={avisos.error} onReintentar={() => void avisos.refetch()} /> : null}
      {avisos.data && lista.length === 0 ? <Aviso tipo="info" mensaje="No tienes avisos. Aquí verás las recargas exitosas y las alertas de saldo bajo." /> : null}
      {lista.map((n) => {
        const saldoBajo = n.tipo === 'SALDO_BAJO';
        return (
          <Pressable
            key={n.id}
            accessibilityRole="button"
            accessibilityLabel={`${n.leida ? '' : 'Nuevo. '}${n.titulo}. ${n.cuerpo} ${fechaCorta(n.creadaEn)}`}
            accessibilityHint={saldoBajo ? 'Abre la recarga de esa tarjeta' : 'Abre el comprobante de la recarga'}
            onPress={() => abrir(n)}
            style={({ pressed }) => [estilos.aviso, !n.leida && estilos.noLeido, pressed && estilos.presionado]}
          >
            <View style={[estilos.icono, { backgroundColor: saldoBajo ? color.acento.suave : color.estado.exitoSuave }]}>
              <Icono nombre={saldoBajo ? 'alerta' : 'check'} tamano={20} color={saldoBajo ? color.acento.texto : color.estado.exito} />
            </View>
            <View style={estilos.texto}>
              <Texto variante="cuerpoFuerte">{n.titulo}</Texto>
              <Texto variante="etiqueta" color={color.texto.secundario}>
                {n.cuerpo}
              </Texto>
              <Texto variante="pequeno" color={color.texto.secundario}>
                {fechaCorta(n.creadaEn)}
              </Texto>
            </View>
          </Pressable>
        );
      })}
    </Pantalla>
  );
}

const estilos = StyleSheet.create({
  aviso: {
    flexDirection: 'row',
    gap: espacio[3],
    padding: 16,
    borderRadius: radio.md,
    borderWidth: 1,
    borderColor: color.borde.sutil,
    backgroundColor: color.superficie.tarjeta,
  },
  noLeido: { borderColor: color.marca.primarioBorde, backgroundColor: color.marca.primarioSuave },
  presionado: { opacity: 0.85 },
  icono: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  texto: { flex: 1, gap: 2 },
});
