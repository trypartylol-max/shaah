# SHAAH — estado actual (2026-11-09)

Análisis hecho desde cero sobre el código de `main` en `68032b3` ("Publish English and Spanish in SHAAH", 2026-11-09). Los documentos históricos de `docs/` no se usaron como fuente. No se tocó código, base de datos ni versión publicada.

> **Actualización (rama `fix/remove-personal-email`):** el punto 1 y el código muerto del punto 8 se corrigieron en esa rama (`historyRepairAccount()` ahora exige `CFG.repairWorkReturn2026 === true`; se borraron `setVacationStartOnce` y `repairHistoricalVacationTimeline`). Pendiente de revisión y merge. El texto de abajo describe `main` en `68032b3`.

## 1. Versión publicada frente al repositorio
- Último commit: `68032b3360f50fa50a513aed4b9372f5e18a4c99`, 2026-11-09. El repo tiene 447 commits; 24 se hicieron el 07/11.
- **Coinciden.** `index.html`, `sw.js` y los 29 archivos de `assets/` que referencia tienen el mismo SHA-256 en https://trypartylol-max.github.io/shaah/ y en el repo. Los dos builds (`app.2314a44f6c1f22cb.js` y `app.90e8d834e10cc183.css`) se corresponden con `source/`.
- El build es reproducible: reconstruir en una copia no cambia ningún archivo.
- Método: se descargó cada archivo publicado desde el navegador integrado y se comparó su hash con el del clon. Desde el shell, `github.io` está bloqueado.

## 2. Arquitectura real
- **Sin framework ni módulos.** Un `source/app.js` de 6.926 líneas en ámbito global, `source/app.css` (3.096 líneas), `source/index.html` (cargador de 120 líneas con CSP estricta) y `source/performance.js`.
- `scripts/build-production.py` copia `source/app.*` a `assets/app.<sha256[:16]>.*`, parchea `index.html` con rutas e integridad SRI, versiona las hojas auxiliares con `?v=` y genera `sw.js` (caché completa de los archivos referenciados, instalación atómica y verificada por SRI).
- Pieles: Original, Aurora, Matrix y Bajo estímulo. Layout aparte: estándar o Pro (solo escritorio ≥880 px). Las preferencias de aspecto viven en `localStorage` del dispositivo, no en la cuenta.
- Seguridad de cliente: CSP con `script-src 'self'` y `style-src-attr 'none'`; los eventos se despachan por una lista cerrada (`UI_ACTIONS`, unas 170 reglas) y los estilos por `uiStyle()`; todo texto de usuario pasa por `esc()`. La importación JSON valida estructura, profundidad y claves peligrosas. La única red externa es Supabase.
- Pestañas: TODAY, LOG, SOCIAL, STATS, HISTORY, más Settings. Pantallas aparte para edición de un día pasado y para el temporizador de rutina.
- Perfil "starter" para cuentas nuevas (plan simple con plantillas) y tour inicial.

## 3. Lógica funcional (verificada leyendo el código y ejecutando `calcScore`/`GRADE`)
**Puntuación.** Cada hábito tiene nivel 1-3 y puntos propios. El estado de un hábito es `true`, `false` o `0.5` (light, medio crédito). Puntos = `round(pts × fracción)`. El día se puntúa con la época de configuración vigente ese día. Notas: S+ ≥95 %, S ≥85, A ≥72, B ≥45, C ≥30, D ≥15, F. Con `DEFAULT_CFG` el máximo es 112. Comprobado con una cuenta simulada: wod completo + work a medias + sleep + 2 de 3 partes del combo = 52/112 (46 %, nota B).

**Hábitos y rutinas.** `wod` y `production` son rutinas con pasos y temporizador, y un toque cicla ninguno → light → completo. `sleep` registra dos eventos con hora (despertar = ½, dormir = completo). `work` pasa a hitos en ₪ cuando la cuenta tiene la migración Social/Core (`shaahSocialCoreMigration`), con vigencia desde mañana.

**Social.** `social` es un combo cuyas partes (`CFG.subs`) tienen puntos propios por modo; vale la suma de las partes marcadas. Las personas (`CFG.people`) llevan una frecuencia objetivo en días; "Who to see" ordena por lo vencido que está cada contacto. Marcar la única persona de una parte la selecciona sola.

**Línea de tiempo.** `CFG.log` es una lista de épocas con `from`. Cambiar el plan crea una época nueva desde hoy; el pasado no se reescribe. Cada época lleva su modo, Work o Vacation. En Vacation `work` queda fuera y los puntos salen de `pVacation`. Hoy obedece al interruptor vivo; los días pasados, a su época.

**Estadísticas e historial.** Racha = días seguidos con ≥30 % (hoy sin marcar no la rompe). Medias sobre porcentajes normalizados, porque el máximo cambia entre épocas. Historial semanal, mensual y anual; consistencia a 60 días por hábito; media por día de la semana; "Who to see".

**Day Log.** Eventos con hora guardados dentro de la fila del día (`_daylog`). Los hábitos completados generan eventos enlazados; las actividades manuales son independientes. Hay copia local por usuario y resumen/cobertura del día.

## 4. Supabase, persistencia y sincronización
- Una tabla `day_logs(user_id, date, data jsonb, settings_revision)`. `date` multiplexa: días (`YYYY-MM-DD`), `settings`, `cfgbak` y `routine:<id>`. RLS por propietario. Esquema solo contrastado con las migraciones del repo, no con la base real.
- **Días:** copia optimista local, cola offline durable por propietario y `upsert` de la fila completa 250 ms después. Cada solicitud verifica propietario y época de sesión. Mientras un día tiene guardado pendiente, el eco de Realtime no lo pisa. Si no, la fila remota sustituye a la local entera.
- **Configuración:** borrador local + fusión de tres vías (`mergeCfg`) + RPC `shaah_save_settings_v1` con revisión esperada; reintenta hasta 4 veces ante conflicto. Copia previa en cada guardado (anillo de 5 en `cfgbak`) y 50 revisiones en el servidor.
- **Rutinas compartidas:** compare-and-swap en `routine:<id>` comparando el JSON anterior.
- **Realtime:** canal por usuario con INSERT/UPDATE filtrados y DELETE verificado contra RLS.
- **Arranque:** lee todas las filas de la cuenta de una vez (con tiempo límite de 20 s). Si falla y hay copia local, abre en modo "OFFLINE — SAVED LOCALLY" y deshabilita escrituras al servidor hasta reconectar.

## 5. Problemas encontrados
Ordenados por importancia. "Verificado" significa que lo comprobé en el código o con una ejecución; "inferido" que depende de algo que no pude ver.

| # | Problema | Gravedad | Estado |
|---|---|---|---|
| 1 | **Email personal en código público.** `historyRepairAccount()` compara con una dirección fija (línea ~1752 de `source/app.js`) y la misma aparece en 44 de los archivos `assets/*.js` (builds antiguos incluidos), además del historial de git. Hay nombres propios en comentarios (líneas ~1574 y ~1673). El repo es público. | Alta (privacidad) | Verificado |
| 2 | **Suite de navegador en rojo en HEAD.** 75 fallos de 292 ejecutados (apartado 6). Una parte son selectores en español que ya no existen y UI retirada; otra parte no está explicada. El último commit actualizó algunos tests y dejó otros sin tocar. | Alta (sin red de seguridad) | Verificado en parte |
| 3 | **La carga no pagina.** `readAccountRows` pide todas las filas de golpe. Con el límite por defecto de PostgREST (1000 filas), `count !== rows.length` lanza `LOAD_INCOMPLETE` y la app arranca para siempre en modo solo local sin sincronizar. `historyRead` sí pagina de 500 en 500. | Media, latente | Inferido (depende del `max-rows` del proyecto y de cuántas filas hay hoy) |
| 4 | **`assets/` acumula 139 archivos `app.*` antiguos** (39 MB). El build no los limpia y Pages los sirve todos. Dificulta revisar el repo y deja versiones viejas accesibles. | Media | Verificado |
| 5 | **Funciones declaradas dos veces.** `settingsPeople`, `locationAdd` y `locationRename` aparecen en ~2544-2560 y en ~6773-6779; gana la segunda. Consecuencia: el filtro de Settings activo/inactivo/todos (`peopleSettingsFilter`) no filtra, y las primeras versiones son código muerto. | Media | Verificado |
| 6 | **Fila de día = última escritura gana.** Una edición hecha sin conexión se sube como instantánea completa del día. Si otro dispositivo cambió ese mismo día entretanto, se pierden sus cambios. No hay revisión ni fusión por campo (la fusión que existía antes ya no está). | Media | Inferido; no probado con dos dispositivos |
| 7 | **Compare-and-swap de rutinas por filtro JSONB en la URL** (`.eq('data', JSON.stringify(base))`). Es frágil (tamaño, normalización de números) y va contra la propia regla que documenta el código para `settings`. | Baja-media | Verificado en código |
| 8 | **Migraciones y reparaciones atadas a la cuenta de David dentro del bundle de todos.** En cada carga se evalúan `addFamilyOnce`, `addJunkFoodOnce`, `rebalanceOnce`, `recoverPeopleFromDays` y `runShaahSocialCoreMigration`; esta última impone `work.p=25` e hitos en ₪ a toda cuenta no-starter con config existente. `setVacationStartOnce` y `repairHistoricalVacationTimeline` están definidas y **no se llaman en ningún sitio** (código muerto). La reparación de historial manual (`ensureWorkReturn2026`) solo se ofrece si el email coincide con el fijo del punto 1. | Media | Verificado |
| 9 | **Textos fuera del sistema de idiomas.** Español fijo en `'SIN PLAN'`, `'Máximo desde mañana: …'`, el estado del layout y los detalles de pieles; inglés fijo en "total", "CORE/HABITS/BONUS". `interfaceCopy()` lanza `TypeError` si falta una clave (hoy no falta ninguna de las 314 literales). Las tablas traen una tercera columna sin usar. | Baja-media | Verificado |
| 10 | **Inconsistencias de conteo.** `habitStreak` pone a 0 la racha hasta marcar hoy, a diferencia de `getStreak`; cuenta el light como hecho, y la comparación semanal solo cuenta `=== true`. `calcScore.done` cuenta también el combo y el light. | Baja | Verificado |
| 12 | **Torre de Control: backend sin versionar, UUID fijo y `supabase-js` desde CDN sin SRI** (ver sección 8). | Media-alta | Verificado en el HTML; backend no revisable |
| 11 | **Código muerto y acoplamiento.** `socialOwnTab()` siempre devuelve `true`; `LEGACY_CFG`, `legacyComboBlock`, `socialPts` en `renderToday` ya no se usan; un archivo de 6.900 líneas con estado global mutable. | Baja | Verificado |

Lo que sí está bien resuelto: CSP estricta con SRI, importación validada, aislamiento por propietario en todas las escrituras, protocolo de revisiones para la configuración, build reproducible y 299 pruebas unitarias que ejecutan el código real.

## 6. Pruebas
- `npm run test:unit`: **299 de 299 pasan** (~4 s).
- `npm run test:browser` (Chromium 1243, sin WebKit):

**Navegador (parcial).** Ejecuté `npm run test:browser` con Chromium y lo detuve en el test nº 292 (no llegó al final; desconozco el total): **217 pasan y 75 fallan** (77 archivos de test). Por qué fallan, según el mensaje de error de cada uno:
- 14 esperan botones con nombre en español que el idioma por defecto (ahora inglés) ya no muestra: "Cerrar bienvenida", "Cancelar borrado", "Vista previa de Aurora", "Enfoque".
- 12 esperan la tarjeta de Work por hitos `.wg-card` y no la encuentran; no comprobé si falta el dato de prueba o si la tarjeta dejó de pintarse.
- 17 no encuentran un `textarea` (la nota del día). El código lo sigue generando, así que puede ser un cambio de visibilidad por defecto o un fallo real. Sin resolver.
- 11 son comparaciones visuales ("actual vs esperado") de pieles.
- 5 son `page.goto` con tiempo agotado, probablemente por carga de la máquina.
- 16 con otras causas sin clasificar (por ejemplo, Stats ya no muestra "Most consistent" entre las tarjetas principales; temporizador de rutinas; carga de fuentes).
Los fallos se concentran en `checkbox-feedback`, `phase2-identities`, `glow`, `csp-styles-parity`, `phase3-appearance` y `arrival`. **No separé fallo de test y regresión real; hasta hacerlo, la suite de navegador no sirve como red de seguridad.** WebKit no se ejecutó (no está instalado aquí).

Las pruebas de navegador escriben capturas dentro de `docs/` y de la raíz; limpié esos cambios para dejar el árbol intacto.

## 7. Preguntas abiertas para David
1. ¿Puedo cambiar el email fijo por un indicador de configuración (o quitar las reparaciones de una sola vez que ya corrieron)? ¿Quieres además limpiar el historial de git?
2. ¿Cuántas filas tiene tu cuenta hoy y qué `max-rows` tiene el proyecto Supabase? Decide si el punto 3 urge.
3. ¿Quieres que arregle los tests de navegador (actualizar selectores y retirar los de UI eliminada) antes de tocar funcionalidad?
4. ¿SHAAH es solo tuyo o planeas abrirlo a otros usuarios? Cambia la prioridad de las migraciones atadas a tu cuenta y del texto fijo en español.
5. ¿Se publica por "Deploy from branch" de `main`? No encontré workflow ni CNAME.
6. ¿La tercera columna de idioma (hebreo) es un trabajo en curso?

## 8. Torre de Control (`control/`) — análisis añadido
- Página única de 75 KB para el propietario, en `/shaah/control/`. Escribe y lee en el **proyecto de producción**: bitácora (`shaah_control_journal`), publicaciones, entornos, incidencias/roadmap y métricas por RPC; la pestaña Usuarios y Publicaciones pasa por la Edge Function `control-pages`.
- **Backend sin versionar:** las tablas `shaah_control_*`, su RLS, la RPC y la función no están en `supabase/` ni en `qa/`. No se puede verificar que solo el propietario lea o escriba. La comprobación `user.id === OWNER` del cliente es cosmética.
- **UUID del propietario y clave `anon` en el HTML público.** La clave `anon` es pública por diseño, el UUID es un identificador personal más (junto al email del punto 1).
- **Dependencia externa sin SRI:** `supabase-js` desde jsDelivr (`crossorigin="anonymous"`, sin `integrity`). La app principal sirve su propia copia con SRI. Un CDN comprometido ejecutaría código con la sesión del propietario.
- La Bitácora impone un paso al flujo de entrega: registrar cada entrega verificada con su SHA completo. Esta sesión no tiene el conector de Supabase, así que ese registro quedaría pendiente.
- SHAAH-TEST (`kpnwiwaiwnndpvtxkvva`) es un proyecto Supabase aparte con usuarios sintéticos A/B y una preview privada; sirve para probar cambios con datos reales de Supabase sin tocar producción. No lo ejecuté.
