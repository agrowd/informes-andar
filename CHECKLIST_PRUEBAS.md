# ✅ Checklist de Pruebas - Sistema Completo

## 🔍 Funcionalidades a Probar

### 1. Paginación
- [ ] `/reports` - Verificar que muestra página 1 por defecto
- [ ] `/reports` - Probar botones "Anterior" (debe estar deshabilitado en página 1)
- [ ] `/reports` - Probar botón "Siguiente" si hay más de 20 informes
- [ ] `/forms` - Verificar paginación funciona
- [ ] `/youngs` - Verificar paginación funciona
- [ ] Contador "Mostrando X de Y" muestra números correctos

### 2. Guardado Automático
- [ ] Llenar formulario con nombre y período
- [ ] Esperar 2 segundos y verificar que guarda automáticamente
- [ ] Esperar 60 segundos y verificar guardado periódico
- [ ] Verificar indicador "Guardado automático activo"
- [ ] Verificar que actualiza borrador existente en lugar de crear duplicado

### 3. Historial de Cambios
- [ ] Ir a `/reports/[id]` de cualquier informe
- [ ] Hacer clic en "Ver historial"
- [ ] Verificar que muestra tabla con fechas y acciones
- [ ] Verificar que funciona con Postgres y MongoDB

### 4. Exportación CSV
- [ ] Como ADMIN/DIRECTOR/COORDINACION, ir a dashboard
- [ ] Hacer clic en "Exportar informes" - debe descargar CSV
- [ ] Hacer clic en "Exportar formularios" - debe descargar CSV
- [ ] Hacer clic en "Exportar jóvenes" - debe descargar CSV
- [ ] Verificar que FACILITADOR no ve estos botones

### 5. Vista Previa de Informe
- [ ] Llenar formulario completo
- [ ] Hacer clic en "Vista previa"
- [ ] Verificar que muestra modal con HTML renderizado
- [ ] Verificar que se puede generar PDF desde el modal
- [ ] Verificar que botón "Generar PDF" funciona

### 6. Modal Obligatorio "Otro"
- [ ] Seleccionar checkbox "Otro" en cualquier sección
- [ ] Verificar que se abre modal obligatorio
- [ ] Intentar cerrar sin completar - debe impedir
- [ ] Completar campo y guardar - debe cerrar modal
- [ ] Verificar que no se puede navegar mientras modal está abierto

### 7. Validación de Campos
- [ ] Verificar asteriscos rojos (*) en campos requeridos
- [ ] Dejar campos requeridos vacíos y validar
- [ ] Verificar que campos vacíos muestran borde rojo
- [ ] Verificar validación de checkboxes requeridos

### 8. Búsqueda y Filtros
- [ ] Probar búsqueda en `/reports` por período
- [ ] Probar búsqueda en `/reports` por nombre de joven
- [ ] Probar filtro por estado en `/reports`
- [ ] Probar búsqueda en `/forms` por período
- [ ] Probar búsqueda en `/youngs` por nombre, DNI, taller
- [ ] Probar filtro "Mostrar solo borradores" en `/forms`

### 9. Auditoría Mejorada
- [ ] Ir a `/audit`
- [ ] Probar filtro por tipo de entidad
- [ ] Probar filtro por ID de entidad
- [ ] Verificar que muestra tabla mejorada
- [ ] Verificar detalles expandibles

### 10. Dashboard
- [ ] Como FACILITADOR, verificar mensaje de vista limitada
- [ ] Como ADMIN, verificar que ve todos los datos
- [ ] Verificar que estadísticas se muestran correctamente
- [ ] Verificar exportaciones solo para roles permitidos

### 11. Edición de Informes
- [ ] Ir a `/reports/[id]`
- [ ] Hacer clic en "Editar en formulario"
- [ ] Verificar que carga datos en formulario principal
- [ ] Verificar que se puede editar y guardar

### 12. Confirmaciones
- [ ] Intentar eliminar joven - debe pedir confirmación
- [ ] Intentar cambiar estado de formulario - debe pedir confirmación
- [ ] Verificar mensajes de confirmación son claros

### 13. Loading States
- [ ] Verificar que botones muestran "Generando..." durante carga
- [ ] Verificar que botones están deshabilitados durante operaciones
- [ ] Verificar spinners/loading en listados

### 14. Toasts con Auto-dismiss
- [ ] Realizar acción exitosa (ej: generar informe)
- [ ] Verificar que toast aparece
- [ ] Esperar 5 segundos y verificar que desaparece automáticamente

### 15. Responsive Design
- [ ] Verificar que funciona en móvil
- [ ] Verificar que tablas se convierten en cards en móvil
- [ ] Verificar que botones son accesibles en móvil

---

## 🐛 Problemas Conocidos a Verificar

- [ ] Verificar que paginación funciona con menos de 20 items (debe mostrar correctamente)
- [ ] Verificar que guardado automático no crea duplicados
- [ ] Verificar que historial funciona con ambos tipos de DB

---

## 📝 Notas de Prueba

**Fecha de prueba:** [FECHA]
**Tester:** [NOMBRE]
**Ambiente:** Desarrollo/Producción
**Base de datos:** MongoDB/Postgres

**Resultados:**
- Total de pruebas: ___
- Exitosas: ___
- Fallidas: ___
- Pendientes: ___

**Errores encontrados:**
1. 
2. 
3. 

**Observaciones:**
- 

