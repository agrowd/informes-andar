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
  - Añadió `src/app/_components/ExcelImportWizardModal.tsx` al script de despliegue `scratch/deploy_files.mjs`.
  - Corrió `node scratch/deploy_files.mjs` para subir en caliente todos los componentes, endpoints y vistas actualizadas al servidor.
  - Ejecutó las migraciones en el VPS, reconstruyó el build de producción Next.js y reinició PM2 exitosamente (proceso online estable).
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
  - Unificó el margen superior en `45 mm` y los laterales/inferior en `25.4 mm` (margen de Word) tanto en las opciones de impresión de Playwright (`src/lib/pdf/render.ts`) como en los estilos CSS `@page` en `report.njk` y `trimestral/route.ts`.
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
- **Despliegue y Commit**:
  - Corrió `node scratch/deploy_files.mjs` para subir en caliente todos los cambios al VPS de producción, realizar la compilación exitosa y reiniciar PM2.
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
  - Modificó `/api/reports/[id]/.docx/route.ts` para devolver directamente el archivo Word editado físico si existe. Si no existe (o si se pasa `original=true` en la URL), se genera dinámicamente con los datos originales.
- **Diseño del "Pseudo-Word Editor" en el Frontend**:
  - Diseñó e integró un editor con interfaz visual que simula una página A4 de Word en `reports/[id]/page.tsx` para cuando el usuario edita el texto. Incluye barra de herramientas para guardar/cancelar y para importar/descargar.
  - Implementó la visualización de un banner destacado si existe un Word personalizado, y de botones diferenciados para descargar la versión original de IA y la versión editada.
  - Normalizó la lectura de secciones para que no falle en informes trimestrales donde las secciones son strings en lugar de arrays de fragmentos.
- **Renombrado visual a Cuadrícula Mensual**:
  - Realizó reemplazos completos de los textos que decían "Borrador/es" por "Cuadrícula/s Mensual/es" en Nav, Dashboard, listados e importador de Excel.
- **Validación**:
  - Compiló Next.js (`npm run build`) para verificar la consistencia del código.

# Registro de Conversación - 2026-09-10 (Centricidad en la Persona, Integración vs Inclusión, y Enfoque en Habilidades/Estrategias/Apoyos)

## Usuario:
- "En los informes, en los trimestrales y el final, hacer mas incapie en toda la informacion que tenes disponible, que no sea tan reiterativo, tan chatgpt, que no se hable tanto del facilitador, sino que es centrado en la persona a la que se le hizo el informeel foco tiene que ser la persona, la institucion es un apoyo al igual que el facilitador, en vez de inclusion poner integracion. El protagonista es el joven, en el informe tienen que estar las estrategias, las habilidades, los apoyos"

## Antigravity:
- **Centricidad en la Persona (El Protagonista es el Joven)**:
  - Se reconfiguraron los motores de IA (`quarterlyGenerator.ts`, `finalReportGenerator.ts`, `merge.ts` y `system_prompt.md`) para que el concurrente sea el centro y protagonista activo de cada párrafo.
  - Se eliminaron y sanitizaron fórmulas centradas en el facilitador ("La facilitadora acompaña...", "Su relación con la facilitadora es de confianza...", "Bajo la guía del facilitador..."), reenfocándolas hacia la agencia, decisiones y participación de la persona.
- **Sustitución Mandatoria de "Inclusión" por "Integración"**:
  - Se erradicó por completo la palabra "inclusión" o "inclusivo/a" tanto en las instrucciones de prompt como mediante filtros automáticos de sustitución por expresiones regulares, reemplazándolas por "integración", "integración social", "integración comunitaria" y "espacios integradores".
- **Enfoque Rico en Habilidades, Estrategias y Apoyos (Anti-ChatGPT / Anti-Reiterativo)**:
  - Se incorporaron directivas para anclar cada una de las 12 secciones en los datos concretos de las planillas: habilidades evaluadas en talleres (con niveles 1 al 4), estrategias prácticas y de autorregulación (apoyos visuales, secuencias por pasos, anticipación, pausas activas), y modalidad de apoyos (supervisión a distancia, apoyos verbales, apoyos físicos puntuales).
  - Se enriqueció el sistema de variabilidad sintáctica en la apertura de oraciones, suprimiendo la repetición del nombre de la persona o fórmulas formulaicas ("A lo largo del ciclo...") al inicio de los párrafos a partir de la sección 2.
- **Validación y Despliegue en Producción**:
  - Se ejecutó `npm run build` local exitoso (0 errores TypeScript).
  - Se desplegaron los archivos al VPS de producción vía SFTP (`scratch/deploy_files.mjs`), se compiló remotamente y se reinició PM2 con código de salida 0.
  - Se probó la generación real del Informe Final Anual de Yamila Inés Legarreta (ID 15) contra PostgreSQL y OpenAI GPT-4o, verificando 0 apariciones de "inclusión" (100% "integración"), sujeto activo centrado en la persona y presencia concreta de habilidades, estrategias y apoyos.

# Registro de Conversación - 2026-09-11 (Rediseño Estructural del Informe Final y Plan de Abordaje Centrado en la Persona)

## Usuario:
- "Vamos a cambiar el diseño, estructura y demas cosas del final, con toda la informacion que se tiene del joven en todos los informes, va a tener la estructura y llenar la informacion que te dejo en descargas Miriam Gallardo .docx . Analizalo todo para que tenga sentido. Incluyendo el plan de abordaje, lo que no entendes buscalo en internet. No inventes nada"
- "es inclusion, no integracion, es alreves"

## Antigravity:
- **Análisis Exhaustivo del Modelo Miriam Gallardo**:
  - Se analizó el documento `C:\Users\Try Hard\Downloads\Miriam Gallardo .docx` descomprimiendo su XML y extrayendo su estructura fidedigna.
  - Se identificó la división mandatoria en dos partes: 1) Informe Final PCP con tabla de 8 dimensiones y 4 áreas de logros; 2) Plan de Abordaje Centrado en la Persona con 6 líneas de acción por ejes, indicadores y lineamientos para facilitadores.
- **Corrección Terminológica: INCLUSIÓN Mandatoria**:
  - Se acató la corrección expresa: el paradigma rector de Granja Andar es la **INCLUSIÓN** (Inclusión Social, Inclusión comunitaria, espacios inclusivos). Se erradicó el uso forzado de "integración".
  - Se prohibió de forma estricta el uso de vocabulario pedagógico o de escuela/CET.
- **Desarrollo de Plantilla Fiel DOCX (`templates/final_template.docx`)**:
  - Construida directamente a partir del archivo de Word original con 45 tags de `docxtemplater`, preservando encabezados, membrete institucional, tablas y formatos.
- **Motor de IA Reestructurado (`finalReportGenerator.ts`)**:
  - Generador con GPT-4o que produce `parte1_informeFinal`, `parte2_planAbordaje` y el mapeo para `secciones`.
  - Anclado 100% en los 4 momentos del año (Trimestral 1 de verano, Mensuales 1 de talleres, Trimestral 2, y Mensuales 2 de natación y talleres) y el PCP.
- **Componente Web y Edición Interactiva (`FinalReportViewer.tsx`)**:
  - Creado visor y editor para la página `/reports/[id]` con tarjetas para cada eje, semáforos para las 8 dimensiones y persistencia a través de `PUT /api/reports/[id]`.
- **Pruebas y Despliegue en Servidor**:
  - Verificado end-to-end con Yamila Legarreta (ID 15 / Report #104), logrando un documento Word de 56 KB con 0 errores de etiquetas y 100% de coherencia institucional.
  - Desplegado a producción en el VPS (`149.50.128.73:5782`) con PM2 activo y online.

# Registro de Conversación - 2026-09-14 (Diagnóstico Comparativo Nicolás Maita: Excel vs Sistema)

## Usuario:
- "Segui con este Analiza el archivo de descargas NICOLAS MAITA.xlsx y comparalo con la cuadricula que esta subido al sistema, por que no es igual? que paso?"

## Antigravity:
- **Diagnóstico Exhaustivo (Excel vs Sistema)**:
  1. **En el Excel (`NICOLAS MAITA.xlsx`)**:
     - Solapa `JULIO`: Contiene los 8 talleres reales de Buenos Mozos (Marina Trejo): Arte Reciclado, Desarrollo Personal, Huerta Sumemos Verde, Derechos, Habilidades de Interacción, Bienestar Emocional, Deporte.
     - Posee **80 habilidades evaluadas** con niveles 2 y 4 (marcadas en color cian `#46BDC6`).
     - Posee **2.777 caracteres de observaciones reales** que detallan la adaptación y las actividades de la Semana Invernal de Julio (kermés, salida al cine en Nine Shopping de Moreno, Polideportivo Maradona).
  2. **En el Sistema (Base de Datos)**:
     - **Formulario #280 (JULIO)**: Creado hoy a las 11:36 hs desde `/form`. Tiene la plantilla estándar por defecto (`DEFAULT_TALLERES`: Deporte, Viajar, Habilidades Sociales, Musicoterapia, Manos Verdes) con **0 ítems evaluados** y **0 observaciones**.
     - **Formulario #139 (rotulado como AGOSTO)**: Tenía asignados talleres de Catering, Cocina y BPM (ajenos a Buenos Mozos), pero con el texto de observaciones de Julio pegado erróneamente.
  3. **Causa Raíz de la Discrepancia**:
     - El Formulario #280 se guardó desde el formulario web manual sin importar el Excel.
     - El importador de Excel (`/api/youngs/import-excel`) exigía el prefijo `TALLER:`, por lo que al procesar planillas de Buenos Mozos de Marina Trejo (que usan códigos de dimensión como `ARTE "RECICLADO" / DP - BM`) ignoraba las cabeceras y descartaba todas las habilidades.
- **Solución Aplicada**:
  - Se actualizó el reconocedor de talleres en `src/app/api/youngs/import-excel/route.ts` para capturar sufijos de dimensiones y nombres institucionales directos sin prefijo.
  - Se sincronizó el Formulario #280 en PostgreSQL Neon con los 8 talleres reales, 80 habilidades evaluadas y los 2.777 caracteres de observaciones.
  - Se compiló y desplegó en el VPS de producción.

# Registro de Conversación - 2026-09-14 (Verificación Exacta con Excel y Depuración de Sobrantes)

## Usuario:
- "Nicolas maita quedo bien exactamente como el excel entonces? lo que sobre sacalo"

## Antigravity:
- **Verificación Exhaustiva Excel vs Sistema**:
  1. **Excel Fuente (`NICOLAS MAITA.xlsx`)**:
     - Contiene estrictamente 2 solapas: `PCP` y `JULIO`. No existe ninguna solapa de `AGOSTO`.
     - La solapa `JULIO` cuenta con 8 talleres de Buenos Mozos, 80 habilidades evaluadas (niveles 2 y 4 en color cian `#46BDC6`) y 2.777 caracteres de observaciones.
  2. **Depuración de Sobrantes en Base de Datos**:
     - Se identificó que el **Formulario #139** (rotulado históricamente como `AGOSTO`) era un residuo de pruebas tempranas con 4 talleres de catering ajenos a Buenos Mozos y una copia del texto de Julio.
     - Se verificó que ningún informe dependiera del Formulario #139 (`[]`).
     - **Se eliminó permanentemente el Formulario #139 de PostgreSQL Neon** (`DELETE FROM forms WHERE id = 139`).
  3. **Estado Final de Nicolás Agustín Maita (ID 38)**:
     - Permanece única y exclusivamente su **Formulario #280** (`2026-07` / `JULIO`), 100% idéntico al Excel celda por celda: 8 talleres, 80 habilidades evaluadas y sus 2.777 caracteres de observaciones literales de Marina Trejo.
     - Creado por facilitadora ID 10 (Marina Trejo), grupo `Buenos Mozos`.

# Registro de Conversación - 2026-09-14 (Sincronización Exacta de Barraza, Camilo Federico y Purga de Sobrantes)

## Usuario:
- "Hacer lo mismo con el de BARRAZA, CAMILO FEDERICO que esta en descargas, verifica que la cuadricula mensual este bien, con todos los talleres y bien marcado etc etc y lo que sobra sacalo"

## Antigravity:
- **Diagnóstico Comparativo Excel vs Sistema**:
  1. **Excel Fuente (`BARRAZA, CAMILO FEDERICO.xlsx`)**:
     - Solapas: `PCP`, `ABRIL`, ` MAYO` y `JUNIO`.
     - Abril: 9 talleres reales de Buenos Mozos, 80 ítems (79 evaluados), 2.552 caracteres de observaciones.
     - Mayo: 8 talleres reales, 80 ítems (80 evaluados), 4.373 caracteres de observaciones.
     - Junio: 8 talleres reales, 88 ítems (88 evaluados), 5.805 caracteres de observaciones.
  2. **Discrepancia en Base de Datos**:
     - Los Formularios #131, #132 y #133 tenían sólo 4 o 5 talleres porque los talleres posteriores a `DERECHOS` (`HABILIDADES SOCIALES`, `HABILIDADES DE INTERACCIÓN`, `BIENESTAR EMOCIONAL`, `DEPORTE`) no tenían prefijo `TALLER:` y se habían agrupado erróneamente en un bloque masivo de 44 ítems.
     - Existían 4 informes trimestrales para el mismo período (`2026-06 – 2026-04`), siendo 3 de ellos (#21, #35 y #37) borradores viejos duplicados de agosto.
- **Acciones Realizadas**:
  1. Se sincronizaron celda por celda los Formularios #131 (Abril: 9 talleres, 80 ítems), #132 (Mayo: 8 talleres, 80 ítems) y #133 (Junio: 8 talleres, 88 ítems) con el 100% de los talleres discriminados y niveles exactos según los checks del Excel.
  2. Se vincularon formalmente a Marina Trejo (`created_by = 10`, grupo `Buenos Mozos`).
  3. **Se eliminaron los 3 reportes trimestrales duplicados y obsoletos** (IDs #21, #35 y #37), conservando únicamente el Informe Trimestral #116 oficial reciente.

# Registro de Conversación - 2026-09-14 (Sincronización Exacta de Franco Luciano Martinez y Purga de Sobrantes)

## Usuario:
- "hace lo mismo con FRANCO LUCIANO MARTINEZ"

## Antigravity:
- **Diagnóstico Comparativo Excel vs Sistema**:
  1. **Excel Fuente (`FRANCO LUCIANO MARTINEZ.xlsx`)**:
     - Solapas: `PCP`, `MAYO` y `JUNIO`.
     - Mayo: 8 talleres reales de Buenos Mozos, 80 ítems (80 evaluados > 0), 4.688 caracteres de observaciones.
     - Junio: 8 talleres reales, 88 ítems (88 evaluados > 0), 5.598 caracteres de observaciones.
  2. **Discrepancia en Base de Datos**:
     - Los Formularios #134 y #135 tenían sólo 4 talleres porque los talleres posteriores a `DERECHOS` no tenían prefijo `TALLER:` y se habían absorbido en un bloque de 44 ítems.
     - Existían 2 informes trimestrales, siendo el Reporte #23 un borrador obsoleto de agosto.
- **Acciones Realizadas**:
  1. Se sincronizaron celda por celda los Formularios #134 (Mayo: 8 talleres, 80 ítems evaluados) y #135 (Junio: 8 talleres, 88 ítems evaluados) con sus 8 talleres discriminados y niveles exactos.
  2. Se vincularon formalmente a Marina Trejo (`created_by = 10`, grupo `Buenos Mozos`).
  3. **Se eliminó el reporte trimestral obsoleto #23**, conservando únicamente el Informe Trimestral #130 oficial reciente.

# Registro de Conversación - 2026-09-14 (Erradicación de Gastronomía en Buenos Mozos y Alineación con INCLUSIÓN)

## Usuario:
- "Me salen cosas de gastronomia cuando no deberia de ser asi ya que no hay talleres en buenos mozos que diga eso. que es lo que pasa? lee el trimestral que genere que esta en descargas de franco martinez"

## Antigravity:
- **Análisis del Archivo Word Generado**:
  - Se leyó `informe-trimestral-Martinez_Franco_Luciano-Buenos_Mozos-2026-09-14.docx` mediante `mammoth`.
  - Se confirmó que en la Sección 1 ("¿Ha alcanzado su meta o sueño 2026?"), figuraba: *"despliega habilidades prácticas en el taller de gastronomía, donde explora técnicas culinarias y se familiariza con el uso de utensilios de cocina..."*.
- **Identificación de la Causa Raíz**:
  1. En `src/lib/ai/quarterlyGenerator.ts`, el contexto institucional para Buenos Mozos tenía hardcodeado: `Buenos Mozos (Formación Sociolaboral y Gastronomía)` y `rotisería, salón, comensales`.
  2. La directiva de adaptación curricular de la línea 330 instruía enfocar Buenos Mozos en "rotisería/salón".
  3. En el fallback determinístico, `isCatering` incluía a `buenos mozos`.
  4. En el PCP de Franco Martinez figura como sueño personal: *"Cocinar ravioles solo"*, lo que provocó que el modelo GPT-4o creyera que existía un taller institucional de gastronomía en Buenos Mozos para cumplir esa meta.
  5. Existían directivas obsoletas que forzaban el reemplazo de "inclusión" por "integración", contraviniendo la Decisión D-70.
- **Acciones y Solución**:
  1. Se reescribió la identidad curricular de Buenos Mozos en `src/lib/ai/quarterlyGenerator.ts` con sus 7 talleres reales de Marina Trejo (Arte Reciclado y Fotografía, Desarrollo Personal y Vida Independiente, Huerta 'Sumemos Verde', Derechos a ser Protagonistas, Habilidades Sociales e Interacción, Bienestar Emocional 'Expresando' y Deporte 'Activando').
  2. Se introdujo una regla explícita prohibiendo terminantemente atribuir talleres de cocina o gastronomía a Buenos Mozos, y ordenando que si el sueño del concurrente es culinario (ej: cocinar en su hogar), se aborde desde la autonomía personal en la vida diaria sin inventar talleres institucionales.
  3. Se desacopló Buenos Mozos de catering en el fallback determinístico.
  4. Se corrigieron los filtros de sanitización y directivas del prompt para garantizar el paradigma obligatorio de **INCLUSIÓN** (D-70).
  5. Se validó la generación mediante test automatizado (`scratch/test_franco.mjs`), confirmando CERO menciones de gastronomía/cocina en talleres y 100% de uso de inclusión.
  6. Se compiló el proyecto (`npm run build`), se desplegó por SFTP al VPS de producción (`149.50.128.73:5782`) y se reinició PM2 (`pm2 restart ecosystem.config.cjs --update-env`).
  7. Se actualizó el reporte trimestral de Franco Martinez en la base de datos con la nueva narrativa limpia y fidedigna.

# Registro de Conversación - 2026-09-14 (Fidelidad Curricular Universal a las Cuadrículas Mensuales en IA)

## Usuario:
- "El mismo problema puede ser que este en otros grupos? tienen que reflejar los talleres que aparecen en las cuadriculas mensuales, no alucinar"

## Antigravity:
- **Confirmación del Problema en Otros Grupos**:
  - Se confirmó que el generador trimestral (`quarterlyGenerator.ts`) contenía directivas con menús de talleres fijos por grupo que inducían a la IA a alucinar actividades no cursadas por el joven (ej: en Emprendedores forzaba pastelería/catering incluso para jóvenes con rol auxiliar/limpieza; en Artesanos mencionaba campamentos o show de talentos; en Atrapasueños mencionaba bochas).
- **Solución Universal Implementada**:
  1. Se modificó `quarterlyGenerator.ts` para extraer de forma dinámica y canónica los talleres y habilidades efectivamente evaluados en las cuadrículas mensuales de cada joven (`forms[].data.talleres`).
  2. Se inyecta la sección obligatoria `TALLERES REALES Y HABILIDADES EVALUADAS EN LAS CUADRÍCULAS DE [JOVEN]`, eliminando los menús estáticos de grupo.
  3. Se instauró una directiva universal que prohíbe terminantemente alucinar talleres estereotipados del grupo institucional si no figuran en las cuadrículas.
  4. Se actualizó el fallback determinístico para operar 100% sobre los nombres de talleres reales evaluados.
  5. Se verificó con IA en un caso extremo (David Carrizo, Emprendedores - rol auxiliar/limpieza), confirmando 0 menciones de catering o pastelería y 100% apego a sus tareas de limpieza y auxiliar.
  6. Compilado con éxito (`npm run build`), desplegado al VPS (`149.50.128.73`) y reiniciado PM2.

# Registro de Conversación - 2026-09-14 (Indicadores Visuales de Completitud en Cuadrículas Mensuales)

## Usuario:
- "Pone algo visual en el collapse de cuadricula mensual para que diga cuales tienen las habilidades de los talleres cargadas y 3. Observaciones y detalles del mes . Asi se si los tienen o no"

## Antigravity:
- **Diagnóstico y Diseño**:
  - Se identificó que las cuadrículas mensuales se visualizan en `/forms` (agrupadas en un collapse por concurrente) y en `/youngs` (en la pestaña de cuadrículas mensuales del concurrente).
  - Se analizó la estructura de los datos de `forms`: `data.talleres` (con array de habilidades e ítems evaluados con `nivel >= 1`) y `data.observaciones` ("3. Observaciones y detalles del mes").
- **Implementación Realizada**:
  1. **Utilidad Centralizada (`src/lib/formSummary.ts`)**:
     - Creado helper `extractFormSummary(data)` y `getFormSummary(item)` para calcular la completitud de habilidades (talleres, habilidades totales, habilidades evaluadas) y de observaciones (longitud, vista previa y estado booleano).
  2. **API `GET /api/forms` (`src/app/api/forms/route.ts`)**:
     - Retorna pre-calculados `talleresCount`, `talleresNombres`, `totalSkillsCount`, `skillsCount`, `hasHabilidades`, `hasObservaciones`, `observacionesLength`, `observacionesPreview`.
  3. **Cabecera del Accordion / Collapse (`src/app/forms/page.tsx`)**:
     - Muestra badges en la fila del concurrente antes de abrir el collapse:
       - Habilidades: `✓ Habilidades cargadas (X/Y)` en verde o `⚠️ Faltan habilidades (X/Y)` en rojo/rosa.
       - Observaciones: `📝 Observaciones cargadas (X/Y)` en azul o `⚠️ Sin observaciones (Z faltan)` en ámbar.
  4. **Columnas en la Tabla Expandida (`src/app/forms/page.tsx` y `src/app/youngs/page.tsx`)**:
     - Columna `Habilidades de Talleres`: badge verde con conteo de talleres y habilidades evaluadas + lista de nombres en subtexto y tooltip, o badge rojo `⚠️ Sin habilidades`.
     - Columna `3. Observaciones del Mes`: badge azul con conteo de caracteres + previsualización en cursiva del texto con tooltip (`title`) para ver la observación completa al pasar el mouse, o badge ámbar `⚠️ Sin observaciones (vacío) - Punto 3 del mes sin redactar`.
  5. **Filtros Rápidos en `/forms`**:
     - Checkboxes `⚠️ Faltan Observaciones` y `⚠️ Faltan Habilidades` con contador dinámico de concurrentes para filtrar en 1 solo click.
  6. **Compilación y Despliegue en VPS**:
     - Compilación `npm run build` local exitosa con 0 errores.
     - Despliegue de archivos al servidor VPS (`149.50.128.73:5782`), build remoto y reinicio de PM2 con código de salida 0 (`online`, PID 203583).
     - Verificado en producción `https://informes-andar.nextemarketing.com`.
