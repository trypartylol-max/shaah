# Integración de main · PR #16

**382/382 pruebas aprobadas** sobre el paquete generado, sin fallos, cancelaciones ni pruebas omitidas.

Se incorporó main `a305cd8921b5fda2273707827a53b7e6b99d55a3` al contenido validado de la auditoría. Conserva su diálogo y controles del temporizador de rutinas, la sesión compacta en el círculo Log Activity, las reglas de puntuación, el historial y los cambios de presentación publicados. También conserva el respaldo verificado y la reparación/recuperación manual exclusiva de la cuenta confirmada.

Los conflictos se resolvieron conservando ambas ampliaciones de CSS (Matrix y nuevas rutinas), la plantilla actual de main y sus recursos adicionales. La fuente JavaScript se integró sin conflictos textuales. La comparación visual usa ahora el HTML de main a305cd8, fijado con SHA-256 `d18b37f82b713fba7b05009a43b91d7256e3a65c0c094d682d4fe963d67ccb05`, para no revertir su nueva interfaz. El panel de respaldo conserva su cobertura separada.

Se actualizaron pruebas que buscaban controles retirados del temporizador, un nombre de rutina distinto al de su fixture y un sustituto de DOM sin el nuevo diálogo. Las comprobaciones de texto seguro, aislamiento entre cuentas, historial y navegación permanecen. Las capturas nuevas se guardan en test-results, no sobre documentación versionada.

Validación: primera ejecución completa de fuente, 379/382; las tres pruebas desactualizadas se corrigieron y la selección afectada pasó 19/19. Después se generaron assets exclusivamente con scripts/build-production.py y la suite completa del paquete pasó 382/382. Se verificaron seis SRI, identidad exacta con la fuente, CSP y orden de recursos adicionales respecto a main.

Assets finales: `assets/app.966f721ea3ac5b2f.js` y `assets/app.fe6fd5dfca831c5f.css`. Evidencias: main-sync-artifact-all.log, main-sync-adjusted.log y main-sync-build-verification.json.

El conector de GitHub publica un commit con dos padres: el head anterior del PR `32ddfd0eec6dc77da9bfd2258afc7ed3859fe5c7` y main `a305cd8921b5fda2273707827a53b7e6b99d55a3`. La copia local usa un espejo de main reconstruido desde el ancestro común y las 16 versiones de archivos verificadas contra sus hashes GitHub; no había credenciales HTTPS locales para fetch/push. Se verifica la igualdad del árbol publicado con el índice local validado.

Autorizado: actualizar el PR y su vista previa de Netlify. El PR permanece en borrador. No se fusiona en main, no se publica producción y no se accede a datos reales de Supabase.
