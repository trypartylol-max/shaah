# SHAAH-TEST — ejecución de fase 2

Proyecto autorizado: **SHAAH-TEST**, `kpnwiwaiwnndpvtxkvva`, organización
trypartylol-max, Free, eu-west-1. URL:
`https://kpnwiwaiwnndpvtxkvva.supabase.co`.

Este directorio ejecuta pruebas con datos ficticios. La rama incluye correcciones
del cliente; no incluye credenciales. La preview se publica desde un Site y
repositorio distintos, descritos en [qa/preview](../preview/README.md).

## Estado verificado y credenciales

Actualización **2026-10-18**: **115/115 pruebas locales** y **12/12 escenarios
autenticados reales** aprobados en el candidato final, más once casos de migración
y recuperación y retención verificada. Las 17 comprobaciones SQL anteriores se
conservan como evidencia histórica, separadas del ensayo Auth actual.
La [preview privada](https://shaah-test-location-groups.arviler.chatgpt.site)
también pasó sus siete comprobaciones. Ver el
[informe actual](../../docs/SHAAH_PRODUCTION_CANDIDATE_2026-10-18.md).
**No volver a crear la tabla ni ejecutar el bootstrap.**

Se crearon dos usuarios sintéticos nuevos mediante Auth Admin API y se guardaron
sus siete campos en secretos de Sites. El provisionador temporal se cerró con
HTTP 410 y ya no contiene llamadas administrativas. El runner local consumió
los secretos por stdin oculto, sin guardarlos en disco. No se utilizó una cuenta
personal ni se inspeccionaron los usuarios existentes.

No quedan credenciales pendientes del propietario para usar la URL. No pegar
contraseñas, tokens o sesiones por chat. Las cuentas publicadas A/B ya tienen
datos sintéticos y pueden contener pruebas manuales: **no vaciarlas ni repetir
el seed**. Una futura ejecución completa necesita cuentas QA nuevas y vacías.

No hace falta compartir claves `service_role`, `sb_secret`, acceso al dashboard
personal ni contraseñas de la base de datos. El ejecutor de sincronización no
crea usuarios ni ejecuta SQL administrativo. La prueba SQL separada creó usuarios
sin contraseña únicamente dentro de su transacción revertida; no son cuentas
utilizables para iniciar sesión. Ese script histórico está deshabilitado para
cumplir el flujo actual, que solo provisiona usuarios mediante Auth Admin API.

La opción **Automatically expose new tables** estaba desactivada al crear el
proyecto. El SQL concede acceso solamente a `public.day_logs` para
`authenticated`, activa RLS y añade la tabla a Realtime. No se debe activar
exposición general de tablas para solventar un error. Si Data API o el esquema
`public` no estuvieran disponibles, el preflight lo detectará como tabla
inaccesible; se revisará específicamente esa configuración de SHAAH-TEST.

## Configuración esperada

Los nombres son:

```text
SHAAH_TEST_SUPABASE_PUBLISHABLE_KEY
SHAAH_TEST_USER_A_ID
SHAAH_TEST_USER_A_EMAIL
SHAAH_TEST_USER_A_PASSWORD
SHAAH_TEST_USER_B_ID
SHAAH_TEST_USER_B_EMAIL
SHAAH_TEST_USER_B_PASSWORD
```

Los ID son los UUID de Authentication; A y B deben ser distintos. URL y referencia
ya están fijadas al proyecto autorizado. Si se configuran opcionalmente
`SHAAH_TEST_SUPABASE_URL` o `SHAAH_TEST_PROJECT_REF`, deben coincidir exactamente.

Los secretos se consumen sin imprimirlos ni guardarlos en resultados. `.env*` y
los resultados locales están excluidos de Git; es preferible usar secretos del
entorno en lugar de archivos locales.

## Comandos

Requiere Node 24 para las solicitudes remotas con `--use-env-proxy`; la suite local
sigue admitiendo Node >=22. Usar el proxy y la confianza TLS del entorno. No
desactivar TLS ni cambiar rutas de red para evitar una restricción.

```bash
npm ci --ignore-scripts
npm run test:sync:safety       # pruebas locales; sin un Supabase conectado
npm run test:sync:check        # solo validación de configuración; ninguna solicitud
npm run test:sync:probe        # un GET sin credenciales a SHAAH-TEST; 401 es esperado
npm run test:sync:public       # clave pública en secreto; Auth settings + REST limit=0
npm run test:sync              # ejecución remota explícita, solo cuando esté todo listo
```

`npm test` no ejecuta la batería remota. Si faltan secretos o el proyecto no
coincide, el ejecutor se detiene antes de autenticarse o escribir y devuelve
código 2. Los errores de la batería devuelven 1; éxito devuelve 0.

Para verificar los dos escenarios que antes reproducían defectos, sin red:

```bash
npm run test:sync:diagnose-local
```

Este diagnóstico ahora devuelve 0: conserva el propietario A y ambas ediciones
concurrentes con el cliente corregido y un backend en memoria. Devuelve 1 si
reproduce de nuevo un defecto. No certifica sincronización real. Hay además
19 regresiones de sincronización y dos pruebas de navegador en la suite normal.

El cliente conserva las colas y borradores por cuenta, detecta conflictos de
settings y ofrece elegir una versión o exportar los cambios. Una cola antigua
sin propietario se conserva con aviso y exportación, sin asignarla ni subirla
automáticamente. Las preferencias de modo de usuarios identificados también se
guardan por cuenta. No abrir directamente el HTML del repositorio para QA:
usar los tests o el runner, que bloquean producción antes del arranque.

## Aislamiento y límites

- Node solo admite los endpoints Auth previstos y `day_logs` en el host QA
  exacto, sin seguir redirecciones. Rechaza claves privilegiadas.
- Chromium usa perfiles nuevos y rutas HTTP/WebSocket restringidas al mismo
  proyecto. El SDK real 2.118.0 se sirve localmente. El HTML QA se transforma
  en memoria antes del arranque y nunca se escribe sobre `index.html`.
- Antes del primer seed se autentican/verifican ambos UUID y se comprueba que
  ambas cuentas estén vacías. Si hay datos, aborta; no los borra.
- Un manifiesto por ejecución reserva propietarios y claves sintéticos antes
  de escribir. Los fixtures se conservan para inspección; no hay borrado general
  ni limpieza automática de cuentas o tablas. Una repetición con esas cuentas
  no vacías abortará hasta revisar su limpieza limitada al manifiesto.
- La batería remota preparada cubre arranque, RLS, settings, multiubicación,
  Inactive, recarga, historial/modos, INSERT/UPDATE/DELETE, aislamiento del DELETE,
  respaldos y los dos escenarios negativos de concurrencia y cambio de cuenta.
- Esos escenarios con sesiones reales pasaron en la ejecución documentada.
  La prueba SQL con claims simulados se mantiene como evidencia distinta.
  Chromium necesitó un puente WSS Node con la CA/proxy del entorno; transmite
  frames de Supabase reales y no desactiva TLS. Un SDK fijado para QA no demuestra igualdad con
  la versión flotante cargada hoy por producción. Google OAuth, iOS físico y la
  equivalencia del esquema productivo quedan fuera de esa certificación.

No se guarda HAR, vídeo ni storageState con tokens. El informe no incluye
mensajes de error de SDK/navegador que pudieran contener URLs o credenciales.

## Evidencia

```text
test-results/supabase-phase2/readiness.json
test-results/supabase-phase2/gateway-probe.json
test-results/supabase-phase2/local-risk-diagnostics.json
test-results/supabase-phase2/schema-metadata-2026-10-18.json
test-results/supabase-phase2/rls-rollback-2026-10-18.json
test-results/supabase-phase2/rls-cas-rollback-2026-10-18.json
test-results/supabase-phase2/public-preflight.json
test-results/sync-all-final-2026-10-18.txt
test-results/supabase-phase2/runs/<run-id>/manifest.json
test-results/supabase-phase2/runs/<run-id>/report.json
```

Los últimos dos se crean solo al iniciar una ejecución remota con configuración
completa. Cada ejecución tiene su directorio; una comprobación de preparación no
sobrescribe evidencias previas. Un estado `blocked` o `configuration_ready_not_executed`
no certifica sincronización.
