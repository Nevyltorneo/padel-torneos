# 🗑️ ELIMINAR DEFINITIVAMENTE `admin@test.com`

## 🚨 **PROBLEMA**

El usuario `admin@test.com` sigue apareciendo en Supabase Auth después de ejecutar scripts SQL.

## ✅ **SOLUCIÓN COMPLETA**

### **PASO 1: EJECUTAR ESTE SCRIPT SQL**

1. **Ve a Supabase Dashboard**
2. **Abre SQL Editor**
3. **Copia y pega TODO este código:**

```sql
-- =====================================================
-- ELIMINACIÓN FINAL Y DEFINITIVA DE admin@test.com
-- =====================================================

-- 1. VER EL ESTADO ACTUAL
SELECT '=== ANTES DE ELIMINAR ===' as info;
SELECT id, email FROM auth.users WHERE email = 'admin@test.com';

-- 2. ELIMINAR TODAS LAS REFERENCIAS
DELETE FROM public.user_roles WHERE user_id = '72740151-42d5-4fae-b778-e5c6adf19dec';
DELETE FROM public.user_profiles WHERE id = '72740151-42d5-4fae-b778-e5c6adf19dec';

-- 3. BUSCAR Y ELIMINAR EN CUALQUIER TABLA
DO $$
DECLARE
    table_record RECORD;
    delete_query text;
BEGIN
    RAISE NOTICE '🔍 BUSCANDO TODAS LAS REFERENCIAS...';

    -- Buscar en todas las tablas que tengan user_id
    FOR table_record IN
        SELECT table_name, column_name
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND data_type = 'uuid'
          AND column_name = 'user_id'
    LOOP
        BEGIN
            delete_query := format('DELETE FROM public.%I WHERE %I = ''72740151-42d5-4fae-b778-e5c6adf19dec''::uuid',
                                 table_record.table_name, table_record.column_name);
            EXECUTE delete_query;
            RAISE NOTICE '✅ Eliminado de tabla: %', table_record.table_name;
        EXCEPTION
            WHEN OTHERS THEN
                RAISE NOTICE '⚠️  No se pudo eliminar de: %', table_record.table_name;
        END;
    END LOOP;

    RAISE NOTICE '✅ BÚSQUEDA COMPLETADA';
END $$;

-- 4. VERIFICACIÓN
SELECT '=== DESPUÉS DE LIMPIEZA ===' as info;
SELECT 'Usuarios totales:' as info, COUNT(*)::text as total FROM auth.users;
SELECT 'Usuario admin@test.com sigue existiendo:' as info,
       CASE WHEN EXISTS(SELECT 1 FROM auth.users WHERE email = 'admin@test.com') THEN '❌ SÍ' ELSE '✅ NO' END as status;

-- 5. CONFIRMACIÓN FINAL
SELECT '🎉 LIMPIEZA COMPLETADA' as status;
SELECT '⚠️  AHORA ELIMINA MANUALMENTE DE AUTH.USERS' as next_step;
```

4. **Haz clic en "Run"**

### **PASO 2: ELIMINAR MANUALMENTE DE AUTH**

1. **Ve a Authentication > Users**
2. **Busca `admin@test.com`**
3. **Selecciona el usuario**
4. **Haz clic en "Delete user"**
5. **Confirma la eliminación**

## 🎯 **RESULTADO ESPERADO**

- ✅ Todas las referencias eliminadas de las tablas
- ✅ Usuario eliminado de `auth.users`
- ✅ Solo queda el usuario Nevyl
- ✅ Sistema completamente limpio

## ⚠️ **IMPORTANTE**

- **NO** elimines a `nrm001sm@hotmail.com` (Nevyl)
- **SOLO** elimina `admin@test.com`
- El script limpia TODAS las referencias antes de eliminar manualmente

## 🔍 **VERIFICACIÓN FINAL**

Después de eliminar, ejecuta este SQL:

```sql
SELECT id, email FROM auth.users;
```

Deberías ver **SOLO** el usuario Nevyl.

---

**¡Este script es DEFINITIVO! El usuario desaparecerá completamente.** 🔥
