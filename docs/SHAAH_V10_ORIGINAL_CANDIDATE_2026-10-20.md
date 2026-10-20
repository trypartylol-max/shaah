# SHAAH v10 — candidato autorizado para ORIGINAL

Fecha: 2026-10-20 UTC. Destino: `trypartylol-max/shaah`, GitHub Pages en https://trypartylol-max.github.io/shaah/.

El usuario confirmó que las pruebas manuales de TEST v10 salieron bien y autorizó expresamente aplicar esta versión al original. La referencia previa de ORIGINAL es `0c18af4141c7b75ce3a0e563cf3fdcf212c24ffb`, árbol `a92748a2df9961bf3d719f4e69e4c9471006ad64`.

## Contenido y adaptación

- Funcionalidad aprobada de TEST v10: fuente Sites `6b9e42d0a2a35b0aa74d125153a276ab2f104e58`, código de aplicación `0035cd718330e485e1d7f989b8accfd3059e18b1`.
- Settings en lista compacta, iconos SVG locales y paleta verde/neutra del skin Matrix.
- Limpieza voluntaria de copias locales tras cerrar la sesión del navegador; bloqueo ante cambios pendientes, errores de almacenamiento y cambios de cuenta; pausa de editores durante el cierre.
- Nuevas copias Day Log separadas por cuenta. Las copias antiguas sin propietario se conservan para recuperación, sin asignarlas automáticamente.
- El JavaScript de aplicación coincide exactamente con el del código aprobado; SHA-256 `d3ff9a1ca4b565837abb01a1e491d9504cc81b440025ec5d9f596d98bb47dc1b`, archivo `assets/app.d3ff9a1ca4b56583.js`.
- Entrega específica de Pages: aplicación y SDK 2.118.0 en archivos del mismo sitio con SRI; nombre de aplicación por contenido para evitar mezclar scripts antiguos con HTML nuevo. Se incluye la licencia MIT del SDK. No cambia ninguna dependencia ni el lockfile.
- HTML SHA-256 `cd12bc0ea5394de1ae7dd315a5696ddb0632745ef2c54a3b339e5e9a0781a83d`.
- CSP mediante meta, antes de recursos activos: scripts del mismo origen; conexiones restringidas al backend original. Se conservan las fuentes de Google ya utilizadas. No se publica configuración de QA.

Los valores de conexión pública de ORIGINAL se compararon sin imprimirlos y permanecen iguales. No se consultó el backend original ni se ejecutaron migraciones, operaciones Auth, lecturas de filas o restauraciones en Supabase.

## Verificación del candidato

- 115/115 unitarias, 30/30 de navegador y 13/13 de aislamiento de QA. Datos sintéticos y SDK/Auth simulados; todas las peticiones externas inesperadas abortadas.
- Se vuelve a comprobar Location Groups, historial, scoring, Work/Vacation, compatibilidad, Settings, skins y controles de privacidad con el empaquetado de ORIGINAL.
- 12/12 comprobaciones locales con el SDK real, sin sesión, sobre los archivos exactos y la ruta equivalente a `/shaah/`. Sin errores de ejecución/CSP/SRI ni peticiones Auth/API/WebSocket a Supabase.
- La espera del SDK del arnés se adaptó de CDN al nuevo archivo local; el verificador reconoce que el dock se oculta en la pantalla de inicio de sesión. Ninguno de esos ajustes cambia el producto.
- Los resultados GET publicados se registrarán aparte, vinculados al SHA de la publicación efectiva. Estas pruebas no son una integración autenticada del backend original.
- La confirmación manual de TEST procede del usuario y se distingue de estos registros automáticos; no se presenta como una nueva prueba autenticada realizada por el agente.

## Recuperación

Referencia conservada: commit `0c18af4141c7b75ce3a0e563cf3fdcf212c24ffb`. Tras crear el commit candidato, se ensayará la inversión del cambio en un índice Git temporal y se comprobará que reproduce exactamente el árbol anterior. No se ejecuta una reversión real.

Si aparece una regresión tras publicar: preparar una PR que revierta el commit de merge con primer padre, comprobar que restaura el artefacto anterior y publicar por Pages. No forzar `main`, borrar almacenamiento del navegador ni restaurar la base de datos. Las colas pendientes y copias de recuperación deben conservarse. El ensayo local verifica el árbol Git, no una restauración del backend ni de sesiones reales.

## Límites y trabajo posterior

- Eventos HTML y estilos inline conservan excepciones CSP; falta su refactor específico.
- La CSP meta no puede imponer `frame-ancestors`, `Permissions-Policy` ni otras cabeceras HTTP de la preview Worker. Esta publicación no afirma que GitHub Pages adquiera esas cabeceras.
- Sesiones/copias locales y datos de recuperación no tienen cifrado propio de la aplicación. La salida normal conserva copias; la limpieza explícita no elimina recuperación sin propietario.
- No se prueba la cuenta personal ni se certifican RLS, Auth, cifrado del proveedor, Safari o dispositivos físicos del ORIGINAL.
- La revisión histórica de dependencias no sustituye un nuevo análisis de avisos; no se instalaron paquetes nuevos.
- TEST sigue siendo el entorno de preparación para nuevas correcciones. La autorización de esta promoción no se extiende a cambios de base de datos ni a correcciones HTTP409 adicionales.
