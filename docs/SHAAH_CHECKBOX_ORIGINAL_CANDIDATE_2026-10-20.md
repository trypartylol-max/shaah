# Checkboxes sin reconstruir la pantalla — ORIGINAL

Autorización del usuario: «Publicalo en ambos. Original y test».
Base original vigente comprobada: `98bb350ceea4596238eeda5467018895394f2c1a`.
Entorno: https://trypartylol-max.github.io/shaah/.

Al marcar un hábito, la aplicación reconstruía Today y reiniciaba su animación de entrada, aunque el guardado ya era asíncrono. El cambio actualiza únicamente los nodos y atributos modificados en Today, Social y el editor de días, conservando los elementos de pantalla, el anillo, los campos con borradores, el foco y el desplazamiento. Se normalizan los iconos y la paleta antes de comparar el contenido para mantener los tres skins. La navegación conserva su renderizado previo.

No cambian las funciones de guardado, el período de espera existente de 250 ms, las colas de reintento, los datos, las puntuaciones ni las reglas de cuenta. Se conserva el arreglo anterior contra ecos de sincronización. La conexión pública al backend original, SDK, estilos y política de scripts se mantienen iguales. No se promueve el endurecimiento exclusivo de TEST. No hay operaciones sobre Supabase/Auth, usuarios, filas, políticas, migraciones o HTTP409.

## Evidencia del candidato

- Archivo nuevo: `assets/app.0f9ed4b9e08df802.js`.
- Aplicación SHA-256: `0f9ed4b9e08df8020f7d614f6c3fdb650c5d027b81de721ad713fcbfe308c609`.
- HTML SHA-256: `bb49faab7eb080ce5c32856c55594d9dc05d2a044bcf5fcbf137b9f3860cc436`.
- 125/125 pruebas de lógica, 53/53 en Chromium (43 existentes y 10 nuevas) y 15/15 en WebKit (10 nuevas y 5 de sincronización): 193 pruebas locales, sin fallos ni omisiones, con datos sintéticos y SDK simulado.
- Las 10 pruebas nuevas fallan sobre la versión previa. En el candidato comprueban respuesta inmediata con guardado retenido, tres skins en móvil/escritorio, conservación del anillo/foco/borradores, cambios rápidos de media puntuación/completo/vacío, un fallo de red y recuperación desde la cola, Social y edición histórica.
- Los registros se conservan en `test-results/checkbox-feedback/` del checkout local y no se publican con la aplicación.

Se conserva el archivo anterior para HTML que siga en caché. La recuperación consiste en revertir únicamente esta corrección mediante un nuevo commit y publicación, sin restaurar datos ni forzar ramas. El recibo final debe vincular este candidato al árbol y los archivos efectivamente publicados.

Las pruebas usan conexiones simuladas. No equivalen a sincronización autenticada del backend original ni a una prueba con un iPhone físico. Las verificaciones finales con el SDK real deben permanecer sin sesión, limitadas a archivos públicos y con todo acceso a Supabase bloqueado. La publicación separada de TEST conserva su conexión exclusiva a SHAAH-TEST y sus protecciones propias.
