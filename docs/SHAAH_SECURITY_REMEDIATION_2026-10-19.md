# SHAAH: revisión de seguridad y candidato corregido

19 de octubre de 2026. No se ha demostrado una filtración de datos.

## Alcance e identidad

Original público: main `ef6922a…`, HTML `be6723e6…`, identificado mediante GET.
TEST v5: HTML base `cb053644…`, login QA y alojamiento separados. La consulta
histórica de backend se limitó a catálogos/asesores de SHAAH-TEST
`kpnwiwaiwnndpvtxkvva`; nunca filas, usuarios Auth, sesiones, claves privadas o
contenido de respaldos. No se auditó de nuevo el backend original.

HTML candidato corregido: `a6b4901715eb1ad5a33bc0d582fdaae80a037c60bdd16c424829d32342c8e676`. Evidencia saneada en
`SHAAH_SKINS_SECURITY_VERIFICATION_2026-10-19.json`. Sus arreglos y resultados
no se atribuyen al original publicado ni a TEST v5, que siguen pendientes de
recibirlos.

## Hallazgos

| Hallazgo inicial | Candidato | Estado del código publicado |
| --- | --- | --- |
| Alta F1: error de login de URL interpretado como HTML. | Mensaje escapado/acotado; query/hash, Unicode y porcentajes comprobados. Errores de arranque y correo también escapados. | Pendiente de publicar en el original. El login QA de TEST ya escapaba este valor. |
| Alta F2: IDs importados interpolados como código en eventos; otros contextos abiertos. | Argumentos JS codificados, atributos/textos escapados, colores/duraciones normalizados y validación completa antes de mutar. Pruebas de importación, edición, grupos, Social, dock de rutinas y Day Log con puntuación/Unicode. | Pendiente de publicar en ambos clientes. |
| Baja F3: segunda decodificación provoca URIError. | Se usa una sola decodificación; arranque verificado con porcentajes incompletos/codificados. | Pendiente de publicar en el cliente base. |
| Media F4: original sin CSP ni SRI en la lectura inicial. | URL estática del SDK fijada y SRI contrastado con npm, CORS anónimo y meta Referrer-Policy. | CSP/cabeceras del alojamiento siguen pendientes; no se cambió hosting. |
| Aviso F5 en TEST: protección contra contraseñas filtradas desactivada. | Documentado; no se cambiaron Auth ni contraseñas. | Pendiente de decisión/configuración soportada por el proveedor. |

Los dos hallazgos altos tienen correcciones y regresiones defensivas en el
candidato, pendiente de publicación. Esto no garantiza ausencia de otras brechas.
Se conservaron eventos inline con datos codificados; una CSP que los prohíba
requiere otro cambio de arquitectura.

La confirmación histórica de F1/F2 se hizo en copias locales con datos sintéticos
y marcador inocuo, sin ataques a sitios públicos. La nueva regresión comprueba
integridad de texto, atributos y comportamiento con entradas ordinarias difíciles.
Una revisión estática independiente encontró bordes de rutinas/dock corregidos
antes de la suite final. No se probaron sesiones reales ni evasión de RLS.

## Claves y cifrado

La clave pública del cliente es de rol `anon`, diseñada para ser visible; no es
una clave `service_role`. No se incorporan credenciales privilegiadas o QA al
cliente. Los secretos QA siguen en el mecanismo de secretos del Worker existente.

La lectura pública histórica comprobó HTTPS/HSTS del original. No certifica TLS
de todos los servicios ni cifrado físico de sus discos. El código usa sesión y
caché en almacenamiento del navegador, sin cifrado de aplicación. Por tanto, no
sería correcto afirmar que todas las claves/datos locales están cifrados. La
protección del dispositivo depende también del sistema y navegador; incrustar
una clave de cifrado en el mismo cliente no resolvería la inyección de código.

## Pruebas y límites

`npm test`: **150/150 aprobadas**, cero fallos, cancelaciones, omisiones o TODO; duración 62.24 segundos. Incluye 23 casos defensivos nuevos frente al candidato anterior de 127. `npm audit`: cero vulnerabilidades conocidas; lockfile sin cambios.

La auditoría npm vigente del mismo lockfile comunica cero vulnerabilidades
conocidas. Esto comprueba dependencias reportadas por el registro, no toda la
lógica de seguridad. Los logs completos permanecen en `test-results/`, ignorado
por Git; el informe incluye únicamente evidencia saneada.

El escaneo histórico cubrió 88 archivos y 378 blobs Git locales, sin patrones de
secretos privilegiados. No cubrió todo GitHub ni secretos de proveedores. El
nuevo escaneo del candidato y sus límites figuran en el JSON adjunto.

Los catálogos históricos de TEST mostraron RLS en las cinco tablas revisadas,
falta de permisos anónimos SELECT/INSERT en tablas públicas examinadas, políticas
de propietario USING/WITH CHECK y restricciones de settings. No certifica el
backend original ni todas las rutas y no es una nueva prueba autenticada del
candidato. No se hicieron consultas nuevas de Supabase en este cierre.

Quedan CSP/cabeceras de hosting, almacenamiento local, aviso de contraseñas del
proveedor y revisión independiente más amplia. El backend privado original y el
cifrado en reposo no están certificados con este alcance. No hay evidencia de
filtración de claves administrativas o registros personales.

Publicar solo con autorización final del original y verificar luego el HTML/SHA
realmente desplegado. No se ejecutaron SQL, migraciones, restauraciones o cambios
Auth; no se reintentó HTTP409. La recuperación de este cambio es del cliente,
sin restaurar datos.

Un intento previo de generar un reproductor automatizado fue bloqueado por el
filtro automático de ciberseguridad. No se reintentó ni se incluye ese reproductor.
El informe inicial usó evidencia disponible; las correcciones defensivas y pruebas
funcionales ordinarias de este candidato sí se completaron.
