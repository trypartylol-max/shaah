# SHAAH — Location Groups: handoff para nuevo chat
**Fecha:** 2026-10-16
**Estado:** implementación de desarrollo; NO desplegada ni certificada para producción.

## 1. Objetivo del próximo chat
Continuar desde la versión `SHAAH-location-groups-hardened.html`, ejecutar pruebas de regresión de la aplicación completa y verificar persistencia/sincronización con Supabase en un entorno de prueba. Solo después preparar integración segura en `trypartylol-max/shaah` y despliegue, con autorización explícita antes de cambios en producción.

## 2. Archivos del paquete
- `SHAAH-location-groups-hardened.html`: **último candidato de desarrollo**; partir de aquí.
- `SHAAH-FINAL.html`: referencia anterior suministrada; no asumir que coincide con GitHub/producción.
- `SHAAH_MASTER_HANDOFF.md`: contexto canónico previo del producto; leer antes de modificar reglas.
- `test_shaah_hardened.py`: prueba aislada con Playwright/Chromium para operaciones de contactos y filtrado; no equivale a E2E.
- `test_shaah_locations.py`: otra prueba focalizada anterior.
- `harden_shaah.py`: script auxiliar de endurecimiento usado en desarrollo.

## 3. Reglas de producto acordadas
**Separación crucial:**
- **Social Scoring** otorga puntos por actividades registradas. Mantener diferencias de puntos según Work/Vacation Mode (`pWork`, `pVacation`, `modePts()`), independientemente de ubicación o estado de contacto.
- **Social History** registra quién fue visto, cuándo y con qué frecuencia; las recomendaciones WHO TO SEE y sugerencias de contactos se filtran por ubicación activa y por estado activo.
- Location Groups **no** cambian puntuación, registros históricos ni modo Work/Vacation.

**Location Groups:**
- Nombres manuales (p. ej., Israel, Panamá); selección manual, nunca GPS.
- Una persona puede pertenecer a varios grupos.
- `Inactive` es independiente de la ubicación: excluye de listas/recomendaciones normales en todas las ubicaciones, pero permite localizar y reactivar el contacto.
- Deben existir vistas All People, Inactive y Unassigned; contactos previos sin ubicación no se borran ni se pierden.
- Conservar IDs, historial, frecuencias y estadísticas de contactos.
- No confundir Location Groups con subcategorías existentes de Social Combo.

**Asignación:**
- Masiva: búsqueda, selección múltiple, añadir ubicación, eliminación explícita de ubicación; respetar filtros y limpiar selección al cambiar el ámbito.
- Individual: casillas para editar ubicaciones de cada contacto; validar que el grupo exista.

## 4. Qué está implementado en el HTML de desarrollo
Se han añadido metadatos de `CFG.locationGroups`, `CFG.selectedLocation`, `person.locations`, `person.inactive` y lógica de visibilidad/administración. Incluye selector de ubicación, filtrado WHO TO SEE, filtros de personas, gestión de contactos sin grupo, asignación masiva y edición individual. La asignación masiva es aditiva por defecto. La interfaz de selección de ubicación debe seguir accesible incluso sin recomendaciones.

## 5. Qué está comprobado y qué NO
**Comprobaciones comunicadas en el chat anterior:** sintaxis JS válida, pruebas de componentes aislados (asignación masiva, edición individual, multiubicación, Inactive/Unassigned, callback de guardado) y comparación de funciones `modePts()`, `persistDay()` y `saveCfg()` sin cambios. Hay scripts de prueba adjuntos para reproducir y verificar; no tomar resultados anteriores como sustituto de una nueva ejecución.

**Pendiente:**
1. **Regresión E2E real** de toda la aplicación en navegador, con login si procede, datos de prueba, Work/Vacation, Social Combo, WHO TO SEE, creación/edición de contactos, refresh y flujos negativos.
2. **Supabase autenticado:** comprobar que el JSON de configuración se guarda, se recarga y sincroniza entre sesiones/dispositivos sin perder contactos/historial. Atención al riesgo de sobrescritura por escrituras concurrentes de configuración completa.
3. **Integración GitHub:** comparar con el commit actual de la rama principal (no asumir que el HTML local está actualizado); respaldar, preparar cambios revisables y pruebas, preferentemente en rama/PR.
4. **Despliegue controlado:** aprobación, respaldo, verificación posdespliegue y plan de rollback.

## 6. Precauciones operativas
- **NO se han realizado cambios en GitHub ni despliegues** durante este trabajo, según el historial de esta conversación.
- No usar datos reales para pruebas destructivas; solicitar cuenta/entorno de prueba de Supabase si hace falta.
- No asumir que la app completa fue probada: el navegador solo ejercitó un segmento inyectado en DOM aislado.
- No alterar scoring ni estructura de registros históricos.
- Antes de cualquier escritura remota, inspeccionar repo/commit actual y obtener aprobación para el alcance de la modificación.

## 7. Primeras acciones concretas
1. Leer `SHAAH_MASTER_HANDOFF.md` y ambos HTML.
2. Reproducir los tests existentes y revisar su cobertura/limitaciones.
3. Preparar harness E2E de aplicación completa (servidor HTTP local si `file://` bloquea Chromium) y dataset sintético.
4. Probar escenarios de migración: personas sin `locations`/`inactive`, ubicaciones borradas, contactos con varios grupos, selector vacío, y actividad social con contacto inactivo.
5. Documentar resultados con evidencia reproducible; no marcar un gate como aprobado por inspección estática.

## 8. Prompt sugerido para pegar en el nuevo chat
> Continuemos SHAAH desde este handoff. He adjuntado el paquete ZIP con el HTML de desarrollo, el HTML anterior, el handoff canónico y scripts de prueba. Lee primero `SHAAH_LOCATION_GROUPS_HANDOFF_2026-10-16.md` y `SHAAH_MASTER_HANDOFF.md`. No rediseñes Location Groups. Comienza por reproducir las pruebas y ejecutar regresión E2E de la app completa con datos sintéticos. Preserva Social Scoring y los puntos Work/Vacation. No toques GitHub ni producción sin avisarme y obtener autorización. Distingue explícitamente lo comprobado de lo pendiente.
