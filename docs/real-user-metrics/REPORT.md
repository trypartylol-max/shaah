# Medición de velocidad en uso real

Implementación del equipo de métricas, completada y revisada por el integrador el 3 de noviembre de 2026. Base 988c3182.

## Resultado

Settings → Velocidad de SHAAH permite activar/desactivar un diagnóstico local por cuenta y dispositivo, consultar tiempos, descargar un JSON agregado y borrar las mediciones. Está apagado inicialmente. No requiere proveedor externo, tablas nuevas, permisos ni infraestructura. No crea solicitudes de red ni telemetría remota.

Mide apertura de la pantalla, lectura de datos, cambios de pestañas, respuesta al marcar y, donde lo soporte el navegador, FCP/LCP y el máximo de eventos lentos observados. Este último no se presenta como INP. Los tiempos hasta el dibujo son estimaciones mediante dos animation frames. No captura nombres de hábitos, notas, contactos, contenido de la cuenta, URLs, elementos DOM ni atribuciones. El informe exportado solo contiene etiquetas fijas, números agregados y capacidades del navegador.

Cada métrica conserva hasta 200 duraciones recientes; el almacenamiento se difiere y se agrupa. Se muestran mediana y máximo. La preferencia y las muestras locales se aíslan por cuenta, pero no se exportan identificadores. Logout, cambio de cuenta, desactivación, borrado y eventos de storage invalidan callbacks antiguos. Los intervalos con pestaña oculta se descartan para no atribuir una pausa de segundo plano a la app.

## Pruebas

21 regresiones deterministas aprobadas: opt-in, privacidad, límites, saneamiento de almacenamiento/exportación, reloj no disponible, APIs ausentes, callbacks obsoletos, borrado, cierre de sesión, cuentas y pestañas ocultas. La revisión independiente del subequipo detectó el problema de visibilidad y se corrigió con dos regresiones nuevas.

Tres comprobaciones de navegador aprobadas: UI móvil y exportación real, cuenta A/B/A e informe aislado, coste con CPU4x. La ruta de navegador bloquea cualquier solicitud externa no simulada, incluidas llamadas Supabase, y exige ausencia de errores CSP.

Coste medido: siete rondas pareadas de 10.000 inicios/finales de medición en 390×844/CPU4x; medianas 1,0 ms apagado y 21,7 ms encendido por ronda; diferencia aproximada 0,0021 ms por acción instrumentada. Es un microbenchmark del instrumento, no una medida global de navegación o de todos los usuarios. Módulo 7.430 bytes, 2.591 bytes gzip.

## Límites

No agrega datos de todos los usuarios en un servidor. Para estudiar un móvil real, el usuario activa la opción en ese móvil, recarga, usa la app y descarga el informe. La recogida centralizada sería otro alcance y requeriría definir consentimiento, destino y retención. No se ha probado un iPhone físico ni se han inventado mediciones de Safari. Varias pestañas de la misma cuenta comparten el almacenamiento; los recuentos son diagnósticos y pueden perder muestras concurrentes, no constituyen un censo. Los datos de medición no entran en el backup de hábitos/configuración.

## Evidencia

- tests/real-user-metrics-regression.test.cjs
- tests/real-user-metrics-browser.test.cjs
- docs/real-user-metrics/browser.log
- docs/real-user-metrics/sample-report.json
- docs/real-user-metrics/overhead.json
- docs/real-user-metrics/panel-mobile.png

El trabajo del responsable y su revisor quedó interrumpido por capacidad; el integrador terminó las correcciones, pruebas de navegador y revisión. Pendiente de integración y publicación conjunta; no está activo en producción por este informe.
