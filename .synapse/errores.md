# Registro de Errores

## ERR-01: Validación de participación inconsistente
**Síntoma:** El código busca con acento, el formulario guarda sin (o viceversa). Los modales de instrucciones no se abrían automáticamente.
**Root Cause:** Hardcoding de strings en múltiples lugares (`page.tsx`, `orchestrator.ts`).
**Solución:** Centralización de opciones en `options.ts` y uso de índices o constantes.
**Estado:** ✅ FIXED

## ERR-02: API de comentarios sin soporte Postgres
**Síntoma:** Los comentarios no se guardaban ni recuperaban al usar Postgres.
**Root Cause:** El endpoint `/api/reports/[id]/comments` solo tenía lógica para MongoDB.
**Solución:** Implementada lógica SQL para GET, POST (append jsonb) y PUT (update jsonb item).
**Estado:** ✅ FIXED

## ERR-03: Fallo en Postgres con JSONB nulos
**Síntoma:** `jsonb_array_elements` fallaba si la columna `comments` era NULL.
**Root Cause:** Postgres no puede iterar sobre un valor nulo como si fuera un array.
**Solución:** Uso de `COALESCE(comments, '[]'::jsonb)` en todas las consultas de comentarios.
**Estado:** ✅ FIXED

## ERR-04: Robustez de red y fallos silenciosos
**Síntoma:** Peticiones `fetch` fallaban sin avisar al usuario, causando pérdida de datos.
**Root Cause:** Falta de bloques try/catch y feedback visual en `page.tsx`.
**Solución:** Implementación de `addToast` y manejo exhaustivo de errores en cada petición asíncrona.
**Estado:** ✅ FIXED

## ERR-05: Bloqueo de API por NEXT_PHASE
**Síntoma:** La API `/api/reports` devolvía vacío (`[]`) en producción.
**Root Cause:** Existía un chequeo de `process.env.NEXT_PHASE === 'phase-production-build'` que se quedaba activado debido al entorno de ejecución en PM2 tras la compilación.
**Solución:** Eliminación del bloque de validación innecesario.
**Estado:** ✅ FIXED

## ERR-06: Caché de Next.js 14 en queries de Neon
**Síntoma:** La API seguía devolviendo `0` informes tras corregir ERR-05, a pesar de que la base de datos tenía datos reales.
**Root Cause:** Next.js 14 monkey-patchea `fetch` y cachea de manera agresiva las peticiones HTTP fetch del driver serverless de Neon, causando que la query `COUNT(*)` devuelva permanentemente el valor `0` que leyó cuando la base de datos estaba vacía.
**Solución:** Configuración de `export const fetchCache = 'force-no-store'` en los endpoints afectados.
**Estado:** ✅ FIXED

## ERR-07: Acentos rotos en la plantilla PDF
**Síntoma:** En el PDF generado aparecen signos de pregunta (`?`) en palabras con acentos como `Participación`, `Valoración`, `Círculo`.
**Root Cause:** Codificación de caracteres incorrecta en la plantilla Nunjucks `report.njk`.
**Solución:** Corrección manual de los caracteres rotos en la plantilla.
**Estado:** ✅ FIXED

## ERR-08: Fallo al exportar DOCX en Postgres
**Síntoma:** La descarga de archivos DOCX devolvía error 404/500 en producción con Neon Postgres.
**Root Cause:** La ruta `/api/reports/[id]/.docx` solo tenía soporte programado para MongoDB (`ReportModel.findById`).
**Solución:** Implementación de soporte SQL Postgres en la ruta GET mediante consultas `SELECT data FROM reports WHERE id = ...`.
**Estado:** ✅ FIXED

## ERR-09: Caída silenciosa de IA a fallback determinístico por trazabilidad/secciones
**Síntoma:** El informe se generaba con formato "feo" tipo lista de campos crudos en vez de prosa narrativa y fluida, ignorando las directivas del prompt de la IA.
**Root Cause:** La IA de OpenAI devolvía tipos de datos incorrectos en `trazabilidad` (ej. `null` o números) o propiedades adicionales inesperadas en `secciones` (ej. `abordaje`), lo que hacía fallar la validación AJV (`validateReport(parsed)`) provocando que el orquestador capturara el error silenciosamente y cayera al "fallback determinístico".
**Solución:** Implementación de la utilidad `sanitizeReport` que limpia propiedades no especificadas de `secciones` y asegura coercitivamente que todos los elementos de `trazabilidad` sean strings y no nulos. Esto garantiza que la validación de AJV siempre sea exitosa y la IA retorne su prosa narrativa.
**Estado:** ✅ FIXED

## ERR-10: Superposición y desborde del membrete con el texto en el PDF
**Síntoma:** La cabecera del membrete se superponía con el título o las primeras líneas de la página de información.
**Root Cause:** Altura excesiva de la imagen del membrete al expandirse y margen superior físico (`38mm`) insuficiente, lo que no dejaba margen de separación entre el membrete y el cuerpo de la página HTML.
**Solución:** Ajuste del margen superior de la hoja a `45mm` tanto en las opciones de renderizado de Playwright (`render.ts`) como en los estilos CSS `@page` (`report.njk`), garantizando un aire libre de exactamente `16.6mm` bajo el membrete para un diseño prolijo y profesional.
**Estado:** ✅ FIXED

## ERR-11: Fallo de compilación Next.js por tipo no seguro en la sesión de usuario (2026-05-20)
**Síntoma:** `Failed to compile. Type error: 'session.user' is possibly 'undefined'.` en `src/app/form/page.tsx:599:27`.
**Root Cause:** En el callback de `setData`, se lee `session.user.name`. Como TypeScript no propaga ni estrecha tipos dentro de callbacks que pueden diferir en tiempo de ejecución, asume que `session` o `session.user` puede ser `undefined` a pesar del condicional `if (session?.user?.name)` externo.
**Solución:** Modificación a encadenamiento opcional `session?.user?.name || ''` para blindar el tipo y silenciar el compilador.
**Estado:** ✅ FIXED

## ERR-12: Caída del servicio y fallo al iniciar PM2 por tipo de módulo (2026-06-09)
**Síntoma:** El puerto 8000 del VPS no responde y el proceso de `informes-andar` no figura en `pm2 list` tras un reinicio del VPS. Al intentar ejecutar `pm2 start ecosystem.config.js` arroja error de formato indicando `ReferenceError: module is not defined in ES module scope`.
**Root Cause:** El archivo `ecosystem.config.js` utiliza exportación estilo CommonJS (`module.exports`), pero `package.json` declara `"type": "module"`. PM2 intenta cargarlo como un ES Module debido a la extensión `.js`. Además, el servicio no estaba guardado en PM2 para iniciarse tras el arranque del VPS.
**Solución:** Se inició el servicio utilizando `pm2 start ecosystem.config.cjs` (que ya estaba preparado pero no registrado) y se guardó la configuración en PM2 mediante `pm2 save`.
**Estado:** ✅ FIXED

## ERR-13: Congelamiento completo de VPS (Handshake Timeout) por falta de RAM (2026-06-10)
**Síntoma:** El VPS deja de responder en todos los puertos HTTP y las conexiones de SSH se quedan colgadas indefinidamente en el handshake (Timeout), a pesar de que el servidor físico responde a ping y abre puertos TCP.
**Root Cause:** El servidor ejecuta múltiples contenedores de Docker (7 apps) y múltiples procesos PM2 en Node/Next.js que acumulan un consumo elevado. El VPS de 8GB carecía por completo de espacio de intercambio (Swap). Al quedarse sin RAM física, el sistema operativo colapsó por sobrecarga en paginación (thrashing), congelando el espacio de usuario.
**Solución:** Se realizó un reinicio forzado del VPS desde DonWeb. Tras el arranque, se ejecutó `pm2 resurrect` para levantar todos los servicios, se habilitó el inicio automático de PM2 en el arranque mediante `pm2 startup` + `systemctl enable pm2-root`, y se creó un archivo **Swap de 4GB** (`/swapfile`) para absorber picos de memoria futuros y evitar bloqueos del sistema.
**Estado:** ✅ FIXED

## ERR-14: Fallo de compilación Next.js por incompatibilidad de tipo Buffer en import-excel (2026-06-22)
**Síntoma:** `Type error: Argument of type 'Buffer<ArrayBuffer>' is not assignable to parameter of type 'Buffer'.` en `src/app/api/youngs/import-excel/route.ts:41:30` durante el build.
**Root Cause:** En entornos de tipado de Next.js, `Buffer.from(await file.arrayBuffer())` retorna un tipo `Buffer<ArrayBuffer>` que no es asignable directamente al `Buffer` que requiere `workbook.xlsx.load()`.
**Solución:** Castear `buffer` como `any` (`buffer as any`) al pasarlo a `workbook.xlsx.load(buffer as any)`.
**Estado:** ✅ FIXED

## ERR-15: Error de sintaxis en form/page.tsx por paréntesis sin cerrar (2026-06-23)
**Síntoma:** El compilador arroja `Unexpected token div. Expected jsx identifier` en la línea del return principal.
**Root Cause:** Falta de un paréntesis de cierre `)` antes de la llave `}` en la sección de cierre de la tabla condicional de ítems (`taller.items.length === 0 ? ...`), y un tag `</div>` sin cerrar en la tarjeta del taller. Esto rompió el parsing de JSX del compilador SWC de Next.js.
**Solución:** Se añadió el `)` antes del `}` y el tag `</div>` correspondiente, restaurando la estructura de JSX correcta.
**Estado:** ✅ FIXED

## ERR-16: Error de sintaxis en youngs/page.tsx por escapes en template literal (2026-06-23)
**Síntoma:** El compilador arroja `Expected unicode escape` al parsear la función `handlePrintPcp`.
**Root Cause:** Presencia de barras invertidas de escape `\` antes de las comillas invertidas (backticks) y antes del símbolo `$` en la cadena de impresión (`printWindow.document.write(\`...` y `\${form.nombreCompleto}`).
**Solución:** Se eliminaron las barras de escape de la plantilla, permitiendo que Next.js compile y que las variables se evalúen dinámicamente en tiempo de ejecución.
**Estado:** ✅ FIXED
