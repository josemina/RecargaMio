# ADR 0011 · Autenticación, sesiones y recuperación de contraseña

- **Estado:** aceptada
- **Fecha:** 2026-11-17
- **Historia:** HU-06 (Sprint 1). Criterios de aceptación tomados de la Tabla 13 del documento maestro.
- **Decisión del plan:** amplía la sección 4 del plan («acceso 15 min, renovación 7 días, rotación»). El equipo aprobó las decisiones nuevas al planear T3.

## Contexto
HU-06 exige registro con aceptación expresa de la política de datos, sesión que se cierra cuando el token expira, bloqueo tras cinco intentos fallidos y recuperación de la contraseña por correo. El plan no definía cómo guardar los tokens de renovación, adónde lleva el enlace del correo ni qué hacer con el contador de intentos de la pantalla 1.2 de Figma.

## Decisiones

1. **Token de acceso:** JWT HS256 de 15 minutos, con el id del usuario (`sub`) y el de la sesión (`sid`). En cada petición, la API también verifica que la sesión siga abierta. Así, cerrar sesión o restablecer la contraseña invalida de inmediato los tokens ya emitidos.
2. **Token de renovación:** 32 bytes aleatorios, no JWT. Dura 7 días. En la tabla `sesion` solo se guarda su HMAC-SHA256 con `JWT_SECRETO_RENOVACION`. **Rotación:** cada renovación revoca el token usado. **Detección de reúso:** si llega un token ya revocado, se cierran todas las sesiones del usuario y se registra `REUSO_TOKEN_RENOVACION` en la auditoría.
3. **Bloqueo:** el quinto intento fallido bloquea el ingreso 15 minutos (423 `CUENTA_BLOQUEADA`). Durante el bloqueo no se verifica la contraseña. Un ingreso exitoso reinicia el contador.
4. **Contador de intentos visible (pantalla 1.2).** El equipo decidió mostrarlo como en Figma (`intentosRestantes`), aceptando que revela si un correo está registrado. El riesgo se mitiga así:
   - Límite de 10 ingresos cada 15 minutos por IP.
   - Para un correo inexistente, se verifica la contraseña contra un hash ficticio, así la respuesta tarda lo mismo.
   - Para un correo inexistente se responde el mismo 401, sin el contador.
5. **Enlace de recuperación:** el correo lleva a una **página web sencilla servida por la API** (`GET /restablecer?token=…`), con un formulario sin JavaScript compatible con la política CSP de `helmet`. Funciona desde cualquier cliente de correo, incluido Mailpit, sin la app instalada. El token es de un solo uso y vence a los 30 minutos. En la tabla nueva `token_recuperacion` solo se guarda su HMAC. Pedir un enlace nuevo invalida los anteriores. Restablecer la contraseña quita el bloqueo y cierra todas las sesiones.
6. **Respuesta de `/auth/recuperar`:** siempre es la misma, exista o no el correo. El envío no se espera, para que el tiempo de respuesta no lo delate.
7. **Contraseña:** mínimo 8 caracteres (HU-06 CA-1), con al menos una letra y un número (texto de ayuda de Figma 1.3). Se guarda con hash argon2id.
8. **Política de datos:** `aceptaPolitica` debe ser exactamente `true`. Si no, se responde 400 `POLITICA_NO_ACEPTADA`. Se registra la versión **1.0** (la que muestra Figma 5.2), la fecha y la IP.
9. **Límite de peticiones** por IP:

   | Ruta | Límite |
   |---|---|
   | Ingreso y renovación | 10 cada 15 minutos |
   | Registro | 10 por hora |
   | Recuperación | 5 cada 15 minutos |
   | General | 300 cada 15 minutos |
10. **Registros:** se ocultan el encabezado `Authorization` y el token de la URL de `/restablecer`. La auditoría nunca guarda contraseñas ni tokens.

## Consecuencias
- Cada petición autenticada hace una consulta a la tabla `sesion`. Es un costo pequeño a cambio de poder cerrar sesiones de inmediato.
- **Pendiente para T8 (JMeter):** los límites por IP frenarían una prueba de carga desde una sola máquina. Habrá que desactivarlos o subirlos en el perfil de pruebas de carga.
- **Pendiente para T10:** si se quiere abrir el enlace del correo desde el teléfono, `API_URL_PUBLICA` debe apuntar a la IP del equipo en la red local.

## Alternativas descartadas
- Token de renovación como JWT: no permite revocarlo sin guardar una lista.
- Enlace profundo a la app (`recargamio://`): exige una pantalla nueva que no está en Figma y no funciona sin la app instalada.
- Mensaje genérico sin contador: más seguro, pero contradice el diseño aprobado de la pantalla 1.2.
