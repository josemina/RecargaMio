# RecargaMIO

Prototipo académico (UNAD, Ingeniería de Sistemas, proyecto de grado) de una app móvil para recargar la tarjeta MIO de Cali con PSE, Nequi y Bancolombia en **modo de pruebas**. Nunca se mueve dinero real.

## Documentación

| Documento | Contenido |
|---|---|
| [Manual de instalación y operación](docs/manual/01-instalacion-y-operacion.md) | Requisitos, instalación paso a paso, variables de entorno, operación, pruebas y solución de problemas |
| [Arquitectura técnica](docs/manual/02-arquitectura.md) | Componentes, bases de datos, endpoints y controles de seguridad |
| [Manual de usuario](docs/manual/03-manual-de-usuario.md) | Cómo usar la app, pantalla por pantalla |
| [Bitácora de tareas](docs/sprints/bitacora.md) | Qué se hizo en cada tarea, decisiones, pruebas y problemas |
| [Decisiones de arquitectura (ADR)](docs/adr/README.md) | Por qué se tomó cada decisión técnica |
| [Plan de implementación](docs/PLAN_IMPLEMENTACION_RecargaMIO.md) | Alcance, tareas y calendario |
| `docs/manual/entregables/` | El manual completo en **Word** y **PDF** (formato APA 7) |

## Inicio rápido

Requisitos: Docker Desktop y Node.js 22. Los detalles están en el [manual de instalación](docs/manual/01-instalacion-y-operacion.md).

```bash
cp .env.example .env          # y cambiar los valores
docker compose up -d --wait
docker compose run --rm api npm run migrar
docker compose run --rm api npm run seed
curl localhost:3000/health
```

| Servicio | URL |
|---|---|
| API | http://localhost:3000 |
| Recaudo simulado | http://localhost:4000 |
| Correo de pruebas (Mailpit) | http://localhost:8025 |
| Adminer (perfil `herramientas`) | http://localhost:8080 |

## Comandos útiles

| Tarea | Comando |
|---|---|
| Pruebas de la API | `docker compose run --rm api npm test` |
| Pruebas del recaudo simulado | `docker compose run --rm recaudo-sim npm test` |
| Lint y tipos (desde la raíz) | `npm install && npm run lint && npm run typecheck` |
| Generar el manual en Word y PDF | `npm run manual` |
| Volver a tomar las capturas del manual | `npm run manual:capturas` (con los servicios levantados) |
| Apagar todo | `docker compose down` |

## Estructura

```text
apps/mobile            App Expo + React Native (desde T9)
services/api           API REST (Express + TypeScript + Prisma)
services/recaudo-sim   Simulador del sistema de recaudo del MIO
infra/db/init          Scripts de arranque de PostgreSQL
tests/                 Postman, JMeter y seguridad
docs/manual            Manual (Markdown, imágenes, generador y entregables)
docs/sprints           Bitácora de tareas
docs/adr               Decisiones de arquitectura
```
