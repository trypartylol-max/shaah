# SHAAH — Correcciones locales de sincronización, 18 de octubre de 2026

> Informe histórico anterior a la publicación QA. El bloqueo de usuarios/secretos
> se resolvió después: 110 pruebas locales, 11 escenarios autenticados y la
> preview privada están verificados en
> [SHAAH_QA_PREVIEW_2026-10-18.md](SHAAH_QA_PREVIEW_2026-10-18.md).

**107/107 pruebas locales y 17/17 comprobaciones de Postgres aprobadas.
Auth/REST/Realtime con sesiones reales sigue bloqueado por secretos QA ausentes.
No listo para producción.**

Se continuó en `test/supabase-sync-phase2-2026-10-16`, sobre `fd69016`.
El cliente candidato sí cambia en este avance; no se ha publicado. SHA256 actual
de `index.html`:
`5bc63c22c7c603f30c4951c963dfce3d1f6b923ce41d483ccda6ec63ade923e6`.
No hubo push, merge, despliegue, conexión a producción ni pruebas con una cuenta
personal. La única ejecución de datos contra Supabase fue una transacción con
fixtures nuevos en **SHAAH-TEST** (`kpnwiwaiwnndpvtxkvva`), terminada en ROLLBACK.

## Problemas corregidos en el cliente candidato

**Cola offline que cambiaba de propietario.** Cada cuenta tiene ahora su propia
cola. Las escrituras capturan el propietario y la sesión de aplicación al
programarse. Un cambio de cuenta cancela temporizadores y descarta respuestas
antiguas; una petición en vuelo no toma el nuevo usuario para enviar datos del
anterior. Un acuse antiguo tampoco elimina una edición más reciente, incluso
si el usuario cambia A→B→A antes de recibirlo.

Los datos se guardan en la cola antes del envío, también durante el debounce.
Si la red falla o cambia la cuenta, permanecen disponibles para su propietario.
La cola antigua compartida carece de una identidad demostrable: se conserva sin
modificar y se ofrece exportarla; no se restaura ni sube a una cuenta por suposición.

**Configuración obsoleta que perdía ediciones.** Se sustituyeron los upserts
incondicionales de settings del candidato por lectura, fusión de tres versiones
y actualización condicional de la fila JSONB. Una escritura intermedia hace
que la condición no coincida y obliga a reintentar contra la versión nueva.
El primer settings se crea con INSERT; una colisión tampoco sobrescribe la fila.
No se añadieron columnas, funciones, triggers o cambios de esquema.

Los cambios independientes de contactos y membresías se conservan. Si dos
contextos cambian el mismo campo, o uno borra el contacto que otro edita, el
cliente conserva su borrador y muestra un conflicto. El usuario puede exportar,
elegir la configuración guardada o confirmar que quiere usar la de este
dispositivo. Las versiones revisadas se conservan en backups locales.

Los borradores y su base se guardan por cuenta y sobreviven a una recarga o fallo
de red, incluso si la edición comenzó antes de terminar la carga del servidor.
Las preferencias de interfaz y el rescate de contactos usan el mismo guardado
protegido. Los temporizadores de backups también capturan al propietario.

## Protecciones asociadas

- Se reinician configuración, readiness, estado diario y canales al cambiar de
  cuenta. Una carga tardía de A no habilita escrituras ni introduce datos en B.
- Realtime comprueba el propietario en INSERT/UPDATE y DELETE, además del filtro
  de suscripción. Se ignoran eventos sin identidad suficiente y canales antiguos.
- El cache de Work/Vacation de una cuenta no se aplica a otra. La antigua clave
  global queda conservada, pero no se adopta para usuarios identificados; mandan
  su cache propio o los settings del servidor. No se reescriben eras históricas.
- Los avisos de conflicto y fallo son visibles, persisten al navegar o recargar
  y tienen acciones. El estado anterior solo cambiaba el color del indicador.

## Pruebas superadas

| Conjunto | Resultado | Qué demuestra |
|---|---|---|
| Suite local completa | **107/107**, sin fallos ni omisiones | Incluye las 86 anteriores, 19 regresiones de sincronización y dos de navegador. |
| Regresión funcional anterior | Incluida y aprobada | Bulk/individual, múltiples ubicaciones, Active/Inactive/Unassigned, WHO TO SEE, importación, contactos anteriores y Social por Work/Vacation. |
| Offline e identidad | Aprobado con backend en memoria | A no se restaura ni escribe como B; A conserva su cola; respuestas y temporizadores tardíos no borran datos nuevos. |
| Concurrencia | Aprobado con backend en memoria | Dos ediciones independientes, colisión entre lectura/escritura, conflicto real, fallo de red y creación inicial de settings. |
| Navegador real | Chromium, backend simulado | Conflicto tras recarga, ambas decisiones de resolución, backup de la versión local y exportación legible de la cola antigua. |
| Compatibilidad e historial | Aprobado localmente | IDs históricos recuperables en cuentas sin settings, filas diarias intactas y puntos de ejemplo Vacation 7 / Work 27. |
| RLS/CAS en Postgres real | **17/17**, ROLLBACK | Las 15 comprobaciones anteriores más rechazo de un JSONB obsoleto y aceptación del JSONB vigente. Claims simulados, sin login Auth. |
| Diagnóstico anterior | Ahora `passed_locally` en ambos escenarios | A se envía como A, cero escrituras B y ambas ediciones de settings conservadas. |

La transacción SQL utilizó UUID nuevos, usuarios `.invalid` sin contraseña y
filas exclusivamente sintéticas. No leyó filas de aplicación preexistentes ni
metadatos de usuarios existentes, no envió emails y no dejó fixtures persistentes.
Las 17 comprobaciones no son 17 pruebas de sincronización con JWT reales.

## Pendiente antes de producción

1. **Configurar dos usuarios QA nuevos y vacíos y sus secretos.** El entorno
   sigue sin secretos o variables configuradas. `test:sync:check` devuelve 2 y
   `remoteExecuted:false` antes de autenticarse. El conector permite consultar la
   clave pública; no permite vincular estos secretos al entorno ni crear usuarios
   de acceso real mediante una API administrativa de Auth en esta sesión.
2. **Ejecutar la batería autenticada de esta versión.** Debe comprobar Auth, JWT,
   PostgREST, filtro JSONB condicional, eventos INSERT/UPDATE/DELETE, backups,
   aislamiento, recarga y los escenarios de concurrencia y cambio de cuenta.
   El runner también verifica que A conserve y vuelva a enviar su propia cola,
   y que un conflicto sobreviva a la recarga hasta resolverlo explícitamente.
3. **Comprobar límites y convivencia de versiones.** El filtro condicional envía
   el JSONB anterior en la URL: el fixture actual codificado mide **6043 bytes**.
   Falta probar configuraciones sintéticas grandes contra el gateway y resolver
   cualquier límite de longitud. Clientes antiguos con upsert incondicional
   todavía pueden sobrescribir settings; el cambio local no impone revisiones a
   esos clientes desde el servidor. Su convivencia requiere una prueba específica
   y una solución de backend o una estrategia de actualización antes de desplegar.
4. **Repetir los casos que fallen y obtener autorización expresa.** No se promete
   fecha de despliegue hasta disponer de la ejecución autenticada. Google OAuth,
   dispositivos físicos y equivalencia con el esquema productivo siguen fuera
   de esta validación.

Los campos exactos para configurar son:

```text
SHAAH_TEST_SUPABASE_PUBLISHABLE_KEY
SHAAH_TEST_USER_A_ID
SHAAH_TEST_USER_A_EMAIL
SHAAH_TEST_USER_A_PASSWORD
SHAAH_TEST_USER_B_ID
SHAAH_TEST_USER_B_EMAIL
SHAAH_TEST_USER_B_PASSWORD
```

No compartir valores por chat o voz. No hace falta recrear el proyecto, ejecutar
el bootstrap, borrar los registros existentes ni dar claves privilegiadas.
[Guía de configuración](../qa/supabase/README.md).

## Evidencias y cambios para revisar

- `index.html`: correcciones del cliente; fuente local candidata, sin publicar.
- `tests/sync-regression.test.cjs`: 19 casos; `sync-browser.test.cjs`: dos casos.
- `tests/sync-backend.cjs`: backend en memoria con filtros y condiciones atómicas
  para reproducir carreras; no es una instancia de Supabase real.
- `qa/supabase/run-sync.cjs`: escenarios remotos ampliados, pendientes de ejecutar.
- `qa/supabase/diagnose-local-risks.cjs`: diagnóstico local actualizado.
- `test-results/sync-before-fixes-2026-10-18.txt`: fallos previos de los nuevos casos.
- `test-results/sync-all-final-2026-10-18.txt`: 107 pruebas aprobadas.
- `test-results/supabase-phase2/rls-cas-rollback-2026-10-18.json`: 17 checks reales SQL.
- `test-results/supabase-phase2/local-risk-diagnostics.json`: dos escenarios locales corregidos.
- `test-results/supabase-phase2/readiness.json`: bloqueo autenticado con el hash nuevo.

**La validación local del candidato avanzó; la integración autenticada y el
despliegue continúan pendientes.**
