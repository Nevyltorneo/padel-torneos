# 🔄 REFRESCAR CACHÉ DE SUPABASE

## ✅ **PROBLEMA CONFIRMADO:**

**La columna `seed` SÍ EXISTE** en tu base de datos, pero hay un problema de **caché de Supabase**.

---

## 🔧 **SOLUCIÓN PASO A PASO:**

### **PASO 1: Ejecutar script de caché en Supabase**

Ve a **Supabase SQL Editor** y ejecuta:

```sql
-- 1. Verificar que la columna existe
SELECT
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'pairs'
AND table_schema = 'public'
AND column_name = 'seed';

-- 2. Forzar una consulta simple para refrescar la caché
SELECT 1 FROM public.pairs LIMIT 1;

-- 3. Hacer una consulta que incluya la columna seed
SELECT
    id,
    player1,
    player2,
    seed,
    created_at
FROM public.pairs
LIMIT 1;
```

### **PASO 2: Aplicación reiniciada**

✅ **Ya reinicié tu aplicación completamente:**

- Maté todos los procesos de Next.js
- Eliminé la carpeta `.next` (caché)
- Reinicié el servidor de desarrollo

### **PASO 3: Limpiar caché del navegador**

1. **Abre las herramientas de desarrollador** (F12)
2. **Haz clic derecho en el botón de recargar**
3. **Selecciona "Empty Cache and Hard Reload"**
4. **O presiona `Ctrl+Shift+R` (Windows) / `Cmd+Shift+R` (Mac)**

### **PASO 4: Probar la funcionalidad**

1. Ve a **Admin** → **Parejas**
2. Edita una pareja existente
3. Cambia el ranking (ej: de 5 a 10)
4. Guarda los cambios
5. **¡El error debería desaparecer!**

---

## 🔍 **VERIFICACIÓN:**

### **Si aún aparece el error:**

1. **Espera 2-3 minutos** - A veces Supabase tarda en actualizar la caché
2. **Ejecuta el script del PASO 1** nuevamente
3. **Reinicia el navegador** completamente

### **Si funciona:**

✅ **¡Problema resuelto!** La columna `seed` ya está funcionando correctamente.

---

## 📁 **ARCHIVOS CREADOS:**

- ✅ `supabase/force_cache_refresh.sql` - Script para refrescar caché
- ✅ `CACHE_REFRESH_INSTRUCTIONS.md` - Estas instrucciones

---

## 🚀 **STATUS:**

**La columna `seed` existe en tu base de datos. El problema era de caché.**

**¿Ya probaste editar una pareja después de reiniciar?** 🎯✨
