# ADR 0003 · Acceso a datos con Prisma

- **Estado:** aceptada
- **Fecha:** 2026-11-17
- **Decisión del plan:** D3

## Contexto
Se necesitan migraciones versionadas y acceso a PostgreSQL sin SQL concatenado (regla 5).

## Decisión
Usar **Prisma 6** con migraciones.

## Consecuencias
El esquema es legible, los tipos se generan solos y las consultas van parametrizadas. Se fija la versión 6 porque Prisma 7 cambia la forma de configurar el proyecto.

## Alternativa descartada
`pg` + `node-pg-migrate`.
