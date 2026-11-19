// Pantallas 3.3 Pago pendiente, 3.4 Recarga exitosa y 3.5 Pago rechazado · Figma 13:602, 13:659 y 13:707
// (HU-01 CA-3 y CA-4, HU-02). Una sola ruta: lo que se ve depende del estado de la recarga, que se consulta cada 2 s.
// «Cancelar recarga» de la 3.3 pasa a ser «Volver al inicio»: la API no puede cancelar un pago en la pasarela (ADR 0018, decisión C).
import { StyleSheet, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useActualizarRecarga, useRecarga, useTerminosPasarela } from '@/api/hooks';
import { mensajeDeError } from '@/api/mensajes';
import type { Recarga } from '@/api/tipos';
import { Aviso, Boton, FilaDetalle, Icono, Insignia, Texto } from '@/components';
import { Cargando, ErrorDeCarga } from '@/pantallas/Estados';
import { Pantalla } from '@/pantallas/Pantalla';
import { abrirPaginaDePago } from '@/pantallas/recarga/usePago';
import { color, radio } from '@/theme/tokens';
import SvgEspera from '../../../../assets/graficos/indicador-espera.svg';
import { fechaCorta } from '@/utilidades/fechas';
import { pesos, pesosHablados } from '@/utilidades/formato';

const NOMBRE_ESTADO: Record<Recarga['estado'], string> = {
  PENDIENTE: 'Pendiente',
  APROBADA: 'Aprobada',
  FALLA_ACREDITACION: 'Aprobada',
  ACREDITADA: 'Acreditada',
  RECHAZADA: 'Rechazada',
  ERROR: 'No se completó',
};

const CODIGO_MEDIO: Record<string, string> = { Nequi: 'NEQUI', PSE: 'PSE', Bancolombia: 'BANCOLOMBIA_TRANSFER' };

function Detalle({ filas }: { filas: { etiqueta: string; valor: string; hablado?: string }[] }) {
  return (
    <View style={estilos.detalle}>
      {filas.map((f, i) => (
        <FilaDetalle key={f.etiqueta} etiqueta={f.etiqueta} valor={f.valor} valorHablado={f.hablado} ultima={i === filas.length - 1} />
      ))}
    </View>
  );
}

function Encabezado({ circulo, titulo, mensaje }: { circulo: React.ReactNode; titulo: string; mensaje: string }) {
  return (
    <>
      <View style={estilos.centrado}>{circulo}</View>
      {/* Se anuncia solo cuando cambia el estado (WCAG 4.1.3) */}
      <Texto variante="titulo1" accessibilityRole="header" accessibilityLiveRegion="polite" style={estilos.texto}>
        {titulo}
      </Texto>
      <Texto color={color.texto.secundario} style={estilos.texto}>
        {mensaje}
      </Texto>
    </>
  );
}

export default function PantallaResultadoRecarga() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const consulta = useRecarga(id);
  const actualizar = useActualizarRecarga(id);
  const terminos = useTerminosPasarela();
  const r = consulta.data;
  const irAlInicio = () => router.dismissTo('/');
  const monto = r ? { etiqueta: 'Monto', valor: pesos(r.monto), hablado: pesosHablados(r.monto) } : null;

  if (!r) {
    return (
      <Pantalla separacion={16} rellenoSuperior={56}>
        {consulta.isError ? <ErrorDeCarga error={consulta.error} onReintentar={() => void consulta.refetch()} /> : <Cargando etiqueta="Consultando la recarga" />}
      </Pantalla>
    );
  }

  // 3.4 Recarga exitosa
  if (r.estado === 'ACREDITADA') {
    return (
      <Pantalla
        separacion={16}
        rellenoSuperior={56}
        pie={
          <View style={estilos.botones}>
            <Boton etiqueta="Ver historial" onPress={() => router.navigate('/historial')} />
            <Boton etiqueta="Volver al inicio" tipo="secundario" onPress={irAlInicio} />
          </View>
        }
      >
        <Encabezado
          circulo={
            <View style={[estilos.circulo, { backgroundColor: color.estado.exito }]}>
              <Icono nombre="check" tamano={44} color={color.texto.invertido} />
            </View>
          }
          titulo="¡Recarga exitosa!"
          mensaje={r.mensaje}
        />
        <Detalle
          filas={[
            { etiqueta: 'Medio de pago', valor: r.medioPago },
            { etiqueta: 'Referencia', valor: r.referencia },
            { etiqueta: 'Fecha', valor: fechaCorta(r.acreditadaEn ?? r.iniciadaEn) },
            ...(r.comprobante?.nuevoSaldo != null
              ? [{ etiqueta: 'Nuevo saldo', valor: pesos(r.comprobante.nuevoSaldo), hablado: pesosHablados(r.comprobante.nuevoSaldo) }]
              : []),
          ]}
        />
        <Insignia etiqueta={terminos.data?.pasarela === 'wompi' ? 'Wompi Sandbox · modo de pruebas' : 'Simulado · modo de pruebas'} tipo="info" centrada />
      </Pantalla>
    );
  }

  // 3.5 Pago rechazado (o no completado)
  if (r.estado === 'RECHAZADA' || r.estado === 'ERROR') {
    const reintentar = (conMismoMedio: boolean) => {
      const medio = conMismoMedio ? CODIGO_MEDIO[r.medioPago] : undefined;
      if (r.destino.tercero) router.replace('/recarga/tercero');
      else router.navigate({ pathname: '/recargar', params: { monto: String(r.monto), ...(medio ? { medio } : {}) } });
    };
    return (
      <Pantalla
        separacion={16}
        rellenoSuperior={56}
        pie={
          <View style={estilos.botones}>
            <Boton etiqueta="Intentar de nuevo" onPress={() => reintentar(true)} />
            <Boton etiqueta="Elegir otro medio de pago" tipo="secundario" onPress={() => reintentar(false)} />
            <Boton etiqueta="Volver al inicio" tipo="texto" onPress={irAlInicio} />
          </View>
        }
      >
        <Encabezado
          circulo={
            <View style={[estilos.circulo, { backgroundColor: color.estado.errorSuave }]}>
              <Icono nombre="cerrar" tamano={40} color={color.estado.error} />
            </View>
          }
          titulo={r.estado === 'RECHAZADA' ? 'Pago rechazado' : 'No se completó el pago'}
          mensaje={r.mensaje}
        />
        <Detalle
          filas={[
            { etiqueta: 'Medio de pago', valor: r.medioPago },
            { etiqueta: 'Referencia', valor: r.referencia },
            ...(r.motivo ? [{ etiqueta: 'Motivo', valor: r.motivo }] : []),
          ]}
        />
      </Pantalla>
    );
  }

  // 3.3 Pago pendiente (también aprobado y en acreditación)
  return (
    <Pantalla
      separacion={16}
      rellenoSuperior={56}
      pie={
        <View style={estilos.botones}>
          {r.urlPago ? <Boton etiqueta="Abrir de nuevo la página del banco" tipo="texto" onPress={() => void abrirPaginaDePago(r.urlPago!)} /> : null}
          <Boton etiqueta="Actualizar estado" tipo="secundario" icono="refrescar" cargando={actualizar.isPending} onPress={() => actualizar.mutate()} />
          <Boton etiqueta="Volver al inicio" tipo="texto" pista="La recarga sigue en proceso y te avisaremos el resultado" onPress={irAlInicio} />
        </View>
      }
    >
      <Encabezado
        circulo={
          <View accessible accessibilityRole="progressbar" accessibilityLabel="Esperando la confirmación del pago">
            <SvgEspera width={96} height={96} />
          </View>
        }
        titulo="Esperando confirmación"
        mensaje={r.mensaje}
      />
      <Detalle
        filas={[
          { etiqueta: 'Referencia', valor: r.referencia },
          { etiqueta: 'Medio de pago', valor: r.medioPago },
          ...(monto ? [monto] : []),
          { etiqueta: 'Estado', valor: NOMBRE_ESTADO[r.estado] },
        ]}
      />
      {actualizar.isError ? <Aviso tipo="error" mensaje={mensajeDeError(actualizar.error)} /> : null}
      <Aviso tipo="info" mensaje="La recarga se acredita solo cuando la pasarela confirma el pago. Te avisaremos con una notificación." />
    </Pantalla>
  );
}

const estilos = StyleSheet.create({
  centrado: { alignItems: 'center' },
  circulo: { width: 88, height: 88, borderRadius: 44, alignItems: 'center', justifyContent: 'center' },
  texto: { textAlign: 'center' },
  detalle: { backgroundColor: color.superficie.tarjeta, borderWidth: 1, borderColor: color.borde.sutil, borderRadius: radio.lg, paddingHorizontal: 16, paddingVertical: 4 },
  botones: { gap: 16 },
});
