# SHAAH

Al terminar una entrega significativa autorizada de SHAAH, registra su resumen en la Bitácora siguiendo `docs/bitacora.md`. Usa el conector Supabase ya autorizado; conserva las ediciones humanas y no crees tareas periódicas. Si no tienes acceso al conector, informa que el registro quedó pendiente. Nunca declares publicada una entrega sin verificar su despliegue.

## Reglas para cualquier agente (ChatGPT, Codex, Claude)

- **Autoría de los commits.** Usa siempre `287832666+trypartylol-max@users.noreply.github.com` como email de autor y de committer (`git config user.email ...` antes del primer commit). GitHub rechaza con `GH007` cualquier push que lleve el email personal del propietario. No escribas ese email personal en código, docs, logs ni mensajes de commit.
- **Lee `CLAUDE.md` antes de tocar nada.** Aunque el nombre diga Claude, es la guía de trabajo del repo para todos los agentes: qué se edita, cómo se construye y cómo se publica.
- **Todo el CSS vive en `source/app.css`.** No crees hojas de estilo nuevas en `assets/`. Las antiguas hojas sueltas son secciones al final de ese archivo y su orden importa.
- **Se edita solo `source/` y después se reconstruye** con `python3 scripts/build-production.py`. No edites a mano `index.html` de la raíz, `sw.js` ni `assets/app.<hash>.*`.
- **Antes de publicar un cambio visual o de comportamiento**, corre `npm run test:unit` y los tests de navegador de la zona que tocaste (`tests/*browser.test.cjs`), y actualiza los tests si el diseño cambió a propósito. Si creas una migración `*Once`, añade su marca de versión al fixture de `tests/helpers.cjs`.
- **No publiques sin el OK del propietario** ("publica") salvo cambios sin efecto visible (docs, tests, limpieza).
