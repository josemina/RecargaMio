# ADR 0018 · Pantallas de la app: vacíos entre Figma y la API

- **Estado:** aceptada (T10)
- **Fecha:** 2026-11-18
- **Requerimientos:** HU-01 a HU-07, RNF-04 (Ley 1581 de 2012), RNF-05 (WCAG 2.1 AA). Pantallas 1.1 a 5.3 de Figma (página 03).
- **Plan relacionado:** T10: «Implementar las pantallas de Figma en este orden: 1.1 a 1.4, 2.1 a 2.4, 3.1 a 3.5, 4.1 y 4.2, 5.1 y 5.2». Criterio de aceptación: «el flujo 1.1 → 2.1 → 3.1 → 3.3 → 3.4 → 4.1 funciona en un teléfono Android real contra la API en Docker».

## Contexto
Al leer las 19 pantallas de Figma nodo por nodo y compararlas con la API aparecieron vacíos: datos que la pasarela exige y Figma no pide, acciones que Figma dibuja y la API no tiene, y pantallas que Figma no dibuja.

## Decisiones aprobadas por el equipo
- **A. Datos del medio de pago (3.1 y 3.2).** Al elegir un medio, sus campos aparecen debajo, armados con `CampoTexto`, `Chip` y un selector igual al de tarjetas:
  - **Nequi:** el celular. En modo de pruebas, la ayuda del campo indica los números que aprueban y que rechazan.
  - **PSE:** tipo de persona, tipo y número de documento, banco (lista de `GET /pasarela/bancos`) y celular.
  - **Bancolombia:** no pide nada; un aviso explica que se abre la página del banco.
  - Los datos solo viajan a la pasarela (regla 2). La app valida lo mismo que la API antes de enviar.
- **B. Términos de la pasarela.** Wompi y la API (`aceptaTerminosPasarela`) exigen aceptarlos, pero Figma no los tiene. Se agregó una casilla sobre «Pagar» con dos enlaces (`GET /pasarela/terminos`) que se abren con `expo-web-browser`.
- **C. «Cancelar recarga» (3.3) pasa a ser «Volver al inicio».** La API no puede cancelar un pago que ya está en la pasarela. La recarga sigue en curso y su resultado llega a la bandeja de avisos.
  - Además, si hay una página de pago (PSE o Bancolombia), la 3.3 ofrece «Abrir de nuevo la página del banco».
- **D. Política de tratamiento de datos.** El documento maestro no trae su texto. Se escribió un **borrador** corto (pantalla `/politica`, versión 1.0), marcado en la app como «Borrador pendiente de revisión».
  - Lo debe revisar y aprobar el equipo antes de la validación con usuarios (T11).
  - Falta el correo de contacto, que debe definir el equipo.
- **E. Diálogos que Figma no dibuja.** Las confirmaciones (eliminar tarjeta, cerrar sesión, primer paso de eliminar la cuenta) usan el diálogo del sistema, que TalkBack ya anuncia.
  - En la web, que solo sirve para desarrollo, el diálogo es `window.confirm`.
  - Renombrar la tarjeta y escribir la contraseña para eliminar la cuenta usan `DialogoTexto`, armado con los componentes de la página 02.
- **F. Entrega:** los cinco bloques seguidos, con sus pruebas, y una sola actualización del manual al final.

## Decisiones técnicas
1. **Rutas** (`apps/mobile/src/app`):

   <!-- tabla: Rutas de la app y pantallas de Figma en T10 -->
   | Ruta | Pantallas de Figma |
   |---|---|
   | `/` sin sesión | 1.1 Inicio de sesión y 1.2, su estado de error |
   | `/registro`, `/recuperar` | 1.3 y 1.4 |
   | `/politica` | Política de tratamiento de datos (sin pantalla en Figma; con sesión y sin ella) |
   | `/` con sesión, `/recargar`, `/historial`, `/perfil` | Las cuatro pestañas: 2.1, 3.1, 4.1 y 5.1 |
   | `/tarjetas/agregar`, `/tarjetas/[id]` | 2.2 y 2.4 (la misma pantalla con 5 de 5 tarjetas), y 2.3 |
   | `/recarga/tercero` | 3.2 |
   | `/recarga/[id]` | 3.3, 3.4 y 3.5: una sola ruta que cambia según el estado de la recarga |
   | `/alertas`, `/notificaciones` | 4.2 y la bandeja de avisos de la campana de 2.1 (sin pantalla en Figma) |
   | `/privacidad`, `/datos-personales`, `/ayuda` | 5.2, la rectificación de datos (sin pantalla en Figma) y 5.3 |

2. **Estado de la recarga:**
   - La 3.3 consulta `GET /recargas/:id` al abrirse y cada 2 s hasta un estado final.
   - Al terminar, se refrescan las tarjetas y los avisos.
   - «Actualizar estado» usa `?actualizar=1`.
   - Un doble toque en «Pagar» que la API rechaza con `RECARGA_EN_CURSO` lleva a la recarga que ya está en curso.
3. **Datos del servidor** con TanStack Query (`src/api/hooks.ts`):
   - Ninguna pantalla llama directamente a `fetch`.
   - Los errores se muestran con el mensaje de la API. Los de un campo (por ejemplo, `CORREO_REGISTRADO` o `TARJETA_NO_EXISTE`) se muestran en ese campo.
4. **Notificaciones push** (`src/sesion/push.ts`):
   - Solo en Android y fuera de Expo Go.
   - Pide el permiso, crea el canal `alertas` (el mismo que usa la API) y registra el token de FCM en `/dispositivos`.
   - Al cerrar sesión se quita el token.
   - Al tocar un aviso se abre el comprobante (recarga exitosa) o la recarga de esa tarjeta (saldo bajo).
   - `expo-notifications` se carga solo cuando hay push, porque en Expo Go muestra una advertencia apenas se importa.
5. **Fuera del PMV**, como dice el ADR 0015: «Descargar mis datos», «Radicar una PQR» y «Escribir a soporte» se ven como «Próximamente».
6. **Diferencias pequeñas con Figma:**
   - Un punto rojo en la campana cuando hay avisos sin leer.
   - El botón de texto «Leer la política de tratamiento de datos» en la 1.3, porque el enlace dentro de la casilla no se puede alcanzar por separado con el lector de pantalla.
   - El último par etiqueta-valor de los detalles de las pantallas 3.3 a 3.5 va sin línea inferior, como en Figma.
7. **Ajustes al sistema de diseño de T9**, detectados al leer las pantallas:
   - `Título 1` con espaciado de −0,3.
   - Ícono final en `CampoTexto`.
   - Borde punteado en `Boton`.
   - `Insignia` centrada.
   - `SelectorTarjeta` con otro ícono (para elegir el banco de PSE).
   - `FilaDetalle` sin línea inferior.

## Verificación
- **Pruebas automatizadas:**
  - 84 pruebas de la app, con la API falsa de `__tests__/ayudas/apiFalsa.ts`, que responde como la real.
  - Incluyen el flujo de aceptación completo con las rutas reales.
- **Prueba en la web contra la API en Docker** (pasarela simulada, cuenta desechable):
  - Se recorrieron registro, agregar tarjeta, recarga con Nequi, recarga exitosa (de $6.000 a $26.000), historial, avisos, alertas y privacidad.
  - Las capturas del manual salen de ese recorrido (`npm run manual:capturas`), que al final elimina su cuenta.
- **Pendiente del equipo:** la prueba en un teléfono Android real, que es la que exige el criterio de aceptación.

## Consecuencias
- La app ya cubre todas las historias del PMV.
- La tasa de éxito y los tiempos con Wompi Sandbox siguen esperando las llaves (T5b).
- Para probar en la web hay que poner `CORS_ORIGENES=http://localhost:8081` en `.env`. En una demostración real se deja vacío.
- **El borrador de la política no es un texto legal revisado:** el equipo debe aprobarlo antes de usar la app con personas.
