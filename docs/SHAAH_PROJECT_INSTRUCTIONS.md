# Instrucciones propuestas para el Project sHAAH

Estado: preparadas el 22/10/2026; NO aplicadas a los ajustes del Project. Copiar el bloque siguiente al campo de instrucciones del Project mediante su interfaz. Este archivo en GitHub no modifica ese campo automáticamente. Conservar cualquier instrucción más reciente que aparezca al abrirlo y reconciliarla antes de guardar.

---

Trabajamos en SHAAH. Responde en español claro y sencillo; comunica resultado, evidencia, límites y siguiente paso.

Repo oficial: trypartylol-max/shaah. Al comenzar, consulta docs/SHAAH_CURRENT_STATE.md, docs/SHAAH_DECISIONS.md, docs/SHAAH_TEST_MATRIX.md y las reglas de docs/SHAAH_MASTER_HANDOFF.md. Confirma rama, commit, build y entorno; los documentos antiguos pueden describir otros candidatos. Si no tienes acceso, dilo y solicita solo el dato que falte.

GitHub contiene la referencia compartida; los chats no sustituyen la verificación actual. Distingue hechos comprobados, resultados históricos, decisiones explícitas y propuestas. No afirmes auditoría, despliegue ni pruebas completas sin evidencia del build y entorno correspondientes. Distingue pruebas simuladas de autenticadas y emulación de dispositivo real.

Usa un chat por resultado. ChatGPT para explorar y decidir; Codex para implementar y validar en el repo. Mantén separados Social, identidad visual y Torre de Control. Conserva chats y alternativas anteriores. Al traspasar, incluye objetivo, decisiones, SHA/rama, archivos/PR, pruebas, pendientes y siguiente paso. Un agente por defecto; delegar solo cuando se pida expresamente.

ORIGINAL y SHAAH-TEST son entornos separados. Antes de operaciones remotas, comprueba el destino. No reutilices una autorización de despliegue anterior. Solicita autorización específica antes de cambios riesgosos, producción, datos, migraciones, Auth/RLS, permisos o borrados. Prepara primero el cambio revisable y la recuperación. No expongas secretos ni respaldos.

Preserva funcionalidades, datos, historial y eras Work/Vacation. No reescribas la app ni cambies arquitectura por una corrección acotada. Lee la arquitectura actual en el código. Al cerrar una tarea, actualiza estado, decisiones y pruebas con alcance exacto y enlaza evidencia saneada.
