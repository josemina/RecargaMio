# ADR 0019 · Validación TRL 5: entorno de pruebas, accesibilidad, MASVS y usabilidad

- **Estado:** aceptada (T11)
- **Fecha:** 2026-11-18
- **Requerimientos:**
  - HT-03 (despliegue y datos de prueba).
  - Metas de la Tabla 9: usabilidad, accesibilidad y seguridad.
  - Plan de pruebas de la Tabla 18.
  - RNF-03, RNF-04 y RNF-05.
- **Plan relacionado:** T11: «Despliegue en el entorno de pruebas, ejecución de todas las pruebas de la sección 10, revisión con TalkBack, lista MASVS diligenciada y resultados en `docs/metricas/`».

## Contexto
- T8 dejó automatizadas las pruebas de API, integración, carga y seguridad de la API.
- Para llegar a TRL 5 faltan cuatro cosas:
  - Un entorno donde personas reales usen la app en teléfonos reales.
  - La revisión de accesibilidad.
  - La lista MASVS de la app.
  - La prueba de usabilidad con 15 usuarios.
- Dos de ellas dependen de personas y de un teléfono Android, que el equipo de desarrollo no puede reemplazar: TalkBack y SUS. Por eso T11 deja todo preparado y automatizado, y los resultados con personas entran a `npm run metricas` cuando el equipo llena las plantillas.

## Decisiones aprobadas por el equipo
- **A. Entorno de pruebas local.** El computador del equipo corre Docker y los teléfonos se conectan por la misma red Wi-Fi.
  - No se despliega en la nube: eso exigiría costos, manejo de secretos en otro lugar y HTTPS, y dejaría expuesto un servidor con datos de personas.
- **B. Participantes sin datos personales reales.** Cada participante crea su cuenta con el nombre «Participante NN», el correo `pNN@usuarios.test` y una contraseña inventada en el momento.
  - Usa su tarjeta reservada `77400000NN`.
  - Al terminar, `npm run demo:limpiar` exporta solo los tiempos con el código del participante y borra las cuentas.
- **C. Accesibilidad en tres partes:**
  - Una prueba de Jest que recorre las 20 pantallas y estados de la app.
  - axe-core sobre la versión web, en las mismas 18 pantallas de las capturas del manual.
  - Una lista para TalkBack que llena el equipo (`docs/metricas/datos/talkback.csv`).
- **D. Cuestionario SUS en papel.** El equipo pasa las respuestas a `docs/metricas/datos/sus.csv`. No se usa un formulario en línea, para no entregar las respuestas a un tercero.
- **E. Contraste con tokens existentes.** axe-core encontró que «texto terciario» (#6F7889) y «éxito» (#1E8E3E) no llegan a 4,5:1 en texto pequeño. En texto se usan «secundario» (#5B6475) y «texto principal», sin inventar colores.
  - Los íconos siguen verdes, porque para un gráfico basta 3:1.
  - **Figma debe actualizar esos usos** para que vuelva a coincidir con la app.

## Decisiones técnicas
1. **`npm run demo`** (`scripts/demo.mjs`) prepara el entorno:
   - Levanta y reconstruye Docker, migra la base y siembra los datos.
   - Escribe en `apps/mobile/.env` la IP del computador en la red local.
   - Comprueba que la API responde por esa IP.
   - `demo:exportar` y `demo:limpiar` usan dos scripts que no tocan ninguna otra cuenta ni tarjeta: `services/api/prisma/validacion.ts` y `services/recaudo-sim/prisma/reiniciar-validacion.ts`.
   - Varias exportaciones se combinan por participante, por si las sesiones se hacen en varios días.
2. **Prueba automática de accesibilidad** (`apps/mobile/__tests__/accesibilidad.test.tsx`):
   - Revisa cada elemento tocable: rol, etiqueta y 44 × 44 px de área táctil (alto o alto mínimo más el `hitSlop`).
   - Revisa que cada campo de texto tenga etiqueta.
   - Un control con `flex` reparte el ancho de su fila, así que su ancho no se mide.
   - `npm run accesibilidad` guarda el resumen para las métricas.
3. **axe-core en las capturas** (`docs/manual/generador/capturas.mjs`):
   - Analiza con las reglas de WCAG 2.0 y 2.1, niveles A y AA.
   - Las excepciones van en `tests/accesibilidad/excepciones-axe.json`, con su justificación, igual que las de ZAP en T8.
4. **Correcciones de accesibilidad** encontradas por la revisión (detalle en `docs/metricas/wcag.md`):
   - Contraste.
   - Los enlaces dentro de las casillas de 1.3 y 3.1 pasan a botones de texto de 48 px.
   - `aria-checked`, `aria-selected`, `aria-disabled` y `aria-busy` en lugar de `accessibilityState`, que react-native-web 0.21 ya no traduce.
   - El interruptor de `FilaAjuste` pasa a ser decorativo, para que no haya un control dentro de otro.
   - Alto mínimo en la tarjeta MIO.
   - `orientation: default` en `app.json`, por WCAG 1.3.4: la app ya no se queda fija en vertical.
5. **Dependencias** (`npm run dependencias`):
   - `npm audit` corre dentro de `npm run pruebas`.
   - Un aviso alto o crítico sin justificación en `tests/seguridad/dependencias-aceptadas.json` hace fallar la corrida.
   - Se actualizó `nodemailer` de la versión 7 a la 10 por avisos de inyección en SMTP.
   - Se aceptan los tres avisos altos de la herramienta de línea de comandos de Prisma. Solo corre al migrar y la corrección es Prisma 7, un cambio mayor.
6. **Registros** (`npm run registros`): busca tokens, contraseñas, celulares, correos, documentos y llaves en los registros de la API y del recaudo, después de que pasan todas las pruebas.
   - Encontró que **el recaudo simulado escribía la llave `X-Api-Key` en cada petición**. Ahora registra solo el método y la URL.
7. **`npm run metricas`** agrega tres secciones: accesibilidad, dependencias y registros, y usabilidad.
   - El SUS se calcula con su intervalo de confianza del 95 % (t de Student, recortado a la escala de 0 a 100).
   - Las tareas, con la tasa de éxito y su intervalo de Wilson.
   - Lo que todavía depende del equipo sale como «Pendiente», no como «Cumple».

## Verificación
- La app tiene 104 pruebas, 20 de ellas nuevas de accesibilidad.
- `npm run demo`, `demo:exportar` y `demo:limpiar` se probaron con un participante de ensayo (P99): registro, tarjeta `7740000015` y recarga con Nequi.
  - La recarga tardó 4,1 s según la API.
  - La limpieza dejó la tarjeta en $5.000 y no tocó a Viviana.
  - El archivo exportado del ensayo se borró.
- La revisión de registros quedó en cero coincidencias después de corregir el recaudo.
- El envío de correos con `nodemailer` 10 se comprobó en Mailpit.
- Los resultados de las pruebas de la sección 10 sobre el código final están en `docs/metricas/resultados.md`.

## Consecuencias
- El equipo tiene un entorno de pruebas que se levanta con un comando y se limpia con otro.
- Con las plantillas llenas, `npm run metricas` y `npm run manual` dejan los resultados en el manual.
- **Pendiente del equipo:**
  - La revisión con TalkBack.
  - La prueba SUS con 15 personas, que necesita el borrador de la política aprobado.
  - Actualizar en Figma los usos de «terciario» y «éxito» en texto.
- **Después del PMV:**
  - Pasar a Prisma 7.
  - `FLAG_SECURE` para ocultar la app en el selector de aplicaciones.
  - HTTPS en un despliegue real.
