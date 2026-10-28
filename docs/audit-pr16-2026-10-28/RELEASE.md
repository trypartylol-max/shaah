# PR #16 · validación para publicación

**412/412 pruebas aprobadas** sobre el paquete generado, sin fallos, cancelaciones ni pruebas omitidas.

Integra main `399dd750ba36cf43fdef9c1186f4fcf8cb55b433` (PRs #18, #19 y #20). Conserva el temporizador y Core compactos, el círculo Day Log, el historial Work compacto y las correcciones de configuración fechada, revisión semanal y cambios de nivel. Añade el respaldo completo verificado y mantiene pausada la reparación histórica automática.

La copia exacta de main se verificó contra su árbol `ad662fc28fd4d9ca86f3434724f66ba169a3dda6`. Se usaron objetos Git locales existentes, completando dos documentos desde GitHub y eliminando del espejo los archivos exclusivamente locales. No se modificaron otras copias de trabajo.

La primera suite de fuente detectó un conflicto de integración en socialSave (faltaba la variable de persona) y una expectativa antigua del guard de QA. Se restauró la implementación actual de main para socialSave y la expectativa de su guard aislado: 29 pruebas focalizadas y 14 de guard pasaron. Después del build la suite íntegra aprobó 412/412, incluidos edición de contactos, categorías antiguas, respaldo, paginación, recuperación, cuenta cambiada y respuesta perdida tras guardar.

Generación exclusiva con scripts/build-production.py. Assets finales: `assets/app.646f8e88291a2a3f.js` y `assets/app.448b3db19a6574cf.css`. Se verificaron igualdad exacta con la fuente, nombres derivados del contenido, seis SRI, CSP y orden de recursos adicionales.

Publicación de frontend autorizada por el propietario. No se ejecutó una reparación de datos.

El despliegue de frontend no ejecuta la reparación: solo una acción explícita en la app puede aplicarla. Las cuentas ya marcadas con travelV >= 10 no reciben otra propuesta. Deshacer esta publicación puede hacerse revirtiendo el merge de PR #16; este proceso no requiere restaurar datos de la base de datos.

Evidencias: release-artifact-all.log, release-focused.log, release-guard.log y release-build-verification.json. Los informes anteriores de esta carpeta son históricos y quedan sustituidos por esta validación.

Los logs de esta validación sustituyen las direcciones de correo del fixture por marcadores antes de versionarse; los resultados y conteos se conservan. Este informe sustituye las certificaciones anteriores de esta carpeta.
