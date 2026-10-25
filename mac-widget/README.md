# SHAAH Today — macOS Übersicht

Canal de distribución del widget de escritorio de SHAAH. Esta carpeta es independiente de `index.html` y de la aplicación web.

## Estado de publicación

El paquete candidato es **v0.6.2**, pero todavía no se ha publicado una versión descargable desde GitHub Pages. No anuncies una actualización hasta que un ZIP íntegro, su manifiesto y sus pruebas estén publicados y comprobados por HTTPS.

## Política acordada

- Datos SHAAH: Supabase Realtime cuando esté disponible; refresco visual cada 30 segundos; consulta de respaldo cada 90 segundos.
- Versiones del widget: comprobar como máximo una vez cada **72 horas** cuando se habilite voluntariamente la comprobación.
- **Descargas e instalaciones automáticas DESACTIVADAS**. Solo notificar nuevas versiones. Instalación después de autorización explícita.
- Mantener tokens, sesiones y configuración local fuera de GitHub; no usar claves de servicio.
- Validar hash SHA-256 y origen HTTPS antes de instalar. Conservar un respaldo.
- No confundir el estado de SHAAH web con la versión del widget.

## Para publicar una versión

1. Inspeccionar el código y ejecutar pruebas; validar que el ZIP contiene solo `SHAAH-TODAY-LIVE.widget/` y no contiene credenciales.
2. Subir `mac-widget/releases/SHAAH-TODAY-LIVE-vX.Y.Z.zip`.
3. Calcular SHA-256 del ZIP publicado.
4. Publicar **al final** `mac-widget/manifest.json` con `version`, `zip_url` absoluto HTTPS de GitHub Pages y `sha256`.
5. Verificar que ambos recursos son accesibles públicamente y que el SHA-256 coincide antes de activar comprobaciones en macOS.

URL prevista del manifiesto: https://trypartylol-max.github.io/shaah/mac-widget/manifest.json

**Aviso:** GitHub Pages debe publicar el contenido de esta ruta; hasta que se valide, el canal permanece pendiente.

## Aislamiento

No cambiar el código de SHAAH REAL, reglas de puntuación, configuración histórica, credenciales ni base de datos como parte de la publicación del widget.
