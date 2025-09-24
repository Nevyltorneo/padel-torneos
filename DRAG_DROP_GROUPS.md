# 🎯 **FUNCIONALIDAD DE DRAG & DROP PARA GRUPOS**

## ✨ **¿QUÉ ES?**

Una nueva funcionalidad que te permite **reorganizar las parejas entre grupos** de forma visual e intuitiva, sin romper el algoritmo existente.

## 🚀 **CÓMO USAR:**

### **1. Activar el Modo de Reorganización:**

- Ve a la página de **Grupos** (`/admin/groups`)
- Haz clic en el botón **"Activar Reorganización"**
- Los grupos se volverán interactivos

### **2. Arrastrar y Soltar:**

- **Arrastra** cualquier pareja de un grupo
- **Suelta** en otro grupo
- **Intercambio automático:** Si el grupo destino tiene parejas, se intercambiarán automáticamente

### **3. Funcionalidades:**

- ✅ **Intercambio inteligente:** Si arrastras A al grupo de B, B se mueve al grupo de A
- ✅ **Movimiento simple:** Si el grupo destino está vacío, solo se mueve la pareja
- ✅ **Validación:** No permite mover parejas al mismo grupo
- ✅ **Persistencia:** Los cambios se guardan automáticamente en la base de datos

## 🛠️ **IMPLEMENTACIÓN TÉCNICA:**

### **Archivos Creados:**

- `src/components/drag-drop/DraggablePair.tsx` - Componente de pareja arrastrable
- `src/components/drag-drop/DroppableGroup.tsx` - Componente de grupo soltable
- `src/hooks/usePairSwap.ts` - Hook para manejar intercambios
- `supabase/add_group_id_to_pairs.sql` - Script para agregar columna group_id

### **Archivos Modificados:**

- `src/app/admin/groups/page.tsx` - Página principal con drag & drop
- `src/lib/supabase-queries.ts` - Funciones para actualizar groupId
- `src/types/index.ts` - Tipo Pair con groupId

## 🎯 **BENEFICIOS:**

### **Para el Usuario:**

- 🎨 **Interfaz intuitiva:** Drag & drop visual
- ⚡ **Rápido:** Reorganización en segundos
- 🔒 **Seguro:** No rompe algoritmos existentes
- 💾 **Automático:** Se guarda automáticamente

### **Para el Sistema:**

- 🏗️ **Modular:** No afecta la generación automática
- 🔄 **Reversible:** Se puede desactivar en cualquier momento
- 📊 **Consistente:** Mantiene la integridad de los datos

## 🚨 **IMPORTANTE:**

### **Antes de Usar:**

1. **Ejecutar SQL:** Ejecuta `supabase/add_group_id_to_pairs.sql` en Supabase
2. **Reiniciar App:** Reinicia el servidor de desarrollo
3. **Generar Grupos:** Primero genera los grupos automáticamente

### **Limitaciones:**

- Solo funciona cuando el modo de reorganización está activado
- No afecta partidos ya generados
- Requiere que los grupos estén creados

## 🎉 **¡LISTO PARA USAR!**

La funcionalidad está completamente implementada y lista para usar. ¡Disfruta reorganizando tus grupos de forma visual! 🎯✨
