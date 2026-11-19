# CLAUDE.md · RecargaMIO

Prototipo académico (UNAD, Proyecto de grado) de una app móvil para recargar la tarjeta MIO de Cali con PSE, Nequi y Bancolombia en **modo de pruebas**. Nunca se mueve dinero real. El plan completo está en `docs/PLAN_IMPLEMENTACION_RecargaMIO.md`; léelo antes de cualquier tarea grande. El manual vive en `docs/manual/` y la bitácora en `docs/sprints/bitacora.md`.

## Idioma
- Todo el texto visible para el usuario, los mensajes de error, los comentarios y la documentación van en **español de Colombia**.
- Nombres de variables, funciones y archivos: español sin tildes (`tarjeta`, `recarga`, `medioPago`). Excepciones: términos técnicos estándar (`token`, `webhook`, `checksum`).
- Mensajes de commit: Conventional Commits con la historia de usuario, por ejemplo `feat(HU-01): crear recarga pendiente`.

## Estructura
- `apps/mobile` · Expo + React Native + TypeScript, rutas con `expo-router`.
- `services/api` · Node.js + Express + TypeScript + Prisma (PostgreSQL).
- `services/recaudo-sim` · simulador del sistema de recaudo del MIO.
- `tests/` · Postman, JMeter, seguridad. `docs/` · decisiones, sprints y métricas.

## Comandos
- Levantar todo: `docker compose up -d` · Ver registros: `docker compose logs -f api`
- Migrar y sembrar: `docker compose run --rm api npx prisma migrate deploy && docker compose run --rm api npm run seed`
- Pruebas del backend: `docker compose run --rm api npm test`
- Pruebas del simulador: `docker compose run --rm recaudo-sim npm test`
- Pruebas de API, carga y seguridad: `docker compose --profile pruebas run --rm newman|jmeter|zap`
- Túnel para webhooks: `docker compose --profile webhooks up tunel` (copiar la URL que imprime al panel de Wompi)
- App móvil (en el equipo anfitrión, fuera de Docker): `cd apps/mobile && npx expo start`
- Lint y tipos: `npm run lint && npm run typecheck` desde la raíz

## Reglas que no se negocian
1. **Secretos:** nunca escribas llaves reales en el código ni en el repositorio. Todo sale de `.env`. Solo se aceptan credenciales de Wompi con prefijo `pub_test_`, `prv_test_`, `test_events_`, `test_integrity_`; si ves otra, detente y avisa.
2. **Datos bancarios:** la app y la API nunca guardan números de cuenta ni de tarjetas bancarias. Solo el celular de Nequi o los datos que Wompi exige para PSE, y solo en tránsito.
3. **Saldo:** solo se acredita cuando Wompi confirma `APPROVED` (por webhook verificado o por reconciliación) y siempre de forma idempotente por `referencia`.
4. **Webhook:** verifica el checksum (SHA256 de las propiedades de `signature.properties` + `timestamp` + secreto de eventos) antes de leer el cuerpo. Si falla, responde 401.
5. **Validación:** toda entrada pasa por un esquema `zod`. Nada de SQL concatenado.
6. **Autorización de datos (Ley 1581 de 2012):** no se crea un usuario sin `aceptaPolitica: true` y sin registrar la versión de la política.
7. **Accesibilidad (WCAG 2.1 AA):** todo elemento táctil tiene `accessibilityRole`, `accessibilityLabel` y mínimo 44×44 px; el texto respeta el tamaño de fuente del sistema.
8. **Pruebas:** cada historia se entrega con pruebas que cubren sus criterios de aceptación. No marques una tarea como terminada si las pruebas no pasan.

## Diseño
- Fuente de verdad visual: archivo de Figma `yKHSYSKwagdMvEKL5tA1Xn`. Página **02 · Sistema de diseño** (tokens y componentes) y página **03 · Prototipo alta fidelidad** (19 pantallas numeradas 1.1 a 5.3).
- Antes de construir una pantalla, léela con el MCP de Figma y usa los componentes de `apps/mobile/src/components`. No inventes colores ni tamaños: usa `apps/mobile/src/theme/tokens.ts`.
- Cada pantalla de la app lleva en un comentario el número de la pantalla de Figma que implementa.

## Reglas de negocio
- Máximo **5 tarjetas** activas por cuenta (error `LIMITE_TARJETAS`).
- Montos de recarga: $5.000, $10.000, $20.000, $50.000 (o libre entre $3.500 y $100.000 si se habilita).
- Bloqueo de ingreso: 5 intentos fallidos → 15 minutos.
- Pasaje: $3.500. Alerta de saldo bajo: umbral entre $3.500 y $50.000, máximo un aviso cada 12 horas por tarjeta.
- Métrica clave: tiempo de recarga = `acreditadaEn − iniciadaEn`, meta ≤ 180 s.

## Forma de trabajo
- Empieza cada tarea proponiendo un plan corto y espera aprobación.
- Cambios pequeños y verificables; corre las pruebas y el lint antes de proponer el commit.
- Si una decisión no está en el plan (sección 0, decisiones D1 a D8), pregunta en lugar de suponer, y regístrala en `docs/adr/`.
- **Ninguna tarea se da por terminada sin actualizar el manual y la bitácora:** los capítulos de `docs/manual/` que cambien, una entrada en `docs/sprints/bitacora.md` (qué se hizo, decisiones, pruebas y problemas) y, si hay evidencia nueva, `npm run manual:capturas`. Al final, `npm run manual` regenera el Word y el PDF.
- En el manual, cada tabla lleva antes un comentario `<!-- tabla: Título -->` y cada imagen un texto alternativo que sirve de título de figura (APA 7).
