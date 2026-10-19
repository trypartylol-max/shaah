# SHAAH — Fase 2: resultados y bloqueos

**2026-10-16. Estado: infraestructura preparada; sincronización autenticada bloqueada.**

> Estado histórico del 16 de octubre. Para los nuevos resultados de esquema,
> RLS y preflight público, consultar el [informe del 18 de octubre](SHAAH_PHASE2_STATUS_2026-10-18.md).

## Entorno y límites

El usuario autoriza pruebas reales únicamente en **SHAAH-TEST**:
`https://kpnwiwaiwnndpvtxkvva.supabase.co`, organización trypartylol-max,
Free, eu-west-1. Proyecto y opciones de creación informados por el usuario.
No se usa su cuenta personal. Se mantienen las prohibiciones de producción,
datos reales, push, merge y despliegue.

Rama local: `test/supabase-sync-phase2-2026-10-16`, desde `7c99e91`.
El `index.html` del producto permanece intacto:
`61d29028113e5a01bed57175cd3268d1db5dd14324a1d139b44e3256b0d55866`.

## Verificado

| Comprobación | Resultado y alcance |
|---|---|
| Gateway QA real | GET `/auth/v1/settings` sin clave ni sesión: HTTP 401. Confirma respuesta HTTPS del gateway; no valida usuarios, tabla, RLS o Realtime. |
| Suite local completa | **83/83 superadas**, 0 fallidas y 0 omitidas: las 66 anteriores y 17 nuevas de infraestructura/seguridad. Ninguna prueba autenticada remota. |
| Guardas Node | Rechazan producción, otros proyectos, HTTP, endpoints administrativos, claves privilegiadas y redirecciones antes del envío. |
| Guardas Chromium | SDK real local cargado. Intentos sintéticos HTTP/WebSocket hacia producción abortados antes de reenviarse; cero reenvíos a producción. |
| Configuración real disponible | Comando de preparación devuelve `blocked`, `remoteExecuted: false`; faltan clave pública y datos de usuarios A/B. |
| Código | Comprobaciones de sintaxis de scripts y `git diff --check` superadas. HTML del producto sin cambios. |

No hubo autenticación, seed, escritura REST, SQL administrativo ni conexiones
Realtime contra Supabase real. La única operación contra SHAAH-TEST fue el GET
anónimo indicado; no se ejecutó ninguna solicitud hacia producción.

## Preparado

- `qa/supabase/guard.cjs`: destino QA fijo, validación de claves e identidades,
  bloqueo HTTP/WS y HTML QA generado en memoria antes del arranque.
- `api.cjs` y `run-sync.cjs`: autenticación real con dos usuarios QA verificados,
  exigencia de cuentas vacías antes de escribir, fixtures sintéticos y manifiestos
  por ejecución; nunca borrado general ni limpieza automática.
- SDK real **@supabase/supabase-js 2.118.0** fijado para la batería QA; no se
  modificó la dependencia flotante del HTML del producto.
- Batería remota preparada para RLS, settings y membresías, Inactive, recarga sin
  caché, historial/puntos por modo, INSERT/UPDATE/DELETE, aislamiento entre
  propietarios, respaldos y los dos escenarios negativos de abajo. Su ejecución
  real aún no se ha validado.
- `bootstrap-test-only.sql`: propuesta mínima para SHAAH-TEST, **sin ejecutar**.
  Usa PK `(user_id,date)`, RLS propia por usuario, acceso solo a `authenticated`
  y publicación Realtime de `day_logs`. No contiene datos ni usuarios. Aborta si
  la tabla ya existe. No equivale a una exportación del esquema productivo.
- `README.md`: instrucciones para configurar y ejecutar; secretos y resultados
  excluidos de Git; reportes sin credenciales, tokens, sesiones o trazas sensibles.

## Defectos reproducidos localmente

Se ejecutó `npm run test:sync:diagnose-local` con las funciones reales del HTML y
un backend simulado. Devuelve 1 porque reproduce defectos, no porque se haya
aprobado sincronización:

1. **Cola offline compartida:** una nota encolada bajo `synthetic-A` se envía
   posteriormente con `user_id=synthetic-B`. La cola carece de propietario y
   `flushOfflineQueue()` usa el usuario actual. RLS por sí sola no evita que una
   operación mal atribuida se escriba en la cuenta del usuario actual.
2. **Configuración completa obsoleta:** A confirma una edición y un segundo
   contexto con el estado anterior confirma otra; el segundo documento de
   settings pierde la primera edición. No hay control de revisión o fusión
   que la preserve.

Ambos son fallos pendientes, no pruebas verdes de la suite normal. Los datos son
ficticios, no hubo red en esas reproducciones y no se aplicaron arreglos al
producto en este cambio de infraestructura. La batería QA incluye escenarios
para confirmar su comportamiento contra Supabase real.

## Acción necesaria para desbloquear

1. En **SHAAH-TEST**, aplicar el SQL de pruebas si la tabla no existe, o revisar
   la estructura/permisos existentes con `inspect-schema.sql`. No habilitar
   exposición general de tablas: el SQL prevé concesiones solo para `day_logs`.
2. Crear dos usuarios de Authentication exclusivos de QA, con email/contraseña
   y email confirmado; obtener sus UUID.
3. Configurar en los secretos del entorno la clave pública QA y los campos
   `SHAAH_TEST_USER_A_*` / `SHAAH_TEST_USER_B_*` indicados en el README. No enviar
   contraseñas, tokens o sesiones por el chat. No se pide ninguna clave privilegiada.

La URL y referencia ya están configuradas: no hace falta proporcionarlas de nuevo.
No se solicitan acceso al proyecto productivo ni credenciales personales.

## Comandos y evidencias

```bash
npm run test:sync:safety
npm run test:sync:check
npm run test:sync:probe
npm run test:sync:diagnose-local
# Solo cuando estén listas las credenciales y la tabla QA:
npm run test:sync
```

La ejecución remota requiere Node 24 y conserva el proxy/TLS del entorno.
`test:sync:check` devuelve 2 mientras falte configuración; no efectúa solicitudes.
`npm test` nunca dispara la batería remota.

Evidencias locales, excluidas de Git y añadidas al paquete de revisión:

- `test-results/phase2-all-local.txt`: 83 pruebas locales superadas.
- `test-results/supabase-safety.txt`: 17 pruebas nuevas superadas.
- `test-results/supabase-phase2/gateway-probe.json`: respuesta 401 de QA real.
- `test-results/supabase-phase2/readiness.json`: bloqueo sin ejecución remota.
- `test-results/supabase-phase2/local-risk-diagnostics.json`: dos defectos locales.

**No se certifica sincronización real ni producción.** Faltan la ejecución
autenticada en SHAAH-TEST y la resolución de los fallos; Google OAuth, esquema
productivo, dispositivos físicos y la matriz productiva general siguen pendientes.
