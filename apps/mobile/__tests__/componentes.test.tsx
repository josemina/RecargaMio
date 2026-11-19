// T9 · Componentes de la página 02 de Figma: variantes, accesibilidad y objetivo táctil de 44 px (regla 7, WCAG 2.1 AA).
import { fireEvent, render, screen } from '@testing-library/react-native';
import { StyleSheet, type Insets } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import {
  Aviso, BarraNavegacion, BarraSuperior, Boton, CampoTexto, Casilla, Chip, FilaAjuste, FilaDetalle, Insignia, Interruptor,
  Movimiento, OpcionPago, SelectorTarjeta, TarjetaMIO,
} from '@/components';
import { color, ESCALA_TEXTO_MAXIMA } from '@/theme/tokens';

const metricas = { frame: { x: 0, y: 0, width: 390, height: 844 }, insets: { top: 0, left: 0, right: 0, bottom: 0 } };
const conAreaSegura = (ui: React.ReactElement) => render(<SafeAreaProvider initialMetrics={metricas}>{ui}</SafeAreaProvider>);

/** Estilo final del elemento nativo (Pressable ya resolvió su estilo según si está presionado). */
const estiloDe = (elemento: ReturnType<typeof screen.getByRole>) => StyleSheet.flatten(elemento.props.style) ?? {};

/** Alto y ancho táctiles: el tamaño del elemento (alto mínimo o fijo) más el hitSlop. */
function areaTactil(elemento: ReturnType<typeof screen.getByRole>) {
  const estilo = estiloDe(elemento);
  const slop = (elemento.props.hitSlop ?? {}) as Insets;
  const alto = Number(estilo.height ?? estilo.minHeight ?? 0) + (slop.top ?? 0) + (slop.bottom ?? 0);
  const ancho = estilo.width === undefined ? Infinity : Number(estilo.width) + (slop.left ?? 0) + (slop.right ?? 0);
  return { alto, ancho };
}

function esperarTactil(elemento: ReturnType<typeof screen.getByRole>) {
  const { alto, ancho } = areaTactil(elemento);
  expect(alto).toBeGreaterThanOrEqual(44);
  expect(ancho).toBeGreaterThanOrEqual(44);
}

describe('T9 · Botón (Figma 9:216)', () => {
  it('tiene rol, etiqueta y 48 px de alto, y responde al toque', async () => {
    const onPress = jest.fn();
    await render(<Boton etiqueta="Ingresar" onPress={onPress} />);
    const boton = screen.getByRole('button', { name: 'Ingresar' });
    esperarTactil(boton);
    expect(estiloDe(boton).minHeight).toBe(48);
    await fireEvent.press(boton);
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('deshabilitado no responde y lo anuncia', async () => {
    const onPress = jest.fn();
    await render(<Boton etiqueta="Pagar" onPress={onPress} deshabilitado />);
    const boton = screen.getByRole('button', { name: 'Pagar' });
    expect(boton.props.accessibilityState).toMatchObject({ disabled: true });
    await fireEvent.press(boton);
    expect(onPress).not.toHaveBeenCalled();
  });

  it('mientras carga queda ocupado y bloqueado (no se paga dos veces)', async () => {
    const onPress = jest.fn();
    await render(<Boton etiqueta="Pagar" onPress={onPress} cargando />);
    const boton = screen.getByRole('button', { name: 'Pagar' });
    expect(boton.props.accessibilityState).toMatchObject({ disabled: true, busy: true });
    await fireEvent.press(boton);
    expect(onPress).not.toHaveBeenCalled();
  });

  it.each([
    ['primario', color.marca.primario],
    ['acento', color.acento.principal],
    ['secundario', color.superficie.tarjeta],
    ['peligro', color.superficie.tarjeta],
  ] as const)('el tipo %s usa el fondo de Figma', async (tipo, fondo) => {
    await render(<Boton etiqueta="Botón" tipo={tipo} />);
    expect(estiloDe(screen.getByRole('button')).backgroundColor).toBe(fondo);
  });
});

describe('T9 · Chip (Figma 9:223)', () => {
  it('es una opción de selección única, de 40 px dibujados y 44 táctiles', async () => {
    const onPress = jest.fn();
    await render(<Chip etiqueta="$10.000" etiquetaAccesible="10.000 pesos" activo onPress={onPress} />);
    const chip = screen.getByRole('radio', { name: '10.000 pesos' });
    expect(chip.props.accessibilityState).toMatchObject({ checked: true });
    expect(areaTactil(chip).alto).toBe(44);
    await fireEvent.press(chip);
    expect(onPress).toHaveBeenCalled();
  });
});

describe('T9 · Interruptor (Figma 9:230)', () => {
  it('es un switch con etiqueta y cambia de estado', async () => {
    const onCambiar = jest.fn();
    await render(<Interruptor activado={false} etiqueta="Alerta de saldo bajo" onCambiar={onCambiar} />);
    const interruptor = screen.getByRole('switch', { name: 'Alerta de saldo bajo' });
    expect(interruptor.props.accessibilityState).toMatchObject({ checked: false });
    expect(areaTactil(interruptor).alto).toBe(44);
    await fireEvent.press(interruptor);
    expect(onCambiar).toHaveBeenCalledWith(true);
  });
});

describe('T9 · Casilla (Figma 9:237)', () => {
  it('es una casilla con etiqueta, área de 44 px y toda la fila táctil', async () => {
    const onCambiar = jest.fn();
    await render(<Casilla marcada={false} etiqueta="Autorizo el tratamiento de mis datos" onCambiar={onCambiar} />);
    const casilla = screen.getByRole('checkbox', { name: 'Autorizo el tratamiento de mis datos' });
    expect(casilla.props.accessibilityState).toMatchObject({ checked: false });
    expect(areaTactil(casilla).alto).toBeGreaterThanOrEqual(44);
    await fireEvent.press(casilla);
    expect(onCambiar).toHaveBeenCalledWith(true);
  });
});

describe('T9 · Insignia y Aviso (Figma 9:250 y 9:275)', () => {
  it('la insignia se lee como texto', async () => {
    await render(<Insignia etiqueta="Saldo bajo" />);
    expect(screen.getByLabelText('Saldo bajo')).toBeTruthy();
  });

  it('los avisos de error se anuncian solos; los informativos, con cortesía', async () => {
    await render(
      <>
        <Aviso tipo="error" mensaje="La contraseña no es correcta." />
        <Aviso tipo="info" mensaje="Modo de pruebas." />
      </>,
    );
    expect(screen.getByRole('alert', { name: 'La contraseña no es correcta.' }).props.accessibilityLiveRegion).toBe('assertive');
    expect(screen.getByLabelText('Modo de pruebas.').props.accessibilityLiveRegion).toBe('polite');
  });
});

describe('T9 · Campo de texto (Figma 11:40)', () => {
  it('tiene etiqueta visible y accesible, y el error reemplaza la ayuda (WCAG 3.3.1)', async () => {
    await render(<CampoTexto etiqueta="Correo electrónico" ayuda="Con este correo ingresas" error="Escribe un correo electrónico válido." />);
    const campo = screen.getByLabelText('Correo electrónico');
    expect(campo.props.accessibilityHint).toBe('Escribe un correo electrónico válido.');
    expect(campo.props.maxFontSizeMultiplier).toBe(ESCALA_TEXTO_MAXIMA);
    expect(screen.queryByText('Con este correo ingresas')).toBeNull();
  });

  it('la contraseña se oculta y el botón del ojo (44 px) la muestra', async () => {
    await render(<CampoTexto etiqueta="Contraseña" contrasena defaultValue="ClaveSegura1" />);
    expect(screen.getByLabelText('Contraseña').props.secureTextEntry).toBe(true);
    const ojo = screen.getByRole('button', { name: 'Mostrar contraseña' });
    esperarTactil(ojo);
    await fireEvent.press(ojo);
    expect(screen.getByLabelText('Contraseña').props.secureTextEntry).toBe(false);
    expect(screen.getByRole('button', { name: 'Ocultar contraseña' })).toBeTruthy();
  });
});

describe('T9 · Tarjeta MIO (Figma 11:78)', () => {
  it('muestra solo los últimos 4 dígitos y el saldo en pesos; el lector de pantalla oye un resumen', async () => {
    const onRecargar = jest.fn();
    await render(<TarjetaMIO alias="Tarjeta de mamá" ultimos4="7730" saldo={3200} saldoBajo onRecargar={onRecargar} />);
    expect(screen.getByText('MIO •••• 7730')).toBeTruthy();
    expect(screen.getByText('$3.200')).toBeTruthy();
    expect(screen.getByText('Saldo bajo')).toBeTruthy();
    expect(screen.getByLabelText('Tarjeta de mamá, tarjeta terminada en 7 7 3 0, saldo 3.200 pesos, saldo bajo')).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'Recargar' }));
    expect(onRecargar).toHaveBeenCalled();
  });

  it('si el recaudo no respondió, dice que el saldo no está disponible', async () => {
    await render(<TarjetaMIO alias="Mi tarjeta" ultimos4="4821" saldo={null} />);
    expect(screen.getByText('No disponible')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Recargar' })).toBeNull();
  });
});

describe('T9 · Opción de pago, movimiento, filas y selector (Figma 11:96, 11:122, 11:270, 11:273, 11:278)', () => {
  it('la opción de pago es un radio de 64 px', async () => {
    await render(<OpcionPago nombre="Nequi" descripcion="Billetera digital" sigla="N" seleccionada />);
    const opcion = screen.getByRole('radio', { name: 'Nequi, Billetera digital' });
    expect(opcion.props.accessibilityState).toMatchObject({ checked: true });
    expect(areaTactil(opcion).alto).toBe(64);
  });

  it('el movimiento se lee completo: qué, cuándo y cuánto', async () => {
    await render(<Movimiento tipo="viaje" titulo="Viaje · E21" fecha="24 oct 2026 · 7:15 a. m." valor={-3500} />);
    expect(screen.getByText('-$3.500')).toBeTruthy();
    expect(screen.getByLabelText('Viaje · E21, 24 oct 2026 · 7:15 a. m., débito de 3.500 pesos')).toBeTruthy();
  });

  it('la fila con interruptor se anuncia y se cambia como un solo interruptor', async () => {
    const onCambiar = jest.fn();
    await render(<FilaAjuste tipo="interruptor" titulo="Alertas de saldo bajo" activado onCambiar={onCambiar} />);
    const fila = screen.getByRole('switch', { name: 'Alertas de saldo bajo' });
    await fireEvent.press(fila);
    expect(onCambiar).toHaveBeenCalledWith(false);
  });

  it('la fila de peligro es un botón con su descripción', async () => {
    const onPress = jest.fn();
    await render(<FilaAjuste tipo="peligro" titulo="Eliminar mi cuenta" descripcion="Se borrarán tus tarjetas" onPress={onPress} />);
    const fila = screen.getByRole('button', { name: 'Eliminar mi cuenta. Se borrarán tus tarjetas' });
    esperarTactil(fila);
    await fireEvent.press(fila);
    expect(onPress).toHaveBeenCalled();
  });

  it('la fila de detalle se lee como un par etiqueta-valor', async () => {
    await render(<FilaDetalle etiqueta="Monto" valor="$20.000" valorHablado="20.000 pesos" />);
    expect(screen.getByLabelText('Monto: 20.000 pesos')).toBeTruthy();
  });

  it('el selector de tarjeta explica que abre la lista', async () => {
    await render(<SelectorTarjeta tarjeta="Mi tarjeta •••• 4821" detalle="Saldo actual $12.400" onPress={jest.fn()} />);
    const selector = screen.getByRole('button', { name: 'Tarjeta a recargar: Mi tarjeta terminada en 4821. Saldo actual $12.400' });
    expect(selector.props.accessibilityHint).toBe('Abre la lista de tus tarjetas');
  });
});

describe('T9 · Barras (Figma 11:229 y 11:232)', () => {
  it('la barra de navegación tiene cuatro pestañas de 44 px o más y marca la activa', async () => {
    const onCambiar = jest.fn();
    await conAreaSegura(<BarraNavegacion activa="historial" onCambiar={onCambiar} />);
    const pestanas = screen.getAllByRole('tab');
    expect(pestanas.map((p) => p.props.accessibilityLabel)).toEqual(['Inicio', 'Recargar', 'Historial', 'Perfil']);
    pestanas.forEach((p) => expect(areaTactil(p).alto).toBeGreaterThanOrEqual(44));
    expect(screen.getByRole('tab', { name: 'Historial' }).props.accessibilityState).toMatchObject({ selected: true });
    await fireEvent.press(screen.getByRole('tab', { name: 'Perfil' }));
    expect(onCambiar).toHaveBeenCalledWith('perfil');
  });

  it('la barra superior tiene título de encabezado y botón Volver de 44 × 44', async () => {
    const onAtras = jest.fn();
    await render(<BarraSuperior titulo="Agregar tarjeta" onAtras={onAtras} />);
    expect(screen.getByRole('header', { name: 'Agregar tarjeta' })).toBeTruthy();
    const volver = screen.getByRole('button', { name: 'Volver' });
    esperarTactil(volver);
    await fireEvent.press(volver);
    expect(onAtras).toHaveBeenCalled();
  });
});
