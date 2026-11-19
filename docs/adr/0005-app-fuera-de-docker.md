# ADR 0005 · La app móvil corre fuera de Docker

- **Estado:** aceptada
- **Fecha:** 2026-11-17
- **Decisión del plan:** D5

## Contexto
Los emuladores de Android e iOS no funcionan bien dentro de contenedores.

## Decisión
La app se ejecuta en el equipo anfitrión con Expo y un teléfono o emulador. Docker solo se usa para la app en lint y pruebas.

## Consecuencias
El teléfono y el computador deben estar en la misma red Wi-Fi; `EXPO_PUBLIC_API_URL` apunta a la IP local del equipo.

## Alternativa descartada
—
