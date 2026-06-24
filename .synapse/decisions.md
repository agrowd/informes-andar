# 🔒 Decision Log (Chesterton's Fences)

| ID | Decisión Técnica | La Razón (The Why) | Estado |
|:---|:---|:---|:---|
| D-01 | **Puerto 8000** | Requerimiento específico del entorno de desarrollo del cliente para evitar conflictos. | 🔒 LOCKED |
| D-02 | **Next.js 14 App Router** | Uso de React Server Components para mejor performance y SEO. | 🔒 LOCKED |
| D-03 | **Soporte Híbrido Mongo/Postgres** | Facilitar la migración de datos existentes en MongoDB mientras se aprovechan las capacidades relacionales de Postgres en Vercel. | 🟢 ACTIVE |
| D-04 | **Validación con AJV** | Garantizar que los datos que alimentan a la IA y los que devuelve cumplen estrictamente con los esquemas definidos. | 🔒 LOCKED |
| D-05 | **Playwright para PDF** | Mayor fidelidad visual en la conversión de HTML a PDF comparado con librerías puramente JS. | 🔒 LOCKED |
| D-06 | **Gemini 1.5 Flash como default** | Balance óptimo entre costo, latencia y ventana de contexto para generación de informes. | 🟢 ACTIVE |
| D-07 | **Refactorización de Robustez** | Se priorizó el uso de bloques try/catch y feedback vía Toasts para evitar fallos silenciosos en producción. | 🔒 LOCKED |
| D-08 | **Centralización de Opciones** | Se eliminaron strings hardcoded en favor de arrays centralizados en `options.ts` para asegurar integridad entre UI y IA. | 🔒 LOCKED |
| D-09 | **Postgres JSONB Coalesce** | Uso obligatorio de `COALESCE(column, '[]'::jsonb)` para evitar errores al intentar operar sobre campos JSONB nulos. | 🔒 LOCKED |
| D-10 | **Cambio a GPT-4o** | Se cambió el modelo de generación a GPT-4o para mejorar la calidad narrativa y el seguimiento de patrones institucionales complejos. | 🔒 LOCKED |
| D-11 | **Comentarios Obligatorios** | Forzar la personalización del informe por parte del facilitador, evitando reportes genéricos. | 🔒 LOCKED |
| D-12 | **Gráfico Radar para Calidad de Vida** | Proporcionar una visualización intuitiva del progreso multidimensional del joven. | 🔒 LOCKED |
| D-13 | **Indicador de Guardado Estable** | Reducir el parpadeo visual (flickering) que causaba confusión y fatiga durante la edición. | 🔒 LOCKED |
| D-14 | **Nomenclatura "Borradores"** | Diferenciar claramente un documento en edición de un "Informe" final validado institucionalmente. | 🔒 LOCKED |
| D-15 | **Redacción Narrativa en IA** | Cumplir con el modelo institucional de informes evolutivos, priorizando párrafos fluidos sobre listas. | 🔒 LOCKED |
| D-16 | **Categorización de Logros** | Organizar los avances del joven en dimensiones institucionales específicas (Prácticas, Emocionales, etc.) para mayor claridad. | 🔒 LOCKED |
| D-17 | **Desactivación de fetchCache en SQL** | Next.js 14 cachea agresivamente las peticiones HTTP fetch usadas por el driver serverless de Neon, haciendo que `COUNT(*)` devuelva `0` falsamente. Se deshabilita con `export const fetchCache = 'force-no-store'`. | 🔒 LOCKED |
| D-18 | **Numeración de 10 secciones institucionales** | Alinear la estructura del PDF/HTML/Markdown exactamente con las 10 secciones numeradas del modelo Analía Celis usando `titleWithNumber` para evitar duplicados. | 🔒 LOCKED |
| D-19 | **Remoción de "Abordaje del período"** | Quitar la sección no oficial de abordaje de la plantilla para encajar 100% en el formato oficial institucional de Granja Andar. | 🔒 LOCKED |
| D-20 | **Soporte Postgres para descargas DOCX** | Habilitar compatibilidad con base de datos Neon SQL para exportar en formato .docx en producción en la ruta GET `.docx`. | 🔒 LOCKED |
| D-21 | **Sanitización Dinámica de Reporte en IA** | sanitizeReport limpia propiedades sobrantes e induce tipos correctos (como string en trazabilidad) para cumplir estrictamente con AJV y evitar fallos que fuercen el fallback determinístico. | 🔒 LOCKED |
| D-22 | **Margen Superior de 45mm** | Aumentar el margen a 45mm en Playwright y CSS garantiza un aire de 16.6mm debajo del membrete (de 28.4mm de alto) que evita superposiciones de manera segura en todos los sistemas. | 🔒 LOCKED |
| D-23 | **Jerarquía de Informes (report_type)** | Se agrega columna `report_type` (MENSUAL/TRIMESTRAL/SEMESTRAL/ANUAL) y `source_report_ids` a la tabla `reports` para soportar la acumulación progresiva PCP. Los informes mensuales son el nivel base; los superiores se generan por fusión con IA. | 🔒 LOCKED |
| D-24 | **Fusión sin Formulario Intermedio** | Los informes trimestrales/semestrales/anuales NO pasan por formulario. Se generan 100% desde la fusión con IA de los informes hijos. El facilitador edita el resultado final vía formulario original o retoques inline. | 🔒 LOCKED |
| D-25 | **Edición Principal vía Formulario** | La edición principal del informe es a través del formulario (no edición inline directa). El inline queda como opción secundaria para retoques rápidos de texto narrativo. | 🔒 LOCKED |
| D-26 | **Duplicación de Formulario (no Report)** | Al duplicar un informe para otro mes, se copia el formulario fuente (no los datos del report), para que el facilitador trabaje sobre los campos del formulario y regenere. | 🔒 LOCKED |
| D-27 | **PM2 Config con `.cjs`** | Usar `ecosystem.config.cjs` en lugar de `.js` en el VPS porque Next.js está configurado como ES Module (`"type": "module"`) y PM2 arroja error al parsear sintaxis de `module.exports` en extensiones `.js`. | 🔒 LOCKED |
| D-28 | **Swap File de 4GB** | Crear un archivo `/swapfile` de 4GB en el VPS para actuar como buffer de memoria virtual y prevenir bloqueos totales (congelamientos) por consumo excesivo de RAM. | 🔒 LOCKED |
| D-29 | **Autostart de PM2 via systemd** | Configurar `pm2 startup` y habilitar el servicio `pm2-root.service` en el VPS para que el listado de aplicaciones y sus entornos se restauren automáticamente (resurrect) ante reinicios del VPS. | 🔒 LOCKED |
| D-30 | **Grilla 2x2 para Niveles** | Representar los 4 niveles de desarrollo institucional mediante un checklist reactivo en una cuadrícula CSS Grid de 2x2 en la interfaz de usuario, ofreciendo una experiencia altamente interactiva e intuitiva. | 🔒 LOCKED |
| D-31 | **Pintado Progresivo en Excel** | Pintar celdas en el Excel de forma secuencial según el nivel (1: Arriba-Izq, 2: Abajo-Izq, 3: Arriba-Der, 4: Abajo-Der) utilizando la coloración celeste institucional `FFA4C2F4` para alinearse con las referencias del Excel de Granja Andar. | 🔒 LOCKED |
| D-32 | **Formateo de fechas auto-convertidas en Excel** | En Excel, las celdas con fracciones o niveles de apoyo (ej: "4/3") se auto-convierten automáticamente en objetos Date por la configuración regional. En la importación, los convertimos de vuelta a una cadena limpia "mes/día" o "día/mes/año" en lugar de guardar la cadena completa de zona horaria de JS. | 🔒 LOCKED |
| D-33 | **Flujo de Éxito del Asistente Post-Importación** | Agregar un callback de éxito (`onSuccess`) al asistente `ExcelImportWizardModal`. En el perfil del joven recarga el historial y activa la pestaña "Historial" directamente. En el listado general de borradores, redirige al usuario a `/reports` para ver el informe trimestral recién creado. | 🔒 LOCKED |
| D-34 | **Escaneo flexible de metadatos en importador** | Buscar los metadatos de facilitador y taller escaneando las filas 1 a 6 y columnas 1 a 8 en lugar de depender de posiciones fijas (como `D4` o `A5`), logrando compatibilidad con múltiples variantes de diseño de planillas. | 🔒 LOCKED |
| D-35 | **Vinculación Dinámica de Años en DOCX** | Reemplazar los años fijos (2024 y 2025) en el XML de la plantilla de Word por placeholders `{pcpAnio}` y `{periodoAnio}` e inyectarlos desde el endpoint de descarga realizando un JOIN en Postgres para obtener el PCP del concurrente, garantizando consistencia temporal. | 🔒 LOCKED |
| D-36 | **Exclusión Dinámica de PCP en Importador** | Identificar la solapa de PCP por ID en lugar de solo por nombre para excluirla de forma robusta de la importación de planillas de habilidades mensuales, evitando colisiones si la solapa tiene sufijos o nombres especiales. | 🔒 LOCKED |
| D-37 | **Fidelidad Absoluta de Datos en IA** | Prohibir inductores (biasing examples) en la definición de claves JSON del prompt de fusión trimestral, forzando a la IA a redactar sobre apoyos recreativos en lugar de alucinar destrezas motrices o independencia física no registradas en concurrentes con movilidad reducida (silla de ruedas). | 🔒 LOCKED |
| D-38 | **Búsqueda Dinámica de Sueños en PCP** | Escanear de forma secuencial la columna A del PCP identificando el inicio mediante la palabra clave `"SUEÑO"` / `"SUEÑOS"` y deteniéndose ante etiquetas como `"SIS"` o `"PLAN DE FUTURO"`, logrando una captura fiel del sueño y evitando capturar erróneamente siglas de escalas. | 🔒 LOCKED |
| D-39 | **Ampliación de Escaneo de Dimensiones PFP** | Iniciar el barrido del plan de futuro del PCP en la fila 24 (en lugar de la 26) para permitir capturar la dimensión `BF` (Bienestar Físico) que se ubica en la fila 25 de la plantilla oficial de Andar. | 🔒 LOCKED |






