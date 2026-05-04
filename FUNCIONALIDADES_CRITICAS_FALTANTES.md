# 🔴 Funcionalidades Críticas Faltantes en el Sistema de Informes

## 📊 Flujo Actual vs Flujo Ideal

### Flujo Actual:
1. Formulario → Generar → Nuevo informe siempre
2. Revisión → Aprobar/En revisión (falta "Solicitar cambios")
3. No valida duplicados por período/joven
4. No actualiza informes existentes, siempre crea nuevos
5. No incrementa versión al regenerar

### Flujo Ideal:
1. Formulario → Validar si existe informe → Actualizar o crear nuevo
2. Revisión → Aprobar / Solicitar cambios / En revisión
3. Regenerar → Incrementar versión
4. Comparar versiones del mismo informe

---

## 🔴 CRÍTICAS - Funcionalidades Esenciales Faltantes

### 1. ❌ Botón "Solicitar Cambios" en UI de Revisión
**Problema:** El estado `CAMBIOS_SOLICITADOS` existe en el código pero NO hay botón en la UI para cambiarlo.

**Impacto:** Los coordinadores no pueden solicitar cambios formalmente. Solo pueden agregar comentarios.

**Ubicación:** `src/app/reports/[id]/page.tsx` - Falta botón para cambiar estado a `CAMBIOS_SOLICITADOS`

**Solución requerida:**
- Agregar botón "Solicitar cambios" que cambie estado a `CAMBIOS_SOLICITADOS`
- Solo visible para ADMIN/COORDINACION
- Puede requerir al menos un comentario abierto

---

### 2. ❌ Validación de Informes Duplicados por Período
**Problema:** No se valida si ya existe un informe para el mismo período y joven antes de generar.

**Impacto:** Se pueden crear múltiples informes para el mismo período, causando confusión.

**Ubicación:** `src/app/api/generate-report/route.ts`

**Solución requerida:**
- Antes de crear, verificar si existe informe para `periodo + youngId`
- Si existe:
  - Preguntar: "¿Regenerar informe existente?" o "¿Crear nuevo?"
  - Si regenerar: Actualizar existente e incrementar versión
  - Si crear nuevo: Permitir crear (casos especiales)

---

### 3. ❌ Regenerar Informe (Actualizar Existente)
**Problema:** Cuando se genera desde formulario que ya tiene informe, siempre crea uno nuevo en lugar de actualizar.

**Impacto:** Se acumulan múltiples informes para el mismo período.

**Ubicación:** `src/app/api/generate-report/route.ts`

**Solución requerida:**
- Si viene `reportId` en el request, actualizar informe existente
- Incrementar `version` automáticamente
- Mantener historial de versiones (opcional pero recomendado)

---

### 4. ❌ Versionado Real de Informes
**Problema:** El campo `version` existe en el schema pero NUNCA se incrementa.

**Impacto:** No se puede rastrear cuántas veces se regeneró un informe.

**Ubicación:** `src/app/api/generate-report/route.ts` - Siempre crea con `version: 1`

**Solución requerida:**
- Al regenerar: `version = version_anterior + 1`
- Al crear nuevo: `version = 1`
- Mostrar versión en UI de revisión

---

### 5. ❌ Botón "Generar Informe" desde Lista de Formularios
**Problema:** No hay forma de generar informe directamente desde un formulario guardado en `/forms`.

**Impacto:** El usuario debe cargar el formulario, llenarlo, y luego generar. Flujo innecesario.

**Ubicación:** `src/app/forms/page.tsx` - Falta botón "Generar informe"

**Solución requerida:**
- Agregar botón "Generar informe" en cada fila de `/forms`
- Verificar si ya existe informe para ese período
- Si existe: Preguntar si regenerar
- Si no existe: Generar directamente

---

### 6. ❌ Soporte Postgres en Endpoint de Status
**Problema:** El endpoint `/api/reports/[id]/status` solo funciona con MongoDB.

**Impacto:** No funciona si se usa Postgres.

**Ubicación:** `src/app/api/reports/[id]/status/route.ts` - Solo tiene código MongoDB

**Solución requerida:**
- Agregar soporte para Postgres
- Usar `sql` para actualizar estado
- Mantener validaciones de permisos y reglas

---

### 7. ❌ Link formId al Generar Informe
**Problema:** Cuando se genera informe, el `formId` se guarda como `null` siempre.

**Impacto:** No se puede rastrear qué formulario generó qué informe.

**Ubicación:** `src/app/api/generate-report/route.ts` - Línea 61: `formId: null`

**Solución requerida:**
- Obtener el `formId` del formulario guardado antes de generar
- O crear el formulario primero y usar su ID
- Guardar la relación correctamente

---

### 8. ❌ Eliminar Informes
**Problema:** No hay forma de eliminar informes (ni borradores ni aprobados).

**Impacto:** Se acumulan informes innecesarios o errores.

**Ubicación:** No existe endpoint DELETE para reports

**Solución requerida:**
- Crear endpoint `DELETE /api/reports/[id]`
- Solo ADMIN puede eliminar
- Soft delete o hard delete según política
- Validar permisos y auditoría

---

### 9. ❌ Comparar Versiones de Informes
**Problema:** Aunque existe campo `version`, no hay forma de ver versiones anteriores.

**Impacto:** No se puede ver qué cambió entre regeneraciones.

**Solución requerida:**
- Guardar versiones anteriores (historial)
- UI para comparar versiones lado a lado
- Mostrar cambios destacados

---

### 10. ❌ Validación al Generar desde Formulario Guardado
**Problema:** No se valida que el formulario tenga todos los datos necesarios antes de generar.

**Impacto:** Puede generar informe incompleto.

**Solución requerida:**
- Validar formulario antes de generar
- Mostrar errores específicos
- Bloquear generación si falta información crítica

---

## 🟡 IMPORTANTES - Funcionalidades que Mejoran el Flujo

### 11. ❌ Notificación al Facilitador cuando se Solicitan Cambios
**Problema:** Cuando coordinación cambia estado a `CAMBIOS_SOLICITADOS`, el facilitador no es notificado.

**Solución requerida:**
- Sistema de notificaciones
- Email o notificación en sistema
- Badge de notificaciones pendientes

---

### 12. ❌ Lista de Informes Pendientes por Facilitador
**Problema:** El facilitador no tiene vista clara de qué informes necesita corregir.

**Solución requerida:**
- Vista en dashboard de "Mis informes con cambios solicitados"
- Filtro por estado `CAMBIOS_SOLICITADOS`
- Indicador visual de cuántos cambios están pendientes

---

### 13. ❌ Botón "Marcar Todos los Comentarios como Resueltos"
**Problema:** Si hay muchos comentarios, es tedioso marcarlos uno por uno.

**Solución requerida:**
- Botón para resolver todos los comentarios de una vez
- Validación antes de resolver todos

---

## 📋 RESUMEN POR PRIORIDAD

### 🔴 CRÍTICO (Implementar ANTES de producción):
1. Botón "Solicitar cambios"
2. Validación de duplicados por período
3. Regenerar informe (actualizar existente)
4. Link formId al generar
5. Soporte Postgres en status route

### 🟡 IMPORTANTE (Mejoran flujo significativamente):
6. Versionado real
7. Botón generar desde `/forms`
8. Eliminar informes
9. Comparar versiones

### 🟢 OPCIONAL (Nice to have):
10. Notificaciones
11. Vista de pendientes por facilitador
12. Resolver todos los comentarios

---

## 🎯 IMPACTO EN EL FLUJO DE TRABAJO

**Sin estas funcionalidades:**
- Se crean informes duplicados sin control
- No se puede solicitar cambios formalmente
- No se puede rastrear qué formulario generó qué informe
- No se puede regenerar correctamente (siempre crea nuevos)
- No funciona con Postgres en todos los endpoints

**Con estas funcionalidades:**
- Flujo completo y controlado
- Sin duplicados
- Versionado correcto
- Revisión completa con todos los estados
- Funciona con ambas bases de datos

