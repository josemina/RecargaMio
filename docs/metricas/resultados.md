<!-- Archivo generado por «npm run metricas» (scripts/metricas.mjs). No lo edites a mano: vuelve a correr las pruebas. -->
# Resultados de las pruebas

Fecha de generación: 18 de noviembre de 2026, 18:39 (hora de Colombia).

Las metas son las de la Tabla 9 y los criterios de aceptación de la Tabla 18 del documento maestro. Las métricas se reportan con media, mediana y percentil 95, y la tasa de éxito con su intervalo de confianza del 95 %.

## Resumen frente a las metas

<!-- tabla: Resultados de las pruebas frente a las metas de la Tabla 9 -->
| Indicador | Meta | Resultado | Veredicto |
|---|---|---|---|
| Tiempo de recarga (percentil 95) | ≤ 180 s | 4,0 s | **Cumple** |
| Éxito de pagos | ≥ 98 % | 100,0 % (IC 95 %: 98,1 %–100,0 %) | **Cumple** |
| Tiempo de respuesta (percentil 95) | ≤ 2 s con 100 usuarios | 0,02 s con 100 usuarios; 0,0 % de errores | **Cumple** |
| Pruebas de API (Tabla 18) | Respuestas según el contrato | 87 de 87 aserciones | **Cumple** |
| Seguridad (ZAP) | 0 vulnerabilidades críticas o altas | altos: 0 · medios: 1 · bajos: 2 | **Cumple** |
| Accesibilidad (WCAG 2.1 AA) | 0 incumplimientos críticos | app: 0 problemas · axe: 0 críticos sin justificar · TalkBack: 0 de 21 pantallas | **Pendiente** (TalkBack) |
| Dependencias (npm audit) | 0 críticas; altas solo con justificación | críticas: 0 · altas: 3 (3 aceptadas) | **Cumple con observación** |
| Registros sin datos sensibles (MASVS) | 0 coincidencias | 0 coincidencias | **Cumple** |
| Usabilidad (SUS) | ≥ 68 | sin datos: prueba con usuarios pendiente | **Pendiente** |
| Recarga en la prueba de usabilidad (percentil 95) | ≤ 180 s | sin datos | **Pendiente** |

Las filas de accesibilidad, dependencias, registros y usabilidad se agregaron en T11 (ADR 0019). La revisión con TalkBack y la prueba SUS las hace el equipo con personas; mientras falten, su veredicto dice «Pendiente».

## Tiempo de recarga y éxito de pagos (prueba de integración)

Corrida del 18 de noviembre de 2026, 18:32 (hora de Colombia): 200 recargas de punta a punta con el usuario `integracion@recargamio.test`, 5 a la vez, contra la pasarela **simulada** y el recaudo simulado. Duración: 165 s.

> **Cómo leer este resultado.** Con la pasarela simulada, los datos de prueba que aprueban siempre aprueban. La tasa mide que el **flujo completo** (pago, webhook firmado, acreditación idempotente en el recaudo y consulta del estado) funcione sin perder recargas; no mide la confiabilidad de Wompi. El número definitivo de la Tabla 9 se obtiene repitiendo esta prueba con el Sandbox de Wompi (T5b). Decisión D del ADR 0016.

<!-- tabla: Tiempo de recarga y éxito de pagos frente a las metas de la Tabla 9 -->
| Indicador | Resultado | Meta (Tabla 9) | Veredicto |
|---|---|---|---|
| Recargas iniciadas | 200 | ≥ 200 (Tabla 18) | **Cumple** |
| Recargas acreditadas | 200 (100,0 %) | ≥ 98 % | **Cumple** |
| Intervalo de confianza del 95 % de la tasa (Wilson) | 98,1 % a 100,0 % | — | — |
| Tiempo de recarga: media | 4,0 s | — | — |
| Tiempo de recarga: mediana | 4,0 s | — | — |
| Tiempo de recarga: percentil 95 | 4,0 s | ≤ 180 s | **Cumple** |
| Tiempo de recarga: máximo | 4,1 s | ≤ 180 s | **Cumple** |

El tiempo de recarga es `acreditadaEn − iniciadaEn`, medido por la API. Con la pasarela simulada incluye la demora configurada en `PASARELA_SIMULADA_DEMORA_MS` (4 s por defecto), que imita la espera de la confirmación.

<!-- tabla: Resultado de la prueba de integración por medio de pago -->
| Medio de pago | Iniciadas | Acreditadas | Tasa | Mediana del tiempo | Percentil 95 del tiempo |
|---|---|---|---|---|---|
| Nequi | 67 | 67 | 100,0 % | 4,0 s | 4,0 s |
| PSE | 67 | 67 | 100,0 % | 4,0 s | 4,0 s |
| Bancolombia | 66 | 66 | 100,0 % | 4,0 s | 4,0 s |

## Tiempo de respuesta con 100 usuarios simultáneos (prueba de carga)

Corrida del 18 de noviembre de 2026, 15:24 (hora de Colombia) con JMeter 5.6.3: 100 usuarios simultáneos como máximo, 3851 peticiones en 60 s. Cada usuario ingresa una vez y luego, en cada iteración, consulta sus tarjetas y su historial, hace una recarga con Nequi y consulta el estado hasta que termina, con pausas de 0,5 a 1,5 s.

<!-- tabla: Tiempos de respuesta de la API por endpoint con 100 usuarios simultáneos -->
| Petición | Muestras | Errores | Media | Mediana | Percentil 95 | Máximo | Veredicto (p95 ≤ 2 s) |
|---|---|---|---|---|---|---|---|
| `GET /recargas/{id}` | 2251 | 0 (0,0 %) | 0,00 s | 0,00 s | 0,01 s | 0,08 s | **Cumple** |
| `GET /tarjetas` | 500 | 0 (0,0 %) | 0,01 s | 0,01 s | 0,01 s | 0,10 s | **Cumple** |
| `GET /tarjetas/{id}/movimientos` | 500 | 0 (0,0 %) | 0,01 s | 0,01 s | 0,02 s | 0,09 s | **Cumple** |
| `POST /auth/ingreso` | 100 | 0 (0,0 %) | 0,10 s | 0,09 s | 0,13 s | 0,46 s | **Cumple** |
| `POST /recargas` | 500 | 0 (0,0 %) | 0,02 s | 0,01 s | 0,03 s | 0,14 s | **Cumple** |
| **Total** | 3851 | 0 (0,0 %) | 0,01 s | 0,01 s | 0,02 s | 0,46 s | **Cumple** |

## Contrato de la API (Postman y Newman)

Corrida del 18 de noviembre de 2026, 15:24 (hora de Colombia): la colección `tests/postman/RecargaMIO.postman_collection.json` crea una cuenta, recorre registro, ingreso, tarjetas, alerta, recargas aprobada y rechazada, webhook con firma falsa, notificaciones y cierre de sesión, y al final elimina la cuenta.

<!-- tabla: Resultado de la colección de Postman ejecutada con Newman -->
| Indicador | Resultado |
|---|---|
| Peticiones ejecutadas | 46 (0 fallidas) |
| Aserciones | 87 (0 fallidas) |
| Tiempo medio de respuesta | 27 ms |
| Duración | 10 s |

## Seguridad (OWASP ZAP)

Escaneo de la API del 18 de noviembre de 2026, 15:23 (hora de Colombia) con ZAP 2.16.1 (`zap-api-scan`), a partir del contrato OpenAPI y con la sesión del usuario `zap@recargamio.test`. ZAP no tiene nivel «crítico»: su nivel más grave es «alto». Las reglas tratadas, con su justificación, están en `tests/seguridad/reglas-zap.conf`; ninguna se esconde del reporte.

<!-- tabla: Hallazgos de OWASP ZAP por nivel de riesgo -->
| Riesgo | Tipos de hallazgo |
|---|---|
| Alto | 0 |
| Medio | 1 |
| Bajo | 2 |
| Informativo | 4 |

<!-- tabla: Detalle de los hallazgos de OWASP ZAP y su tratamiento -->
| Regla | Hallazgo | Riesgo | Instancias | Tratamiento |
|---|---|---|---|---|
| 10202 | Absence of Anti-CSRF Tokens | Medio | 2 | Falso positivo. El formulario de /restablecer lleva el token de recuperación: secreto, de un solo uso, de 30 minutos y ligado a la cuenta. Un sitio ajeno no lo conoce y la ruta no usa cookies de sesión, así que no hay CSRF posible. |
| 100001 | Unexpected Content-Type was returned | Bajo | 257 | Esperado. /restablecer y /pasarela-simulada/* son páginas HTML por diseño y el contrato OpenAPI las declara como text/html. |
| 10116 | ZAP is Out of Date | Bajo | 1 | Aceptado. La imagen de ZAP tiene versión fija para que las corridas se puedan repetir; se actualiza a propósito, no en cada corrida. |
| 100000 | A Client Error response code was returned by the server | Informativo | 1524 | Esperado. ZAP envía datos inválidos a propósito y la API responde 400, 401, 404 o 422 como dice el contrato. |
| 10024 | Information Disclosure - Sensitive Information in URL | Informativo | 1 | Aceptado. El enlace del correo de recuperación lleva el token en la URL, como todo enlace de recuperación. Mitigación: un solo uso, 30 minutos, Referrer-Policy no-referrer y el token se oculta en los registros. |
| 10049 | Non-Storable Content | Informativo | 13 | Esperado. Las respuestas con datos personales no deben guardarse en caché. |
| 10104 | User Agent Fuzzer | Informativo | 12 | Esperado. ZAP repite peticiones con distintos User-Agent y la API responde igual a todos: no cambia su comportamiento según el navegador. |

## Accesibilidad (WCAG 2.1 AA)

La revisión tiene tres partes, descritas en `docs/metricas/wcag.md`: una prueba automática de cada pantalla de la app, axe-core sobre la versión web y la revisión con TalkBack en un teléfono Android.

**Prueba automática de la app** (18 de noviembre de 2026, 18:35 (hora de Colombia)): 20 pantallas y estados, 156 controles y 18 campos de texto revisados; ninguno sin rol, sin etiqueta o con menos de 44 px.

<!-- tabla: Revisión automática de accesibilidad por pantalla -->
| Pantalla | Controles | Campos | Problemas |
|---|---|---|---|
| 1.1 Inicio de sesión | 4 | 2 | Ninguno |
| 1.3 Crear cuenta | 5 | 4 | Ninguno |
| 1.4 Recuperar contraseña | 2 | 1 | Ninguno |
| Política de tratamiento de datos | 0 | 0 | Ninguno |
| 2.1 Mis tarjetas | 10 | 0 | Ninguno |
| 2.2 Agregar tarjeta | 1 | 2 | Ninguno |
| 2.3 Detalle de tarjeta | 6 | 0 | Ninguno |
| 3.1 Recargar saldo | 17 | 0 | Ninguno |
| 3.2 Recargar a otra persona | 12 | 2 | Ninguno |
| 4.1 Historial | 8 | 0 | Ninguno |
| 4.2 Alertas de saldo bajo | 9 | 0 | Ninguno |
| Bandeja de avisos | 0 | 0 | Ninguno |
| 5.1 Perfil | 10 | 0 | Ninguno |
| 5.2 Privacidad y datos | 4 | 0 | Ninguno |
| Datos personales | 2 | 2 | Ninguno |
| 5.3 Ayuda y PQR | 6 | 0 | Ninguno |
| 2.4 Límite de tarjetas | 2 | 2 | Ninguno |
| 3.3 Esperando confirmación | 19 | 1 | Ninguno |
| 3.4 Recarga exitosa | 19 | 1 | Ninguno |
| 3.5 Pago rechazado | 20 | 1 | Ninguno |

**axe-core** (axe-core 4.14.1, WCAG 2.0 y 2.1, niveles A y AA; 18 de noviembre de 2026, 18:39 (hora de Colombia)): 18 pantallas analizadas en el mismo estado de las capturas del manual.

<!-- tabla: Resultados de axe-core por pantalla -->
| Pantalla | Reglas aprobadas | Incumplimientos | Aceptados con justificación |
|---|---|---|---|
| 1.1 Inicio de sesión | 22 | Ninguno | Ninguno |
| 1.2 Error de ingreso | 22 | Ninguno | Ninguno |
| 1.3 Crear cuenta | 23 | Ninguno | Ninguno |
| 1.4 Recuperar contraseña | 22 | Ninguno | Ninguno |
| 2.1 Mis tarjetas | 22 | Ninguno | label-content-name-mismatch (serious, 2) |
| 2.3 Detalle de tarjeta | 20 | Ninguno | Ninguno |
| 2.2 Agregar tarjeta | 22 | Ninguno | Ninguno |
| 3.1 Recargar saldo | 27 | Ninguno | label-content-name-mismatch (serious, 1) |
| 3.3 Esperando confirmación | 20 | Ninguno | Ninguno |
| 3.4 Recarga exitosa | 19 | Ninguno | Ninguno |
| 4.1 Historial | 23 | Ninguno | label-content-name-mismatch (serious, 1) |
| 3.5 Pago rechazado | 19 | Ninguno | Ninguno |
| 3.2 Recargar a otra persona | 24 | Ninguno | Ninguno |
| Bandeja de avisos | 18 | Ninguno | label-content-name-mismatch (serious, 1) |
| 5.1 Perfil | 22 | Ninguno | Ninguno |
| 4.2 Alertas de saldo bajo | 20 | Ninguno | Ninguno |
| 5.2 Privacidad y datos | 19 | Ninguno | label-content-name-mismatch (serious, 2) |
| 5.3 Ayuda y PQR | 19 | Ninguno | Ninguno |

- **label-content-name-mismatch**: Revisado: las etiquetas empiezan con el texto visible del control (por ejemplo, «Mi tarjeta»), pero leen los montos como «6.000 pesos» en lugar de «$6.000», porque TalkBack lee el símbolo como «dólares» (ADR 0017). En las filas con descripción (5.2) es un falso positivo: axe une el título y la descripción, que van en dos renglones, sin un espacio entre ellos.

**Revisión con TalkBack:** pendiente. La hace el equipo en un teléfono Android con `docs/metricas/datos/talkback.csv` (instrucciones en `docs/metricas/wcag.md`).

## Dependencias y registros (lista MASVS)

La lista completa de controles está en `docs/metricas/masvs.md`. Estas dos revisiones corren solas dentro de `npm run pruebas`.

**Dependencias** (`npm audit`, 18 de noviembre de 2026, 18:35 (hora de Colombia)):

<!-- tabla: Avisos de seguridad de las dependencias según npm audit -->
| Alcance | Críticos | Altos | Moderados | Bajos |
|---|---|---|---|---|
| Todas las dependencias | 0 | 3 | 30 | 0 |
| Solo las de producción | 0 | 3 | 28 | 0 |

<!-- tabla: Avisos altos o críticos de las dependencias y su tratamiento -->
| Paquete | Severidad | Corrección disponible | Tratamiento |
|---|---|---|---|
| `@prisma/config` | Alta | prisma@7.10.1 (cambio mayor) | Llega con prisma: carga la configuración de Prisma desde el repositorio al migrar. Misma justificación que prisma. |
| `deepmerge-ts` | Alta | prisma@7.10.1 (cambio mayor) | Agotamiento de pila al combinar objetos con referencias circulares (GHSA-ggr8-5vv4-36mx). Solo lo usa @prisma/config con la configuración del repositorio, nunca con datos que envía un usuario. Misma justificación que prisma. |
| `prisma` | Alta | prisma@7.10.1 (cambio mayor) | La herramienta de línea de comandos de Prisma solo corre al migrar y sembrar la base, con archivos del propio repositorio; no recibe datos de los usuarios. La corrección exige pasar a Prisma 7, un cambio mayor (adaptadores de base de datos y nueva configuración) que no cabe antes de la entrega. Queda para después del PMV. |

**Registros** (18 de noviembre de 2026, 18:35 (hora de Colombia)): 2226 líneas de la API y 5677 del recaudo simulado, revisadas después de las pruebas.

<!-- tabla: Datos sensibles buscados en los registros de Docker -->
| Dato buscado | API | Recaudo simulado |
|---|---|---|
| Token JWT (de acceso) | 0 | 0 |
| Encabezado Authorization con token | 0 | 0 |
| Contraseña con valor | 0 | 0 |
| Token de recuperación en una URL | 0 | 0 |
| Token de renovación con valor | 0 | 0 |
| Número de celular (Nequi o PSE) | 0 | 0 |
| Correo electrónico | 0 | 0 |
| Número de documento de PSE | 0 | 0 |
| Llave o secreto de Wompi | 0 | 0 |
| Llave del recaudo (X-Api-Key) con valor | 0 | 0 |

## Usabilidad (SUS y tareas)

**Pendiente.** La prueba con 15 personas la hace el equipo con el protocolo de `docs/metricas/protocolo-usabilidad.md`; los resultados se escriben en `docs/metricas/datos/sus.csv` y aparecen aquí al correr `npm run metricas`.
