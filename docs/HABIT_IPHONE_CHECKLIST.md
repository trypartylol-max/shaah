# Prueba pendiente en iPhone físico

La copia local de prueba usa la candidata integrada con `main` 6529de6. Tiene datos ficticios, fecha fija **16 de octubre de 2026** y un aviso amarillo. No es la publicación actual de SHAAH-TEST. No contiene sesiones ni datos reales; guarda únicamente en el navegador y bloquea conexiones a Supabase con `connect-src 'none'`.

Su arranque, cambio de nivel, recarga y conservación del historial ya se verificaron en Chrome sin inyectar el adaptador desde Playwright: la copia lleva su propio adaptador ficticio. La comprobación registró cero peticiones externas y cero errores. Eso no sustituye la prueba física.

Corrección durante la primera prueba manual: el reloj del adaptador estaba completamente congelado, por lo que la protección de la app contra dobles toques cancelaba los siguientes toques. Se reprodujo con eventos táctiles y se corrigió únicamente el adaptador: mantiene la fecha ficticia pero el tiempo transcurrido avanza. Los toques repetidos de Settings, el cambio de nivel, la recarga y la conservación del historial pasan en Chromium y WebKit. Recargar la copia antes de continuar. La candidata de la app y su hash no cambiaron; la prueba física sigue pendiente.

## Preparación desde el Mac

Desde la carpeta del repositorio, ejecutar:

```sh
/Users/ded1/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node qa/phone-preview.cjs --serve --lan
```

Este comando prepara una copia en `.runtime/phone-preview/` y abre el puerto local 4187. Solo hacerlo al comenzar la prueba. Conectar Mac e iPhone a la misma red y abrir en Safari `http://DIRECCION-LOCAL-DEL-MAC:4187/`, sustituyendo el texto por la dirección Wi-Fi del Mac. `127.0.0.1` en el iPhone apuntaría al propio teléfono. Usar una pestaña privada dedicada y cerrar el servidor con Ctrl+C al terminar. No abrir puertos del router ni publicar esta copia.

El servidor todavía **no está abierto a la red local**: solo se ejecutó su comprobación automática en loopback. Puede que macOS solicite permitir conexiones entrantes al empezar la prueba física.

## Comprobaciones

1. Confirmar el aviso amarillo de datos ficticios. Anotar modelo de iPhone, versión de iOS y si se usa Safari o acceso desde pantalla de inicio.
2. Abrir Settings → hábitos. Cambiar Meditate de nivel 2 a 3 con el selector nativo. Cerrar y volver a abrir Settings; recargar Safari. Debe seguir en nivel 3 y no aparecer duplicado.
3. Cambiarlo a nivel 1 y de nuevo a 2. Revisar los días históricos antes y después: sus registros y resultados deben mantenerse.
4. Escribir en un campo de texto. Comprobar teclado, foco, selección, cierre del teclado y acceso a los botones. Registrar si hay zoom automático indeseado o controles tapados.
5. En Today, plegar y desplegar Core Routines y Social Combo. Debe ocultarse el contenido y seguir funcionando después de cambiar de pestaña.
6. Probar los temas Classic, Aurora, Glow, Matrix y Minimal; tocar WORK una vez debe avanzar exactamente un hito. Al completar todos se debe ver el efecto de finalización, y al siguiente toque debe reiniciarse. No deben cambiar los registros históricos.
7. Revisar vertical y horizontal, navegación inferior, zonas seguras y desbordamiento lateral. Repetir con movimiento reducido activado si está disponible, sin exigir animación en ese modo.
8. Recargar una última vez y confirmar que los cambios ficticios se conservan. Cerrar la pestaña privada y el servidor.

## Registro de resultado

- Modelo / iOS / modo de apertura: **iPhone 17, iOS 27, Safari**, confirmado por el usuario el 28 de octubre de 2026.
- Selector: mover el hábito al nivel 3 funciona.
- Persistencia tras recarga: el usuario confirma que permanece en nivel 3.
- Teclado y controles: el usuario confirma que todo responde bien tras pedirle escribir y revisar que el teclado no tape los controles.
- Plegado: el usuario confirma buen funcionamiento tras pedirle plegar/desplegar hábitos varias veces.
- Orientación: el usuario confirma buen funcionamiento tras pedirle girar y revisar desbordamiento lateral.
- Historial, cinco temas, ciclo de WORK, zonas seguras y movimiento reducido: no se confirmaron por separado en el dispositivo; el historial, temas y WORK tienen evidencia automática independiente.
- Incidencia inicial: reloj congelado de la copia ficticia; corregido en `f52c8b1`, con reproducción antes y comprobaciones táctiles después. La app candidata no cambió.
- Evidencia: mensajes del usuario en este chat; sin grabación ni automatización del dispositivo. Resultado estructurado en `qa-habits-2026-10-28/release-candidate/iphone-user-result.json`.
- Resultado: **APROBADA LA COMPROBACIÓN FÍSICA SOLICITADA**, dentro del alcance confirmado. Servidor local cerrado y cierre verificado.

Esta copia no prueba la red real ni el inicio de sesión con Google. La persistencia real, conflictos y aislamiento se probaron por separado en SHAAH-TEST; la configuración de retorno de Google de producción se inspeccionó en lectura. No se ha ejecutado un nuevo inicio de sesión interactivo de Google ni se ha revisado su consola de Google Cloud. Ninguna de estas instrucciones autoriza un despliegue.
