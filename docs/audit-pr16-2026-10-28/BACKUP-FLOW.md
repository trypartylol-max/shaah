# Respaldo y reparación manual del historial

> Validación posterior tras integrar main: [MAIN-SYNC.md](MAIN-SYNC.md), 382/382 pruebas aprobadas y assets actualizados.

**373/373 pruebas aprobadas sobre el paquete generado**, sin fallos, cancelaciones ni pruebas omitidas.

La reparación dejó de ejecutarse al cargar la cuenta. Ahora requiere descargar un respaldo, volver a seleccionar ese archivo para verificarlo, revisar sus efectos y confirmar expresamente. Solo la sesión autenticada de `trypartylol@gmail.com` puede aplicar o recuperar esta reparación. Otras cuentas pueden descargar sus propios datos.

## Uso

1. Abre Settings → Data & backup y espera a que termine la sincronización.
2. Pulsa **Descargar respaldo**. Guarda el JSON en un lugar privado: contiene tus datos personales, sin tokens de sesión ni credenciales.
3. Selecciona ese mismo archivo en **Verificar archivo descargado**.
4. Revisa las fechas, el estado del hábito Trabajo y las puntuaciones anteriores y previstas. Confirma únicamente si el resultado coincide con lo esperado.
5. Conserva el archivo original. Para deshacer esta reparación, selecciónalo en **Respaldo anterior**, revisa la recuperación y confirma.

La recuperación funciona después de recargar. Deshace los cambios de configuración de esta reparación y conserva ediciones independientes posteriores. No es un importador general que sobrescriba toda la cuenta: no reemplaza ni elimina registros diarios. Las notas y registros añadidos después se mantienen. Si se editaron los mismos campos del historial, se bloquea para revisión manual.

## Protecciones

- Se descargan todas las filas de la cuenta desde `day_logs`, incluida la configuración original y su revisión, mediante paginación ordenada con conteo exacto. Dos lecturas completas deben coincidir. Se incluyen también una representación normalizada de los días y la configuración visible localmente.
- Se bloquea el flujo si hay cambios pendientes, conflictos de sincronización, cuenta cambiada, respuesta incompleta, revisión ausente o datos alterados entre la revisión y la confirmación. Límites: 20 MB y 20 000 filas; se informa del límite y no se exporta silenciosamente una parte.
- El SHA-256 comprueba integridad y coherencia del archivo. No es una firma de autenticidad del servidor.
- Las lecturas dobles no constituyen una instantánea transaccional de la base de datos. La escritura de configuración utiliza el control de revisión existente (`shaah_save_settings_v1`), y la reparación/recuperación nunca escribe registros diarios.
- La propuesta cambia únicamente los períodos históricos del 8 de septiembre al 8 de octubre de 2026 y su marcador de revisión. Conserva eras posteriores, modo actual, hábitos actuales, `auto` y `resumeOn`. Los cambios automáticos de modo siguen desactivados.
- La recuperación conserva `travelV=10` para que una versión antigua no repita su migración automática. Puede conservar límites redundantes de períodos, equivalentes al historial original, para evitar que una caché antigua resucite un historial más largo.
- Si el servidor pudo guardar pero se perdió la respuesta, la app comunica que el resultado no está confirmado. Hay que conservar el archivo y actualizar los datos antes de recuperar o reintentar; no se repite la escritura a ciegas.
- Cuentas con `travelV >= 10` no reciben una nueva propuesta. El flujo no reconstruye automáticamente historia que una versión anterior ya hubiera sobrescrito.

## Validación

Las pruebas nuevas usan datos sintéticos y no conectan con Supabase real. La suite existente también comprueba 67 días de un respaldo local de tres cuentas, sin consultar el servidor. Incluyen descarga real en navegador, selección del archivo, móvil/escritorio, cancelación, recarga, recuperación, notas nuevas, archivos alterados/de otra cuenta, concurrencia, paginación de más de 1 100 registros y pérdida de respuesta después de guardar.

## Publicación

Trabajo exclusivamente local en `audit/fix-history-and-settings-20261027`. No se hizo push, merge ni despliegue. No se consultaron ni modificaron datos reales de Supabase. La publicación y la ejecución sobre la cuenta real requieren autorización posterior; un respaldo reduce el riesgo y permite recuperar esta reparación, pero no garantiza por sí solo ausencia de errores.

## Archivos generados

Generación exclusiva con `python3 scripts/build-production.py`, después de validar el código fuente. JavaScript: `assets/app.5bb15653abbdb947.js`. CSS: `assets/app.1d5f8be7aae6a625.css`. Se verificaron igualdad exacta con el código fuente, fingerprints, seis firmas SRI, CSP y orden de recursos adicionales.

La primera ejecución completa del código fuente detectó seis comparaciones visuales que incluían la altura añadida del panel y una prueba que contaba la copia automática `cfgbak` como escritura de Settings. Se ajustaron esas comprobaciones al alcance que describen; las seis comparaciones y las tres pruebas de Settings pasaron después. El panel nuevo tiene cobertura independiente de descarga, verificación, confirmación y recuperación en móvil y escritorio.

Evidencias: `backup-artifact-all.log` (373 pruebas), `backup-unit.log` (22 pruebas específicas), `backup-source-parity.log` (6 comparaciones), `backup-source-settings.log` (3 pruebas) y `backup-build-verification.json`. Las capturas móvil y escritorio están en `test-results/history-backup-390.png` y `test-results/history-backup-1440.png` (archivos locales no versionados).
