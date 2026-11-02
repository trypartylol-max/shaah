# SHAAH — revisión de rendimiento · 2 de noviembre de 2026

Estado: cambios implementados y verificados. El usuario autorizó subir la rama y crear una propuesta de cambios el 2 de noviembre de 2026. Producción conserva la versión base; esta autorización no incluye fusionar ni publicar en producción.

## Identidad y alcance

Base: `5337019be1748b05e26d93bf757a6abbb29e4547`. El HTML público y sus 23 recursos referenciados coinciden con esa versión (24 archivos, `public-baseline.json`). La rama principal seguía en ese commit al cerrar la revisión.

La auditoría de red pública solo leyó archivos estáticos. Las pruebas de acciones y fallos usan cuentas ficticias; las comparaciones adicionales con copias históricas se ejecutaron únicamente en memoria, sin guardar en servidores.

## Cambios aplicados

- Una carga simultánea por cuenta y sesión: boot, restauración de sesión y reconexión comparten la misma solicitud mientras está en curso. Un fallo permite reintentar y una cuenta nueva nunca espera ni adopta la carga de otra.
- Una suscripción Realtime por cuenta: evita recrearla al terminar dos rutas de inicio simultáneas.
- Reutilización del formateador de fechas, no de su resultado. La fecha se calcula cada vez y el formateador se renueva al cambiar la zona configurada. Social calcula la fecha de referencia una vez por búsqueda de último encuentro.
- Estado de carga visible desde el HTML inicial y mientras se verifican datos; sin hábitos ni progreso ficticios. Las cuentas con copia local conservan el acceso inmediato existente.
- Las seis fuentes actuales pasan de TTF embebido en CSS a archivos WOFF2 con nombre por contenido. Se mantienen familias, pesos, cobertura de caracteres, medidas y `font-display: swap`. Los archivos antiguos permanecen para entradas en caché.

No cambian las funciones de cálculo, guardado de días/configuración, exportación/importación ni los permisos. No se agregan dependencias de ejecución, infraestructura, servicios ni una nueva arquitectura.

## Mediciones antes / después

### Trabajo de interfaz con 365 días de historial sintético

Cinco muestras por pestaña; tabla de medianas del tiempo síncrono de generar/actualizar la interfaz. El marcado de hábito es una muestra por perfil. Navegador Chromium (Brave) aislado; móvil 390×844 con CPU ralentizada 4× y respuestas de API simuladas de 600 ms. Escritorio 1440×900 y API de 100 ms. Las descargas de esta primera prueba están interceptadas, por lo que no representan tiempo de Internet.

| Acción | Escritorio antes | Escritorio después | Móvil antes | Móvil después |
|---|---:|---:|---:|---:|
| Today | 15.3 ms | 2.8 ms | 59.1 ms | 10.0 ms |
| Social | 94.5 ms | 1.6 ms | 369.2 ms | 5.4 ms |
| Stats | 57.4 ms | 5.0 ms | 220.7 ms | 18.4 ms |
| History | 2.5 ms | 1.8 ms | 9.2 ms | 6.3 ms |
| Log | 1.1 ms | 0.9 ms | 3.7 ms | 3.0 ms |
| Marcar un hábito | 23.9 ms | 8.5 ms | 75.7 ms | 23.6 ms |

El estado del hábito cambió inmediatamente en ambas versiones, antes del guardado remoto. La mejora reduce el trabajo del navegador, manteniendo la cola local y sus reintentos existentes. El escenario de restauración de sesión produjo dos cargas completas y dos suscripciones antes; ahora comparte una carga y conserva una suscripción. Los JSON registran también otras lecturas de configuración/rutinas, que no se confunden con duplicados.

### Primera apertura con transferencias HTTP reales bajo red simulada

Servidor local que sirve los bytes de cada versión con gzip, caché de 600 segundos y las políticas originales de seguridad. Contextos nuevos de navegador, 390×844, CPU 4×, descarga 1,6 Mbps, latencia de 150 ms y datos de API sintéticos con espera de 600 ms. Una apertura fría por versión; no son percentiles de usuarios ni una medición de la latencia de Supabase en producción.

| Medida | Antes | Después |
|---|---:|---:|
| Primer contenido visible (FCP) | 1.78 s | 0.87 s |
| Pantalla de cuenta visible | 3.60 s | 3.01 s |
| Recursos transferidos, sin HTML | 424,940 bytes | 292,011 bytes |

FCP después incluye la nueva pantalla de carga; la fila de pantalla de cuenta mide por separado cuándo aparece Today. No se presenta el placeholder como si los datos ya estuvieran listos.

El CSS de fuentes original transfería 192.249 bytes comprimidos y tardaba unos 1,50 s en este escenario. Ahora el CSS es pequeño y el navegador pide solo las caras utilizadas. La conversión completa de las seis caras reduce 291.016 bytes TTF a 116.708 bytes WOFF2, sin eliminar caracteres.

## Comprobaciones existentes y decisiones

- GitHub Pages ya entrega gzip, `Cache-Control: max-age=600`, ETag y distribución por CDN. No se cambió hosting. Brotli no se añadió porque la compresión ya funciona y la configuración del proveedor no se controla desde el frontend.
- JavaScript y CSS principales ya usan nombres por contenido y SRI; todas las solicitudes de código y fuentes de la app son del mismo origen. No hubo una dependencia externa que necesitara diferirse.
- La app ya aplica respuesta optimista, guardado diferido, cola por cuenta y protección de cambios pendientes frente a ecos de Realtime. Estas rutas se conservaron.
- La carga inicial agrupa datos en una consulta y selecciona `date,data`; no se identificó una cadena de consultas independientes que justificase crear más llamadas en paralelo.
- History ya limita lo visible por semana/mes/año. Las mediciones de esta revisión no justifican virtualización, recorte de historial, índices, Redis ni colas de tareas.
- Las imágenes no dominan las transferencias de la interfaz auditada; no se incorporó conversión a WebP/AVIF ni lazy loading de imágenes críticas.
- No se fraccionó ni reorganizó el código: las mejoras medidas bastaron para reducir las demoras observadas.

## Validación y límites

- 330 pruebas de lógica/regresión aprobadas, ninguna fallida ni omitida. Incluyen fallos de guardado, reintento, cambios de cuenta, importación/exportación, rutinas y configuración fechada.
- Comparación de 67 días históricos de tres cuentas de la copia local de producción; puntajes, registros e identificadores conservados. También pasó la comparación de las copias históricas de TEST. No se incluyeron esos archivos privados en la entrega.
- 45 pruebas de navegador dirigidas aprobadas; dos comprobaciones finales de carga y fuentes aprobadas (la de carga se repite en ambos grupos). Seis caras cargadas bajo CSP y medidas de texto idénticas a las originales.
- Dos escenarios de benchmark de CPU por versión y dos de red aprobados. Capturas móvil de antes, después y carga revisadas visualmente.
- Verificación pública: los 24 archivos de la versión base coinciden; no se efectuaron escrituras autenticadas ni cambios de actividades reales.

No se certifica iPhone físico/Safari, inicio de sesión real nuevo, transporte autenticado multidevice con esta entrega, métricas de usuarios reales ni latencia de consultas de producción. No se ha añadido telemetría ni se han cambiado índices/permisos.

## Reproducibilidad

Ejecutar `python3 scripts/performance-baseline.py` para recuperar los archivos descartables de la base; están excluidos de Git. `scripts/performance-instrument.py` genera una copia instrumentada fuera de los recursos publicados. Ejecutar `node --test tests/performance-benchmark.cjs` con `SHAAH_SOURCE` apuntando a esa copia y `BENCH_LABEL=before` o `after`. Los artefactos JSON guardan todas las muestras. Para red: `node --test tests/performance-network.cjs`. Para regresión nueva: `node --test tests/performance-regression.test.cjs tests/performance-browser.test.cjs`.

`CHROMIUM_PATH` permite elegir el navegador instalado. El benchmark de red cierra su servidor al terminar. La generación WOFF2 requiere fontTools solo en el entorno de autoría; la app no lo instala ni lo ejecuta. Las pruebas históricas opcionales encuentran las copias locales privadas mediante la ubicación de respaldo existente.

## Evidencia

- `before.json`, `after.json`: muestras completas de CPU y restauración de sesión.
- `network.json`: tiempos y bytes por recurso de la apertura fría.
- `fonts.json`: cobertura y medidas preservadas por cara.
- `public-baseline.json`: identidad de los 24 archivos y cabeceras públicas.
- `unit.log`, `browser.log`, `loading-fonts.log`: resultados de las comprobaciones.
- `before-mobile.png`, `after-mobile.png`, `loading-mobile.png`: capturas sintéticas.
