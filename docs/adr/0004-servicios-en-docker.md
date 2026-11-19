# ADR 0004 · Qué corre en Docker

- **Estado:** aceptada
- **Fecha:** 2026-11-17
- **Decisión del plan:** D4

## Contexto
El equipo necesita levantar el entorno completo con un solo comando.

## Decisión
Corren en Docker: `db`, `api`, `recaudo-sim`, `mailpit`, el túnel de webhooks, Adminer y las herramientas de prueba (Newman, JMeter, ZAP), estas últimas por perfiles.

## Consecuencias
`docker compose up -d` levanta todo. Las imágenes se construyen con el contexto en la raíz para reutilizar el `package-lock.json` de los workspaces de npm.

## Alternativa descartada
—
