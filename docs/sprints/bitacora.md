# Bitácora de tareas

Registro de cada tarea del plan de implementación: qué se construyó, qué se decidió, cómo se probó y qué problemas aparecieron. Sirve como evidencia para la tabla de sprints (Tabla 17) del documento maestro y para el video de la Fase 4.

## Equivalencia con el documento maestro

Las tareas del plan de implementación (T0 a T12) corresponden a los elementos del Product Backlog (Tabla 14) y a los sprints (Tabla 17) del documento maestro así:

<!-- tabla: Equivalencia entre tareas, backlog y sprints -->
| Tarea del plan | Elemento del backlog (Tabla 14) | Sprint (Tabla 17) | Puntos | Estado |
|---|---|---|---|---|
| T0 · Esqueleto y Docker | HT-01. Repositorio, estructura del proyecto e integración continua | Sprint 1 | 3 | Parcial: falta el repositorio en GitHub y la integración continua |
| T1 · Base de datos | Parte del diseño (modelo de datos, Figura 5) | Sprint de diseño | — | Terminada |
| T2 · Recaudo simulado | HT-02. Servicio simulado del sistema de recaudo | Sprint 2 | 5 | Terminada (adelantada) |
| T3 · Autenticación | HU-06. Autenticación y cuenta segura | Sprint 1 | 5 | Terminada |
| T4 · Tarjetas | HU-07 (Sprint 4) y HU-03 (Sprint 3) | Sprints 3 y 4 | 5 + 5 | Terminada (adelantada) |
| T5a · Recargas (pasarela simulada) | HU-01, HU-02 y HU-04 | Sprints 2 y 4 | 8 + 8 + 5 | Terminada con pasarela simulada |
| T5b · Wompi Sandbox real | HU-02 (validación con la pasarela real) | Sprint 2 | — | Pendiente: faltan las llaves del Sandbox |
| T6 · Alertas | HU-05 | Sprint 3 | 3 | Terminada. El envío real por FCM espera el proyecto de Firebase |
| T7 · Perfil y eliminación de la cuenta | Sin elemento propio en el backlog: lo exige RNF-04 (Privacidad) | Sin sprint asignado | — | Terminada en su alcance de PMV. Exportar datos, política y PQR quedan fuera |
| T8 · Pruebas y métricas | Plan de pruebas (Tabla 18) y metas de la Tabla 9; RNF-01, RNF-02 y RNF-03 | Transversal | — | Terminada. La tasa de éxito definitiva se repite con Wompi Sandbox en T5b |
| T9 · Base de la app móvil | Parte de HT-01 (estructura del proyecto) y base de HU-01 a HU-07 en la app | Sprint 1 | — | Terminada: catálogo igual a la página 02 de Figma, sesión segura y navegación |
| T10 · Pantallas de la app | HU-01 a HU-07 en la app (pantallas 1.1 a 5.3 de Figma) | Sprints 1 a 4 | — | Terminada en la web contra la API en Docker. Falta la prueba en un teléfono Android real |
| T11 · Validación TRL 5 | HT-03. Despliegue y datos de prueba; metas de usabilidad, accesibilidad y seguridad (Tabla 9) | Cierre | 3 | Preparada y automatizada. Faltan TalkBack, la prueba SUS con 15 personas y el teléfono Android, que hace el equipo |

## Resumen

<!-- tabla: Resumen de las tareas ejecutadas -->
| Tarea | Fecha | Historia | Resultado | Pruebas |
|---|---|---|---|---|
| Preparación | 2026-11-17 | — | Proyecto movido fuera de OneDrive | — |
| T0 · Esqueleto y Docker | 2026-11-17 | — | Criterio cumplido | 6 de 6 (API) y 3 de 3 (recaudo) |
| T1 · Base de datos | 2026-11-17 | Base para HU-01 a HU-07 | Criterio cumplido | 15 de 15 (API) |
| T2 · Recaudo simulado | 2026-11-17 | Base para HU-01, HU-03 y HU-04 | Criterio cumplido | 33 de 33 (recaudo) y 15 de 15 (API) |
| DOC-01 · Manual y bitácora | 2026-11-17 | — | Manual en Markdown, Word y PDF | — |
| T3 · Autenticación | 2026-11-17 | HU-06 (Sprint 1) | Los 5 criterios de aceptación cumplidos | 64 de 64 (API) y 33 de 33 (recaudo) |
| T4 · Tarjetas, saldo e historial | 2026-11-17 | HU-07 y HU-03 | Los 7 criterios de aceptación cumplidos | 106 de 106 (API) y 34 de 34 (recaudo) |
| T5a · Recargas y pasarela | 2026-11-17 | HU-01, HU-02 y HU-04 | Los 12 criterios de aceptación cumplidos con la pasarela simulada | 175 de 175 (API) y 34 de 34 (recaudo) |
| T6 · Alertas de saldo bajo | 2026-11-17 | HU-05 | Los 4 criterios de aceptación cumplidos. Avisos en la bandeja de la app; FCM listo, sin proyecto de Firebase | 213 de 213 (API) y 37 de 37 (recaudo) |
| T7 · Perfil y eliminación de la cuenta | 2026-11-17 | RNF-04 | Los 5 criterios definidos para T7 cumplidos (alcance del PMV) | 234 de 234 (API) y 37 de 37 (recaudo) |
| T8 · Pruebas y métricas | 2026-11-18 | RNF-01, RNF-02 y RNF-03 | Las cuatro pruebas de la Tabla 18 corren desde Docker; las cinco metas medibles cumplen | 249 de 249 (API), 37 de 37 (recaudo), 87 de 87 aserciones (Postman) y 200 de 200 recargas |
| T9 · Base de la app móvil | 2026-11-18 | Base de HU-01 a HU-07 (app) | Criterio cumplido: el catálogo muestra los 14 componentes, la barra de navegación y los 30 íconos de la página 02 | 55 de 55 (app), 249 de 249 (API) y 37 de 37 (recaudo) |
| T10 · Pantallas de la app | 2026-11-18 | HU-01 a HU-07 (app) | El flujo 1.1 → 2.1 → 3.1 → 3.3 → 3.4 → 4.1 funciona en la web contra la API en Docker y en las pruebas; falta el teléfono Android | 84 de 84 (app), 249 de 249 (API) y 37 de 37 (recaudo) |
| T11 · Validación TRL 5 | 2026-11-18 | HT-03, RNF-03 a RNF-05 | Entorno de pruebas, accesibilidad automática sin críticos, lista MASVS, `npm audit` y registros limpios; SUS y TalkBack preparados para el equipo | 104 de 104 (app), 249 de 249 (API), 37 de 37 (recaudo), 87 de 87 aserciones y 200 de 200 recargas |

## Preparación del entorno

- **Fecha:** 2026-11-17
- **Qué se hizo:** se revisó el plan y el entorno del equipo de desarrollo. El proyecto estaba dentro de una carpeta de OneDrive y se copió a `~/Proyectos/recargamio`. Se comprobó con huellas SHA-1 que los archivos quedaron idénticos.
- **Por qué:** la sincronización de OneDrive bloquea archivos mientras Docker y npm escriben, e intenta subir miles de archivos de `node_modules`.
- **Herramientas encontradas:** Node.js 22.14, npm 11.3, Git 2.50 y Docker 29.9 (Docker Desktop estaba apagado y se encendió).

## T0 · Esqueleto del monorepo y Docker

- **Fecha:** 2026-11-17
- **Objetivo:** que un solo comando levante todo el entorno.
- **Criterio de aceptación:** `docker compose up -d` deja `db`, `api`, `recaudo-sim` y `mailpit` sanos, y `curl localhost:3000/health` responde 200.

**Qué se construyó**

- Monorepo con npm workspaces (`apps/*`, `services/*`), ESLint y TypeScript en modo estricto.
- `services/api`: Express 5 con `helmet`, registros con `pino`, configuración validada con `zod`, formato único de errores y `GET /health`, que verifica la base de datos.
- `services/recaudo-sim`: esqueleto con `GET /health`.
- Dockerfiles multietapa (desarrollo con recarga en caliente y producción con usuario sin privilegios) y `docker-compose.yml` con todos los servicios y perfiles del plan.
- `.env.example` y un `.env` local con secretos aleatorios (fuera del repositorio).
- ADR 0001 a 0008 con las decisiones D1 a D8 del plan.

**Pruebas y resultados**

- API: 6 de 6 pruebas en verde (`/health` con y sin base, formato de error, encabezados de seguridad y validación de la configuración).
- Recaudo: 3 de 3 pruebas en verde.
- `curl localhost:3000/health` → `{"estado":"ok","servicio":"api","baseDatos":"ok"}` (HTTP 200).
- Imágenes de producción construidas y probadas.

**Decisiones y ajustes**

- El contexto de construcción de Docker es la raíz del monorepo, para usar el `package-lock.json` único.
- Se fijó TypeScript 5.9 porque TypeScript 7 aún no es compatible con ts-jest ni con typescript-eslint.
- Se fijó Prisma 6 porque Prisma 7 cambia la forma de configurar el proyecto.

**Problemas encontrados**

- La caché de npm del equipo (`~/.npm`) tenía carpetas de `root` y `npm install` fallaba con `EACCES`. Se usó una caché temporal y quedó documentada la solución definitiva en el manual.

## T1 · Base de datos

- **Fecha:** 2026-11-17
- **Objetivo:** el modelo de datos de la sección 5 del plan en PostgreSQL, con migraciones y datos de prueba.
- **Criterio de aceptación:** `prisma migrate deploy` y el seed terminan sin errores, y Adminer muestra las tablas.

**Qué se construyó**

- `schema.prisma` con 10 tablas (`usuario`, `autorizacion_datos`, `sesion`, `tarjeta`, `alerta`, `recarga`, `transaccion_pasarela`, `dispositivo`, `auditoria` y `pqr`), sus índices y nombres en `snake_case`.
- Módulo de cifrado del número de la tarjeta MIO: AES-256-GCM y HMAC-SHA256.
- Migración inicial `20261117071844_inicial`.
- Seed idempotente: usuaria Viviana con contraseña argon2id, autorización de datos `v1` y dos tarjetas con alerta de $5.000.

**Pruebas y resultados**

- 15 de 15 pruebas de la API en verde. Hay 8 nuevas del cifrado: ida y vuelta, IV aleatorio, rechazo de un dato manipulado, rechazo de otra llave, HMAC estable, últimos 4 dígitos, validación de 10 dígitos y validación de llaves.
- Verificación desde una base vacía: migración aplicada, seed corrido dos veces con el mismo resultado (1 usuaria, 1 autorización, 2 tarjetas y 2 alertas) y tablas visibles en Adminer.
- Se confirmó en la base que el número de la tarjeta no aparece en texto plano.

**Decisiones**

- **ADR 0009:** el número de la tarjeta se guarda cifrado y con HMAC. Guardar solo un hash no sirve, porque la API necesita el número para consultar el saldo. Guardarlo en texto plano debilitaba la privacidad.

## T2 · Recaudo simulado

- **Fecha:** 2026-11-17
- **Objetivo:** que `recaudo-sim` se comporte como el sistema de recaudo del MIO.
- **Criterio de aceptación:** acreditar dos veces la misma referencia suma una sola vez (prueba automatizada).

**Qué se construyó**

- Base `recaudo` con las tablas `tarjeta_recaudo`, `credito` (referencia única) y `viaje`.
- Seis endpoints, protegidos con `X-Api-Key`: consulta de tarjeta, crédito idempotente, viajes, viaje simulado, latencia o fallas simuladas y reinicio para demostraciones.
- Seed con 6 tarjetas (incluida una inactiva) y 4 viajes históricos.
- El contenedor aplica sus migraciones y su seed al arrancar.
- Base aislada `recaudo_pruebas` para las pruebas automáticas.

**Pruebas y resultados**

- 33 de 33 pruebas en verde, corridas tres veces seguidas sin fallas intermitentes. Entre ellas:
  - **Criterio de T2:** el mismo crédito enviado dos veces deja el saldo en $22.400, no en $32.400.
  - 10 créditos simultáneos con la misma referencia suman una sola vez.
  - Una referencia repetida con otro monto responde 409 y no cambia el saldo.
  - Una falla simulada (503) no toca el saldo, y el reintento acredita una sola vez.
- Comprobación manual con `curl` (ver la figura de idempotencia en el capítulo de arquitectura).

**Decisiones (ADR 0010)**

- El equipo decidió que un viaje **sí puede dejar el saldo negativo**, en lugar de rechazarlo con `SALDO_INSUFICIENTE`.
- El simulador migra su base solo al arrancar. La API sigue migrando a mano.
- Las pruebas usan una base aparte que debe terminar en `_pruebas`.

**Problemas encontrados**

- Dos clientes de Prisma en el mismo monorepo se sobrescribían. Se resolvió generando el del simulador en `services/recaudo-sim/generated/prisma`.

## DOC-01 · Manual y bitácora

- **Fecha:** 2026-11-17
- **Objetivo:** documentar todo lo construido y mantenerlo al día en cada tarea.

**Qué se construyó**

- Manual en `docs/manual/`, con tres capítulos: instalación y operación, arquitectura y manual de usuario.
- Esta bitácora.
- Capturas reales de evidencia: terminal, Adminer, Mailpit y pruebas.
- Las 19 pantallas del prototipo de Figma, en el manual de usuario.
- Generador `npm run manual`, que produce `Manual_RecargaMIO.docx` y `Manual_RecargaMIO.pdf` con portada, tabla de contenido y figuras numeradas según APA 7.
- Regla nueva en `CLAUDE.md`: ninguna tarea se da por terminada sin actualizar el manual y la bitácora.

**Pendientes detectados**

- ~~El seed de la API llama «Mamá» a la segunda tarjeta y usa la versión de política `v1`.~~ Corregido en T3: «Tarjeta de mamá» y política «1.0», como en Figma.
- El repositorio no tiene commits por decisión del equipo. Se harán cuando el equipo defina la identidad de git que usará.

## T3 · Autenticación y cuenta segura (HU-06 · Sprint 1)

- **Fecha:** 2026-11-17
- **Historia comprometida:** HU-06. «Como usuario, quiero crear una cuenta e ingresar de forma segura, para proteger mis tarjetas y mis datos.» (5 puntos)
- **Historia terminada:** HU-06, con sus 5 criterios de aceptación cubiertos por pruebas automatizadas.
- **Requerimientos cubiertos:** RF-01, RF-02, RF-12 (auditoría de ingresos), RNF-03 (función de resumen y tokens con expiración) y RNF-04 (autorización previa del titular).

**Criterios de aceptación (Tabla 13) y cómo se verifican**

<!-- tabla: Criterios de aceptación de HU-06 y su verificación -->
| Criterio | Cómo se cumple | Pruebas automatizadas |
|---|---|---|
| CA-1. Me registro con correo y una contraseña de ocho caracteres o más | `POST /auth/registro`. La contraseña debe tener mínimo 8 caracteres, con letras y números, y se guarda con argon2id. No se permiten correos repetidos | 7 pruebas en `auth-registro.test.ts` |
| CA-2. Debo aceptar de forma expresa la política de tratamiento de datos | Sin `aceptaPolitica: true` exacto se responde 400 `POLITICA_NO_ACEPTADA`. Se registran la versión 1.0, la fecha y la IP | 6 pruebas en `auth-registro.test.ts` |
| CA-3. La sesión se cierra cuando el token expira | El token de acceso dura 15 minutos y la sesión 7 días. Cerrar sesión o restablecer la contraseña invalida los tokens de inmediato | 5 pruebas en `auth-sesion.test.ts`, más 6 de `/me` y de renovación rotativa |
| CA-4. Tras cinco intentos fallidos, el ingreso se bloquea temporalmente | El quinto fallo bloquea 15 minutos (423 `CUENTA_BLOQUEADA`). Se muestra el contador de intentos de la pantalla 1.2 | 5 pruebas en `auth-ingreso.test.ts`, más 6 de ingreso y límite de peticiones |
| CA-5. Puedo recuperar la contraseña por correo | Enlace por correo (Mailpit) a una página web. El enlace es de un uso y dura 30 minutos | 9 pruebas en `auth-recuperacion.test.ts`, más 4 de la página web |

**Qué se construyó**

- Endpoints `/auth/registro`, `/auth/ingreso`, `/auth/renovar`, `/auth/salir`, `/auth/recuperar`, `/auth/restablecer` y `GET /me`.
- Página web `/restablecer` para el enlace del correo. Usa los colores de Figma, tiene etiquetas accesibles y no usa JavaScript.
- Tabla nueva `token_recuperacion` (migración `20261117081950_recuperacion_contrasena`).
- Middleware `autenticar`, que valida el JWT y que la sesión siga abierta. Lo usarán T4 y las tareas siguientes.
- Límite de peticiones por IP, auditoría de las operaciones de la cuenta y registros sin tokens ni contraseñas.
- Correo con nodemailer hacia Mailpit.
- Base aislada `recargamio_pruebas` para las pruebas.
- Seed alineado con Figma: «Viviana Andrade Torres», «Tarjeta de mamá» y política 1.0.

**Pruebas y resultados**

- API: **64 de 64** pruebas en verde (6 suites). Recaudo: 33 de 33. Lint y tipos sin errores. Todo verificado en Docker partiendo de una base vacía.
- Prueba manual de punta a punta:
  - Registro: 201. Sin aceptar la política: 400.
  - Contraseña equivocada: «quedan 4 intentos» y luego «3».
  - Ingreso y consulta de `/me`: correctos.
  - Recuperación: el correo llegó a Mailpit, el enlace abrió la página y la contraseña cambió.
  - Reusar el enlace: 400 `ENLACE_INVALIDO`.
  - El token del enlace no aparece en los registros de la API.

**Decisiones (ADR 0011)**

- El enlace del correo lleva a una página web servida por la API, no a un enlace profundo de la app.
- Se muestra el contador de intentos como en Figma. Se acepta que revela si un correo está registrado y se mitiga con límite de peticiones y tiempo de respuesta igual.
- El token de renovación es opaco y rotativo, con detección de reúso. En la base solo se guarda su HMAC.

**Problemas encontrados**

- Con Zod 4, un campo `unknown()` es obligatorio. Se marcó `aceptaPolitica` como opcional para que su ausencia responda `POLITICA_NO_ACEPTADA` y no un error genérico.
- El correo de recuperación se envía en segundo plano, a propósito, para no delatar si el correo existe. Por eso tarda un momento en aparecer en Mailpit.

**Revisión del sprint con el tutor**

[PENDIENTE: lo diligencia el equipo después de mostrar el incremento al tutor: fecha, observaciones y acuerdos.]

**Retrospectiva**

[PENDIENTE: lo diligencia el equipo. Puntos sugeridos para discutir: qué funcionó (pruebas por criterio de aceptación, documentación al día), qué mejorar (crear ya el repositorio en GitHub con integración continua, HT-01) y acuerdos para el Sprint 2.]

**Pendientes que deja T3**

- HT-01: crear el repositorio en GitHub y la integración continua, que corra lint y pruebas en cada cambio.
- T8: los límites de peticiones por IP deben ajustarse para la prueba de carga con JMeter.
- T10: las pantallas 1.1 a 1.4 de la app deben consumir estos endpoints y guardar los tokens en `expo-secure-store`.

## T4 · Tarjetas, saldo e historial (HU-07 y HU-03)

- **Fecha:** 2026-11-17
- **Historias comprometidas:** HU-07, gestión de hasta cinco tarjetas (5 puntos, Sprint 4 en el documento maestro), y HU-03, consulta de saldo e historial (5 puntos, Sprint 3). El plan de implementación las adelanta porque T5 (recargas) necesita las tarjetas.
- **Historias terminadas:** HU-07 y HU-03, con sus 7 criterios de aceptación cubiertos por pruebas automatizadas.
- **Requerimientos cubiertos:** RF-03, RF-04, RF-09 y RF-12 (auditoría de cambios de tarjetas).

**Criterios de aceptación (Tabla 13) y cómo se verifican**

<!-- tabla: Criterios de aceptación de HU-07 y HU-03 y su verificación -->
| Criterio | Cómo se cumple | Pruebas automatizadas |
|---|---|---|
| HU-07 CA-1. Agrego una tarjeta con su número y un nombre | `POST /tarjetas`, validada con el recaudo. El número se guarda cifrado y solo se devuelven los últimos 4 dígitos | 12 |
| HU-07 CA-2. Veo cuántas tarjetas llevo de las cinco | `GET /tarjetas` devuelve `registradas` y `maximo` | 2 |
| HU-07 CA-3. No permite registrar una sexta | 409 `LIMITE_TARJETAS`, también con peticiones simultáneas | 3 |
| HU-07 CA-4. Puedo renombrar o eliminar una tarjeta | `PATCH` y `DELETE /tarjetas/:id`, con borrado lógico y reactivación. 404 para tarjetas ajenas | 5 |
| HU-03 CA-1. El saldo de cada tarjeta aparece en el inicio | Saldo en vivo del recaudo, etiqueta «Saldo bajo» y respuesta degradada si el recaudo cae | 4 |
| HU-03 CA-2. El historial lista recargas y viajes con fecha y valor | Une recargas acreditadas y viajes del recaudo, del más reciente al más antiguo, con paginación | 4 |
| HU-03 CA-3. Puedo filtrar por todo, recargas o viajes | `?tipo=todo\|recargas\|viajes` | 5 |

**Qué se construyó**

- Módulo `tarjetas` con seis endpoints: listar, agregar, detalle, renombrar, eliminar y movimientos.
- Cliente HTTP del recaudo, con llave `X-Api-Key`, tiempo máximo de 3 segundos y respuestas validadas con `zod`. Tiene 7 pruebas propias contra un servidor falso.
- En `recaudo-sim`: filtro `hasta` en los viajes, para paginar, y la tarjeta semilla `1234560003`, para demostrar el límite.
- Auditoría de tarjeta agregada, renombrada y eliminada.

**Pruebas y resultados**

- API: **106 de 106** pruebas en verde (9 suites). Recaudo: 34 de 34. Lint y tipos sin errores. Verificado en Docker.
- Prueba manual contra el recaudo real, con la usuaria Viviana:
  - El inicio muestra 2 de 5 tarjetas, $12.400 y $3.200, con «Saldo bajo» en la tarjeta de mamá, como en la pantalla 2.1 de Figma.
  - Se agregaron 3 tarjetas más y la sexta respondió 409 `LIMITE_TARJETAS`.
  - Un viaje simulado apareció en el historial filtrado por viajes.
  - Los registros de la API no contienen ningún número completo de tarjeta.

**Decisiones (ADR 0012)**

- Eliminar es un borrado lógico. Volver a agregar la misma tarjeta la reactiva.
- No se crea una alerta automática: «Saldo bajo» aparece solo con una alerta configurada.
- Si el recaudo no responde, el inicio y el historial muestran lo disponible con un aviso, en lugar de fallar.

**Problemas encontrados**

- El cliente del recaudo recibía las respuestas sin tipo. Se resolvió validándolas con `zod`, lo que además cumple la regla 5 para las entradas que vienen de un servicio externo.
- En las pruebas manuales en zsh, una variable con el encabezado `-H` sin comillas no se separa en palabras y `curl` recibía mal el encabezado. Los comandos del manual escriben el encabezado completo.

**Revisión del sprint con el tutor**

[PENDIENTE: lo diligencia el equipo: fecha, observaciones y acuerdos.]

**Retrospectiva**

[PENDIENTE: lo diligencia el equipo.]

**Pendientes que deja T4**

- T5: la recarga a terceros con «Guardar esta tarjeta» (HU-04 CA-2) reutilizará la regla de agregar tarjeta.
- T6: configurar las alertas (`PUT /tarjetas/:id/alerta`) y la notificación.
- T10: las pantallas 2.1 a 2.4 y 4.1 consumirán estos endpoints.

## T5a · Recargas y pasarela de pagos (HU-01, HU-02 y HU-04)

- **Fecha:** 2026-11-17
- **Historias comprometidas:** HU-01, recarga desde el celular (8 puntos), y HU-02, pago con PSE, Nequi o Bancolombia (8 puntos), del Sprint 2. HU-04, recarga a terceros (5 puntos), del Sprint 4.
- **Historias terminadas:** HU-01, HU-02 y HU-04, con sus 12 criterios de aceptación cubiertos por pruebas automatizadas, usando la **pasarela simulada**. La validación contra el Sandbox real de Wompi queda para T5b, porque el equipo todavía no tiene las llaves.
- **Requerimientos cubiertos:** RF-05, RF-06, RF-07, RF-08, RF-10 y RF-12. RNF-01 (tiempo de recarga), RNF-02 (cada notificación se procesa una sola vez) y RNF-03 (ningún dato bancario se guarda).

**Criterios de aceptación (Tabla 13) y cómo se verifican**

<!-- tabla: Criterios de aceptación de HU-01, HU-02 y HU-04 y su verificación -->
| Criterio | Cómo se cumple | Pruebas |
|---|---|---|
| HU-01 CA-1. Elijo una tarjeta registrada y un monto de $5.000, $10.000, $20.000 o $50.000 | `POST /recargas` acepta solo esos montos y tarjetas propias activas | 10 |
| HU-01 CA-2. Veo el total a pagar antes de confirmar | La respuesta incluye `total` (igual al monto, sin comisiones) | 1 |
| HU-01 CA-3. Si se aprueba, veo el comprobante con la referencia y el nuevo saldo | `GET /recargas/:id` devuelve el comprobante con la referencia, el nuevo saldo y la tarjeta enmascarada | 2 |
| HU-01 CA-4. El proceso completo tarda 180 segundos o menos | Se guarda `acreditada_en − iniciada_en` y la API devuelve `tiempoSegundos` | 1 |
| HU-01 CA-5. Si se rechaza, el saldo no cambia y se me informa | `RECHAZADA` o `ERROR` con motivo y mensaje. El saldo en el recaudo no cambia | 2 |
| HU-02 CA-1. Los tres medios aparecen como opciones | Nequi, PSE (con lista de bancos) y Bancolombia, de punta a punta | 6 |
| HU-02 CA-2. La autorización ocurre en el banco o la billetera | Nequi pide autorizar en su app. PSE y Bancolombia devuelven la URL del banco. Se exigen los términos de la pasarela | 4 |
| HU-02 CA-3. La app no pide ni guarda datos bancarios | El celular y el documento no aparecen en ninguna tabla ni en los registros | 1, más la verificación manual en la base |
| HU-02 CA-4. Mientras está pendiente, veo ese estado | `GET /recargas/:id` responde `PENDIENTE` hasta la confirmación | 1 |
| HU-04 CA-1. Ingreso el número y lo confirmo antes de pagar | `numeroDestino` y `confirmacionNumero` deben coincidir, y el recaudo valida el número | 4 |
| HU-04 CA-2. La tarjeta no queda guardada, salvo que lo pida | `guardarTarjeta` (opcional) reutiliza las reglas de HU-07 | 2 |
| HU-04 CA-3. El comprobante muestra la tarjeta de destino enmascarada | `MIO •••• 4321`. El número completo nunca sale de la API | 1 |

Además hay 13 pruebas del webhook, la reconciliación y otras protecciones, 15 de las firmas y de la regla 1, y 6 del cliente de Wompi contra un servidor falso con el contrato documentado.

**Qué se construyó**

- **Contrato `Pasarela`** con dos implementaciones:
  - **Simulada:** usa los datos de prueba de Wompi y envía el webhook firmado.
  - **Cliente de Wompi Sandbox:** tokens de aceptación con el endpoint vigente, firma de integridad, Nequi, PSE, Bancolombia y consulta de transacciones.
- **Endpoints:** `POST /recargas`, `GET /recargas/:id`, `GET /pasarela/bancos`, `GET /pasarela/terminos` y `POST /webhooks/wompi`.
- **Webhook:** verifica el checksum antes de usar el evento y responde 401 si la firma es falsa.
- **Reconciliación:** cada 30 s, y también bajo demanda con «Actualizar estado».
- **Estados:** `FALLA_ACREDITACION`, con reintento automático.
- **Base de datos:**
  - Migración `20261117090000_recargas_pasarela`.
  - Columnas nuevas en `recarga`: referencia de la pasarela, id de la transacción, URL del banco, motivo y saldo resultante.
  - Secuencia `recarga_referencia_seq`.
- **Seguridad:** la API no arranca con llaves de Wompi que no sean de prueba (regla 1).

**Pruebas y resultados**

- API: **175 de 175** pruebas (12 suites). Recaudo: 34 de 34. Lint y tipos sin errores. Verificado en Docker.
Prueba manual contra el recaudo real, con el webhook enviado por la pasarela simulada:

<!-- tabla: Prueba manual de recargas -->
| Caso | Resultado |
|---|---|
| Nequi `3991111111`, $20.000 | `ACREDITADA` en **4 segundos**, nuevo saldo $32.400 |
| Nequi `3992222222`, $5.000 | `RECHAZADA`, «El usuario rechazó el pago en Nequi», saldo sin cambios |
| PSE, banco 1, $10.000 | Devolvió la URL del banco y luego `ACREDITADA` (4 s) |
| Tercero `9087654321` con Bancolombia, $10.000 | `ACREDITADA`, comprobante `MIO •••• 4321`, saldo del tercero $11.000 |
| Webhook con checksum falso | 401 `FIRMA_INVALIDA` |
| Búsqueda de celulares y documentos en la base y en los registros | 0 coincidencias |

**Decisiones (ADR 0013)**

- T5 se divide en T5a (pasarela simulada) y T5b (Sandbox real).
- Bancolombia se incluye ya.
- Referencia doble: `RM-000123` para el usuario y `RM-000123-K7Q2` para la pasarela.
- Se exige aceptar los términos de la pasarela. Lo pide Wompi y hay que agregarlo en la pantalla 3.1 de Figma.

**Problemas encontrados**

- `prisma migrate dev` no funciona sin terminal interactiva cuando se agrega una columna obligatoria. La migración se generó con `prisma migrate diff` y una base sombra temporal.
- El contenedor de la API tenía el cliente de Prisma del esquema anterior. Se reconstruyó la imagen, y quedó documentado en la solución de problemas.
- El ejemplo del checksum de eventos de la documentación de Wompi no coincide con su propia entrada. Se usó el algoritmo documentado con vectores propios y queda pendiente confirmarlo con un evento real en T5b.

**Revisión del sprint con el tutor**

[PENDIENTE: lo diligencia el equipo.]

**Retrospectiva**

[PENDIENTE: lo diligencia el equipo.]

**Pendientes que deja T5a**

- **T5b:** crear la cuenta de Wompi Sandbox y poner las 4 llaves en el `.env`. Después, probar con `PASARELA=wompi` con y sin túnel, y confirmar el checksum de eventos, el formato de los bancos de PSE y el flujo de Bancolombia.
- **T10:** casilla de términos de la pasarela en la pantalla 3.1 y apertura de `urlPago` con `expo-web-browser`.
- **T8:** script de 200 recargas y `npm run metricas` con los tiempos guardados.

## T6 · Alertas de saldo bajo (HU-05)

- **Fecha:** 2026-11-17
- **Historia comprometida:** HU-05, alertas de saldo bajo (3 puntos), del Sprint 3.
- **Historia terminada:** HU-05, con sus 4 criterios de aceptación cubiertos por pruebas automatizadas. El aviso queda en la bandeja de la app y está listo para enviarse por FCM a Android cuando el equipo cree el proyecto de Firebase.
- **T5b sigue pendiente:** el equipo decidió avanzar con T6 mientras consigue las llaves del Sandbox de Wompi.
- **Requerimientos cubiertos:** RF-11 (alertas de saldo bajo) y RF-12 (auditoría de los cambios de alerta).

**Criterios de aceptación (Tabla 13) y cómo se verifican**

<!-- tabla: Criterios de aceptación de HU-05 y su verificación -->
| Criterio | Cómo se cumple | Pruebas |
|---|---|---|
| HU-05 CA-1. Puedo fijar un valor de alerta por cada tarjeta | `PUT /tarjetas/:id/alerta` con un valor entre $3.500 y $50.000, solo sobre tarjetas propias, con registro en la auditoría | 9 |
| HU-05 CA-2. Recibo una notificación en el teléfono cuando el saldo queda por debajo | Revisión justo después de cada viaje y cada 5 minutos. Aviso en la bandeja y por FCM, máximo uno cada 12 horas por tarjeta y sin duplicados aunque coincidan varias revisiones | 13 |
| HU-05 CA-3. La tarjeta muestra la etiqueta «Saldo bajo» en el inicio | `GET /tarjetas` devuelve `saldoBajo` según la alerta activa (ya existía desde T4) | 1, más 1 de T4 |
| HU-05 CA-4. Puedo desactivar la alerta | `activa: false` conserva el valor, quita la etiqueta y detiene los avisos. Al reactivarla, avisa de nuevo | 2 |

Además hay 3 pruebas de la ruta interna del recaudo, 7 de dispositivos, 2 de la bandeja y 1 del aviso de «Recarga exitosa». En el recaudo simulado se agregaron 3 pruebas del aviso de cada viaje.

**Qué se construyó**

- **Endpoints:**
  - `PUT /tarjetas/:id/alerta`.
  - `POST /dispositivos` y `DELETE /dispositivos`.
  - `GET /notificaciones`, `POST /notificaciones/:id/leida` y `POST /notificaciones/leidas`.
  - `POST /internos/recaudo/viajes`, protegido con la llave compartida del recaudo.
- **Revisión de alertas:**
  - Después de cada viaje, porque el recaudo simulado avisa a la API (`API_AVISOS_URL`).
  - Cada 5 minutos, como respaldo (`INTERVALO_ALERTAS_MS`).
- **Envío:** con FCM (`firebase-admin`) si existe `secrets/firebase.json`. Sin ese archivo, los avisos quedan solo en la bandeja de la app (ADR 0007).
- **Aviso de «Recarga exitosa»** al acreditar una recarga (pantalla 4.3).
- **Base de datos:** migración `20261117100000_alertas_notificaciones`, con la tabla `notificacion`.

**Pruebas y resultados**

- API: **213 de 213** pruebas (13 suites), 38 de ellas nuevas. Recaudo: **37 de 37**. Lint y tipos sin errores. Verificado en Docker.

Prueba manual en Docker, con la tarjeta de mamá (saldo $3.200) y la alerta en $5.000:

<!-- tabla: Prueba manual de alertas de saldo bajo -->
| Caso | Resultado |
|---|---|
| Desactivar la alerta | `saldoBajo: false`, el valor $5.000 se conserva |
| Activarla de nuevo | `saldoBajo: true` |
| Registrar un teléfono sin Firebase | `envioPush: false`: el aviso irá solo a la bandeja |
| Viaje en la ruta E21 (saldo −$300) | En menos de un segundo aparece «Saldo bajo en Tarjeta de mamá · Te quedan -$300, no alcanza para un pasaje» |
| Segundo viaje (saldo −$3.800) | No hay un segundo aviso: sigue habiendo uno solo (regla de 12 horas) |
| Búsqueda del número de la tarjeta y del token del teléfono en la base y en los registros | 0 coincidencias |

**Decisiones (ADR 0014)**

- El recaudo avisa a la API después de cada viaje, con la revisión cada 5 minutos como respaldo.
- Bandeja de notificaciones en la base: el aviso existe aunque no haya FCM.
- Cambiar el valor de la alerta o volver a activarla reinicia la ventana de 12 horas.
- Se incluye el aviso de «Recarga exitosa», que aparece en Figma.
- El texto del aviso se ajusta al saldo. Figma dice «$3.200, menos de un pasaje de ida y vuelta», pero $3.200 no alcanza ni para un pasaje.

**Problemas encontrados**

- La API compila como CommonJS y no permite `await` en el nivel superior. FCM se carga en segundo plano y, mientras tanto, los avisos van solo a la bandeja.
- El texto de «Recarga exitosa» reutiliza el mensaje del comprobante, que incluye `•••• 4821`. Se ajustó la prueba en lugar de duplicar el texto.
- Como la revisión cada 5 minutos ya habría avisado de la tarjeta de mamá al arrancar la API, la captura de evidencia desactiva y reactiva la alerta antes del viaje, para mostrar el aviso desde cero.

**Revisión del sprint con el tutor**

[PENDIENTE: lo diligencia el equipo.]

**Retrospectiva**

[PENDIENTE: lo diligencia el equipo.]

**Pendientes que deja T6**

- **Firebase:** crear el proyecto, registrar la app Android y guardar la cuenta de servicio en `secrets/firebase.json`. Los pasos están en el manual, en «Activar las notificaciones push».
- **T10:**
  - Pantalla 4.2 con `PUT /tarjetas/:id/alerta`.
  - Registro del token con `expo-notifications` (requiere *development build*) y su borrado al cerrar sesión.
  - Bandeja en la campana de Inicio.
- **T5b:** sigue esperando las llaves del Sandbox de Wompi.

## T7 · Perfil y eliminación de la cuenta (RNF-04)

- **Fecha:** 2026-11-17
- **Alcance:** el PMV del plan de implementación, por decisión del equipo:
  - Rectificar los datos (`PATCH /me`).
  - Eliminar la cuenta (`DELETE /me`).
  - Quedan fuera del PMV «Descargar mis datos», la página de la política y las PQR.
- **Requerimiento cubierto:** RNF-04 (Privacidad): autorización previa, recolección mínima y **opción de eliminar la cuenta**, según la Ley 1581 de 2012. También aporta a RF-12 (auditoría).
- **Elemento del backlog:** ninguno. La Tabla 14 no tiene una historia de privacidad; el trabajo lo exige RNF-04 y aparece en la pantalla 5.2 de Figma.

**Criterios definidos para T7 y cómo se verifican**

Como T7 no tiene historia en la Tabla 13, los criterios salen de RNF-04 y de la pantalla 5.2:

<!-- tabla: Criterios de T7 y su verificación -->
| Criterio | Cómo se cumple | Pruebas |
|---|---|---|
| T7 CA-1. Veo mis datos y la versión de la política que acepté | `GET /me` devuelve el nombre, el correo y la autorización (versión 1.0 y fecha) | 1 |
| T7 CA-2. Puedo actualizar o rectificar mis datos | `PATCH /me` cambia el nombre. El correo exige la contraseña actual y que el correo esté libre, y se avisa al correo anterior | 8 |
| T7 CA-3. Puedo eliminar mi cuenta y se borran mis tarjetas, alertas e historial | `DELETE /me` con la contraseña. Una búsqueda en las 12 tablas confirma que no quedan el nombre, el correo ni el número completo de la tarjeta | 6 |
| T7 CA-4. Después de eliminarla, la cuenta ya no se puede usar | Los tokens de acceso y de renovación dejan de servir, no se puede ingresar ni recuperar la contraseña, y el correo queda libre para una cuenta nueva | 3 |
| T7 CA-5. No se elimina la cuenta mientras hay dinero en camino | 409 `RECARGA_EN_CURSO` con una recarga aprobada sin acreditar o una pendiente de las últimas 24 horas | 3 |

**Qué se construyó**

- **Módulo `me`** con su propio servicio y esquemas `zod`: `GET`, `PATCH` y `DELETE /me`.
- **Eliminación en una sola transacción:**
  - **Borra** tarjetas (y en cascada sus alertas), notificaciones, dispositivos y enlaces de recuperación.
  - **Revoca** las sesiones.
  - **Anonimiza** el nombre y el correo (`eliminada-<id>@recargamio.invalid`) y el número de destino de las recargas (`••••4821`).
  - **Conserva** la autorización de datos y la auditoría.
- **Correos de aviso** al cambiar el correo y al eliminar la cuenta, con el HTML escapado.
- **Auditoría:** `PERFIL_ACTUALIZADO` (solo los nombres de los campos) y `CUENTA_ELIMINADA` (cuántas tarjetas se borraron y cuántas recargas se anonimizaron).
- **Base de datos:** sin migración nueva. Se usan las columnas que ya existían (`usuario.eliminado_en`).

**Pruebas y resultados**

- API: **234 de 234** pruebas (14 suites), 21 de ellas nuevas. Recaudo: **37 de 37**. Lint y tipos sin errores. Verificado en Docker.

Prueba manual en Docker con un usuario de demostración («Carlos Demo»), sin tocar a Viviana:

<!-- tabla: Prueba manual de perfil y eliminación de la cuenta -->
| Caso | Resultado |
|---|---|
| Rectificar el nombre a «Carlos Andrés Demo» | 200, con la política 1.0 y su fecha |
| Cambiar el correo con una contraseña equivocada | 403 `CONTRASENA_INCORRECTA`, el correo no cambia |
| Eliminar la cuenta | `{ eliminada: true, tarjetas: 1, recargasAnonimizadas: 0 }` |
| Usar el token anterior | 401 `SESION_INVALIDA` |
| Ingresar con el correo y la contraseña anteriores | 401 `CREDENCIALES_INVALIDAS` |
| Revisar la base | «Cuenta eliminada», correo `eliminada-…@recargamio.invalid`, 0 tarjetas y 1 autorización conservada |
| Revisar a Viviana después de las capturas | Sigue activa, con sus 2 tarjetas |

**Decisiones (ADR 0015)**

- Alcance de PMV: rectificar y eliminar. Exportar, la política y las PQR quedan fuera.
- Las recargas se conservan anonimizadas, para la conciliación, las métricas y los reclamos.
- El correo se puede cambiar con la contraseña actual.
- Una recarga pendiente de más de 24 horas no bloquea la eliminación y se cierra como `ERROR`.

**Problemas encontrados**

- **Al revisar el plan de T7 apareció un error en la bitácora de T6:** decía RF-09 y las alertas son **RF-11**. Ya está corregido.
- **Una recarga pendiente abandonada podía bloquear para siempre la eliminación.** Por eso se limitó a 24 horas. Pero al enmascarar su número, la reconciliación ya no podría acreditarla, así que ahora se cierra como `ERROR` en la misma transacción.

**Revisión del sprint con el tutor**

[PENDIENTE: lo diligencia el equipo.]

**Retrospectiva**

[PENDIENTE: lo diligencia el equipo.]

**Pendientes que deja T7**

- **T10:**
  - Formulario de rectificación y confirmación de la eliminación en dos pasos (diálogo y contraseña) en la pantalla 5.2.
  - Marcar como «Próximamente», o esconder, «Descargar mis datos», la política y «Radicar una PQR».
- **Fuera del PMV:** `GET /me/datos`, `GET /politica` y `/pqr`, por si sobra tiempo.
- **T5b:** sigue esperando las llaves del Sandbox de Wompi. **Firebase:** sigue pendiente para el envío real por FCM.

## T8 · Pruebas de API, integración, carga y seguridad, y métricas

- **Fecha:** 2026-11-18
- **Requerimientos cubiertos:** RNF-01 (tiempo de recarga y de respuesta), RNF-02 (éxito de pagos) y RNF-03 (seguridad). Aplica el plan de pruebas de la Tabla 18 y compara con las metas de la Tabla 9.
- **Criterio de aceptación del plan:** «Los cuatro perfiles de prueba corren desde Docker y generan reportes en `tests/` y `docs/metricas/`». **Cumplido:** `npm run pruebas` corre las cuatro y deja todo en «OK».

**Resultados frente a las metas**

<!-- tabla: Resultados de T8 frente a las metas de la Tabla 9 -->
| Indicador | Meta | Resultado | Veredicto |
|---|---|---|---|
| Tiempo de recarga, percentil 95 | ≤ 180 s | 4,0 s (la demora configurada de la pasarela simulada) | Cumple |
| Éxito de pagos | ≥ 98 % de 200 o más | 200 de 200 (100 %; IC 95 %: 98,1 % a 100 %) con la pasarela simulada | Cumple; se repite con Wompi en T5b |
| Tiempo de respuesta, percentil 95 | ≤ 2 s con 100 usuarios | 0,02 s con 100 usuarios simultáneos y 3.863 peticiones sin errores. El ingreso, lo más lento por argon2, tuvo un percentil 95 de 0,43 s | Cumple |
| Pruebas de API | Según el contrato | 46 peticiones y 87 aserciones, todas en verde | Cumple |
| Seguridad (ZAP) | 0 críticos o altos | 0 altos. Quedan 1 medio (falso positivo justificado) y 2 bajos aceptados | Cumple |

El detalle completo, con la media, la mediana y el percentil 95 por endpoint y por medio de pago, está en `docs/metricas/resultados.md` y en el capítulo «Pruebas y resultados» del manual.

**Qué se construyó**

- **Contrato OpenAPI 3.1:**
  - Está en `services/api/openapi.yaml` y documenta las 33 operaciones.
  - Se publica con Swagger UI en `/docs`, solo fuera de producción.
  - Una prueba lee las rutas del código y exige que coincidan con el contrato, en los dos sentidos.
- **Pruebas de API:** la colección `tests/postman/RecargaMIO.postman_collection.json`:
  - Crea una cuenta y la elimina al final.
  - Cubre HU-01, HU-02, HU-03, HU-05, HU-06, HU-07 y T7.
  - Incluye los errores esperados y el webhook con firma falsa.
- **Integración:** `tests/integracion/recargas.mjs` hace 200 recargas, cinco a la vez, rotando Nequi, PSE y Bancolombia y los cuatro montos.
- **Carga:** `tests/jmeter/recargas.jmx` simula 100 usuarios. Cada uno ingresa y luego hace cinco ciclos de tarjetas, historial, recarga y consulta del estado.
- **Seguridad:**
  - ZAP ataca la API a partir del contrato y con una sesión válida.
  - Las reglas tratadas, con su justificación, están en `tests/seguridad/reglas-zap.conf`.
- **Orquestación y métricas:**
  - `npm run pruebas` hace todo el ciclo: desactiva los límites, crea los usuarios de pruebas, corre las cuatro pruebas, calcula las métricas y restaura los límites.
  - `npm run metricas` escribe `docs/metricas/resultados.md`, con «Cumple» o «No cumple» para cada meta.
- **Datos de prueba aislados:**
  - `npm run seed:pruebas` crea 102 usuarios: `carga001` a `carga100`, `integracion` y `zap`.
  - El recaudo simulado tiene 107 tarjetas exclusivas para las pruebas. Viviana nunca se usa.
- **Endurecimiento por los hallazgos de ZAP:**
  - CORS desactivado por defecto (`CORS_ORIGENES`).
  - CSP estricta en la API y, en las páginas HTML, CSP con el hash de cada estilo en lugar de `unsafe-inline`.
  - Encabezados `Permissions-Policy` y `Cross-Origin-Embedder-Policy`.
- **Manual:**
  - Capítulo nuevo «Pruebas y resultados», que incluye solo `resultados.md`.
  - Variables, comandos y problemas frecuentes en el capítulo de instalación.
  - Capturas de Swagger, Newman, JMeter y ZAP.

**Pruebas y resultados**

- API: **249 de 249** pruebas (16 suites), 15 de ellas nuevas: contrato OpenAPI, límites y encabezados de seguridad.
- Recaudo: **37 de 37**.
- Lint y tipos sin errores.
- `npm run pruebas`: las cinco etapas en «OK» y la API restaurada con los límites normales.

**Decisiones (ADR 0016)**

- Los límites de peticiones se desactivan solo durante las pruebas, con una variable que se rechaza en producción.
- El contrato OpenAPI se escribe a mano, con una prueba que impide que se desactualice.
- `/docs` existe solo fuera de producción.
- Con la pasarela simulada, la tasa de éxito mide el flujo completo, no a Wompi. Se repite en T5b.
- Los datos de prueba están aislados, y los reportes completos no se suben a GitHub; van a un *Release*.

**Problemas encontrados**

- **Límites de peticiones.** La primera corrida de las 200 recargas recibió 429 desde la recarga 30: `docker compose run` volvió a crear la API sin la variable que desactiva los límites. Por eso `npm run pruebas` pasa la variable en cada comando y la restaura al final.
- **Reposo del equipo.** En la segunda corrida, el Mac entró en reposo dos veces y Docker se congeló 15 y 10 minutos. Diez recargas aparecieron con 603 y 907 s; se acreditaron bien al despertar, pero los tiempos ya no servían y la corrida se descartó. Ahora `npm run pruebas` evita el reposo con `caffeinate`, y el script hace una última consulta antes de dar una recarga por perdida.
- **JMeter emulado.** La imagen `justb4/jmeter` solo existe para amd64; en el Mac con procesador ARM la JVM tardó unos 13 minutos en arrancar. Se cambió por `alpine/jmeter:5.6.3`, que es multiplataforma, y la prueba corta pasó a 15 s.
- **Menos de 100 usuarios a la vez.** Con una rampa de 30 s y 3 iteraciones, los primeros usuarios terminaban antes de que arrancaran los últimos: el máximo fue de 81 y la métrica lo marcó como «No cumple», aunque el percentil 95 era de 40 ms. Con una rampa de 20 s y 5 iteraciones, los 100 coinciden.
- **Hallazgos medios de ZAP.** El primer escaneo encontró 4 medios y 4 bajos. Se corrigieron CORS, la CSP con comodín y con `unsafe-inline`, `Permissions-Policy` y el aislamiento contra Spectre. Queda solo el «Absence of Anti-CSRF Tokens» del formulario de `/restablecer`, que es un falso positivo: el token de un solo uso del enlace cumple esa función.
- **Lint.** ESLint revisaba el JavaScript del reporte HTML de JMeter. Se excluyó `tests/*/reportes/`.

**Revisión del sprint con el tutor**

[PENDIENTE: lo diligencia el equipo.]

**Retrospectiva**

[PENDIENTE: lo diligencia el equipo.]

**Pendientes que deja T8**

- **T5b:** con las llaves del Sandbox, correr `npm run pruebas -- recargas` con `PASARELA=wompi` y reemplazar la tasa de éxito y el tiempo de recarga.
- **Entrega:** adjuntar los reportes de la corrida final (`tests/*/reportes/`) a un *Release* de GitHub cuando exista el repositorio (HT-01).
- **T11:** lista OWASP MASVS de la app, accesibilidad (WCAG 2.1) y usabilidad (SUS) con personas.



## T9 · Base de la app móvil

- **Fecha:** 2026-11-18
- **Criterio de aceptación del plan:** «Existe una pantalla de catálogo que muestra todos los componentes y coincide con la página 02 de Figma». **Cumplido:**
  - `/catalogo` muestra, en el orden de Figma, los 30 íconos, los 14 componentes con sus variantes y la barra de navegación.
  - Se comparó lado a lado con las imágenes de la página 02 en un navegador de 390 px.
- **Requerimientos:** RNF-03 (tokens con expiración, nada sensible en el teléfono) y RNF-05 (WCAG 2.1 AA). Es la base de todas las historias en la app.

**Qué se construyó**

- **App Expo SDK 58** (React Native 0.88, React 19.3, TypeScript 6) en `apps/mobile`, dentro de los workspaces de npm.
- **Tokens de Figma** en `src/theme/tokens.ts`: 22 colores, 7 espacios, 5 radios, la sombra de la tarjeta y los 11 estilos de texto de Inter. La fuente va incluida en la app.
- **Los 14 componentes de la página 02, más la barra de navegación**, leídos con el MCP de Figma nodo por nodo.
  - Los 30 íconos y los gráficos (interruptor, radio y decoración de la tarjeta) son los SVG exportados de Figma.
  - Cada control tiene rol, etiqueta, estado y un área táctil de 44 px o más, y el texto crece con el tamaño de letra del teléfono hasta el doble.
- **Cliente HTTP:**
  - El token de acceso vive en memoria.
  - Lo renueva antes de que venza, o ante un 401, con una sola renovación aunque haya varias peticiones a la vez.
  - Si la sesión terminó, la cierra.
- **Almacén seguro:** el token de renovación va en `expo-secure-store`, solo con el teléfono desbloqueado. No se usa AsyncStorage.
- **Navegación:**
  - Rutas protegidas: sin sesión, las pantallas 1.1, 1.3 y 1.4; con sesión, cuatro pestañas (2.1, 3.1, 4.1 y 5.1) con la barra de Figma.
  - Las pantallas son marcadores con su número de Figma, que T10 reemplaza.
  - «Cerrar sesión» ya funciona.
- **Pruebas y verificación:**
  - Pruebas de componentes, cliente, almacén, sesión, navegación con las rutas reales y catálogo.
  - Lint con ESLint 9 de Expo.
  - Servicio de Docker `app-pruebas` (perfil `app`) para el lint, los tipos y las pruebas.

**Pruebas y resultados**

<!-- tabla: Pruebas de T9 -->
| Suite | Qué verifica | Pruebas |
|---|---|---|
| Componentes | Rol, etiqueta, estado, área de 44 px y colores de Figma de cada componente | 24 |
| Cliente HTTP | Bearer, renovación anticipada, renovación única con peticiones simultáneas, reintento ante 401, cierre de sesión, sin conexión y errores de la API | 12 |
| Sesión | Abrir sin sesión, recuperar la sesión guardada, ingresar y salir | 3 |
| Navegación | Ruta privada sin sesión → 1.1; pestañas con sesión; cerrar sesión desde 5.1 | 3 |
| Catálogo (criterio de aceptación) | Una sección por marco de la página 02, los 30 íconos y las variantes | 3 |
| Almacén y formato | SecureStore con `WHEN_UNLOCKED_THIS_DEVICE_ONLY`, sin AsyncStorage; pesos y número oculto | 10 |

- App: **55 de 55** (7 suites), también en Docker. API: **249 de 249**. Recaudo: **37 de 37**.
- Lint y tipos sin errores en todo el monorepo.

**Decisiones (ADR 0017)**

- El catálogo se verifica en la web contra Figma; cómo se ve en Android lo confirma el equipo con Expo Go.
- Íconos: se usan los SVG exportados de Figma en lugar de `lucide-react-native`, porque Figma ya los tiene dibujados.
- El token de renovación va en `expo-secure-store` y el de acceso solo en memoria.

**Problemas encontrados**

- **No hay emulador.** El equipo no tiene Xcode ni Android Studio. Se habilitó la versión web solo para desarrollo, y la revisión en Android queda en manos del equipo.
- **El panel del navegador buscaba su configuración en la carpeta original de OneDrive.** Para no escribir allí, Expo se levantó desde la terminal.
- **Testing Library 14 es asíncrono.** `render` y `fireEvent` devuelven promesas. La primera corrida tuvo 24 fallas por no esperarlas.
- **Propiedades de accesibilidad en los SVG.** En la web, React avisaba que no las reconoce. Se movieron a un contenedor con `aria-hidden`, que funciona en Android, iOS y la web.
- **`eslint-config-expo` no funciona con ESLint 10**, el de la raíz. La app usa ESLint 9 y su propio resolutor de importaciones de TypeScript.
- **El paquete `standard-navigation` de expo-router viene como módulo ES.** Se agregó a `transformIgnorePatterns` para las pruebas de navegación.

**Revisión del sprint con el tutor**

[PENDIENTE: lo diligencia el equipo.]

**Retrospectiva**

[PENDIENTE: lo diligencia el equipo.]

**Pendientes que deja T9**

- **Equipo:**
  - Abrir la app en un teléfono Android con Expo Go.
  - Comparar el catálogo con Figma y anotar cualquier diferencia de Android (sombras y redondeo del texto).
- **T10:**
  - Las 19 pantallas con estos componentes.
  - Pago PSE con `expo-web-browser` y el enlace `recargamio://recarga`.
  - Notificaciones push con `expo-notifications`, que necesitan una *development build* y una cuenta de Expo.
\n

## T10 · Pantallas de la app (HU-01 a HU-07)

- **Fecha:** 2026-11-18
- **Criterio de aceptación del plan:** «El flujo 1.1 → 2.1 → 3.1 → 3.3 → 3.4 → 4.1 funciona en un teléfono Android real contra la API en Docker». **Cumplido en parte:**
  - El flujo funciona en la versión web de la app contra la API en Docker, con la pasarela simulada: registro, agregar tarjeta, recarga con Nequi, recarga exitosa (de $6.000 a $26.000) e historial.
  - También pasa como prueba automatizada con las rutas reales.
  - **Falta la prueba en un teléfono Android real**, que hace el equipo con Expo Go.
- **Requerimientos:** HU-01 a HU-07, RNF-04 (Ley 1581 de 2012) y RNF-05 (WCAG 2.1 AA).

**Qué se construyó**

- **Las 19 pantallas de la página 03 de Figma**, leídas nodo por nodo con el MCP de Figma y armadas solo con los componentes de T9. Cada archivo lleva el número de la pantalla que implementa.
  - Acceso: 1.1 y 1.2 (ingreso y su error), 1.3 (crear cuenta) y 1.4 (recuperar contraseña).
  - Tarjetas: 2.1, 2.2, 2.3 y 2.4.
  - Recarga: 3.1 (con los datos de Nequi y PSE), 3.2 (a otra persona) y 3.3 a 3.5 en una sola ruta que cambia según el estado.
  - Historial y alertas: 4.1 y 4.2, más la bandeja de avisos de la campana.
  - Perfil: 5.1, 5.2, 5.3 y la rectificación de datos personales.
- **Política de tratamiento de datos:** un borrador (versión 1.0) que se puede leer antes de crear la cuenta. Está marcado como «Borrador pendiente de revisión».
- **Datos del servidor con TanStack Query:** ninguna pantalla llama a `fetch` directamente. La 3.3 consulta el estado cada 2 s hasta un estado final.
- **Pago:** la página de PSE o de Bancolombia se abre con `expo-web-browser`. La app no guarda el celular de Nequi ni los datos de PSE: solo viajan a la pasarela.
- **Notificaciones push:** en una *development build* de Android, la app registra el token de FCM y, al tocar un aviso, abre la recarga. En Expo Go y en la web los avisos quedan en la bandeja.
- **Ajustes pequeños al sistema de diseño**, detectados al leer las pantallas (ADR 0018): ícono final en `CampoTexto`, borde punteado en `Boton`, `Insignia` centrada, entre otros.
- **Capturas reales:** `npm run manual:capturas` recorre la app en la web con una cuenta desechable, toma 18 pantallas para el manual de usuario y al final elimina la cuenta.

**Pruebas y resultados**

<!-- tabla: Pruebas de T10 -->
| Suite | Qué verifica | Pruebas |
|---|---|---|
| Acceso (1.1 a 1.4) | Campos vacíos, intentos restantes y bloqueo (HU-06 CA-3 y CA-4); política obligatoria, contraseña segura y correo repetido (CA-1 y CA-2); mensaje genérico al recuperar | 10 |
| Tarjetas e historial (2.1 a 2.4 y 4.1) | Saldo bajo, 10 dígitos, error de tarjeta inexistente, límite de 5 (HU-07); renombrar, apagar la alerta y eliminar con confirmación; historial por fecha y con filtros (HU-03) | 6 |
| Recarga (3.1 a 3.5) | **El flujo del criterio de aceptación**; términos y celular obligatorios; datos de PSE; pago rechazado sin cobro (HU-02); recarga a otra persona con confirmación del número (HU-04) | 6 |
| Perfil y alertas (4.2 y 5.1 a 5.3) | Umbral de cada tarjeta (HU-05), bandeja de avisos, cerrar sesión, rectificación, autorización registrada, eliminar la cuenta con contraseña y ayuda | 7 |
| Pruebas de T9 | Componentes, cliente, sesión, navegación (ahora con la API falsa), catálogo, almacén y formato | 55 |

- App: **84 de 84** (11 suites), también en Docker. API: **249 de 249**. Recaudo: **37 de 37**.
- Las pruebas de pantallas usan una API falsa (`__tests__/ayudas/apiFalsa.ts`) que responde con los mismos códigos y mensajes que la real.
- Lint y tipos sin errores en todo el monorepo.

**Decisiones (ADR 0018)**

- **A.** Los datos del medio de pago van debajo del medio elegido: Nequi pide el celular; PSE pide tipo de persona, documento, banco y celular; Bancolombia no pide nada.
- **B.** Se agregó la casilla de los términos de la pasarela, que Wompi exige y Figma no tiene.
- **C.** «Cancelar recarga» (3.3) pasa a ser «Volver al inicio», porque un pago que ya está en la pasarela no se puede cancelar.
- **D.** La política de datos es un borrador que el equipo debe revisar antes de T11.
- **E.** Las confirmaciones usan el diálogo del sistema; renombrar y eliminar la cuenta usan `DialogoTexto`.
- **F.** Los cinco bloques se construyeron seguidos, con una sola actualización del manual al final.

**Problemas encontrados**

- **La API falsa devolvía los mismos objetos.** TanStack Query no veía el cambio después de una mutación. Ahora responde con copias (`structuredClone`).
- **La 3.3 no volvía a consultar al abrirse**, porque los datos recién creados se consideraban frescos. Se puso `staleTime: 0` en la consulta de la recarga.
- **`router.canGoBack()` durante el render** daba un valor viejo y una advertencia. Se cambió por el hook `useCanGoBack`.
- **`expo-notifications` avisa en Expo Go apenas se importa.** Se carga solo cuando hay push.
- **Reglas de hooks de React** (estado dentro de efectos y referencias leídas en el render). Se resolvieron remontando los formularios con `key`.
- **En las capturas, la barra de pestañas dejaba elementos ocultos duplicados.** El script solo toca los visibles.
- **Las corridas seguidas de capturas superaron el límite de 10 ingresos cada 15 minutos.** Se reinició la API para limpiar el contador en memoria y se eliminaron las cuentas que habían quedado. Ahora el script elimina su cuenta con el token del registro, sin volver a ingresar.
- **En la web, la sesión se pierde al recargar la página**, como se decidió en T9. Se documentó en la solución de problemas del capítulo 01.
- **En Docker (`app-pruebas`), 7 pruebas superaban el límite de 5 s de Jest.** En el contenedor las 11 suites corren en paralelo con menos recursos, y las de pantallas tardan más. Se subió `testTimeout` a 30 s; ahora pasan las 84 también en Docker.

**Revisión del sprint con el tutor**

[PENDIENTE: lo diligencia el equipo.]

**Retrospectiva**

[PENDIENTE: lo diligencia el equipo.]

**Pendientes que deja T10**

- **Equipo:**
  - Recorrer el flujo del criterio de aceptación en un teléfono Android con Expo Go contra la API en Docker (capítulo 01).
  - Revisar y aprobar el borrador de la política de datos, y definir el correo de contacto.
- **Notificaciones push reales:** proyecto de Firebase, `secrets/firebase.json`, cuenta de Expo y una *development build*.
- **T5b:** repetir el flujo con Wompi Sandbox cuando estén las llaves.
- **T11:** validación con usuarios (TRL 5).

## T11 · Validación TRL 5 (HT-03)

- **Fecha:** 2026-11-18
- **Alcance del plan:** «Despliegue en el entorno de pruebas, ejecución de todas las pruebas de la sección 10, revisión con TalkBack, lista MASVS diligenciada y resultados en `docs/metricas/`».
- **Resultado:**
  - Lo automatizable quedó hecho y medido sobre el código final.
  - Lo que depende de personas y de un teléfono Android quedó preparado (TalkBack y SUS), y entra solo a las métricas cuando el equipo llena las plantillas.
- **Requerimientos:** HT-03, metas de la Tabla 9 (usabilidad, accesibilidad y seguridad), plan de pruebas de la Tabla 18, RNF-03, RNF-04 y RNF-05.

**Qué se construyó**

- **Entorno de pruebas (HT-03):**
  - `npm run demo` levanta Docker, migra y siembra, escribe la IP del computador en la app y comprueba que la API responde en la red local.
  - Hay 15 tarjetas reservadas para participantes (`7740000001` a `7740000015`).
  - `npm run demo:exportar` y `npm run demo:limpiar` guardan los tiempos sin correos y borran las cuentas.
- **Accesibilidad:**
  - Una prueba de Jest recorre las 20 pantallas y estados de la app.
  - axe-core analiza las 18 pantallas de las capturas.
  - Hay una lista para TalkBack (`docs/metricas/wcag.md` y `datos/talkback.csv`).
- **Correcciones de accesibilidad** que salieron de la revisión:
  - Contraste: los textos en «terciario» y «éxito» pasan a tokens existentes.
  - Los enlaces dentro de las casillas de 1.3 y 3.1 pasan a botones de 48 px.
  - Atributos `aria-*`, porque react-native-web 0.21 ya no traduce `accessibilityState`.
  - El interruptor de `FilaAjuste` es decorativo.
  - La tarjeta MIO tiene alto mínimo.
  - La app gira con el teléfono (WCAG 1.3.4).
- **Lista OWASP MASVS** (`docs/metricas/masvs.md`): las ocho categorías, con la evidencia de cada control.
- **Seguridad automatizada:**
  - `npm run dependencias` (`npm audit` con excepciones justificadas).
  - `npm run registros` (busca datos sensibles en los registros de Docker).
  - Ambas corren dentro de `npm run pruebas`.
- **Usabilidad:**
  - Protocolo con consentimiento, guion, cuatro tareas y cuestionario SUS en español (`docs/metricas/protocolo-usabilidad.md`).
  - Plantilla `datos/sus.csv`.
  - `npm run metricas` calcula el SUS con su intervalo de confianza del 95 %, la tasa de éxito y el tiempo de cada tarea.
- **Manual:**
  - Capítulo nuevo «Validación TRL 5».
  - Sección «Accesibilidad» en el manual de usuario.
  - Capítulos 01, 02 y 04 actualizados.

**Pruebas y resultados (código final)**

<!-- tabla: Resultados de T11 frente a las metas -->
| Prueba | Resultado | Meta |
|---|---|---|
| Unitarias de la app | 104 de 104 (20 nuevas de accesibilidad), también en Docker | Todas en verde |
| Unitarias de la API y del recaudo | 249 de 249 y 37 de 37 | Todas en verde |
| API (Newman) | 87 de 87 aserciones | Respuestas según el contrato |
| Integración | 200 de 200 recargas acreditadas; percentil 95 del tiempo de recarga: 4,0 s | ≥ 98 % y ≤ 180 s |
| Carga (JMeter, 100 usuarios) | Percentil 95: 0,02 s; 0 % de errores | ≤ 2 s |
| Seguridad (ZAP) | 0 altos, 1 medio y 2 bajos, justificados | 0 críticos o altos |
| Accesibilidad automática | App: 0 problemas en 20 pantallas. axe-core: 0 críticos en 18 pantallas; quedan avisos «label-content-name-mismatch» aceptados con justificación | 0 incumplimientos críticos |
| Dependencias (`npm audit`) | 0 críticos; 3 altos de la herramienta de línea de comandos de Prisma, aceptados | 0 críticos; altos solo con justificación |
| Registros | 0 tokens, contraseñas, celulares, correos, documentos o llaves | 0 coincidencias |
| TalkBack y SUS | Pendientes del equipo | 0 críticos; SUS ≥ 68 |

- Lint y tipos sin errores en todo el monorepo.

**Decisiones (ADR 0019)**

- **A.** El entorno de pruebas es el computador del equipo con los teléfonos en la misma Wi-Fi; no se despliega en la nube.
- **B.** Participantes sin datos reales: nombre «Participante NN», correo `pNN@usuarios.test` y contraseña inventada.
- **C.** Accesibilidad en tres partes: Jest, axe-core y TalkBack.
- **D.** SUS en papel, transcrito a CSV; ningún formulario en línea.
- **E.** Contraste corregido con tokens existentes, sin colores nuevos. El equipo eligió esta opción cuando la revisión encontró el problema. **Figma debe actualizar esos usos.**

**Problemas encontrados**

- **El recaudo simulado escribía la llave `X-Api-Key` en sus registros.** La revisión automática de registros lo encontró. Ahora registra solo el método y la URL.
- **`nodemailer` 7 tenía avisos altos de inyección en SMTP.** Se actualizó a la versión 10 y se comprobó el correo de recuperación en Mailpit.
- **Prisma tiene tres avisos altos** (`deepmerge-ts`) cuya corrección es Prisma 7, un cambio mayor. Se aceptan con justificación: la herramienta solo corre al migrar, con archivos del repositorio.
- **Dos colores de Figma no llegaban a 4,5:1** en texto pequeño. Se usaron tokens existentes.
- **react-native-web 0.21 ignora `accessibilityState`.** En la web no se anunciaban los estados (marcado, seleccionado). Se cambió por atributos `aria-*`.
- **El equipo se durmió durante una corrida** (sin cargador). La integración tardó 575 s, quedaron 5 recargas pendientes y `npm audit` se quedó sin red. Esa corrida se descartó y se repitió con el equipo despierto: 200 de 200 en 165 s.
  - **Recomendación:** correr `npm run pruebas` con el cargador conectado y la tapa abierta.
- **En la primera corrida completa, la revisión de registros encontró 8 números de 10 dígitos que empiezan por 3** (forma de celular) en la API. No se pudieron ubicar porque la API se recreó al terminar, y no aparecieron en las cuatro corridas siguientes (Newman, integración, JMeter y ZAP).
  - El script ahora anota en qué campo aparece cada coincidencia, sin el dato, para encontrarlo si vuelve.
  - Probablemente es una cadena aleatoria, como el `etag` de una respuesta. **Queda abierto.**
- **Un participante de ensayo (P99)** sirvió para probar `demo:exportar` y `demo:limpiar`. Su archivo exportado se borró para no mezclarlo con los datos reales.

**Revisión del sprint con el tutor**

[PENDIENTE: lo diligencia el equipo.]

**Retrospectiva**

[PENDIENTE: lo diligencia el equipo.]

**Pendientes que deja T11 (equipo)**

1. Recorrer el flujo de T10 en un teléfono Android con Expo Go (`npm run demo`).
2. Revisión con TalkBack: llenar `docs/metricas/datos/talkback.csv`.
3. Aprobar el borrador de la política de datos y definir el correo de contacto.
4. Hacer las 15 sesiones de usabilidad y pasar las respuestas a `docs/metricas/datos/sus.csv`. Después, `npm run demo:limpiar`, `npm run metricas` y `npm run manual`.
5. Actualizar en Figma los textos que usaban «terciario» y «éxito».
6. T5b: con las llaves del Sandbox de Wompi en `.env`, repetir `npm run pruebas`.

