# CLAUDE.md — SHAAH

Guía para sesiones futuras. Está escrita a partir del código en `68032b3` (2026-11-09), no de los documentos históricos de `docs/`. Si algo de aquí contradice el código, manda el código: verifícalo con `grep` y corrige este archivo.

## Qué es
PWA de seguimiento de hábitos, en JavaScript puro y sin framework. Cada día puntúa contra el plan vigente ese día y recibe una nota de F a S+. Incluye rutinas con temporizador, Day Log (actividades con hora), Social (personas y combo), Stats e Historial. Datos y login en Supabase (Google, PKCE). Se publica en GitHub Pages: https://trypartylol-max.github.io/shaah/

**El repositorio es público.** No escribas en el código ni en `docs/` emails, nombres de personas, tokens ni datos personales. (El email fijo de `source/app.js` ya se retiró y los builds antiguos de `assets/` se borraron; solo sigue en el historial de git, y el UUID del propietario sigue en `control/index.html`. Ver `docs/ESTADO_ACTUAL_2026-11-09.md`.)

## Reglas de trabajo
- **Nunca cargues `source/app.js` entero** (6.900 líneas, 530 KB, ~150k tokens). Localiza con `grep -n 'function nombre' source/app.js` y lee con `sed -n 'A,Bp'`. Edita con la herramienta Edit.
- Se edita **solo `source/`** (`app.js`, `app.css`, `index.html`, `performance.js`, `sw-template.js`). Después hay que reconstruir.
- **No edites a mano**: `index.html` de la raíz, `sw.js`, `assets/app.<hash>.js|css`, `assets/performance.<hash>.js`. Los genera el build.
- Los demás archivos de `assets/` (`pro-mode.css`, `aurora-skin.*`, `skin-identities.css`, `ui-refinement-*.css`, etc.) sí se editan a mano. Los que están en la lista del script de build reciben `?v=` y SRI automáticamente al reconstruir.
- `AGENTS.md` manda: al cerrar una entrega significativa y autorizada, registrarla en `docs/bitacora.md` (conector Supabase, sin crear tareas periódicas). **Nunca declares algo publicado sin verificar el despliegue.**
- No modifiques datos de producción, ni migraciones ni `qa/` sin autorización explícita. El proyecto de pruebas es SHAAH-TEST (`qa/supabase/README.md`).

## Build, tests y despliegue
```
python3 scripts/build-production.py     # source/ -> assets/ hasheados, index.html, sw.js
npm ci
npm run test:unit                        # 299 tests, ~5 s, verdes a día 2026-11-09
npm run test:browser                     # Playwright; requiere CHROMIUM_PATH (ver abajo). ~15 min. En verde a 2026-11-10: 293 pasan, 0 fallan, 1 omitido (el del dock de Matrix, con su motivo en el propio test). Ojo: deja capturas modificadas en docs/ y en la raíz; revierte con git checkout -- docs y borra los .png sueltos de la raíz
SHAAH_SOURCE=source/app.js npm test      # probar el fuente sin reconstruir
```
- Los tests unitarios ejecutan el código real de `app.js` en un `vm` con DOM simulado (`tests/helpers.cjs`, `loadApp()`); sirven para llamar funciones concretas (`calcScore`, `cfgForDate`, `persistDay`…).
- Chromium en este entorno: `CHROMIUM_PATH=/opt/pw-browsers/chromium-1243/chrome-linux*/chrome`.
- Build reproducible: el nombre de `app.<16 hex>.js` es el SHA-256 del contenido. Reconstruir sin cambios no deja diff.
- Despliegue: GitHub Pages sirve la raíz de `main` (workflow automático "pages build and deployment", ~2 min tras el merge; `gh api repos/trypartylol-max/shaah/actions/runs`). `gh` solo funciona por REST (`gh api`), no GraphQL (`gh pr view` falla). Verificar = comparar `index.html`, `sw.js` y cada archivo de `assets/` referenciado contra lo publicado. Desde el shell `github.io` está bloqueado; se hace con `fetch` + `crypto.subtle` desde el navegador integrado (pedir acceso al sitio). El 2026-11-09 coincidían los 31 archivos.
- `git clone` de GitHub por HTTPS funciona desde el shell. Supabase y `github.io` no.

## Mapa de `source/app.js` (las líneas se mueven; usa grep)
| Zona | Dónde buscar |
|---|---|
| Cliente Supabase y constantes | líneas 1-25 (`SUPABASE_URL`, clave `anon`, `sb`) |
| Pieles y layout (4 pieles + Pro) | `applySkin`, `setSkin`, `setLayout`, `SKINS` |
| Day Log (actividades con hora) | `dayLog*` (466-950), `renderDayLogTab` |
| Bienvenida / tour / perfil "starter" | `arrival*`, `starter*`, `TOUR` |
| Configuración por defecto | `DEFAULT_CFG`, `LEGACY_CFG` |
| Acciones de UI permitidas (CSP) | `UI_ACTIONS`, `ui()`, `uiDispatch` |
| Puntuación por época | `cfgForDate`, `levelsFor`, `modePts`, `subsFor`, `calcScore`, `GRADE`, `nextMove` |
| Modo Work/Vacation | `travelMode`, `applyTravelMode`, `restoreLiveTravelMode` |
| Migraciones al cargar (`loadAccountRows`) | `ensureBaseline`, `widenBaseline`, `addFamilyOnce`, `addJunkFoodOnce`, `rebalanceOnce`, `runShaahSocialCoreMigration`. Reparación manual de historial (solo si la config de la cuenta tiene `repairWorkReturn2026: true`): `ensureWorkReturn2026`, `history*` |
| Persistencia de días | `persistDay`, `queueOfflineDay`, `sendDayItem`, `flushOfflineQueue` |
| Sincronización de configuración | `saveCfg`, `queueCfgSave`, `flushCfgSaves`, `mergeCfg`, `bak*` |
| Carga y Realtime | `loadAll`, `loadAccountRows`, `rowToState`, `subscribeRealtime` |
| Rutinas y temporizador | `startRoutine`, `advanceSession`, `*RoutineCloud`, `writeRoutineRecord` |
| Social y personas | `peopleStatus`, `toggleSub`, `social*`, `comboBlock` |
| Work por hitos (₪) | `workMilestone*`, `workPhase*`, `workWeeklyCash` |
| Pantallas | `renderToday`, `renderDayLogTab`, `renderSocial`, `renderStats`, `renderHistory`, `renderSettings` |
| Auth y arranque | `signIn`, `signOut`, `boot`, `activateAccountSession` |
| Textos EN/ES | `interfaceMessages` (`interfaceText(clave)`), `interfaceCopies` (`interfaceCopy("texto en inglés")`) |

## Modelo de datos (Supabase)
Una sola tabla `public.day_logs(id, created_at, date text, data jsonb, user_id, settings_revision)` con `UNIQUE(user_id, date)`. La columna `date` multiplexa varios tipos de fila:
- `YYYY-MM-DD`: un día. `data = {score, grade, l1, l2, l3, done, max, pct, _checks, _social, _people, _note, _daylog}`. Las claves con `_` son la fuente; las demás son un resumen.
- `settings`: `data._cfg` = configuración completa. Solo se escribe con la RPC `shaah_save_settings_v1(p_expected_revision, p_data)` (control de revisión, historial de 50 versiones en `shaah_private`). Los INSERT/UPDATE/DELETE directos sobre `settings` están denegados por políticas restrictivas.
- `cfgbak`: anillo de copias de configuración (upsert directo, con debounce).
- `routine:<id>`: estado compartido de una rutina entre dispositivos.
RLS: solo el propietario (`auth.uid() = user_id`). La clave `anon` embebida es pública por diseño. Las migraciones del repo (`supabase/`) describen el esquema previsto; no se pudo contrastar con la base real.

## Puntuación (resumen verificado)
- `checks[id]` es `true`, `false` o `0.5` ("light"). `0.5` solo se usa en hábitos de rutina y en `work`/`sleep` (`halfCreditItem`). `doneFrac()` lo convierte en fracción.
- Puntos de un hábito = `round(pts × fracción)`. El máximo del día es la suma de `pts` de los hábitos activos esa época.
- Combo social: si el hábito `social` está marcado, vale la suma de `p` de las partes marcadas; si no hay ninguna parte marcada, vale el total.
- Notas por porcentaje: S+ ≥95, S ≥85, A ≥72, B ≥45, C ≥30, D ≥15, F debajo. `GRADE(score, max)`.
- Racha: días consecutivos con ≥30 % (`STREAK_MIN`). Hoy sin marcar no la rompe.
- Configuración por defecto: máximo 112 (con `nofap` apagado). La cuenta real de David usa otra configuración y otros máximos; no asumas un número fijo.

## Línea de tiempo de configuración (lo más delicado)
- Cada día se puntúa con la **época** (`CFG.log[]`, ordenada por `from`) vigente ese día. Cambiar el plan crea una época nueva desde hoy y nunca reescribe el pasado.
- El modo Work/Vacation es por época. En Vacation `work` queda fuera y los puntos salen de `pVacation`. Hoy se rige por el interruptor vivo (`CFG.travel.mode`); los días pasados por su época.
- `cfgForDate` cachea los días pasados en `_dayCfgCache`; `applyCfg()` la vacía.
- `CFG.workMilestones[]`: hitos de Work (importes en ₪ y puntos), con vigencia desde mañana.

## Invariantes que no se deben romper
1. `applyCfg()` solo se llama desde `boot()` y desde funciones ya en ejecución. Nada debe ejecutarse en el nivel superior del script (provocó un error TDZ el 13/09).
2. Toda escritura asíncrona comprueba `USER?.id === owner && _syncEpoch === epoch` antes y después del `await`.
3. Mientras un día tiene `_pending[key]`, un eco de Realtime **no** lo pisa (`rowToState`).
4. `settings` solo por la RPC. Nunca `upsert` directo ni filtros JSONB en la URL.
5. `saveCfg()` guarda copias de seguridad en cada llamada; las preferencias de interfaz (plegado de niveles, etc.) van por `saveCfgPref()`, que no las consume.
6. Un `settings` entrante sin `log` o con `log` más corto no puede borrar la historia (`rowToState` conserva el `log` previo).
7. `renderToday` sirve HOY y la edición de días pasados; `comboBlock` sirve también la pestaña Social. Una condición pensada para hoy se rompe en días pasados: revisar siempre ese caso.
8. CSP estricta: nada de `onclick=`, `style=` inline ni scripts inline. Los eventos van por `ui('click','accion',…args)` y la acción debe existir en `UI_ACTIONS`; los estilos por `uiStyle(...)`. Todo texto de usuario pasa por `esc()`.
9. `interfaceCopy("texto")` lanza `TypeError` si el texto no está en `interfaceCopies`; al añadir un texto, añade la entrada EN/ES. Los idiomas activos son `en` y `es` (las tablas traen una tercera columna sin usar).
10. Hay funciones declaradas dos veces (`settingsPeople`, `locationAdd`, `locationRename`): gana la última. Antes de tocarlas, edita la que de verdad se ejecuta (la del final del archivo).

## Torre de Control (`control/`)
Panel privado del propietario, página independiente (`control/index.html`, 75 KB, un solo archivo con script inline). Se publica en `/shaah/control/` y también existe una variante `/api/control` fuera del repo. Login con Google (PKCE, clave de sesión `shaah-control-auth-v1`) y comprobación en cliente `user.id === OWNER` (UUID fijo en el archivo; en el cliente es solo de interfaz, la seguridad real está en el servidor). Pestañas: Vista general, Bitácora, PRODUCT ↔ TEST, Publicaciones, Usuarios, Roadmap/incidencias/notas.
- Usa el **proyecto de producción** (`llpyxktcfubhmthqujpa`): tablas `shaah_control_journal`, `shaah_control_releases`, `shaah_control_environments`, `shaah_control_items`, RPC `shaah_control_metrics` y la Edge Function `control-pages` (en Pages) para publicaciones y usuarios.
- Ese backend (tablas, RLS, RPC, función) no está versionado en este repo. Revisado el 2026-11-10 con el conector de Supabase: RLS limita las tablas `shaah_control_*` al propietario y la Edge Function `control-pages` valida el JWT contra `/auth/v1/user`, exige el UUID del propietario, solo acepta el origen de GitHub Pages y usa la clave `anon` con el JWT del usuario (sin `service_role`); las acciones de publicación las reenvía a una función de Netlify. No supongas que el `OWNER` del cliente protege nada por sí solo.
- Carga `supabase-js@2.118.0` desde `cdn.jsdelivr.net` sin SRI (la app principal no carga nada externo) y su CSP permite ese origen más un script inline por hash. Si cambias el script inline hay que recalcular el hash de la CSP.
- Bitácora: tras una entrega significativa y autorizada, `AGENTS.md` y `docs/bitacora.md` piden registrar una entrada en `public.shaah_control_journal` con el conector Supabase (`source_key = github:<owner/repo>:<SHA completo>`, `state='published'` solo tras verificar el despliegue). Si no hay conector, se informa que el registro quedó pendiente; nunca afirmar que se guardó.

## Entornos de prueba
- **SHAAH-TEST** (`kpnwiwaiwnndpvtxkvva`): proyecto Supabase aparte, con usuarios sintéticos A/B. Lo usan los scripts de `qa/supabase` y la preview privada de `qa/preview`. No ejecutes `reset-synthetic.cjs` ni `seed-demo.cjs` contra A/B publicados, ni el bootstrap SQL.
- Desde el shell de Claude Code esos hosts están bloqueados y las credenciales no están en el repo.
- Flujo recomendado para un cambio: rama + PR, tests unitarios, build, merge, verificar hashes publicados y registrar en Bitácora. `main` se publica tal cual.

## Cosas conocidas (detalle en `docs/ESTADO_ACTUAL_2026-11-09.md`)
- Queda 1 test de navegador omitido con `skip:` (dock de Matrix: el menú se oculta a propósito durante el arranque). Se eliminaron la suite de Glow y la de paridad CSP (comparaban contra builds congelados) y se reactivaron el resto con los valores actuales. Ojo: el panel "Pro shortcuts" va oculto en el DOM de todos los skins y duplica la nota y la tarjeta Work, así que en los tests usa selectores con `:visible`.
- El botón Collapse All / Expand All de Hoy cubre Core, niveles 1-3, Social combo y la nota; el anillo y el Day Log quedan fuera (`TODAY_ALL_EXCLUDED`).
- El email personal ya no está en `source/app.js` ni en `assets/`; solo sigue en el historial de git.
- `assets/` conserva solo el build actual y 5 `app.*` antiguos que usan los tests (fixtures `production-*`). El build no limpia los antiguos: al publicar uno nuevo, borra el anterior salvo que algún test lo use (`grep -r app.<hash> tests`).
- `readAccountRows` no pagina: con la configuración por defecto de PostgREST (1000 filas) la carga falla al superar ese número de filas.
