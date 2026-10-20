# Corrección acotada del parpadeo de Today — ORIGINAL

Autorización explícita del usuario: «AUTORIZO QUE CORRIGAS EL ORIGINAL DE UNA VEZ».

Base comprobada el 20/10/2026: main/publicado `17c6545484c3ed676269efb66cac3a2b32aed9ed`, árbol `1c0f3bd064917a3e4c0f94c4cde30b438d161625`. Entorno: https://trypartylol-max.github.io/shaah/.

## Alcance

Solo se cambia la presentación ante avisos de sincronización: los avisos de respaldos, ecos idénticos y borrados sin efecto no reconstruyen la página. Los cambios reales siguen aplicándose, sin reiniciar la animación de entrada. Una pestaña oculta recibe los cambios y vuelve a dibujarse una vez al regresar. Se conservan las protecciones de propietario, historial, borradores pendientes y cambios sin conexión, incluida la identidad que protege frente a una lectura de borrado desfasada.

La referencia al archivo de aplicación y su integridad se actualizan en HTML. Se conserva el archivo anterior para referencias que sigan en caché. El HTML, diseño, conexión pública al backend original y SDK permanecen iguales salvo esa referencia. No se incorpora el endurecimiento exclusivo de TEST v11 ni se interviene en el HTTP409, Auth, usuarios, filas, políticas o migraciones. TEST no se publica con esta entrega.

Aplicación nueva: `assets/app.f6a3d87e0e580812.js`.
SHA-256: `f6a3d87e0e580812df87460374dfbebb2acc4e3192cfb44cfbabae04d533b77a`.
HTML SHA-256: `c8b171e731d4d4fee57ecb0df228a7377998412913c83ca8126a13e6d455c2e1`.

## Pruebas ejecutadas sobre este candidato

- 125/125 de lógica, sin fallos ni omisiones: Location Groups, Social/scoring, historial, compatibilidad, sincronización simulada y privacidad. Incluyen 10 regresiones nuevas del parpadeo.
- Las 10 regresiones nuevas fallan sobre el archivo publicado previo y pasan con esta corrección.
- 43/43 en Chromium con datos sintéticos y SDK sustituido localmente. Incluyen las tres skins, Today, borrador/foco durante avisos repetidos, actualización real sin reanimación, regreso desde segundo plano, Settings y comportamiento de Social/grupos.
- 5/5 del parpadeo en WebKit 26.5 con la misma aplicación ORIGINAL y datos sintéticos. No equivalen a Safari de un iPhone físico.
- El arnés bloquea solicitudes externas y conexiones de sincronización reales. No se usan sesiones del usuario ni se ejecutan pruebas autenticadas del backend original.

Los archivos exactos y los resultados quedan en `test-results/original-flicker/` (local, no versionado). El recibo final debe vincular el árbol probado con el commit efectivamente publicado, el resultado de Pages y las huellas de los archivos servidos.

## Recuperación y límites

Recuperación prevista: revertir únicamente el commit de esta corrección mediante un nuevo commit y publicación normal; conservar todos los datos y borradores. No restaurar bases de datos ni forzar main. Se ensaya la inversión en un índice temporal local antes de publicar.

El flujo real de notificaciones del iPhone no fue capturado. Se ha reproducido y corregido un mecanismo compatible con el fallo observado, pero queda la observación del usuario en sus dos dispositivos. Las excepciones de estilos y eventos inline del original siguen igual; esta entrega no certifica una auditoría de seguridad completa.
