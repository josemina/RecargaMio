# Protocolo de la prueba de usabilidad

Prueba de usabilidad de la Tabla 18 del documento maestro: tareas de registro, recarga y consulta con 15 usuarios, cuestionario SUS y registro de tiempos. Las metas son **SUS de 68 o más** y **recarga en 180 s o menos**. La prepara T11 (ADR 0019) y la hace el equipo con personas.

## Participantes

- **Quiénes:** 15 personas adultas que usen el MIO de Cali, con edades y frecuencias de uso variadas. No participan integrantes del equipo ni personas que hayan visto la app.
- **Datos que se guardan:** solo un código (P01 a P15), la fecha, el rango de edad y la frecuencia de uso del MIO. **No se guardan nombres, documentos, correos ni celulares reales** (Ley 1581 de 2012).
- **Cuenta de prueba:** cada participante crea su cuenta con el nombre «Participante» y su código (no su nombre real), el correo asignado (`p01@usuarios.test` … `p15@usuarios.test`) y una contraseña que invente en el momento; se le pide que **no use una contraseña real**. Cada uno tiene su tarjeta reservada (`7740000001` … `7740000015`), que arranca con $5.000.
- **Pago:** solo con los datos de prueba de la pasarela simulada; nunca se mueve dinero real.

## Consentimiento informado

Antes de empezar, quien modera lee este texto y la persona firma en papel. Las hojas firmadas las guarda el equipo y **no se digitalizan ni se suben al repositorio**.

> Te invitamos a probar RecargaMIO, un prototipo académico de la UNAD para recargar la tarjeta MIO desde el celular. Vas a hacer cuatro tareas cortas en un teléfono de prueba y después vas a responder un cuestionario de diez preguntas. Toma unos 20 minutos.
>
> Estamos evaluando la aplicación, no a ti: si algo es difícil, es un problema de la aplicación. No se usa dinero real ni tus datos bancarios. No guardamos tu nombre: tus respuestas se identifican con un código. La cuenta que crees se borra al terminar la prueba.
>
> Tu participación es voluntaria y puedes retirarte en cualquier momento sin dar explicaciones. Los resultados, sin datos que te identifiquen, se usarán en el trabajo de grado del equipo.

## Preparación del equipo

1. En el computador, con Docker abierto: `npm run demo`. El comando dice si la API responde en la red local.
2. En otra terminal: `cd apps/mobile && npx expo start --clear`.
3. En el teléfono de prueba, conectado a la misma red Wi-Fi: abrir Expo Go, escanear el código QR y comprobar que aparece la pantalla 1.1.
4. Tener a mano: hoja de consentimiento, cuestionario SUS impreso, cronómetro y la hoja de registro (las columnas de `docs/metricas/datos/sus.csv`).
5. Entre participantes: cerrar sesión en la app (Perfil → Cerrar sesión) para que la siguiente persona empiece en la pantalla 1.1.

## Guion de quien modera

1. Saludar, leer el consentimiento y pedir la firma.
2. Explicar: «Vas a hacer cuatro tareas. Te las leo una por una. Hazlas como lo harías solo o sola. Si te quedas sin saber qué hacer, dímelo; si puedes, cuéntame en voz alta lo que vas pensando».
3. Leer cada tarea tal como está escrita abajo. Iniciar el cronómetro cuando la persona toca la pantalla por primera vez y detenerlo cuando se cumple el criterio de éxito.
4. **No ayudar.** Si la persona pide ayuda o pasan 5 minutos, la tarea se marca como **no completada** y quien modera la lleva al punto de partida de la siguiente tarea.
5. Al terminar las cuatro tareas, entregar el cuestionario SUS y pedir que lo responda sin pensarlo mucho.
6. Agradecer. Anotar las observaciones en el cuaderno del equipo, sin nombres.

## Tareas

<!-- tabla: Tareas de la prueba de usabilidad y criterios de éxito -->
| Tarea | Lo que se lee a la persona | Criterio de éxito | Historia |
|---|---|---|---|
| T1 · Crear la cuenta | «Crea tu cuenta en RecargaMIO con los datos de esta tarjeta y una contraseña que inventes ahora». (Se le entrega una tarjeta de papel con el nombre que debe usar, «Participante NN», su correo `pNN@usuarios.test` y su número de tarjeta MIO). | Llega a la pantalla 2.1 con «Hola, Participante» en el saludo | HU-06 |
| T2 · Agregar la tarjeta MIO | «Agrega tu tarjeta MIO; el número está en la misma tarjeta de papel». | La tarjeta aparece en 2.1 con su saldo | HU-07 |
| T3 · Recargar | «Recarga $10.000 a esa tarjeta pagando con Nequi. Para esta prueba, el celular de Nequi es 3991111111». | Ve la pantalla 3.4 «¡Recarga exitosa!». **Este tiempo se compara con la meta de 180 s** | HU-01 y HU-02 |
| T4 · Consultar | «Busca en el historial la recarga que acabas de hacer y dime cuál es el saldo de tu tarjeta ahora». | Dice el saldo correcto ($15.000) | HU-03 |

Además del cronómetro de T3, la API mide el tiempo de cada recarga (`acreditadaEn − iniciadaEn`). `npm run demo:exportar` lo guarda por participante, sin correos.

## Cuestionario SUS

Escala de usabilidad del sistema (System Usability Scale; Brooke, 1996), adaptada al español para esta prueba. Cada afirmación se responde de **1 (totalmente en desacuerdo)** a **5 (totalmente de acuerdo)**.

<!-- tabla: Afirmaciones del cuestionario SUS -->
| N.º | Afirmación |
|---|---|
| 1 | Creo que me gustaría usar esta app con frecuencia. |
| 2 | La app me pareció innecesariamente complicada. |
| 3 | La app me pareció fácil de usar. |
| 4 | Creo que necesitaría ayuda de una persona experta para poder usar esta app. |
| 5 | Las funciones de esta app me parecieron bien integradas. |
| 6 | La app me pareció demasiado inconsistente. |
| 7 | Creo que la mayoría de las personas aprenderían a usar esta app muy rápido. |
| 8 | La app me pareció muy engorrosa de usar. |
| 9 | Sentí mucha confianza al usar la app. |
| 10 | Tuve que aprender muchas cosas antes de poder usar la app. |

**Cálculo** (lo hace `npm run metricas`):
- En las afirmaciones impares se resta 1 a la respuesta.
- En las pares, la respuesta se resta de 5.
- La suma se multiplica por 2,5 y da un puntaje de 0 a 100 por participante.

El puntaje de la app es la media de los participantes, con su intervalo de confianza del 95 % (distribución t). La meta es una media de 68 o más, el promedio de referencia de SUS (Sauro, 2011).

## Registro de los resultados

Después de cada sesión se pasa la hoja de registro a `docs/metricas/datos/sus.csv`, una fila por participante:

<!-- tabla: Columnas de la plantilla sus.csv -->
| Columna | Qué se escribe |
|---|---|
| `participante` | El código: P01 a P15 (ya viene escrito) |
| `fecha` | Fecha de la sesión, por ejemplo 2026-11-20 |
| `rango_edad` | `18-25`, `26-35`, `36-50` o `51+` |
| `uso_mio` | `diario`, `semanal` u `ocasional` |
| `t1_completada` … `t4_completada` | `si` o `no` |
| `t1_segundos` … `t4_segundos` | Segundos del cronómetro (vacío si no se completó) |
| `sus1` … `sus10` | La respuesta de 1 a 5 a cada afirmación |

Al terminar todas las sesiones:
1. `npm run demo:limpiar`. Exporta los tiempos de la API a `docs/metricas/datos/validacion.json` y borra las cuentas de los participantes.
2. `npm run metricas`. Calcula el SUS, las tasas de éxito y los tiempos, y los agrega a «Resultados de las pruebas».
3. `npm run manual`. Actualiza el Word y el PDF.

## Referencias

Brooke, J. (1996). SUS: A "quick and dirty" usability scale. En P. W. Jordan, B. Thomas, B. A. Weerdmeester y I. L. McClelland (Eds.), *Usability evaluation in industry* (pp. 189–194). Taylor & Francis.

Sauro, J. (2011). *A practical guide to the System Usability Scale: Background, benchmarks & best practices*. Measuring Usability LLC.
