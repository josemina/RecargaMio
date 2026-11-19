// Íconos de Figma (página 02, marco «Íconos»): trazo de 2 px, estilo Lucide, 24 × 24.
// Son los SVG exportados de Figma, sin redibujar. El trazo #1B1F2A se reemplaza por currentColor (.svgrrc),
// así que el color se cambia con la propiedad `color`, como dice la descripción del componente en Figma.
import type { FC } from 'react';
import { View } from 'react-native';
import type { SvgProps } from 'react-native-svg';
import { color as colores } from '@/theme/tokens';
import SvgInicio from '../../assets/iconos/inicio.svg';
import SvgRecargar from '../../assets/iconos/recargar.svg';
import SvgHistorial from '../../assets/iconos/historial.svg';
import SvgPerfil from '../../assets/iconos/perfil.svg';
import SvgAtras from '../../assets/iconos/atras.svg';
import SvgSiguiente from '../../assets/iconos/siguiente.svg';
import SvgDesplegar from '../../assets/iconos/desplegar.svg';
import SvgMas from '../../assets/iconos/mas.svg';
import SvgCheck from '../../assets/iconos/check.svg';
import SvgCerrar from '../../assets/iconos/cerrar.svg';
import SvgCampana from '../../assets/iconos/campana.svg';
import SvgCandado from '../../assets/iconos/candado.svg';
import SvgCorreo from '../../assets/iconos/correo.svg';
import SvgOjo from '../../assets/iconos/ojo.svg';
import SvgTarjeta from '../../assets/iconos/tarjeta.svg';
import SvgAlerta from '../../assets/iconos/alerta.svg';
import SvgInfo from '../../assets/iconos/info.svg';
import SvgEliminar from '../../assets/iconos/eliminar.svg';
import SvgEditar from '../../assets/iconos/editar.svg';
import SvgEscudo from '../../assets/iconos/escudo.svg';
import SvgAyuda from '../../assets/iconos/ayuda.svg';
import SvgSalir from '../../assets/iconos/salir.svg';
import SvgEntrada from '../../assets/iconos/entrada.svg';
import SvgBus from '../../assets/iconos/bus.svg';
import SvgReloj from '../../assets/iconos/reloj.svg';
import SvgUsuarios from '../../assets/iconos/usuarios.svg';
import SvgRefrescar from '../../assets/iconos/refrescar.svg';
import SvgDocumento from '../../assets/iconos/documento.svg';
import SvgDescargar from '../../assets/iconos/descargar.svg';
import SvgMensaje from '../../assets/iconos/mensaje.svg';

const ICONOS = {
  inicio: SvgInicio,
  recargar: SvgRecargar,
  historial: SvgHistorial,
  perfil: SvgPerfil,
  atras: SvgAtras,
  siguiente: SvgSiguiente,
  desplegar: SvgDesplegar,
  mas: SvgMas,
  check: SvgCheck,
  cerrar: SvgCerrar,
  campana: SvgCampana,
  candado: SvgCandado,
  correo: SvgCorreo,
  ojo: SvgOjo,
  tarjeta: SvgTarjeta,
  alerta: SvgAlerta,
  info: SvgInfo,
  eliminar: SvgEliminar,
  editar: SvgEditar,
  escudo: SvgEscudo,
  ayuda: SvgAyuda,
  salir: SvgSalir,
  entrada: SvgEntrada,
  bus: SvgBus,
  reloj: SvgReloj,
  usuarios: SvgUsuarios,
  refrescar: SvgRefrescar,
  documento: SvgDocumento,
  descargar: SvgDescargar,
  mensaje: SvgMensaje,
} as const satisfies Record<string, FC<SvgProps>>;

export type NombreIcono = keyof typeof ICONOS;
export const NOMBRES_ICONOS = Object.keys(ICONOS) as NombreIcono[];

export interface PropsIcono {
  nombre: NombreIcono;
  /** Lado en px. En Figma: 24 por defecto; 22 en la barra de navegación y filas; 20 en botones, avisos y movimientos. */
  tamano?: number;
  color?: string;
}

/** Ícono decorativo: el texto o la etiqueta del control que lo contiene es lo que lee el lector de pantalla. */
export function Icono({ nombre, tamano = 24, color = colores.texto.principal }: PropsIcono) {
  const Svg = ICONOS[nombre];
  // aria-hidden: el lector de pantalla lo omite en Android, iOS y la web
  return (
    <View aria-hidden pointerEvents="none" style={{ width: tamano, height: tamano }} testID={`icono-${nombre}`}>
      <Svg width={tamano} height={tamano} color={color} />
    </View>
  );
}
