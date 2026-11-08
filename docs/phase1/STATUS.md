# SHAAH PM — Fase 1, candidato local

Base: `4edd6ff2d321fa88276046625a14ee8bf974f4b1`.
Estado: dirección visual aprobada; despliegue autorizado expresamente en este chat. Publicación pendiente de verificación.

## Cambios

- Original: mayor contraste en títulos y texto secundario, bordes de tarjetas más definidos, estado seleccionado violeta y foco de teclado consistente.
- Stats móvil en Original: cifras DM Sans con números tabulares, etiquetas más claras y texto de apoyo neutro legible; colores semánticos conservados en los valores.
- Mismo orden, estructura y geometría; sin cambios de JS de aplicación, scoring, historial, auth, preferencias o sincronización.
- Hoja aislada `assets/original-refinement.css`, cargada con SRI; índice y worker offline regenerados de forma coherente.

## Verificación

- Línea base: 9 pruebas Stats, correctas antes del cambio.
- Candidato: 21 pruebas existentes de Stats, skins y Pro, correctas.
- Comparación nueva: 6 pruebas, correctas en 320/390/768/879/880/1440 px. Misma geometría de tarjetas y navegación; mismo contenido, scoring y escrituras sintéticas. Preservación de borrador. Otros skins sin cambios en estilos computados de tarjetas métricas.
- Seguridad/rendimiento/offline: 30 pruebas, correctas.
- Total del candidato: 57 pruebas correctas. No se ejecutó la suite completa.
- Navegador: Brave Chromium instalado, headless, cuenta sintética y toda conexión de aplicación interceptada. No cubre Safari/iPhone físico.
- Capturas revisadas visualmente: Stats 390 y Today 1440. Galería: `preview.html`.

## Reversión

Retirar la inclusión de original-refinement.css de source/index.html y regenerar índice/worker con el build del repositorio. El archivo nuevo se puede retirar después; no requiere reversión de datos. Mantener los archivos de cada release coherentes para el worker offline.

## Permisos y siguientes pasos

El propietario aprobó la dirección visual y autorizó expresamente publicar la fase 1. Esta autorización no cubre migraciones, datos de aplicación ni otras fases. Se publican exclusivamente el CSS aprobado, su inclusión y el worker coherente, junto con documentación y prueba. El estado publicado se verifica por contenido público. La Bitácora se registra separadamente según AGENTS.md sin tocar datos de aplicación.

Las 75 decisiones completas siguen pendientes de fuente; el candidato se apoya exclusivamente en el mandato explícito aprobado para fase 1. No se considera cerrado todo el rediseño ni se implementa migración Glow/Pro.
