# Registro de Conversación - 2026-06-10 (Caída General del Servidor VPS / Handshake Timeout)

## Usuario:
- Reportó que no puede acceder a ningún puerto del VPS y preguntó qué pasó. Compartió una captura de pantalla de DonWeb indicando consumo de RAM > 100%.

## Antigravity:
- **Diagnóstico de Red e IP**: Comprobó que el VPS responde al comando `ping` con latencia baja (~30ms) y que los puertos `5782` (SSH) y `8000` (Next.js) están abiertos a nivel de red TCP.
- **Identificación de Bloqueo a Nivel de Aplicación**: Encontró que las conexiones a nivel de aplicación (handshake de SSH y peticiones HTTP `curl` locales) se quedan colgadas de forma indefinida sin responder.
- **Diagnóstico**: Este comportamiento es típico de un servidor que ha agotado sus recursos físicos (RAM, CPU o espacio de almacenamiento). Los procesos del sistema quedan bloqueados en I/O o thrashing (intercambio masivo de memoria virtual con el disco), lo que impide que procesen cualquier conexión entrante, a pesar de que el kernel de red responda a los pings y a la apertura de sockets TCP.
- **Recomendación**: Solicitar al usuario un reinicio forzado desde el panel de control de DonWeb para reestablecer el servidor.
- **Post-reinicio & Resurrección**: Una vez encendido el VPS, ejecutó `pm2 resurrect` a través de SSH para levantar todas las aplicaciones caídas (incluyendo `informes-andar`).
- **Autostart de PM2**: Configuró `pm2 startup` y habilitó el servicio `pm2-root.service` en systemd para que los procesos de PM2 inicien solos en el arranque del servidor.
- **Creación de SWAP**: Creó y habilitó de forma persistente un **Swap file de 4GB** (`/swapfile`) en el sistema de almacenamiento SSD para actuar como buffer ante futuros picos de consumo de RAM.
- **Verificación**: Comprobó que todos los puertos están en escucha (`ss -tlnp`), y que la web en port 8000 responde exitosamente con redirección HTTP 307.

# Registro de Conversación - 2026-06-23 (Planificación de Importación Excel, PCP, Fusión y Formularios Libres)

## Usuario:
- Solicitó poder importar y exportar planillas de Excel con PCP y de 1 a 3 meses para consolidar reportes trimestrales.
- Pidió mejoras en la gestión, creación y asignación de PCP para los concurrentes (alumnos).
- Solicitó optimizar la selección de borradores para la creación del reporte.
- Solicitó que los facilitadores puedan crear borradores desde cero para ser interpretados por la IA.

## Antigravity:
- Analizó el estado actual del importador de Excel y del generador trimestral con IA.
- Diseñó un plan de implementación que abarca:
  1. Un asistente modal interactivo post-importación de Excel (`ExcelImportWizardModal`) para realizar fusiones directas con los meses importados.
  2. Rediseño de la pestaña PCP en Jóvenes con estados vacíos ("Empty State") y agrupamiento visual por tarjetas de las 8 dimensiones, rutinas y resultados de escalas.
  3. Rediseño de la selección de borradores en `/forms` mediante un panel de control flotante animado al pie de página.
  4. Soporte para inicializar y limpiar checklists mensuales a blanco desde cero en `/form`.
- Creó el artefacto `implementation_plan.md` y actualizó la memoria de la sesión actual en el synapse workcycle.

# Registro de Conversación - 2026-06-23 (Continuación - Finalización y Estabilización)

## Usuario:
- Solicitó finalizar la tarea y avisar cuando esté todo desplegado.

## Antigravity:
- **Corrigió errores de compilación críticos**:
  - Resolvió un error de sintaxis en `src/app/form/page.tsx` agregando el tag `div` de cierre faltante en el maquetado del taller, y restaurando el paréntesis de cierre del ternary operator.
  - Resolvió un error de sintaxis en `src/app/youngs/page.tsx` removiendo los escapes de barra invertida (`\`) de los backticks y las llaves de variables (`$`) en la plantilla de impresión de la PCP.
- **Validó compilación y tests**:
  - Ejecutó `npm run build` local exitosamente con cero errores.
  - Corrió la suite de tests unitarios de Vitest (`npm run test`) exitosamente.
- **Despliegue y Sincronización en Producción (VPS)**:
  - Sincronizó todos los cambios locales en el repositorio remoto de GitHub de forma exitosa usando la redirección de protocolo SSH.
- **Actualizó Synapse Cortex**:
  - Documentó la resolución de errores en `.synapse/errores.md`.
  - Añadió la versión `[1.7.0]` en `.synapse/changelog.md`.
  - Actualizó la bitácora de progreso en `.synapse/workcycle.md`.

# Registro de Conversación - 2026-06-23 (Estandarización de Fechas PCP de Excel e Integración de UI)

## Usuario:
- Preguntó si se puede subir el Excel de un joven con la PCP y el Excel mensual y que se genere toda la división (perfil del joven con su PCP e historial) como en el perfil de Juan Pablo, facilitando el proceso, y que a partir de eso se genere el informe trimestral sumando los 3 borradores.

## Antigravity:
- Analizó el comportamiento actual del importador de Excel y del asistente de fusión post-importación.
- **Corrigió el formateo de celdas de fecha en la importación de PCP**: Celdas con fracciones de apoyo (ej: "4/3") eran convertidas por Excel a fechas (`2022-04-03`) y guardadas como strings de zona horaria de JS largos en la DB. Se actualizó `cleanText` para formatearlas limpiamente como "mes/día" o "día/mes/año".
- **Mejoró la robustez de escaneo del importador**: Escanea dinámicamente las primeras 6 filas buscando facilitadores y talleres, logrando compatibilidad con el diseño exacto de `Juan Pablo Herrera .xlsx`.
- **Integró el callback `onSuccess` en `ExcelImportWizardModal`**:
  - En la pestaña de jóvenes (`/youngs`), tras generar con éxito el reporte trimestral, se recargan de forma instantánea el historial de reportes y la evolución, y se activa automáticamente la pestaña "Historial".
  - En la sección de borradores (`/forms`), tras una generación exitosa, redirige al usuario a la página `/reports` para ver su nuevo informe trimestral.
- Ejecutó `npm run build` y `npm run test` con éxito (0 errores, todas las pruebas pasadas).
- Actualizó la bitácora y los archivos de memoria en `.synapse/`.

# Registro de Conversación - 2026-06-24 (Resolución de Márgenes, Años en DOCX y Redacción en Presente)

## Usuario:
- Solicitó exportar el PDF con el membrete que no se coma el texto, configurando márgenes similares a los de Word para que se pueda descargar correctamente.
- Reportó errores con respecto a los años en el informe trimestral (años hardcodeados) y exigió que la redacción de los informes trimestrales generados esté estrictamente en tiempo presente.
- Preguntó si la importación e interpretación completa del Excel con la PCP y los meses ya funciona a la perfección.

## Antigravity:
- **Estandarizó los Márgenes del PDF**:
  - Unificó el margen superior en `45 mm` y los laterales/inferior en `25.4 mm` (margen de Word) tanto en las opciones de impresión de Playwright (`src/lib/pdf/render.ts`) como en los estilos CSS `@page` en `report.njk` and `trimestral/route.ts`.
  - Con esto, la cabecera membretada institucional se posiciona elegantemente en todas las páginas sin solaparse ("comerse") el texto de los informes.
- **Alineó Años Dinámicos en la Plantilla de Word (DOCX)**:
  - Reemplazó los años fijos ("2024" y "2025") en el archivo XML de `templates/trimestral_template.docx` por los campos dinámicos `{pcpAnio}` y `{periodoAnio}`.
  - Modificó `src/app/api/reports/[id]/.docx/route.ts` para realizar un JOIN en PostgreSQL para obtener la PCP del joven (`youngs.pcp`) e inyectar `pcpAnio` y `periodoAnio` en `doc.setData()`.
- **Redacción de la IA estrictamente en Tiempo Presente**:
  - Modificó la instrucción en `src/lib/ai/quarterlyGenerator.ts` para que OpenAI redacte los textos trimestrales estrictamente en tiempo presente.
  - Reescribió las narrativas de fallback determinísticas del generador trimestral para estar redactadas en presente.
- **Optimización y Validación del Importador Excel**:
  - Robusteció el parser en `src/app/api/youngs/import-excel/route.ts` con búsquedas flexibles y caso-insensibles del PCP y escaneo dinámico de filas para metadatos (facilitador, taller).
  - Corrió localmente el script `scratch/test_full_flow.ts` verificando que todo el flujo (importar Excel real, fusionar checklists de 3 meses, redactar con IA en presente y generar el DOCX con años dinámicos) funciona perfectamente.
  - Ejecutó las pruebas unitarias (`npm run test`) exitosamente.
  - Realizó el commit y push correspondiente a origin main de GitHub de manera exitosa.

# Registro de Conversación - 2026-06-25 (Reconocimiento de SIS por Vision y Metadatos de Perfil en Trimestrales)

## Usuario:
- Solicitó que la escala SIS, que también viene como una imagen embebida en la solapa PCP del Excel, sea reconocida automáticamente mediante la API OpenAI Vision al importar.
- Solicitó que al realizar la generación del informe trimestral se consoliden/sumen los datos de los 3 meses mensuales y la PCP, y que también se inyecten los datos del joven cargados en el perfil (DNI, Legajo, Obra Social, Fecha de Nacimiento) para que el informe trimestral en formato Word y PDF se genere perfectamente completo.
- Aclaró posteriormente que el informe trimestral es en formato Word (.docx), no Excel.

## Antigravity:
- **Reconocimiento por Vision de la Escala SIS**:
  - Implementó la función `parseSisChartWithVision` en `import-excel/route.ts` utilizando OpenAI Vision para extraer puntuaciones cuantitativas del gráfico radial de la escala de intensidad de apoyos (SIS) a partir de la imagen embebida.
  - Refactorizó el extractor de imágenes en la importación de Excel para clasificar las imágenes del rango de filas 18-23 por columna: si caen en las columnas A-C se clasifican como `sisBase64` y se envían a parsear; si caen en D-G se clasifican como `gencatBase64`.
- **Inyección de Metadatos de Perfil en Informe Trimestral (Word/PDF)**:
  - Modificó `api/reports/trimestral/route.ts` para renderizar el DNI, Legajo, Obra Social, Nacimiento en la cabecera HTML/PDF del informe trimestral y guardar `source_report_ids` como array de enteros en Postgres.
  - Modificó `.docx/route.ts` inyectando los campos de perfil del concurrente mediante múltiples variantes de variables para asegurar la compatibilidad con cualquier diseño de la plantilla oficial de Word.
  - Modificó `api/forms/[id]/export-excel/route.ts` para rellenar la solapa `PCP` del Excel mensual exportado de manera dinámica con la PCP y datos personales de la base de datos de jóvenes.
- **Creada la API de Exportación de Reportes a Excel**:
  - Creó la API `/api/reports/[id]/export-excel/route.ts` para exportar reportes (mensuales o consolidados trimestrales) sumando/tomando los niveles máximos de habilidades de los meses de origen.
- **Verificación de Calidad y Estructura**:
  - Ejecutó con éxito la compilación del proyecto Next.js (`npm run build`) validando tipos de TypeScript y corrigiendo la inyección de arrays de Postgres mediante string arrays (`::int4[]`).
  - Corrió un script de test local corroborando que las variables y celdas de PCP en el Excel se rellenan de manera impecable.

# Registro de Conversación - 2026-06-28 (Edición/Carga de Word Personalizado y Reemplazo de "Borradores" por "Cuadrícula Mensual")

## Usuario:
- Solicitó agregar la funcionalidad de editar los Word generados mediante un "pseudo Word" integrado en el sistema, o que puedan descargarse, editarse y luego volver a importarse como actualización (o ambas opciones).
- Pidió que al ser aprobados queden guardados en la base de datos tanto el original generado como el Word final editado.
- Pidió reemplazar toda aparición de la palabra "Borradores" por "Cuadrícula Mensual" en la interfaz.

## Antigravity:
- **Evolución del Backend y DB**:
  - Creó la migración SQL `add-docx-edit-columns.sql` y el script `run-docx-migration.js` para añadir las columnas `original_data` (copia original del JSON de la IA), `edited_docx_base64` (archivo Word editado subido), `edited_docx_filename` y `edited_at` a la tabla `reports`. Ejecutó la migración en Postgres Neon con éxito.
  - Actualizó el esquema Mongoose `ReportSchema` en `src/models/Report.ts` para dar soporte a estos nuevos campos en MongoDB.
- **Implementación del Endpoint de Importación de Word**:
  - Creó `/api/reports/[id]/upload-docx` para procesar la subida del archivo `.docx` editado localmente. Utiliza Mammoth para extraer su texto y segmentar inteligentemente en las 12 secciones oficiales mediante expresiones regulares flexibles, actualizando el JSON del informe y guardando el archivo Word físico completo en base64 en la base de datos.
- **Descarga Inteligente de Word**:
  - Modificó `/api/reports/[id]/.docx/route.ts` para devolver directamente el archivo Word editado físico si existe. Si no existe (o si se pasa `original=true` in the URL), se genera dinámicamente con los datos originales.
- **Diseño del "Pseudo-Word Editor" en el Frontend**:
  - Diseñó e integró un editor con interfaz visual que simula una página A4 de Word en `reports/[id]/page.tsx` para cuando el usuario edita el texto. Incluye barra de herramientas para guardar/cancelar y para importar/descargar.
  - Implementó la visualización de un banner destacado si existe un Word personalizado, y de botones diferenciados para descargar la versión original de IA y la versión editada.
  - Normalizó la lectura de secciones para que no falle en informes trimestrales donde las secciones son strings en lugar de arrays de fragmentos.
- **Renombrado visual a Cuadrícula Mensual**:
  - Realizó reemplazos completos de los textos que decían "Borrador/es" por "Cuadrícula/s Mensual/es" en Nav, Dashboard, listados e importador de Excel.
- **Validación**:
  - Compiló Next.js (`npm run build`) para verificar la consistencia del código.
