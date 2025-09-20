# 🗑️ **BORRAR DEFINITIVAMENTE `admin@test.com`**

## 🚨 **SCRIPT SQL DEFINITIVO**

### **1. COPIA ESTE SQL Y EJECÚTALO EN SUPABASE:**

```sql
-- =====================================================
-- ELIMINAR admin@test.com - VERSIÓN MÁS SIMPLE
-- =====================================================

-- 1. Limpiar referencias primero
DELETE FROM public.user_roles WHERE user_id = '72740151-42d5-4fae-b778-e5c6adf19dec';
DELETE FROM public.user_profiles WHERE id = '72740151-42d5-4fae-b778-e5c6adf19dec';

-- 2. Intentar eliminar directamente
DELETE FROM auth.users WHERE id = '72740151-42d5-4fae-b778-e5c6adf19dec';

-- 3. Verificar resultado
SELECT 'Usuarios restantes:' as info, COUNT(*)::text as total FROM auth.users;
SELECT 'Usuario admin@test.com eliminado:' as info,
       CASE WHEN EXISTS(SELECT 1 FROM auth.users WHERE email = 'admin@test.com')
            THEN '❌ NO'
            ELSE '✅ SÍ'
       END as status;

-- 4. Mostrar usuarios finales
SELECT id, email FROM auth.users;
```

### **2. INSTRUCCIONES:**

1. **Ve a Supabase Dashboard**
2. **Abre SQL Editor**
3. **Pega el código de arriba**
4. **Haz clic en "Run"**

### **3. RESULTADO ESPERADO:**

- ✅ `admin@test.com` eliminado completamente
- ✅ Solo queda `nrm001sm@hotmail.com`
- ✅ Sistema limpio

## ⚠️ **SI SIGUE FALLANDO:**

### **VE AL DASHBOARD Y ELIMINA MANUALMENTE:**

1. **Authentication > Users**
2. **Busca `admin@test.com`**
3. **Selecciona el usuario**
4. **Delete user**
5. **Confirma**

---

**¡Este es el SQL más directo que debería funcionar!** 🔥
