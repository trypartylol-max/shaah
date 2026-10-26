# Core Routines: cambio visual en OG — 26/10/2026

Base: main `7c9bff890723c5e938aa3adfd104c92ca8f198d2`. Antes de editar,
el HTML y los seis recursos JS/CSS enlazados de GitHub Pages coincidieron
byte a byte con esta base. Destino: https://trypartylol-max.github.io/shaah/.

Cambio autorizado: quitar la caja exterior de Core Routines y juntar título
y puntuación en una línea. Las tarjetas existentes conservan su marco y
controles; el grupo sigue existiendo como nodo de distribución sin marco,
para preservar el plegado móvil y la disposición de escritorio.
Solo tres reglas CSS, asset con hash/SRI y referencia CSS del HTML.
El JS de aplicación, el parche History Back, CSP y backend no cambian.
No se modifica ni despliega SHAAH TEST.

Verificación antes de publicar: navegador Chromium con datos sintéticos
a 320, 390, 879, 880 y 1440 px. Sin fondo, borde, sombra ni relleno exterior;
título y total 0/60 en la misma línea; ambas tarjetas mantienen borde y fondo;
sin desbordamiento; otros paneles conservan estilos y dimensiones.
Plegado con clic/teclado y controles Work 10/20/25/0 y What 35 funcionan.
Renderizar en varios tamaños no modifica configuración, días ni puntuaciones.
Sin errores de runtime/CSP/SRI ni tráfico a servicios reales durante las pruebas.
82 regresiones pasan, 1 omitida por requerir un respaldo TEST local ausente.
No se prueban cuentas reales ni dispositivo iOS físico.

La prueba permite cargar el parche History Back que ya estaba publicado,
sin cambiarlo. Recuperación: revertir este commit; los assets anteriores
se conservan y no hay migraciones ni cambios de datos que deshacer.
La paridad del despliegue final se comprueba después de publicar.
