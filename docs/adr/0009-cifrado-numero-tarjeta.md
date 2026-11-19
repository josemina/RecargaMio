# ADR 0009 · Número de la tarjeta MIO cifrado y con HMAC

- **Estado:** aceptada
- **Fecha:** 2026-11-17
- **Decisión del plan:** no estaba en D1–D8. La aprobó el equipo al planear T1.

## Contexto
El plan dice que el número de la tarjeta "se cifra en reposo o se guarda con hash + últimos 4". Guardar solo un hash no sirve: la API necesita el número completo para consultar el saldo y acreditar en el recaudo. Guardarlo en texto plano debilita MASVS-STORAGE y la revisión de privacidad (Ley 1581).

## Decisión
La tabla `tarjeta` guarda tres campos en lugar del número:

| Campo | Contenido | Para qué |
|---|---|---|
| `numero_cifrado` | AES-256-GCM: `v1:<iv>:<tag>:<cifrado>` en base64url, con IV aleatorio de 12 bytes | Descifrarlo al hablar con el recaudo |
| `numero_hmac` | HMAC-SHA256 del número normalizado | Evitar registrar la misma tarjeta dos veces (`@@unique([usuarioId, numeroHmac])`) |
| `ultimos_4` | Últimos cuatro dígitos | Mostrar `•••• 4821` |

Las dos llaves son de 32 bytes, se escriben en hexadecimal en `.env` (`TARJETA_LLAVE_CIFRADO` y `TARJETA_LLAVE_HMAC`) y son distintas entre sí. El prefijo `v1` permite rotar la llave más adelante.

## Consecuencias
- Si se pierde `TARJETA_LLAVE_CIFRADO`, las tarjetas registradas no se pueden descifrar y hay que volver a registrarlas.
- `recarga.numero_destino` se guarda sin cifrar porque es evidencia de la transacción y en el PMV también puede ser una tarjeta de un tercero. Se revisa en T7 (privacidad).
- Las tarjetas MIO no son datos bancarios, así que la regla 2 de `CLAUDE.md` no aplica, pero se protegen igual.

## Alternativa descartada
Guardar el número en texto plano.
