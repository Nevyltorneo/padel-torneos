"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Trophy,
  Users,
  Play,
  Settings,
  ArrowLeft,
  ArrowRight,
  CheckCircle,
  XCircle,
  RotateCcw,
  Eye,
} from "lucide-react";
import { Category } from "@/types";
import { useTournamentStore } from "@/stores/tournament-store";
import { toast } from "sonner";
import {
  getCategories,
  getManualEliminationMatches,
  createManualEliminationMatches,
  clearManualEliminations,
  getAllGroupStandings,
} from "@/lib/supabase-queries";
import { ManualEliminationSelector } from "@/components/admin/ManualEliminationSelector";
import { ManualEliminationBracket } from "@/components/admin/ManualEliminationBracket";
import { QualifiedPairsTable } from "@/components/admin/QualifiedPairsTable";

interface Standing {
  pairId: string;
  pair: {
    id: string;
    player1: string;
    player2: string;
  };
  pairName: string;
  groupName: string;
  matchesPlayed: number;
  matchesWon: number;
  points: number;
  setsWon: number;
  setsLost: number;
  setsDifference: number;
  gamesWon: number;
  gamesLost: number;
  gamesDifference: number;
}

interface ManualMatch {
  id: string;
  pairA: Standing;
  pairB: Standing;
  round: string;
  matchNumber: number;
}

type Step = "category" | "selection" | "configuration" | "complete";

export default function EliminationsPage() {
  const router = useRouter();
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>("");
  const [selectedPairs, setSelectedPairs] = useState<Standing[]>([]);
  const [manualMatches, setManualMatches] = useState<ManualMatch[]>([]);
  const [currentStep, setCurrentStep] = useState<Step>("category");
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [hasExistingEliminations, setHasExistingEliminations] = useState(false);

  const { currentTournament } = useTournamentStore();

  useEffect(() => {
    if (currentTournament) {
      loadCategories();
    }
  }, [currentTournament]);

  useEffect(() => {
    if (selectedCategoryId) {
      loadCategoryData();
    }
  }, [selectedCategoryId]);

  const loadCategories = async () => {
    if (!currentTournament) return;

    try {
      setIsLoading(true);
      const categoriesData = await getCategories(currentTournament.id);
      setCategories(categoriesData);
      
      if (categoriesData.length > 0) {
        setSelectedCategoryId(categoriesData[0].id);
      }
    } catch (error) {
      console.error("Error loading categories:", error);
      toast.error("Error al cargar las categorías");
    } finally {
      setIsLoading(false);
    }
  };

  const loadCategoryData = async () => {
    if (!selectedCategoryId) return;

    try {
      setIsLoading(true);
      
      // Verificar si ya existen eliminatorias
      const existingMatches = await getManualEliminationMatches(selectedCategoryId);
      setHasExistingEliminations(existingMatches.length > 0);
      
    } catch (error) {
      console.error("Error loading category data:", error);
      // No mostrar error al usuario por ahora, solo logear
      setHasExistingEliminations(false);
    } finally {
      setIsLoading(false);
    }
  };

  const handleStartManualProcess = () => {
    setCurrentStep("selection");
  };

  const handlePairsSelected = (pairs: Standing[]) => {
    setSelectedPairs(pairs);
    setCurrentStep("configuration");
  };

  const handleMatchesGenerated = async (matches: ManualMatch[]) => {
    if (!currentTournament || !selectedCategoryId) {
      toast.error("Error: No hay torneo o categoría seleccionada");
      return;
    }

    try {
      setIsGenerating(true);
      
      // Limpiar eliminatorias existentes
      await clearManualEliminations(selectedCategoryId);
      
      // Crear nuevos partidos
      const createdMatches = await createManualEliminationMatches(
        selectedCategoryId,
        currentTournament.id,
        matches
      );

      toast.success(
        `¡Eliminatorias creadas exitosamente! ${createdMatches.length} partidos generados.`
      );
      
      setManualMatches(matches);
      setCurrentStep("complete");
      setHasExistingEliminations(true);
      
    } catch (error) {
      console.error("Error creating elimination matches:", error);
      toast.error("Error al crear las eliminatorias");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleBackToSelection = () => {
    setCurrentStep("selection");
    setManualMatches([]);
  };

  const handleBackToCategory = () => {
    setCurrentStep("category");
    setSelectedPairs([]);
    setManualMatches([]);
  };

  const handleDeleteEliminations = async () => {
    if (!selectedCategoryId) return;

    const confirmDelete = window.confirm(
      "¿Estás seguro de que quieres eliminar todas las eliminatorias de esta categoría?"
    );

    if (!confirmDelete) return;

    try {
      setIsGenerating(true);
      await clearManualEliminations(selectedCategoryId);
      setHasExistingEliminations(false);
      setCurrentStep("category");
      toast.success("Eliminatorias eliminadas exitosamente");
    } catch (error) {
      console.error("Error deleting eliminations:", error);
      toast.error("Error al eliminar las eliminatorias");
    } finally {
      setIsGenerating(false);
    }
  };

  const selectedCategory = categories.find(c => c.id === selectedCategoryId);

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Cargando eliminatorias...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-4 mb-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.back()}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Volver
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
              <Trophy className="h-8 w-8 text-amber-600" />
              Eliminatorias Manuales
            </h1>
            <p className="text-gray-600 mt-1">
              Configura las eliminatorias seleccionando las parejas y enfrentamientos manualmente
            </p>
          </div>
        </div>

        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-gray-500 mb-6">
          <span className={currentStep === "category" ? "text-blue-600 font-medium" : ""}>
            Categoría
          </span>
          <ArrowRight className="h-4 w-4" />
          <span className={currentStep === "selection" ? "text-blue-600 font-medium" : ""}>
            Selección de Parejas
          </span>
          <ArrowRight className="h-4 w-4" />
          <span className={currentStep === "configuration" ? "text-blue-600 font-medium" : ""}>
            Configuración
          </span>
          <ArrowRight className="h-4 w-4" />
          <span className={currentStep === "complete" ? "text-green-600 font-medium" : ""}>
            Completado
          </span>
        </div>
      </div>

      {/* Step 1: Category Selection */}
      {currentStep === "category" && (
        <div className="space-y-6">
          <Card className="w-full max-w-2xl mx-auto">
            <CardHeader className="bg-gradient-to-r from-blue-50 to-purple-50">
              <CardTitle className="flex items-center gap-2 text-xl">
                <Settings className="h-6 w-6 text-blue-600" />
                Seleccionar Categoría
              </CardTitle>
              <CardDescription>
                Elige la categoría para la cual quieres configurar las eliminatorias
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Categoría:
                  </label>
                  <Select
                    value={selectedCategoryId}
                    onValueChange={setSelectedCategoryId}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona una categoría" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((category) => (
                        <SelectItem key={category.id} value={category.id}>
                          {category.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {selectedCategory && (
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <h3 className="font-semibold text-gray-900 mb-2">
                      {selectedCategory.name}
                    </h3>
                    <div className="flex items-center gap-4 text-sm text-gray-600">
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4" />
                        <span>Parejas disponibles</span>
                      </div>
                      {hasExistingEliminations && (
                        <Badge className="bg-green-100 text-green-800">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Eliminatorias existentes
                        </Badge>
                      )}
                    </div>
                  </div>
                )}

                <div className="pt-6 space-y-3">
                  {/* Botón Cancelar */}
                  <div className="flex justify-start">
                    <Button
                      variant="outline"
                      onClick={() => router.back()}
                      className="flex items-center gap-2"
                    >
                      <XCircle className="h-4 w-4" />
                      Cancelar
                    </Button>
                  </div>

                  {/* Botones de acción */}
                  <div className="flex flex-wrap gap-3 justify-end">
                    {hasExistingEliminations && (
                      <>
                        <Button
                          variant="secondary"
                          onClick={() => {
                            // Navegar al bracket eliminatorio
                            router.push('/admin/bracket');
                          }}
                          className="flex items-center gap-2"
                        >
                          <Eye className="h-4 w-4" />
                          Ver Bracket
                        </Button>
                        <Button
                          variant="destructive"
                          onClick={handleDeleteEliminations}
                          disabled={isGenerating}
                          className="flex items-center gap-2"
                        >
                          <RotateCcw className="h-4 w-4" />
                          Eliminar
                        </Button>
                      </>
                    )}
                    
                    <Button
                      onClick={handleStartManualProcess}
                      disabled={!selectedCategoryId}
                      className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700"
                    >
                      <Play className="h-4 w-4" />
                      Configurar
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Mostrar tablas originales cuando hay categoría seleccionada */}
          {selectedCategoryId && (
            <div className="w-full max-w-6xl mx-auto space-y-6">
              {/* Parejas Clasificadas - Tabla Detallada de Grupos */}
              <QualifiedPairsTable categoryId={selectedCategoryId} />
            </div>
          )}
        </div>
      )}

      {/* Step 2: Pair Selection */}
      {currentStep === "selection" && (
        <div className="space-y-6">
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              onClick={handleBackToCategory}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Volver
            </Button>
            <h2 className="text-xl font-semibold">Selección de Parejas</h2>
          </div>
          
          <ManualEliminationSelector
            categoryId={selectedCategoryId}
            onPairsSelected={handlePairsSelected}
            onCancel={handleBackToCategory}
          />
        </div>
      )}

      {/* Step 3: Configuration */}
      {currentStep === "configuration" && (
        <div className="space-y-6">
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              onClick={handleBackToSelection}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Volver
            </Button>
            <h2 className="text-xl font-semibold">Configuración de Enfrentamientos</h2>
          </div>
          
          <ManualEliminationBracket
            selectedPairs={selectedPairs}
            onMatchesGenerated={handleMatchesGenerated}
            onBack={handleBackToSelection}
          />
        </div>
      )}

      {/* Step 4: Complete */}
      {currentStep === "complete" && (
        <Card className="w-full max-w-2xl mx-auto">
          <CardHeader className="bg-gradient-to-r from-green-50 to-emerald-50">
            <CardTitle className="flex items-center gap-2 text-xl text-green-800">
              <CheckCircle className="h-6 w-6" />
              ¡Eliminatorias Configuradas!
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="space-y-4">
              <div className="p-4 bg-green-100 rounded-lg border border-green-200">
                <h3 className="font-semibold text-green-900 mb-2">
                  Resumen de Eliminatorias
                </h3>
                <div className="grid grid-cols-2 gap-4 text-sm text-green-800">
                  <div>
                    <strong>Parejas seleccionadas:</strong> {selectedPairs.length}
                  </div>
                  <div>
                    <strong>Partidos generados:</strong> {manualMatches.length}
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <h4 className="font-semibold text-gray-900">Partidos creados:</h4>
                {manualMatches.map((match) => (
                  <div
                    key={match.id}
                    className="p-3 bg-gray-50 rounded-lg border"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary">{match.round}</Badge>
                        <span className="font-medium">{match.pairA.pairName}</span>
                        <span className="text-gray-500">vs</span>
                        <span className="font-medium">{match.pairB.pairName}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex items-center justify-between pt-4">
                <Button
                  variant="outline"
                  onClick={handleBackToCategory}
                  className="flex items-center gap-2"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Volver al Inicio
                </Button>
                
                <Button
                  onClick={() => router.push("/admin/bracket")}
                  className="flex items-center gap-2 bg-green-600 hover:bg-green-700"
                >
                  <Trophy className="h-4 w-4" />
                  Ver Bracket
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}