// API falsa en memoria para las pruebas de las pantallas (T10). Responde como services/api (mismos códigos de error).
import * as SecureStore from 'expo-secure-store';
import { renderRouter } from 'expo-router/testing-library';
import path from 'node:path';

// Como una red real, cada respuesta es una copia: la app nunca recibe los objetos internos de la API falsa
const respuesta = (estado: number, cuerpo?: unknown) => ({ status: estado, ok: estado >= 200 && estado < 300, json: async () => structuredClone(cuerpo) }) as Response;
const error = (estado: number, codigo: string, mensaje: string, datos: Record<string, unknown> = {}) => respuesta(estado, { error: { codigo, mensaje, ...datos } });

export const CLAVE = 'ClaveSegura1';

export interface TarjetaFalsa {
  id: string;
  alias: string;
  numero: string;
  saldo: number;
  alerta: { umbral: number; activa: boolean } | null;
}

export function crearApiFalsa(opciones: { tarjetas?: TarjetaFalsa[]; resultadoPago?: 'ACREDITADA' | 'RECHAZADA' | 'PENDIENTE'; bloqueada?: boolean } = {}) {
  const estado = {
    usuario: { id: 'u1', nombre: 'Viviana Andrade Torres', correo: 'viviana@recargamio.test' },
    intentos: 5,
    tarjetas: opciones.tarjetas ?? [
      { id: 't1', alias: 'Mi tarjeta', numero: '1234564821', saldo: 12400, alerta: { umbral: 5000, activa: true } },
      { id: 't2', alias: 'Tarjeta de mamá', numero: '1234567730', saldo: 3200, alerta: { umbral: 5000, activa: true } },
    ],
    recargas: new Map<string, Record<string, unknown>>(),
    notificaciones: [] as { id: string; tipo: string; titulo: string; cuerpo: string; datos: Record<string, unknown>; leida: boolean; creadaEn: string }[],
    peticiones: [] as { metodo: string; ruta: string; cuerpo?: Record<string, unknown> }[],
    eliminada: false,
  };
  const tokens = () => ({
    tokenAcceso: 'acceso',
    accesoExpiraEn: new Date(Date.now() + 900_000).toISOString(),
    tokenRenovacion: 'renovacion-nueva',
    sesionExpiraEn: new Date(Date.now() + 86_400_000).toISOString(),
  });
  const vistaTarjeta = (t: TarjetaFalsa) => ({
    id: t.id,
    alias: t.alias,
    ultimos4: t.numero.slice(-4),
    saldo: t.saldo,
    saldoBajo: Boolean(t.alerta?.activa && t.saldo < t.alerta.umbral),
    alerta: t.alerta,
    creadaEn: '2026-11-01T12:00:00Z',
  });
  const MEDIOS: Record<string, string> = { NEQUI: 'Nequi', PSE: 'PSE', BANCOLOMBIA_TRANSFER: 'Bancolombia' };

  const fetch = jest.fn(async (url: string, init: RequestInit = {}) => {
    const { pathname: ruta, searchParams } = new URL(url);
    const metodo = init.method ?? 'GET';
    const cuerpo = init.body ? (JSON.parse(init.body as string) as Record<string, unknown>) : undefined;
    estado.peticiones.push({ metodo, ruta, cuerpo });
    const clave = `${metodo} ${ruta}`;

    if (clave === 'POST /auth/ingreso') {
      if (opciones.bloqueada) return error(423, 'CUENTA_BLOQUEADA', 'Por seguridad, el ingreso está bloqueado por 15 minutos después de 5 intentos fallidos.');
      if (cuerpo?.contrasena !== CLAVE) {
        estado.intentos -= 1;
        return error(401, 'CREDENCIALES_INVALIDAS', 'Correo o contraseña incorrectos.', { intentosRestantes: estado.intentos });
      }
      return respuesta(200, { usuario: estado.usuario, ...tokens() });
    }
    if (clave === 'POST /auth/registro') {
      if (cuerpo?.correo === 'ocupado@recargamio.test') return error(409, 'CORREO_REGISTRADO', 'Ya existe una cuenta con ese correo.');
      return respuesta(201, { usuario: { id: 'u2', nombre: cuerpo?.nombre, correo: cuerpo?.correo }, ...tokens() });
    }
    if (clave === 'POST /auth/renovar') return estado.eliminada ? error(401, 'SESION_INVALIDA', 'x') : respuesta(200, tokens());
    if (clave === 'POST /auth/salir') return respuesta(204);
    if (clave === 'POST /auth/recuperar') return respuesta(200, { mensaje: 'Si el correo está registrado, recibirás un enlace válido por 30 minutos.' });

    if (clave === 'GET /me') return respuesta(200, { ...estado.usuario, creadoEn: '2026-09-12T15:00:00Z', politica: { version: '1.0', aceptadaEn: '2026-09-12T15:00:00Z' } });
    if (clave === 'PATCH /me') {
      if (cuerpo?.correo && cuerpo.contrasenaActual !== CLAVE) return error(403, 'CONTRASENA_INCORRECTA', 'La contraseña no es correcta.');
      Object.assign(estado.usuario, { ...(cuerpo?.nombre ? { nombre: cuerpo.nombre } : {}), ...(cuerpo?.correo ? { correo: cuerpo.correo } : {}) });
      return respuesta(200, { ...estado.usuario, creadoEn: '2026-09-12T15:00:00Z', politica: { version: '1.0', aceptadaEn: '2026-09-12T15:00:00Z' } });
    }
    if (clave === 'DELETE /me') {
      if (cuerpo?.contrasena !== CLAVE) return error(403, 'CONTRASENA_INCORRECTA', 'La contraseña no es correcta.');
      estado.eliminada = true;
      return respuesta(200, { eliminada: true, tarjetas: estado.tarjetas.length, recargasAnonimizadas: estado.recargas.size });
    }

    if (clave === 'GET /tarjetas') return respuesta(200, { registradas: estado.tarjetas.length, maximo: 5, recaudoDisponible: true, tarjetas: estado.tarjetas.map(vistaTarjeta) });
    if (clave === 'POST /tarjetas') {
      if (estado.tarjetas.length >= 5) return error(409, 'LIMITE_TARJETAS', 'Ya tienes 5 de 5 tarjetas registradas.', { registradas: 5, maximo: 5 });
      if (cuerpo?.numero === '1111111111') return error(422, 'TARJETA_NO_EXISTE', 'No encontramos una tarjeta MIO con ese número. Revísalo.');
      const nueva = { id: `t${estado.tarjetas.length + 1}`, alias: String(cuerpo?.alias), numero: String(cuerpo?.numero), saldo: 0, alerta: null };
      estado.tarjetas.push(nueva);
      return respuesta(201, { tarjeta: vistaTarjeta(nueva), registradas: estado.tarjetas.length, maximo: 5 });
    }
    const tarjetaRuta = /^\/tarjetas\/([^/]+)(\/movimientos|\/alerta)?$/.exec(ruta);
    if (tarjetaRuta) {
      const t = estado.tarjetas.find((x) => x.id === tarjetaRuta[1]);
      if (!t) return error(404, 'TARJETA_NO_ENCONTRADA', 'La tarjeta no existe o no está registrada en tu cuenta.');
      if (tarjetaRuta[2] === '/movimientos') {
        const todos = [
          { tipo: 'RECARGA', fecha: new Date().toISOString(), valor: 20000, descripcion: 'Recarga con Nequi', referencia: 'RM-000001' },
          { tipo: 'VIAJE', fecha: new Date(Date.now() - 3 * 86_400_000).toISOString(), valor: -3500, descripcion: 'Viaje · E21' },
        ];
        const tipo = searchParams.get('tipo');
        const movimientos = todos.filter((m) => tipo === 'todo' || (tipo === 'recargas' ? m.tipo === 'RECARGA' : m.tipo === 'VIAJE'));
        return respuesta(200, { tarjeta: { id: t.id, alias: t.alias, ultimos4: t.numero.slice(-4) }, tipo, movimientos, siguienteCursor: null });
      }
      if (tarjetaRuta[2] === '/alerta') {
        t.alerta = { umbral: Number(cuerpo?.umbral), activa: Boolean(cuerpo?.activa) };
        return respuesta(200, vistaTarjeta(t));
      }
      if (metodo === 'PATCH') t.alias = String(cuerpo?.alias);
      if (metodo === 'DELETE') {
        estado.tarjetas = estado.tarjetas.filter((x) => x !== t);
        return respuesta(204);
      }
      return respuesta(200, { ...vistaTarjeta(t), ultimaRecarga: null });
    }

    if (clave === 'GET /pasarela/terminos') return respuesta(200, { pasarela: 'simulada', aceptacion: 'http://api/terminos', datosPersonales: 'http://api/datos' });
    if (clave === 'GET /pasarela/bancos') return respuesta(200, { bancos: [{ codigo: '1', nombre: 'Banco que aprueba' }] });
    if (clave === 'POST /recargas') {
      if (cuerpo?.aceptaTerminosPasarela !== true) return error(400, 'TERMINOS_PASARELA_NO_ACEPTADOS', 'Debes aceptar los términos.');
      const id = `r${estado.recargas.size + 1}`;
      const t = estado.tarjetas.find((x) => x.id === cuerpo?.tarjetaId);
      const recarga = {
        id,
        referencia: `RM-00012${estado.recargas.size + 3}`,
        estado: 'PENDIENTE',
        mensaje: 'Autoriza el pago de $20.000 en la app de Nequi. No cierres esta pantalla.',
        monto: cuerpo?.monto,
        total: cuerpo?.monto,
        medioPago: MEDIOS[String(cuerpo?.medioPago)],
        destino: { ultimos4: String(t?.numero ?? cuerpo?.numeroDestino).slice(-4), alias: t?.alias ?? null, tercero: !t },
        urlPago: null,
        motivo: null,
        iniciadaEn: new Date().toISOString(),
        confirmadaEn: null,
        acreditadaEn: null,
        tiempoSegundos: null,
        comprobante: null,
      };
      estado.recargas.set(id, recarga);
      return respuesta(201, recarga);
    }
    const recargaRuta = /^\/recargas\/([^/]+)$/.exec(ruta);
    if (recargaRuta) {
      const r = estado.recargas.get(recargaRuta[1]);
      if (!r) return error(404, 'RECARGA_NO_ENCONTRADA', 'La recarga no existe.');
      // La pasarela confirma en la primera consulta
      if (r.estado === 'PENDIENTE' && opciones.resultadoPago !== 'PENDIENTE') {
        if ((opciones.resultadoPago ?? 'ACREDITADA') === 'ACREDITADA') {
          const t = estado.tarjetas.find((x) => x.alias === (r.destino as { alias: string }).alias);
          if (t) t.saldo += Number(r.monto);
          Object.assign(r, {
            estado: 'ACREDITADA',
            mensaje: `Se acreditaron $${Number(r.monto).toLocaleString('es-CO').replace(/,/g, '.')} a ${(r.destino as { alias: string }).alias} •••• ${(r.destino as { ultimos4: string }).ultimos4}.`,
            acreditadaEn: new Date().toISOString(),
            comprobante: { referencia: r.referencia, fecha: new Date().toISOString(), medioPago: r.medioPago, monto: r.monto, nuevoSaldo: t?.saldo ?? null, tarjeta: 'MIO' },
          });
          estado.notificaciones.unshift({ id: 'n1', tipo: 'RECARGA_EXITOSA', titulo: 'Recarga exitosa', cuerpo: String(r.mensaje), datos: { recargaId: r.id }, leida: false, creadaEn: new Date().toISOString() });
        } else {
          Object.assign(r, { estado: 'RECHAZADA', mensaje: 'Tu banco no aprobó el pago. El saldo de tu tarjeta no cambió y no se hizo ningún cobro.', motivo: 'Fondos insuficientes' });
        }
      }
      return respuesta(200, r);
    }

    if (clave === 'GET /notificaciones') return respuesta(200, { noLeidas: estado.notificaciones.filter((n) => !n.leida).length, notificaciones: estado.notificaciones });
    if (clave === 'POST /notificaciones/leidas') {
      const marcadas = estado.notificaciones.filter((n) => !n.leida).length;
      estado.notificaciones.forEach((n) => (n.leida = true));
      return respuesta(200, { marcadas });
    }
    return error(404, 'NO_ENCONTRADO', `Ruta no simulada: ${clave}`);
  });

  globalThis.fetch = fetch as unknown as typeof globalThis.fetch;
  return { estado, fetch, llamadas: (m: string, r: string) => estado.peticiones.filter((p) => p.metodo === m && p.ruta === r) };
}

const DIR_APP = path.resolve(__dirname, '../../src/app');

/** Monta la app real (src/app) en una ruta, con o sin una sesión guardada en el almacén seguro. */
export async function abrirApp(ruta: string, { conSesion = true } = {}) {
  if (conSesion) await SecureStore.setItemAsync('recargamio.tokenRenovacion', 'renovacion-guardada');
  else await SecureStore.deleteItemAsync('recargamio.tokenRenovacion');
  return renderRouter(DIR_APP, { initialUrl: ruta });
}
