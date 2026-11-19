# ADR 0007 · Notificaciones con FCM solo en Android

- **Estado:** aceptada
- **Fecha:** 2026-11-17
- **Decisión del plan:** D7

## Contexto
iOS exige cuenta de Apple Developer y certificados APNs.

## Decisión
Enviar notificaciones con FCM a **Android** usando `firebase-admin`. iOS queda fuera del PMV.

## Consecuencias
Si FCM no está configurado, la alerta se registra y se muestra dentro de la app.

## Alternativa descartada
Servicio de notificaciones de Expo.
