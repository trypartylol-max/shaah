# SHAAH — forma de trabajar

## Punto de entrada

1. Leer `SHAAH_CURRENT_STATE.md`, `SHAAH_DECISIONS.md`, las reglas del `SHAAH_MASTER_HANDOFF.md` y la sección pertinente de `SHAAH_TEST_MATRIX.md`.
2. Confirmar repo, rama, commit y entorno. Releer código actual: los chats y candidatos antiguos pueden estar desactualizados.
3. Definir un resultado y criterio de aceptación. Si solo requiere implementación clara, empezar directamente en Codex; si requiere elegir comportamiento o diseño, resolverlo primero en ChatGPT dentro de `sHAAH`.
4. Implementar en una rama aislada; validar, revisar el diff y documentar hechos y pendientes. Presentar una PR concreta. Producción necesita autorización específica del cambio.

## Chats y frentes

| Frente | Uso |
|---|---|
| Organización / estado | Este cambio y sus documentos; referencia común de coordinación. |
| Social | Elegir entre Cuaderno, Órbita, Panel y Franja o una mezcla; después implementar en TEST con alcance explícito. |
| Identidad visual | Chat separado cuando se retome; preservar propuestas previas y separar decisiones de navegación. |
| Torre de Control | Side project separado; no mezclar permisos ni código con la app existente. |
| Implementación / QA | Un chat de Codex por feature o corrección concreta; continuar en él hasta cerrar el resultado. |

No es necesario un chat nuevo para cada mensaje ni un único chat para toda SHAAH. Al traspasar: objetivo, decisiones, repo/rama/SHA, archivos o PR, pruebas con alcance, bloqueos y siguiente paso. No asumir que el chat siguiente recuerda lo anterior.

Usar un agente por defecto. Pedir agentes solo para tareas independientes con límites claros y sin ediciones concurrentes de los mismos archivos. No hace falta usar siempre el mismo modelo; elegir según el trabajo y las opciones reales disponibles.

## Documentación compartida

- Master Handoff: reglas duraderas e historia del artefacto original.
- CURRENT_STATE: hechos recientes, evidencia y siguiente paso.
- DECISIONS: decisiones explícitas, propuestas y pendientes.
- TEST_MATRIX: cobertura requerida y resultados vinculados al build.
- PROJECT_INSTRUCTIONS: texto preparado para las instrucciones del Project; el archivo no se sincroniza automáticamente con sus ajustes.

Fuentes del Project y repo local son contextos distintos. La documentación oficial recomienda un chat por resultado y reglas duraderas en documentación versionada: https://learn.chatgpt.com/docs/projects.

## Organización aplicada y límites

Se conserva el Project `sHAAH` y la sección existente `shaah`. Este chat fue renombrado y agrupado allí. No se borraron ni archivaron chats, no se enviaron mensajes a otros chats y no se crearon chats nuevos.

«Usar ChatGPT eficientemente» continúa fijado fuera del Project: el intento de moverlo devolvió «You cannot pin a project or GPT conversation». No se quitó su fijación para forzar el cambio.

El espejo local del Project informa ausencia de instrucciones personalizadas. No hay herramienta disponible para editarlas y la interfaz de la app está bloqueada para automatización. El texto de `SHAAH_PROJECT_INSTRUCTIONS.md` queda listo para pegar en los ajustes del Project; no se editó el espejo sincronizado.
