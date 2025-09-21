# 📁 Archivos SQL - Documentación

## Archivos SQL Activos (Esenciales)

### 🎯 **Archivos Principales:**

1. **`schema.sql`**

   - **Propósito:** Esquema completo de la base de datos
   - **Uso:** Crear todas las tablas, funciones y políticas desde cero
   - **Incluye:** Todas las tablas, triggers, RLS policies, functions

2. **`create_roles_system.sql`**

   - **Propósito:** Sistema de roles y perfiles de usuario
   - **Uso:** Crear/actualizar el sistema de autenticación y roles
   - **Incluye:** Tablas user_profiles, user_roles, triggers, functions

3. **`create_courts_table.sql`**

   - **Propósito:** Tabla de canchas deportivas
   - **Uso:** Crear la estructura para gestionar canchas de pádel

4. **`create_notifications_tables.sql`**
   - **Propósito:** Sistema de notificaciones
   - **Uso:** Crear tablas para el sistema de notificaciones en tiempo real

### 🔧 **Archivos de Utilidades:**

5. **`delete_user_direct_from_auth.sql`**

   - **Propósito:** Eliminar usuarios directamente de Supabase Auth
   - **Uso:** Para casos especiales donde se necesita eliminar usuarios manualmente

6. **`delete_user_with_postgres_functions.sql`**
   - **Propósito:** Funciones avanzadas para eliminar usuarios
   - **Uso:** Scripts más complejos para gestión de usuarios

---

## ✅ **Estado Actual:**

- ❌ **~40 archivos eliminados** (debugging, pruebas, temporales)
- ✅ **6 archivos activos** (solo los esenciales)
- 📊 **Limpieza completada** - Carpeta organizada y optimizada

## 🚀 **Próximos pasos:**

Los archivos actuales son suficientes para:

- Configurar una nueva base de datos desde cero
- Gestionar usuarios y roles
- Crear el sistema de notificaciones
- Administrar canchas

**¡La carpeta SQL está completamente limpia y organizada!** 🎉
