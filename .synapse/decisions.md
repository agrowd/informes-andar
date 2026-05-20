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


