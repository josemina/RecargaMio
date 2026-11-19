// Pantalla 4.1 Historial · Figma 14:606 (HU-03 CA-2 y CA-3): recargas y viajes de una tarjeta, agrupados por fecha.
import { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useMovimientos, useTarjetas } from '@/api/hooks';
import type { FiltroMovimientos, Movimiento as DatoMovimiento } from '@/api/tipos';
import { Aviso, Boton, Chip, Movimiento, SelectorTarjeta, Texto } from '@/components';
import { ElegirTarjeta } from '@/pantallas/ElegirTarjeta';
import { Cargando, ErrorDeCarga } from '@/pantallas/Estados';
import { Pantalla } from '@/pantallas/Pantalla';
import { color, espacio } from '@/theme/tokens';
import { fechaCorta, grupoDeFecha } from '@/utilidades/fechas';
import { pesos } from '@/utilidades/formato';

const FILTROS: { codigo: FiltroMovimientos; etiqueta: string }[] = [
  { codigo: 'todo', etiqueta: 'Todo' },
  { codigo: 'recargas', etiqueta: 'Recargas' },
  { codigo: 'viajes', etiqueta: 'Viajes' },
];

export default function PantallaHistorial() {
  const parametros = useLocalSearchParams<{ tarjetaId?: string }>();
  const tarjetas = useTarjetas();
  const [tarjetaId, setTarjetaId] = useState<string | undefined>(parametros.tarjetaId);
  const [filtro, setFiltro] = useState<FiltroMovimientos>('todo');
  const [eligiendo, setEligiendo] = useState(false);
  const lista = tarjetas.data?.tarjetas ?? [];
  const tarjeta = lista.find((t) => t.id === tarjetaId) ?? lista[0];
  const movimientos = useMovimientos(tarjeta?.id, filtro);

  // Grupos «HOY», «ESTA SEMANA» y por mes, en el orden en que llegan (del más reciente al más antiguo)
  const datosMovimientos = movimientos.data;
  const grupos = useMemo(() => {
    const resultado: { titulo: string; items: DatoMovimiento[] }[] = [];
    for (const m of datosMovimientos?.movimientos ?? []) {
      const titulo = grupoDeFecha(m.fecha);
      const grupo = resultado.at(-1);
      if (grupo?.titulo === titulo) grupo.items.push(m);
      else resultado.push({ titulo, items: [m] });
    }
    return resultado;
  }, [datosMovimientos]);

  return (
    <Pantalla conPestanas separacion={12} refrescar={{ refrescando: movimientos.isRefetching, onRefrescar: () => void movimientos.refetch() }}>
      <Texto variante="titulo1" accessibilityRole="header">
        Historial
      </Texto>
      {tarjetas.isPending ? <Cargando etiqueta="Cargando tus tarjetas" /> : null}
      {tarjetas.isError ? <ErrorDeCarga error={tarjetas.error} onReintentar={() => void tarjetas.refetch()} /> : null}
      {tarjetas.data && lista.length === 0 ? (
        <>
          <Aviso tipo="info" mensaje="Agrega una tarjeta para ver sus recargas y sus viajes." />
          <Boton etiqueta="Agregar tarjeta" tipo="secundario" icono="mas" onPress={() => router.push('/tarjetas/agregar')} />
        </>
      ) : null}
      {tarjeta ? (
        <>
          <SelectorTarjeta
            tarjeta={`${tarjeta.alias} •••• ${tarjeta.ultimos4}`}
            detalle={tarjeta.saldo === null ? 'Saldo no disponible' : `Saldo actual ${pesos(tarjeta.saldo)}`}
            etiquetaAccesible={`Historial de ${tarjeta.alias}, terminada en ${tarjeta.ultimos4}`}
            pista="Abre la lista de tus tarjetas para ver otra"
            onPress={() => setEligiendo(true)}
          />
          <View accessibilityRole="radiogroup" style={estilos.filtros}>
            {FILTROS.map((f) => (
              <Chip key={f.codigo} etiqueta={f.etiqueta} etiquetaAccesible={`Ver ${f.etiqueta.toLowerCase()}`} activo={filtro === f.codigo} onPress={() => setFiltro(f.codigo)} />
            ))}
          </View>
          {movimientos.isPending ? <Cargando etiqueta="Cargando los movimientos" /> : null}
          {movimientos.isError ? <ErrorDeCarga error={movimientos.error} onReintentar={() => void movimientos.refetch()} /> : null}
          {movimientos.data?.aviso ? <Aviso tipo="advertencia" mensaje={movimientos.data.aviso} /> : null}
          {movimientos.data && grupos.length === 0 ? (
            <Aviso tipo="info" mensaje={filtro === 'viajes' ? 'Esta tarjeta todavía no tiene viajes.' : filtro === 'recargas' ? 'Esta tarjeta todavía no tiene recargas.' : 'Esta tarjeta todavía no tiene movimientos.'} />
          ) : null}
          {grupos.map((g) => (
            <View key={g.titulo} style={estilos.grupo}>
              <Texto variante="pequenoFuerte" color={color.texto.secundario} accessibilityRole="header">
                {g.titulo}
              </Texto>
              {g.items.map((m, i) => (
                <Movimiento
                  key={`${m.fecha}-${i}`}
                  tipo={m.tipo === 'RECARGA' ? 'recarga' : 'viaje'}
                  titulo={m.descripcion}
                  fecha={fechaCorta(m.fecha)}
                  valor={m.valor}
                />
              ))}
            </View>
          ))}
        </>
      ) : null}
      <ElegirTarjeta
        visible={eligiendo}
        titulo="¿De qué tarjeta quieres ver el historial?"
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
  filtros: { flexDirection: 'row', gap: espacio[2] },
  grupo: { gap: espacio[2] },
});
