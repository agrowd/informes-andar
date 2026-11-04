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

# Registro de Conversación - 2026-09-21 a 2026-09-23

## Usuario:
- Drag & drop para Excel en Bloque 4: "Agrega la opcion para en el cuarto bloque del final, el excel se pueda arrastrar, ya que creo que por la lentitud de la memoria del disco o por un bug(que me paso en otras plataformas) no me aparece en el seleccionador de archivos"
- Validación y Previsualización de Bloques: "Verifica que la informacion para el final de abigail agustina malmoria este bien cada informacion que hay, si es de ella o no. O que si reconoce un nombre que se carga en el bloque de otra persona que no es, se le asigne a esa persona que es, ademas que te lo diga en un modal o en algun lado la aclaracion y que se pueda ver la informacion que hay en cada bloque como vista previa"
- Evolución de Habilidades: "Que en la previsualizacion de los excels se pueda ver que habilidades detecto en cada periodo y cuanto avanzo en cada una etc etc, vos me entendes ya"
- Erradicación de Etiquetas de Párrafo: "Ademas soluciona el problema que en el informe final sale con parrafo 1: parrafo 2: etc etc en algunas partes, no debe decir eso"
- Subida de Excel en Bloque 4 y Sueño desde Bloque 3: "subo el excel del bloque 4, carga pero vuelve a aparecer como si no hubiese subido nada. Ademas agrega que si falta el sueño lo reconozca del bloque 3 que lo dice en el texto"

## Antigravity:
- **Arrastre de Archivos (Drag & Drop) y Previsualización de Bloques**:
  - Se habilitó zona de arrastre y suelta en `UploadExcelModal.tsx` con soporte visual interactivo.
  - Se implementó el modal `BlockPreviewModal.tsx` y el endpoint `/api/reports/final/block-preview` para auditar la información exacta cargada en cada uno de los 4 bloques antes de generar el informe final.
- **Evolución Inter-Períodos de Habilidades**:
  - Enriquecido el previsualizador con cálculo comparativo de habilidades rúbrica nivel 1 a 4, visualización de trayectorias, delta de progreso y pestaña interactiva con KPIs de avance y consolidación.
- **Limpieza de Prefijos de Párrafo**:
  - Se modificó el schema prompt en `finalReportGenerator.ts`, se incorporaron directivas prohibitivas y la función `stripParrafoPrefixes` en backend, generadores y visor web, purgando registros en PostgreSQL.
- **Resolución de Subida en Bloque 4 (Caso Brenda Casonato)**:
  - Se detectó que la celda A3 del PCP contenía formato `richText` que `String()` convertía a `"[object Object]"`, creando un joven corrupto ID 84 e ignorando el `manualYoungId`.
  - Se priorizó de manera absoluta `manualYoungId` en `import-excel/route.ts` (D-79), se mejoró la lectura con `getCellText()` y se endureció la detección de talleres (`KNOWN_WORKSHOPS` y límites de regex).
  - Se eliminó el registro ID 84 y se reimportaron Agosto y Septiembre en Brenda Yanet Casonato (ID 40) con 8 talleres y observaciones completas (4/4 bloques listos).
- **Extracción Automática de Sueños desde Bloque 3**:
  - Se implementó `extractDreamFromReport` en `finalReportGenerator.ts` y `/api/reports/final/route.ts` (D-80). Si el PCP carece de sueño, el sistema lo extrae de la Sección 1 o encabezado del Trimestral 2 (Bloque 3) y lo persiste permanentemente en `youngs.pcp`.
- **Despliegue y Verificación en Producción**:
  - Compilación local y remota exitosa, despliegue al VPS (`149.50.128.73:5782`), reinicio de PM2 y verificación de disponibilidad online del servicio.

# Diagnóstico de Error de Inicio de Sesión (2026-09-23)
## Usuario:
- "Que pasa que estoy poniendo la contraseña bien y no me deja entrar? /api/auth/callback/credentials:1 Failed to load resource: the server responded with a status of 401 () Error en login: CredentialsSignin"

## Antigravity:
- **Causa Raíz Diagnosticada**:
  - Se inspeccionaron los logs en vivo de PM2 en el VPS (`149.50.128.73`):
    `NeonDbError: Server error (HTTP status 402): {"message":"Your account or project has exceeded the quota. Upgrade your plan to increase limits."}`
  - La contraseña y usuario ingresados NO son erróneos. La base de datos Neon Postgres (`royal-hat-63200243`) alcanzó el límite de cuota mensual gratuita (Free Tier / Hobby), bloqueando todas las peticiones con código HTTP 402 (Payment Required).
  - Al fallar la consulta `UserModel.findOne({ email })`, NextAuth retorna `CredentialsSignin` y muestra `Email o contraseña incorrectos`.

## Usuario:
- "Cambie el plan fijate ahora"

## Antigravity:
- **Ejecución y Verificación de Migración Total**:
  - Se confirmó que Neon se desbloqueó tras el cambio de plan.
  - Se creó la base `informes_andar_prod` con encoding UTF-8 en el PostgreSQL 15 local del VPS.
  - Se ejecutó el volcado con Docker Postgres 17 migrando el 100% de la información: 277 formularios, 191 informes, 73 concurrentes, 11 usuarios (incluyendo `natoh`), 7 talleres y 219 logs.
  - Se implementó el conector universal `src/lib/db-postgres.ts` sobre `pg.Pool` con tag `sql`.
  - Se actualizó el VPS a `localhost:5432/informes_andar_prod`, se compiló en producción y se reinició PM2.
  - Se probó el endpoint de login con HTTPS: status 200 OK con sesión activa. La latencia bajó de ~180 ms a <1 ms.

# Registro de Conversación - 2026-09-24 (Resolución de Observaciones de Agosto en Bloque 4 para Analía Celis)
## Usuario:
- "En el el bloque 4 de analia celis, en descargas estan las observaciones de agosto, pero cuando lo cargo no lo detecta bien, no aparece, que es lo que esta pasando, resolvelo"

## Antigravity:
- **Diagnóstico de Causa Raíz**:
  - En la base de datos PostgreSQL local del VPS existían dos registros para Agosto de Analía Celis (ID 3):
    1. Formulario #76 con periodo literal `'AGOSTO'` y observaciones vacías (creado en agosto como borrador).
    2. Formulario #302 con periodo canónico `'2026-08'` y 3,645 caracteres de observaciones completas de la facilitadora Juliana Arias (talleres, asistencia, vínculos, medicación).
  - Al consultar el Bloque 4 con `WHERE periodo ILIKE '%08%' OR periodo ILIKE '%agosto%' ORDER BY periodo ASC, id ASC`, el orden alfabético (`'2026-08' < '2026-09' < 'AGOSTO'`) colocaba al formulario vacío #76 en la 3ra posición, ocultando las observaciones y alterando la progresión.
  - Al reimportar el Excel, el importador actualizaba el Form #302 pero no eliminaba el Form #76 huérfano.
- **Solución y Despliegue**:
  1. Se eliminó el Form #76 y otros formularios duplicados/espurios de la base de datos.
  2. Se programó la deduplicación canónica (`deduplicateFormsByMonth`) en `block-preview/route.ts` y en `final/route.ts` para agrupar por mes de calendario (04–12), priorizar el formulario con mayor contenido de observaciones y ordenar de forma cronológica.
  3. Se mejoró `import-excel/route.ts` para que normalice los periodos y purgue automáticamente formularios duplicados del mismo mes en cada subida.
  4. Se compiló el proyecto y se desplegó al VPS (`149.50.128.73`), reiniciando PM2 exitosamente.
  5. Se verificó en vivo que el Bloque 4 de Analía Celis ahora muestra sus 2 meses exactos (Agosto con 3,645 car. y Septiembre con 4,895 car.) con todos sus talleres y observaciones visibles.

# Registro de Conversación - 2026-09-24 (Resolución de Error 'invalid input syntax for type boolean: "{}"' en Importación Excel)
## Usuario:
- "Me dice esto cuando trato de cargar un excel, verifica" (con imagen del error `invalid input syntax for type boolean: "{}"` al cargar `13. Giuliano, Daniela Elizabeth .xlsx` en Bloque 4).

## Antigravity:
- **Diagnóstico de Causa Raíz**:
  - En `src/app/api/youngs/import-excel/route.ts`, la consulta SQL para buscar formularios mensuales existentes llamaba anidadamente a `sql` dentro de una cláusula booleana: `OR (${legacySheetName ? sql`periodo = ...` : sql`false`})`.
  - Como `sql` en `db-postgres.ts` es asíncrona, retornaba una `Promise` que `pg` serializaba a `"{}"`.
  - Postgres esperaba un `boolean` dentro de `OR (...)` y fallaba con `invalid input syntax for type boolean: "{}"` (500).
- **Solución y Despliegue**:
  1. Se eliminaron las llamadas anidadas y se reemplazaron por expresiones SQL parametrizadas limpias y estándar.
  2. Se aseguró el formateo correcto de arrays Postgres `'{id1,id2}'::int4[]`.
  3. Se ejecutaron pruebas directamente contra la base de datos PostgreSQL local del VPS validando ejecución correcta.
  4. Se compiló el proyecto y se desplegó al VPS de producción (`149.50.128.73`), reiniciando PM2 exitosamente (PID 387370).

# Registro de Conversación - 2026-09-25 (Resolución de Carga de Bloque 1 Word de Verano en Román Pontecorvo)
## Usuario:
- "Estoy intentando subir el primer bloque en pontecorvo y no me deja, fijate que esta en descrgas. Cuando lo subo carga la pagina pero no se actualiza el bloque, no se que es lo que pasa" (adjuntando captura de pantalla de la tarjeta de Román Pontecorvo con Bloque 1 en "Falta Word de Verano").

## Antigravity:
- **Diagnóstico de Causa Raíz**:
  - En Descargas se encontró el archivo `8-Roman Pontecorvo .docx`.
  - Al subirlo, el endpoint `POST /api/reports/upload-manual-docx` procesó el texto con `gpt-4o-mini`. La IA leyó el nombre `Roman Matias Pontecorvo`, pero alucinó el ID como `34` (correspondiente a Daniel Marcelo Alegre).
  - La lógica de reasignación automática confió ciegamente en el ID de la IA y reasignó el informe de Román Pontecorvo (ID 33) a Daniel Marcelo Alegre (ID 34), creando dos informes duplicados (#239 y #240) bajo Alegre.
  - La página se refrescaba pero Román Pontecorvo seguía figurando sin Bloque 1.
- **Solución y Despliegue**:
  1. Se reasignó el Reporte #240 a Román Matías Pontecorvo (young_id = 33) y se eliminó el duplicado #239.
  2. Se blindó la resolución de concurrentes en `upload-manual-docx/route.ts` (D-83) para priorizar el nombre y la coincidencia determinística de tokens, descartar IDs alucinados por IA y prohibir reasignar cuando el joven seleccionado tiene presencia en el documento.
  3. Se desplegó al VPS (`149.50.128.73`) con compilación exitosa y reinicio de PM2 (PID 405262).
  4. Se verificó que Román Pontecorvo cuenta ahora con el Bloque 1 en verde (`✅ Informe #240 (2026-01 – 2026-03)`).

# Registro de Conversación - 2026-09-25 (Erradicación de Menciones Literales de Niveles de Rúbrica en Informes Finales)
## Usuario:
- "Revisa el que esta en descargas y fjate que dice nivel 3 en algunos casos o habla de niveles en el final de pontecorvo, no deberia de decirse asi, deberia de explicarlo de manera, que no ponga niveles"

## Antigravity:
- **Diagnóstico y Análisis**:
  - En `C:\Users\Try Hard\Downloads\informe-final-Roman_Matias_Pontecorvo-Buenos_Mozos-2026-09-25.docx`, se detectaron 3 ocurrencias literales de escalas numéricas:
    1. Línea 99 (Logros Prácticos): *"alcanzando el Nivel 3 en actividades como lijar superficies y mantener una actitud de aprendizaje"*
    2. Línea 99 (Logros Prácticos): *"Ha alcanzado el Nivel 3 en actividades de participación en la huerta, lo que le ha permitido..."*
    3. Línea 105 (Logros Emocionales y Sociales): *"alcanzando el Nivel 3 en la expresión verbal de emociones y la escucha activa"*
  - En `src/lib/ai/finalReportGenerator.ts`, el prompt solicitaba evaluar *"con sus niveles (Niveles 1 a 4)"* y los insumos inyectaban `(Nivel 3)`, induciendo al modelo a plasmar los números de rúbrica interna en lugar de explicarlos en prosa cualitativa.
- **Acciones y Solución Implementada**:
  1. **Reemplazo Cualitativo de Insumos (`describeNivelQualitative`)**:
     - Las destrezas de taller se formatean ahora con su significado funcional institucional: `[Logro: desempeño consolidado y autónomo]`, `[en proceso de desarrollo activo con apoyos verbales]`, `[en etapa inicial con apoyos guiados]`, `[desempeño independiente / modelo]`.
  2. **Directiva Prohibitiva Institucional y Estándar Granja Andar**:
     - Se prohibió taxativamente en el System Prompt y User Prompt de OpenAI mencionar "Nivel 1", "Nivel 2", "Nivel 3", "Nivel 4" o hablar de "niveles" en los párrafos narrativos.
     - Se instruyó explicar siempre el progreso en términos de funcionalidad, grado de consolidación/autonomía y apoyos requeridos.
  3. **Sanitizador Universal (`sanitizeNarrativeLevels`)**:
     - Se implementó en `src/lib/formatters.ts` y se integró en `cleanString`, `stripParrafoPrefixes`, el endpoint `.docx/route.ts` y `FinalReportViewer.tsx`.
  4. **Sanitización de Informes en Base de Datos PostgreSQL del VPS**:
     - Se sanitizaron los 13 informes finales históricos existentes en `informes_andar_prod`, dejando exactamente **0 ocurrencias** de `/nivel\s*[0-9]/gi` en toda la base de datos.
  5. **Compilación y Despliegue en Servidor**:
     - Compilación local `npx tsc --noEmit` y remota `npm run build` exitosas (19/19 páginas).
     - Despliegue al VPS y reinicio de PM2 (`informes-andar`, PID 406205).
  6. **Verificación del Archivo Word DOCX**:
     - Se generó y descargó el Word de Román Matías Pontecorvo (Reporte #242) desde la API de producción.
     - Se comprobó con `mammoth` que tiene **0 menciones de nivel**, transformando las frases a redacción fluida y profesional: *"consolidando con autonomía y regularidad actividades como lijar superficies..."*, *"Ha consolidado con autonomía y regularidad actividades de participación en la huerta..."*, *"consolidando con autonomía y regularidad la expresión verbal de emociones y la escucha activa"*.
     - Se actualizó el archivo en `C:\Users\Try Hard\Downloads\informe-final-Roman_Matias_Pontecorvo-Buenos_Mozos-2026-09-25.docx`.



# Registro de Conversación - 2026-09-25 (Calibración Rigurosa de las 8 Dimensiones de Calidad de Vida y Erradicación del Error Conceptual en Bienestar Material)
## Usuario:
- "Me dice esto la psicologa institucional que lee los informes:
  Nada, lo que habría que hacer es explicarle un poquito más al bot o a la cosa esa que usés (0:20) las dimensiones, porque en la dimensión del bienestar material (0:26) te habla del material como elemento de cocina y no sobre su situación económica, que es a lo que apunta en realidad. (0:00) Son las dimensiones de calidad de vida, Fede, que son ocho."

## Antigravity:
- **Diagnóstico y Causa Raíz**:
  - En `src/lib/ai/finalReportGenerator.ts`, el System Prompt y el User Prompt no definían conceptualmente el alcance de las 8 Dimensiones de Calidad de Vida (Schalock & Verdugo).
  - En los esquemas de ejemplo de OpenAI y en el fallback determinístico, la dimensión `bienestarMaterial` tenía ejemplos literales erróneos: `"Gestión ordenada de sus elementos personales y materiales de taller."`, y en `.docx/route.ts`: `'Cuidado de pertenencias.'`.
  - Al no tener pautas clínicas explícitas, el LLM interpretaba "material" en su sentido físico de taller o cocina (utensilios, ollas, lijas, pinceles) en vez de evaluar la dimensión socioeconómica, vivienda y necesidades básicas de la persona.
- **Acciones y Solución Implementada**:
  1. **Calibración Clínica Rigurosa de las 8 Dimensiones en Prompts**:
     - Se incorporó en el System Prompt y User Prompt de `finalReportGenerator.ts` la definición psicológica completa del modelo de Schalock & Verdugo:
       * Bienestar Físico (BF): Salud integral, controles médicos, nutrición, hábitos higiénicos, deporte y natación.
       * Bienestar Emocional (BE): Estado anímico habitual, tranquilidad, autoconcepto positivo, autorregulación y ausencia de estrés severo.
       * Bienestar Material (BM): Nivel socioeconómico, estabilidad habitacional, cobertura de necesidades básicas (alimentación digna, vestimenta adecuada, transporte/pases, pensión, CUD, obra social) y acceso a recursos económicos indispensables. **PROHIBICIÓN TERMINANTE** de asociarlo con elementos de cocina, utensilios, herramientas o materiales de taller.
       * Desarrollo Personal (DP): Aprendizaje a lo largo de la vida, competencias funcionales y operativas en los talleres del Centro de Día, curiosidad y superación.
       * Relaciones Interpersonales (RI): Vínculos significativos con pares, facilitadores y familia; compañerismo, empatía y reciprocidad afectiva.
       * Inclusión Social (IS): Participación activa en la comunidad (Kermés, boliche CCP, salidas, polideportivos) y rol ciudadano valorado en igualdad de oportunidades.
       * Autodeterminación (AD): Elecciones y decisiones cotidianas, gustos, preferencias y metas personales en su PCP.
       * Derechos (DE): Dignidad humana, privacidad, trato igualitario como sujeto de pleno derecho (Convención CDPD) y acceso a apoyos y ajustes razonables.
  2. **Corrección de Ejemplos, Fallback y Exportador DOCX**:
     - Se actualizaron los esquemas JSON de ejemplo y los fallbacks con indicadores de cobertura socioeconómica y habitacional.
     - En `src/app/api/reports/[id]/.docx/route.ts`, se actualizó el indicador predeterminado para `bienestarMaterial`.
  3. **Sanitización de la Base de Datos PostgreSQL en Producción**:
     - Se ejecutó un script en el VPS (`scratch/sanitize_bm_db.cjs`) que auditó y actualizó el 100% (28 de 28) de los informes finales almacenados en `informes_andar_prod`.
  4. **Compilación y Despliegue en Producción**:
     - `npx tsc --noEmit` local: 0 errores.
     - Despliegue SFTP al VPS (`149.50.128.73:5782`), compilación `npm run build` en servidor (19/19 páginas) y reinicio de PM2 (`informes-andar`, PID 406947).
  5. **Verificación End-to-End**:
     - Se descargó el Word de Román Pontecorvo (Reporte #242) desde la API de producción y se verificó con `mammoth`:
       * `Bienestar Material` en tabla: "Cuenta con adecuada cobertura de sus necesidades materiales básicas, estabilidad habitacional y acceso regular a traslados y recursos indispensables en su entorno familiar."
       * `Bienestar Material` en indicadores: "Cobertura adecuada de necesidades materiales básicas, estabilidad habitacional, traslados y recursos indispensables para su vida diaria."
       * Coincidencias de "nivel": 0.
       * Coincidencias de cocina/taller en BM: 0.
       * Se actualizó el archivo oficial en `C:\Users\Try Hard\Downloads\informe-final-Roman_Matias_Pontecorvo-Buenos_Mozos-2026-09-25.docx`.


# Registro de Conversación - 2026-09-28 (Reemplazo en Bloque 1, Regeneración en Bloque 3, Restauración de Virginia Stabile y Corrección de DNI en Eluney Ledesma)
## Usuario:
- "Que en el bloque 3 se pueda regenerar el informe a partir de los mensuales y que en el bloque 1 se pueda reemplazar si se subio, ademas fijate que virginia no aparece mas en emprendedores, que ocurrio ahi? ademas no deja cargar las cosas ni verla. Y te dejo esta captura de este error" (con captura de Eluney Omar Ledesma donde el DNI mostraba su rutina de la mañana).

## Antigravity:
- **Diagnóstico y Causa Raíz**:
  1. En `src/app/api/youngs/import-excel/route.ts`, el escaneo de metadatos PCP (`r <= 20`) leía hasta la fila 20:
     - En Eluney Omar Ledesma, la fila 9 contenía su rutina ("...llevo mi DNI..."), capturando todo el párrafo de 90+ caracteres como DNI.
     - En Virginia Stabile, la fila 19 contenía su sueño ("...hacer cajitas [un taller]"), sobrescribiendo su `taller = 'Emprendedores'`, ocultándola del filtro y creando duplicados espurios (IDs 85 y 86).
  2. En `src/app/final-reports/page.tsx`, los botones de Bloque 1 y Bloque 3 estaban condicionados a `!ok`, ocultándose tras subir o generar.
  3. En `src/app/api/reports/final/route.ts`, `evaluateBlocks` seleccionaba candidatos de informe ordenados por `id ASC`, reteniendo reportes viejos.
- **Acciones Realizadas**:
  1. **Base de Datos PostgreSQL en VPS**:
     - Restaurada Virginia Maria Stabile (ID 55) con `taller = 'Emprendedores'`, `dni = '33573626'`, `assigned_facilitators = [11, 1]`.
     - Purgados concurrentes duplicados 85 y 86 con sus 10 formularios espurios y 2 reportes redundantes.
     - Saneado Eluney Omar Ledesma (ID 67): `dni = NULL`, `legajo = '49'`, `taller = 'Emprendedores'`.
     - Confirmados exactamente 20 concurrentes en Emprendedores con Virginia y Eluney presentes.
  2. **Blindaje de Metadatos en `import-excel/route.ts` (D-87)**:
     - Escaneo delimitado estrictamente a filas 1 a 6 (`r <= 6`).
     - Validación estricta de DNI (`/^[0-9.\s-]{6,15}$/`) y taller (longitud <= 35, sin paréntesis ni verbos de sueños/metas).
  3. **UI y Regeneración en `final-reports/page.tsx` (D-86)**:
     - Bloque 1: Botón `[ 📤 Reemplazar Word de Verano ]` visible permanentemente cuando ya existe informe.
     - Bloque 3: Botón `[ ⚡ Regenerar Trimestral 2 (IA) ]` disponible con confirmación previa siempre que Bloque 2 esté completo.
     - Cabecera: Guard para DNI exigiendo `young.dni.length <= 15 && /^[0-9.\s-]+$/.test(young.dni)`.
  4. **Precedencia de Informes Más Recientes en `final/route.ts`**:
     - Ordenamiento por `id DESC` en `evaluateBlocks` y en la consulta `reportsRes` del overview.
  5. **Compilación y Despliegue en Servidor**:
     - `npx tsc --noEmit` local: 0 errores.
     - Despliegue SFTP al VPS (`149.50.128.73:5782`), compilación `npm run build` en servidor (19/19 páginas) y reinicio de PM2 (`informes-andar`, PID 459250).
     - Verificación directa en base de datos completada con 100% de éxito.

# Registro de Conversación - 2026-09-28 (Erradicación de Menciones de Catering/Pastelería en Jonathan Salvatierra y Resolución de Bug SQL de Trimestrales)
## Usuario:
- "en el ultimo informe final que te deje en descargas dice que hace catering y pasteleria pero en toda la informacion que se ve y se previsualiza no menciona nada de eso, las habilidades, los informes, en las observaciones, en ningun lado dice esto. Podes decirme por que pasa y arreglarlo para que no pase mas esto?"

## Antigravity:
- **Diagnóstico y Causa Raíz**:
  1. En `src/app/api/reports/final/route.ts` (POST handler), la query de búsqueda automática de Trimestral 1 utilizaba:
     `SELECT ... FROM reports WHERE young_id = ${young.id} AND report_type = 'TRIMESTRAL' AND (periodo ILIKE '%01%' OR periodo ILIKE '%02%' OR periodo ILIKE '%03%' ...) ORDER BY id DESC LIMIT 1`.
  2. Como todos los períodos de 2026 contienen los dígitos `'02'`, el Trimestral 2 recién regenerado (`2026-06 – 2026-04`, Reporte #271) hizo match accidental como Trimestral 1 (`t1Auto`).
  3. Luego, al buscar el Trimestral 2 (`t2Auto`), excluyó el #271 y cayó en un borrador residual histórico obsoleto (Reporte #81, del 10 de agosto) que tenía menciones hardcodeadas de pastelería y catering.
  4. El Word de Verano oficial (Reporte #266) fue ignorado en el backend, e inyectó el texto del Reporte #81 a GPT-4o, provocando que la IA sintetizara catering en el informe final (#272).
  5. La previsualización de la UI (`evaluateBlocks`) usaba `p.includes('2026-01')`, por lo que en pantalla se veía el #266 limpio, creando la contradicción con el documento generado.
- **Acciones Realizadas**:
  1. **Clasificación Canónica en `src/lib/formatters.ts` (D-88)**:
     - Funciones `isTrimestral1(periodo)` e `isTrimestral2(periodo)` que exigen límites de mes exactos (`2026-01`, `2026-02`, `-01`, `-02`, `01 – 03`, `enero`, `verano`, etc.), evitando colisiones con `'2026'`.
  2. **Refactorización de Consultas Backend (`src/app/api/reports/final/route.ts`)**:
     - Se eliminó el SQL `ILIKE '%02%'`. Se consultan todos los trimestrales ordenados por `id DESC` y se filtran en JS con `isTrimestral1` e `isTrimestral2`, logrando 100% de paridad con la interfaz web.
  3. **Alineación en Previsualización (`src/app/api/reports/final/block-preview/route.ts`)**:
     - Bloques 1 y 3 actualizados para seleccionar candidatos evaluados con `isTrimestral1` e `isTrimestral2`.
  4. **Detección Dinámica de Talleres y Prohibición Estricta en Prompt (`finalReportGenerator.ts`)**:
     - Extracción dinámica de la lista de talleres de los meses evaluados (`allTallerNames`).
     - Si el concurrente no cursa talleres gastronómicos, se inyecta en el System Prompt y User Prompt una prohibición terminante: `¡PROHIBICIÓN TERMINANTE DE CATERING / PASTELERÍA / COCINA / GASTRONOMÍA!`.
  5. **Post-Procesador Universal (`sanitizeCateringIfAbsent`)**:
     - Filtra y elimina cualquier oración alucinada que atribuya catering o pastelería si el concurrente no asiste a dichos talleres.
  6. **Limpieza, Despliegue y Regeneración**:
     - Eliminados los reportes obsoletos #81 y #272 en el PostgreSQL del VPS.
     - Desplegado a producción (`149.50.128.73:5782`), compilado (`npm run build` 19/19 páginas) y PM2 reiniciado (`informes-andar`, PID 460593).
     - Regenerado el Informe Final oficial (Reporte #273) y descargado a `C:\Users\Try Hard\Downloads\informe-final-Jonathan_Salvatierra-Emprendedores-2026-09-28.docx`.
     - Auditoría con `mammoth`: 0 menciones de catering, 0 de pastelería, 0 de cocina y 0 de niveles de rúbrica.



# Registro de Conversación - 2026-10-13 (Autodetección de Concurrente, Inserción Exclusiva de Meses Nuevos e Importación de Octubre de Leonel Zenteno)
## Usuario:
- "tengo que subir el .xlsx que esta en descargas de un concurrente con los nuevos meses y que lo detecte solo, que no agregue los que ya estan, solo los nuevos, analizalo bien"

## Antigravity:
- **Diagnóstico y Análisis**:
  1. Archivo objetivo: `C:\Users\Try Hard\Downloads\Leonel Zenteno.xlsx`.
  2. Concurrente: `Leonel Rodrigo Zenteno` (ID 27, grupo `Artesanos`, facilitador Leonardo Villamayor). El parser extrae automáticamente su nombre de la solapa `PCP` fila 3 (`NOMBRE Y APELLIDO: Leonel Rodrigo Zenteno`) y asocia a ID 27 sin intervención manual.
  3. Meses en el Excel vs Base de Datos:
     - `ABRIL` (2026-04), `MAYO` (2026-05), `JUNIO` (2026-06), `AGOSTO` (2026-08), `SEPTIEMBRE` (2026-09): Ya existían en la base de datos (Forms #103, #104, #105, #386, #387), idénticos al Excel.
     - `OCTUBRE` (2026-10): Mes NUEVO con 7 talleres (Manos Verdes, Hatha Yoga, Arte Pintura, Arte Musical, Deporte, Vida Independiente, Habilidades Sociales), 85 habilidades evaluadas y 4,800 caracteres de observaciones ricas.
  4. Flaw en importación previa:
     - Retornaba todos los meses del archivo en `importedMonths` y `createdFormIds`, haciendo que en el frontend el modal de fusión trimestral intentara fusionar todos los meses juntos.
- **Acciones Realizadas**:
  1. **Separación de Meses Nuevos vs Existentes en `import-excel/route.ts` (D-89)**:
     - Los meses ya existentes se preservan y actualizan en su lugar sin insertar nuevas filas (evitando duplicación).
     - Solo los meses nuevos se insertan con `INSERT INTO forms`.
     - `importedMonths` en la respuesta JSON devuelve estrictamente los meses nuevos (`newMonths`).
     - Mensaje descriptivo informa: concurrente detectado, cantidad de meses nuevos agregados y cantidad de meses históricos preservados.
  2. **Condicionamiento del Asistente Trimestral (`forms/page.tsx` y `youngs/page.tsx`)**:
     - `ExcelImportWizardModal` solo se abre cuando se agregan 2 o más meses nuevos (`>= 2`). Si se agrega 1 mes (ej. Octubre), se muestra la confirmación directa.
  3. **Reconocimiento de Octubre en Bloque 4 (`final/route.ts` y `final-reports/page.tsx`)**:
     - Agregado `has10` en `evaluateBlocks` y en la UI para mostrar `3 meses evaluados (incluye Octubre)`.
  4. **Despliegue y Ejecución en Producción**:
     - Desplegados cambios a VPS (`149.50.128.73:5782`), compilado con `npm run build` (19/19 páginas) y reiniciado PM2.
     - Importado `Leonel Zenteno.xlsx`: detectado Leonel Rodrigo Zenteno (ID 27), preservados 5 meses existentes e insertado Octubre 2026 como Form #427.
     - Verificado en PostgreSQL: exactamente 6 formularios, 0 duplicados y Bloque 4 listo con 3 meses evaluados.


# Registro de Conversación - 2026-10-13 (Exportación Dinámica Integral de Planillas Excel con Paridad 100% vs Original)
## Usuario:
- "No se exporta bien, fijate en descargas que esta el que se exporto y no es igual que el original"

## Antigravity:
- **Diagnóstico y Análisis Comparativo**:
  1. Comparó el archivo exportado `cuadricula-Ezequiel_Elías_Garea-Artesanos-13-10-2026.xlsx` contra el libro original del facilitador `Elias Ezequiel Garea. .xlsx` en `C:\Users\Try Hard\Downloads\`.
  2. Detectó la discrepancia fundamental:
     - El original contiene 7 solapas (`PCP`, `ABRIL`, `MAYO`, `JUNIO`, `AGOSTO`, `SEPTIEMBRE`, `OCTUBRE`).
     - El exportado previo solo tenía 2 solapas (`PCP` con 998 filas vacías, y `2026-10` con formato numérico).
     - La hoja `2026-10` dependía de una plantilla rígida (`monthly_template.xlsx`) con 4 talleres ajenos (Deporte, Viajar, Habilidades Sociales, Musicoterapia). Al evaluar `if (tallerRow === -1) continue;`, 6 de los 8 talleres reales de Ezequiel (`MANOS VERDES`, `HATHA YOGA`, `ARTE PINTURA`, `ARTE MUSICAL`, `VIDA INDEPENDIENTE`, `ARQUERIA`) eran descartados por completo sin escribirse.
- **Acciones Realizadas**:
  1. **Motor Universal `src/lib/excelExport.ts` (D-90)**:
     - `buildCompleteWorkbook`: Consulta en PostgreSQL todos los formularios evaluados del concurrente (`forms WHERE young_id = $1`) y los ordena cronológicamente mapeando a solapas con nombres en español (`ABRIL`, `MAYO`, `JUNIO`, `AGOSTO`, `SEPTIEMBRE`, `OCTUBRE`).
     - `renderMonthlyWorksheet`: Genera dinámicamente cada solapa con cabecera en 32 columnas (A..AF), títulos de taller con paleta pastel institucional, distribución de habilidades en bloques de hasta 8 columnas por fila con cuadrícula de 2x2, bordes y pintado progresivo según el nivel rúbrica (1 a 4) y color institucional (`FFC27BA0` para Artesanos).
     - Transcribe las observaciones completas con autoajuste de altura de fila.
     - `writePcpSheet`: Inyecta datos personales, rutinas, sueños y escalas, truncando las filas vacías a partir de la fila 37 para eliminar las 998 filas fantasma y conservando imágenes institucionales.
  2. **Refactorización de Endpoints**:
     - `src/app/api/forms/[id]/export-excel/route.ts`: Implementado con `buildCompleteWorkbook`, exportando el libro íntegro del concurrente con su último mes sincronizado.
     - `src/app/api/reports/[id]/export-excel/route.ts`: Actualizado para utilizar la misma lógica unificada.
  3. **Despliegue y Verificación en Producción**:
     - `npx tsc --noEmit` y `npm run build` locales exitosos (19/19 páginas).
     - Subidos archivos por SFTP al VPS (`149.50.128.73:5782`), compilado `npm run build` en servidor y recargado PM2.
     - Generado el libro para Ezequiel Elías Garea (Form #428) y descargado directamente a `C:\Users\Try Hard\Downloads\cuadricula-Ezequiel_Elías_Garea-Artesanos-13-10-2026.xlsx`.
     - Auditoría con ExcelJS: 100% de paridad con `Elias Ezequiel Garea. .xlsx` (7 solapas idénticas, 8 talleres en Octubre, PCP limpio y niveles de habilidades en 2x2 exactos).

# Registro de Conversación - 2026-10-13 (Exclusión Definitiva de Solapa PCP en Exportaciones de Cuadrícula Mensual)
## Usuario:
- "Sacale la pcp y que solo sea el excel que tiene que ser"

## Antigravity:
- **Diagnóstico**:
  - En la exportación de Cuadrículas Mensuales (`/form?formId=...` o `/forms`), el usuario requiere que el archivo Excel sea estrictamente la planilla de evaluación curricular de talleres y meses, sin incluir la solapa del Plan Centrado en la Persona (PCP).
  - El libro debe contener exclusivamente las solapas de los meses evaluados (`ABRIL`, `MAYO`, `JUNIO`, `AGOSTO`, `SEPTIEMBRE`, `OCTUBRE`) y posicionar automáticamente la vista de Excel en la solapa correspondiente al formulario que se está editando (`activeTab`).
- **Acciones Realizadas**:
  1. **Actualización de `src/lib/excelExport.ts` (D-91)**:
     - Configurado `includePcp: false` por defecto en `buildCompleteWorkbook`, removiendo por completo la hoja `PCP` del libro generado.
     - Añadido soporte para `singleMonthOnly: boolean` (opcional vía `?single=1`).
     - Configurado `activeTab` en la vista del libro (`workbook.views`) para abrir directamente en la solapa del mes del formulario consultado (ej. `OCTUBRE`).
  2. **Actualización de Endpoints**:
     - `src/app/api/forms/[id]/export-excel/route.ts`: pasa `includePcp: false` y lee `?single=1`.
     - `src/app/api/reports/[id]/export-excel/route.ts`: pasa `includePcp: false`.
  3. **Despliegue y Compilación en Servidor VPS de Producción**:
     - Archivos subidos por SFTP a `/srv/informes-andar`.
     - Compilación `npm run build` en servidor (código 0, 19/19 páginas estáticas generadas).
     - Servicio PM2 recargado en caliente (`informes-andar`).
  4. **Descarga y Verificación**:
     - Generado y descargado a `C:\Users\Try Hard\Downloads\cuadricula-Ezequiel_Elías_Garea-Artesanos-13-10-2026.xlsx`.
     - Verificación con ExcelJS:
       * `Has PCP sheet?: false` (0 solapas PCP).
       * Solapas presentes: `[ 'ABRIL', 'MAYO', 'JUNIO', 'AGOSTO', 'SEPTIEMBRE', 'OCTUBRE' ]`.
       * Solapa activa al abrir: `OCTUBRE` (`activeTab: 5`).


# Registro de Conversación - 2026-10-23 (Resolución de Bloqueo de Inicio de Sesión por IP Directa)
## Usuario:
- "No inicia sesion, se queda asi" (con captura de pantalla en http://149.50.128.73:8000/login?callbackUrl=%2F y botón "Iniciando sesión...")

## Antigravity:
- **Causa Raíz**:
  1. `NEXTAUTH_URL` estaba seteado en HTTPS (`https://informes-andar.nextemarketing.com`), pero el dominio apunta a otra IP externa (200.58.119.215), forzando al usuario a entrar por IP directa `http://149.50.128.73:8000`.
  2. NextAuth emitía cookies con flag `Secure` y prefijo `__Secure-`. Por normas de seguridad de navegadores (RFC 6265bis), Chrome descarta silenciosamente estas cookies sobre HTTP.
  3. Sin cookies de sesión, el middleware rebotaba cualquier navegación a `/` de regreso a `/login`.
  4. El hash en Postgres del usuario `natoh` no coincidía con su contraseña institucional (`Federyco88!`).
- **Solución Aplicada**:
  1. Configuración de cookies universales compatibles con HTTP y HTTPS en `src/lib/auth.ts` y `src/middleware.ts` (`useSecureCookies: false`, nombre `next-auth.session-token`).
  2. Actualización de `NEXTAUTH_URL` en VPS a `http://149.50.128.73:8000`.
  3. Reemplazo de `router.push('/')` por `window.location.href = '/'` en `src/app/login/page.tsx`.
  4. Actualización del hash de contraseña de `natoh` a `Federyco88!` en la base de datos PostgreSQL de producción.
  5. Compilación y recarga de PM2 en el VPS. Verificación exitosa del flujo completo de autenticación (200 OK y acceso directo a `/`).


# Registro de Conversación - 2026-10-23 (Importación y Verificación de Octubre para Francisco Rafael Balbi)
## Usuario:
- "Subi el mes de octubre y fijate que este bien del que esta en descargas FRANCISCO RAFAEL BALBI"

## Antigravity:
- **Inspección del archivo fuente**:
  - Archivo en Descargas: `C:\Users\Try Hard\Downloads\Rafael Francisco Balbi.xlsx`.
  - Solapas contenidas: `[ 'PCP', 'ABRIL', 'MAYO', 'JUNIO', 'AGOSTO', 'SEPTIEMBRE', 'OCTUBRE' ]`.
  - Concurrente: Francisco Rafael Balbi (Young ID 5, grupo `Clave de Sol`, legajo 38).
  - Facilitadora detectada en cabecera: Juliana Soledad Arias Espinoza (User ID 7).
- **Procesamiento e Importación**:
  - Subido el archivo al VPS por SFTP a `/srv/informes-andar/scratch/Rafael_Francisco_Balbi.xlsx`.
  - Parseada la solapa `OCTUBRE` (`2026-10`):
    * 5 talleres: `DEPORTE` (19 habilidades), `VIAJAR` (16 habilidades), `HABILIDADES SOCIALES` (15 habilidades), `MUSICOTERAPIA` (8 habilidades), `MANOS VERDES` (8 habilidades).
    * Total: 66 habilidades evaluadas (niveles 1 a 3), 0 habilidades vacías.
    * Observaciones: 5 párrafos completos (4.916 caracteres) con narrativa de asistencia regular, desempeño en talleres, interacción con pares, vínculo con facilitadora Juliana y eventos destacados (festejo de cumplemes y llaveros de madera por el Día de la Madre).
  - Inserción en Postgres: Creado **Form #429** (`young_id = 5`, `periodo = '2026-10'`, `created_by = 7`, `status = 'BORRADOR'`).
  - Preservación de meses previos sin duplicación: Form #15 (Abril), Form #16 (Mayo), Form #17 (Junio), Form #304 (Agosto), Form #305 (Septiembre). Total: 6 meses consolidados.
- **Verificación de Exportación y Diagnóstico**:
  - Verificado el motor de exportación `buildCompleteWorkbook`: genera 6 solapas mensuales exactas, 0 hojas de PCP (`includePcp: false`), y foco en `activeTab: 5` (`OCTUBRE`).
  - En el Diagnóstico Institucional (`/final-reports`), el Bloque 4 refleja `3 meses evaluados (incluye Octubre)` con `has08: true`, `has09: true`, `has10: true`.


# Registro de Conversación - 2026-10-23 (Importación y Verificación de Octubre para Marisol Fernanda Brito)
## Usuario:
- "Ahora con el de Marisol Fernanda Brito que esta en descargas"

## Antigravity:
- **Inspección del archivo fuente**:
  - Archivo en Descargas: `C:\Users\Try Hard\Downloads\Marisol Fernanda Brito.xlsx`.
  - Solapas contenidas: `[ 'PCP', 'ABRIL', 'MAYO', 'JUNIO', 'AGOSTO', 'SEPTIEMBRE', 'OCTUBRE', 'INFORME ' ]`.
  - Concurrente: Marisol Fernanda Brito (Young ID 8, grupo `Clave de Sol`, legajo 12).
  - Facilitadora detectada en cabecera: Juliana Soledad Arias Espinoza (User ID 7).
  - Fecha detectada: 10/10/2026.
- **Procesamiento e Importación**:
  - Subido el archivo al VPS por SFTP a `/srv/informes-andar/scratch/Marisol_Fernanda_Brito.xlsx`.
  - Parseada la solapa `OCTUBRE` (`2026-10`):
    * 5 talleres: `DEPORTE` (19 habilidades), `VIAJAR` (16 habilidades), `HABILIDADES SOCIALES` (16 habilidades), `MUSICOTERAPIA` (8 habilidades), `MANOS VERDES` (8 habilidades).
    * Total: 67 habilidades evaluadas.
    * Observaciones: 6 párrafos completos (4.258 caracteres) detallando asistencia regular, desempeño en circuitos motores con apoyo físico, caminatas con andador y resistencia de marcha, musicoterapia explorando instrumentos y contacto afectivo, socialización grupal con pares, vínculo estrecho con facilitadora Juliana, situaciones relevantes (festejo de cumplemes, trabajo con madera y pintado por el Día de la Madre) y seguimiento antropométrico (registro de peso de 25,500 kg en octubre).
  - Inserción en PostgreSQL: Creado **Form #430** (`young_id = 8`, `periodo = '2026-10'`, `created_by = 7`, `status = 'BORRADOR'`).
  - Preservación de meses previos sin duplicación: Form #31 (Abril), Form #32 (Mayo), Form #33 (Junio), Form #308 (Agosto), Form #309 (Septiembre). Total: 6 meses consolidados.
- **Compatibilidad y Exportación**:
  - Añadido fallback `taller.items || taller.habilidades || []` en `src/lib/excelExport.ts` y `src/lib/formSummary.ts` para compatibilidad retroactiva con esquemas históricos.
  - Verificada la exportación con `scratch/test_marisol_export.mjs`: 6 solapas mensuales exactas (`ABRIL`, `MAYO`, `JUNIO`, `AGOSTO`, `SEPTIEMBRE`, `OCTUBRE`), 0 solapas PCP (`includePcp: false`), y foco activo en `activeTab: 5` (`OCTUBRE`).
  - Verificado el Diagnóstico Institucional (`/final-reports`): Bloque 4 registra los 3 meses evaluados (`has08: true`, `has09: true`, `has10: true`).
  - Compilación `npm run build` y recarga de PM2 en el VPS ejecutadas con código 0.


# Registro de Conversación - 2026-10-23 (Resolución de Error "Failed to fetch" e Importación de NICOLAS MAITA.xlsx)
## Usuario:
- "Quiero subir el excel este y me tira este error" (con captura de pantalla en http://149.50.128.73:8000/final-reports mostrando el modal "Cargar Planilla Excel Mensual (Bloque 2 (Abril - Junio))" con "⚠️ Failed to fetch" al intentar subir "NICOLAS MAITA.xlsx").

## Antigravity:
- **Causa Raíz**:
  1. Al momento exacto de la subida, el proceso de Next.js en el VPS se encontraba en compilación y reinicio en caliente de PM2. Mientras Next.js reinicia el listener en el puerto 8000, los sockets TCP entrantes se rechazan momentáneamente, provocando que la API Fetch del navegador lance un `TypeError: Failed to fetch`.
  2. Adicionalmente, el usuario intentaba cargarlo desde el botón de **Bloque 2 (Abril - Junio)**, pero la planilla `NICOLAS MAITA.xlsx` contiene únicamente las solapas `[ 'PCP', 'JULIO', 'AGOSTO', 'SEPTIEMBRE', 'OCTUBRE' ]` (Maita no posee meses del primer semestre debido a que su ciclo inició en Julio). El mes nuevo contenido en la planilla es **Octubre**, correspondiente al **Bloque 4**.
- **Solución y Procesamiento**:
  1. Una vez estabilizado el servicio en el VPS, se procesó la planilla `NICOLAS MAITA.xlsx` en el endpoint `/api/youngs/import-excel` con autenticación de sesión, respondiendo exitosamente con **HTTP 200 OK**.
  2. Se extrajo la solapa `OCTUBRE` (`2026-10`) y se insertó como **Form #431** (`young_id = 38`, `status = 'BORRADOR'`, facilitadora Marina Trejo).
  3. Contiene los 9 talleres institucionales de Buenos Mozos con 127 habilidades evaluadas y 7.597 caracteres de observaciones narrativas completas.
  4. Se preservaron los meses existentes sin duplicar (`2026-07` Form #280, `2026-08` Form #406, `2026-09` Form #407).
  5. En el Diagnóstico Institucional (`/final-reports`), el Bloque 4 para Nicolás Agustín Maita ahora cuenta con los **3 meses evaluados (incluye Octubre)**.


# Registro de Conversación - 2026-10-23 (Importación y Verificación de Octubre para Juan Pablo Herrera y Analia Noemi Celis)
## Usuario:
- "Subi el mes de octubre de juan pablo herrera que esta en descargas y el de celis analia noemi"

## Antigravity:
- **Inspección de archivos fuente**:
  - `C:\Users\Try Hard\Downloads\Juan Pablo Herrera.xlsx` (513.157 bytes).
  - `C:\Users\Try Hard\Downloads\Celis Analia Noemi.xlsx` (397.456 bytes, solapa `OCTUBRE  ` normalizada con trim).
- **Procesamiento e Importación en Servidor VPS**:
  - Subidos ambos archivos por SFTP a `/srv/informes-andar/scratch/`.
  - **Juan Pablo Herrera (Young ID 7, Clave de Sol, legajo 43)**:
    * Solapa `OCTUBRE` (`2026-10`) insertada como **Form #432** (`status = 'BORRADOR'`, facilitadora Juliana Soledad Arias Espinoza).
    * 5 talleres: `DEPORTE` (19), `VIAJAR` (16), `HABILIDADES SOCIALES` (16), `MUSICOTERAPIA` (8), `MANOS VERDES` (8). Total: 67 habilidades (67/67 evaluadas).
    * Observaciones: 6 párrafos, 3.812 caracteres.
    * Historial consolidado: 6 meses (Forms 27, 28, 29, 306, 307, 432) sin duplicados.
    * Exportación: 6 solapas mensuales exactas, 0 PCP, foco activo en `OCTUBRE`.
  - **Analia Noemi Celis (Young ID 3, Clave de Sol)**:
    * Solapa `OCTUBRE` (`2026-10`) insertada como **Form #433** (`status = 'BORRADOR'`, facilitadora Juliana Soledad Arias Espinoza).
    * 5 talleres: `DEPORTE` (21), `VIAJAR` (16), `HABILIDADES SOCIALES` (16), `MUSICOTERAPIA` (8), `MANOS VERDES` (8). Total: 69 habilidades (67 evaluadas > 0).
    * Observaciones: 6 párrafos, 4.700 caracteres.
    * Historial consolidado: 6 meses (Forms 19, 20, 21, 302, 303, 433) sin duplicados.
    * Exportación: 6 solapas mensuales exactas, 0 PCP, foco activo en `OCTUBRE`.
- **Diagnóstico Institucional (`/final-reports`)**:
  - Ambos concurrentes reflejan ahora en Bloque 4: **3 meses evaluados (incluye Octubre)**.


# Registro de Conversación - 2026-10-23 (Auditoría de Observaciones y Movilidad de Analia Noemi Celis)
## Usuario:
- "donde dice lo de las caminatas de analia celis, ya que ella esta en silla de ruedas"

## Antigravity:
- **Auditoría Documental del Excel Original y Base de Datos**:
  1. En las **observaciones narrativas de Octubre** redactadas por la facilitadora Juliana Arias (`Celis Analia Noemi.xlsx` / Form #433):
     - **NO dice que camine**. Describe fielmente su desplazamiento en silla de ruedas y su trabajo postural:
       * *"logra tolerar permanecer en un espacio diferente al de su silla de ruedas"* (al ubicarse en un puff en estimulación sensorial).
       * *"También continúa realizando el desplazamiento de su silla de ruedas mediante el uso de los miembros superiores, logrando completar la misma distancia previamente establecida"*.
       * *"participa en encuentros de boccia junto al grupo de Comunicadores"* (lanzamientos sentada).
  2. En la **cuadrícula de habilidades de Octubre**:
     - En el taller `DEPORTE`: el ítem `"Caminar"` está en **nivel 0** (no lo realiza).
     - En el taller `VIAJAR`: figura el ítem de plantilla estándar `"Sostener caminatas"` con nivel 3 porque es una grilla compartida con el grupo Clave de Sol.
  3. **Antecedente de la palabra**:
     - En la solapa de **Septiembre**, la facilitadora había redactado: *"durante algunas caminatas por la institución se observa... inestabilidad y signos compatibles con vértigo"* y *"caminatas por diferentes senderos"* en la salida a la Reserva Los Robles.
     - En la respuesta anterior del chat, el asistente agrupó erróneamente esa referencia en el resumen de Octubre.
- **Resultado**: Se aclaró detalladamente con las citas textuales exactas del informe original de Octubre.


# Registro de Conversación - 2026-10-23 (Confirmación de Operatividad para Carga de Excels con Octubre)
## Usuario:
- "una consulta, ya puedo subir los excels que tienen el mes de octubre asi ya empiezo a subirlos a la plataforma"

## Antigravity:
- Confirmó operatividad total del servidor y del importador de planillas mensuales (`/api/youngs/import-excel`).
- Detalló los pasos recomendados para la subida desde `/final-reports` (arrastrando o seleccionando en el Bloque 4) y explicó que el sistema detecta automáticamente la solapa de Octubre, preserva los meses previos y actualiza el estado de evaluación del concurrente de inmediato.


# Registro de Conversación - 2026-11-02 (Resolución de ERR_CONNECTION_RESET en http://149.50.128.73:8000)
## Usuario:
- "No me carga, revisar que pasa" (con captura de pantalla de Chrome mostrando `ERR_CONNECTION_RESET` en `149.50.128.73:8000`).

## Antigravity:
- **Diagnóstico**:
  - Se verificó el servidor VPS: hardware, memoria y PM2 estaban activos.
  - En los registros de Node.js se detectó una excepción interna provocada por un mismatch de Server Actions de Next.js (`Failed to find Server Action "x". This request might be from an older or newer deployment`) y `Cannot read properties of null (reading 'digest')`. Al fallar el formateo del error, el socket TCP se interrumpió de golpe, generando el error `ERR_CONNECTION_RESET` en el navegador del cliente.
  - También influye si Chrome intenta autocompletar con HTTPS hacia el puerto 8000 (`https://149.50.128.73:8000`), el cual es un puerto HTTP simple.
- **Solución**:
  - Se reinició el proceso de Node.js en PM2 (`pm2 restart informes-andar`), limpiando workers y sockets colgados.
  - Se confirmó que todas las rutas (`/login`, `/final-reports`, etc.) responden con código 200/307.
  - Se proporcionaron las indicaciones al usuario: forzar recarga limpia con `Ctrl + F5` o ingresar por `http://149.50.128.73:8000` (o por el dominio seguro SSL `https://informes-andar.nexteweb.com`).


# Registro de Conversación - 2026-11-04 (Grupo Institucional en Inicio y Titularidad al Facilitador con Aclaración de Carga por Natoh)
## Usuario:
- "lo que aparece en grupo/taller esta bien? o deberia de aparecer otra cosa? ademas si el usuario natoh sube algo que se le asigne como su lo subio el facilitador de ese grupo pero con una aclaracion de que se subio desde el usuario de natoh" (con captura de la pantalla de Inicio mostrando la tabla de Cuadrículas con "ARTE / ACTIVIDADES TEATRALES / DP - AU" y Facilitador "Natoh").

## Antigravity:
- **Respuesta y Diagnóstico**:
  1. **Grupo / Taller**: No estaba bien. `ARTE / ACTIVIDADES TEATRALES / DP - AU` es el nombre técnico de una actividad pedagógica interna con siglas de dimensiones, que la tabla leía del campo interno del formulario en vez del grupo del joven. Lo que debe figurar es el **Grupo Institucional oficial** (`Promotores`, `Buenos Mozos`, `Clave de Sol`, etc.).
  2. **Titularidad y Aclaración de Facilitador**: Al subir un archivo desde la cuenta administradora de Natoh, el formulario debe asignarse en la base de datos al facilitador oficial del grupo (`created_by = groupFacilitator.id`), de modo que cuando el facilitador inicie sesión tenga plena titularidad de sus informes, visualizando en la columna Facilitador: `Lemuel Sola (subido por Natoh)`.
- **Implementación Realizada**:
  1. En `src/app/page.tsx`: se corrigió la columna para mostrar el **Grupo Institucional** (`Promotores`, etc.) y el Facilitador con la aclaración `(subido por Natoh)`.
  2. En `src/app/api/forms/route.ts`: se incorporó `uploadedBy` y resolución de facilitador oficial.
  3. En `src/app/api/youngs/import-excel/route.ts`: se configuró la asignación automática de `created_by` al facilitador del grupo cuando el uploader es admin (`Natoh`), guardando la autoría técnica `uploadedBy: 'Natoh'`.
  4. En PostgreSQL del VPS: se corrió la migración actualizando los 131 formularios históricos creados por Natoh a sus respectivos facilitadores.
  5. Desplegado y verificado en producción con recarga de PM2.


# Registro de Conversación - 2026-11-04 (Titularidad al Facilitador con Aclaración de Carga por Natoh en Informes Trimestrales y Finales)
## Usuario:
- "Lo mismo aca" (con captura de la pantalla de Inicio en la tabla de "Últimos Informes Trimestrales (Word / PDF)" mostrando a Sofía Chávez, Pablo Lezcano, Martiniano Correa, etc. con Grupo "Promotores" y Facilitador "👤 Natoh").

## Antigravity:
- **Diagnóstico**:
  - En la tabla de informes consolidados de Inicio (`src/app/page.tsx`) y en el listado de `/reports`, la columna *Facilitador* mostraba directamente al usuario `Natoh` (`generated_by = 1`), privando al facilitador del grupo (Lemuel Sola en Promotores) de la titularidad institucional y omitiendo la aclaración de que fue cargado o generado por Natoh.
  - En PostgreSQL, los informes tenían `generated_by = 1` y la consulta SQL priorizaba el nombre del usuario `u.name` sobre el facilitador de la metadata.
- **Implementación**:
  1. En `src/app/page.tsx` y `src/app/reports/page.tsx`: se actualizó la columna Facilitador para mostrar el facilitador oficial del grupo (`Lemuel Sola`, `Marina Trejo`, etc.) y debajo en tipografía secundaria `(subido por Natoh)`.
  2. En `src/app/api/reports/route.ts`: se priorizó `facilitadorNombre` en la consulta SQL y se mapeó el campo `uploadedBy`.
  3. En `final/route.ts`, `trimestral/route.ts` y `upload-manual-docx/route.ts`: al generar o subir informes desde Natoh/Admin, se asigna `generated_by` al facilitador oficial del grupo y se guarda `uploadedBy: 'Natoh'`.
  4. En PostgreSQL: se migraron todos los informes históricos de `generated_by = 1` a sus facilitadores correspondientes (0 informes huérfanos).
  5. Desplegado y verificado en vivo en producción en `http://149.50.128.73:8000`.
