# ADR 0001 · Marco de React Native: Expo con TypeScript

- **Estado:** aceptada
- **Fecha:** 2026-11-17
- **Decisión del plan:** D1

## Contexto
La app móvil debe ser React Native (Tabla 4) y compilar para Android e iOS sin un Mac.

## Decisión
Usar **Expo** (flujo administrado) con TypeScript y `expo-router`.

## Consecuencias
Trae navegación, almacenamiento seguro y notificaciones. Las notificaciones push exigen una *development build* (no funcionan en Expo Go).

## Alternativa descartada
React Native CLI (más configuración nativa).
