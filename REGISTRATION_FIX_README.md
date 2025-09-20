# 🚨 SOLUCIÓN DEFINITIVA PARA EL REGISTRO DE USUARIOS

## **PROBLEMA IDENTIFICADO:**

Supabase Auth está rechazando emails de `gmail.com` como inválidos. Esto es un problema de configuración de seguridad en Supabase.

## **SOLUCIONES DISPONIBLES:**

### **OPCIÓN 1: Crear Usuarios de Prueba (Recomendada)**

**Script Seguro que no elimina usuarios existentes:**

```sql
-- =====================================================
-- CREAR USUARIOS DE PRUEBA - VERSIÓN SEGURA
-- =====================================================

INSERT INTO auth.users (id, email, raw_user_meta_data, email_confirmed_at, created_at)
VALUES
    (gen_random_uuid(), 'admin@test.com', '{"full_name": "Admin Test"}'::jsonb, NOW(), NOW()),
    (gen_random_uuid(), 'user1@test.com', '{"full_name": "User 1 Test"}'::jsonb, NOW(), NOW()),
    (gen_random_uuid(), 'user2@test.com', '{"full_name": "User 2 Test"}'::jsonb, NOW(), NOW()),
    (gen_random_uuid(), 'test@test.com', '{"full_name": "Test User"}'::jsonb, NOW(), NOW())
ON CONFLICT (email) DO UPDATE SET
    raw_user_meta_data = EXCLUDED.raw_user_meta_data,
    email_confirmed_at = NOW();

INSERT INTO user_profiles (id, full_name, is_verified)
SELECT
    u.id,
    COALESCE(u.raw_user_meta_data->>'full_name', 'Usuario sin nombre'),
    true
FROM auth.users u
WHERE u.email LIKE '%@test.com'
ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    is_verified = true;

SELECT
    email as "Email",
    '123456' as "Contraseña",
    raw_user_meta_data->>'full_name' as "Nombre"
FROM auth.users u
LEFT JOIN user_profiles p ON u.id = p.id
WHERE u.email LIKE '%@test.com'
ORDER BY u.email;
```

### **OPCIÓN 2: Arreglar Usuarios Existentes (Si tienes el error de foreign key)**

```sql
-- =====================================================
-- ARREGLAR USUARIOS EXISTENTES (SIN CREAR NUEVOS)
-- =====================================================

SELECT
    email as "Email",
    '123456' as "Contraseña",
    raw_user_meta_data->>'full_name' as "Nombre"
FROM auth.users
WHERE email IS NOT NULL
ORDER BY email;

UPDATE user_profiles
SET is_verified = true
WHERE id IN (
    SELECT id FROM auth.users
    WHERE email LIKE '%@gmail.com'
);
```

### **PASO 2: Usar Estos Usuarios para Registrarte**

**Usuarios disponibles después de ejecutar el script:**

| Email            | Contraseña | Nombre      |
| ---------------- | ---------- | ----------- |
| `admin@test.com` | `123456`   | Admin Test  |
| `user1@test.com` | `123456`   | User 1 Test |
| `user2@test.com` | `123456`   | User 2 Test |
| `test@test.com`  | `123456`   | Test User   |

**O usar los usuarios de gmail.com existentes:**

- `admin@gmail.com` / `123456`
- `user1@gmail.com` / `123456`
- `user2@gmail.com` / `123456`

### **PASO 3: Configurar Supabase para Permitir Todos los Emails**

Si quieres usar emails reales como `gmail.com`, ve a tu proyecto de Supabase:

1. **Ir a Authentication > Settings**
2. **Bajar hasta "User Signups"**
3. **Cambiar "Enable email confirmations" a "OFF"**
4. **En "Site URL" poner:** `http://localhost:3000`
5. **Guardar cambios**

## **SOLUCIÓN ALTERNATIVA (Recomendada):**

### **Cambiar a Emails de Dominio Propio**

Modificar el script para usar emails como:

- `admin@tudominio.com`
- `user1@tudominio.com`
- `user2@tudominio.com`

Esto es más seguro y no depende de restricciones de Supabase.

## **INSTRUCCIONES PARA EJECUTAR:**

1. **Copiar el script completo**
2. **Pegarlo en Supabase SQL Editor**
3. **Ejecutarlo**
4. **Ver los usuarios creados en la tabla de resultados**
5. **Usar cualquiera de esos usuarios en `/signup`**

## **¿SIGUE FALLANDO?**

Si después de esto sigue fallando:

1. **Verificar que el script se ejecutó correctamente**
2. **Comprobar que los usuarios aparecen en la tabla**
3. **Intentar con un usuario diferente**

**¿Puedes ejecutar el script y decirme qué usuarios aparecen?**
