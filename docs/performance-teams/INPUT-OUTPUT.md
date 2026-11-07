# Entrada y salida de los dos equipos

Trabajo inicial: 2–3 de noviembre de 2026. Integración con la versión actual: 7 de noviembre de 2026.

## Entrada

- Versión publicada 988c3182 (rendimiento de PR #34), mismo código y datos de prueba que la entrega anterior.
- Cuentas ficticias, días fechados, historial y copias locales privadas de referencia, sin incorporar esas copias al repositorio.
- Dos perfiles de navegador móvil: 390×844/CPU4×/1,6 Mbps/150 ms y 320×667/CPU6×/0,4 Mbps/400 ms. Las respuestas de datos se simulan con 600 y 1.500 ms.
- Objetivos: comprobar móvil/red lenta y medir velocidad durante uso real, sin cambiar reglas ni añadir servicios externos.

## Salida del equipo móvil

- Reproducción de pérdida de última edición: dos solicitudes del mismo día podían aplicarse en orden inverso, dejando el servidor antiguo y la cola vacía.
- Corrección en el transporte compartido: las escrituras de una cuenta y fecha se ordenan; otras fechas siguen independientes. Guardado directo y replay comparten la coordinación.
- Comprobación de cuenta y época antes de construir la solicitud y antes de confirmar su resultado; un DELETE viejo en espera no puede ejecutarse bajo otra sesión ni vaciar la cola de la cuenta anterior.
- Lecturas iniciales con plazo de 20 segundos, cancelación mediante el SDK cuando está disponible, mensaje de error/reintento y descarte de respuestas tardías.
- Un write sin respuesta conserva la cola: no se libera por un timeout que permitiera que el servidor aceptara tarde una escritura antigua. La serialización es de este navegador, no una transacción global entre dispositivos.

## Salida del equipo de medición

- Settings → Velocidad de SHAAH: activar/desactivar, consultar, descargar y borrar un informe local.
- Apagado por defecto, aislado por cuenta en ese navegador. No sube datos ni crea tablas, servicios, permisos o dependencias de ejecución.
- Solo tiempos y etiquetas fijas; ningún hábito, nota, contacto, URL, identificador de cuenta ni contenido DOM entra en el informe exportado.
- Los intervalos en segundo plano no se cuentan como lentitud de la interfaz.
- Hasta 200 muestras por métrica, mediana y máximo; APIs nativas si el navegador las ofrece. No es analítica global ni se presenta el máximo de eventos lentos como INP.

## Equipos y revisión

- Responsable móvil/redes + subagente network_safety_review: reprodujeron los dos fallos y prepararon corrección/matriz.
- Responsable de métricas + subagente privacy_metrics_review: implementaron instrumento/panel y revisión de privacidad. El revisor detectó la contaminación por pausas en segundo plano.
- Tras interrupción de capacidad de los responsables, el integrador terminó la protección de época, la corrección de visibilidad, las pruebas de navegador/coste y la integración. No se presenta el trabajo parcial como validado automáticamente.

## Validación

- Integración actualizada con 2407128: 360 pruebas de lógica/regresión y 28 de navegador aprobadas, ninguna fallida ni omitida. La repetición anterior de los seis casos móvil/métricas también pasó.
- Las pruebas de navegador cubren estilos/CSP, rutinas, Starter, notas, cuentas, ecos Realtime, desconexión/reconexión y exportación del informe.
- La primera ejecución integrada encontró que el plazo de navegación del test (10 s) era menor que una descarga completa bajo 0,4 Mbps. Se fijó explícitamente un presupuesto de navegación de 30 s para ese escenario; no se cambió el código de la app para ocultar una pérdida de datos. El plazo de lectura de datos sigue siendo 20 s. Se conserva el log inicial y el resultado final por separado.
- Overhead: microbenchmark de 7 rondas pareadas × 10.000 mediciones bajo CPU4×; ver overhead.json. Es coste del instrumento, no latencia de usuarios de producción.
- Evidencia móvil en docs/mobile-network; panel y exportación en docs/real-user-metrics; registros combinados en docs/performance-teams.

La versión actual de Narrow Pro y los iconos globales (2407128) se conserva en la integración. El diagnóstico permanece apagado por defecto.

## Entrada física aún necesaria

No disponemos de un iPhone físico controlable desde esta sesión. Tras publicar, abre SHAAH en Safari del iPhone, entra en Settings → Velocidad de SHAAH, activa la medición y recarga. Abre Today, Social, Stats e History. Comprueba que los controles responden y que las ediciones habituales sobreviven a recargar. Puedes desactivar la medición o borrarla después; no cambia tus actividades.

Para cerrar esta comprobación, informa del modelo/iOS y si hubo pantallas en blanco, desplazamiento lateral, controles bloqueados o pérdida de la última edición. El informe de tiempos se descarga solo si tú lo decides; no se envía automáticamente. No afirmamos haber probado Safari/iPhone físico ni transporte real multidevice.

Coste final medido del instrumento bajo CPU4×: mediana de 0,90 ms apagado y 33,60 ms encendido por 10.000 acciones; diferencia aproximada 0,00327 ms por acción. Ver overhead.json para muestras completas.
