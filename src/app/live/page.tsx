"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Trophy,
  Users,
  Eye,
  Play,
  Crown,
  Medal,
  ArrowRight,
} from "lucide-react";
import { Category } from "@/types";
import { toast } from "sonner";
import { getAllCategories } from "@/lib/supabase-queries";

export default function LiveView() {
  const router = useRouter();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  const loadCategories = async () => {
    try {
      setLoading(true);
      const categoriesData = await getAllCategories();
      setCategories(categoriesData);
    } catch (error) {
      console.error("Error loading categories:", error);
      toast.error("Error cargando categorías");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCategories();
  }, []);

  const handleViewCategory = (categoryId: string) => {
    // Buscar la categoría para obtener su slug
    const category = categories.find((c) => c.id === categoryId);
    const slug = category?.slug || categoryId;
    router.push(`/live/${slug}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Trophy className="h-16 w-16 mx-auto mb-4 text-blue-600 animate-pulse" />
          <p className="text-gray-600">Cargando categorías...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="text-center">
            <h1 className="text-4xl font-bold text-gray-900 flex items-center justify-center gap-3 mb-4">
              <Eye className="h-10 w-10 text-blue-600" />
              Vista en Tiempo Real
            </h1>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Sigue el progreso de tu categoría en tiempo real. Ve los
              resultados, posiciones y partidos en vivo.
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {categories.length === 0 ? (
          <div className="text-center py-12">
            <Trophy className="h-16 w-16 mx-auto mb-4 text-gray-400" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              No hay categorías disponibles
            </h2>
            <p className="text-gray-600">
              Las categorías aparecerán aquí cuando estén disponibles.
            </p>
          </div>
        ) : (
          <>
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                Selecciona una Categoría
              </h2>
              <p className="text-gray-600">
                Elige la categoría que quieres seguir en tiempo real
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {categories.map((category) => (
                <Card
                  key={category.id}
                  className="hover:shadow-lg transition-shadow cursor-pointer group"
                  onClick={() => handleViewCategory(category.id)}
                >
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-100 rounded-lg group-hover:bg-blue-200 transition-colors">
                          <Trophy className="h-6 w-6 text-blue-600" />
                        </div>
                        <div>
                          <CardTitle className="text-lg">
                            {category.name}
                          </CardTitle>
                          <CardDescription>Categoría de padel</CardDescription>
                        </div>
                      </div>
                      <ArrowRight className="h-5 w-5 text-gray-400 group-hover:text-blue-600 transition-colors" />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Users className="h-4 w-4" />
                        <span>Parejas: Sin límite</span>
                      </div>

                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Play className="h-4 w-4" />
                        <span>Grupos: Automático</span>
                      </div>

                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Crown className="h-4 w-4" />
                        <span>Eliminatorias: Sí</span>
                      </div>

                      <div className="pt-3">
                        <Button
                          className="w-full group-hover:bg-blue-600 transition-colors"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleViewCategory(category.id);
                          }}
                        >
                          <Eye className="h-4 w-4 mr-2" />
                          Ver en Tiempo Real
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Información adicional */}
            <div className="mt-12 bg-blue-50 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-blue-900 mb-3 flex items-center gap-2">
                <Eye className="h-5 w-5" />
                ¿Cómo funciona la Vista en Tiempo Real?
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-blue-800">
                <div className="flex items-start gap-2">
                  <div className="w-6 h-6 bg-blue-200 rounded-full flex items-center justify-center text-xs font-bold text-blue-800 mt-0.5">
                    1
                  </div>
                  <div>
                    <p className="font-medium">Actualización Automática</p>
                    <p>
                      Los datos se actualizan cada 60 segundos automáticamente
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <div className="w-6 h-6 bg-blue-200 rounded-full flex items-center justify-center text-xs font-bold text-blue-800 mt-0.5">
                    2
                  </div>
                  <div>
                    <p className="font-medium">Progreso en Vivo</p>
                    <p>
                      Ve el progreso de grupos y eliminatorias en tiempo real
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <div className="w-6 h-6 bg-blue-200 rounded-full flex items-center justify-center text-xs font-bold text-blue-800 mt-0.5">
                    3
                  </div>
                  <div>
                    <p className="font-medium">Transparencia Total</p>
                    <p>Acceso público a todos los resultados y posiciones</p>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
