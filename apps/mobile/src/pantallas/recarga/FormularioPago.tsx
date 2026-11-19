// Monto, medio de pago, datos del medio y términos de la pasarela: la parte común de las pantallas 3.1 y 3.2.
// Los datos del medio (celular de Nequi y datos de PSE) no están en Figma: se muestran debajo del medio elegido
// (ADR 0018, decisión A). Solo viajan a la pasarela; la app no los guarda (regla 2).
import { useState } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import { useBancos, useTerminosPasarela } from '@/api/hooks';
import type { Banco, DatosPse, MedioPago } from '@/api/tipos';
import { Aviso, Boton, CampoTexto, Casilla, Chip, OpcionPago, SelectorTarjeta, Texto } from '@/components';
import { color, espacio, radio, sombraTarjeta } from '@/theme/tokens';
import { pesos } from '@/utilidades/formato';
import { MEDIOS, MONTOS, TIPOS_DOCUMENTO } from './opciones';

export interface DatosPago {
  monto: number | null;
  medio: MedioPago | null;
  celularNequi: string;
  pse: Omit<DatosPse, 'codigoBanco'> & { banco: Banco | null };
  aceptaTerminos: boolean;
}

export const datosPagoIniciales = (monto: number | null = null, medio: MedioPago | null = null): DatosPago => ({
  monto,
  medio,
  celularNequi: '',
  pse: { tipoPersona: 'NATURAL', tipoDocumento: 'CC', numeroDocumento: '', celular: '', banco: null },
  aceptaTerminos: false,
});

export type ErroresPago = Partial<Record<'monto' | 'medio' | 'celularNequi' | 'numeroDocumento' | 'banco' | 'celularPse' | 'terminos', string>>;

interface Props {
  datos: DatosPago;
  onCambiar: (datos: DatosPago) => void;
  errores: ErroresPago;
}

function Etiqueta({ children }: { children: string }) {
  return (
    <Texto variante="etiqueta" color={color.texto.secundario} accessibilityRole="header">
      {children}
    </Texto>
  );
}

export function FormularioPago({ datos, onCambiar, errores }: Props) {
  const terminos = useTerminosPasarela();
  const bancos = useBancos(datos.medio === 'PSE');
  const [eligiendoBanco, setEligiendoBanco] = useState(false);
  const cambiar = (parcial: Partial<DatosPago>) => onCambiar({ ...datos, ...parcial });
  const cambiarPse = (parcial: Partial<DatosPago['pse']>) => onCambiar({ ...datos, pse: { ...datos.pse, ...parcial } });
  const pruebas = terminos.data?.pasarela === 'simulada' || terminos.data?.pasarela === 'wompi';

  return (
    <>
      <View style={estilos.grupo}>
        <Etiqueta>Monto de la recarga</Etiqueta>
        <View accessibilityRole="radiogroup" style={estilos.montos}>
          {MONTOS.map((m) => (
            <Chip
              key={m}
              etiqueta={pesos(m)}
              etiquetaAccesible={`${pesos(m).replace('$', '')} pesos`}
              activo={datos.monto === m}
              onPress={() => cambiar({ monto: m })}
              estilo={estilos.monto}
              testID={`monto-${m}`}
            />
          ))}
        </View>
        {errores.monto ? <TextoError>{errores.monto}</TextoError> : null}
      </View>

      <View style={estilos.grupo}>
        <Etiqueta>Medio de pago</Etiqueta>
        <View accessibilityRole="radiogroup" style={estilos.medios}>
          {MEDIOS.map((m) => (
            <View key={m.codigo} style={estilos.medio}>
              <OpcionPago
                nombre={m.nombre}
                descripcion={m.descripcion}
                sigla={m.sigla}
                seleccionada={datos.medio === m.codigo}
                onPress={() => cambiar({ medio: m.codigo })}
                testID={`medio-${m.codigo}`}
              />
              {datos.medio === m.codigo && m.codigo === 'NEQUI' ? (
                <CampoTexto
                  etiqueta="Celular de Nequi"
                  value={datos.celularNequi}
                  onChangeText={(v) => cambiar({ celularNequi: v })}
                  error={errores.celularNequi}
                  ayuda={pruebas ? 'Modo de pruebas: 3991111111 aprueba y 3992222222 rechaza.' : undefined}
                  keyboardType="phone-pad"
                  maxLength={10}
                  autoComplete="tel"
                  testID="celular-nequi"
                />
              ) : null}
              {datos.medio === m.codigo && m.codigo === 'PSE' ? (
                <View style={estilos.datosPse}>
                  <Etiqueta>Tipo de persona</Etiqueta>
                  <View accessibilityRole="radiogroup" style={estilos.fila}>
                    {(['NATURAL', 'JURIDICA'] as const).map((t) => (
                      <Chip key={t} etiqueta={t === 'NATURAL' ? 'Natural' : 'Jurídica'} activo={datos.pse.tipoPersona === t} onPress={() => cambiarPse({ tipoPersona: t })} />
                    ))}
                  </View>
                  <Etiqueta>Tipo de documento</Etiqueta>
                  <View accessibilityRole="radiogroup" style={estilos.fila}>
                    {TIPOS_DOCUMENTO.map((d) => (
                      <Chip key={d.codigo} etiqueta={d.nombre} etiquetaAccesible={d.hablado} activo={datos.pse.tipoDocumento === d.codigo} onPress={() => cambiarPse({ tipoDocumento: d.codigo })} />
                    ))}
                  </View>
                  <CampoTexto
                    etiqueta="Número de documento"
                    value={datos.pse.numeroDocumento}
                    onChangeText={(v) => cambiarPse({ numeroDocumento: v })}
                    error={errores.numeroDocumento}
                    keyboardType="number-pad"
                    maxLength={15}
                    testID="documento-pse"
                  />
                  <View style={estilos.grupo}>
                    <Etiqueta>Banco</Etiqueta>
                    <SelectorTarjeta
                      icono="documento"
                      tarjeta={datos.pse.banco?.nombre ?? 'Elige tu banco'}
                      detalle={errores.banco ?? 'Te llevaremos a la página de tu banco para pagar'}
                      etiquetaAccesible={`Banco: ${datos.pse.banco?.nombre ?? 'sin elegir'}`}
                      pista="Abre la lista de bancos"
                      onPress={() => setEligiendoBanco(true)}
                      testID="selector-banco"
                    />
                    {errores.banco ? <TextoError>{errores.banco}</TextoError> : null}
                  </View>
                  <CampoTexto
                    etiqueta="Celular"
                    value={datos.pse.celular}
                    onChangeText={(v) => cambiarPse({ celular: v })}
                    error={errores.celularPse}
                    keyboardType="phone-pad"
                    maxLength={10}
                    autoComplete="tel"
                  />
                </View>
              ) : null}
              {datos.medio === m.codigo && m.codigo === 'BANCOLOMBIA_TRANSFER' ? (
                <Aviso tipo="info" mensaje="Te llevaremos a la página de Bancolombia para autorizar el pago y luego vuelves a RecargaMIO." />
              ) : null}
            </View>
          ))}
        </View>
        {errores.medio ? <TextoError>{errores.medio}</TextoError> : null}
      </View>

      {/* Términos de la pasarela: no están en Figma, pero Wompi y la API los exigen (ADR 0018, decisión B) */}
      <View>
        <Casilla
          marcada={datos.aceptaTerminos}
          onCambiar={(v) => cambiar({ aceptaTerminos: v })}
          etiqueta="Acepto los términos y la autorización de datos de la pasarela de pagos"
          testID="casilla-terminos"
        >
          <Texto variante="pequeno" color={color.texto.secundario}>
            Acepto los términos y la autorización de datos de la pasarela de pagos.
          </Texto>
        </Casilla>
        {errores.terminos ? <TextoError>{errores.terminos}</TextoError> : null}
        {/* Botones de 48 px en lugar de enlaces dentro del texto, que eran muy pequeños para tocarlos (regla 7; revisión de T11) */}
        <View style={estilos.enlaces}>
          <Boton etiqueta="Leer los términos" tipo="texto" onPress={() => abrir(terminos.data?.aceptacion)} deshabilitado={!terminos.data} />
          <Boton etiqueta="Leer la autorización de datos" tipo="texto" onPress={() => abrir(terminos.data?.datosPersonales)} deshabilitado={!terminos.data} />
        </View>
      </View>

      <Modal visible={eligiendoBanco} transparent animationType="slide" onRequestClose={() => setEligiendoBanco(false)}>
        <Pressable style={estilos.fondoModal} onPress={() => setEligiendoBanco(false)} accessibilityRole="button" accessibilityLabel="Cerrar la lista de bancos">
          <Pressable style={estilos.hoja} onPress={() => undefined} accessible={false}>
            <Texto variante="titulo2" accessibilityRole="header">
              Elige tu banco
            </Texto>
            {bancos.isPending ? <Texto color={color.texto.secundario}>Cargando bancos…</Texto> : null}
            {bancos.data?.map((b) => (
              <OpcionPago
                key={b.codigo}
                nombre={b.nombre}
                descripcion="Pago con PSE"
                sigla={b.nombre.slice(0, 2).toUpperCase()}
                seleccionada={datos.pse.banco?.codigo === b.codigo}
                onPress={() => {
                  cambiarPse({ banco: b });
                  setEligiendoBanco(false);
                }}
              />
            ))}
            <Boton etiqueta="Cancelar" tipo="texto" onPress={() => setEligiendoBanco(false)} />
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

function abrir(url?: string) {
  if (url) void WebBrowser.openBrowserAsync(url);
}

function TextoError({ children }: { children: string }) {
  return (
    <Texto variante="pequeno" color={color.estado.error} accessibilityLiveRegion="polite">
      {children}
    </Texto>
  );
}

/** Total y botón «Pagar», con la nota de modo de pruebas (final de la pantalla 3.1). */
export function TotalYPagar({ monto, onPagar, pagando }: { monto: number | null; onPagar: () => void; pagando: boolean }) {
  return (
    <View style={estilos.total}>
      <View style={estilos.filaTotal} accessible accessibilityLabel={`Total a pagar: ${monto ? `${pesos(monto).replace('$', '')} pesos` : 'elige un monto'}`}>
        <Texto color={color.texto.secundario}>Total a pagar</Texto>
        <Texto variante="titulo1">{monto ? pesos(monto) : '—'}</Texto>
      </View>
      <Boton etiqueta={monto ? `Pagar ${pesos(monto)}` : 'Pagar'} tipo="acento" onPress={onPagar} cargando={pagando} testID="boton-pagar" />
      <Texto variante="pequeno" color={color.texto.secundario} style={estilos.centrado}>
        Modo de pruebas: no se realizan cobros reales.
      </Texto>
    </View>
  );
}

/** Valida en la app lo mismo que la API (services/api/src/modulos/recargas/esquemas.ts). */
export function validarPago(datos: DatosPago): ErroresPago {
  const celular = (v: string) => /^3\d{9}$/.test(v.replace(/\D/g, ''));
  return {
    monto: datos.monto ? undefined : 'Elige el monto de la recarga.',
    medio: datos.medio ? undefined : 'Elige el medio de pago: PSE, Nequi o Bancolombia.',
    celularNequi: datos.medio === 'NEQUI' && !celular(datos.celularNequi) ? 'El celular debe tener 10 dígitos y empezar por 3.' : undefined,
    numeroDocumento:
      datos.medio === 'PSE' && !/^[0-9A-Za-z]{5,15}$/.test(datos.pse.numeroDocumento.trim()) ? 'Escribe un número de documento válido.' : undefined,
    banco: datos.medio === 'PSE' && !datos.pse.banco ? 'Elige tu banco.' : undefined,
    celularPse: datos.medio === 'PSE' && !celular(datos.pse.celular) ? 'El celular debe tener 10 dígitos y empezar por 3.' : undefined,
    terminos: datos.aceptaTerminos ? undefined : 'Para pagar debes aceptar los términos y la autorización de datos de la pasarela de pagos.',
  };
}

/** Parte de la solicitud de POST /recargas que depende del medio de pago. */
export function medioParaSolicitud(datos: DatosPago) {
  switch (datos.medio) {
    case 'NEQUI':
      return { medioPago: 'NEQUI' as const, datosMedio: { celular: datos.celularNequi.replace(/\D/g, '') } };
    case 'PSE': {
      const { banco, ...resto } = datos.pse;
      return {
        medioPago: 'PSE' as const,
        datosMedio: { ...resto, numeroDocumento: resto.numeroDocumento.trim(), celular: resto.celular.replace(/\D/g, ''), codigoBanco: banco!.codigo },
      };
    }
    default:
      return { medioPago: 'BANCOLOMBIA_TRANSFER' as const };
  }
}

const estilos = StyleSheet.create({
  grupo: { gap: 6 },
  montos: { flexDirection: 'row', gap: espacio[2] },
  monto: { flex: 1, minWidth: 0, paddingHorizontal: 4 },
  medios: { gap: espacio[2] },
  medio: { gap: espacio[2] },
  datosPse: { gap: espacio[2], paddingLeft: espacio[2], borderLeftWidth: 2, borderLeftColor: color.marca.primarioBorde },
  fila: { flexDirection: 'row', flexWrap: 'wrap', gap: espacio[2] },
  enlaces: { flexDirection: 'row', flexWrap: 'wrap' },
  total: { gap: espacio[3] },
  filaTotal: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  centrado: { textAlign: 'center' },
  fondoModal: { flex: 1, backgroundColor: 'rgba(27, 31, 42, 0.5)', justifyContent: 'flex-end' },
  hoja: { backgroundColor: color.superficie.fondo, borderTopLeftRadius: radio.xl, borderTopRightRadius: radio.xl, padding: espacio[6], gap: espacio[3], ...sombraTarjeta },
});
