# SHAAH · PR #16 · Validación anterior al flujo de respaldo

> Registro de la revisión anterior. El flujo actual y su validación se documentan en [BACKUP-FLOW.md](BACKUP-FLOW.md). La reparación automática descrita aquí fue sustituida por una propuesta manual con respaldo verificado.

**362/362 pruebas aprobadas**, sin fallos, cancelaciones ni pruebas omitidas. Los archivos de producción y sus firmas SRI están regenerados y comprobados. El PR remoto sigue en borrador y sin cambios: no se hizo push, merge ni despliegue.

Repositorio: trypartylol-max/shaah. Rama local: `audit/fix-history-and-settings-20261027`. Punto de partida remoto: `ed3d7a7c84db74b502465745ca94a7d5e5c83776`. Se trabajó en una copia aislada, conservando los cambios pendientes de las demás copias locales.

## Correcciones

- La reparación del regreso a Work se limita a la sesión de `trypartylol@gmail.com` y conserva las eras posteriores y las elecciones recientes del modo actual, incluidas las guardadas sin conexión. Una fecha generada al restaurar una caché antigua no cuenta como una elección reciente del usuario.
- La reparación conserva `auto` y `resumeOn`. `checkTravelAuto` sigue desactivado: conservar un antiguo `auto=true` no activa cambios automáticos.
- Settings puede pausar y reactivar hábitos, guardar el cambio y recargar sin crear completados ni invocar el hook inexistente.
- El panel de asignación por grupos permanece abierto al seleccionar contactos, buscar y aplicar cambios. Su estado es de interfaz y se reinicia al cambiar de cuenta.
- Una persona con una categoría antigua puede editarse conservando su categoría, tipo de relación, ID e historial. Sigue siendo inválido asignar una categoría desconocida distinta.
- Los controles Social/Core nuevos respetan la paleta Matrix, incluidos formularios y avisos de validación.
- El código fuente vuelve a coincidir con el diseño Work que ya estaba publicado: una misma geometría en todas las apariencias, sin sustituir su control al cambiar de apariencia. La plantilla conserva todos los recursos adicionales y su orden.

## Pruebas y evidencias

| Comprobación | Resultado |
| --- | --- |
| Pruebas sin navegador contra el código fuente final | 228 aprobadas |
| Suite completa contra los archivos de producción finales | 362 aprobadas: 228 sin navegador y 134 de navegador |
| Comparación visual con el HTML anterior al PR | Aprobada en Classic, Minimal y Matrix, móvil y escritorio |
| Firmas de integridad locales | 6 firmas SRI verificadas |
| Código fuente frente a assets generados | Igualdad exacta de bytes y fingerprints |
| Política CSP y orden de recursos adicionales | Conservados |

La comparación visual usa `tests/fixtures/production-before-pr16.html`, fijado con SHA-256 `cc28e10fb66c474ebd3914dcd819aac630869a8e11d07b37a3a661a89465a142`. En Matrix se comprueba la geometría contra esa referencia y la paleta completa por separado, porque sus colores se corrigieron intencionadamente.

Las pruebas de navegador interceptan HTTP y WebSockets y usan respuestas sintéticas para Supabase. La suite sin navegador también verifica 67 días de un backup local existente de tres cuentas; no consulta ni modifica ninguna base de datos remota.

El aparente bloqueo de Today provenía de esperas fijas acumuladas. La prueba ahora comprueba el estado con movimiento reducido y termina sin esas esperas. Se actualizaron selectores obsoletos, escenarios de rutinas personalizados y expectativas de la interfaz actual sin retirar las comprobaciones de persistencia, historial y aislamiento de cuentas. Las capturas se guardan en `test-results/`, no sobre documentación versionada.

## Build final

Se ejecutó exclusivamente `python3 scripts/build-production.py` para generar los assets:

- JavaScript: `assets/app.1b61b765455d97fb.js`
- CSS: `assets/app.1d5f8be7aae6a625.css`

Las seis firmas SHA-384 del HTML, los nombres derivados del contenido, la igualdad con `source/app.js` y `source/app.css`, la CSP y el orden de los recursos adicionales se verificaron después. La suite final probó el bundle generado, sin `SHAAH_SOURCE` ni `SHAAH_CSS`.

## Alcance confirmado y publicación

1. **Alcance confirmado:** solo `trypartylol@gmail.com`. La reparación exige un usuario de sesión con ID y ese correo; acepta diferencias de mayúsculas y espacios exteriores. No utiliza correos guardados en Settings ni cachés para decidir la cuenta. Para otras identidades devuelve `false` antes de modificar la configuración, la versión o la caché de fechas. El período y el límite `travelV < 10` se conservan.
2. Las cuentas que ya tengan `travelV >= 10` no repiten la reparación. Si una versión anterior ya sobrescribió historia, este cambio no reconstruye los datos perdidos automáticamente.
3. Cualquier push debe coordinarse con la restricción de no desplegar: el PR tiene integración automática de previews de Netlify. No se publicó nada durante esta revisión.

## Reproducción

Con Node >=22, las dependencias fijadas del repositorio y Chromium disponible:

- Código fuente antes del build: establecer `SHAAH_SOURCE=source/app.js` y `SHAAH_CSS=source/app.css` al ejecutar las pruebas.
- Generación: `python3 scripts/build-production.py`.
- Paquete final: `node --test --test-timeout=60000 --test-concurrency=1 tests/*.test.cjs`.
- Si hace falta, `CHROMIUM_PATH` permite seleccionar el ejecutable de Chromium local.

Evidencias finales: `artifact-all-final.log`, `source-unit-final.log`, `account-scope-unit.log`, `account-scope-browser.log` y `build-verification.json`. Las pruebas específicas cubren identidades ausentes, correos distintos o parecidos, diferencias de mayúsculas/espacios y cambios entre cuentas; una dirección almacenada en Settings no habilita la reparación. Los logs anteriores de esta carpeta se conservan como registro de la auditoría inicial; no representan el estado final.
