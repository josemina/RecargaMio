# ADR 0010 · Reglas del recaudo simulado

- **Estado:** aceptada
- **Fecha:** 2026-11-17
- **Decisión del plan:** no estaba en D1–D8. La aprobó el equipo al planear T2.

## Contexto
La sección 8 del plan define los endpoints de `recaudo-sim`, pero deja abiertos tres puntos: qué pasa con un viaje cuando el saldo no alcanza, cómo se migra la base del simulador y dónde corren sus pruebas.

## Decisiones

1. **Saldo negativo permitido.** `POST /simulacion/viaje` siempre descuenta $3.500, aunque el saldo quede negativo. El equipo descartó responder `SALDO_INSUFICIENTE`. Así la demostración de alertas y de recarga funciona con cualquier saldo.
2. **Migración automática al arrancar.** En desarrollo, el contenedor `recaudo-sim` corre `prisma migrate deploy` y su seed antes de iniciar (`npm run iniciar:dev`). El seed no borra datos. La API sigue migrando a mano, como indica `CLAUDE.md`.
3. **Base de pruebas aislada.** Las pruebas usan `recaudo_pruebas` (`DATABASE_URL_PRUEBAS`). La crea `infra/db/init/02-crear-bases-pruebas.sql` o, si el volumen ya existía, `prisma migrate deploy` en la configuración global de Jest. Por seguridad, las pruebas se niegan a correr en una base cuyo nombre no termine en `_pruebas`.

## Otras reglas del simulador
- **Idempotencia:** `credito.referencia` es única. Si la misma referencia llega con los mismos datos, se responde 200 con el resultado original y `duplicado: true`. Si llega con otro monto u otra tarjeta, se responde 409 `REFERENCIA_EN_CONFLICTO`. Dos peticiones simultáneas se resuelven con la restricción única: la segunda transacción falla y su suma se revierte.
- **Fallas simuladas:** `POST /simulacion/latencia` agrega demora o fallas (503 `FALLA_SIMULADA`) solo a los créditos, y siempre **antes** de tocar el saldo, así que reintentar es seguro.
- **Reinicio:** `POST /simulacion/reiniciar` borra los créditos y los viajes y devuelve los saldos semilla. Es solo para preparar demostraciones. Después de usarlo, una referencia antigua se volvería a acreditar.
- **Cliente de Prisma:** se genera en `services/recaudo-sim/generated/prisma` para no chocar con el de la API dentro del monorepo.
