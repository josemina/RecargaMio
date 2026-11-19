# Lista OWASP MASVS

Lista de verificación de seguridad de la app y de la API según OWASP MASVS 2, con las ocho categorías de la sección 9 del plan. La diligenció el equipo de desarrollo en T11 (ADR 0019) revisando el código, las pruebas y los reportes que se citan en cada fila.

Cada control tiene uno de estos resultados:
- **Cumple:** hay evidencia en el código y una prueba o un reporte que lo verifica.
- **Cumple con observación:** cumple para el prototipo, con un límite que se explica.
- **Lo revisa el equipo:** solo se puede comprobar en un teléfono Android real.
- **Fuera del PMV:** no se implementó en esta entrega y queda como trabajo futuro.

Los conteos de `npm audit` y de la revisión de registros salen de `docs/metricas/datos/` y se presentan en «Resultados de las pruebas».

## MASVS-STORAGE · Almacenamiento

<!-- tabla: MASVS-STORAGE: controles de almacenamiento -->
| Control | Cómo se cumple | Evidencia | Resultado |
|---|---|---|---|
| Secretos fuera del código | Todo sale de `.env`, que está en `.gitignore`; la API valida la configuración con `zod` al arrancar y no arranca con llaves de Wompi que no sean de prueba | `services/api/src/config.ts`, `.gitignore` | Cumple |
| Sesión en el teléfono | El token de renovación va en `expo-secure-store` con `WHEN_UNLOCKED_THIS_DEVICE_ONLY`; el de acceso solo en memoria. No se usa AsyncStorage | `apps/mobile/src/sesion/almacen.ts`, prueba `almacen.test.ts` | Cumple |
| Nada sensible en los registros | Los registros de la API ocultan el encabezado `Authorization` y el token de la URL de recuperación. **En T11 la revisión encontró que el recaudo simulado escribía la llave `X-Api-Key`; se corrigió** y ahora solo registra el método y la URL | `npm run registros` (`scripts/revisar-registros.mjs`), `recaudo-sim/src/app.ts` | Cumple |
| Número de la tarjeta MIO | Cifrado con AES-256-GCM en la base y HMAC para detectar duplicados; la app solo muestra los últimos 4 dígitos | `services/api/src/seguridad/cifradoTarjeta.ts` (ADR 0009) | Cumple |
| Datos bancarios | La app y la API nunca guardan números de cuentas ni de tarjetas bancarias. El celular de Nequi y el documento de PSE solo viajan a la pasarela | Modelo de datos, `modulos/recargas/servicio.ts`, prueba del criterio de aceptación de T10 | Cumple |
| Copias de seguridad de Android | `expo-secure-store` excluye sus datos de la copia automática de Android con su configuración por defecto | `app.json` (plugin `expo-secure-store`) | Lo revisa el equipo en la *development build* |
| Pantalla en el selector de aplicaciones | La app no oculta su contenido en las capturas ni en el selector de aplicaciones (`FLAG_SECURE`) | — | Fuera del PMV: se recomienda antes de un piloto con dinero real |

## MASVS-CRYPTO · Criptografía

<!-- tabla: MASVS-CRYPTO: controles de criptografía -->
| Control | Cómo se cumple | Evidencia | Resultado |
|---|---|---|---|
| Contraseñas | Hash argon2id; nunca se guardan ni se registran en claro | `modulos/auth/servicio.ts`, pruebas de HU-06 | Cumple |
| Tokens de sesión y de recuperación | En la base solo se guarda su HMAC; el JWT se firma con una llave de `.env` | `seguridad/tokens.ts` (ADR 0011) | Cumple |
| Firmas de Wompi | Firma de integridad y checksum del webhook con SHA256, comparados en tiempo constante | `integraciones/pasarela/firmas.ts`, pruebas de T5a | Cumple |
| Llaves compartidas | La llave entre la API y el recaudo se compara en tiempo constante | `recaudo-sim/src/autenticacion.ts` | Cumple |

## MASVS-AUTH · Autenticación y autorización

<!-- tabla: MASVS-AUTH: controles de autenticación y autorización -->
| Control | Cómo se cumple | Evidencia | Resultado |
|---|---|---|---|
| Sesiones cortas y revocables | JWT de 15 minutos y token de renovación rotativo de 7 días con detección de reúso; cerrar sesión lo revoca | ADR 0011, pruebas de HU-06, colección de Postman | Cumple |
| Bloqueo por intentos | Cinco intentos fallidos bloquean el ingreso 15 minutos | Pruebas de HU-06 CA-4, pantalla 1.2 | Cumple |
| Recuperación de contraseña | Enlace de un uso y 30 minutos; la respuesta es igual exista o no el correo | Pruebas de HU-06 CA-5 | Cumple |
| Acceso solo a lo propio | Cada consulta filtra por el usuario de la sesión; la tarjeta o la recarga de otro responde 404 | Pruebas de T4 y T5a, colección de Postman | Cumple |
| Acciones delicadas | Eliminar la cuenta y cambiar el correo piden la contraseña | Pruebas de T7 y de la pantalla 5.2 | Cumple |
| Renovación en la app | Una sola renovación aunque varias peticiones la necesiten; si falla, la sesión se cierra | `apps/mobile/src/api/cliente.ts`, prueba `cliente.test.ts` | Cumple |

## MASVS-NETWORK · Comunicación

<!-- tabla: MASVS-NETWORK: controles de comunicación -->
| Control | Cómo se cumple | Evidencia | Resultado |
|---|---|---|---|
| Encabezados de seguridad | `helmet` con CSP estricta, HSTS, CORP, COEP, COOP y `Permissions-Policy` | Prueba `seguridad-encabezados.test.ts`, reporte de ZAP | Cumple |
| CORS cerrado | Solo los orígenes de `CORS_ORIGENES`; vacío en una demostración | `app.ts` (ADR 0016) | Cumple |
| Escaneo de la API | OWASP ZAP con el contrato OpenAPI y una sesión válida: cero hallazgos altos | `npm run pruebas`, «Resultados de las pruebas» | Cumple |
| Webhook firmado | Checksum verificado antes de leer el evento; si falla, 401 | Pruebas de T5a (regla 4 de `CLAUDE.md`) | Cumple |
| Cifrado en tránsito | La API envía HSTS, pero en el entorno de pruebas la app habla HTTP con la IP del computador en la red local (Expo Go) | `apps/mobile/.env`, capítulo 01 | Cumple con observación: en un despliegue real la API va detrás de HTTPS |

## MASVS-PLATFORM · Interacción con la plataforma

<!-- tabla: MASVS-PLATFORM: controles de interacción con la plataforma -->
| Control | Cómo se cumple | Evidencia | Resultado |
|---|---|---|---|
| Enlaces profundos | El esquema `recargamio://` solo abre rutas de la app; las privadas exigen sesión (`Stack.Protected`) y la API valida y autoriza cada identificador | `src/app/_layout.tsx`, prueba `navegacion.test.tsx` | Cumple |
| Datos de las notificaciones | El aviso solo lleva el identificador de la recarga o de la tarjeta; la app lo usa para pedir el dato a la API con la sesión | `src/sesion/push.ts`, ADR 0014 | Cumple |
| Páginas de pago | PSE y Bancolombia se abren en el navegador del sistema (`expo-web-browser`), no en un WebView: la app no ve los datos bancarios | `src/pantallas/recarga/usePago.ts` (ADR 0018) | Cumple |
| Accesibilidad | Rol, etiqueta, estado y 44 px en cada control de las 20 pantallas; contraste de 4,5:1 | `accesibilidad.test.tsx`, axe-core, `docs/metricas/wcag.md` | Cumple en las pruebas automáticas; TalkBack lo revisa el equipo |

## MASVS-CODE · Calidad del código

<!-- tabla: MASVS-CODE: controles de calidad del código -->
| Control | Cómo se cumple | Evidencia | Resultado |
|---|---|---|---|
| Validación de entradas | Esquemas `zod` en cada ruta de la API y del recaudo, y en los formularios de la app | Rutas de la API, `apps/mobile/src/utilidades/validacion.ts` | Cumple |
| Sin SQL concatenado | Prisma con consultas parametrizadas | Código de la API y del recaudo | Cumple |
| Dependencias | `npm audit` en cada corrida de pruebas. **En T11 se actualizó `nodemailer` a la versión 10** por avisos de inyección en SMTP. Quedan tres avisos altos de la herramienta de línea de comandos de Prisma, aceptados con justificación | `npm run dependencias`, `tests/seguridad/dependencias-aceptadas.json` | Cumple con observación: pasar a Prisma 7 después del PMV |
| Tipos y lint | TypeScript estricto y ESLint en todo el monorepo | `npm run lint`, `npm run typecheck` | Cumple |

## MASVS-RESILIENCE · Resistencia

<!-- tabla: MASVS-RESILIENCE: controles de resistencia -->
| Control | Cómo se cumple | Evidencia | Resultado |
|---|---|---|---|
| Límite de peticiones | Por IP: 10 ingresos y 5 recuperaciones cada 15 minutos, 300 peticiones generales | `middleware/limites.ts`, prueba de carga con JMeter | Cumple |
| Documentación oculta en producción | `/docs` no existe con `NODE_ENV=production` | `app.ts` (ADR 0016) | Cumple |
| Detección de root, depuración o manipulación | No se implementó: el perfil R de MASVS es opcional y el prototipo no maneja dinero real | — | Fuera del PMV |

## MASVS-PRIVACY · Privacidad

<!-- tabla: MASVS-PRIVACY: controles de privacidad -->
| Control | Cómo se cumple | Evidencia | Resultado |
|---|---|---|---|
| Autorización expresa (Ley 1581 de 2012) | No se crea una cuenta sin `aceptaPolitica: true`; se guardan la versión de la política, la fecha y la IP | Pruebas de HU-06 CA-2 y de la pantalla 1.3 | Cumple |
| Texto de la política | La app muestra un borrador (versión 1.0) marcado como pendiente de revisión | `src/app/politica.tsx` (ADR 0018) | Cumple con observación: el equipo debe aprobarlo antes de usar la app con personas |
| Supresión y rectificación | Eliminar la cuenta borra o anonimiza los datos; el nombre y el correo se pueden corregir | Pruebas de T7 y de la pantalla 5.2 | Cumple |
| Datos mínimos | Las recargas conservan solo los últimos 4 dígitos de la tarjeta de destino después de eliminar la cuenta | ADR 0015 | Cumple |
| Participantes de la validación | Usan correos de prueba asignados (`p01@usuarios.test`); sus cuentas se borran al terminar y solo se exportan sus tiempos con un código | `npm run demo:limpiar`, ADR 0019 | Cumple |

## Lo que revisa el equipo en el teléfono

<!-- tabla: Revisión MASVS en el teléfono Android -->
| Revisión | Cómo hacerla | Resultado esperado |
|---|---|---|
| Sesión al cerrar la app | Ingresar, cerrar la app desde el selector y volver a abrirla | Entra sin pedir la contraseña; al cerrar sesión, ya no |
| Sesión con el teléfono bloqueado | Bloquear el teléfono con la app abierta y desbloquearlo | La sesión sigue; nada se muestra sobre la pantalla de bloqueo |
| Registros del teléfono | Con el teléfono conectado, `adb logcat \| grep -i -E "token\|contrase"` mientras se ingresa y se recarga | Ninguna línea con tokens ni contraseñas |
| Página de pago | Pagar con PSE en la pasarela simulada | La página del banco se abre en el navegador del sistema y, al volver, la app muestra el estado |
