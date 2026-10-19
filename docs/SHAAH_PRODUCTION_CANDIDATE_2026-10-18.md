# SHAAH — candidato y recuperación verificados, 18 de octubre de 2026

**Los dos bloques autorizados están completados en SHAAH-TEST:** protección de
ajustes frente a clientes antiguos y ensayo de migración, respaldo y recuperación.
La producción sigue intacta. Este candidato queda preparado para aprobación;
la comprobación y el respaldo del proyecto productivo se harán después de esa
autorización y antes de cualquier cambio allí.

Preview privada actualizada: https://shaah-test-location-groups.arviler.chatgpt.site

## Candidato exacto

- Rama local: `test/supabase-sync-phase2-2026-10-16`; sin push al GitHub original.
- `index.html` SHA256: `aa590e9b416dcb105a1d78a694938e450787bc16ac41283d2e5a19e268eeb8bd`.
- `main` remoto comprobado mediante lectura: `09f943bf492957d7cb44e407ebf92935f2a11c2f`.
  No se modificó la rama ni el despliegue original.
- Preview **versión 4**, fuente propia del Site
  `1f105a3cfa3c858c9f3b581abe12aa1e01e92d57`, deployment
  `appgdep_6ad48ac8cd48819199068e564f1fb9f6`, estado `succeeded`.
  Conserva la misma URL, audiencia privada de un propietario y ningún grupo.
- Único Supabase utilizado: `kpnwiwaiwnndpvtxkvva` (**SHAAH-TEST**).
  No se conectó al Supabase original `llpyxktcfubhmthqujpa`.

Las tres migraciones finales, aplicadas en QA y alineadas con su historial, son:

| Archivo | SHA256 |
|---|---|
| [20261018062823_protect_settings_revisions.sql](../supabase/migrations/20261018062823_protect_settings_revisions.sql) | `b6ef4525478b3a001828088b236b5ed0a7071982977b38c41c8e84e324d62adf` |
| [20261018063440_settings_conflict_http_status.sql](../supabase/migrations/20261018063440_settings_conflict_http_status.sql) | `1cbc01666ae96f9e5d468388e5c3547e9e6ab1191dd59a13a025a49853217a36` |
| [20261018085531_bind_settings_request_owner.sql](../supabase/migrations/20261018085531_bind_settings_request_owner.sql) | `afa80d5027fa4fc2a57401299b579a39cc8318079fa58b8794b964fcb71e0627` |

Se crearon primero con `supabase migration new` (CLI 2.81.0 oficial, checksum
verificado), y sus nombres se alinearon después con las versiones devueltas por
`list_migrations`. La primera migración no se puede repetir a ciegas: su preflight
aborta si el esquema o los permisos previos no coinciden o el protocolo ya existe.

## Cambios definitivos

**El servidor impide sobrescribir settings desde versiones antiguas.** Tres
políticas restrictivas se combinan con las cuatro políticas existentes de
propiedad. Impiden INSERT/upsert, UPDATE, DELETE y cambios de clave que afecten
a `settings`. Los clientes anteriores conservan lecturas propias y operaciones
diarias normales. Un PATCH/DELETE bloqueado puede devolver cero filas con HTTP
200: se comprueba el resultado y la ausencia de mutaciones, no solo el status.

**El nuevo guardado es atómico y usa una revisión numérica.** El cliente lee
`settings_revision`, fusiona los cambios independientes y llama a
`shaah_save_settings_v1`. El propietario viene exclusivamente del JWT. El sobre `owner_id/data` incluye
una afirmación del propietario capturado por la app, que debe coincidir con ese
JWT y nunca se utiliza como destino de la escritura ni se guarda en los datos.
Esto también bloquea un cambio de token A→B entre la lectura y el envío. Dos escritores con la misma revisión no pueden ganar
ambos. Los conflictos responden HTTP **409 / PT409**; el cliente relee y reintenta.
Un conflicto real conserva el borrador y requiere la decisión ya implementada.
Si el protocolo falla, el borrador sigue local: no hay fallback a upsert.

El payload viaja en el cuerpo de la solicitud. Se elimina el filtro que incluía
todo el JSONB en la URL. Se fija el SDK a **2.118.0** en el HTML y en los tests.
La preview sirve ese SDK y las fuentes desde su propio origen; producción conserva
su carga CDN con versión fijada.
Se descargó el script CDN 2.118.0 y se comprobó su API global en Chromium, con
salida de red bloqueada. Expone la misma API que el UMD npm usado en QA; ambos
SHA quedan registrados porque sus bytes de distribución son distintos.

**El servidor archiva antes y después de cada guardado.** El historial vive en
`shaah_private.settings_versions`, con RLS y sin acceso directo de clientes. Se
conservan las últimas 50 revisiones más el baseline anterior al protocolo,
revisión 0, para cuentas existentes. La captura de esa revisión ocurre en el
primer guardado; el respaldo externo previo sigue siendo obligatorio.

Los helpers con privilegios están en un esquema privado, con `search_path` vacío,
sin SQL dinámico y con `auth.uid()` obligatorio. Los tres wrappers públicos son
`SECURITY INVOKER`; se revoca el acceso de PUBLIC/anon y se concede únicamente a
`authenticated`. No se usan `user_metadata`, contraseñas administrativas o claves
privilegiadas en el navegador.

**Recuperar no hace retroceder la revisión.** `shaah_restore_settings_v1` lee
solamente una versión del propietario autenticado, comprueba la revisión vigente
y restaura como una nueva revisión. Los registros diarios no se modifican al
restaurar ajustes. Se conservan los backups locales y `cfgbak` ya existentes.

## Resultados verificados

| Batería | Resultado |
|---|---|
| Suite local completa | **115/115**, cero fallos u omisiones. Incluye cinco regresiones nuevas de revisión, confirmación del servidor, fallo sin fallback y cambios intermedios cuyo JSON vuelve al valor anterior y cambio tardío de token. |
| App con Auth, JWT, PostgREST y Realtime reales | **12/12**, run `2dafcc34-829f-4068-9022-8ff60a51b766`; mismo SHA que el candidato. Location Groups, historial, puntos 7/27, concurrencia, conflicto tras recarga, backups cambio de cuenta offline y rechazo de A-payload/B-JWT aprobados. |
| Migración y recuperación con Auth real | **11/11**, run `8df67949-1db7-4dde-99dc-ead10c5cf446`. Baseline, protección legacy, carrera de revisión, aislamiento, configuración grande, backups y restauración exacta aprobados; once casos repetidos en `current-protocol-report.json` con el protocolo final y el mismo SHA del candidato. |
| Ensayo SQL de instalación | **11 comprobaciones**, claims simulados y ROLLBACK; separado de las pruebas Auth. |
| Retención de backups | 55 escrituras en transacción revertida: quedan 50 versiones recientes más baseline 0; sigue siendo recuperable; revisión monotónica y PT409 comprobados. |
| Contención y recuperación operativa | Pausa real de guardado/restauración y DML diario para clientes; lecturas y backups disponibles. Recuperación administrativa de un perfil sintético con checkpoint exacto y reanudación de permisos comprobadas. |
| Puntos desde filas realmente recuperadas | **Vacation 7 / Work 27**, calculados cargando los registros recuperados de Supabase en las funciones reales de la app. |
| Copia privada de datos de app | **18 filas** de dos identidades sintéticas nuevas: igualdad exacta con el origen, RLS y sin SELECT para anon/authenticated. No se copiaron otras cuentas QA. |
| Preview publicada | **7/7**, login A/B, estado de cada cuenta comparado con su servidor, Social móvil, Realtime, cero errores JS, bloqueo previo a producción y SHA/protocolo exactos en `/qa/health`. |

La instalación conservó los hashes de **43 filas de cuatro perfiles**. Después
del ensayo y de publicar, se volvieron a comparar las **25 filas de QA A y QA B
publicados**: siguen idénticas. No se resembraron ni limpiaron tus perfiles.

La exportación independiente de los fixtures, anterior a instalar el protocolo,
contiene 18 filas y tiene SHA256
`3cc936fee04faa8465153e37abc5b7dbf336e1cf8dc02b55cb2e6d65322fa308`.
Se detectó una copia dañada antes de restaurar. El ensayo también dañó de forma
deliberada un ajuste y un día de una cuenta nueva y los recuperó con lecturas de
comprobación. Las credenciales y los tokens no forman parte de esos respaldos.

El propietario había informado «se ve bien» y «no aparecieron fallos» en la v2.
Se conserva esa validación manual, sin presentarla como revisión manual de v4 o
autorización para producción. La v4 y sus cambios de servidor se verificaron
automáticamente con datos sintéticos distintos.

## Incidencias del ensayo y su resolución

- La revisión final encontró una carrera en el guardado nuevo: el SDK podía
  resolver un token B después de leer y preparar ajustes A. Se añadió el sobre
  con propietario esperado y su comparación con el JWT en el wrapper invoker.
  La prueba local fuerza ese orden y la prueba Auth usa una revisión B válida:
  ambas comprueban rechazo y ausencia de mutación. Se repitieron las baterías
  completas sobre el SHA final: 115 locales, 12 Auth y 11 de recuperación.

- La primera prueba de propiedad esperaba un error HTTP para un UPDATE de
  settings bloqueado. La política nueva devolvía cero filas y conservaba el
  propietario. Se corrigió la aserción y se repitió la batería completa sobre
  otras dos cuentas nuevas y vacías: 11/11.
- Una carrera de revisión encontró un timeout de transporte. Los conflictos
  de aplicación se separaron del SQLSTATE de serialización 40001 / HTTP 500 y
  se usa PT409 / HTTP 409. Se volvió a comprobar una carrera real con un único
  ganador y una recuperación obsoleta rechazada. El primer intento se conserva
  como evidencia; no se cuenta como aprobado.
- El conector devolvió `Invalid or expired requestState` en el primer intento
  de instalación. Se comprobó que no existían cambios parciales y se repitió la
  operación soportada. `list_migrations` confirmó las tres versiones finales.
- Advisors: sin avisos de rendimiento; dos INFO esperados por RLS sin políticas
  en tablas privadas que deliberadamente no se conceden al cliente, y el WARN
  previo de protección contra contraseñas filtradas desactivada en QA. No se
  cambiaron opciones Auth para ocultar avisos.

Se utilizaron ocho identidades nuevas de Auth para estas ejecuciones, además de
las dos publicadas. Se crearon mediante Auth Admin API, sin SQL en `auth.users`,
sin emails y sin cuenta personal. Los provisionadores temporales quedaron cerrados
con 410 y sin código administrativo. Los 31 campos de runtime del Site son secretos
nativos, con valores ocultos; los perfiles publicados siguen usando sus siete
campos originales. Los fixtures de intentos anteriores se conservan.

## Secuencia propuesta para producción — pendiente de autorización

1. **Verificar destino y baseline.** Confirmar el proyecto original, versión de
   `main` y build publicado; ejecutar [inspect-target.sql](../qa/migration/inspect-target.sql)
   en modo lectura. Comparar columnas, PK, FK, RLS, permisos, triggers y esquemas
   expuestos con el QA validado. Si difieren, detenerse y revisar la diferencia;
   no forzar el preflight ni recrear tablas. `shaah_private` no debe exponerse al
   Data API, comprobación que se repetirá después de crearlo con cero filas pedidas.
2. **Guardar un checkpoint verificable antes del cambio.** Preparar una ventana
   sin ediciones y conservar/exportar las copias locales de dispositivos antiguos,
   especialmente los que tengan actividad offline. Capturar permisos originales,
   recuentos y estado lógico; crear una copia privada mediante
   [create-checkpoint.template.sql](../qa/migration/create-checkpoint.template.sql)
   con alcance explícitamente aprobado, y una copia independiente fuera de la BD,
   con acceso restringido y SHA256. Comprobar igualdad y lectura de esa copia.
   Los datos reales no se incluirán en Git, la preview ni el paquete de código.
   Sin respaldo verificado no se continúa.
3. **Instalar el backend antes del cliente.** Aplicar las tres migraciones, en el
   orden indicado y contra el ID productivo ya comprobado. No cambian los valores
   de las filas existentes. Verificar permisos, función de revisión, privacidad
   de backups y preservación de los datos. Las páginas antiguas dejarán de poder
   guardar ajustes durante esta transición; sus cambios locales deben conservarse
   antes de recargar. No ejecutar fixtures ni importar datos QA en producción.
4. **Publicar el candidato y comprobar.** Solo entonces integrar/publicar la
   versión aprobada en la rama de despliegue original. Confirmar el SHA publicado,
   SDK fijado, pantalla de acceso y configuración de destino. El propietario
   podrá entrar para su uso normal; no se automatizarán pruebas con su sesión
   personal ni se trasladarán usuarios QA al proyecto original.
5. **Mantener recuperación y observar.** Conservar el checkpoint, la exportación,
   el código aprobado, los recibos de permisos y los backups del servidor. Si
   falla el guardado, pausar escrituras y recuperar como se explica abajo.

Estas acciones productivas no se han ejecutado. El resultado actual permite
aprobar un candidato concreto y un procedimiento ensayado, no afirmar que el
esquema o el despliegue productivos ya fueron certificados.

## Recuperación ensayada

- Para contener un problema de ajustes: [pause-settings.sql](../qa/migration/pause-settings.sql).
  Para recuperar también datos diarios: [pause-all-writes.sql](../qa/migration/pause-all-writes.sql).
  Ambas mantienen la protección contra clientes antiguos y los backups.
- Comprobar la pausa antes de reparar. En QA se obtuvo 403 para los cinco tipos
  de escritura previstos, conservando lecturas y acceso al backup del propietario.
- Restaurar ajustes mediante una revisión confirmada; la restauración crea otra
  revisión. Para una reparación administrativa del perfil, usar
  [operator-recovery.template.sql](../qa/migration/operator-recovery.template.sql)
  con propietario aprobado, exportación íntegra, valor actual esperado del día y
  checksum del checkpoint. Su transacción aborta ante una diferencia inesperada;
  no borra cuentas ni vacía tablas.
- Volver a leer y comparar cada fila del alcance restaurado, historial y puntos.
  Si hay actividad posterior no incluida en el checkpoint, detenerse y definir
  una recuperación por fila que también la conserve; no reemplazarla por una
  copia antigua.
- Reanudar con [resume-settings.sql](../qa/migration/resume-settings.sql) o
  [resume-all-writes.sql](../qa/migration/resume-all-writes.sql), después de comprobar
  que esos permisos son los del recibo inicial. El ensayo de reanudación confirmó
  guardado por revisión, restauración, CRUD diario y puntos de datos recuperados.
- Mantener el protocolo y el historial al recuperar. Volver al HTML antiguo
  dejaría los ajustes sin capacidad de guardado; desactivar la guarda reabriría
  el riesgo original. El artefacto de recuperación es el candidato compatible y
  sus datos verificados, con corrección posterior si fuera necesaria.

## Límites pendientes y alcance exacto

- Falta tu autorización y la ejecución del preflight/respaldo reales para pasar
  a producción. No hay un bloqueo pendiente de credenciales para seguir en QA.
- OAuth productivo, equivalencia del esquema original y un iOS físico no están
  certificados por estos tests. No se hicieron pruebas con tu cuenta personal.
- Los clientes antiguos deben actualizarse: la guarda protege settings; las
  correcciones de cola offline e identidad viven en el cliente nuevo. Las
  escrituras diarias antiguas se mantienen por compatibilidad.
- Se probó un cuerpo de **134.633 bytes** con una URL de **75 bytes**. No se
  promete un tamaño de configuración ilimitado.
- La copia privada dentro de la BD sirve para recuperación lógica; no sustituye
  una copia independiente ni constituye una prueba de restauración completa de
  Supabase/Auth, pérdida de infraestructura o PITR. Esos servicios no se cambiaron.
- Sigue documentado el detalle menor de la demo con dos etiquetas “No Junk Food”
  causado por una migración existente, sin impacto sobre Location Groups.

La evidencia está en `test-results/phase3-owner-all-final.txt`, los informes de ambos
runs indicados, `test-results/migration-phase3/` y `test-results/preview-site/`.
El paquete revisable adjunta fuentes, SQL y resultados saneados, sin secretos.
El escaneo final comprobó 154 archivos frente a los valores reales de credenciales,
pruebas privadas y tokens del Site: cero archivos contenían esos secretos. Los
resultados solo guardan contadores. El SQL histórico de inserción de fixtures
Auth quedó deshabilitado; el flujo actual usa exclusivamente Auth Admin API.
