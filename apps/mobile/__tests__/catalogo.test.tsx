// T9 · Criterio de aceptación: la pantalla de catálogo muestra todos los componentes de la página 02 de Figma.
import { render, screen } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import Catalogo from '@/app/catalogo';
import { NOMBRES_ICONOS } from '@/components';

jest.mock('expo-router', () => ({ router: { canGoBack: () => false, back: jest.fn() } }));

const metricas = { frame: { x: 0, y: 0, width: 390, height: 844 }, insets: { top: 0, left: 0, right: 0, bottom: 0 } };

// Los 16 marcos de la página 02 (nodos 9:4, 9:138 y 11:13)
const SECCIONES_FIGMA = [
  'Íconos', 'Botón', 'Chip (monto y filtro)', 'Interruptor', 'Casilla de verificación', 'Insignia', 'Aviso', 'Campo de texto',
  'Tarjeta MIO', 'Opción de pago', 'Movimiento del historial', 'Barra de navegación', 'Barra superior', 'Fila de ajuste',
  'Fila de detalle', 'Selector de tarjeta', 'Barra de estado',
];

describe('T9 · Catálogo de componentes', () => {
  beforeEach(async () => { await render(<SafeAreaProvider initialMetrics={metricas}><Catalogo /></SafeAreaProvider>); });

  it('tiene una sección por cada marco de la página 02 de Figma', async () => {
    for (const seccion of SECCIONES_FIGMA) expect(screen.getByRole('header', { name: seccion })).toBeTruthy();
  });

  it('muestra los 30 íconos de Figma', async () => {
    expect(NOMBRES_ICONOS).toHaveLength(30);
    for (const nombre of NOMBRES_ICONOS) expect(screen.getByLabelText(`Ícono ${nombre}`)).toBeTruthy();
  });

  it('muestra las variantes de Figma: 10 botones, 4 avisos, 5 insignias y 4 campos', async () => {
    expect(screen.getAllByRole('button', { name: 'Botón' })).toHaveLength(10);
    expect(screen.getAllByText('Mensaje informativo para el usuario.')).toHaveLength(4);
    for (const insignia of ['Saldo bajo', 'Aprobada', 'Modo de pruebas', 'Rechazada', 'Etiqueta']) expect(screen.getAllByLabelText(insignia).length).toBeGreaterThan(0);
    expect(screen.getAllByLabelText(/Correo electrónico|Contraseña/)).toHaveLength(4);
  });
});
