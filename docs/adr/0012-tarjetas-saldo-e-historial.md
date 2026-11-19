# ADR 0012 · Tarjetas, saldo e historial

- **Estado:** aceptada
- **Fecha:** 2026-11-17
- **Historias:** HU-07 (hasta cinco tarjetas) y HU-03 (saldo e historial). Criterios de la Tabla 13 del documento maestro.
- **Decisión del plan:** amplía la sección 6 del plan. El equipo aprobó las decisiones 1 a 3 al planear T4.

## Decisiones aprobadas por el equipo

1. **Eliminar una tarjeta es un borrado lógico.** La fila queda con `activa = false`: deja de verse y de contar para el límite de cinco, pero sus recargas siguen enlazadas como evidencia para las métricas (tiempo de recarga y tasa de éxito). Si el usuario vuelve a agregar el mismo número, la misma fila se reactiva con el nombre nuevo.
2. **No se crea una alerta de saldo bajo automática.** La etiqueta «Saldo bajo» aparece solo si el usuario configuró la alerta (HU-05 CA-1, «Puedo fijar un valor de alerta»). Las dos tarjetas del seed sí la traen, para que coincidan con Figma (pantalla 2.1).
3. **Respuesta degradada si el recaudo no responde.** `GET /tarjetas` lista las tarjetas con `saldo: null`, `recaudoDisponible: false` y un aviso. El historial muestra las recargas y avisa que los viajes no están disponibles. Agregar una tarjeta sí falla con 503 `RECAUDO_NO_DISPONIBLE`, porque no se puede validar sin el recaudo.

## Decisiones técnicas

4. **Orden de validación al agregar una tarjeta:**
   1. Datos (`zod`).
   2. Límite de cinco: 409 `LIMITE_TARJETAS`.
   3. Que no esté repetida: 409 `TARJETA_YA_REGISTRADA`.
   4. Existencia y estado en el recaudo: 422 `TARJETA_NO_EXISTE` o `TARJETA_INACTIVA`.

   Los pasos 2 y 3 se repiten dentro de una transacción con `pg_advisory_xact_lock` por usuario. Así, dos peticiones simultáneas no superan el límite (está probado).
5. **La tarjeta de otro usuario responde 404**, no 403, para no revelar que existe.
6. **Varios usuarios pueden registrar el mismo número** (por ejemplo, dos hijos que recargan la tarjeta de su mamá). La unicidad es por usuario (`usuario_id + numero_hmac`).
7. **Historial:**
   - Une las recargas en estado `ACREDITADA` de la base de RecargaMIO (las rechazadas no cambiaron el saldo) con los viajes que entrega el recaudo, del más reciente al más antiguo.
   - Se pagina con `limite` y el cursor `antesDe` (fecha del último movimiento recibido). Para eso, `recaudo-sim` ganó el filtro `hasta`, exclusivo.
   - **Limitación conocida:** si dos movimientos tienen exactamente la misma fecha al milisegundo y quedan en el borde de una página, uno podría omitirse. Es improbable con datos reales y aceptable para el prototipo.
8. **Las respuestas del recaudo se validan con `zod`**, igual que cualquier entrada (regla 5), y tienen un tiempo máximo de 3 segundos.
9. **El número completo nunca sale de la API:** se descifra solo para hablar con el recaudo. Las respuestas y los registros muestran únicamente los últimos 4 dígitos.

## Consecuencias
- Cada apertura del inicio hace una consulta al recaudo por tarjeta (máximo 5, en paralelo).
- **Pendiente para T5:** la recarga a terceros con «Guardar esta tarjeta» (HU-04 CA-2) reutilizará `agregar`, con las mismas reglas.
