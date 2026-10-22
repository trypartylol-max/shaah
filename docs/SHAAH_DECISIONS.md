# SHAAH — decisiones

Registro actualizado el 22/10/2026. Separar decisión explícita, hecho observado y propuesta; no convertir recomendaciones de un asistente en autorización.

| ID | Estado / origen | Decisión y motivo |
|---|---|---|
| D01 | Regla del Master Handoff | Preservar datos, funciones y significado histórico. Vacation comienza el 08/09/2026 para los fixtures establecidos; no extenderlo indefinidamente ni borrar eras Work posteriores legítimas. |
| D02 | Solicitud del usuario 22/10 | Este cambio se limita a organización y documentación. Sin código, producción, SQL, Auth, datos, deploys ni borrado de chats. Cualquier cambio riesgoso requiere autorización específica. |
| D03 | Hecho comprobado 22/10 | GitHub oficial `trypartylol-max/shaah`, `main`; ORIGINAL y SHAAH-TEST son entornos diferentes. La autorización histórica de una promoción no se reutiliza para otra. |
| D04 | Regla del Master Handoff + organización solicitada | GitHub guarda reglas, estado, decisiones y matriz; los chats guardan conversación. No usar memoria del chat como única fuente de estado. |
| D05 | Hecho comprobado 22/10 | El cliente actual usa recursos externos versionados en `assets/`. La descripción antigua de HTML único no justifica revertir esta arquitectura. |
| D06 | Decisión del usuario en chat de Location 22/10 | Conservar las cuatro propuestas Social; aún sin ganadora. Separar exploración Social e identidad visual. La pausa de identidad en esa comparación no cancela su posible trabajo en otro chat. |
| D07 | Organización aplicada en esta tarea | Mantener sección existente `shaah`, añadir allí el chat de organización y conservar todos los chats. El intento de mover «Usar ChatGPT eficientemente» al Project fue rechazado por la herramienta; sigue fijado. |

## Convenciones de trabajo adoptadas en esta tarea

Un chat por resultado, continuidad en el mismo chat mientras el objetivo sea el mismo; traspaso breve cuando crezca demasiado. ChatGPT para decisiones y exploración; Codex sobre la copia del repo para implementación y validación. Un agente por defecto; delegación solo por petición expresa y con tareas independientes. Mantener el modelo disponible habitual y cambiar por una necesidad concreta, sin imponer un modelo único a todo el proyecto.

Estas convenciones operacionalizan la solicitud actual. La respuesta previa de workflow del chat de referencia se devolvió como marcador de contenido y no pudo recuperarse en texto; no se afirma haber reproducido literalmente aquel acuerdo.

## Pendientes de decisión

- Base o mezcla de Social y regla para personas sin lugar asignado.
- Alcance definitivo de Torre de Control, integración y permisos.
- Cualquier promoción futura a ORIGINAL, con candidato y validación concretos.

Al añadir decisiones: fecha, decisión explícita del usuario o propuesta, alcance, motivo, evidencia y qué decisión sustituye. No sobrescribir el historial.
