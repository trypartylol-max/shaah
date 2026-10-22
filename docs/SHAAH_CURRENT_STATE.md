# SHAAH — estado actual

Verificado el 22 de octubre de 2026 (Asia/Jerusalem). Esta fotografía reemplaza estados antiguos para orientación; no borra sus evidencias. Base de código: `18ab112808550bd8abdf6ee6ddae25d0ab6371aa` de `trypartylol-max/shaah`, rama `main` (commit del 21/10). La rama de documentación no es una nueva versión de la app.

## Hechos comprobados hoy

| Elemento | Evidencia y límite |
|---|---|
| ORIGINAL | GET 200 de https://trypartylol-max.github.io/shaah/: HTML y cuatro recursos JS/CSS enlazados coinciden byte a byte con la base Git. Véase [evidencia](evidence/workflow-2026-10-22.json). No se comprobó el runtime autenticado ni los archivos de fuentes referidos por CSS. |
| Arquitectura actual | HTML con JS/CSS externos bajo `assets/`; el modelo de archivo único descrito en el Master Handoff corresponde a una etapa anterior. No volver a fusionar ni reestructurar sin una tarea explícita. |
| Backend ORIGINAL | El cliente referencia `llpyxktcfubhmthqujpa`; el listado Supabase devuelve ACTIVE_HEALTHY. No se consultaron filas, Auth, RLS ni migraciones en esta revisión. |
| SHAAH-TEST | Supabase confirma nombre, ref `kpnwiwaiwnndpvtxkvva`, ACTIVE_HEALTHY y región eu-west-1. Es distinto del original. Estar activo no demuestra que las pruebas pasen. |
| Sitio TEST | https://shaah-test-location-groups.arviler.chatgpt.site, versión 15; fuente `7a763c936cded4c7e35eb82c70eb0829e9ac9543`; deployment `appgdep_6ad7cef59fac8191817f26683299ebf4`, succeeded, actualizado 20/10/2026 20:29:51 UTC. Metadatos del proveedor; no se repitieron pruebas autenticadas ni se verificó el contenido privado servido. |
| ChatGPT | Project existente: `sHAAH`, ya agrupado en sección `shaah`. Su espejo local dice que no tiene instrucciones personalizadas; es una referencia local, no una confirmación de ajustes en vivo. |

## Documentos anteriores y qué significan

- [Master Handoff](SHAAH_MASTER_HANDOFF.md): reglas de producto e historia; sus defectos y arquitectura observados pertenecen al artefacto allí descrito. No son automáticamente defectos del commit actual.
- [Candidato del 18/10](SHAAH_PRODUCTION_CANDIDATE_2026-10-18.md): registra 115 pruebas locales, 12 Auth, 11 recuperación y 7 preview sobre un SHA anterior. No atribuir esos resultados al código actual.
- [Cutover](SHAAH_PRODUCTION_CUTOVER.md): registra autorización y operación productiva históricas. No autoriza otro despliegue.
- [Seguridad del 19/10](SHAAH_SECURITY_REMEDIATION_2026-10-19.md): hallazgos, correcciones candidatas y límites de aquella revisión. Su texto «pendiente de publicar» no describe necesariamente el estado actual: commits posteriores promovieron protecciones; el HEAD actual y el GET de hoy son las referencias de archivos. No certifica una auditoría completa actual.
- [v10](SHAAH_V10_ORIGINAL_CANDIDATE_2026-10-20.md) y [parpadeo](SHAAH_ORIGINAL_FLICKER_CANDIDATE_2026-10-20.md): evidencias acotadas a sus candidatos. No sumar sus conteos como una batería única del HEAD.

## Trabajo abierto

1. Social: cuatro propuestas conservadas — Cuaderno, Órbita, Panel y Franja. En el chat «FIN Completar regresión de Location», el 22/10 no había una ganadora ni mezcla elegida. La recomendación del asistente no equivale a decisión del usuario. Identidad visual se puso en pausa para esa exploración; después se pidió un traspaso a un chat separado. No asumir implementación de esas propuestas en TEST.
2. Torre de Control: side project separado; el chat «Preparar Torre de Control SHAAH» conserva maquetas. Una maqueta no acredita panel conectado ni despliegue completado.
3. Auditoría integral, Safari/iPhone físico, sincronización real del build actual, esquema/RLS/Auth actuales y recuperación actual: no verificados en esta tarea.
4. Netlify figura en referencias antiguas; no se comprobó su estado ni su paridad hoy.
5. Aplicar instrucciones al Project: pendiente por limitación de herramientas; texto listo en [instrucciones](SHAAH_PROJECT_INSTRUCTIONS.md).

## Siguiente paso

Usar [workflow](SHAAH_WORKFLOW.md), elegir un resultado concreto y leer [decisiones](SHAAH_DECISIONS.md) y [matriz](SHAAH_TEST_MATRIX.md). Para Social, resolver la propuesta o mezcla antes de implementar. Esta tarea solo cambia documentación; no publica ni autoriza producción.
