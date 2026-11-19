# Guion del video de la entrega

Video de manejo y funcionamiento del prototipo para la Fase 4: **máximo 10 minutos y con las cámaras encendidas**. El enlace va en el Anexo E del documento maestro. Este guion amplía el de la sección 13 del plan con lo que se muestra en cada minuto, los comandos y los datos que se citan. Los turnos (Integrante 1, 2 y 3) los asigna el equipo.

## Guion minuto a minuto

<!-- tabla: Guion del video minuto a minuto -->
| Minuto | Quién | Qué se dice | Qué se ve en pantalla |
|---|---|---|---|
| 0:00–1:00 | Integrante 1 | Presentación del equipo. El problema: recargar el MIO exige ir a un punto físico, con filas y horarios. La propuesta: recargar desde el celular con PSE, Nequi o Bancolombia, en modo de pruebas | Las tres cámaras; después, la pantalla 1.1 de la app |
| 1:00–2:30 | Integrante 2 | Arquitectura: app móvil, API, PostgreSQL, pasarela Wompi en modo de pruebas y recaudo simulado. Todo, salvo la app, se levanta con un comando | Diagrama `docs/manual/imagenes/diagramas/arquitectura.png`; en la terminal, `npm run demo` (o `docker compose ps` si ya está levantado), con los servicios sanos |
| 2:30–3:30 | Integrante 3 | Ingreso y tarjetas: la sesión, las tarjetas con su saldo y la de mamá con la insignia de saldo bajo (HU-06, HU-07 y HU-03) | Teléfono: 1.1 → ingreso de Viviana → 2.1 Mis tarjetas → 2.3 Detalle de una tarjeta |
| 3:30–5:00 | Integrante 3 | Recarga aprobada con Nequi: monto, medio, datos de prueba, términos de la pasarela, espera y confirmación con el nuevo saldo (HU-01 y HU-02) | 3.1 con $20.000 y Nequi `3991111111` → 3.3 Esperando confirmación → 3.4 Recarga exitosa → 4.1 Historial con la recarga |
| 5:00–5:45 | Integrante 3 | Recarga rechazada: no hay cobro y el saldo no cambia | 3.1 con Nequi `3992222222` → 3.5 Pago rechazado → «Intentar de nuevo» |
| 5:45–6:30 | Integrante 3 y 2 | Alerta de saldo bajo: un viaje simulado deja la tarjeta de mamá bajo el umbral y llega el aviso (HU-05) | Integrante 2 corre el viaje simulado (ver «Comandos»); en el teléfono, la campana de 2.1 con el aviso → 4.2 Alertas |
| 6:30–7:30 | Integrante 2 | Webhook y estado del pago: la API solo acredita con `APPROVED`, una sola vez por referencia, y mide el tiempo de recarga | Adminer (`localhost:8080`, perfil `herramientas`): tabla `recarga` con `estado`, `iniciada_en` y `acreditada_en` de la recarga del minuto 3:30 |
| 7:30–8:30 | Integrante 2 | Resultados frente a la Tabla 9: tiempo de recarga, 200 de 200 recargas, 100 usuarios en JMeter, ZAP sin hallazgos altos, accesibilidad y la integración continua | `docs/metricas/resultados.md` (resumen), reporte de JMeter, reporte de ZAP y la pestaña *Actions* del repositorio en GitHub |
| 8:30–10:00 | Integrante 1 | Metodología Scrum + CDIO aplicada, nivel TRL alcanzado y conclusiones | Tabla 17 diligenciada; capítulo «Validación TRL 5» del manual |

**Sobre el TRL:** di solo lo que ya está hecho cuando se grabe.
- Si la prueba SUS y TalkBack ya se hicieron, se citan sus resultados.
- Si no: «el prototipo funciona integrado y validado en el entorno de pruebas; la validación con usuarios está preparada y en curso».

## Comandos para la grabación

Viaje simulado en la tarjeta de mamá (minuto 5:45), desde la raíz del repositorio:

```bash
curl -s -X POST localhost:4000/simulacion/viaje -H "X-Api-Key: $(grep ^RECAUDO_API_KEY .env | cut -d= -f2)" -H "Content-Type: application/json" -d '{"numero":"1234567730","ruta":"E21"}'
```

Adminer para el minuto 6:30:

```bash
docker compose --profile herramientas up -d adminer
```

## Lista de verificación antes de grabar

**El día anterior**
- [ ] Ensayar el guion completo con cronómetro: debe quedar en 9 minutos y medio o menos.
- [ ] Correr `npm run pruebas` con el cargador conectado y la tapa abierta, para que los resultados del minuto 7:30 sean los del código final.
- [ ] Revisar que la integración continua esté en verde en GitHub.

**Una hora antes**
- [ ] Datos limpios. La alerta de saldo bajo se envía como máximo una vez cada 12 horas por tarjeta; si ya se probó ese día, reinicia desde cero (capítulo 01, «Reiniciar desde cero»).
- [ ] `npm run demo` y, en otra terminal, `cd apps/mobile && npx expo start --clear`.
- [ ] Teléfono con batería, en la misma red Wi-Fi, con Expo Go abierto en la pantalla 1.1, el modo «No molestar» activo y el brillo alto.
- [ ] Para mostrar la pantalla del teléfono en la grabación: `scrcpy` (`brew install scrcpy`, con depuración USB), o grabar la pantalla del teléfono por aparte y montarla.
- [ ] La contraseña de Viviana (`SEMILLA_CONTRASENA`) a mano, **sin mostrarla en cámara**. Cerrar el `.env` y cualquier terminal que muestre llaves.
- [ ] Pestañas abiertas: diagrama de arquitectura, `docs/metricas/resultados.md`, reporte de JMeter (`tests/jmeter/reportes/html/index.html`), reporte de ZAP (`tests/seguridad/reportes/zap.html`), Adminer y la pestaña *Actions* de GitHub.

**Al grabar**
- [ ] Las tres cámaras encendidas al inicio y al final.
- [ ] Decir en voz alta que todos los pagos son de prueba: no se mueve dinero real.
- [ ] No mostrar datos personales reales: solo las cuentas de prueba.

**Después**
- [ ] Subir el video (por ejemplo a YouTube como «no listado» o a OneDrive con enlace de lectura) y probar el enlace en una ventana privada.
- [ ] Poner el enlace en el Anexo E del documento maestro y en la sección «Enlaces» del README.
