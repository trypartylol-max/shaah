# SHAAH — matriz de pruebas

Actualizada 22/10/2026. Catálogo para futuras tareas; no afirma ejecución hoy. Los resultados históricos solo valen para el SHA/entorno del informe enlazado. No ejecutar baterías remotas que creen o modifiquen datos por una tarea documental.

## Comprobaciones realizadas en esta tarea

| Caso | Resultado | Alcance |
|---|---|---|
| Identidad del repo | PASS | `main` base `18ab112808550bd8abdf6ee6ddae25d0ab6371aa`. |
| Paridad de archivos ORIGINAL | PASS | HTML + 4 recursos JS/CSS, GET 200, bytes iguales; [evidencia](evidence/workflow-2026-10-22.json). Sin sesión. |
| Existencia de TEST | PASS | Listado Supabase: SHAAH-TEST activo; metadatos Sites v15 y deployment succeeded. No prueba funcional. |
| Pruebas de producto / auditoría nueva | NO EJECUTADAS | No se cambió código ni se instalaron dependencias. |

## Cobertura requerida para cambios de producto

| Área | Escenarios mínimos | Referencias disponibles | Estado sobre HEAD en esta tarea |
|---|---|---|---|
| Historia y modos | 07/09 Work; 08,15,16,17,18/09 Vacation; era Work posterior legítima; Today no cambia historia; auto-resume; eras futuras ordenadas | Master Handoff §§36–37; `tests/social-regression.test.cjs`, fixtures de Location | No ejecutado; comprobar cobertura exacta antes de afirmar paridad |
| Scoring | puntos brutos, máximo, porcentaje normalizado, grade; booleanos/fracciones; máximo cero; Work/Vacation | `tests/social-regression.test.cjs`, `tests/location-regression.test.cjs` | No ejecutado |
| Social / Location | varios lugares, filtro separado de pertenencia, pausa conserva historial, grupos y configuración histórica | `tests/location-*.test.cjs`, `tests/social-*.test.cjs` | No ejecutado; prototipos separados del producto |
| Persistencia | refresh; offline/reconexión; edición durante carga/flush; cambio A→B; realtime; conflictos HTTP409/40001 | `tests/sync-*.test.cjs`, `tests/http409-regression.test.cjs`, `tests/session-isolation-*.test.cjs` | No ejecutado |
| Day Log | primera actividad; edición/borrado; sleep; hábitos/rutinas; día histórico; eventos ligados; import/export `_daylog` | Master Handoff §38; revisar casos existentes y completar huecos | No ejecutado |
| Seguridad cliente | escape de entradas; imports; CSP/SRI; aislamiento de sesión/almacenamiento; fallos de storage | `tests/security-*.test.cjs`, `tests/csp-*.test.cjs`, `tests/privacy-*.test.cjs` | No ejecutado; no equivale a auditoría integral |
| UI | Today, Social, Settings, skins; desktop/móvil; 879/880 px; contenido largo; foco; parpadeo | `tests/*browser.test.cjs`, Master Handoff §39 | No ejecutado; emulación no equivale a dispositivo físico |
| Backend autenticado TEST | Auth/JWT reales A/B, RLS, ownership, settings concurrentes, Realtime y colas | `qa/supabase/README.md`, informe candidato 18/10 | Resultados históricos sobre otro SHA; no repetidos |
| Migración/recuperación TEST | preflight, baseline, backup íntegro, corrupción detectada, restauración como revisión nueva, compatibilidad legacy | `qa/migration/README.md`, informe candidato 18/10 | Resultados históricos; no repetir ni aplicar en ORIGINAL por defecto |
| Dispositivo real | Safari/iPhone, login Google, teclado/zoom, offline, dos dispositivos | Validación manual con el propietario | Pendiente de evidencia actual |

## Cómo registrar una ejecución

Guardar fecha, entorno/ref, commit completo, hashes, comando o pasos, tipo (local simulado / SQL con claims / Auth real / preview / dispositivo), resultado por caso y enlace a evidencia saneada. Incluir fallos y omisiones. No publicar claves, sesiones, datos personales ni respaldos.

Comandos declarados en `package.json`: `npm test`, `npm run test:unit`, `npm run test:browser`, `npm run test:locations`, `npm run test:sync:safety`. Inspeccionar sus prerrequisitos antes de ejecutar. Los comandos `test:sync` y scripts de migración pueden escribir remotamente: no ejecutarlos por rutina ni contra ORIGINAL. Un PASS local no demuestra integración autenticada.

Para publicar: candidato exacto, pruebas pertinentes, límites, recuperación y autorización específica. No sumar conteos de builds distintos ni usar «FINAL» como evidencia.
