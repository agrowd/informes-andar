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

## ERR-17: Celdas de apoyos de PCP importadas como timezone string largo (2026-06-23)
**Síntoma:** En la pestaña PCP, la columna "Apoyos" mostraba cadenas largas y confusas de zona horaria de JavaScript como `"Sat Apr 02 2022 21:00:00 GMT-0300..."`.
**Root Cause:** Celdas que contienen fracciones o niveles de apoyo (como `4/3`) son automáticamente interpretadas por Excel como fechas y guardadas como objetos `Date` por ExcelJS. La función `cleanText` al no discriminar tipos de objetos Date, los convertía a string usando `String(val)`.
**Solución:** Modificación de `cleanText` en `import-excel/route.ts` para capturar instancias de `Date` y convertirlas a una cadena limpia de texto `"mes/día"` (para niveles como `4/3`) o `"día/mes/año"` según corresponda.
**Estado:** ✅ FIXED

## ERR-18: Falta de actualización de UI/Historial post-fusión del Asistente (2026-06-23)
**Síntoma:** Tras importar un Excel exitosamente y generar el informe trimestral en el modal del asistente, la pestaña "Historial" en el perfil del joven no mostraba el nuevo informe a menos que el usuario recargara la página manualmente.
**Root Cause:** El modal `ExcelImportWizardModal` cerraba el flujo llamando a `onClose()` sin notificar al componente padre de la generación exitosa para actualizar su estado local.
**Solución:** Incorporación de la prop `onSuccess` en `ExcelImportWizardModal` para ejecutar callbacks específicos: en la pestaña de jóvenes recarga el historial de informes/evolución y cambia a la pestaña `historial` automáticamente; en la pestaña de borradores redirige al usuario a `/reports` para ver el resultado final.
**Estado:** ✅ FIXED

## ERR-19: Años hardcodeados (2024 y 2025) en descarga de Word (DOCX) del Informe Trimestral (2026-06-24)
**Síntoma:** Al descargar el informe trimestral en formato Word (.docx), la cabecera y títulos mostraban los años fijos "2024" y "2025" independientemente de los datos reales del concurrente.
**Root Cause:** La plantilla `templates/trimestral_template.docx` contenía texto plano hardcodeado "2024" y "2025" en lugar de utilizar placeholders, y el endpoint de descarga `api/reports/[id]/.docx/route.ts` no enviaba variables de año a docxtemplater.
**Solución:** Se reemplazó el texto estático por `{pcpAnio}` y `{periodoAnio}` en la plantilla de Word, y se actualizó el endpoint para consultar el PCP del joven realizando un JOIN en Postgres e inyectar dinámicamente ambos valores en `doc.setData()`.
**Estado:** ✅ FIXED

## ERR-20: Omisión de la solapa de PCP en el procesamiento de planillas mensuales (2026-06-24)
**Síntoma:** Al importar planillas de Excel que contenían PCP, a veces se intentaba parsear la solapa de PCP como una planilla mensual o viceversa, o se producían errores al buscar el nombre del joven.
**Root Cause:** La clasificación de las pestañas en `import-excel/route.ts` dependía de comparaciones exactas de strings que fallaban si la pestaña tenía espacios, prefijos o sufijos adicionales.
**Solución:** Se implementó una lógica de coincidencia flexible y caso-insensible en la solapa de PCP, y se pasó a excluirla del mapeo de planillas mensuales mediante la validación directa de su ID de hoja (`sheet.id === pcpSheet.id`).
**Estado:** ✅ FIXED

## ERR-21: Escalas SIS/GENCAT cruzadas por celdas mergeadas en Excel (2026-06-24)
**Síntoma:** Al importar un Excel con PCP, la escala SIS se llenaba con el valor "GENCAT" y viceversa.
**Root Cause:** Las celdas de escalas en el Excel están mergeadas (A21:C21 = "SIS", D21:F21 = "GENCAT"). El loop iteraba sobre las celdas de continuación del merge (B21, C21) como si fueran labels independientes. Al procesar C21 (valor "SIS"), miraba la celda siguiente D21 (valor "GENCAT") y lo asignaba erróneamente como el score de SIS.
**Solución:** Implementar un `Set<string>` (`foundScales`) para trackear qué escalas ya fueron procesadas y solo procesar la primera aparición de cada label. Además, validar que el valor siguiente no sea otro label de escala conocido (usando `isScaleLabel()`).
**Commit:** `d25abdb`
**Estado:** ✅ FIXED

## ERR-22: Date | null no asignable a Primitive en driver Neon SQL (2026-06-24)
**Síntoma:** Error de compilación TypeScript: `Type 'Date' is not assignable to type 'Primitive'` en la query de INSERT de youngs.
**Root Cause:** El driver `@neondatabase/serverless` (template literal SQL) no acepta objetos `Date` nativos de JavaScript como parámetros. Solo acepta tipos primitivos (string, number, boolean, null).
**Solución:** Convertir `pcpFechaNacimiento` a string ISO (`pcpFechaNacimiento.toISOString()`) antes de pasarlo a las queries SQL.
**Commit:** `d25abdb`
**Estado:** ✅ FIXED

## ERR-23: Sueño erróneo "SIS" y omisión de dimensión Bienestar Físico (BF) en importación de PCP (2026-06-24)
**Síntoma:** En el informe trimestral generado de Marisol Fernanda Brito figura `Meta o Sueño para 2026: SIS` y la dimensión `BF` no se importa del Excel.
**Root Cause:**
1. El parser de sueños en `import-excel/route.ts` escaneaba de forma estática las filas 18 a 20 de la columna A. En la fila 20 del Excel de Marisol dice `"SIS"` (es el label de la escala), tomando esto como sueño, mientras que el sueño real está en `A16`.
2. El parser de dimensiones del plan de futuro comenzaba en la fila 26, omitiendo la fila 25 que contenía la dimensión de Bienestar Físico (`BF`).
**Solución:** 
1. Se implementó una lógica de escaneo dinámica para sueños en la columna A, que inicia al encontrar `"SUEÑO"` / `"SUEÑOS"` y se detiene al toparse con `"SIS"` o `"PLAN DE FUTURO"`.
2. Se amplió el rango del bucle de dimensiones para comenzar en la fila 24, procesando correctamente la dimensión `BF` (fila 25).
**Commit:** `2a7de6f`
**Estado:** ✅ FIXED

