# SHAAH — Fase 2: avance verificado del 18 de octubre de 2026

> Estado actual posterior: [preview privada y 11 escenarios autenticados aprobados](SHAAH_QA_PREVIEW_2026-10-18.md).
> Los bloqueos descritos abajo corresponden a esta fotografía histórica.

> Fotografía anterior a las correcciones del cliente. El avance posterior,
> con 107 pruebas locales y 17 comprobaciones SQL, está en
> [SHAAH_SYNC_FIXES_2026-10-18.md](SHAAH_SYNC_FIXES_2026-10-18.md).

**Estado: RLS de base de datos comprobado; sincronización autenticada bloqueada
por falta de credenciales QA en secretos. No listo para desplegar.**

Proyecto autorizado: **SHAAH-TEST**, `kpnwiwaiwnndpvtxkvva`, organización
`jlaeczphbpnzvyslyxjk`, eu-west-1. El conector confirmó `ACTIVE_HEALTHY`.
Toda operación remota de esta ejecución se dirigió exclusivamente a ese proyecto.
No hubo push, merge, despliegue, acceso a producción ni uso de una cuenta personal
como usuario de la aplicación.

## Pruebas superadas

| Comprobación | Resultado | Límite de lo demostrado |
|---|---|---|
| Suite local completa | **86/86**, sin fallos ni omisiones | 83 anteriores y 3 nuevas del preflight; backend de aplicación simulado. |
| Esquema QA real | PK `(user_id,date)`, `data` JSONB objeto, FK a `auth.users` | No demuestra equivalencia con el esquema productivo, que no se inspeccionó. |
| RLS y permisos | RLS activa; cuatro políticas propias por `auth.uid()`; UPDATE incluye USING y WITH CHECK; CRUD de `authenticated`, sin grants de tabla para `anon`/PUBLIC | Confirmación de metadatos más las comprobaciones SQL indicadas abajo. |
| Realtime | `day_logs` en `supabase_realtime`, identidad FULL | La publicación está configurada; todavía no se ha comprobado recepción de eventos con sesiones reales. |
| Aislamiento en Postgres | **15 comprobaciones superadas** | Se simularon claims JWT con el rol `authenticated`; no hubo login Auth ni JWT emitido por Auth. |
| Clave pública/gateway | GET Auth settings: **200**; proveedor email habilitado | Clave obtenida por conector y utilizada sin imprimirla ni guardarla en archivos. |
| Acceso REST anónimo | GET con `limit=0`: **401** | Se rechazó la solicitud; nunca se pidió contenido de filas. |
| Advisors | Sin avisos de rendimiento; un aviso de Auth | Protección contra contraseñas filtradas desactivada; no se cambió configuración Auth. |

Las 15 comprobaciones SQL cubren lectura, inserción, actualización, upsert y
borrado propios; rechazo de SELECT/INSERT/UPDATE/DELETE cruzados; rechazo de
transferir propietario; conservación del registro B; rechazo en el sentido B→A;
rechazo de lectura e inserción sin `auth.uid()`; y ausencia de acceso de `anon`.

`rls-rollback-test.sql` generó dos UUID nuevos, usuarios `.invalid` sin contraseña
y filas identificadas como fixtures. No hubo envío de emails, creación de sesiones
ni lectura de filas preexistentes o metadatos de usuarios existentes. La operación
completa terminó en **ROLLBACK**: no dejó usuarios ni fixtures persistentes.
El script aborta si detecta triggers de usuario en `auth.users` sin revisar.

## Cambios realizados

- Nuevo `qa/supabase/public-preflight.cjs`: solo GET contra el host QA fijo;
  comprueba Auth settings y permisos anónimos con cero filas solicitadas.
  Conserva únicamente estados HTTP y flags públicos; nunca registra claves.
- Nuevo `qa/supabase/rls-rollback-test.sql`: prueba aislada de las políticas reales
  con fixtures nuevos dentro de una transacción revertida, separada del runner.
- Tres pruebas locales para evitar exposición de claves/campos de respuesta,
  rechazar claves privilegiadas y no declarar éxito si el gateway o los permisos
  anónimos no cumplen lo esperado.
- Nuevo comando `npm run test:sync:public`; instrucciones actualizadas para no
  recrear una tabla que ya existe y distinguir RLS SQL de sincronización Auth real.

`index.html` permanece intacto desde la fase 1. SHA256:
`61d29028113e5a01bed57175cd3268d1db5dd14324a1d139b44e3256b0d55866`.
No se corrigieron ni se publicaron cambios del producto en este avance.

## Problemas y bloqueos pendientes

1. **Sesiones reales bloqueadas por secretos ausentes.** El estado actual del
   entorno confirma cero secretos y variables configuradas. La clave pública es
   accesible por el conector, pero todavía no está vinculada al runner. También
   faltan UUID, email y contraseña de cada uno de los dos usuarios dedicados A/B.
   No se han inspeccionado ni reutilizado cuentas existentes.
2. **Dos defectos de aplicación ya reproducidos localmente siguen pendientes:**
   la cola offline puede enviar una nota A como B tras cambiar de cuenta, y un
   guardado de settings desde otro contexto puede perder una edición confirmada.
   Las reglas RLS correctas no resuelven estos fallos del cliente. Falta confirmar
   ambos con sesiones QA reales, corregirlos y repetir sus pruebas.
3. **Lectura de registros existentes no realizada.** La revisión automática
   rechazó una consulta que incluía filas y metadatos de usuarios porque su origen
   sintético no estaba acreditado. Se continuó con metadatos de esquema y fixtures
   nuevos revertidos. No se intenta eludir esa restricción ni se necesita abrir
   esos registros para probar con cuentas QA nuevas.

La primera llamada de la prueba SQL falló por `Invalid or expired requestState`;
no se contabilizó como aprobada. Un reintento de la transacción completa obtuvo
el resultado de las 15 comprobaciones y finalizó con ROLLBACK. La primera ejecución
local de Chromium encontró una restricción de sockets del sandbox; la repetición
con permiso de red del entorno completó las 86 pruebas. Ninguno de esos errores
se atribuye al producto.

Aviso de Auth y referencia de Supabase:
[protección de contraseñas](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection).
No se considera certificada la seguridad o configuración de producción.

## Acción mínima necesaria

En **Authentication de SHAAH-TEST**, disponer de dos usuarios nuevos y vacíos de
QA con email/contraseña y email confirmado. No usar invitaciones, OAuth o emails
personales para las pruebas. Configurar estos nombres en los secretos del entorno:

```text
SHAAH_TEST_SUPABASE_PUBLISHABLE_KEY
SHAAH_TEST_USER_A_ID
SHAAH_TEST_USER_A_EMAIL
SHAAH_TEST_USER_A_PASSWORD
SHAAH_TEST_USER_B_ID
SHAAH_TEST_USER_B_EMAIL
SHAAH_TEST_USER_B_PASSWORD
```

No compartir valores por chat o voz. No hace falta proporcionar de nuevo la URL,
recrear el proyecto, ejecutar el bootstrap ni compartir una clave privilegiada.
Esta sesión permite consultar la clave pública, pero no configurar los secretos
del entorno ni crear usuarios mediante una API administrativa de Auth.
Guía operativa: [qa/supabase/README.md](../qa/supabase/README.md).

Una vez disponibles, ejecutar el runner ya preparado con `npm run test:sync`:
verificará ambas identidades y que estén vacías antes de escribir fixtures.
No se deben borrar cuentas o registros existentes para pasar el preflight.

## Distancia hasta un despliegue

Quedan tres etapas: **ejecutar Auth/API/Realtime con sesiones QA reales**,
**corregir los fallos y superar la repetición de pruebas**, y **obtener autorización
expresa del usuario para producción**. No hay base verificable para dar una fecha
de despliegue mientras falten las sesiones y los resultados de esos escenarios.
Google OAuth, dispositivos físicos y equivalencia con producción no quedan
certificados por estas comprobaciones.

## Evidencias

- `test-results/phase2-all-local-2026-10-18.txt`: 86 pruebas locales aprobadas.
- `test-results/supabase-phase2/schema-metadata-2026-10-18.json`: metadatos sin filas.
- `test-results/supabase-phase2/rls-rollback-2026-10-18.json`: 15 checks SQL aprobados.
- `test-results/supabase-phase2/public-preflight.json`: Auth 200 / anónimo 401.
- `test-results/supabase-phase2/readiness.json`: runner bloqueado; no Auth remoto.
- `test-results/supabase-phase2/local-risk-diagnostics.json`: dos defectos locales.

**No se declara completa la integración ni se autoriza un despliegue.**
