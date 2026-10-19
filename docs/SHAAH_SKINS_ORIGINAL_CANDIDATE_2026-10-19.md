# SHAAH original: skins y correcciones defensivas

19 de octubre de 2026. Rama local: `feature/skins-original-2026-10-19`.
El responsable implementó y coordinó ambos trabajos desde este chat; el usuario
no tiene que trasladar archivos ni abrir conversaciones nuevas.

## Identidad

- Base del original: `ef6922a0058a148c912dd0903a7f5486c160f870`.
- HTML publicado de esa base: `be6723e60ee4d189ade645caa4b1a5ff210390f5a7631a69f99f0ec978c3b334`.
- HTML de este candidato: `a6b4901715eb1ad5a33bc0d582fdaae80a037c60bdd16c424829d32342c8e676`.
- Evidencia: `SHAAH_SKINS_SECURITY_VERIFICATION_2026-10-19.json`.

Este documento describe código candidato, no un recibo de despliegue. Original,
TEST v5 y este candidato son versiones distintas. No se atribuyen estas pruebas
a otro HTML o SHA.

## Funcionalidad

Settings → APPEARANCE · SKINS ofrece Original, Matrix y Bajo estímulo. La elección
se conserva en `shaah:skin:v1` del navegador y se propaga entre pestañas del mismo
origen. No modifica CFG, cuenta, contactos, puntos o historial; no requiere SQL.
Matrix usa negro/verde, monoespaciado y decoración estática. Bajo estímulo usa
grises y colores discretos para resultados, sin brillos ni movimiento. Se respeta
movimiento reducido; los siete grados conservan cifras, letras, colores distintos
y contraste comprobado de al menos 4,5:1 frente al fondo.

## Correcciones integradas

- Errores OAuth/arranque y correo mostrado se escapan como texto. Se decodifica
  la URL una sola vez; porcentajes incompletos no bloquean el login.
- Los 87 argumentos dinámicos de cadenas en eventos HTML usan literales JS
  codificados para ese contexto. Los atributos de relojes/opciones y textos de
  rutinas/Day Log se escapan. No se renombran IDs ni sus referencias históricas.
- El JSON completo se valida antes de confirmar, respaldar, mutar o guardar:
  contactos, configuración, épocas, grupos, rutinas y días. Se rechazan tipos
  incorrectos, claves de prototipo, referencias de rutina ausentes y estructuras
  excesivas. Límites: archivo 10 MB, árbol 100.000 nodos/40 niveles. Un rechazo
  informa que nada cambió. El importador conserva ubicaciones, Inactive y los
  días existentes; incluye Day Log de días nuevos. Exportaciones antiguas sin
  épocas o puntos por modo siguen siendo importables.
- Las rutinas se normalizan para la vista sin reescribir CFG ni renumerar pasos.
  Color hexadecimal válido, duración numérica acotada, rutinas mal formadas
  omitidas de los controles. Alpha hexadecimal se convierte a base RGB porque
  las vistas componen sus propios sufijos de transparencia. Si desaparece una
  definición activa, se retiran sus controles y se conserva su sesión recuperable.
- Se corrigió el layout del modal Day Log: Guardar podía quedar detrás del nav.
  Ahora tiene capa modal y colores de skins.
- SDK fijado a 2.118.0 con URL de archivo estático, SRI SHA-384 y CORS anónimo;
  bytes verificados contra el paquete instalado. Meta Referrer-Policy añadida.
  El guard QA reconoce la etiqueta nueva y la sustituye por el SDK local.

Las constantes del original y Google OAuth se conservan. El cliente publicable
no incluye el proyecto TEST, Worker, login QA, identidades sintéticas ni secretos.
No cambian dependencias, esquema, migraciones o configuración de Auth.

## Verificación

`npm test`: **150/150 aprobadas**, cero fallos, cancelaciones, omisiones o TODO; duración 62.24 segundos. Incluye 23 casos defensivos nuevos frente al candidato anterior de 127. `npm audit`: cero vulnerabilidades conocidas; lockfile sin cambios.

Chromium y VM usan datos sintéticos y recursos externos interceptados. Cobertura:
escritorio/móvil, todas las pestañas, foco/persistencia, asignación individual y
masiva, varias ubicaciones, Active/Inactive/Unassigned, WHO TO SEE, historial,
Social Scoring, Work/Vacation y bloqueo HTTP/WebSocket de producción. Los casos
defensivos usan texto/puntuación ordinarios. No hay una integración autenticada
nueva sobre este candidato; no se usó la cuenta personal ni Supabase real.

## Publicación y recuperación

La entrega de código se realiza en rama/PR separado; no modifica main ni publica
el original. Para publicar falta la autorización final que nombre original y
main/Pages. Revisar el diff y SHA aprobados, ejecutar la suite sobre ese código,
autorizar el cambio y comprobar después por GET el HTML/arranque publicados.
No se requieren migraciones. HTTP409 sigue rechazado y no se reintentó.

Si fuera necesario recuperar el cliente, revertir el commit mediante un cambio
nuevo revisado; conservar datos y sincronización. No restaurar Supabase para un
cambio visual. Volver a la base también reabriría los hallazgos antiguos: valorar
una corrección hacia adelante. Cambiar el skin a Original no toca CFG.

La publicación frontend no certifica el backend original, cifrado físico o
seguridad completa. Las limitaciones están en el informe de auditoría adjunto.
