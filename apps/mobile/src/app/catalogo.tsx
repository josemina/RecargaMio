// Catálogo de componentes (T9). Criterio de aceptación: muestra todos los componentes y coincide con la
// página 02 · Sistema de diseño de Figma (nodos 9:4, 9:138 y 11:13). Solo existe en desarrollo (__DEV__).
import { useState, type ReactNode } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import {
  Aviso, BarraNavegacion, BarraSuperior, Boton, CampoTexto, Casilla, Chip, FilaAjuste, FilaDetalle, Icono, Insignia,
  Interruptor, Movimiento, NOMBRES_ICONOS, OpcionPago, SelectorTarjeta, TarjetaMIO, Texto, type Pestana, type TipoBoton,
} from '@/components';
import { color, espacio, radio } from '@/theme/tokens';

function Seccion({ titulo, nodo, children, sinRelleno = false }: { titulo: string; nodo: string; children: ReactNode; sinRelleno?: boolean }) {
  return (
    <View style={estilos.seccion}>
      <Texto variante="titulo3" accessibilityRole="header">
        {titulo}
      </Texto>
      <Texto variante="pequeno" color={color.texto.secundario}>
        Figma {nodo}
      </Texto>
      <View style={[estilos.muestra, sinRelleno && estilos.sinRelleno]}>{children}</View>
    </View>
  );
}

const TIPOS_BOTON: TipoBoton[] = ['primario', 'acento', 'secundario', 'texto', 'peligro'];

export default function Catalogo() {
  const { top, bottom } = useSafeAreaInsets();
  const [monto, setMonto] = useState('$10.000');
  const [alerta, setAlerta] = useState(true);
  const [interruptores, setInterruptores] = useState([true, false]);
  const [casillas, setCasillas] = useState([true, false]);
  const [medio, setMedio] = useState(1);
  const [pestana, setPestana] = useState<Pestana>('inicio');

  return (
    <View style={[estilos.pantalla, { paddingTop: top }]}>
      <BarraSuperior titulo="Catálogo de componentes" onAtras={router.canGoBack() ? router.back : undefined} />
      <ScrollView contentContainerStyle={[estilos.contenido, { paddingBottom: bottom + espacio[8] }]}>
        <Texto variante="pequeno" color={color.texto.secundario}>
          RecargaMIO · Sistema de diseño. Tipografía Inter · base 8 px · WCAG 2.1 AA. Solo en desarrollo.
        </Texto>

        <Seccion titulo="Íconos" nodo="9:4">
          <View style={estilos.iconos}>
            {NOMBRES_ICONOS.map((nombre) => (
              <View key={nombre} accessible accessibilityLabel={`Ícono ${nombre}`}>
                <Icono nombre={nombre} />
              </View>
            ))}
          </View>
        </Seccion>

        <Seccion titulo="Botón" nodo="9:216">
          {TIPOS_BOTON.map((tipo) => (
            <View key={tipo} style={estilos.fila}>
              <View style={estilos.columna}>
                <Boton etiqueta="Botón" tipo={tipo} onPress={() => undefined} />
              </View>
              <View style={estilos.columna}>
                <Boton etiqueta="Botón" tipo={tipo} deshabilitado />
              </View>
            </View>
          ))}
          <Boton etiqueta="Pagando…" cargando />
          <Boton etiqueta="Agregar tarjeta" tipo="secundario" icono="mas" onPress={() => undefined} />
        </Seccion>

        <Seccion titulo="Chip (monto y filtro)" nodo="9:223">
          <View accessibilityRole="radiogroup" style={estilos.fila}>
            {['$5.000', '$10.000', '$20.000', '$50.000'].map((m) => (
              <Chip key={m} etiqueta={m} activo={monto === m} onPress={() => setMonto(m)} etiquetaAccesible={`${m.replace('$', '')} pesos`} />
            ))}
          </View>
        </Seccion>

        <Seccion titulo="Interruptor" nodo="9:230">
          <View style={estilos.fila}>
            {interruptores.map((activo, i) => (
              <Interruptor
                key={i}
                activado={activo}
                etiqueta={`Interruptor de ejemplo ${i + 1}`}
                onCambiar={(v) => setInterruptores((a) => a.map((x, j) => (j === i ? v : x)))}
              />
            ))}
          </View>
        </Seccion>

        <Seccion titulo="Casilla de verificación" nodo="9:237">
          <View style={estilos.fila}>
            {casillas.map((marcada, i) => (
              <Casilla
                key={i}
                marcada={marcada}
                etiqueta={`Casilla de ejemplo ${i + 1}`}
                onCambiar={(v) => setCasillas((a) => a.map((x, j) => (j === i ? v : x)))}
              />
            ))}
          </View>
          <Casilla marcada={casillas[0]} etiqueta="Autorizo el tratamiento de mis datos personales" onCambiar={(v) => setCasillas(([, b]) => [v, b])}>
            <Texto variante="pequeno" color={color.texto.secundario}>
              Autorizo el tratamiento de mis datos personales según la Política de tratamiento de datos (Ley 1581 de 2012).
            </Texto>
          </Casilla>
        </Seccion>

        <Seccion titulo="Insignia" nodo="9:250">
          <View style={estilos.fila}>
            <Insignia etiqueta="Saldo bajo" tipo="advertencia" />
            <Insignia etiqueta="Aprobada" tipo="exito" />
            <Insignia etiqueta="Modo de pruebas" tipo="info" />
            <Insignia etiqueta="Rechazada" tipo="error" />
            <Insignia etiqueta="Etiqueta" tipo="neutral" />
          </View>
        </Seccion>

        <Seccion titulo="Aviso" nodo="9:275">
          <Aviso tipo="info" mensaje="Mensaje informativo para el usuario." />
          <Aviso tipo="exito" mensaje="Mensaje informativo para el usuario." />
          <Aviso tipo="advertencia" mensaje="Mensaje informativo para el usuario." />
          <Aviso tipo="error" mensaje="Mensaje informativo para el usuario." />
        </Seccion>

        <Seccion titulo="Campo de texto" nodo="11:40">
          <CampoTexto etiqueta="Correo electrónico" defaultValue="nombre@correo.com" keyboardType="email-address" autoCapitalize="none" />
          <CampoTexto etiqueta="Correo electrónico" defaultValue="nombre@correo.com" mostrarFoco />
          <CampoTexto etiqueta="Correo electrónico" defaultValue="nombre@correo.com" error="Escribe un correo electrónico válido." />
          <CampoTexto etiqueta="Contraseña" defaultValue="ClaveSegura1" contrasena ayuda="Mínimo 8 caracteres, con letras y números." />
        </Seccion>

        <Seccion titulo="Tarjeta MIO" nodo="11:78">
          <TarjetaMIO alias="Mi tarjeta" ultimos4="4821" saldo={12400} onRecargar={() => undefined} />
          <TarjetaMIO alias="Mi tarjeta" ultimos4="4821" saldo={12400} saldoBajo onRecargar={() => undefined} />
        </Seccion>

        <Seccion titulo="Opción de pago" nodo="11:96">
          {[
            { nombre: 'PSE', descripcion: 'Débito desde tu cuenta bancaria', sigla: 'PSE' },
            { nombre: 'Nequi', descripcion: 'Billetera digital', sigla: 'N' },
            { nombre: 'Bancolombia', descripcion: 'Botón o app Bancolombia', sigla: 'B' },
          ].map((opcion, i) => (
            <OpcionPago key={opcion.nombre} {...opcion} seleccionada={medio === i} onPress={() => setMedio(i)} />
          ))}
        </Seccion>

        <Seccion titulo="Movimiento del historial" nodo="11:122">
          <Movimiento tipo="recarga" titulo="Recarga con Nequi" fecha="24 oct 2026 · 7:45 p. m." valor={20000} />
          <Movimiento tipo="viaje" titulo="Viaje · E21" fecha="24 oct 2026 · 7:15 a. m." valor={-3500} />
        </Seccion>

        <Seccion titulo="Barra de navegación" nodo="11:229" sinRelleno>
          <BarraNavegacion activa={pestana} onCambiar={setPestana} />
        </Seccion>

        <Seccion titulo="Barra superior" nodo="11:232" sinRelleno>
          <BarraSuperior titulo="Título de la pantalla" onAtras={() => undefined} />
          <BarraSuperior titulo="Título de la pantalla" onAtras={() => undefined} accion={{ icono: 'ayuda', etiqueta: 'Ayuda', onPress: () => undefined }} />
        </Seccion>

        <Seccion titulo="Fila de ajuste" nodo="11:270" sinRelleno>
          <FilaAjuste titulo="Alertas de saldo bajo" onPress={() => undefined} />
          <FilaAjuste tipo="interruptor" titulo="Alertas de saldo bajo" activado={alerta} onCambiar={setAlerta} />
          <FilaAjuste tipo="peligro" titulo="Eliminar mi cuenta" descripcion="Se borrarán tus tarjetas, alertas e historial" icono="eliminar" onPress={() => undefined} />
        </Seccion>

        <Seccion titulo="Fila de detalle" nodo="11:273">
          <FilaDetalle etiqueta="Referencia" valor="RM-000123" />
          <FilaDetalle etiqueta="Monto" valor="$20.000" valorHablado="20.000 pesos" />
        </Seccion>

        <Seccion titulo="Selector de tarjeta" nodo="11:278">
          <SelectorTarjeta tarjeta="Mi tarjeta •••• 4821" detalle="Saldo actual $12.400" onPress={() => undefined} />
        </Seccion>

        <Seccion titulo="Barra de estado" nodo="9:163">
          <Texto variante="pequeno" color={color.texto.secundario}>
            La dibuja el sistema operativo. La app solo elige el tema con expo-status-bar: «dark» (texto oscuro) sobre fondos claros.
          </Texto>
        </Seccion>
      </ScrollView>
    </View>
  );
}

const estilos = StyleSheet.create({
  pantalla: { flex: 1, backgroundColor: color.superficie.fondo },
  // Ancho de Figma: pantalla de 390 px con márgenes de 24 (contenido de 342)
  contenido: { paddingHorizontal: espacio[6], gap: espacio[6], width: '100%', maxWidth: 390, alignSelf: 'center' },
  seccion: { gap: espacio[1] },
  muestra: { marginTop: espacio[2], padding: espacio[4], gap: espacio[3], backgroundColor: color.superficie.tarjeta, borderRadius: radio.lg, borderWidth: 1, borderColor: color.borde.sutil },
  sinRelleno: { padding: 0, overflow: 'hidden', backgroundColor: color.superficie.fondo },
  fila: { flexDirection: 'row', flexWrap: 'wrap', gap: espacio[2], alignItems: 'center' },
  columna: { flex: 1 },
  iconos: { flexDirection: 'row', flexWrap: 'wrap', gap: espacio[4] },
});
