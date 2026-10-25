# Publicación pendiente: SHAAH Today 0.6.3

El repositorio **aún no aloja** la versión binaria descargable. No se publica `manifest.json` estable hasta verificar la URL final.

## Archivo candidato

- Nombre: `SHAAH-TODAY-v0.6.3-RELEASE.zip`
- SHA-256 esperado: `235021a13f411659bc659d1b0f68714ea688962673804077d35d159d396edb11`
- Destino GitHub: `mac-widget/releases/SHAAH-TODAY-v0.6.3-RELEASE.zip`
- URL pública prevista: `https://trypartylol-max.github.io/shaah/mac-widget/releases/SHAAH-TODAY-v0.6.3-RELEASE.zip`

## Publicación segura

1. Subir el ZIP sin cambiar su contenido a la ruta indicada en la rama publicada por GitHub Pages.
2. Descargarlo **desde la URL pública** y recalcular SHA-256 (no basta con comparar el archivo local).
3. Comprobar que GitHub Pages sirve `mac-widget/`. Si Pages no sirve esa ruta, definir un alojamiento HTTPS estable y corregir la configuración del widget.
4. Solo después publicar `mac-widget/manifest.json` en la ruta prevista con esta estructura:

```json
{
  "version": "0.6.3",
  "zip_url": "https://trypartylol-max.github.io/shaah/mac-widget/releases/SHAAH-TODAY-v0.6.3-RELEASE.zip",
  "sha256": "235021a13f411659bc659d1b0f68714ea688962673804077d35d159d396edb11"
}
```

5. Verificar versión, ZIP, SHA-256 y macOS antes de recomendar habilitar la comprobación.
6. Comprobación cada 72 horas **solo tras opt-in**; notificación exclusivamente. Nunca activar descarga o instalación automática.

## Precauciones

- No subir `config.json`, sesiones, claves privadas ni archivos locales de autenticación.
- No tocar `index.html`, tablas Supabase ni lógica de scoring de SHAAH REAL.
- El candidato todavía necesita pruebas de OAuth, sincronización en vivo y cálculo de score en macOS.
- El SHA-256 garantiza integridad respecto al manifiesto, pero no autenticidad frente a una modificación conjunta del manifiesto y ZIP. Evaluar firma digital independiente antes de implementar actualizaciones de código desatendidas.
