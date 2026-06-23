# Changelog

## [1.7.0] - 2026-06-23
### Added
- Asistente interactivo de importación (`ExcelImportWizardModal`) para realizar fusión trimestral directamente tras la importación exitosa de planillas de Excel.
- Rediseño premium de la pestaña PCP de concurrentes en `/youngs` con subpestañas organizadas por dimensiones e indicador interactivo de "Empty State" para generación con IA o creación manual.
- Panel de control flotante en la parte inferior de `/forms` (borradores) con validaciones inteligentes de joven y mes en tiempo real para fusión trimestral.
- Soporte para creación de borradores mensuales completamente en blanco (sin plantilla predefinida) y botones de control ("Cargar Plantilla Estándar" y "Vaciar todo") en el editor `/form`.
- Utilidad de impresión de PCP con estilo formal (Georgia) desde la ficha del joven.

### Fixed
- Corrección de error de paréntesis de JSX en `src/app/form/page.tsx`.
- Solución definitiva al error de unicode escape en `src/app/youngs/page.tsx` removiendo barras de escape en comillas y variables del template literal.

## [1.6.0] - 2026-06-22
### Added
- Grilla de checklist reactiva de 2x2 en `/form` representando los 4 niveles de desarrollo.
- Importador de planillas de Excel mensuales que calcula el nivel sumando las celdas coloreadas en el bloque 2x2.
- Exportador de planillas de Excel mensuales que pinta progresivamente las celdas del bloque 2x2 basado en el nivel guardado.
- Integración de PCP y escala de niveles en la base de datos Postgres (Neon DB) con migración para columna `pcp`.
- Generación narrativa de informes trimestrales por IA (OpenAI GPT-4o) que consume los niveles y la PCP de forma consolidada.
- Exportación a DOCX de informes trimestrales respetando exactamente la estructura de 12 secciones narrativas.

## [1.5.0] - 2026-05-20
### Added
- Cabecera premium informativa en el editor de formulario (/form) con nombre del joven, facilitador, periodo evaluado e ID de borrador/formulario.
- Incorporación destacada en la Sección 1 (DATOS GENERALES) de los informes en PDF y Markdown del nombre del joven, el facilitador, periodo, ID del Joven y ID del Informe.
- Regeneración automática del PDF y Markdown con el ID definitivo de la base de datos tras su inserción persistente.
- Auto-completado del facilitador asignado basado en la sesión de usuario activa.
- Soporte para inicialización directa de un borrador para un joven específico vía query param (`/form?youngId=...`).

### Fixed
- Corrección de la pantalla en blanco (crash de carga) al editar un formulario desde un reporte, implementando recuperación robusta de `formData` desde la base de datos de origen de borradores, con reconstrucción determinística segura para reportes huérfanos/fusionados.
- Solución definitiva a la comparación de IDs híbridos (String/ObjectId/Number) de jóvenes en el formulario.

## [1.4.0] - 2026-05-14
### Added
- Nueva nomenclatura sistemática: "Formularios" ahora se denominan "**Borradores**".
- Redacción narrativa fluida (párrafos) en informes generados por IA.
- Categorización automática de logros (Prácticas, Emocionales, Sociales, etc.) en Markdown y PDF.
- Soporte para múltiples comentarios obligatorios por subsección en el formulario.

- Refactorización de la plantilla PDF (`report.njk`) refactorizada para alinearse con el modelo institucional de Analía Celis.
- Prompts de IA refinados para evitar listas y favorecer prosa formal.
- Renderizador de Markdown optimizado para unificar fragmentos de texto.
- Alineación del **Texto Marco** institucional por defecto en el formulario y motor de IA.

## [1.3.0] - 2026-05-14
### Added
- Gráfico de Radar comparativo para dimensiones de Calidad de Vida.
- Pestaña "Analíticas" en el perfil del joven.
- Funcionalidad de duplicación de formularios en Dashboard y lista.
- Campo de nombres específicos en Círculo de Apoyo (Rojo/Amarillo).
- Pre-carga de Texto Marco Institucional oficial.

### Changed
- Comentarios de personalización obligatorios por sección.
- Validación de formulario actualizada (AJV + lógica personalizada).
- Mejora de UI para móviles (targets táctiles y tipografía).
- Estabilización visual del indicador de guardado automático.

### Fixed
- Flickering (parpadeo) durante el auto-save de formularios.
- Consistencia de datos en la duplicación de formas.

## [1.2.0] - 2026-05-05
### Changed
- Reorganización del frontend: El **Dashboard** ahora es la página de inicio (`/`).
- El **Formulario de Carga** se movió a una ruta independiente (`/form`).
- Actualización de la barra de navegación para reflejar la nueva jerarquía.
- Redirecciones post-login ajustadas para apuntar a la raíz.

### Fixed
- Enlaces de edición y generación en la lista de formularios actualizados a la nueva ruta.
- Eliminación de página redundante `/dashboard`.

## [1.1.0] - 2024-04-28
### Added
- Soporte Postgres para la API de comentarios de informes.
- Centralización de opciones de participación en `src/lib/form/options.ts`.

### Fixed
- Manejo de errores en fetches del frontend con avisos visuales (toasts).
- Validación de participación "No participó por decisión propia" estandarizada.
- Corrección de bugs de formato en `src/app/page.tsx` (OptionNote mangled).
- Soporte dual DB (Mongo/Postgres) en endpoints críticos.

## [1.0.0] - 2024-04-28
- Inicialización del proyecto.
- Auditoría inicial y detección de deuda técnica.
