# SHAAH — Fase 2: sincronización con Supabase real

**Fecha:** 2026-10-16. **Estado:** ejecutor preparado; sincronización autenticada pendiente.

> Actualización 2026-10-18: `day_logs` ya existe y su esquema se verificó; no
> ejecutar de nuevo el bootstrap. Pasaron 15 comprobaciones RLS en transacción
> revertida, el preflight público y 86 pruebas locales. Siguen faltando las
> credenciales QA en secretos para la batería autenticada. El resto de este plan
> conserva la preparación original; ver el [estado actual](SHAAH_PHASE2_STATUS_2026-10-18.md).

> Continuación: los dos fallos del cliente ya tienen una corrección local con
> 107 pruebas aprobadas; [detalle y bloqueos actuales](SHAAH_SYNC_FIXES_2026-10-18.md).

## Alcance autorizado

El usuario ha autorizado continuar las pruebas aisladas de fase 2 en SHAAH-TEST,
ya creado por el usuario. Se mantienen las prohibiciones de modificar producción,
usar datos o cuentas personales y hacer push, merge o despliegue. No se ha
iniciado sesión ni realizado escrituras remotas desde este ejecutor. Solo se
comprobó el gateway QA mediante un GET sin credenciales, que respondió 401.

Fuente examinada: commit local
`d381c4f1326d7206ee061fba56137614454e0ddf`, rama
`test/location-groups-regression-2026-10-16`. `index.html`, SHA256:
`61d29028113e5a01bed57175cd3268d1db5dd14324a1d139b44e3256b0d55866`.
Las 66 pruebas de la fase 1 utilizan Supabase simulado; no demuestran
sincronización, autenticación o RLS contra un servidor real.

## Entorno recomendado

El usuario creó **SHAAH-TEST**, referencia `kpnwiwaiwnndpvtxkvva`, en
trypartylol-max, Free, eu-west-1. URL:
`https://kpnwiwaiwnndpvtxkvva.supabase.co`. Se desactivó Automatically expose
new tables y se activó Enable automatic RLS en el formulario de creación.
Es distinto de producción (`llpyxktcfubhmthqujpa`). Crear únicamente estructura y datos
sintéticos. No clonar ni restaurar una copia de los datos o usuarios de producción.

Usar dos usuarios desechables de QA, A y B, creados en ese proyecto. A se utiliza
en dos contextos independientes de navegador para probar sincronización; B permite
probar aislamiento y cambio de cuenta. No reutilizar cuentas, sesiones, perfiles
de navegador ni archivos de autenticación personales.

La aplicación actual permite entrar por Google OAuth. Para la primera batería
de sincronización se propone autenticar usuarios QA con email/password mediante
el SDK real de Supabase y cargar la sesión del proyecto QA en cada contexto antes
del arranque. Se prueban así JWT, Auth, REST y Realtime reales. Esto **no certifica
el flujo Google OAuth**. Ese flujo requeriría cuentas Google exclusivas de QA y
configuración OAuth/redirects propia del proyecto de pruebas, en una batería aparte.

## Lo que falta para ejecutar

1. Clave pública **publishable/anon** de ese proyecto. No se necesita una clave
   `service_role`, `sb_secret`, contraseña de base de datos ni acceso a la cuenta
   personal del usuario. No utilizar credenciales que omitan RLS en los clientes.
2. Dos usuarios QA: identificadores UUID, emails y contraseñas disponibles mediante
   los secretos del entorno. No enviar contraseñas ni sesiones por el chat ni
   guardarlas en Git.
3. Definición de `public.day_logs`, restricciones, políticas RLS, grants,
   triggers pertinentes y configuración de Realtime, sin filas de datos. El
   repositorio no contiene migraciones ni una definición autoritativa del backend.
   Si se reconstruye una estructura mínima a partir del cliente, los resultados
   se limitarán a esa estructura y no certificarán equivalencia con producción.

El estado observado del entorno al preparar este plan no contiene secretos,
variables de runtime ni identidades configuradas para Supabase. Los nombres
propuestos para la futura batería son:

| Variable | Contenido | Tratamiento |
|---|---|---|
| `SHAAH_TEST_SUPABASE_URL` | URL canónica HTTPS del proyecto QA | Configuración |
| `SHAAH_TEST_PROJECT_REF` | Referencia explícita y permitida | Configuración |
| `SHAAH_TEST_SUPABASE_PUBLISHABLE_KEY` | Clave publishable o anon de QA | Configuración protegida, sin imprimir |
| `SHAAH_TEST_USER_A_ID`, `SHAAH_TEST_USER_B_ID` | UUID de usuarios dedicados y distintos | Configuración |
| `SHAAH_TEST_USER_A_EMAIL`, `SHAAH_TEST_USER_B_EMAIL` | Identidades QA | Configuración protegida |
| `SHAAH_TEST_USER_A_PASSWORD`, `SHAAH_TEST_USER_B_PASSWORD` | Contraseñas QA | Secretos |

Se implementó un comando remoto explícito y separado de la suite local. Se
detiene por falta de credenciales antes de cualquier autenticación o escritura.
Las instrucciones están en `qa/supabase/README.md`; `bootstrap-test-only.sql`
propone la estructura mínima QA sin copiar producción. No se ha aplicado ese SQL.

## Aislamiento obligatorio del futuro ejecutor

- Validar URL, referencia y clave antes de cualquier solicitud. Rechazar el
  proyecto de producción, referencias inconsistentes, claves privilegiadas y
  configuración incompleta. No tener un fallback a las constantes de producción.
- Generar una copia temporal del HTML con URL/clave QA. Mantener intacto el
  `index.html` del producto y comprobar su hash. El código de arranque también
  puede escribir; el aislamiento se instala **antes** de cargar el documento.
- Permitir solo el host exacto del proyecto QA y el origen local de pruebas.
  Bloquear producción y otros destinos en HTTP, WebSocket y navegación. Aplicar
  la misma restricción al proceso Node que autentique o cargue fixtures, no solo
  al navegador. No seguir redirecciones a hosts fuera de la lista permitida.
- Servir el SDK real con una versión fijada desde un recurso local; no utilizar
  `@2` flotante ni el cliente simulado de la fase 1. Bloquear service workers y
  cualquier script externo no previsto.
- Crear perfiles efímeros sin cookies o almacenamiento previo. Verificar que los
  UUID autenticados sean exactamente A/B antes de cargar o modificar datos.
- Examinar únicamente los registros de los usuarios QA. Ante datos no reconocidos
  como fixtures propios de la ejecución, detenerse; no limpiarlos para continuar.
- Separar el comando remoto de `npm test`: ejecución explícita, nunca accidental
  al correr la suite local o mediante CI general.
- Guardar logs sanitizados. No persistir Authorization, contraseñas, tokens,
  sesiones, HAR o trazas con credenciales. Los resultados incluyen identidad del
  proyecto, versión, claves de fixtures y evidencia de ausencia de tráfico a
  producción, sin incluir secretos.

## Comprobaciones de esquema previas

El cliente utiliza `public.day_logs` con `user_id`, `date` y `data`, y hace
`upsert` sobre `(user_id,date)`. `date` también recibe `settings` y `cfgbak`, por
lo que el contrato no puede sustituirse sin más por una columna SQL de tipo date.
Es necesario confirmar los tipos, la clave primaria, la unicidad y los grants.

RLS debe permitir a cada usuario QA leer/insertar/actualizar/borrar sus filas y
rechazar acceso o cambios de propietario a las de otro usuario. El filtro del
cliente `.eq('user_id',...)` no es evidencia de RLS.

Confirmar la publicación Realtime de la tabla y observar el payload real de
INSERT/UPDATE/DELETE. El cliente solo elimina un registro local si DELETE incluye
`payload.old.date`. Inspeccionar PK y replica identity; no asumir que configurar
`REPLICA IDENTITY FULL` garantiza ese campo bajo RLS.

`qa/supabase/inspect-schema.sql` contiene consultas de metadatos de solo lectura
para revisar estos puntos. No se ha ejecutado. Sus resultados no incluyen filas
de `day_logs` ni registros de `auth.users`, y por sí solos no prueban el
comportamiento de Auth, RLS o Realtime.

## Matriz de ejecución propuesta

| Caso | Ejecución con datos QA | Evidencia / condición de aprobación |
|---|---|---|
| Identidad y RLS | A/B con JWT propios; lectura, inserción, actualización, cambio de propietario y borrado cruzados, además de acceso anónimo | Sin datos cruzados ni modificaciones ajenas. Comprobar resultado persistido; una lectura denegada puede devolver una lista vacía. |
| Guardado y recarga | Asignación masiva/individual, varias ubicaciones, Inactive, grupo seleccionado y frecuencias en A1 | Leer JSON desde un cliente autenticado independiente y desde un contexto nuevo sin caché; coincidencia íntegra. |
| Sincronización en vivo | A1 modifica; A2 recibe INSERT/UPDATE de settings y de un día | Evidencia del evento real y convergencia de UI/estado sin refrescar ni simular eventos. |
| Borrado | Crear y vaciar un día sintético, observar DELETE en A2 | Campo necesario en el payload o reconciliación correcta; sin borrar otro día. |
| Historial y scoring | Fixtures de septiembre/octubre y Work/Vacation; editar solo ubicaciones/Inactive | Ninguna alteración de filas históricas, IDs, frecuencias, notas, Day Log o puntos por cambios de ubicación/estado. |
| Arranque y carga | Sesión nueva, sesión restaurada, configuración ausente, petición lenta y error de lectura | No sobrescribir datos confirmados con defaults ni perder ediciones hechas durante la carga. |
| Conflicto de configuración | A1/A2 parten del mismo estado; A1 renombra y A2 cambia otra membresía | Conservar ambos cambios o gestionar el conflicto explícitamente. Una pérdida silenciosa se registra como fallo. |
| Offline/reconexión | Registrar visita offline, editar otra vez, reconectar; Realtime durante escritura pendiente | Envío correcto del último estado, sin resucitar etiquetas ni perder Day Log/notas. |
| Cambio de cuenta | A deja un upsert/borrado en cola; cerrar sesión y entrar como B en el mismo perfil QA | Ningún dato o borrado de A se restaura o escribe como B. Usar solo fixtures dedicados. |
| Respaldos | Guardar settings y esperar `cfgbak`; recargar desde sesión independiente | Respaldo persistido realmente, con contactos/ubicaciones/estado/eras. |
| Fallos y recuperación | Interrumpir red o rechazar una escritura hacia QA, luego recuperar | Detectar el fallo y medir la divergencia; no dar por confirmado el guardado por una actualización optimista de UI. |

Solo iniciar el navegador después de las comprobaciones de identidad, esquema
y límites de red. Cargar fixtures mediante los JWT QA y mantener un manifiesto
de la ejecución. No depender exclusivamente de un icono LIVE o de localStorage
para afirmar que el servidor guardó o sincronizó un cambio.

## Riesgos concretos ya observados en el código

- `SUPABASE_URL`/`SUPABASE_KEY` apuntan a producción en el HTML del producto.
  Abrir ese HTML con el SDK real sin preparar el aislamiento no es una prueba QA.
- `saveCfg()` guarda el documento de configuración completo. No hay revisión o
  control de concurrencia que garantice conservar dos ediciones simultáneas.
- `_offlineKey='shaah-offline-day-writes'` y su cola no incluyen propietario;
  `flushOfflineQueue()` utiliza el `USER.id` actual. La separación A/B requiere
  una prueba negativa específica incluso si el backend tiene RLS correcta.
- `_cfgReady`, las cargas asíncronas y las suscripciones Realtime requieren
  comprobar aislamiento de ciclo de sesión; la lectura estática no certifica
  que los cambios de cuenta estén aislados.
- DELETE depende del contenido del evento. El backend no está definido en el
  repositorio y aún no se ha inspeccionado.

Estos riesgos no se dan por resueltos por las 66 pruebas locales. Los fallos
reproducidos en QA se corregirán en la rama y se volverán a verificar sin ampliar
el alcance a producción.

## Cierre y limpieza

Cerrar todos los clientes y esperar las escrituras pendientes antes de revisar
o limpiar. Eliminar únicamente filas propias de usuarios QA que figuren en el
manifiesto y que sigan correspondiendo a los fixtures de la ejecución. Ante una
discordancia, detener la limpieza. No borrar tablas, proyectos, usuarios ni filas
mediante un borrado general como parte del ejecutor.

Entregar informe por caso con proyecto y commit exactos, datos sintéticos usados,
resultado, evidencia sanitizada, defectos reproducidos y cobertura que siga
pendiente. Google OAuth, dispositivos físicos y la puerta general de producción
se documentan por separado si no se ejercitan.

**Siguiente dependencia:** clave pública QA, usuarios dedicados, configuración
segura y `day_logs` accesible en SHAAH-TEST. Hasta disponer de ello, esta fase queda preparada
pero sin ejecución remota ni certificación de sincronización real.
