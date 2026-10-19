# SHAAH — preview privada y sincronización real, 18 de octubre de 2026

> Avance posterior: protección de ajustes en servidor y ensayo de migración,
> respaldo y recuperación completados. El candidato y la preview v4 están en
> [SHAAH_PRODUCTION_CANDIDATE_2026-10-18.md](SHAAH_PRODUCTION_CANDIDATE_2026-10-18.md).
> Se conserva debajo la fotografía de v2 y la validación manual recibida.

**Preview disponible:** https://shaah-test-location-groups.arviler.chatgpt.site

Acceso privado para el propietario. Pulsar **Entrar como QA A** o **Entrar como
QA B**; no hay que introducir contraseñas. A y B son usuarios sintéticos distintos
de Supabase. Para probar sincronización, abrir **QA A en dos dispositivos**.
La identidad de Sites protege la web; no se usa una cuenta personal de Supabase.

**Resultado: 110/110 pruebas locales, 11/11 escenarios autenticados y 7/7
comprobaciones de la URL publicada aprobados.** Las 17 comprobaciones anteriores
de Postgres también pasaron, con claims simulados y ROLLBACK; se contabilizan por
separado. Ningún resultado de esta fase certifica todavía producción.

## Validación manual del propietario

Después de revisar la preview, el propietario indicó «se ve bien» y después
«no aparecieron fallos». Se registra como resultado manual favorable comunicado
por el usuario. No se especificaron los dispositivos ni cada acción realizada;
la comprobación física de iOS y el alcance exacto de la prueba en dos dispositivos
siguen sin documentarse. Este resultado no autoriza cambios en producción.

## Alcance y versiones

- Proyecto único de pruebas: **SHAAH-TEST**, `kpnwiwaiwnndpvtxkvva`, eu-west-1.
- Candidato de aplicación: commit local `99c0aad9884e2df5a04cb431d16b99dce399bfa0`,
  rama `test/supabase-sync-phase2-2026-10-16`. `index.html` no cambió en este avance.
  SHA256: `5bc63c22c7c603f30c4951c963dfce3d1f6b923ce41d483ccda6ec63ade923e6`.
- Site independiente: `appgprj_6ad42cda28a88191851a529e150ac45d`.
  Fuente `2434305d3fd19d195b1bdeaf37cfdd133ca989c3`, versión guardada **2**.
- Despliegue `appgdep_6ad435681a048191b3e4251395d626b9`: **succeeded**,
  revisión de secretos **1**. Acceso `custom`: un usuario autorizado, cero grupos
  y cero visitantes externos; comprobado mediante el conector después de publicar.
- Solo se hizo push al repositorio nuevo del Site de QA. No hubo push ni merge
  en `trypartylol-max/shaah`, ni cambio de su rama de publicación o GitHub Pages.
  No se accedió a Supabase producción ni se copiaron datos reales.

## Pruebas verificadas

| Conjunto | Resultado y evidencia |
|---|---|
| Suite local | **110/110**, cero fallos u omisiones. Conserva las 107 regresiones anteriores y añade tres comprobaciones del transporte/redacción de QA. |
| Auth y cuentas nuevas | Login real con contraseña, UUID y email esperados; ambas cuentas vacías antes del primer seed. |
| RLS con JWT reales | Lectura/insert/update/delete propios; rechazo cruzado A/B y acceso anónimo; B permanece intacto. |
| Location Groups entre contextos | Asignación masiva e individual, múltiples ubicaciones e Inactive sincronizados; contexto nuevo confirma los settings sin caché previa. |
| Historial y puntos | Editar contactos/grupos conserva los registros diarios e historial Social; fixture histórico **Vacation 7 / Work 27**. |
| Realtime | Eventos reales INSERT/UPDATE/DELETE de `day_logs` y actualización de la aplicación en contextos independientes; DELETE de A no altera B. |
| Backups | Backup remoto de configuración comprobado. |
| Concurrencia | Dos settings obsoletos conservan ediciones independientes; un conflicto del mismo campo mantiene el borrador tras recarga hasta una decisión explícita. |
| Offline y propietario | Una nota offline de A no se envía como B; al volver a A se conserva y se envía como A. |
| URL publicada | Salud/secretos, acceso privado, login QA A y Realtime, cambio A→B→A, bloqueo de producción/OAuth personal, Social móvil y cero errores de JavaScript: **7/7**. Configuración confirmada sin borrador, conflicto o fallo de guardado. |
| Regresión funcional previa | Active/Inactive/Unassigned, WHO TO SEE, contactos existentes, historial y Social por modo incluidos en la suite local aprobada. No se presentan como 11 pruebas remotas adicionales. |

La batería autenticada tiene `remoteExecuted:true`, run ID
`19788350-ea75-42e7-acc3-fd23ef36a098`. El informe registra 40 solicitudes Node,
eventos reales de Postgres y cero errores de ejecución del navegador. El error
de WebSocket en uno de sus contextos corresponde a la simulación deliberada de
desconexión. La comprobación de la URL no inventa eventos: observa la suscripción
activa; los eventos INSERT/UPDATE/DELETE proceden de la batería autenticada.

## Seguridad y preparación realizadas

Se crearon **dos usuarios QA nuevos** mediante `auth.admin.createUser`, con
direcciones sintéticas `.invalid`, confirmación administrativa y sin enviar emails.
Se utilizó una Edge Function temporal limitada al proyecto QA, dos identidades
predeterminadas, JWT obligatorio, prueba privada y caducidad. La clave administrativa
solo existió en el runtime de Supabase. No se insertaron estos usuarios por SQL.

Tras crear A/B, la función `shaah-qa-provision-d8a59dc07564` se reemplazó por la
versión **2**, que responde `410 PROVISIONING_CLOSED`. Se volvió a consultar su
código: no contiene llamadas administrativas ni acceso a la clave de servicio.
Queda ese endpoint cerrado; no quedó un provisionador operativo.

Los siete campos QA se configuraron como **secretos de Sites**. Contraseñas,
tokens y sesiones no están en el repositorio, archivos `.env`, resultados, HAR,
vídeo o storageState. El navegador recibe únicamente la clave publicable QA y
la sesión normal del perfil elegido; no recibe contraseñas ni claves privilegiadas.
Las ejecuciones locales consumieron secretos por stdin oculto y memoria efímera.
Una búsqueda de los valores reales en 104 archivos de código y evidencia
encontró **cero archivos con esos secretos**; el informe solo guarda contadores.

La preview tiene el host QA fijado, guardas de fetch/WebSocket antes del SDK y
una CSP que solo permite conexiones a su propio origen y SHAAH-TEST. La referencia
productiva está ausente del Worker completo. Los intentos de fetch/WebSocket a
producción se rechazaron antes de enviar; OAuth personal está deshabilitado.
SDK 2.118.0 y fuentes se sirven desde el propio Site, sin scripts CDN en runtime.
RLS y permisos de la tabla QA no se debilitaron.

Para la demo se inicializaron, **antes de publicar**, siete contactos ficticios,
tres grupos y dos rutinas por perfil, con historial sintético y configuración
completa. La actualización condicional JSONB de esa configuración, con filtro
codificado de **13.642 bytes**, obtuvo HTTP 200 y una fila confirmada en A y B.
Los fixtures actuales se conservan. No ejecutar seed/reset ni vaciar A/B una vez
publicada la URL: pueden contener ya las pruebas manuales del propietario.

## Problemas encontrados y resueltos

1. **Falta de usuarios/secretos QA:** resuelta con Auth Admin API temporal y
   secretos nativos del nuevo Site; no se solicitaron contraseñas al usuario.
2. **Chromium no confiaba en la CA del proxy para WSS:** el ejecutor usa un puente
   Node hacia el WebSocket real, con el proxy y CA del entorno. No se desactivó
   TLS. Es infraestructura del ejecutor; la web publicada usa el SDK normal.
3. **Login del Worker publicado devolvía 502:** el runtime rechazaba el modo
   `redirect:'error'`. Se cambió a `manual`, rechazando explícitamente cualquier
   3xx. La misma petición y los flujos de navegador pasaron después del cambio.
4. **Empaquetado inicial del Site:** se corrigió la raíz del archivo para incluir
   `.openai/hosting.json` y `dist/server/index.js`. El archivo rechazado no se
   contabilizó como versión publicada.
5. **Helper de Sites ausente:** tras comprobar su ausencia se implementó el contrato
   documentado de Git/build/archive con un helper limitado al repositorio nuevo
   del Site, credencial efímera por stdin y verificación del remoto. No se sustituyó
   ni se utilizó el remoto GitHub original para publicar.

Las correcciones del cliente de la fase anterior —colas por cuenta, respuestas
antiguas, fusión de settings, guardado condicional y resolución de conflictos—
quedan ahora comprobadas también con sesiones reales. Su explicación está en
[SHAAH_SYNC_FIXES_2026-10-18.md](SHAAH_SYNC_FIXES_2026-10-18.md).

## Pendiente antes de migrar al SHAAH original

1. **Convivencia con versiones antiguas:** un cliente anterior con upsert
   incondicional todavía puede sobrescribir settings. Hace falta una estrategia
   de actualización o protección de revisiones en backend antes de producción.
2. **Límites y equivalencia:** se validaron filtros de 13.642 bytes, no tamaños
   arbitrarios. Falta comprobar el esquema/configuración productivos, planificar
   respaldo/migración y probar OAuth real y un dispositivo iOS físico.
3. **Detalle menor de la demo:** una migración existente añade `cjunk0` a los diez
   hábitos por defecto y produce dos etiquetas “No Junk Food”. Se observó y
   documentó; no afecta a Location Groups ni se corrigió alterando el historial.
4. **Autorización de producción:** sigue pendiente y es necesaria antes de migrar
   o publicar allí. No hay una estimación temporal defendible mientras falten la
   decisión sobre clientes antiguos y la validación de la migración.

## Evidencia local

```text
test-results/preview-all-local-2026-10-18.txt
test-results/supabase-phase2/rls-cas-rollback-2026-10-18.json
test-results/supabase-phase2/runs/19788350-ea75-42e7-acc3-fd23ef36a098/report.json
test-results/supabase-phase2/runs/19788350-ea75-42e7-acc3-fd23ef36a098/manifest.json
test-results/supabase-phase2/demo-initialization.json
test-results/preview-site/report.json
test-results/preview-site/publication.json
test-results/preview-site/secret-scan.json
test-results/preview-site/desktop.png
test-results/preview-site/mobile.png
```

Los resultados locales están excluidos de Git y se adjuntan en el paquete de
revisión. No se deben sumar las comprobaciones locales, SQL y remotas como si
fueran una única batería de integración.
