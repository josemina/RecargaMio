# ADR 0008 · Confirmación del pago: webhook y reconciliación

- **Estado:** aceptada
- **Fecha:** 2026-11-17
- **Decisión del plan:** D8

## Contexto
El túnel del webhook puede fallar en desarrollo.

## Decisión
Confirmar los pagos por el webhook de Wompi (con el checksum verificado) **y** con una consulta periódica cada 30 s a las recargas pendientes.

## Consecuencias
El saldo se acredita aunque el túnel falle, siempre de forma idempotente por `referencia`.

## Alternativa descartada
Solo webhook.
