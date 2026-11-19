# ADR 0016 · Pruebas de API, integración, carga y seguridad, y métricas

- **Estado:** aceptada (T8)
- **Fecha:** 2026-11-18
- **Requerimientos:** RNF-01 (tiempo de recarga y de respuesta), RNF-02 (éxito de pagos), RNF-03 (seguridad). Tabla 9 (metas) y Tabla 18 (plan de pruebas) del documento maestro.
- **Plan relacionado:** sección 10, T8: «`openapi.yaml` completo, `/docs`, colección de Postman con pruebas, plan de JMeter con 100 hilos, configuración de ZAP, script de 200 recargas y `npm run metricas`».

## Contexto
La Tabla 18 exige cuatro pruebas además de las unitarias:
- **De API:** con Postman, con respuestas según el contrato.
- **De integración:** al menos 200 transacciones, con 98 % o más aprobadas.
- **De carga:** con 100 usuarios simultáneos y percentil 95 de 2 s o menos.
- **De seguridad:** sin hallazgos críticos ni altos.

Las cuatro deben correr desde Docker y dejar reportes en `tests/` y `docs/metricas/`.

## Decisiones aprobadas por el equipo
- **A. Límites de peticiones durante las pruebas.**
  - Todas las pruebas salen de una sola IP y chocarían con los límites de la API (10 ingresos y 300 peticiones cada 15 minutos). La primera corrida de las 200 recargas lo comprobó: 429 `DEMASIADAS_PETICIONES` desde la recarga 30.
  - Se agrega la variable `LIMITES_PETICIONES`:
    - Por defecto vale `normal`.
    - El valor `desactivados` solo se acepta fuera de producción; la configuración lo rechaza con `NODE_ENV=production`.
    - Cuando están desactivados, la API lo advierte en el registro.
  - `npm run pruebas` reinicia la API con los límites desactivados, corre las pruebas y al final la restaura con los límites normales, aunque alguna prueba falle.
  - Cada comando de `docker compose` debe llevar la variable. Si a uno le falta, compose vuelve a crear la API con los límites normales.
  - *Alternativa descartada:* una segunda API solo para pruebas. La pasarela simulada guarda su estado en memoria y el webhook llega a la misma instancia, así que dos instancias se estorbarían.
- **B. OpenAPI escrito a mano.**
  - El contrato está en `services/api/openapi.yaml`, en OpenAPI 3.1.
  - La prueba `tests/openapi.test.ts` evita que se desactualice:
    - Lee las rutas de `app.ts` y de cada `rutas.ts` y exige que coincidan con el contrato, en los dos sentidos.
    - Verifica que cada operación documentada exista en la aplicación.
    - Verifica que cada `$ref` apunte a algo que exista.
  - *Alternativa descartada:* generarlo desde los esquemas `zod`. Obligaba a refactorizar todas las rutas a mitad del proyecto.
- **C. `/docs` solo fuera de producción.**
  - Swagger UI queda en `/docs` y el contrato en `/docs/openapi.json`.
  - El contrato se sirve con la dirección del servidor que atiende la petición. Así ZAP, desde Docker, ataca `http://api:3000`.
- **D. Qué significa la tasa de éxito con la pasarela simulada.**
  - La Tabla 9 no cuenta los rechazos por fondos, así que la prueba usa solo datos que aprueban: Nequi `3991111111`, PSE banco `1` y Bancolombia.
  - Con la pasarela simulada, la tasa mide que el **flujo completo** funcione sin perder recargas: pago, webhook firmado, acreditación idempotente y consulta del estado. No mide la confiabilidad de Wompi.
  - El reporte lo dice. El número definitivo de la Tabla 9 se obtiene repitiendo la prueba con el Sandbox (T5b).
- **E. Datos de prueba aislados.**
  - Usuarios propios de las pruebas, creados con `npm run seed:pruebas`, todos con la contraseña `PRUEBAS_CONTRASENA` de `.env`:
    - `carga001` a `carga100` para JMeter.
    - `integracion` para las 200 recargas.
    - `zap` para el escaneo.
  - Tarjetas propias del recaudo simulado: de `7700000001` a `7700000100`, de `7710000001` a `7710000005`, `7720000001` y `7730000001`.
  - La colección de Postman crea una cuenta desechable y la elimina al final.
  - Viviana y sus tarjetas nunca se usan.
  - Los saldos del recaudo **no** se reinician al terminar: `POST /simulacion/reiniciar` borra también los viajes y créditos de la demostración. Como las tarjetas de prueba están separadas, crecer su saldo no afecta a nadie.
- **F. Los reportes completos no se suben a GitHub.**
  - Pesan, cambian en cada corrida y algunos traen respuestas completas de la API. `.gitignore` excluye `tests/*/reportes/`.
  - Se sube el resumen: `docs/metricas/resultados.md` y los JSON pequeños de `docs/metricas/datos/`.
  - Los reportes de la corrida final se adjuntan a un *Release* de GitHub, que admite archivos de hasta 2 GB.
  - Las imágenes de Docker tampoco van al repositorio: cada equipo las descarga al correr las pruebas.

## Decisiones técnicas
<!-- tabla: Pruebas de T8, herramienta, servicio de Docker y reporte -->
| Prueba (Tabla 18) | Herramienta e imagen | Servicio de Docker | Reporte completo | Resumen |
|---|---|---|---|---|
| De API | Postman y Newman (`postman/newman:6.1.3-alpine`) | `newman` | `tests/postman/reportes/` (JUnit y JSON) | `docs/metricas/datos/newman.json` |
| De integración | Script de Node (`node:22-alpine`) | `recargas` | — | `docs/metricas/datos/recargas.json` |
| De carga | JMeter 5.6.3 (`alpine/jmeter:5.6.3`) | `jmeter` | `tests/jmeter/reportes/html/` | `docs/metricas/datos/jmeter.json` |
| De seguridad | OWASP ZAP 2.16.1 (`ghcr.io/zaproxy/zaproxy:2.16.1`, `zap-api-scan`) | `zap` | `tests/seguridad/reportes/` (HTML, JSON y Markdown) | `docs/metricas/datos/zap.json` |

1. **Imágenes con versión fija**, para que una corrida se pueda repetir.
   - Se cambió `justb4/jmeter:5.5` por `alpine/jmeter:5.6.3`, porque la primera solo existe para amd64. En un Mac con procesador ARM corría emulada y la JVM tardaba unos 13 minutos en arrancar; la nueva es multiplataforma y la prueba corta tarda 15 s.
2. **Integración.**
   - Cinco trabajadores, cada uno siempre con la misma tarjeta, rotando montos y medios de pago. Así dos recargas simultáneas nunca chocan con la protección contra el doble pago.
   - El tiempo de recarga es el que mide la API: `tiempoSegundos = acreditadaEn − iniciadaEn`.
   - Si una recarga no termina en 240 s, se consulta una última vez con `?actualizar=1` antes de darla por fallida.
3. **Carga.** Cada usuario virtual:
   - Ingresa una vez.
   - Luego hace tres iteraciones, cada una con cuatro pasos:
     1. Tarjetas.
     2. Historial.
     3. Recarga con Nequi.
     4. Consultas del estado hasta que termina.
   - Las pausas son de 0,5 a 1,5 s y el arranque se reparte en 30 s.
   - Los valores se cambian con `JMETER_USUARIOS`, `JMETER_RAMPA` y `JMETER_ITERACIONES`.
4. **Seguridad.**
   - `zap-api-scan` con el contrato OpenAPI y el encabezado `Authorization` del usuario `zap`. ZAP pone el encabezado solo en las peticiones a `api`.
   - Las reglas que se ignoran van en `tests/seguridad/reglas-zap.conf`, cada una con su justificación.
   - ZAP no tiene nivel «crítico»; la meta se evalúa con su nivel más grave, «alto».
5. **Métricas.** `npm run metricas` escribe `docs/metricas/resultados.md`:
   - Media, mediana y percentil 95.
   - La tasa de éxito con su intervalo de confianza de Wilson al 95 %.
   - El resultado de cada meta de la Tabla 9 con «Cumple» o «No cumple».
   - El capítulo 04 del manual incluye ese archivo con `<!-- incluir: ... -->`.
6. **Reposo del equipo.**
   - En la primera corrida completa, el Mac entró en reposo dos veces. Docker se congeló 15 y 10 minutos, y 10 recargas aparecieron con 603 y 907 s. Al despertar se acreditaron bien, pero los tiempos ya no servían, y esa corrida se descartó.
   - Desde entonces `npm run pruebas` corre con `caffeinate` en macOS. El manual pide no cerrar la tapa ni suspender el equipo durante las pruebas.

## Consecuencias
- `npm run pruebas` deja las cuatro pruebas y las métricas listas con un solo comando. Tarda unos 10 minutos.
- La primera vez descarga las imágenes de Newman, Node, JMeter y ZAP (ZAP ocupa unos 3,5 GB).
- Con los límites desactivados, la API queda expuesta a fuerza bruta mientras corren las pruebas. Por eso se restauran al final y nunca se aceptan en producción.
- **Pendiente para T5b:** repetir `npm run pruebas -- recargas` con `PASARELA=wompi` y reemplazar el resultado de la tasa de éxito.
