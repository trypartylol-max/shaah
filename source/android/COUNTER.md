# Contador de hábitos pendientes — preparado, sin publicar

2026-11-18. APK 0.2.0 (2), misma identidad y certificado debug que la APK instalada.
La rama Android incorpora main hasta `a3c418d`, sin modificar main remoto.

El propietario confirmó en un Redmi Note 14 4G: arranque sin barra, Google y Web Push
funcionan; el badge web no aparece. Pidió un contador de hábitos pendientes, aceptando
una notificación visible. Esta implementación aún requiere prueba física en ese Redmi.

## Comportamiento preparado

- SHAAH usa el cálculo existente `badgePending()`: hábitos con puntos activos de L1–L3
  todavía sin marcar. Una marca light cuenta como atendida, como ya ocurría en el badge web.
- Opt-in por dispositivo y cuenta mediante el ajuste existente. No se duplica configuración.
- El contador viaja al host Android mediante un MessagePort del navegador, validado
  por Digital Asset Links. Se envían solo número agregado, activación, idioma y caducidad.
  No viajan tokens, identificadores de usuario, nombres de hábitos, puntuaciones ni historial.
- Android muestra una notificación silenciosa con el número explícito y llama a setNumber
  para que launchers compatibles puedan mostrarlo en el icono. Canal de prioridad baja,
  showBadge activado al crearlo, sin sobrescribir ajustes hechos por el usuario.
- Al completar todos, desactivar o salir/cambiar de cuenta, se limpia solo esta notificación;
  el recordatorio diario usa otro identificador y permanece independiente.
- Actualiza al usar SHAAH. Se conserva el último dato al cerrar y la notificación caduca
  a la siguiente medianoche local; no se calcula un nuevo día hasta reabrir.
- No hay servicio de primer plano, polling del backend, FCM adicional ni nuevos cron.
  Si Android termina la conexión con el navegador, hará falta reabrir para resincronizar.
- El texto de Ajustes informa de la notificación visible y del límite del launcher.

## Archivos y activación pendiente

`native/` es la fuente del host personalizado; el generador la copia a `project/` y añade
PostMessageService y la consulta del proveedor de navegador al manifest.
El launcher valida exclusivamente el origen esperado y conserva la query/fragment de
OAuth solo en `/shaah/` e `/shaah/index.html`. No admite URL de lanzamiento externa.
El receptor valida tipo, booleano, enteros, límites, caducidad y tamaño del mensaje.

La APK NO puede recibir pendientes del sitio actual hasta completar dos pasos autorizados:

1. Publicar el cambio web revisado en `source/app.js` y su build generado. Actualizar la
   rama sobre el main vigente justo antes de publicar, conservando cambios paralelos.
2. Añadir `delegate_permission/common.use_as_origin` a la asociación del sitio raíz,
   conservando `handle_all_urls`. Candidato: `domain-verification/assetlinks-counter-candidate.json`.
   La asociación publicada existente no se modificó en esta fase.

La segunda relación permite al host Android participar en mensajería como ese origen;
es un permiso adicional concreto, no una simple actualización del certificado.
No publicar ninguno de esos pasos sin el OK del propietario.

## Validación realizada

- 318 regresiones unitarias existentes aprobadas.
- 3 pruebas nuevas del protocolo web aprobadas: rechazo de origen/ruta/mensaje ajenos,
  opt-in y payload mínimo, limpieza al completar/desactivar/cerrar sesión/cargar otra cuenta.
- Prueba Java de límites/caducidad aprobada (fracciones, NaN, infinitos y valores fuera de rango).
- 6 pruebas de navegador aprobadas: contador con MessageChannel simulado, 3 Push y 2 offline.
  El fallo offline anterior quedó resuelto por la actualización de los propios tests en main;
  no se cambió la implementación offline en esta rama.
- `assembleDebug` y `lintDebug`: aprobados. Revisar las advertencias del informe antes de release.
- APK: firma verificada, misma huella debug; min Android 7 / target API 36.

Artefacto: `../SHAAH-Android-contador-prueba-0.2.0.apk`.
SHA-256: `9b392d744e6b00d59b6eae43d00ed3ffb04f4f3dc8dbf2f71b04d6c7b9bbf796`.
Lint terminó sin errores y con 19 advertencias: servicio PostMessage exportado según
el protocolo oficial y recursos/iconos del proyecto generado. No se suprimieron advertencias.

Todavía NO validado: canal real Chrome–Android, contador en launcher HyperOS, reconexión tras
proceso terminado, permisos nativos en instalación nueva, Google y Push con el nuevo launcher.
La prueba de navegador simula el canal; no sustituye esas pruebas físicas.

## Prueba física después de publicar y verificar la asociación

Instalar como actualización, sin desinstalar. Abrir y comprobar Google/retorno sin barra;
activar el ajuste, comparar número de notificación con pendientes, marcar uno y comprobar
decremento. Completar todos debe quitarlo. Desactivar y cerrar sesión deben limpiar el contador.
Comprobar recordatorio diario por separado, sin confundirlo con el canal del contador.
Cerrar/reabrir, cambiar de día y cambiar de cuenta. Revisar icono y notificación por separado.
La cifra en la notificación es el resultado controlable; la cifra en el icono sigue dependiendo
del launcher y de sus ajustes y no se puede declarar resuelta antes de probar el Redmi.

Referencias:
- https://developer.chrome.com/docs/android/post-message-twa
- https://developer.android.com/develop/ui/views/notifications/badges

No se publicó la web ni la asociación ampliada, no se subió la rama ni se tocó Supabase.
Bitácora pendiente: sigue vigente la prohibición de escribir en Supabase.
