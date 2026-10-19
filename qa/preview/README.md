# Preview privada de SHAAH-TEST

URL: https://shaah-test-location-groups.arviler.chatgpt.site

Estado y resultados: [candidato final del 18 de octubre](../../docs/SHAAH_PRODUCTION_CANDIDATE_2026-10-18.md).
Solo el Site nuevo tiene autorización de publicación. No publicar ni hacer push
al repositorio GitHub original, ni conectar la preview al proyecto productivo.

Los botones QA A/B abren dos perfiles sintéticos mediante sesiones normales de
Supabase. El alojamiento conserva sus credenciales en siete secretos de runtime;
solo entrega sesiones, nunca contraseñas o claves privilegiadas. No hay OAuth
personal. La puerta privada de Sites restringe la web al propietario.

## Código y ejecución

- Fuente propia del Site: `/workspace/sites/shaah-test-preview`, repositorio
  independiente del de SHAAH. Contiene el Worker, la UI QA, la guarda previa al
  SDK, fuentes y scripts oficiales de build/validación del starter Worker ESM.
- `build-site.cjs` adapta `index.html` en memoria, fija SHAAH-TEST, elimina CDN
  de runtime e incluye los assets en un único Worker ESM. No modifica el HTML
  del producto ni toma contraseñas como entrada.
- `check-site.cjs` verifica rutas/CSP/aislamiento de secretos con Auth simulado.
- `check-deployed.cjs` comprueba la URL real, acceso privado, Auth, cambio A/B,
  configuración confirmada, móvil y bloqueo a producción. Recibe por stdin oculto
  un token de servicio ya existente del propio Site; jamás lo envía a Supabase.
  No guardar ese token en un archivo ni pasarlo como argumento.
- `site-source-workflow.cjs` implementa el contrato documentado de Sites porque
  los helpers incluidos en la skill no estaban instalados. Solo admite el Site
  separado, verifica el remoto y recibe su credencial Git efímera por stdin.
  Build, push, save de SHA exacto y deploy privado son pasos explícitos.
- El SDK real se sirve localmente para QA. El puente WSS del ejecutor conserva
  validación TLS/proxy y frames de Supabase reales; no forma parte del Site.

```bash
node --use-env-proxy qa/preview/build-site.cjs
bash /workspace/sites/shaah-test-preview/scripts/build.sh
node /workspace/sites/shaah-test-preview/scripts/validate-artifact.mjs
node qa/preview/check-site.cjs
```

Los comandos anteriores se ejecutan desde la raíz de SHAAH; el script build del
Site resuelve su propia raíz. No volver a publicar
sin respetar el mismo proyecto, audiencia privada, fuente y archivo guardados.

## Operaciones de una sola vez

`provisioner.template.ts` es una plantilla sin secretos del provisionador ya
cerrado. Su despliegue activo en Supabase QA es ahora una respuesta 410, sin
API administrativa. No volver a desplegar la plantilla para mantener la demo.

`reset-synthetic.cjs` y `seed-demo.cjs` se usaron únicamente antes de la primera
publicación, con manifiesto y marcador de origen sintético comprobados. **No
volver a ejecutarlos contra A/B publicados:** pueden contener cambios manuales
del usuario. `--preview-unpublished` no es una autorización para borrar ni una
comprobación remota de publicación. Para una futura batería completa, crear
otros usuarios sintéticos mediante Auth Admin API soportada y secretos seguros.

No hay comandos automáticos de limpieza, deploy o push en `npm test`.
