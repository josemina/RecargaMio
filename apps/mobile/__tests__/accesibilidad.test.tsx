// T11 · Revisión automática de accesibilidad de todas las pantallas (regla 7 de CLAUDE.md, WCAG 2.1 AA).
// Abre cada ruta de la app con la API falsa y revisa cada elemento que se puede tocar o escribir:
//   - tiene rol (accessibilityRole) y etiqueta (accessibilityLabel)  · WCAG 4.1.2 Nombre, función, valor
//   - su área táctil (alto o alto mínimo, más el hitSlop) mide 44 × 44 px o más · WCAG 2.5.5 y regla 7
//   - los campos de texto tienen etiqueta                              · WCAG 1.3.1 y 3.3.2
// Con ACCESIBILIDAD_SALIDA=<archivo> guarda el resumen en JSON para `npm run metricas` (docs/metricas/).
import { writeFileSync } from 'node:fs';
import { StyleSheet, type Insets } from 'react-native';
import { fireEvent, screen, waitFor } from 'expo-router/testing-library';
import { abrirApp, crearApiFalsa, type TarjetaFalsa } from './ayudas/apiFalsa';

jest.mock('expo-web-browser', () => ({ openBrowserAsync: jest.fn(), openAuthSessionAsync: jest.fn(async () => ({ type: 'dismiss' })) }));

type Nodo = NonNullable<(typeof screen)['root']>;
interface Revision {
  pantalla: string;
  controles: number;
  campos: number;
  problemas: string[];
}
const revisiones: Revision[] = [];

const MINIMO = 44;
const esTactil = (n: Nodo) =>
  typeof n.props.onPress === 'function' || typeof n.props.onClick === 'function' || typeof n.props.onResponderRelease === 'function';
const esCampo = (n: Nodo) => n.type === 'TextInput';

/** Nombre corto para el reporte: la etiqueta, o el texto que contiene. */
function nombre(n: Nodo): string {
  const etiqueta = n.props.accessibilityLabel ?? n.props['aria-label'];
  if (etiqueta) return String(etiqueta);
  const textos: string[] = [];
  const recorrer = (x: Nodo | string | null): unknown => (typeof x === 'string' ? textos.push(x) : x?.children.forEach(recorrer));
  recorrer(n);
  return textos.join(' ').trim() || `<${n.type} sin texto>`;
}

function area(n: Nodo) {
  const estilo = StyleSheet.flatten(n.props.style) ?? {};
  const slop = (typeof n.props.hitSlop === 'number'
    ? { top: n.props.hitSlop, bottom: n.props.hitSlop, left: n.props.hitSlop, right: n.props.hitSlop }
    : (n.props.hitSlop ?? {})) as Insets;
  const base = (valor: unknown) => (typeof valor === 'number' ? valor : undefined);
  const alto = base(estilo.height) ?? base(estilo.minHeight);
  // Con flex, el control reparte el ancho de la fila (por ejemplo, los cuatro montos de la 3.1): no tiene un ancho fijo que medir
  const estirado = (base(estilo.flex) ?? 0) > 0 || (base(estilo.flexGrow) ?? 0) > 0;
  const ancho = estirado ? undefined : (base(estilo.width) ?? base(estilo.minWidth));
  return {
    alto: alto === undefined ? undefined : alto + (slop.top ?? 0) + (slop.bottom ?? 0),
    // Sin ancho declarado, el control se estira con su contenedor (toda la fila o todo el ancho de la pantalla)
    ancho: ancho === undefined ? Infinity : ancho + (slop.left ?? 0) + (slop.right ?? 0),
  };
}

function revisar(pantalla: string) {
  const raiz = screen.root;
  if (!raiz) throw new Error(`La pantalla ${pantalla} no se dibujó`);
  const tactiles = raiz.queryAll(esTactil);
  const campos = raiz.queryAll(esCampo);
  const problemas: string[] = [];
  for (const n of tactiles) {
    const quien = nombre(n);
    if (!n.props.accessibilityRole && !n.props.role) problemas.push(`«${quien}» no tiene rol`);
    if (!n.props.accessibilityLabel && !n.props['aria-label']) problemas.push(`«${quien}» no tiene etiqueta`);
    const { alto, ancho } = area(n);
    if (alto === undefined) problemas.push(`«${quien}» no declara alto: no se puede asegurar el área de ${MINIMO} px`);
    else if (alto < MINIMO) problemas.push(`«${quien}» mide ${alto} px de alto táctil`);
    if (ancho < MINIMO) problemas.push(`«${quien}» mide ${ancho} px de ancho táctil`);
  }
  for (const n of campos) {
    if (!n.props.accessibilityLabel && !n.props['aria-label']) problemas.push(`Un campo de texto («${n.props.placeholder ?? 'sin texto'}») no tiene etiqueta`);
  }
  revisiones.push({ pantalla, controles: tactiles.length, campos: campos.length, problemas });
  expect(problemas).toEqual([]);
}

/** Espera a que la pantalla termine de cargar: hay un encabezado y ya no hay indicador de carga. */
async function cargada(encabezado: string | RegExp) {
  expect(await screen.findByRole('header', { name: encabezado })).toBeTruthy();
  await waitFor(() => expect(screen.queryAllByRole('progressbar')).toHaveLength(0));
}

const cincoTarjetas: TarjetaFalsa[] = Array.from({ length: 5 }, (_, i) => ({
  id: `t${i + 1}`,
  alias: `Tarjeta ${i + 1}`,
  numero: `123456000${i + 1}`,
  saldo: 8000,
  alerta: null,
}));

// [pantalla de Figma, ruta, encabezado que confirma que cargó, con sesión]
const PANTALLAS: [string, string, string | RegExp, boolean][] = [
  ['1.1 Inicio de sesión', '/', /RecargaMIO/, false],
  ['1.3 Crear cuenta', '/registro', 'Crear cuenta', false],
  ['1.4 Recuperar contraseña', '/recuperar', 'Recuperar contraseña', false],
  ['Política de tratamiento de datos', '/politica', 'Política de tratamiento de datos', false],
  ['2.1 Mis tarjetas', '/', 'Hola, Viviana', true],
  ['2.2 Agregar tarjeta', '/tarjetas/agregar', 'Agregar tarjeta', true],
  ['2.3 Detalle de tarjeta', '/tarjetas/t1', 'Mi tarjeta', true],
  ['3.1 Recargar saldo', '/recargar', 'Recargar saldo', true],
  ['3.2 Recargar a otra persona', '/recarga/tercero', 'Recargar a otra persona', true],
  ['4.1 Historial', '/historial', 'Historial', true],
  ['4.2 Alertas de saldo bajo', '/alertas', 'Alertas de saldo bajo', true],
  ['Bandeja de avisos', '/notificaciones', 'Avisos', true],
  ['5.1 Perfil', '/perfil', 'Perfil', true],
  ['5.2 Privacidad y datos', '/privacidad', 'Privacidad y datos', true],
  ['Datos personales', '/datos-personales', 'Datos personales', true],
  ['5.3 Ayuda y PQR', '/ayuda', 'Ayuda y PQR', true],
];

describe('T11 · Accesibilidad de cada pantalla (regla 7, WCAG 2.1 AA)', () => {
  it.each(PANTALLAS)('%s: rol, etiqueta y 44 px en cada control', async (pantalla, ruta, encabezado, conSesion) => {
    crearApiFalsa();
    await abrirApp(ruta, { conSesion });
    await cargada(encabezado);
    revisar(pantalla);
  });

  it('2.4 Límite de tarjetas: rol, etiqueta y 44 px en cada control', async () => {
    crearApiFalsa({ tarjetas: cincoTarjetas });
    await abrirApp('/tarjetas/agregar');
    await cargada('Agregar tarjeta');
    expect((await screen.findAllByText(/5 de 5/)).length).toBeGreaterThan(0);
    revisar('2.4 Límite de tarjetas');
  });

  it.each([
    ['3.3 Esperando confirmación', 'PENDIENTE', 'Esperando confirmación'],
    ['3.4 Recarga exitosa', 'ACREDITADA', '¡Recarga exitosa!'],
    ['3.5 Pago rechazado', 'RECHAZADA', 'Pago rechazado'],
  ] as const)('%s: rol, etiqueta y 44 px en cada control', async (pantalla, resultadoPago, encabezado) => {
    crearApiFalsa({ resultadoPago });
    await abrirApp('/recargar');
    await fireEvent.press(await screen.findByRole('radio', { name: 'Nequi, Billetera digital' }));
    await fireEvent.changeText(screen.getByLabelText('Celular de Nequi'), '3991111111');
    await fireEvent.press(screen.getByRole('checkbox', { name: /Acepto los términos/ }));
    await fireEvent.press(screen.getByRole('button', { name: /^Pagar/ }));
    expect(await screen.findByRole('header', { name: encabezado })).toBeTruthy();
    revisar(pantalla);
  });

  afterAll(() => {
    const salida = process.env.ACCESIBILIDAD_SALIDA;
    if (salida) writeFileSync(salida, `${JSON.stringify({ generadoEn: new Date().toISOString(), pantallas: revisiones }, null, 2)}\n`);
  });
});
