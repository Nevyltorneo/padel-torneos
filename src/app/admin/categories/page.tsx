"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Plus,
  Search,
  Users,
  Settings,
  Trash2,
  Edit,
  Trophy,
  ExternalLink,
  Eye,
} from "lucide-react";
import { StatusBadge } from "@/components/atoms/StatusBadge";
import { Category } from "@/types";
import { useTournamentStore } from "@/stores/tournament-store";
import { useCategoryStore } from "@/stores/category-store";
import { cn, generateCategorySlug } from "@/lib/utils";
import { toast } from "sonner";
import {
  getCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  getPairs,
  createGroups,
  generateBalancedGroups,
  deleteGroups,
  testSupabaseConnection,
} from "@/lib/supabase-queries";

export default function CategoriesPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [realCategories, setRealCategories] = useState<Category[]>([]);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [form, setForm] = useState({
    name: "",
    slug: "",
    minPairs: "3",
    maxPairs: "8",
  });
  const { currentTournament } = useTournamentStore();
  const { categories } = useCategoryStore();

  // Mock data para desarrollo - eliminado para usar solo datos reales
  const mockCategories: Category[] = [];

  // Cargar categorías reales al montar el componente
  useEffect(() => {
    if (currentTournament) {
      // Probar conexión a Supabase primero
      testSupabaseConnection().then((isConnected) => {
        console.log("Supabase connection test:", isConnected);
        if (isConnected) {
          loadCategories();
        } else {
          console.error("Failed to connect to Supabase");
        }
      });
    }
  }, [currentTournament]); // loadCategories is stable

  const loadCategories = async () => {
    if (!currentTournament) return;

    try {
      setIsLoading(true);
      const data = await getCategories(currentTournament.id);
      setRealCategories(data);
    } catch (error) {
      console.error("Error loading categories:", error);
      toast.error("Error al cargar las categorías");
    } finally {
      setIsLoading(false);
    }
  };

  const handleGenerateGroups = async (categoryId: string) => {
    try {
      toast.loading("Regenerando grupos...", { id: "generate-groups" });

      // 1. Limpiar grupos existentes
      await deleteGroups(categoryId);

      // 2. Obtener todas las parejas de la categoría
      const pairs = await getPairs(categoryId);

      if (pairs.length < 3) {
        toast.error("Se necesitan al menos 3 parejas para generar grupos", {
          id: "generate-groups",
        });
        return;
      }

      // 3. Generar grupos balanceados
      const groupsToCreate = generateBalancedGroups(pairs, 3);

      // 4. Crear grupos en la base de datos
      const createdGroups = await createGroups(groupsToCreate);

      toast.success(
        `¡Grupos regenerados! ${createdGroups.length} grupos creados con ${pairs.length} parejas`,
        { id: "generate-groups" }
      );

      console.log("Grupos creados:", createdGroups);
    } catch (error) {
      console.error("Error generating groups:", error);
      toast.error("Error al regenerar grupos", { id: "generate-groups" });
    }
  };

  const handleEditCategory = (category: Category) => {
    // Preparar el formulario con los datos de la categoría existente
    setForm({
      name: category.name,
      slug: category.slug || "",
      minPairs: category.minPairs.toString(),
      maxPairs: category.maxPairs.toString(),
    });
    setEditingCategory(category);
    setIsCreateDialogOpen(true);
  };

  const handleDeleteCategory = async (categoryId: string) => {
    const category = realCategories.find((c) => c.id === categoryId);
    if (!category) return;

    // Confirmar eliminación
    const confirmDelete = window.confirm(
      `¿Estás seguro de que quieres eliminar la categoría "${category.name}"? Esta acción eliminará también todas las parejas, grupos y partidos asociados y no se puede deshacer.`
    );

    if (!confirmDelete) return;

    try {
      toast.loading("Eliminando categoría...", { id: "delete-category" });

      // Eliminar la categoría (esto también eliminará las parejas, grupos y partidos por CASCADE)
      await deleteCategory(categoryId);

      // Actualizar el estado local
      setRealCategories((prev) => prev.filter((c) => c.id !== categoryId));

      toast.success(`Categoría "${category.name}" eliminada exitosamente`, {
        id: "delete-category",
      });
    } catch (error) {
      console.error("Error deleting category:", error);
      toast.error("Error al eliminar categoría", { id: "delete-category" });
    }
  };

  // Usar solo datos reales de la base de datos
  const categoriesToShow = realCategories;

  const filteredCategories = categoriesToShow.filter((category) =>
    category.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (!currentTournament) {
    return (
      <div className="categories-no-tournament p-6 max-w-7xl mx-auto">
        <Card className="text-center py-12">
          <CardContent>
            <Trophy className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h2 className="text-xl font-medium text-gray-900 mb-2">
              No hay torneo seleccionado
            </h2>
            <p className="text-gray-600 mb-4">
              Selecciona un torneo para gestionar sus categorías
            </p>
            <Button
              onClick={() => (window.location.href = "/admin/tournaments")}
            >
              Ir a Torneos
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="categories-page p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="categories-header mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="categories-title text-3xl font-bold text-gray-900">
              Gestión de Categorías
            </h1>
            <p className="categories-subtitle text-gray-600">
              Torneo: {currentTournament.name}
            </p>
          </div>

          <CreateCategoryDialog
            isOpen={isCreateDialogOpen}
            onOpenChange={(open) => {
              setIsCreateDialogOpen(open);
              if (!open) {
                setEditingCategory(null);
                setForm({ name: "", slug: "", minPairs: "3", maxPairs: "8" });
              }
            }}
            tournamentId={currentTournament.id}
            onCategoryCreated={loadCategories}
            editingCategory={editingCategory}
            form={form}
            setForm={setForm}
          />
        </div>
      </div>

      {/* Search and filters */}
      <div className="categories-filters mb-6">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="categories-search flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Buscar categorías..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Categories grid */}
      <div className="categories-grid grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredCategories.map((category) => (
          <CategoryCard
            key={category.id}
            category={category}
            onGenerateGroups={handleGenerateGroups}
            onEditCategory={handleEditCategory}
            onDeleteCategory={handleDeleteCategory}
          />
        ))}
      </div>

      {filteredCategories.length === 0 && (
        <div className="categories-empty text-center py-12">
          <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            {searchTerm ? "No se encontraron categorías" : "No hay categorías"}
          </h3>
          <p className="text-gray-600 mb-4">
            {searchTerm
              ? `No hay categorías que coincidan con "${searchTerm}"`
              : "Crea tu primera categoría para comenzar"}
          </p>
          {!searchTerm && (
            <Button onClick={() => setIsCreateDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Crear Primera Categoría
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

interface CategoryCardProps {
  category: Category;
  onGenerateGroups: (categoryId: string) => void;
  onEditCategory: (category: Category) => void;
  onDeleteCategory: (categoryId: string) => void;
}

function CategoryCard({
  category,
  onGenerateGroups,
  onEditCategory,
  onDeleteCategory,
}: CategoryCardProps) {
  const [pairsCount, setPairsCount] = useState(0);
  const [isLoadingPairs, setIsLoadingPairs] = useState(true);

  // Cargar número de parejas reales
  useEffect(() => {
    const loadPairsCount = async () => {
      try {
        setIsLoadingPairs(true);
        console.log(
          `CategoryCard: Loading pairs count for category ${category.id}`
        );
        const pairs = await getPairs(category.id);
        console.log(
          `CategoryCard: Loaded ${pairs.length} pairs for category ${category.name}`
        );
        setPairsCount(pairs.length);
      } catch (error) {
        console.error(
          `CategoryCard: Error loading pairs count for ${category.name}:`,
          error
        );
        setPairsCount(0); // Establecer 0 en caso de error
      } finally {
        setIsLoadingPairs(false);
      }
    };

    loadPairsCount();
  }, [category.id]);

  return (
    <Card className="category-card transition-all hover:shadow-lg">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="category-card-title text-lg leading-tight">
              {category.name}
            </CardTitle>
            <CardDescription className="category-card-description mt-1">
              {category.minPairs} - {category.maxPairs} parejas
            </CardDescription>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Category info */}
        <div className="category-card-info space-y-2">
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Users className="h-4 w-4" />
            <span>
              {isLoadingPairs
                ? "..."
                : `${pairsCount} pareja${pairsCount !== 1 ? "s" : ""} inscrita${
                    pairsCount !== 1 ? "s" : ""
                  }`}
            </span>
          </div>
        </div>

        {/* Actions */}
        <div className="category-card-actions space-y-2">
          {/* Main actions row */}
          <div className="flex gap-2">
            <Button
              size="sm"
              className="flex-1"
              onClick={() =>
                window.open(`/admin/pairs?category=${category.id}`, "_self")
              }
            >
              <Users className="h-4 w-4 mr-2" />
              Gestionar Parejas
            </Button>

            <Button
              size="sm"
              variant="default"
              className="bg-green-600 hover:bg-green-700 flex-1"
              onClick={() => onGenerateGroups(category.id)}
            >
              <Trophy className="h-4 w-4 mr-1" />
              Generar Grupos
            </Button>
          </div>

          {/* Secondary actions row */}
          <div className="flex gap-2 justify-end">
            <Button
              size="sm"
              variant="ghost"
              className="h-8 w-8 p-0 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
              onClick={() => {
                const categorySlug = category.slug || category.id;
                window.open(`/live/${categorySlug}`, "_blank");
              }}
              title="Ver vista en tiempo real"
            >
              <ExternalLink className="h-4 w-4" />
            </Button>

            <Button
              size="sm"
              variant="ghost"
              className="h-8 w-8 p-0 text-green-600 hover:text-green-700 hover:bg-green-50"
              onClick={() => {
                const slug = category.slug || category.id;
                const liveUrl = `${window.location.origin}/live/${slug}`;
                navigator.clipboard.writeText(liveUrl);
                toast.success(`Enlace copiado: ${liveUrl}`);
              }}
              title="Copiar enlace de vista en tiempo real"
            >
              <Eye className="h-4 w-4" />
            </Button>

            <Button
              size="sm"
              variant="ghost"
              className="h-8 w-8 p-0"
              onClick={() => onEditCategory(category)}
            >
              <Edit className="h-4 w-4" />
            </Button>

            <Button
              size="sm"
              variant="ghost"
              className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
              onClick={() => onDeleteCategory(category.id)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

interface CreateCategoryDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  tournamentId: string;
  onCategoryCreated: () => void;
  editingCategory?: Category | null;
  form: {
    name: string;
    slug: string;
    minPairs: string;
    maxPairs: string;
  };
  setForm: (form: {
    name: string;
    slug: string;
    minPairs: string;
    maxPairs: string;
  }) => void;
}

function CreateCategoryDialog({
  isOpen,
  onOpenChange,
  tournamentId,
  onCategoryCreated,
  editingCategory,
  form,
  setForm,
}: CreateCategoryDialogProps) {
  const [isCreating, setIsCreating] = useState(false);
  const isEditing = !!editingCategory;

  const handleSubmit = async () => {
    if (!form.name.trim()) return;

    try {
      setIsCreating(true);

      if (isEditing && editingCategory) {
        // Actualizar categoría existente
        await updateCategory(editingCategory.id, {
          name: form.name.trim(),
          slug: form.slug.trim(),
          minPairs: parseInt(form.minPairs),
          maxPairs: parseInt(form.maxPairs),
        });
        toast.success("Categoría actualizada exitosamente");
      } else {
        // Crear nueva categoría
        await createCategory({
          tournamentId,
          name: form.name.trim(),
          slug: form.slug.trim(),
          minPairs: parseInt(form.minPairs),
          maxPairs: parseInt(form.maxPairs),
          status: "active",
        });
        toast.success("Categoría creada exitosamente");
      }

      onCategoryCreated();
      onOpenChange(false);
      setForm({ name: "", slug: "", minPairs: "3", maxPairs: "8" });
    } catch (error) {
      console.error(
        `Error ${isEditing ? "updating" : "creating"} category:`,
        error
      );
      toast.error(`Error al ${isEditing ? "actualizar" : "crear"} categoría`);
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Nueva Categoría
        </Button>
      </DialogTrigger>

      <DialogContent className="create-category-dialog">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Editar Categoría" : "Crear Nueva Categoría"}
          </DialogTitle>
        </DialogHeader>

        <div className="create-category-form space-y-4">
          <div>
            <Label htmlFor="category-name">Nombre de la Categoría</Label>
            <Input
              id="category-name"
              value={form.name}
              onChange={(e) => {
                const name = e.target.value;
                const slug = generateCategorySlug(name);
                setForm({ ...form, name, slug });
              }}
              placeholder="Ej: 4ta Masculino, 3ra Femenino"
            />
          </div>

          <div>
            <Label htmlFor="category-slug">Slug (URL)</Label>
            <Input
              id="category-slug"
              value={form.slug}
              onChange={(e) => setForm({ ...form, slug: e.target.value })}
              placeholder="ej: 4ta-masculino, 3ra-femenino"
            />
            <p className="text-xs text-gray-500 mt-1">
              Se genera automáticamente. Usado para URLs como /live/femenil
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="min-pairs">Mínimo de Parejas</Label>
              <Select
                value={form.minPairs}
                onValueChange={(value) => setForm({ ...form, minPairs: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[3, 4, 5, 6].map((num) => (
                    <SelectItem key={num} value={num.toString()}>
                      {num} parejas
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="max-pairs">Máximo de Parejas</Label>
              <Select
                value={form.maxPairs}
                onValueChange={(value) => setForm({ ...form, maxPairs: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20].map(
                    (num) => (
                      <SelectItem key={num} value={num.toString()}>
                        {num} parejas
                      </SelectItem>
                    )
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={!form.name.trim() || isCreating}
            >
              {isCreating
                ? isEditing
                  ? "Actualizando..."
                  : "Creando..."
                : isEditing
                ? "Actualizar Categoría"
                : "Crear Categoría"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
