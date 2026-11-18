# Asociación de dominio — preparación y publicación

Estado actual: publicada y verificada con Google tras autorización explícita posterior
del propietario. La sección de preparación siguiente conserva el contexto previo;
ver el resultado de publicación al final.

2026-11-18. El propietario informa que instaló la APK, abre SHAAH e inicia sesión
con Google; aparece barra del navegador. Es evidencia reportada por el usuario,
no una prueba automatizada. No constan modelo, versión de Android ni Chrome.

Se verificó de nuevo la firma de la APK entregada mediante apksigner.
`site-root/.well-known/assetlinks.json` usa su package y certificado DEBUG reales.
`site-root/.nojekyll` evita que Pages excluya la carpeta con punto.
No contiene claves privadas, datos de cuenta ni autorización de orígenes externos.
No habilita una firma de release o Google Play: esas firmas se incorporarán por separado.

## Comprobaciones de solo lectura

- `https://trypartylol-max.github.io/.well-known/assetlinks.json`: HTTP 404.
- API pública del repo `trypartylol-max/trypartylol-max.github.io`: HTTP 404.
- El conector tampoco pudo encontrarlo: no puede afirmarse si no existe o es privado/no accesible.
- La firma APK coincide con la asociación preparada; no se modificó ni recompiló la APK.

## Acción pendiente de autorización

1. Confirmar acceso/existencia del repositorio de usuario `trypartylol-max.github.io`.
   Si no existe, crear ese repositorio separado. Si existe y no es accesible,
   obtener acceso y leer sus reglas antes de modificarlo; conservar su contenido.
2. Incorporar **solo** los dos archivos de `site-root/` en la raíz de ese repositorio.
   Si ya hay asociaciones, añadir la declaración a su array sin borrar otras apps.
3. Configurar GitHub Pages para servir la raíz de ese repositorio, sin dominio custom
   ni modificación de la configuración del proyecto SHAAH. No tocar main de shaah.
4. Verificar el endpoint HTTPS exacto: HTTP 200 sin redirección, Content-Type JSON,
   package y huella correctos. Revisar que `/shaah/` continúa sirviendo sin cambios.
5. Verificar DAL y volver a abrir la APK desde su icono. Chrome puede conservar el
   resultado de verificación anterior: esperar/reintentar antes de dar por fallida la asociación.
   No borrar datos del navegador ni desinstalar como primer intento.
6. Pedir al propietario que confirme ausencia de barra en /shaah/ y retorno de Google.
   Los orígenes externos pueden seguir mostrando controles del navegador.

No prometer desaparición de la barra hasta comprobarla en el dispositivo.
Si no se controla la raíz del dominio, mantener Custom Tabs mientras se acuerda
una alternativa de hosting/dominio. No cambiar host de la APK silenciosamente.

No se creó repositorio remoto, no se activó Pages y no se escribió en Supabase.
La prohibición de publicación original sigue vigente hasta autorización explícita.

Referencia: https://developers.google.com/digital-asset-links/v1/getting-started

## Publicación autorizada y verificada — 2026-11-18

El propietario autorizó crear el repositorio público raíz y publicar la verificación,
y confirmó la visibilidad pública después de la explicación de sus implicaciones.
Se creó `trypartylol-max/trypartylol-max.github.io` desde GitHub con solo:

- `.well-known/assetlinks.json`: asociación del certificado DEBUG de la APK instalada.
- `.nojekyll`: archivo marcador con texto `static`, cuyo contenido no afecta a su función.

GitHub activó automáticamente Pages para el repositorio de usuario; no fue necesario
cambiar la configuración manualmente. Se comprobaron dos ejecuciones de
`pages build and deployment`, ambas completadas con resultado success.

Validaciones de publicación:

- `https://trypartylol-max.github.io/.well-known/assetlinks.json`: HTTP 200,
  Content-Type application/json, sin cabecera de redirección.
- JSON publicado coincide semánticamente con la asociación local validada contra la APK.
- API oficial `https://digitalassetlinks.googleapis.com/v1/assetlinks:check`:
  `linked: true` para el origen, relation, package y certificado de esta APK.
- `/shaah/` y `/shaah/sw.js`: bytes idénticos antes y después de activar el sitio raíz.

No se subió ni fusionó la rama Android en shaah. No se modificó main de shaah,
ni Supabase, ni autenticación, Push, badge o datos. Bitácora pendiente porque
la prohibición de escribir en Supabase sigue vigente.

Pendiente de comprobación por el propietario: cerrar la app Android y volver a abrirla
desde su icono para confirmar que desaparece la barra dentro de /shaah/.
Chrome puede conservar una verificación anterior; esperar y reabrir antes de borrar
datos o reinstalar. Esta asociación valida únicamente la firma debug entregada;
una futura APK/AAB con otra firma necesitará su asociación correspondiente.
