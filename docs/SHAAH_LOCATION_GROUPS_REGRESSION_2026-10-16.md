# SHAAH — Regresión de Location Groups, 2026-10-16

## Resultado

**66 pruebas superadas, 0 fallidas, 0 omitidas**, con datos sintéticos y
Supabase simulado. Incluyen **28 casos específicos de Location Groups**
(19 de lógica y 9 de navegador), además de los 38 anteriores. El total es
51 pruebas de lógica y 15 de navegador.

La revisión del paquete faltante está completada. Se integraron Location Groups
y sus correcciones en la rama **local**
`test/location-groups-regression-2026-10-16`. Este informe sustituye el informe
anterior que señalaba el ZIP como ausente; ese estado anterior queda conservado
en el commit `9edb91225a77a7e42ff72009d8b2ce847ecfa320`.

No se hizo push, merge ni despliegue. No se consultaron ni modificaron datos,
esquemas o políticas reales de Supabase. La integración autenticada contra un
Supabase de pruebas sigue pendiente; estas pruebas no certifican producción.

## Revisión de los archivos recibidos

Se leyeron `SHAAH_LOCATION_GROUPS_HANDOFF_2026-10-16.md`, el Master Handoff,
ambos HTML y los tres scripts Python. El Master Handoff adjunto es idéntico al
versionado. Se conserva el nuevo handoff en
`docs/references/SHAAH_LOCATION_GROUPS_HANDOFF_2026-10-16.md` como referencia.

El handoff aporta contexto y reglas de producto; sus propuestas de trabajo futuro
o despliegue no amplían la autorización del usuario. El alcance vigente es
revisar, corregir y probar en una rama, sin cambios remotos ni producción.

`main` remoto se volvió a comprobar y sigue en
`09f943bf492957d7cb44e407ebf92935f2a11c2f`. En la revisión anterior, el HTML
publicado coincidió byte por byte con ese commit.

| Fuente | Identidad |
|---|---|
| `main` examinado | `09f943bf492957d7cb44e407ebf92935f2a11c2f` |
| Cambios anteriores de esta sesión | `9edb91225a77a7e42ff72009d8b2ce847ecfa320` |
| SHA256 del HTML de `main` | `42cedb6426736b68a3bf484946fb6efe32510473bf3b269865051fe915d8af2b` |
| SHA256 de `SHAAH-FINAL.html` adjunto | `f75d0f636afc80ae38d25c2da540ab8ba9cb0396fc711f5822d5048bc2905407` |
| SHA256 del HTML endurecido adjunto | `7f5243795241f858b7b6d548e8ed3f7f1ea7621567b46037069f124e314a46b0` |
| SHA256 del `index.html` integrado y probado | `61d29028113e5a01bed57175cd3268d1db5dd14324a1d139b44e3256b0d55866` |

### Ajustes a lo realizado anteriormente

El candidato endurecido deriva de una base anterior a `main`. Su delta respecto
al `SHAAH-FINAL.html` adjunto contiene 120 líneas añadidas y 13 retiradas. Se
trasladó ese delta a la rama actual, conservando las correcciones de Work Mode,
la vuelta del 8 de octubre, la configuración histórica y las funciones actuales
de persistencia. La integración conserva el diseño y los nombres manuales de
grupos del candidato.

Se reprodujo un riesgo concreto del candidato: sobre un fixture con una era Work
válida desde el 8 de octubre, `setVacationStartOnce()` la convierte a Vacation.
El `loadAll()` adjunto todavía llama a esa reparación. También contiene un
script externo inyectado de Kaspersky. La integración utiliza el arranque y los
recursos del repositorio actual.

Los dos arreglos previos de Social Scoring siguen siendo necesarios: el HTML
endurecido también falla en los cuatro casos focalizados de reparto histórico
sin precio y selección de una parte de cero puntos, en ambos modos. Se mantienen
el fallback histórico correcto y el respeto de precios explícitos, incluido cero.

Se compararon con el commit anterior las representaciones completas de 14
funciones, incluidas `modePts`, `resolveSubs`, `calcScore`, `cfgForDate`,
`travelMode`, `applyTravelMode`, `ensureWorkReturn2026`, `persistDay`, `saveCfg`
y `rowToState`: permanecen idénticas. Location Groups no introduce una nueva
regla de puntuación ni una migración de registros históricos.

## Matriz de regresión

| Área solicitada | Resultado comprobado |
|---|---|
| Asignación masiva | Añadir es aditivo y evita duplicados; quitar elimina solo el grupo indicado. Se respetan búsqueda, estado y Unassigned; se revalida la elegibilidad antes de escribir. Cambiar filtros, ámbito o búsqueda limpia la selección. |
| Asignación individual | Casillas para añadir/quitar ubicaciones en contactos normales y con categoría Social huérfana. Rechazo de grupos inexistentes. |
| Múltiples ubicaciones | Conservar las demás ubicaciones al añadir o quitar una, tanto individualmente como en lote. |
| Active/Inactive | Excluir Inactive de recomendaciones y sugerencias en todas las ubicaciones; localizarlo en Settings y reactivarlo conservando datos e historial. |
| All people y Unassigned | Acceder a todos los contactos y a los que carecen de ubicaciones válidas, incluidos contactos antiguos sin campos nuevos. |
| WHO TO SEE | Filtrar por ubicación y estado; contactos sin ubicación permanecen visibles en todas. Se conserva el cálculo de última visita y frecuencia. El selector sigue disponible cuando no hay recomendaciones. |
| Social History | Conservar IDs, visitas guardadas, checks, notas, Day Log, frecuencias y eras durante las operaciones de metadatos. Quitar una actividad Social explícitamente sí quita sus etiquetas, incluidas personas ocultas por el filtro. |
| Social Scoring | Puntuar actividades independientemente de ubicación/Inactive; mantener puntos Work/Vacation distintos, pesos históricos, ceros y reparto antiguo. |
| Compatibilidad | Carga desde caché y settings, ausencia de campos nuevos, referencias a grupos borrados, importación de personas, guardado y recarga con servidor simulado. |
| Navegador | Arranque del HTML completo, clicks, búsqueda, diálogos, filtros y recarga en Chromium. Flujo principal en escritorio 1440×1000 y móvil 390×844; controles de contacto sin desbordamiento. |

### Fixtures históricos

Los fixtures son sintéticos: Work vale 20, Meditate 10/6, y las partes Social
Flirting 2/4, Strangers 0/0 y Friends 16/20 en Work/Vacation. Se marca Work
completo, Meditate a la mitad y Social con Flirting seleccionado. Work se
excluye durante Vacation. Los máximos Social son 18/24.

| Fecha | Modo | Obtenido | Máximo | Porcentaje normalizado redondeado | Nota |
|---|---|---:|---:|---:|---|
| 2026-09-07 | Work | 27 | 48 | 56% | B |
| 2026-09-08 | Vacation | 7 | 30 | 23% | D |
| 2026-09-15 | Vacation | 7 | 30 | 23% | D |
| 2026-09-16 | Vacation | 7 | 30 | 23% | D |
| 2026-09-17 | Vacation | 7 | 30 | 23% | D |
| 2026-09-18 | Vacation | 7 | 30 | 23% | D |
| 2026-10-08 | Work | 27 | 48 | 56% | B |

Cambiar ubicación, membresías o Inactive conserva estas puntuaciones y las filas
originales. El recorrido Work → Vacation → Work y la edición de puntos de cada
modo siguen pasando los casos anteriores. Estos fixtures no equivalen a una
validación de todas las migraciones históricas.

## Problemas encontrados y correcciones de Location Groups

1. **Búsqueda masiva:** no filtraba durante la escritura y conservaba selecciones
   de la búsqueda anterior. Ahora filtra al escribir, mantiene foco y posición
   del cursor, y limpia la selección cuando cambia la búsqueda.
2. **Grupo seleccionado inexistente:** podía mostrar All en el control y aplicar
   internamente un ID inválido. `selectedLocation()` resuelve All si el grupo ya
   no existe.
3. **Membresías a grupos borrados:** podían ocultar contactos e impedir encontrarlos
   en Unassigned. La visibilidad y ese filtro usan membresías válidas; los IDs
   originales siguen almacenados para recuperación. Es una decisión de
   compatibilidad para evitar ocultar o eliminar información.
4. **Importación de personas:** descartaba `locations` e `inactive`. Ahora conserva
   esos metadatos cuando existen, evita ubicaciones duplicadas y mantiene la
   protección de no sobrescribir personas o días ya existentes.
5. **Edición móvil:** las casillas y controles de contacto desbordaban la fila.
   Se permite que los controles se distribuyan en varias líneas y las ubicaciones
   tengan su propia línea dentro de la tarjeta.
6. **Categoría Social huérfana:** esos contactos no tenían casillas individuales de
   ubicación. Se añadieron a su tarjeta, manteniendo su categoría e historial.

Los dos arreglos previos de scoring siguen en el commit anterior. Pueden corregir
el total calculado de días que contengan los patrones defectuosos anteriores;
no modifican sus filas ni sus eras guardadas. No se ejecutó ninguna reparación
sobre datos reales.

## Evidencia y reproducción

La prueba `test_shaah_hardened.py` del ZIP pasó al adaptar únicamente su ruta de
entrada al archivo descargado. Es una prueba de un segmento de funciones en un
DOM aislado. `test_shaah_locations.py` y `harden_shaah.py` apuntan a un HTML
anterior que no viene en el ZIP; no se ejecutaron sobre un archivo inventado.

Antes de corregir el delta integrado, los 27 primeros casos de ubicaciones
reproducían siete fallos (20 pasaban). El caso adicional de categoría huérfana
falló antes de añadir sus controles. Tras las correcciones, la suite final
completa pasa **66/66**. `git diff --check` también pasa.

Las pruebas de lógica ejecutan las funciones reales del HTML en un contexto
Node aislado. Las pruebas de navegador ejecutan el HTML completo, incluido su
arranque y persistencia, con un cliente Supabase simulado. Documento y SDK se
sirven en memoria; el resto de solicitudes se bloquea. Se comprueba que no haya
excepciones de navegador ni solicitudes inesperadas. Solo se usan contactos,
cuenta y registros sintéticos.

Entorno: Node 24.19.0, Playwright 1.62.1 y Chromium 154.0.8037.57; fechas fijadas
en UTC para obtener fixtures deterministas. Requiere Node >=22:

```bash
npm ci --ignore-scripts
# Si no hay Chromium de sistema ni uno instalado por Playwright:
npx playwright install chromium
npm test
```

Ejecuciones parciales: `npm run test:locations`, `npm run test:unit` y
`npm run test:browser`. `CHROMIUM_PATH` permite seleccionar el navegador.

Los logs locales, incluidos resultados antes/después y comparación de funciones,
están en `test-results/` y en el paquete de revisión. No se versionan dependencias
ni logs. El HTML adjunto original permanece intacto fuera del repositorio.

## Bloqueos pendientes

- **Supabase de pruebas:** faltan pruebas autenticadas contra un backend separado.
  El doble local no certifica RLS, OAuth, realtime, durabilidad remota ni
  sincronización entre dispositivos. No se configuró acceso a datos reales.
- **Concurrencia de configuración:** `saveCfg()` sigue guardando la configuración
  completa; existe el riesgo conocido de sobrescritura entre dispositivos y de
  divergencia tras un fallo de guardado. No se rediseñó la persistencia.
- **Validación productiva completa:** iOS físico, recuperación/offline entre
  cuentas y la matriz general de toda la aplicación siguen fuera del alcance
  certificado por esta regresión focalizada.
- **Eliminación permanente:** la recuperación existente puede reconstruir contactos
  referenciados por días antiguos; sigue pendiente definir tombstones o la
  política definitiva de eliminación.

**La regresión local de Location Groups está completada con los límites
anteriores. La rama no está certificada para producción y se mantiene la
prohibición de merge y despliegue sin autorización.**
