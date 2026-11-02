# Inicio sencillo de SHAAH

Implementado el 2 de noviembre de 2026 sobre `24064cde98ebbd4aa4f8dd27e9c1867334390abf`.

## Orden del producto

La demo de la conversación es una maqueta independiente. Este cambio incorpora
el recorrido a la aplicación, con sus controles, configuración, Day Log, historial
y motor de rutinas reales:

1. Inicio de sesión y lectura de la cuenta.
2. Si la cuenta está vacía y verificada, elegir un compromiso pequeño o entrar sin elegir.
3. Confirmar el perfil en el servidor antes de mostrar Today.
4. Usar Today con cero o un hábito y progreso de su plan, sin tareas ocultas.
5. Añadir hábitos, cambiar el compromiso, pedir una rutina opcional o abrir
   la vista completa cuando se quiera. El tutorial de nueve pasos queda manual.

Las cuentas existentes conservan su configuración y vista. No se convierten a
Starter por faltar un flag local, cambiar de dispositivo o no tener hábitos activos.
Las cuentas existentes con copia local conservan el acceso sin conexión.

## Contrato y protección de datos

- `DEFAULT_CFG` sigue siendo el fallback legacy. Starter tiene un perfil separado
  identificado por `starter.version=1`, con estado completed/skipped, fecha de
  inicio, token de intento y preferencia simple/full por cuenta.
- Cuenta vacía significa lectura remota exitosa con conteo exacto cero, ninguna
  fila de configuración, actividad, backup o rutina, y sin copias locales de
  configuración, historial, colas o sesiones que deban recuperarse. No se usa
  `created_at` ni el flag del tour para inferir una cuenta nueva.
- Una lectura incompleta, fallida o settings malformado nunca inicializa Starter.
  No hay guardado automático mientras la persona decide.
- Antes de confirmar se vuelve a leer. Se usa el RPC existente
  `shaah_save_settings_v1` con revisión esperada null. Solo se instala el perfil
  tras confirmar data y revisión. Un conflicto o acuse perdido se resuelve leyendo
  y adoptando el ganador completo; nunca fusionando dos planes iniciales.
- El borrador pendiente vive bajo una clave local por cuenta, se conserva ante
  fallo y no genera registros diarios. Los callbacks se aíslan por cuenta y época.
- No se agregó esquema, función SQL, permiso, dependencia, cuenta ni escritura
  real de usuario. Las pruebas usan transportes sintéticos y el SDK fijado existente.
- Límite: el RPC existente garantiza creación exclusiva de settings, pero no una
  comprobación atómica de ausencia de cualquier otra fila. Otro cliente antiguo
  podría insertar una actividad entre el último read y la creación de settings;
  esta versión nunca la sobrescribe. Un alta estrictamente atómica frente a ese
  cliente necesitaría un contrato adicional de servidor y todos sus escritores.

## Hábitos, rutinas e historial

Los cuatro objetivos se crean como hábitos custom con IDs compatibles `cxxxxx` y
metadata de plantilla. Enfoque no usa el ID monetario Work; Descanso no usa Sleep.
Todos empiezan en 10 puntos por modo y nivel 2, sin iniciar timers ni marcar checks.
Hay una era vacía anterior al alta y una era desde hoy para que no aparezcan
obligaciones retrospectivas. La expansión y edición usan `cfgEdit` fechado.

Las migraciones legacy de Core/Social/Work y junk food no corren para Starter.
No se ocultan hábitos que sigan puntuando. Los días sin máximo muestran Sin plan
y tienen grado neutral; los umbrales de los días puntuables permanecen iguales.
La fórmula de score no cambia. La comprobación antigua de identidad textual de
GRADE se sustituye por comprobaciones de sus umbrales y del caso neutral nuevo;
los demás hashes de funciones protegidas se mantienen.

Dividir en pasos es voluntario y muestra tres pasos y sus tiempos antes de añadir
la rutina. Usa el mismo ID del hábito y el runner existente, sin doble crédito.
Se conservan LIGHT/FULL, timers, cierre anticipado y sincronización de sesiones.
Los pasos se editan en Settings → Routines. Los tiempos son orientativos, no una
nueva condición de cumplimiento ni un cambio de las reglas históricas.

El importador acepta los mapas vacíos del perfil Starter y sus eras, conservando
las validaciones de imports legacy. El perfil se incluye en la exportación normal.

## Validación

- 252 comprobaciones de lógica/regresión aprobadas: alta, skip, CAS de dos
  dispositivos, respuesta perdida, fallos, cuenta cambiada, copia offline,
  export/import, fechas anteriores, borrado y expansión; también regresiones de
  score, seguridad, Day Log, configuración y sincronización de rutinas.
- 29 pruebas de navegador aprobadas: Starter, Pro, CSP, tutorial, Day Log y
  sincronización de rutinas. Matriz Starter en seis apariencias y anchos de
  320/390/879/880/1440 px. Revisadas capturas de escritorio y móvil; se corrigió
  una interferencia de grid de Pro y se añadió un mínimo de ancho legible de tarjeta.
- Tras los ajustes finales de carga offline y rechazo de lectura incompleta,
  se repitieron las 252 comprobaciones y las cinco pruebas específicas Starter.
- Recursos compilados verificados contra source y sus hashes de integridad.

Evidencia: unit-results.txt, browser-results.txt y assets-verification.json.

No se verificó iPhone/Safari físico ni un alta autenticada real contra producción.
No se ejecutó una prueba de usuarios ni se atribuyen mejoras de retención medidas.
Esta entrega se prepara para revisión; no está publicada ni se afirma que los
servidores ya sirvan este código.
