# Revisión de accesibilidad (WCAG 2.1 AA)

La meta de la Tabla 9 es cero incumplimientos críticos de WCAG 2.1, niveles A y AA. La revisión tiene tres partes (ADR 0019):

1. **Prueba automática de la app** (`apps/mobile/__tests__/accesibilidad.test.tsx`): abre las 20 pantallas y estados de la app y revisa que cada control tenga rol, etiqueta y un área táctil de 44 × 44 px, y que cada campo tenga etiqueta. Corre con las demás pruebas de la app y con `npm run accesibilidad`.
2. **axe-core sobre la versión web** de las 18 pantallas del manual (`npm run manual:capturas`). Revisa contraste, nombres, roles y estados ARIA. La versión web es react-native-web: sirve de evidencia, pero no reemplaza al lector de pantalla del teléfono.
3. **Revisión con TalkBack** en un teléfono Android, que hace el equipo con la plantilla `docs/metricas/datos/talkback.csv`.

Los resultados de las tres partes salen en «Resultados de las pruebas» al correr `npm run metricas`.

## Lo que encontró la revisión automática y cómo se corrigió

<!-- tabla: Incumplimientos de accesibilidad encontrados y corregidos en T11 -->
| Hallazgo | Criterio WCAG | Dónde | Corrección |
|---|---|---|---|
| Dos colores de Figma no llegan a 4,5:1 en texto pequeño: «terciario» (#6F7889, 4,45:1 sobre blanco) y «éxito» (#1E8E3E, 4,21:1 sobre blanco) | 1.4.3 Contraste | Ayudas de los campos, pestañas inactivas, fechas, títulos de sección, valores del historial, insignia y aviso de éxito | En texto se usan tokens existentes: «secundario» (#5B6475, 5,5:1 o más) y «texto principal». Los íconos siguen verdes (3:1 basta para gráficos). Figma debe actualizar esos usos |
| Enlaces dentro del texto de una casilla, muy pequeños para tocarlos y sin etiqueta | 2.5.5 y regla 7 de `CLAUDE.md` | 1.3 (política) y 3.1 y 3.2 (términos de la pasarela) | Los enlaces pasan a botones de texto de 48 px debajo de la casilla |
| El estado marcado, seleccionado o deshabilitado no llegaba a la versión web: react-native-web 0.21 ya no traduce `accessibilityState` | 4.1.2 Nombre, función, valor | Chips, opciones de pago, casillas, interruptores, botones y pestañas | Se usan los atributos `aria-checked`, `aria-selected`, `aria-disabled` y `aria-busy`, que React Native también entiende en el teléfono |
| Un interruptor dentro de una fila que ya es interruptor | 4.1.2 | 2.3 (alerta) y 3.2 (guardar tarjeta) | El interruptor de adentro es solo un dibujo (`decorativo`) |
| La tarjeta MIO no declaraba un alto mínimo táctil | Regla 7 de `CLAUDE.md` | 2.1 y 2.3 | Alto mínimo de 44 px |
| La app solo funcionaba en vertical | 1.3.4 Orientación | `app.json` | `orientation: default`: la app gira con el teléfono |

## Hallazgos de axe-core que se aceptan

Las justificaciones viven en `tests/accesibilidad/excepciones-axe.json` y salen junto a los resultados:
- **«label-content-name-mismatch» en las tarjetas, el selector de tarjeta, el historial y los avisos.** Las etiquetas empiezan con el texto visible («Mi tarjeta…»), pero leen los montos como «6.000 pesos» en lugar de «$6.000», porque TalkBack lee el símbolo como «dólares» (ADR 0017).
- **La misma regla en las filas con descripción (5.2).** Es un falso positivo: axe une el título y la descripción, que van en dos renglones, sin un espacio entre ellos, y el resultado no coincide con la etiqueta, que sí los separa.

## Cómo hacer la revisión con TalkBack

1. En el teléfono: **Ajustes → Accesibilidad → TalkBack → Activar**. Para moverse, deslizar a la derecha o a la izquierda; para activar, tocar dos veces.
2. Abrir RecargaMIO con Expo Go (`npm run demo`) y recorrer cada pantalla de `docs/metricas/datos/talkback.csv`.
3. En cada fila, escribir `si`, `no` o `na` (no aplica) en las cuatro revisiones:
   - **nombres_y_estados:** cada control se anuncia con su nombre, su función (botón, casilla, pestaña…) y su estado (marcado, seleccionado). WCAG 4.1.2.
   - **orden_de_lectura:** TalkBack recorre la pantalla en el orden en que se ve, sin saltos ni elementos repetidos. WCAG 1.3.2 y 2.4.3.
   - **avisos_anunciados:** los errores y los cambios de estado (por ejemplo, «Recarga exitosa») se anuncian solos. WCAG 3.3.1 y 4.1.3.
   - **texto_200:** con **Ajustes → Pantalla → Tamaño de fuente** al máximo, el texto crece y nada se corta ni se tapa. WCAG 1.4.4.
4. Si algo falla, escribir `si` en **critico** cuando impide terminar la tarea de esa pantalla, y una nota corta en **observaciones** (sin datos personales).
5. Al final, girar el teléfono en 2.1 y 3.1 y anotar en observaciones si la pantalla se puede usar en horizontal (WCAG 1.3.4).
6. Correr `npm run metricas`.
