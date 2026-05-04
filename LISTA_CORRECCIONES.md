# 🔧 Lista Completa de Correcciones Necesarias

## 🔴 CRÍTICO - Prioridad Alta (Arreglar primero)

### 1. ❌ Reemplazar localStorage por Base de Datos para Formularios
**Problema actual:**
- El formulario guarda en `localStorage` cada cambio (línea 108 de `src/app/page.tsx`)
- Solo guarda en DB cada 60 segundos (línea 133)
- Si se pierde localStorage, se pierden todos los datos
- No se puede recuperar desde otra máquina/dispositivo
- No hay historial de cambios

**Archivos afectados:**
- `src/app/page.tsx` - Líneas 105-152, 167-229

**Solución requerida:**
- Eliminar guardado en localStorage (o mantenerlo solo como cache temporal)
- Guardar en DB inmediatamente después de cada cambio (con debounce de 2-3 segundos)
- Cargar desde DB al iniciar (no desde localStorage)
- Mantener localStorage solo como backup/offline
- Mostrar indicador "Guardado en DB" vs "Guardando..."

**Impacto:** ALTO - Afecta la persistencia de datos

---

### 2. ❌ Sistema de EditableText - Solo visible para ADMIN/COORDINACION
**Problema actual:**
- El botón de edición (✎) aparece para TODOS los usuarios
- Cualquiera puede editar títulos y textos del sistema
- No hay validación visual de permisos en el componente

**Archivos afectados:**
- `src/app/_components/EditableText.tsx` - Línea 70 (botón siempre visible)

**Solución requerida:**
- Verificar rol del usuario antes de mostrar botón de edición
- Solo mostrar ✎ si el usuario es ADMIN o COORDINACION
- Ocultar completamente el botón para FACILITADOR
- El endpoint ya tiene validación (línea 66 de `src/app/api/editable-text/[key]/route.ts`), pero la UI no

**Impacto:** MEDIO - Seguridad y UX

---

### 3. ❌ Botón "Solicitar Cambios" en UI de Revisión
**Problema:**
- El estado `CAMBIOS_SOLICITADOS` existe pero NO hay botón en la UI
- Los coordinadores solo pueden agregar comentarios, no cambiar estado formalmente

**Archivos afectados:**
- `src/app/reports/[id]/page.tsx` - Falta botón

**Solución requerida:**
- Agregar botón "Solicitar cambios" visible solo para ADMIN/COORDINACION
- Cambiar estado a `CAMBIOS_SOLICITADOS`
- Opcional: Requerir al menos un comentario antes de solicitar cambios

**Impacto:** ALTO - Flujo de trabajo crítico

---

### 4. ❌ Soporte Postgres en Endpoint de Status
**Problema:**
- El endpoint `/api/reports/[id]/status` solo funciona con MongoDB
- No funciona si se usa Postgres

**Archivos afectados:**
- `src/app/api/reports/[id]/status/route.ts` - Solo código MongoDB

**Solución requerida:**
- Agregar soporte para Postgres usando `sql`
- Mantener validaciones de permisos
- Probar con ambas bases de datos

**Impacto:** ALTO - Compatibilidad con Postgres

---

### 5. ❌ Link formId al Generar Informe
**Problema:**
- Cuando se genera informe, el `formId` se guarda como `null`
- No se puede rastrear qué formulario generó qué informe

**Archivos afectados:**
- `src/app/api/generate-report/route.ts` - Línea donde se crea el informe

**Solución requerida:**
- Obtener el `formId` del formulario guardado antes de generar
- Guardar la relación correctamente en la base de datos
- Mostrar el formulario relacionado en la vista del informe

**Impacto:** MEDIO - Trazabilidad

---

## 🟡 IMPORTANTE - Prioridad Media

### 6. ❌ Cargar Formulario desde DB al Iniciar (no localStorage)
**Problema:**
- Al cargar la página, primero intenta cargar desde localStorage
- Solo carga desde DB si hay `reportId` o `formId` en URL
- Debería cargar el último borrador guardado del usuario desde DB

**Archivos afectados:**
- `src/app/page.tsx` - Líneas 167-229

**Solución requerida:**
- Al iniciar, cargar último borrador del usuario desde DB
- Usar localStorage solo como fallback si no hay conexión
- Mostrar lista de borradores guardados para elegir

**Impacto:** MEDIO - UX y persistencia

---

### 7. ❌ Versionado Real de Informes
**Problema:**
- El campo `version` existe pero NUNCA se incrementa
- Siempre se crea con `version: 1`

**Archivos afectados:**
- `src/app/api/generate-report/route.ts`

**Solución requerida:**
- Al regenerar: `version = version_anterior + 1`
- Al crear nuevo: `version = 1`
- Mostrar versión en UI de revisión
- Guardar historial de versiones (opcional)

**Impacto:** MEDIO - Trazabilidad

---

### 8. ❌ Validación de Informes Duplicados por Período
**Problema:**
- Ya existe validación en el frontend (líneas 483-510 de `page.tsx`)
- Pero no está en el backend, se puede saltar
- No valida correctamente en todos los casos

**Archivos afectados:**
- `src/app/api/generate-report/route.ts`

**Solución requerida:**
- Validar en backend antes de crear
- Verificar `periodo + youngId`
- Preguntar si regenerar o crear nuevo
- Incrementar versión si regenera

**Impacto:** MEDIO - Prevenir duplicados

---

### 9. ❌ Botón "Generar Informe" desde Lista de Formularios
**Problema:**
- No hay forma de generar informe directamente desde `/forms`
- El usuario debe cargar el formulario completo primero

**Archivos afectados:**
- `src/app/forms/page.tsx`

**Solución requerida:**
- Agregar botón "Generar informe" en cada fila
- Verificar si ya existe informe para ese período
- Si existe: Preguntar si regenerar
- Si no existe: Generar directamente

**Impacto:** MEDIO - Mejora flujo de trabajo

---

### 10. ❌ Eliminar Informes (solo ADMIN)
**Problema:**
- No hay forma de eliminar informes
- Se acumulan informes innecesarios o errores

**Archivos afectados:**
- `src/app/api/reports/[id]/route.ts` - Falta método DELETE
- `src/app/reports/page.tsx` - Ya tiene botón de eliminar (línea 128), pero falta endpoint

**Solución requerida:**
- Crear endpoint `DELETE /api/reports/[id]`
- Solo ADMIN puede eliminar
- Soft delete o hard delete según política
- Validar permisos y auditoría

**Impacto:** MEDIO - Gestión de datos

---

### 11. ❌ Mejorar Guardado Automático - Mostrar Estado Real
**Problema:**
- El indicador "Guardando..." no refleja si realmente se guardó en DB
- No diferencia entre guardado local y guardado en DB

**Archivos afectados:**
- `src/app/page.tsx` - Línea 1273

**Solución requerida:**
- Mostrar "Guardado en DB" cuando se guarda exitosamente
- Mostrar "Guardando..." mientras se guarda
- Mostrar "Error al guardar" si falla
- Usar colores diferentes para cada estado

**Impacto:** BAJO - UX

---

## 🟢 MEJORAS - Prioridad Baja

### 12. ❌ Historial de Cambios Visible desde UI
**Problema:**
- Hay tabla `audit_logs` pero no hay botón/link desde `/reports/[id]`
- La página `/audit` es básica y no está integrada

**Archivos afectados:**
- `src/app/reports/[id]/page.tsx`
- `src/app/audit/page.tsx`

**Solución requerida:**
- Botón "Ver historial" en `/reports/[id]`
- Modal o página dedicada mostrando cambios del informe
- Ver quién hizo qué y cuándo
- Mejorar UI de `/audit`

**Impacto:** BAJO - Trazabilidad

---

### 13. ❌ Sistema de Notificaciones
**Problema:**
- No se notifica cuando un informe es aprobado
- No se notifica cuando hay comentarios nuevos
- No se notifica cuando se solicita revisión

**Solución requerida:**
- Badge de notificaciones en el header
- Notificaciones cuando:
  - Un informe es aprobado (notificar al facilitador)
  - Hay comentarios nuevos (notificar al facilitador)
  - Se solicita revisión (notificar a coordinación)
- Marcar notificaciones como leídas

**Impacto:** BAJO - UX

---

### 14. ❌ Comparar Versiones de Informes
**Problema:**
- Aunque existe campo `version`, no hay forma de ver versiones anteriores
- No se puede ver qué cambió entre regeneraciones

**Solución requerida:**
- Guardar versiones anteriores (historial)
- UI para comparar versiones lado a lado
- Mostrar cambios destacados

**Impacto:** BAJO - Funcionalidad avanzada

---

### 15. ❌ Paginación Completa en Listados
**Problema:**
- Los endpoints tienen LIMIT pero la paginación no está completa
- `/reports` ya tiene paginación (línea 156-179)
- Pero `/forms` y `/youngs` pueden necesitar mejoras

**Archivos afectados:**
- `src/app/forms/page.tsx`
- `src/app/youngs/page.tsx`

**Solución requerida:**
- Verificar que todos los listados tengan paginación
- Botones "Anterior"/"Siguiente" o números de página
- Mostrar total de items y página actual

**Impacto:** BAJO - Ya está parcialmente implementado

---

## 📋 RESUMEN POR CATEGORÍA

### 🔴 Base de Datos y Persistencia:
1. ✅ Reemplazar localStorage por DB para formularios
2. ✅ Cargar formulario desde DB al iniciar
3. ✅ Mejorar indicador de guardado

### 🔴 Permisos y Seguridad:
2. ✅ EditableText solo para ADMIN/COORDINACION
4. ✅ Soporte Postgres en status route

### 🔴 Flujo de Trabajo:
3. ✅ Botón "Solicitar cambios"
5. ✅ Link formId al generar informe
7. ✅ Versionado real
8. ✅ Validación de duplicados
9. ✅ Botón generar desde `/forms`
10. ✅ Eliminar informes

### 🟢 Mejoras de UX:
11. ✅ Mejorar indicador de guardado
12. ✅ Historial visible
13. ✅ Notificaciones
14. ✅ Comparar versiones
15. ✅ Paginación completa

---

## 🎯 ORDEN DE IMPLEMENTACIÓN RECOMENDADO

### Fase 1 - Crítico (Esta semana):
1. Reemplazar localStorage por DB
2. EditableText solo para ADMIN/COORDINACION
3. Botón "Solicitar cambios"
4. Soporte Postgres en status

### Fase 2 - Importante (Próxima semana):
5. Link formId al generar
6. Cargar desde DB al iniciar
7. Versionado real
8. Validación de duplicados
9. Botón generar desde `/forms`
10. Eliminar informes

### Fase 3 - Mejoras (Cuando haya tiempo):
11. Mejorar indicador de guardado
12. Historial visible
13. Notificaciones
14. Comparar versiones
15. Paginación completa

---

## 📝 NOTAS TÉCNICAS

### Para localStorage → DB:
- Usar debounce de 2-3 segundos para evitar demasiadas requests
- Guardar solo si hay cambios reales (comparar con último guardado)
- Manejar errores de red gracefully
- Mantener localStorage como cache/backup

### Para EditableText:
- Usar `useSession` para obtener rol
- Verificar `['ADMIN', 'COORDINACION'].includes(role)`
- Ocultar botón completamente si no tiene permisos

### Para Postgres:
- Usar `sql` template tag de `@vercel/postgres`
- Seguir el patrón de otros endpoints que ya soportan Postgres
- Probar con ambas bases de datos

---

## ✅ CHECKLIST DE VERIFICACIÓN

Después de implementar cada corrección, verificar:
- [ ] Funciona con MongoDB
- [ ] Funciona con Postgres
- [ ] Permisos correctos (ADMIN, DIRECTOR, COORDINACION, FACILITADOR)
- [ ] Manejo de errores
- [ ] Logs adecuados
- [ ] UI responsive
- [ ] No rompe funcionalidades existentes

