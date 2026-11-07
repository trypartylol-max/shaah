# Registrar mejoras de SHAAH en la Bitácora

Al terminar un trabajo autorizado de SHAAH o de su Torre de Control, registra una entrada breve en `public.shaah_control_journal`, proyecto Supabase `llpyxktcfubhmthqujpa`, usando el conector autenticado de Supabase. No hagas consultas periódicas ni crees automatizaciones para esto.

- Una entrada por entrega significativa, en español: título de hasta 200 caracteres y resumen de qué mejora para la persona, de hasta 12.000 caracteres. No copies conversaciones, credenciales, información de usuarios, datos personales ni notas privadas del repositorio.
- `source = 'chatgpt'`; `state = 'prepared'` si todavía no se ha publicado; `state = 'published'` solo tras verificar el despliegue correcto de esa entrega. La bitácora no publica software.
- `source_key = 'github:<owner/repo>:<SHA completo>'`, `source_url` = enlace HTTPS al commit verificado. Conserva el SHA exacto; no lo inventes. Para cambios locales sin commit, informa que falta registrarlos en lugar de inventar una referencia.
- Usa la fecha comprobada de entrega/publicación en `occurred_at`; si solo se conoce cuándo estás registrando el trabajo, usa `now()` y no atribuyas una fecha histórica inventada.
- SQL con parámetros o literales correctamente escapados. `ON CONFLICT (source_key) DO NOTHING` evita duplicados y conserva las ediciones humanas. Para actualizar una entrada preparada a publicada, lee su revisión y actualiza solo `state`, `source_url` y la fecha de publicación con control de revisión; conserva título y cuerpo editados.
- No cambies RLS, permisos, usuarios, incidencias, revisiones o bases PRODUCT para registrar una entrada. Nunca incorpores claves de servicio al navegador o al repositorio.
- Si falla el conector, conserva el trabajo completado e informa que el registro en Bitácora quedó pendiente. No afirmes que se guardó.

La interfaz privada permite escribir o editar manualmente sin categorías, conservando la procedencia, fecha y referencia original. Las instrucciones solo se aplican a agentes que trabajen en estos repositorios; cambios realizados fuera de este flujo se añaden manualmente.
