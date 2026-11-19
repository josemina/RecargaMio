# ADR 0014 · Alertas de saldo bajo y notificaciones

- **Estado:** aceptada (T6). El envío real por FCM queda pendiente hasta crear el proyecto de Firebase.
- **Fecha:** 2026-11-17
- **Historia:** HU-05. Criterios de la Tabla 13 del documento maestro.
- **Decisiones del plan relacionadas:** D7 (FCM solo en Android, ADR 0007). El equipo aprobó las decisiones A a D al planear T6.

## Contexto
El saldo vive en el sistema de recaudo, no en la API. Para avisar del saldo bajo, la API tiene que enterarse de que el saldo bajó: el plan pide revisar «cada 5 minutos y después de cada viaje simulado». El equipo todavía no tiene proyecto de Firebase, y el ADR 0007 ya prevé que, sin FCM, la alerta «se registra y se muestra dentro de la app».

Pantallas de Figma: **4.2** (un interruptor por tarjeta y opciones de $3.500, $5.000 y $10.000) y **4.3** (aviso «Saldo bajo en Tarjeta de mamá» y aviso «Recarga exitosa»).

## Decisiones aprobadas por el equipo
- **A. El recaudo avisa a la API después de cada viaje.**
  - `recaudo-sim` llama a `POST /internos/recaudo/viajes` con `{ numero }` y la misma llave compartida `X-Api-Key`, comparada en tiempo constante.
  - El aviso sale después de responder y sin esperar: si la API no está disponible, el viaje igual queda registrado.
  - La **revisión cada 5 minutos** (`INTERVALO_ALERTAS_MS`) sigue funcionando como respaldo.
  - Alternativa descartada: solo la revisión periódica. En la demostración habría que esperar hasta 5 minutos.
- **B. Bandeja de notificaciones en la base (tabla `notificacion`).**
  - Todo aviso se guarda primero en la bandeja; el envío por FCM es un extra que puede fallar sin perder el aviso.
  - La app lo muestra con `GET /notificaciones`, incluso en Expo Go, donde las notificaciones push no funcionan.
  - Alternativa descartada: registrar el aviso solo en la auditoría.
- **C. Cambiar el valor de la alerta o volver a activarla reinicia la ventana de 12 horas.** Guardar el mismo valor no la reinicia.
- **D. Aviso de «Recarga exitosa»** al acreditar una recarga, como en la pantalla 4.3. Reutiliza el mismo mecanismo.

## Decisiones técnicas
1. **`PUT /tarjetas/:id/alerta`** con `{ umbral, activa }`.
   - El umbral es un entero entre $3.500 y $50.000 (regla de negocio de `CLAUDE.md`). La app ofrece las tres opciones de Figma, pero la API acepta todo el rango.
   - `activa: false` desactiva la alerta y conserva el valor (CA-4).
   - Solo el dueño puede cambiarla: una tarjeta ajena responde 404. Cada cambio queda en la auditoría como `ALERTA_CONFIGURADA`.
   - Responde el detalle de la tarjeta, con `saldoBajo` ya recalculado (CA-3).
2. **Regla de 12 horas sin duplicados.** Antes de avisar, la API reserva el aviso con un `updateMany` condicional sobre `alerta.ultima_notificacion` (nula o con más de 12 horas). Si dos revisiones coinciden, solo una gana. Está probado con cuatro revisiones simultáneas.
3. **«Por debajo» es estricto:** con saldo igual al umbral no se avisa.
4. **Varias cuentas con la misma tarjeta.** El aviso del recaudo trae el número; la API calcula su HMAC (ADR 0009) y revisa las alertas de todas las cuentas que lo tengan, cada una con su propio nombre de tarjeta. En una misma revisión, cada número se consulta una sola vez en el recaudo.
5. **Texto del aviso** (pantalla 4.3), ajustado al saldo que queda:
   - Menos de un pasaje ($3.500): «no alcanza para un pasaje».
   - Menos de dos pasajes: «menos de un pasaje de ida y vuelta».
   - En otro caso: «menos de los $X que elegiste».

   Figma muestra «Te quedan $3.200, menos de un pasaje de ida y vuelta», pero $3.200 no alcanza ni para un pasaje, así que para ese caso se usa la primera frase.
6. **Dispositivos.**
   - `POST /dispositivos` con `{ token, plataforma: 'android' }`. iOS responde 400 (D7).
   - El token va en el cuerpo y no en la URL, para que nunca quede en los registros de peticiones. `DELETE /dispositivos` también lo recibe en el cuerpo.
   - Si el token ya estaba en otra cuenta, pasa a la cuenta actual (el teléfono cambió de usuario).
   - Si FCM responde que un token ya no existe, se borra.
7. **FCM** con `firebase-admin`, solo si existe el archivo de la cuenta de servicio (`FIREBASE_CREDENCIALES_JSON`, en `secrets/`, fuera del repositorio). Sin él, la API arranca igual y los avisos quedan solo en la bandeja. Las pruebas usan un FCM en memoria.
8. **Privacidad.** El aviso solo lleva el identificador de la tarjeta o de la recarga, nunca el número. Está verificado en las pruebas y en los registros de la prueba manual.

## Consecuencias
- La demostración de la alerta funciona sin Firebase: `POST /simulacion/viaje` sobre la tarjeta de mamá deja el aviso en la bandeja en menos de un segundo.
- **Pendiente:** crear el proyecto de Firebase, registrar la app Android y guardar la cuenta de servicio en `secrets/firebase.json` (paso 4 de la sección 13 del plan). Hasta entonces `envioPush` responde `false`.
- **Pendiente para T10:**
  - Pantalla 4.2: llamar a `PUT /tarjetas/:id/alerta` por cada tarjeta al tocar «Guardar cambios».
  - Registrar el token con `expo-notifications` (requiere *development build*) y quitarlo al cerrar sesión.
  - Mostrar la bandeja (campana de Inicio).
