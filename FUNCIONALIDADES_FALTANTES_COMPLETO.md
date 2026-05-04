# 🔍 Análisis Completo - Funcionalidades Faltantes

## ✅ LO QUE YA FUNCIONA

### Gestión de Jóvenes
- ✅ Crear jóvenes (solo ADMIN, DIRECTOR, COORDINACION)
- ✅ Editar jóvenes
- ✅ Eliminar jóvenes
- ✅ Asignar facilitadores (múltiples)
- ✅ Subir foto
- ✅ Campos: nombreCompleto, dni, taller, fechaNacimiento, circuloApoyo, foto
- ✅ Búsqueda por nombre, DNI, taller
- ✅ Paginación implementada

### Gestión de Usuarios
- ✅ Crear usuarios (solo ADMIN, DIRECTOR)
- ✅ Cambiar roles (ADMIN, DIRECTOR, COORDINACION, FACILITADOR)
- ✅ Listar todos los usuarios
- ✅ Campos: email, name, role
- ❌ **FALTA: Establecer contraseña desde la UI** (solo por script)

---

## ❌ FUNCIONALIDADES FALTANTES CRÍTICAS

### 1. 🔴 Establecer/Resetear Contraseña desde UI
**Problema:**
- Los usuarios se crean sin contraseña
- Solo se puede establecer contraseña ejecutando scripts en terminal
- No hay forma de resetear contraseña desde la UI
- No hay forma de que un usuario cambie su propia contraseña

**Archivos afectados:**
- `src/app/users/page.tsx` - Falta botón/UI para establecer contraseña
- `src/app/api/users/[id]/route.ts` - Falta endpoint para actualizar contraseña

**Solución requerida:**
- Agregar botón "Establecer contraseña" en `/users` para cada usuario
- Modal para ingresar nueva contraseña (solo ADMIN/DIRECTOR)
- Endpoint `PUT /api/users/[id]/password` para actualizar contraseña
- Validar que la contraseña tenga mínimo 8 caracteres
- Hash con bcrypt antes de guardar
- Opcional: Permitir que usuarios cambien su propia contraseña

**Impacto:** ALTO - Sin esto, los usuarios nuevos no pueden iniciar sesión

---

### 2. 🔴 Crear Usuario con Contraseña desde el Inicio
**Problema:**
- Al crear usuario, no se puede establecer contraseña
- Requiere crear usuario y luego ejecutar script

**Archivos afectados:**
- `src/app/users/page.tsx` - Formulario de creación
- `src/app/api/users/route.ts` - Endpoint POST

**Solución requerida:**
- Agregar campo "Contraseña" (opcional) en formulario de creación
- Si se proporciona, hashear y guardar
- Si no se proporciona, el usuario no podrá iniciar sesión hasta que se establezca

**Impacto:** ALTO - Mejora flujo de creación

---

### 3. 🟡 Perfil Completo de Jóvenes
**Problema:**
- Faltan campos importantes según documentación:
  - Fecha de nacimiento (existe en modelo pero no en UI)
  - Círculo de apoyo detallado (existe en modelo pero no en UI)
  - Más información personal

**Archivos afectados:**
- `src/app/youngs/page.tsx` - Formulario de creación/edición

**Solución requerida:**
- Agregar campo fecha de nacimiento (date picker)
- Agregar sección para círculo de apoyo (nombre y vínculo)
- Mejorar UI para mostrar todos los campos disponibles
- Validar que fecha de nacimiento sea válida

**Impacto:** MEDIO - Información más completa

---

### 4. 🟡 Perfil Completo de Usuarios
**Problema:**
- Solo se puede editar email, name y role
- No hay foto de perfil
- No hay información adicional (teléfono, cargo, etc.)

**Archivos afectados:**
- `src/app/users/page.tsx` - Formulario de creación/edición
- `src/models/User.postgres.ts` - Modelo de datos

**Solución requerida:**
- Agregar campo foto de perfil (opcional)
- Agregar campos adicionales si son necesarios
- Mejorar UI para mostrar información completa

**Impacto:** BAJO - Mejora UX

---

### 5. 🟡 FACILITADOR puede crear jóvenes
**Problema:**
- Solo ADMIN, DIRECTOR y COORDINACION pueden crear jóvenes
- Los facilitadores no pueden crear jóvenes que acompañan

**Archivos afectados:**
- `src/app/api/youngs/route.ts` - Línea 84

**Solución requerida:**
- Permitir que FACILITADOR cree jóvenes
- Validar que solo pueda asignarse a sí mismo como facilitador
- O permitir que ADMIN/DIRECTOR asigne después

**Impacto:** MEDIO - Facilita trabajo de facilitadores

---

### 6. 🟡 Ver Perfil Completo de Joven
**Problema:**
- No hay página de detalle de joven
- No se puede ver historial de informes de un joven
- No se puede ver información completa

**Solución requerida:**
- Crear página `/youngs/[id]` con perfil completo
- Mostrar todos los informes del joven
- Mostrar formularios asociados
- Mostrar facilitadores asignados
- Mostrar círculo de apoyo

**Impacto:** MEDIO - Mejora navegación

---

### 7. 🟡 Ver Perfil de Usuario
**Problema:**
- No hay página de perfil de usuario
- No se puede ver qué informes creó un usuario
- No se puede ver actividad del usuario

**Solución requerida:**
- Crear página `/users/[id]` con perfil completo
- Mostrar informes creados por el usuario
- Mostrar formularios creados
- Mostrar actividad reciente

**Impacto:** BAJO - Mejora trazabilidad

---

## 🔧 MEJORAS TÉCNICAS FALTANTES

### 8. 🟡 Validación de Campos en Creación de Jóvenes
**Problema:**
- No valida formato de DNI
- No valida que fecha de nacimiento sea en el pasado
- No valida que taller exista

**Solución requerida:**
- Validar formato de DNI (solo números, 7-8 dígitos)
- Validar fecha de nacimiento
- Validar que campos requeridos estén completos

---

### 9. 🟡 Validación de Email en Creación de Usuarios
**Problema:**
- Valida que tenga @ pero no valida formato completo
- No valida que email no esté duplicado antes de enviar

**Solución requerida:**
- Validar formato de email completo
- Verificar duplicados antes de crear
- Mostrar error claro si email ya existe

---

### 10. 🟢 Mejorar UI de Asignación de Facilitadores
**Problema:**
- El select múltiple no es muy intuitivo
- No se ve claramente quiénes están asignados

**Solución requerida:**
- Usar checkboxes en lugar de select múltiple
- Mostrar lista de facilitadores con checkboxes
- Mostrar facilitadores asignados destacados

---

## 📋 RESUMEN POR PRIORIDAD

### 🔴 CRÍTICO (Implementar primero):
1. **Establecer/Resetear contraseña desde UI** - Sin esto, usuarios nuevos no pueden iniciar sesión
2. **Crear usuario con contraseña** - Mejora flujo de creación

### 🟡 IMPORTANTE (Mejoran funcionalidad):
3. **Perfil completo de jóvenes** - Agregar campos faltantes
4. **FACILITADOR puede crear jóvenes** - Facilita trabajo
5. **Ver perfil completo de joven** - Mejora navegación
6. **Validaciones de campos** - Mejora calidad de datos

### 🟢 OPCIONAL (Nice to have):
7. **Perfil completo de usuarios** - Mejora UX
8. **Ver perfil de usuario** - Trazabilidad
9. **Mejorar UI de asignación** - UX

---

## 🎯 PLAN DE IMPLEMENTACIÓN

### Fase 1 - Crítico (Esta semana):
1. Establecer contraseña desde UI
2. Crear usuario con contraseña

### Fase 2 - Importante (Próxima semana):
3. Perfil completo de jóvenes
4. FACILITADOR puede crear jóvenes
5. Validaciones

### Fase 3 - Mejoras (Cuando haya tiempo):
6. Ver perfil de joven
7. Ver perfil de usuario
8. Mejoras de UI

