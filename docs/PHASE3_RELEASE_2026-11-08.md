# SHAAH — Fase 3 aprobada

Base: e72a2d3106c00edafdf39f24f9f9e96ad6f5d100. El propietario autorizó el despliegue de este candidato.

Settings añade Vista previa a los cuatro skins. Se puede recorrer la aplicación antes de Aplicar o Cancelar. La vista previa no guarda la selección; Cancelar recupera el aspecto anterior. Aplicar guarda únicamente la preferencia local del navegador. Si falla el guardado, conserva la vista previa con un mensaje y permite reintentar o cancelar. Una selección guardada por otra pestaña prevalece sobre la vista previa antigua.

La migración persistente de Glow a Aurora guarda primero el valor anterior en shaah:skin:migration:v1 y después actualiza shaah:skin:v1. Es idempotente. Si no puede conservar el respaldo, el guardado está bloqueado o el respaldo existente es desconocido, mantiene Glow almacenado y muestra Aurora durante la sesión. Una relectura evita sobrescribir una elección más reciente detectada durante el respaldo. Pro mantiene su ubicación provisional.

No hay cambios de algoritmos de puntuación, historial, autenticación, API, esquemas ni sincronización de datos de aplicación. Las preferencias se migran localmente cuando el dispositivo carga la nueva versión; no se recorren ni modifican cuentas desde el despliegue.

## Validación

63 pruebas correctas: 33 de navegador y 30 locales. Incluyen la fase 2, migración/backup/idempotencia, almacenamiento bloqueado, respaldo desconocido, elección más reciente, Aplicar/Cancelar, borradores, foco, otra pestaña y reintento de guardado; skins, Pro, Aurora transparente, seguridad, offline y regresiones de rendimiento. Datos sintéticos y conexiones interceptadas. No se certifica la suite completa ni Safari/iPhone físico. Índice y worker se regeneran juntos con SRI verificado.

## Reversión

Recuperar código de apariencia, entrypoint y script de build de la base y reconstruir una release coherente. Los assets previos se conservan. La fase 2 ya interpreta aurora y glow, por lo que revertir el frontend no exige borrar ni restaurar preferencias. Conservar siempre el respaldo local. Una restauración específica de Glow solo debe hacerse en el dispositivo autorizado y sin sobrescribir una selección posterior diferente. Sin reversión de datos de cuenta.

La publicación se confirma separadamente por estado de GitHub Pages y comparación de bytes públicos antes de registrarla como publicada en la Bitácora.
