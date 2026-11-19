# ADR 0015 · Perfil, rectificación de datos y eliminación de la cuenta

- **Estado:** aceptada (T7, alcance del PMV)
- **Fecha:** 2026-11-17
- **Requerimientos:** RNF-04 (Privacidad: autorización previa, recolección mínima y opción de eliminar la cuenta, Ley 1581 de 2012). Pantallas 5.1 y 5.2 de Figma.
- **Plan relacionado:** sección 1 («Perfil y eliminar cuenta sí; exportar y PQR después») y endpoint `DELETE /me` («borrado lógico + anonimización»).

## Contexto
T7 no tiene historia de usuario en la Tabla 13. Sus criterios se tomaron de RNF-04 y de la pantalla 5.2, que ofrece:
- «Actualizar o rectificar mis datos».
- «Eliminar mi cuenta», con el texto «Se borrarán tus tarjetas, alertas e historial».

## Decisiones aprobadas por el equipo
- **A. Alcance: solo el PMV.**
  - Se construyen `PATCH /me` (rectificar) y `DELETE /me` (eliminar).
  - Quedan **fuera del PMV**:
    - «Descargar mis datos» (`GET /me/datos`).
    - La página de la política de tratamiento de datos (`GET /politica`).
    - Las PQR (`POST /pqr`).
  - Hasta que se construyan, la app debe mostrar esas opciones como «Próximamente» o esconderlas en la pantalla 5.2 y en la 5.3.
- **B. Las recargas se conservan anonimizadas.** Se aplicó la opción recomendada, porque el equipo no la objetó.
- **C. El correo se puede cambiar con la contraseña actual.** También se aplicó la opción recomendada.

## Decisiones técnicas
1. **Rectificar (`PATCH /me`).**
   - El nombre cambia sin más requisitos.
   - El correo exige `contrasenaActual`. Si la contraseña es incorrecta responde 403 `CONTRASENA_INCORRECTA`; si el correo ya está en uso, 409 `CORREO_REGISTRADO`.
   - Al cambiar el correo se envía un aviso al **correo anterior**, para que el titular se entere si no fue él.
   - Cada cambio queda en la auditoría como `PERFIL_ACTUALIZADO`, con los nombres de los campos y no con sus valores.
2. **Eliminar (`DELETE /me`)** se confirma con la contraseña, que viaja en el cuerpo. Todo ocurre en una sola transacción:

   <!-- tabla: Qué pasa con cada dato al eliminar la cuenta -->
   | Dato | Qué pasa | Por qué |
   |---|---|---|
   | Tarjetas (número cifrado y HMAC) y alertas | Se borran | Pantalla 5.2. El número es dato del titular |
   | Notificaciones, dispositivos y enlaces de recuperación | Se borran | No tienen otro uso |
   | Sesiones | Se revocan todas | Los tokens emitidos dejan de servir de inmediato |
   | Nombre y correo | Se reemplazan por «Cuenta eliminada» y `eliminada-<id>@recargamio.invalid`. La contraseña se reemplaza por un hash inservible | El correo queda libre para un registro nuevo. `.invalid` es un dominio reservado (RFC 2606) |
   | Recargas | Se conservan, con el número de destino reducido a `••••4821` y sin tarjeta asociada | Conciliación con la pasarela, métricas y reclamos de la Ley 1480 |
   | Autorización de datos y auditoría | Se conservan | Prueba de la autorización (Ley 1581, art. 9) y trazabilidad (RF-12) |

3. **Dinero en camino.** Antes de eliminar se revisan las recargas de la cuenta:
   - Si hay una recarga `APROBADA` o en `FALLA_ACREDITACION`, responde 409 `RECARGA_EN_CURSO`, sin importar su antigüedad.
   - Lo mismo si hay una `PENDIENTE` de las últimas 24 horas.
   - Una pendiente más antigua se considera abandonada y se cierra como `ERROR`, para que la reconciliación no intente acreditarla con un número enmascarado.
4. **Correo de confirmación** a la dirección anterior. Explica qué se borró y qué se conservó.
5. **El HTML de los avisos se escapa**, porque el nombre lo escribe el usuario.
6. **El intento de eliminar con una contraseña incorrecta no suma al bloqueo de ingreso.** Ya existe el límite general de peticiones por IP, y la petición exige una sesión válida.

## Consecuencias
- El historial desaparece para el usuario, como dice la pantalla 5.2, pero las recargas quedan en la base sin datos que identifiquen a la persona.
- Si la misma persona se registra de nuevo con el mismo correo, obtiene una cuenta vacía y debe aceptar otra vez la política.
- **Pendiente para T10:**
  - Confirmación en dos pasos en la app: un diálogo y luego la contraseña.
  - Formulario de «Actualizar o rectificar mis datos».
  - Ocultar o marcar como «Próximamente» las opciones que quedaron fuera del PMV.
- **Fuera del PMV:** `GET /me/datos`, `GET /politica` y `/pqr`, que se pueden retomar si sobra tiempo.
