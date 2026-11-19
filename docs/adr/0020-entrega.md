# ADR 0020 · Entrega: repositorio, integración continua, Release e insumos del documento maestro

- **Estado:** aceptada (T12)
- **Fecha:** 2026-11-18
- **Requerimientos:** HT-01 (repositorio en GitHub, estructura del proyecto e integración continua) y la lista de la sección 15 del plan.
- **Plan relacionado:** T12: «README con instrucciones de instalación paso a paso, capturas de la app, enlace del repositorio y guion del video».

## Contexto
- El equipo creó el repositorio `josemina/RecargaMio` y subió la rama `main`, con seis commits por componente (T0 a T11).
- A HT-01 le faltaba la integración continua, y la entrega pide además el video y completar el documento maestro.
- Al leer el documento maestro aparecieron dos diferencias con lo implementado:
  - TRL 5 y HT-03 hablan de un despliegue «en la nube», pero T11 validó en un entorno local (ADR 0019).
  - La Tabla 18 nombra VoiceOver, que es de iOS, y iOS quedó fuera del PMV (decisión D7).

## Decisiones aprobadas por el equipo
- **A. El equipo crea el repositorio y hace los commits con su identidad.** Claude no cambia la identidad de git y no sube nada.
  - El trabajo se hace en ramas por tarea (`tarea/T12-entrega`) y entra a `main` por *pull request*.
- **B. Integración continua con GitHub Actions** (`.github/workflows/ci.yml`) en cada *push* y *pull request*:
  - Revisión de secretos, lint y tipos.
  - Pruebas de la API y del recaudo, con PostgreSQL como servicio.
  - Pruebas de la app (104, entre ellas la revisión de accesibilidad).
  - Las pruebas pesadas de la Tabla 18 siguen siendo locales (`npm run pruebas`), porque tardan unos 10 minutos y necesitan Docker Compose.
- **C. Insumos del documento maestro en Word**, generados con el mismo generador del manual (`node generar.mjs insumos`).
  - Incluyen la Tabla 17 diligenciada, las capturas para las Figuras 7, 8 y 9, los resultados, los ajustes sugeridos y el Anexo E.
  - El documento maestro, que está en OneDrive, no se modifica.
- **D. Solo el PDF del manual va en el repositorio.**
  - Los Word (manual e insumos) y los reportes completos van en el *Release* (`npm run entrega:paquete`), para no sumar unos 7 MB al historial en cada regeneración.
  - El Word que ya estaba en los primeros commits queda en el historial.

## Decisiones técnicas
1. **`npm run revisar:secretos`** (`scripts/revisar-secretos.mjs`) revisa los archivos que irían al repositorio. Falla si encuentra:
   - Rutas prohibidas: `.env`, `secrets/`, reportes de pruebas, llaves y configuración de Firebase.
   - El valor real de una variable secreta del `.env` local, si es distinto del marcador de `.env.example`.
   - Cadenas con forma de llave real: Wompi de producción, PEM, tokens de GitHub o AWS, cuentas de servicio de Google.
   - Un archivo de más de 10 MB.
2. **Excepciones de secretos** en `tests/seguridad/secretos-aceptados.json`, con su justificación.
   - La única es el ejemplo público de la documentación de Wompi (`prod_integrity_…`) en la prueba de la firma de integridad. El equipo la revisó y aprobó al hacer los primeros commits, como excepción a la regla 1 de `CLAUDE.md`.
3. **CI simulada antes de subirla.** Se corrió en un contenedor Linux limpio, solo con los archivos del repositorio:
   - `npm ci`, Prisma, lint y tipos.
   - 249 pruebas de la API y 104 de la app.
4. **README de entrega:**
   - Instalación en siete pasos con `npm run demo`.
   - Capturas de la app y resultados frente a la Tabla 9.
   - Comandos, documentación y la insignia de la CI.
5. **Paquete del Release** (`npm run entrega:paquete`): se arma sobre una copia en la que se ocultan los tokens JWT de los reportes. Newman guarda las peticiones con su encabezado `Authorization`, y en la corrida final eran 30 tokens ya vencidos. Si en la copia queda algún valor secreto del `.env`, el paquete no se arma.
6. **Guion del video** (`docs/entrega/guion-video.md`): minuto a minuto, con los comandos y la lista de verificación del día de la grabación.
7. **Consentimiento:** el protocolo de usabilidad usa el del Anexo D del documento maestro para la firma.

## Consecuencias
- HT-01 queda completa: repositorio, estructura e integración continua.
- **Pendiente del equipo:**
  - Proteger `main` en GitHub: exigir *pull request* y la CI en verde.
  - Dar acceso de lectura al tutor. En una cuenta personal, un colaborador siempre recibe permiso de escritura; para solo lectura, el repositorio debe estar en una organización o ser público.
  - Grabar el video.
  - Copiar los insumos al documento maestro.
  - Decidir entre ajustar el texto sobre la nube o desplegar.
  - Crear el *Release* con el paquete de la entrega.
