# SHAAH — artefacto de publicación autorizado

El propietario autorizó ejecutar el plan productivo después del ensayo privado.
La publicación usa el proyecto original `llpyxktcfubhmthqujpa` y GitHub Pages
en https://trypartylol-max.github.io/shaah/. No incorpora cuentas ni datos QA.

## Adaptación al esquema comprobado

El original tiene PK `id` identity, `created_at` con `now()`, columnas de app
nullable y UNIQUE `(user_id,date)`. Su política original era `own logs` FOR ALL
TO PUBLIC con propiedad por `auth.uid()=user_id`. Los permisos por defecto incluían
TRUNCATE para authenticated; RLS no protege esa operación.

El adaptador conserva IDs, timestamps, PK, UNIQUE, FK y valores. Sustituye la
política por cuatro políticas de propiedad para authenticated y revoca permisos
innecesarios de anon y TRUNCATE/REFERENCES/TRIGGER de authenticated. Instala
después el mismo protocolo ensayado de revisión, archivo y propietario esperado.
La única diferencia del preflight del núcleo acepta UNIQUE como clave de negocio.

El SQL reproducible está en
`supabase/production-migrations/20261018182501_install_settings_protocol_legacy_schema.sql`
(SHA256 `43237ca22c29ce41ce9b3b57a502392487b14c2598345c38c418c551cd83d457`).
`qa/production/build-legacy-migration.cjs` lo reconstruye desde los tres SQL
anteriores. Se mantiene fuera del directorio de migraciones QA: requiere el
baseline original exacto y no se debe aplicar automáticamente tras las de QA.

El conector devolvió requestState caducado con la solicitud combinada en QA,
sin cambios parciales verificados. La ejecución usa cuatro transacciones
soportadas: adaptador inicial, núcleo compatible, PT409, sobre de propietario.
El backend se completa antes de publicar el HTML.

## Corrección de Realtime para el original

Los eventos DELETE pueden contener solamente `id`. INSERT y UPDATE mantienen
el filtro de propietario; DELETE usa una suscripción sin ese filtro. El cliente
no confía en un identificador opaco: consulta únicamente sus fechas mediante RLS.
Solo quita días ausentes cuyo estado no cambió durante esa lectura, y conserva
guardados pendientes y colas offline. Un cambio de cuenta invalida la respuesta.

SHA256 del HTML final:
`be6723e60ee4d189ade645caa4b1a5ff210390f5a7631a69f99f0ec978c3b334`.
El SDK sigue fijado en 2.118.0.

## Respaldo y recuperación

Antes del protocolo se creó una copia privada de las 63 filas de app originales,
incluidos IDs y timestamps, sin Auth ni credenciales. La comparación bidireccional
con el origen pasó. Una exportación independiente, leída y comprobada contra su
fingerprint de servidor, tiene SHA256
`acdfe697bb7b2f9bbaff283bc65944c351757bfebb38df0be157b28a14ec2ca8`.
Permisos del archivo: 0600, directorio 0700, fuera del repositorio y de la preview.
Ni anon ni authenticated pueden leer las tablas del checkpoint.

No se debe importar esa copia completa sobre actividad posterior. Para contener
un incidente, pausar escrituras, comparar la fila actual y recuperar solo las
filas aprobadas. Los ajustes se recuperan por revisión nueva; conservar la guarda
del servidor y publicar un cliente compatible. Los procedimientos ensayados se
encuentran en `qa/migration/`. El template de reparación sintética requiere
adaptar explícitamente el alcance y las columnas del esquema original; no se
ejecuta directamente sobre datos reales.

## Verificación y límites

La suite final contiene 120 pruebas locales, con cero fallos u omisiones.
La compatibilidad se ensaya con Auth/JWT/API/Realtime reales en una tabla
independiente de SHAAH-TEST que reproduce el original; no toca los perfiles
publicados ni utiliza la cuenta personal. Sus informes quedan en
`test-results/production-legacy/`, fuera de Git. Se conservan los intentos
fallidos de aserción y el fallo de DELETE encontrado antes de publicar.

Las 12 pruebas Auth y 11 de recuperación anteriores siguen documentadas en
`docs/SHAAH_PRODUCTION_CANDIDATE_2026-10-18.md` sobre su SHA anterior; no se
presentan como repetidas sobre este HTML. El ajuste nuevo tiene regresiones
específicas y un ensayo autenticado contra el esquema original reproducido.

La comprobación productiva usa metadatos, igualdad de registros y acceso sin
sesión personal. El propietario realizará su uso habitual con Google; ningún
automatismo entra con su cuenta. Los dispositivos con cambios offline deben
conservarlos y actualizarse; las versiones antiguas dejan de guardar ajustes.
