// Pantalla 4.2 Alertas de saldo bajo · Figma 14:744 (HU-05 CA-1 y CA-4). Una alerta por tarjeta; se guardan juntas.
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { useConfigurarAlerta, useTarjetas } from '@/api/hooks';
import { mensajeDeError } from '@/api/mensajes';
import type { Alerta } from '@/api/tipos';
import { Aviso, Boton, Chip, Interruptor, Texto } from '@/components';
import { Cargando, ErrorDeCarga } from '@/pantallas/Estados';
import { Pantalla } from '@/pantallas/Pantalla';
import { color, espacio, radio } from '@/theme/tokens';
import { numeroOculto, pesos } from '@/utilidades/formato';

/** Valores de Figma: el pasaje, y uno y casi tres pasajes (el umbral válido va de $3.500 a $50.000). */
const UMBRALES = [3500, 5000, 10000];
const UMBRAL_INICIAL = 5000;

export default function PantallaAlertas() {
  const tarjetas = useTarjetas();
  const configurar = useConfigurarAlerta();
  const [cambios, setCambios] = useState<Record<string, Alerta>>({});
  const [resultado, setResultado] = useState<{ tipo: 'exito' | 'error'; mensaje: string }>();
  const lista = tarjetas.data?.tarjetas ?? [];


  const alertaDe = (id: string, actual: Alerta | null): Alerta => cambios[id] ?? actual ?? { umbral: UMBRAL_INICIAL, activa: false };
  const cambiar = (id: string, actual: Alerta | null, parcial: Partial<Alerta>) => {
    setResultado(undefined);
    setCambios((c) => ({ ...c, [id]: { ...alertaDe(id, actual), ...parcial } }));
  };

  async function guardar() {
    try {
      for (const [tarjetaId, alerta] of Object.entries(cambios)) await configurar.mutateAsync({ tarjetaId, ...alerta });
      setCambios({});
      setResultado({ tipo: 'exito', mensaje: 'Guardamos tus alertas.' });
    } catch (error) {
      setResultado({ tipo: 'error', mensaje: mensajeDeError(error) });
    }
  }

  return (
    <Pantalla
      titulo="Alertas de saldo bajo"
      pie={lista.length ? <Boton etiqueta="Guardar cambios" onPress={guardar} cargando={configurar.isPending} deshabilitado={Object.keys(cambios).length === 0} /> : undefined}
    >
      <Texto color={color.texto.secundario}>Te enviaremos una notificación cuando el saldo de una tarjeta baje del valor que elijas.</Texto>
      {tarjetas.isPending ? <Cargando etiqueta="Cargando tus tarjetas" /> : null}
      {tarjetas.isError ? <ErrorDeCarga error={tarjetas.error} onReintentar={() => void tarjetas.refetch()} /> : null}
      {tarjetas.data && lista.length === 0 ? (
        <>
          <Aviso tipo="info" mensaje="Agrega una tarjeta para configurar su alerta de saldo bajo." />
          <Boton etiqueta="Agregar tarjeta" tipo="secundario" icono="mas" onPress={() => router.push('/tarjetas/agregar')} />
        </>
      ) : null}
      {lista.map((t) => {
        const alerta = alertaDe(t.id, t.alerta);
        // Si el valor guardado no es uno de los de Figma (se configuró por la API), se muestra también
        const opciones = UMBRALES.includes(alerta.umbral) ? UMBRALES : [...UMBRALES, alerta.umbral].sort((a, b) => a - b);
        return (
          <View key={t.id} style={estilos.tarjeta}>
            <View style={estilos.encabezado}>
              <View style={estilos.nombre}>
                <Texto variante="cuerpoFuerte">{t.alias}</Texto>
                <Texto variante="pequeno" color={color.texto.secundario}>
                  {numeroOculto(t.ultimos4)}
                </Texto>
              </View>
              <Interruptor activado={alerta.activa} etiqueta={`Alerta de saldo bajo de ${t.alias}`} onCambiar={(activa) => cambiar(t.id, t.alerta, { activa })} />
            </View>
            <Texto variante="etiqueta" color={color.texto.secundario}>
              Avisarme cuando el saldo sea menor a
            </Texto>
            <View accessibilityRole="radiogroup" style={estilos.umbrales}>
              {opciones.map((u) => (
                <Chip
                  key={u}
                  etiqueta={pesos(u)}
                  etiquetaAccesible={`Menos de ${pesos(u).replace('$', '')} pesos, ${t.alias}`}
                  activo={alerta.activa && alerta.umbral === u}
                  onPress={() => cambiar(t.id, t.alerta, { umbral: u, activa: true })}
                  estilo={estilos.umbral}
                />
              ))}
            </View>
          </View>
        );
      })}
      {resultado ? <Aviso tipo={resultado.tipo} mensaje={resultado.mensaje} /> : null}
      {lista.length ? <Aviso tipo="info" mensaje="Para recibir las alertas, permite las notificaciones de RecargaMIO en tu teléfono." /> : null}
    </Pantalla>
  );
}

const estilos = StyleSheet.create({
  tarjeta: { backgroundColor: color.superficie.tarjeta, borderWidth: 1, borderColor: color.borde.sutil, borderRadius: radio.lg, padding: 16, gap: espacio[3] },
  encabezado: { flexDirection: 'row', alignItems: 'center', gap: espacio[3] },
  nombre: { flex: 1, gap: 2 },
  umbrales: { flexDirection: 'row', gap: espacio[2] },
  umbral: { flex: 1, minWidth: 0, paddingHorizontal: 4 },
});
