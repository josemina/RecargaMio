# ADR 0017 · Base de la app móvil: componentes de Figma, sesión segura y navegación

- **Estado:** aceptada (T9)
- **Fecha:** 2026-11-18
- **Requerimientos:** RNF-03 (tokens con expiración, nada sensible en el teléfono), RNF-05 y regla 7 de `CLAUDE.md` (WCAG 2.1 AA: rol, etiqueta y 44 × 44 px). Decisiones D1 (Expo) y D5 (la app no corre en Docker) del plan.
- **Plan relacionado:** sección 4 (app móvil, tokens y los catorce componentes) y T9: «Crear la app con Expo y TypeScript, `tokens.ts`, fuente Inter, los catorce componentes […], cliente HTTP con renovación automática del token, almacenamiento seguro, navegación con cuatro pestañas».

## Contexto
- El criterio de aceptación de T9 es que una pantalla de catálogo muestre todos los componentes y coincida con la página 02 de Figma («Sistema de diseño»).
- El equipo de desarrollo no tiene Xcode ni Android Studio, así que no hay emulador.

## Decisiones aprobadas por el equipo
- **A. Verificación del catálogo:**
  - La app tiene también versión web (`react-native-web`), **solo para desarrollo**. El catálogo se abre en un navegador de 390 px de ancho y se compara con las imágenes de la página 02 de Figma; esas comparaciones quedan como figuras en el manual.
  - Cómo se ve en Android lo confirma el equipo en un teléfono con Expo Go.
- **B. Íconos.** El plan decía `lucide-react-native`. Al leer Figma se vio que los 30 íconos son SVG propios «estilo Lucide», así que se usan **los SVG exportados de Figma**, sin redibujar; esto ya estaba previsto («si alguno no se parece, lo exporto de Figma»).
  - Se importan como componentes con `react-native-svg-transformer`.
  - El trazo `#1B1F2A` se reemplaza por `currentColor` (`.svgrrc`), así que el color se cambia con una propiedad, como pide la descripción de los íconos en Figma.
  - Se quitó `lucide-react-native`.
- **C. Dónde vive la sesión:**
  - El token de renovación se guarda en `expo-secure-store` con `WHEN_UNLOCKED_THIS_DEVICE_ONLY`: solo se lee con el teléfono desbloqueado y no se copia a otro dispositivo.
  - El token de acceso vive solo en memoria. No se usa AsyncStorage (MASVS-STORAGE).
  - En la web, que solo sirve para el catálogo, la sesión vive en memoria.

## Decisiones técnicas
1. **Expo SDK 58** (React Native 0.88, React 19.3, TypeScript 6.0), dentro de los workspaces de npm.
   - Expo configura Metro solo para el monorepo, desde la SDK 52.
   - Las rutas viven en `src/app` (expo-router), como recomienda la plantilla de la SDK 58.
2. **Tokens** en `src/theme/tokens.ts`:
   - Copian las variables de Figma: color, espacio, radio y la sombra «Sombra tarjeta».
   - Incluyen los 11 estilos de texto de Inter. Además de los que listaba el plan, Figma usa «Cuerpo fuerte» y «Pequeño fuerte».
   - Cada peso de Inter es una familia aparte: en Android, `fontWeight` no elige el archivo de una fuente propia.
3. **Texto escalable** (WCAG 1.4.4). El componente base `Texto` respeta el tamaño de letra del sistema hasta el doble (`maxFontSizeMultiplier = 2`).
   - Los componentes usan alto mínimo (`minHeight`) y no alto fijo: con letra grande crecen en vez de cortar el texto.
4. **Objetivo táctil de 44 px.** Figma dibuja el chip de 40 px y el interruptor de 28 px; el dibujo se respeta y el área táctil se amplía con `hitSlop`.
   - La casilla de 22 px tiene un área de 44 × 44.
   - Las pruebas miden el área de cada control.
5. **Accesibilidad por componente:**
   - Roles nativos: `button`, `radio`, `switch`, `checkbox`, `tab`, `header`, `alert`.
   - Estados: `checked`, `selected`, `disabled`, `busy`.
   - Los avisos de error se anuncian solos (`accessibilityLiveRegion`).
   - Los montos se leen como «12.400 pesos», porque con el símbolo `$` TalkBack lee «dólares».
   - Los íconos van ocultos al lector de pantalla (`aria-hidden`), porque el control que los contiene ya tiene su etiqueta.
6. **Barra de estado.** El marco de Figma «Barra de estado» no es un componente de la app: la dibuja el sistema operativo y la app solo elige su tema con `expo-status-bar`.
7. **Cliente HTTP** (`src/api/cliente.ts`):
   - Renueva el token de acceso 30 s antes de que venza, o si el servidor responde 401, y repite la petición una vez.
   - La renovación es **única**: si varias peticiones la necesitan a la vez, todas esperan la misma, porque el token de renovación es de un solo uso (rotación, ADR 0011).
   - Si la renovación falla, borra la sesión y la app vuelve a la pantalla 1.1.
   - Tiempo máximo de 15 s por petición.
   - Los errores se convierten en `ErrorApi` con el código de la API. Sin conexión, el código es `SIN_CONEXION`, con un mensaje para el usuario.
8. **Navegación:**
   - Rutas protegidas de expo-router (`Stack.Protected`): con sesión, el grupo `(app)`; sin sesión, el grupo `(publico)`.
   - Cuatro pestañas: Inicio (2.1), Recargar (3.1), Historial (4.1) y Perfil (5.1). Usan el componente `BarraNavegacion` de Figma en lugar de la barra predeterminada.
   - El catálogo (`/catalogo`) solo existe con `__DEV__`.
9. **Lint de la app con ESLint 9.** `eslint-config-expo` todavía no funciona con ESLint 10, que es el que usa la raíz para los servicios.
   - La app tiene su propio ESLint 9 y su propio `eslint-import-resolver-typescript`.
   - `npm run lint` de la raíz corre los dos.
10. **Docker solo para verificar** (decisión D5). El servicio `app-pruebas`, del perfil `app`, corre el lint, los tipos y las pruebas de la app. La app se ejecuta en el equipo con Expo Go.

## Consecuencias
- T10 construye las 19 pantallas con estos componentes y este cliente, sin escribir estilos nuevos.
- La versión web sirve para revisar el diseño y tomar capturas, no para usar la app.
  - En la web, la sesión no persiste al recargar.
  - Llamar a la API desde la web exige agregar el origen a `CORS_ORIGENES`.
- **Pendiente para T10:**
  - Notificaciones push con `expo-notifications`. Necesitan una *development build* y una cuenta de Expo, porque no funcionan en Expo Go.
  - Pago PSE con `expo-web-browser` y el enlace de regreso `recargamio://recarga`, que ya está configurado como esquema en `app.json`.
