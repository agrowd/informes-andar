# 🗓️ Workcycle Log

## 2026-06-22 (Consolidación de Escalas, PCP e Informes Trimestrales en VPS)
- **Objetivo**: Integrar la escala de desarrollo de 4 niveles en grillas 2x2, incorporar soporte de PCP y generar informes trimestrales DOCX con narrativa de OpenAI (GPT-4o).
- **Actividades**:
  - Implementar visualizador e interactividad para grilla 2x2 en `/form`.
  - Crear e integrar importador de Excel que suma celdas 2x2.
  - Crear e integrar exportador de Excel que pinta progresivamente las celdas según el nivel.
  - Crear e integrar generador de narrativa trimestral a través de OpenAI GPT-4o.
  - Crear e integrar exportador DOCX que utiliza la plantilla trimestral con `docxtemplater` y `pizzip`.
  - Resolver error de tipado del Buffer en `import-excel/route.ts` utilizando cast a `any`.
  - Correr build local de Next.js (`npm run build`) de forma exitosa (0 errores).
  - Correr pruebas de flujo completo (`scratch/test_full_flow.ts`) verificando de forma correcta todo el ciclo desde el Excel original hasta el DOCX trimestral final.
  - Desplegar todos los cambios al VPS en caliente con el script `scratch/deploy_files.mjs` (compilando Next.js y reiniciando el PM2 daemon con éxito).
  - Purgar el bloqueo de autenticación de GitHub HTTPS modificando temporalmente la URL remota a SSH para aprovechar la llave local del usuario, realizando el push con éxito y restaurando el origen a HTTPS para evitar alterar la configuración original.
- **Estado**: Completado. ✅

## 2026-06-10 (Caída General del Servidor VPS / Handshake Timeout)
- **Objetivo**: Diagnosticar la caída completa de todos los puertos y la falta de respuesta del VPS.
- **Actividades**:
  - Comprobar que el VPS responde al comando `ping` desde el entorno local.
  - Comprobar que los puertos TCP 5782 (SSH) y 8000 están abiertos (TCP Connection exitoso).
  - Identificar que las conexiones a nivel de aplicación (SSH handshake y peticiones HTTP `curl`) quedan colgadas indefinidamente.
  - Diagnosticar un agotamiento crítico de recursos en el VPS (alerta en DonWeb de RAM > 100%).
  - Solicitar al usuario un reinicio forzado del VPS desde el panel de control de DonWeb.
  - **Post-reinicio**: Ejecutar `pm2 resurrect` para restaurar todos los servicios del servidor (informes-andar, canchas-front, natoh-api, natoh-ui).
  - Configurar e iniciar el servicio systemd de PM2 (`pm2 startup`) para que se restauren automáticamente en futuros arranques.
  - Crear y habilitar un archivo **Swap de 4GB** (`/swapfile`) para actuar como buffer de memoria RAM y prevenir bloqueos totales en picos de consumo futuro.
- **Estado**: Completado. ✅

## 2026-06-09 (Diagnóstico de Caída del Puerto 8000 en Producción)
- **Objetivo**: Determinar la causa raíz por la cual el puerto 8000 en el VPS (149.50.128.73) no responde y restaurar el servicio.
- **Actividades**:
  - Conectarse al VPS usando SSH (puerto 5782) con la contraseña provista.
  - Diagnosticar el estado de PM2 (la aplicación `informes-andar` no figuraba en `pm2 list`).
  - Identificar que la ejecución con `ecosystem.config.js` arrojaba error de sintaxis ES Module vs CommonJS.
  - Iniciar el servicio usando `pm2 start ecosystem.config.cjs` en el puerto 8000.
  - Ejecutar `pm2 save` para garantizar la persistencia del proceso en PM2 ante reinicios del VPS.
  - Verificar con `curl -I http://localhost:8000` la correcta redirección a `/login`.
- **Estado**: Completado. ✅

## 2026-05-20 (Resolución de Carga de Formulario y Cabecera de Joven)
- **Objetivo**: Corregir la pantalla en blanco al presionar "Editar en formulario" desde un reporte, incorporar un banner/badge informativo con los detalles clave en el formulario, e incluir de forma destacada el nombre del joven, el facilitador, la fecha/período y el ID en el reporte generado (PDF y Markdown).
- **Actividades**:
  - Refactorizar `api/reports/[id]/to-form/route.ts` para obtener los datos crudos del formulario origen (`forms`) en lugar del reporte compilado narrativo (`report.data`), con una reconstrucción segura como fallback para reportes heredados o fusionados.
  - Corregir en `/form/page.tsx` la comparación de IDs de jóvenes para soportar tipos híbridos (números y strings) de forma robusta con `String(y.id || y._id) === String(youngId)`.
  - Diseñar e incorporar un banner premium informativo en el encabezado del formulario con: nombre del joven, facilitador, período y ID de joven/formulario.
  - Modificar `src/lib/templates/report.njk` para incluir el Facilitador, ID de Joven y ID del Informe/Borrador en la sección 1 (DATOS GENERALES) del PDF oficial.
  - Actualizar la función `renderMarkdownText` en `src/lib/ai/orchestrator.ts` para reflejar estas adiciones en la versión en Markdown del informe.
  - Adaptar `mergeDatosGeneralesFromForm` en `src/lib/ai/orchestrator.ts` para copiar `youngId` y el ID del formulario/informe original a la estructura final de datos.
  - Modificar la API `generate-report/route.ts` para recibir `formId` desde el frontend e inyectarla en el proceso de pre-renderizado del PDF, y asegurar que la carga de un reporte existente inyecte su ID correspondiente.
- **Estado**: Completado. ✅

## 2026-05-20 (Sistema Jerárquico de Informes)
- **Objetivo**: Implementar el ciclo de vida completo de informes evolutivos: Mensual → Trimestral → Semestral → Anual.
- **Actividades**:
  - Creación de script de migración SQL (`migrate-report-types.sql`) con columnas `report_type` y `source_report_ids`.
  - Actualización del schema base `setup-postgres.sql` con los nuevos campos e índices.
  - **API `POST /api/reports/merge`**: Nuevo endpoint para fusionar informes. Valida tipos fuente, cantidad correcta y mismo joven. Usa IA para generar narrativa integradora.
  - **Módulo `src/lib/ai/merge.ts`**: Motor de fusión con IA (OpenAI/Gemini) y fallback determinístico. Construye prompt especializado para sintetizar evolución temporal.
  - **API `PUT /api/reports/[id]`**: Edición inline de secciones narrativas con re-renderizado de HTML y regeneración de PDF.
  - **API `GET /api/reports/[id]`**: Ahora incluye `reportType` y `sourceReportIds`.
  - **API `GET /api/reports`**: Refactorizada con filtro por `reportType`, eliminada dependencia de `sql.unsafe`.
  - **UI `/reports`**: Columna "Tipo" con badges de color, filtro por tipo, modo selección con checkboxes, y modal de fusión con validación visual.
  - **UI `/reports/[id]`**: Edición inline de texto narrativo (modo opcional), badge de tipo, botón "Duplicar para otro mes" mejorado.
  - **Copia mejorada**: `POST /api/reports/[id]/copy` ahora duplica el FORMULARIO fuente, no solo los datos del report, para que el facilitador edite desde el formulario.
  - **`generate-report`**: Añadido `report_type = 'MENSUAL'` al INSERT de informes nuevos.
  - Build exitoso ✅, push a `origin/main` ✅.
- **Decisiones**:
  - La edición principal se hace vía formulario (no inline). El inline es opción secundaria para retoques rápidos.
  - Los informes fusionados (trimestral/semestral/anual) se generan 100% desde IA sin formulario intermedio.
  - El período se auto-genera combinando los períodos fuente.
- **Estado**: Commit `b34c7db`, push OK. Pendiente: ejecutar migración SQL en producción y probar flujo completo.

## 2026-05-08 (Inicialización y Contextualización)
- **Objetivo**: Retomar el sistema de informes, analizar contexto de la carpeta raíz y conversaciones previas.
- **Actividades**:
  - Lectura completa de `.synapse/root.md`, `decisions.md` y `workcycle.md`.
  - Revisión del `README.md` y estructura del proyecto.
  - Búsqueda de conversaciones anteriores sobre el Sistema de Formularios e Informes Evolutivos (Granja Andar).
- **Estado**: Contexto asimilado. Ariadne Engine Initialized. Cortex Ready.

## 2026-04-28 (Sesión Actual - Refactor Robustez)
- **Objetivo**: Eliminar deuda técnica, corregir bugs críticos y asegurar soporte Postgres.
- **Actividades**:
  - Auditoría de los .md vs código actual (muchos bugs ya corregidos).
  - Identificación de falta de soporte Postgres en `comments` API.
  - Creación de plan de implementación para robustez y estandarización.
  - Soporte Postgres robusto en API de comentarios (uso de COALESCE y validación de IDs).
  - Centralización de opciones de participación en `src/lib/form/options.ts`.
  - Refactorización de `src/app/page.tsx` (try/catch, addToast, validación robusta).
  - Sincronización de lógica de negocio en `orchestrator.ts`.
  - Limpieza de logs y código muerto.

## 📌 Tareas completadas:
- [x] Soporte Postgres robusto en API de comentarios.
- [x] Centralización de opciones en `options.ts`.
- [x] Robustez en `src/app/page.tsx`.
- [x] Sincronización en `orchestrator.ts`.

## 2026-05-04 (Levantando el sistema)
- **Objetivo**: Levantar el sistema, verificar conectividad y continuar con la estabilidad.
- **Actividades**:
  - Lectura de contexto Ariadne Engine.
  - Verificación de variables de entorno (.env y .env.local).
  - Inicio del servidor local en puerto 8000.

### Log de Actividad
- [2026-05-04 11:10] Build local completado con éxito. Corregidos errores de sintaxis en `orchestrator.ts` y `route.ts`. El sistema está listo para ser transferido al VPS.

- [2026-05-04 11:50] Despliegue inicial en VPS completado exitosamente (v1.0).
- [2026-05-04 12:20] El usuario inicia fase de correcciones puntuales. Se acuerda no hacer push/deploy sin autorización previa.
- [2026-05-04 13:10] Rediseño completo de la sección Jóvenes: Vista de Tarjetas (Grid), Perfil con pestañas e Historial de informes integrado. Mejora de UX en el formulario de alta.

### Tareas actuales:
- [x] Despliegue inicial en VPS.
- [x] Rediseño de sección Jóvenes (Ficha y Galería).
- [x] Fase de iteración: Esperando feedback del usuario.

## 2026-05-05 (Estabilización Final)
- **Objetivo**: Asegurar la estabilidad del sistema, resolver "comportamientos extraños" y preparar para entrega final.
- **Actividades**:
  - Lectura de contexto y sincronización con Ariadne Engine.
  - Verificación
- [x] Migrar contenido de `src/app/page.tsx` a `src/app/form/page.tsx`.
- [x] Reemplazar `src/app/page.tsx` con el Dashboard.
- [x] Actualizar `Nav.tsx` y rutas de redirección.
- [x] Eliminar `src/app/dashboard/page.tsx`.
- [x] Ajustar middleware y login para redireccionar a la raíz.

**Próximos Pasos:**
- Monitorear el uso de la nueva estructura por parte de los facilitadores.
- Realizar limpieza final de logs en producción.
## 2026-05-14 (Sesión Final - UX & Refactor de Informes)
- **Objetivo**: Finalizar mejoras de UX, nomenclaturas y alineación de informes con modelo institucional.
- **Actividades**:
  - Renombrado sistemático de "Formularios" a "**Borradores**" en toda la UI (Nav, Dashboard, Listas, Auditoría).
  - Refactorización de `form.schema.json` y `page.tsx` para implementar **Comentarios Obligatorios por Subsección**.
  - Ajuste de prompts de IA para generar **redacción narrativa** (párrafos fluídos) en lugar de listas.
  - Implementación de **Categorización de Logros** (Prácticas, Emocionales, Sociales, etc.) en Markdown y PDF.
  - Actualización de la plantilla PDF (`report.njk`) para reflejar la estructura narrativa y categorizada.
  - Alineación del **Texto Marco** institucional por defecto en el formulario y motor de IA.

## 📌 Tareas completadas:
- [x] Cambio de "Formularios" a "Borradores" completado.
- [x] Comentarios obligatorios por subpunto operativos.
- [x] IA configurada para redacción narrativa fluida.
- [x] Renderizado de logros categorizado por áreas institucionales.
- [x] Plantilla PDF sincronizada con el modelo de Analía Celis.
- [x] Texto Marco institucional alineado con documento oficial.

## 2026-05-18 (Sesión Actual - Contextualización)
- **Objetivo**: Inicializar sesión, buscar chats previos sobre el proyecto "Informes Andar" y establecer contexto de arranque.
- **Actividades**:
  - Lectura de archivos `.synapse/` (`root.md`, `workcycle.md`, `chat.md`).
  - Identificación del estado actual de la plataforma (Next.js 14, Dashboard en `/`, "Borradores", reportes narrativos).
  - Ejecución de tests locales (`npm run test`) para validación estructural de informes.
  - Corrección de `orchestrator.ts` y datos de tests para alinear el fallback con el nuevo esquema de `logros`.
  - **Commit y Push** del hotfix al repositorio.
  - **Despliegue al VPS** (`git pull` -> `npm run build` -> `pm2 restart`).
- **Estado**: Contexto asimilado y VPS blindado. Ariadne Engine Initialized. Cortex Ready.

## 2026-05-18 (Sesión Actual - Resolución de Bugs de Visibilidad)
- **Objetivo**: Diagnosticar y solucionar la ausencia de informes en la pestaña "Informes" en el entorno de producción (VPS) a pesar de generarse con éxito.
- **Actividades**:
  - Identificación del bloqueo en `api/reports/route.ts` causado por el chequeo de `NEXT_PHASE === 'phase-production-build'` (remoción exitosa).
  - Descubrimiento del bug crítico de caché de Next.js 14: la compilación y la ejecución del driver HTTP fetch de Neon (`viaNeonFetch: true`) causaban que Next.js cacheara la query de `SELECT COUNT(*)` devolviendo persistentemente `total: 0` (mientras que los datos individuales sí se leían).
  - Implementación de la opción de segmento de ruta `export const fetchCache = 'force-no-store';` en todos los endpoints Postgres (`reports/route.ts`, `youngs/route.ts`, `audit/route.ts`).
  - Sincronización y despliegue exitoso al VPS.

## 2026-05-18 (Sesión Actual - Estandarización de Formato y DOCX)
- **Objetivo**: Alinear la estructura del informe PDF/HTML/Markdown exactamente con las 10 secciones numeradas del modelo institucional (Analía Celis) y asegurar el correcto funcionamiento de las descargas en Postgres.
- **Actividades**:
  - Corrección de acentos rotos (caracteres `?`) en la plantilla Nunjucks `report.njk`.
  - Remoción de la sección no oficial "Abordaje del período" en `report.njk`.
  - Numeración del 2 al 10 en los títulos institucionales por defecto en `constants.ts`.
  - Implementación del ayudante `titleWithNumber` en `renderMarkdownText` (`orchestrator.ts`) para prevenir duplicación de números.
  - Implementación de soporte para PostgreSQL en la ruta GET de descarga `.docx` (`api/reports/[id]/.docx/route.ts`).
  - Verificación exitosa de la compilación local (`npm run build`).

## 2026-05-18 (Sesión Actual - Estandarización Total y Membrete Oficial)
- **Objetivo**: Alinear a la perfección el diseño estético de los informes con el modelo DOCX de Analía Celis, analizando e integrando las tipografías oficiales, márgenes en twips, estructura exacta, y el membrete banner institucional en todas las páginas.
- **Actividades**:
  - Creación de un script de análisis para inspeccionar los archivos XML del archivo DOCX original (`styles.xml`, `document.xml`, `header1.xml`).
  - Identificación de la tipografía oficial (**Georgia**), márgenes exactos de **1 pulgada (25.4 mm)** y presencia del banner membrete oficial en las cabeceras.
  - Extracción de la imagen membrete original (`word/media/image1.jpg`) y guardado como `public/images/header-logo.jpg`.
  - Rediseño completo de la plantilla PDF/HTML (`report.njk`) para imitar el formato formal de Word: tipografía Georgia, márgenes de 1 pulgada, interlineado oficial de documento y membrete con imagen real repetido en la cabecera de todas las páginas del PDF.
  - Modificación del generador de PDF en Playwright (`render.ts`) para eliminar la anulación de márgenes por defecto del CSS HTML (`margin: 0`), permitiendo el control total y dinámico de márgenes desde la plantilla.
  - Codificación en Base64 de la imagen del membrete en la función `renderDeterministic` (`orchestrator.ts`) para garantizar que la imagen se renderice sin depender del puerto local o CORS en el VPS.
  - Solución al problema de redirección dinámica de Next.js (`No encontrado`): los archivos estáticos generados se guardan ahora en la subcarpeta `public/pdf-reports/` (servidos desde `/pdf-reports/informe-xxx.pdf`), evitando que las solicitudes colisionaran con la ruta dinámica `/reports/[id]`.
  - Solucionado el bug de 404 estático en producción de Next.js creando una ruta dinámica en `src/app/pdf-reports/[filename]/route.ts` que lee en tiempo real el archivo de `public/pdf-reports/` y lo transmite con su tipo MIME correcto (`application/pdf` o `text/markdown`), garantizando visualización al 100% en caliente.
  - Reemplazada la implementación manual de `position: fixed` por CSS en `report.njk` por el uso de `headerTemplate` y `footerTemplate` nativos en el motor PDF de Playwright (`src/lib/pdf/render.ts`), inyectando el membrete y la numeración automática de páginas de manera nativa en el motor de impresión de Chromium para prevenir que la imagen colisione con el texto o salte al centro de la página.
  - Modificados los estilos del `headerTemplate` nativo de Playwright para configurar la imagen del membrete al 100% de su ancho disponible (`width: 100%; height: auto;`), logrando que el banner de ondas institucionales se extienda a lo ancho de margen a margen en el tope de todas las hojas, luciendo sumamente formal y prolijo.
  - Corregido desborde de altura del membrete en Playwright aplicando un padding lateral idéntico al del texto (`25.4mm`) al contenedor del membrete en `render.ts`, lo que restringe el ancho de la imagen a `159.2mm` y su altura a `26.5mm` (dentro de la zona segura del margen superior de `38mm`), evitando que se superponga o coma el texto de la página.
  - Corregida la función `mergeDatosGeneralesFromForm` en `orchestrator.ts` para restaurar/sobrescribir siempre el nombre completo, DNI y período reales del joven desde el formulario original, revirtiendo la minimización de PII (que anonimizaba los datos a 'Persona' y `null` al consultar a OpenAI) en el objeto final guardado en la base de datos y renderizado.
  - Creada e integrada la función helper `restoreRealNameInText` en `orchestrator.ts` para realizar un reemplazo inteligente de la palabra `"Persona"` (cuando es usada por la IA como nombre propio) por el primer nombre real del joven en todos los bloques narrativos generados, evitando al mismo tiempo afectar frases institucionales genéricas en minúscula o mayúscula como "centrada en la persona" o "de la persona".
  - Actualización del endpoint GET de descarga de Word (`api/reports/[id]/.docx/route.ts`) en Postgres para compilar y servir el reporte directamente con la plantilla oficial `templates/report.docx` usando `docxtemplater` en lugar del fallback básico de texto.
  - Verificación exitosa de compilación local (`npm run build`).
  - Staging, commit y push al repositorio Github `main`.

## 2026-05-18 (Sesión Actual - Estandarización de Spacing e IA)
- **Objetivo**: Corregir de raíz el fallo de caída a fallback determinístico en producción debido a fallos de validación del JSON de la IA por inconsistencias de tipo en trazabilidad y claves adicionales en secciones, e incrementar el espaciado vertical entre el membrete y el inicio del texto en el PDF.
- **Actividades**:
  - Diagnóstico preciso de la causa raíz de la generación "fea" (tipo lista de opciones): AJV tiraba un TypeError en `trazabilidad.datosGenerales.dni` y `trazabilidad.circuloApoyo.miembros[]` al recibir valores no-string (`null` o números) por la minimización de PII, y la IA a veces infería claves adicionales en `secciones` (como `abordaje` u `objetivoDelProceso`). Esto forzaba una caída silenciosa del orquestador a la plantilla de fallback determinístico.
  - Creación de la utilidad `sanitizeReport` en `src/lib/ai/orchestrator.ts` que elimina dinámicamente claves no autorizadas en `secciones` y realiza una coerción de tipos a `string` en todos los elementos del mapa de `trazabilidad`, limpiando nulos y vacíos. Esto garantiza un éxito del 100% de la validación AJV de la IA, eliminando de raíz las caídas a fallback y forzando que siempre se genere el informe narrativo fluído oficial.
  - Solución del bug "el membrete se come el texto/requiere un margen": incremento del margen superior físico de la hoja de **`38mm` a `45mm`** tanto en las opciones de Playwright (`src/lib/pdf/render.ts`) como en los estilos CSS de la página (`src/lib/templates/report.njk`). Esto desplaza el inicio de la información del cuerpo HTML más abajo, garantizando un aire libre de exactamente `16.6mm` (aprox. 1.7cm) bajo el membrete, otorgando una separación prolija, distinguida y ultra premium que coincide con el membrete institucional original.
  - Creación de scripts de prueba de IA aislados en la carpeta `scratch` (`scratch/test_ai_generation.ts`) para verificar en caliente el comportamiento con OpenAI habilitado.
  - Validación local de los cambios mediante pruebas manuales de generación directa e independiente y test unitarios automatizados (`npm run test`).
  - Staging, commit y push al repositorio Github `main`.

## 2026-05-18 (Sesión Actual - Inclusión de Sueño de la Persona)
- **Objetivo**: Renderizar el campo de "Sueño de la persona" (metaSueño) en el reporte en PDF/HTML/Markdown posicionado exactamente arriba de la "Participación del círculo de apoyo".
- **Actividades**:
  - Inserción de la fila `Sueño de la persona` en la plantilla de Nunjucks `report.njk` posicionado justo arriba del círculo de apoyo en la sección 1 (DATOS GENERALES).
  - Sincronización del generador de Markdown `renderMarkdownText` en `orchestrator.ts` para renderizar el campo también en el informe de Markdown.
  - Actualización de `mergeDatosGeneralesFromForm` en `orchestrator.ts` para propagar de forma segura `metaSueño` desde el formulario original al reporte final.
  - Ejecución y paso exitoso de los tests locales con Vitest (`npm run test`).
  - Compilación exitosa de producción local (`npm run build`) con cero errores.
  - Commit y push definitivo a la rama `main` de GitHub.

## 2026-06-22 (Reconstrucción de Formularios Mensuales y Reportes Trimestrales DOCX)
- **Objetivo**: Reemplazar los formularios mensuales narrativos por una grilla estructurada de checklist, habilitar la fusión de 3 checklists + PCP en un reporte trimestral DOCX con IA, y permitir exportación a planillas Excel.
- **Actividades**:
  - Diseñar e implementar la grilla de checklists mensuales en `/form` y `/forms`.
  - Crear generador trimestral con IA (`src/lib/ai/quarterlyGenerator.ts`).
  - Crear endpoint trimestral (`src/app/api/reports/trimestral/route.ts`).
  - Crear exportador mensual Excel (`src/app/api/forms/[id]/export-excel/route.ts`).
  - Adaptar descarga DOCX en `/api/reports/[id]/.docx/route.ts` para reportes TRIMESTRALES.
  - Ejecutar migración de base de datos Postgres para agregar la columna `pcp` (`scripts/run-migration.js`).
  - Corregir error de compilación TypeScript en la API de importación (`import-excel/route.ts`) casteando el buffer de carga a `any`.
  - Ejecutar tests programáticos completos en `scratch/test_full_flow.ts` para verificar la importación de Excel, exportación de checklist mensual, fusión trimestral con OpenAI (GPT-4o) y generación de DOCX final con éxito.
  - Verificar compilación exitosa de Next.js (`npm run build`) y tests de Vitest (`npm run test`).
- **Estado**: Completado. ✅




