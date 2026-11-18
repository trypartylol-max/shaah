# Corrección del canal del contador Android

Chrome entrega el MessagePort con datos vacíos y un origen android-app exacto,
y después envía el handshake por el propio puerto. El receptor anterior esperaba
el handshake en el mensaje window con origen HTTPS, y rechazaba la conexión.

Se aceptan la identidad nativa exacta únicamente en el sitio HTTPS asociado y la
forma del mismo origen anterior por compatibilidad. Se espera el handshake antes
de transmitir pendientes; se ignoran mensajes de puertos sustituidos.
No cambia el cálculo de pendientes, las preferencias, login ni el recordatorio diario.
Compatible con el protocolo v1 de las APK existentes; no requiere otra asociación DAL.

Validación preparada: 324 pruebas unitarias, 2 pruebas de navegador del contador y
3 del Push diario, todas aprobadas. Chrome en emulador confirmó el origen nativo,
el puerto vacío y el handshake; con el receptor corregido y un agregado sintético 7,
Android publicó una notificación number=7. Sin cuenta ni datos reales.
La APK 0.2.2 añade por separado diagnóstico y recuperación del permiso nativo.
El número del icono físico HyperOS sigue pendiente de confirmar en el Redmi.

Autorización del propietario: «publica», limitada a esta corrección web.
La publicación debe verificarse comparando los archivos del build con el sitio vivo.
No se modifican Supabase ni sus datos; Bitácora remota pendiente por esa prohibición.
