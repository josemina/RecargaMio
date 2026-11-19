# ADR 0006 · Integración de pagos: API directa de Wompi

- **Estado:** aceptada
- **Fecha:** 2026-11-17
- **Decisión del plan:** D6

## Contexto
Se requiere una "pasarela con API" y medir el tiempo de recarga.

## Decisión
La API de RecargaMIO llama directamente a la API de Wompi en Sandbox. Primero Nequi y PSE; Bancolombia si alcanza el tiempo.

## Consecuencias
Las llaves solo viven en `.env` y deben tener prefijos de prueba. Los tiempos quedan en los registros y en la base.

## Alternativa descartada
Web Checkout de Wompi en un navegador dentro de la app.
