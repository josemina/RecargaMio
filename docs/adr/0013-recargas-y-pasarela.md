# ADR 0013 · Recargas, pasarela de pagos y confirmación del pago

- **Estado:** aceptada (T5a). El Sandbox real de Wompi se valida en T5b.
- **Fecha:** 2026-11-17
- **Historias:** HU-01 (recarga), HU-02 (PSE, Nequi o Bancolombia) y HU-04 (terceros). Criterios de la Tabla 13 del documento maestro.
- **Decisiones del plan relacionadas:** D6 (API directa de Wompi) y D8 (webhook y reconciliación). El equipo aprobó las decisiones 1 a 3 al planear T5.

## Contexto
El equipo todavía no tiene las llaves del Sandbox de Wompi. El plan prevé ese riesgo (sección 14) con «un simulador de pasarela con el mismo contrato». Antes de programar se verificó el contrato en la documentación oficial de Wompi:

- [Tokens de aceptación](https://docs.wompi.co/docs/colombia/tokens-de-aceptacion/)
- [Transacciones](https://docs.wompi.co/docs/colombia/transacciones/)
- [Métodos de pago](https://docs.wompi.co/docs/colombia/metodos-de-pago/)
- [Eventos](https://docs.wompi.co/docs/colombia/eventos/)
- [Datos de prueba en Sandbox](https://docs.wompi.co/docs/colombia/datos-de-prueba-en-sandbox/)
- [Ambientes y llaves](https://docs.wompi.co/docs/colombia/ambientes-y-llaves/)

## Decisiones aprobadas por el equipo
1. **T5 se divide en dos partes.**
   - **T5a:** todo el flujo con una **pasarela simulada** que cumple el mismo contrato (`PASARELA=simulada`, el valor por defecto).
   - **T5b:** al tener las llaves, `PASARELA=wompi` y la prueba contra el Sandbox real, con y sin túnel.
2. **Bancolombia se incluye ya**, porque HU-02 CA-1 exige que los tres medios aparezcan como opciones.
3. **Referencia doble.**
   - La app muestra `RM-000123`, que sale de la secuencia de PostgreSQL `recarga_referencia_seq`.
   - A la pasarela se envía `RM-000123-K7Q2`, con un sufijo aleatorio de 4 caracteres. Así Wompi no rechaza una referencia repetida si se reinicia la base local.
   - La acreditación en el recaudo sigue siendo idempotente por `RM-000123`.

## Decisiones técnicas
4. **Contrato común `Pasarela`**, con cuatro operaciones: términos, bancos de PSE, crear transacción y consultar transacción. Lo cumplen dos implementaciones:
   - **Simulada.** Usa los datos de prueba de Wompi:

     | Medio | Aprueba | Rechaza | Cualquier otro dato |
     |---|---|---|---|
     | Nequi | `3991111111` | `3992222222` | `ERROR` |
     | PSE | Banco `1` | Banco `2` | `ERROR` |
     | Bancolombia | Siempre aprueba | — | — |

     Pasados `PASARELA_SIMULADA_DEMORA_MS` (4 s por defecto), **envía el evento firmado al webhook**, igual que Wompi.
   - **Wompi.** Tiene cinco partes:
     - **Tokens de aceptación:** se piden con `GET /merchants/info` y el encabezado `x-merchant-public-key`. El endpoint anterior dejó de estar disponible el 31-10-2026.
     - **Creación de la transacción:** `POST /transactions` con la llave privada. Lleva `acceptance_token`, `accept_personal_auth`, la firma de integridad y `customer_email`. En PSE también `customer_data`.
     - **URL del banco:** en PSE y Bancolombia, `async_payment_url` llega unos segundos después, así que se consulta hasta 5 veces.
     - **Consulta de transacciones:** con la llave privada.
     - **Bancos de PSE:** quedan en caché por 1 hora.
5. **Términos de la pasarela.** Wompi exige que el usuario acepte expresamente sus términos y su autorización de datos personales. La API expone los enlaces en `GET /pasarela/terminos` y exige `aceptaTerminosPasarela: true`; si falta, responde 400 `TERMINOS_PASARELA_NO_ACEPTADOS`. **Figma no tiene esta casilla: hay que agregarla en la pantalla 3.1 (T10).**
6. **Webhook (regla 4).**
   - **Firma:** el checksum se verifica antes de usar el evento: SHA256 de los valores de `signature.properties` + `timestamp` + secreto de eventos. Se compara en tiempo constante y sin distinguir mayúsculas.
   - **Cuerpo:** la ruta se monta antes de `express.json`, para recibir el cuerpo tal como llegó.
   - **Respuestas:** si la firma falla, responde 401 y queda `WEBHOOK_RECHAZADO` en la auditoría. Los eventos válidos responden 200, como pide Wompi.
   - **Filtro:** solo se procesan eventos `transaction.updated` del entorno `test`.
7. **Estados.**
   - Flujo normal: `PENDIENTE` → `APROBADA` → `ACREDITADA`.
   - Finales negativos: `RECHAZADA` (DECLINED) y `ERROR` (ERROR o VOIDED).
   - Si el recaudo falla después del pago, la recarga queda en `FALLA_ACREDITACION` y se reintenta.
   - Todas las transiciones son condicionales (`updateMany` con el estado esperado), así que el webhook y la reconciliación pueden coincidir sin problema.
8. **Regla 3:** se acredita solo con `APPROVED`, y solo si `amount_in_cents` coincide con el monto de la recarga. Si no coincide, la recarga pasa a `ERROR` y queda `MONTO_NO_COINCIDE` en la auditoría.
9. **Idempotencia:**
   - `transaccion_pasarela` tiene la restricción única `id_externo + estado`, que descarta los eventos repetidos.
   - El recaudo acredita una sola vez por referencia.
   - Una recarga idéntica pendiente en los últimos 60 s responde 409 `RECARGA_EN_CURSO` (doble clic).
10. **Reconciliación cada 30 s (D8):** consulta las recargas `PENDIENTE` de más de 20 s y reintenta las acreditaciones fallidas. `GET /recargas/:id?actualizar=1` hace lo mismo para una recarga, y corresponde al botón «Actualizar estado» de la pantalla 3.3.
11. **Regla 2:** el celular de Nequi, el documento y el celular de PSE solo viajan hacia la pasarela. Nunca se guardan en `recarga`, `auditoria` ni `transaccion_pasarela`: del evento se guarda una versión saneada, sin `payment_method`. Tampoco se escriben en los registros. Está verificado con pruebas y con consultas a la base.
12. **Métrica:** cada recarga guarda `iniciada_en` y `acreditada_en`. La API devuelve `tiempoSegundos`. Prueba manual con la pasarela simulada: 4 s, frente a una meta de 180 s o menos.

## Hallazgos de la documentación
- **Vector del checksum de eventos.** El ejemplo de la página de Eventos no coincide: la entrada publicada no produce el hash publicado. La firma de integridad sí coincide con su ejemplo (prueba automatizada). Se usó el algoritmo documentado con vectores propios. **Pendiente para T5b:** confirmarlo con un evento real del Sandbox.
- **Formato de los bancos de PSE.** La documentación leída no muestra la respuesta de `GET /pse/financial_institutions`. Se asumió `financial_institution_code` y `financial_institution_name` y se valida con `zod`. **Pendiente para T5b:** confirmarlo.
- **Bancolombia en el Sandbox.** La documentación indica que el resultado se elige en una página del Sandbox. **Pendiente para T5b.**

## Consecuencias
- Para la demostración sin Internet o sin llaves, la pasarela simulada reproduce el flujo completo, webhook incluido.
- **Pendiente para T10:** la pantalla 3.1 debe mostrar la casilla de términos de la pasarela con los enlaces de `GET /pasarela/terminos`, y abrir `urlPago` con `expo-web-browser`.
