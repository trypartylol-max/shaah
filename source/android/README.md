# SHAAH Android — preparación sin publicación

Actualización del contador de pendientes: ver `COUNTER.md`. APK 0.2.0 preparada;
su integración web y la ampliación de DAL siguen pendientes de autorización/publicación.
Las secciones siguientes documentan las fases anteriores.

Base: main `dd96d6243a1879e5ba0364ac5e0895524f5a6a4e`, 2026-11-17.
Rama aislada: `codex/android-preparation-20261117`. Todo lo añadido vive en source/android.
No cambia la PWA, producción, Supabase, qa ni workflows. No hay merge ni despliegue.
La Bitácora de Supabase queda pendiente por la prohibición explícita de tocar Supabase.

## Proyecto generado

`project/` contiene un proyecto Gradle real generado offline con @bubblewrap/core 1.27.0:
launcher TWA, servicio de delegación, manifest Android, recursos e iconos, wrapper Gradle.
Compile/target SDK 36, mínimo 24 (Android 7); URL /shaah/, fallback Custom Tabs y notificaciones delegadas.
La identidad `io.github.trypartylol_max.shaah` es provisional; confirmarla antes de crear firmas o subir a Play.
En la fase inicial no se generaron keystore, APK ni AAB; la actualización siguiente
documenta la APK debug posterior. No hay huellas ficticias ni service accounts.
Los iconos de notificación generados deben revisarse visualmente en Android.

Para regenerar en una máquina con Node >=22, instalar en una carpeta temporal:

```sh
npm install --prefix /tmp/shaah-android-tooling --ignore-scripts @bubblewrap/core@1.27.0
# Archivar/eliminar solo el project generado tras revisar sus cambios.
BUBBLEWRAP_MODULES=/tmp/shaah-android-tooling/node_modules node source/android/generate.cjs
node source/android/preflight.mjs
```

El generador rechaza sobrescribir project. Sustituye las descargas del generador por
los bytes locales del manifest e iconos; rechaza cualquier otra URL. No accede al sitio vivo.
No usar `bubblewrap update` sin revisar su diff: podría leer el manifest publicado.
Guardar futuros secretos solo en `source/android/private/` (ignorado), nunca en git.
Para una APK de diagnóstico local, tras instalar JDK y Android SDK adecuados:
`cd source/android/project && ./gradlew assembleDebug`. Ya ejecutado en la fase siguiente.
Una APK debug que abre la URL viva puede escribir datos reales al interactuar: no usar cuentas reales
para pruebas de hábitos. Para pruebas con datos ficticios hace falta un origen HTTPS aislado
aprobado que sirva SHAAH-TEST y su propio DAL; no basta cambiar el package Android.

## Bloqueo Digital Asset Links

La URL requerida es `https://trypartylol-max.github.io/.well-known/assetlinks.json`,
no `https://trypartylol-max.github.io/shaah/.well-known/assetlinks.json`.
Este repo de proyecto Pages no controla por sí solo la raíz del dominio.
Mantener Pages; preparar por separado el repositorio de usuario `trypartylol-max.github.io`
o una solución de dominio aprobada. No crear ni publicar ese archivo desde esta tarea.
Pages debe conservar `.well-known` (por ejemplo mediante `.nojekyll` en el sitio raíz).
Verificar respuesta HTTPS 200, JSON y ausencia de redirección.

La asociación tendrá relation `delegate_permission/common.handle_all_urls`, namespace
`android_app`, package_name aprobado y sha256_cert_fingerprints reales.
Usar el certificado que firma la APK instalada: debug para diagnóstico,
release local para sideload y **Play App Signing** para las instalaciones desde Play;
la upload key no sustituye al certificado de Play. No confiar orígenes de Google ni de Supabase.
`node source/android/assetlinks.mjs <huella-real>` imprime un candidato JSON para revisión,
sin guardarlo ni publicarlo; rechaza huellas vacías o con formato incorrecto.
Sin DAL correcto la navegación puede caer en Custom Tabs con barra; no se considera TWA validada.
No se comprobó el DAL vivo en esta tarea.

## Matriz pendiente en dispositivo real

| Área | Evidencia necesaria antes de aprobar Android |
|---|---|
| Instalación | APK firmada, paquete/huella, versión Android/Chrome, arranque y fallback sin Chrome |
| DAL | asociación real, arranque sin barra y vuelta desde origen externo |
| Google OAuth PKCE | login nuevo, cancelación, vuelta a /shaah/, reinicio y logout; comprobar continuidad de sesión; no modificar proveedores ni redirects |
| Web Push diario existente | opt-in/off, permiso Android 13+, permiso denegado/revocado, cambio de hora/zona/idioma, reinicio, app cerrada y batería restringida |
| Push recepción | una notificación al vencer sin puntos; no duplicar si PWA y TWA coexisten; tocarla enfoca/abre la app; validación de servidor solo en entorno autorizado |
| Badge existente | detectar standalone y API, activar/desactivar, actualizar/limpiar, launcher compatible y coexistencia con PWA |
| Offline | primera carga online, abrir offline, reconexión, actualización SW, navegación Atrás y rotación |

Web Push sigue siendo la implementación web existente; no se añade FCM ni otro cron.
`enableNotifications: true` prepara delegación, no demuestra recepción.
`badgeSupported()` exige setAppBadge y `isStandalone()`; no prometer contador nativo
ni entrega puntual de Push en todos los launchers/dispositivos. No se modificó ese comportamiento.
`preflight --release` falla deliberadamente hasta completar evidencia de firma/dispositivo/DAL.

## Referencias

- https://github.com/GoogleChromeLabs/bubblewrap/tree/main/packages/cli
- https://github.com/GoogleChromeLabs/bubblewrap/blob/main/packages/core/template_project/app/build.gradle
- https://developers.google.com/digital-asset-links/v1/getting-started

La configuración local generada es la evidencia de API 36; no equivale a compilación ni
a cumplimiento verificado de las políticas de Play vigentes en una futura publicación.

## Validación local, 2026-11-17

- Build de producción ejecutado dos veces: sin diferencias en archivos web versionados.
- 318 tests unitarios aprobados, 0 fallos, 0 omitidos (Node 24.22.1).
- Preflight local y sintaxis de herramientas aprobados; modo `--release` rechaza la entrega
  sin evidencias de dispositivo/firma/DAL, como está previsto.
- Chromium headless 1234: 3/3 pruebas Push aprobadas con permisos y RPC simulados.
  No prueban entrega del servidor ni delegación Android real.
- Offline browser: 1 aprobada (sesión expirada), 1 falla por timeout 30 s esperando
  `_offlineBoot && _cfgReady` en `tests/offline-shell-browser.test.cjs:19`.
  El código web coincide con main; no se modifica para ampliar esta tarea Android.
  Repetición aislada: mismo timeout en la misma línea; pendiente de investigación.
- Generación offline aprobada con Node 22.18.0 y Bubblewrap core 1.27.0.
  Node integrado de ChatGPT rechazó cargar un módulo nativo por firma de macOS;
  se resolvió ejecutando el generador con el otro Node local, sin modificar las herramientas.
- No se ejecutó la suite completa de navegador. En esta fase inicial no hubo prueba en dispositivo, APK/AAB,
  validación de OAuth Android, firma ni comprobación de DAL vivo.

## Paso 1 completado: APK de diagnóstico

Por autorización posterior del propietario se prepararon herramientas temporales y se compiló
`assembleDebug`: BUILD SUCCESSFUL, 31 tareas, firma APK v2 verificada con apksigner.
JDK Temurin 21.0.13, SDK platform 36, build-tools 35.0.0, Gradle 8.11.1 y AGP 8.9.1.
La descarga oficial commandlinetools-mac_arm64-15859902 pasó SHA-256
`835b62a26162b229b441d1f6d4680383815a270809eb33522c0d480fa5002c4e`.
Se aceptaron las licencias del SDK para la compilación local. No se instaló globalmente.

Correcciones necesarias tras intentar compilar:
- Sustituir JCenter por Maven Central, también en el generador reproducible.
- Subir mínimo Android de API 23 a 24, requerido por Android Browser Helper 2.7.4.
  El preflight comprueba ambos ajustes. No se forzó una biblioteca incompatible.

APK entregada fuera del repo: `../SHAAH-Android-prueba-0.1.0.apk`.
Paquete provisional `io.github.trypartylol_max.shaah`, versión 0.1.0 (1), min 24, target 36.
SHA-256 del archivo: `d9efe7f9fde1fb3bd4d1c129f3ee6c4d904cf51137d1ff7fe83a10e0f74701d8`.
Huella SHA-256 del certificado DEBUG:
`7E:E8:2E:39:6F:AE:AE:66:86:43:3F:5A:BA:BF:FA:67:FE:D6:97:97:80:83:67:52:60:D3:A4:8D:BE:1A:15:AE`.
La clave debug se conserva solo en `private/shaah-debug.keystore`, ignorada por git;
es de diagnóstico y no sirve como identidad de publicación. No se publicó DAL.

Siguiente paso: transferir e instalar esta APK en un Android 7+ y probar arranque.
No se ejecutó en teléfono ni emulador. Sin DAL puede mostrarse barra de navegador.
Abre la web de producción existente: cualquier interacción con la cuenta puede escribir datos reales.
No se configuró backend de pruebas ni se realizaron acciones de cuenta.
No hay AAB, firma release, subida a GitHub/Play, merge, despliegue ni escritura en Supabase.
Las advertencias del build sobre versión XML del SDK y atributo package generado no
impidieron compilar; deben revisarse antes de una entrega release.
