// Pantalla 3.2 Recargar a otra persona · Figma 13:497 (HU-04 CA-1 y CA-2).
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Aviso, CampoTexto, FilaAjuste } from '@/components';
import { Pantalla } from '@/pantallas/Pantalla';
import { datosPagoIniciales, FormularioPago, medioParaSolicitud, TotalYPagar, validarPago, type ErroresPago } from '@/pantallas/recarga/FormularioPago';
import { usePago } from '@/pantallas/recarga/usePago';
import { color, radio } from '@/theme/tokens';
import { formatearNumeroTarjeta, numeroTarjetaValido, soloDigitos } from '@/utilidades/validacion';

export default function PantallaRecargaTercero() {
  const { pagar, pagando } = usePago();
  const [numero, setNumero] = useState('');
  const [confirmacion, setConfirmacion] = useState('');
  const [guardar, setGuardar] = useState(false);
  const [datos, setDatos] = useState(() => datosPagoIniciales(10000));
  const [errores, setErrores] = useState<ErroresPago & { numero?: string; confirmacion?: string; aviso?: string }>({});

  async function enviar() {
    const nuevos = {
      ...validarPago(datos),
      numero: numeroTarjetaValido(numero) ? undefined : 'El número de la tarjeta MIO debe tener 10 dígitos.',
      // HU-04 CA-1: el número se escribe dos veces para no recargar una tarjeta equivocada
      confirmacion: soloDigitos(numero) === soloDigitos(confirmacion) ? undefined : 'Los dos números no coinciden. Revísalos antes de pagar.',
    };
    setErrores(nuevos);
    if (Object.values(nuevos).some(Boolean)) return;
    const { error } = await pagar({
      numeroDestino: soloDigitos(numero),
      confirmacionNumero: soloDigitos(confirmacion),
      guardarTarjeta: guardar,
      monto: datos.monto!,
      aceptaTerminosPasarela: true,
      ...medioParaSolicitud(datos),
    });
    if (error) setErrores({ aviso: error });
  }

  return (
    <Pantalla titulo="Recargar a otra persona" separacion={12}>
      <Aviso tipo="info" mensaje="La tarjeta no quedará guardada en tu cuenta, a menos que actives la opción." />
      {errores.aviso ? <Aviso tipo="error" mensaje={errores.aviso} /> : null}
      <CampoTexto
        etiqueta="Número de la tarjeta de destino"
        value={numero}
        onChangeText={(v) => setNumero(formatearNumeroTarjeta(v))}
        error={errores.numero}
        placeholder="0000 0000 00"
        keyboardType="number-pad"
        maxLength={12}
        testID="numero-destino"
      />
      <CampoTexto
        etiqueta="Confirma el número"
        value={confirmacion}
        onChangeText={(v) => setConfirmacion(formatearNumeroTarjeta(v))}
        error={errores.confirmacion}
        placeholder="0000 0000 00"
        keyboardType="number-pad"
        maxLength={12}
        contextMenuHidden
        testID="confirmacion-destino"
      />
      <FormularioPago datos={datos} onCambiar={setDatos} errores={errores} />
      {/* HU-04 CA-2: guardarla es opcional */}
      <View style={estilos.guardar}>
        <FilaAjuste tipo="interruptor" titulo="Guardar esta tarjeta" icono="tarjeta" activado={guardar} onCambiar={setGuardar} />
      </View>
      <TotalYPagar monto={datos.monto} onPagar={enviar} pagando={pagando} />
    </Pantalla>
  );
}

const estilos = StyleSheet.create({
  guardar: { borderWidth: 1, borderColor: color.borde.sutil, borderRadius: radio.lg, overflow: 'hidden' },
});
