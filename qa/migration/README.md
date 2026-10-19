# SHAAH — migración y recuperación aisladas

Resultado y procedimiento de producción:
[SHAAH_PRODUCTION_CANDIDATE_2026-10-18.md](../../docs/SHAAH_PRODUCTION_CANDIDATE_2026-10-18.md).

Este código se ejecutó exclusivamente contra **SHAAH-TEST**
(`kpnwiwaiwnndpvtxkvva`). Las credenciales llegan como siete secretos por stdin
oculto a `qa/preview/run-with-secrets.cjs`. No guardar secretos en argumentos,
archivos `.env`, informes o código. No sustituir el host QA por producción para
volver a ejecutar fixtures.

## Ensayos realizados

- `run-rehearsal.cjs --prepare`: antes de instalar el protocolo, autenticó dos
  cuentas nuevas/vacías creadas por Auth Admin API, reservó un manifiesto, sembró
  filas sintéticas y exportó el baseline con SHA256. Este paso de preparación
  legacy no se repite sobre el proyecto ya migrado.
- `--verify --run-id=<UUID>`: confirmó las filas previas, backups, revisión,
  clientes antiguos, tamaño, aislamiento, recuperación y rechazo de exportación
  dañada. `--resume-failed` conserva el intento anterior y continúa solo sus
  pasos pendientes. No se hizo un reset de usuarios ni datos desconocidos.
- `--verify --verify-current --run-id=<UUID>`: volvió a comprobar los once casos
  sobre el protocolo final con propietario esperado. Guarda
  `current-protocol-report.json`, manteniendo la evidencia de instalación original.
- `check-maintenance.cjs`: daño deliberado de dos registros de un fixture nuevo,
  pausa de escrituras, recuperación administrativa con checkpoint y reanudación.
  La comprobación final usa un cuerpo grande con propietario explícito y calcula
  Social a partir de filas recuperadas de Supabase.
- La suite general `run-sync.cjs --run` se repitió con otras cuentas nuevas:
  doce casos, incluido A-payload/B-JWT con revisión B válida y rechazo 403.
  Un segundo run sobre cuentas no vacías aborta; no hay limpieza automática.

Las cuentas publicadas QA A/B del Site no son las de estos ensayos. No
resembrarlas ni borrarlas. Los manifiestos y marcadores limitan las operaciones
a los propietarios y claves que este ejecutor creó. No se insertan usuarios
Auth mediante SQL ni se cambian políticas para hacer pasar los tests.

## SQL y operación

Las tres migraciones de `supabase/migrations/` son las fuentes exactas alineadas
con el historial QA; se aplican en orden. Se instalaron con `apply_migration`.
La última valida el propietario capturado en el sobre de la petición contra el
JWT; ese identificador no decide el destino ni se persiste como dato de negocio.
`inspect-target.sql` solo lee metadatos; debe acompañarse de comprobar el ID de
proyecto y los esquemas expuestos.

`create-checkpoint.template.sql` necesita un predicado explícito de propietarios
aprobados y crea una copia privada sin datos Auth. Se copiaron solo 18 filas de
dos cuentas nuevas, sin SELECT para anon/authenticated. Esa copia lógica no
sustituye una exportación independiente con SHA256.

`pause-settings.sql` y `pause-all-writes.sql` contienen contención sin quitar la
guarda de versiones antiguas. `operator-recovery.template.sql` requiere permisos
administrativos, pausa comprobada, propietario aprobado y valores/checksums
del checkpoint. Es transaccional y falla si el estado difiere del esperado.
`resume-*.sql` se usa después de comparar permisos con el recibo previo.

No existe un `down.sql` que reabra escrituras incondicionales o borre el historial.
La recuperación conserva el protocolo y aumenta la revisión. Para ensayar otra
instalación desde cero se necesita un entorno técnico descartable separado;
no desinstalar la guarda de la preview para recrear un baseline vacío.

`check-sdk.cjs` comprueba en Chromium el script clásico CDN fijado y el UMD de npm,
con toda salida de red abortada. Ambos exponen la misma API global de 2.118.0.
Los bytes son distintos; sus SHA se conservan en `pinned-sdk.json`.

El antiguo `qa/supabase/rls-rollback-test.sql` se conserva como documento histórico
y está deshabilitado: insertaba fixtures de Auth por SQL en una transacción
revertida anterior a esta fase. Los ensayos actuales usan Auth Admin API.

Producción, su rama y sus datos siguen fuera de estos ejecutores de QA. El
procedimiento productivo requiere la autorización pendiente.
