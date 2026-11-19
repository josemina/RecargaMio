# ADR 0002 · Lenguaje del backend: TypeScript

- **Estado:** aceptada
- **Fecha:** 2026-11-17
- **Decisión del plan:** D2

## Contexto
El backend corre en Node.js + Express y lo escribe un equipo de tres con apoyo de IA.

## Decisión
Escribir `services/api` y `services/recaudo-sim` en **TypeScript** en modo estricto.

## Consecuencias
Se detectan menos errores en tiempo de ejecución. Se fija TypeScript 5.9 porque ts-jest y typescript-eslint todavía no son compatibles con TypeScript 7.

## Alternativa descartada
JavaScript puro.
