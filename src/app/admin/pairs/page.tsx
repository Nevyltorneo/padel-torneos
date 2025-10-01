"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
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
  Phone,
  Edit,
  Trash2,
  Trophy,
  User,
} from "lucide-react";
import { Pair, Category } from "@/types";
import { useTournamentStore } from "@/stores/tournament-store";
import { useCategoryStore } from "@/stores/category-store";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  getCategories,
  getPairs,
  createPair,
  deletePair,
  updatePair,
} from "@/lib/supabase-queries";

export default function PairsPage() {
  const searchParams = useSearchParams();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>("");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingPair, setEditingPair] = useState<Pair | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [realPairs, setRealPairs] = useState<Pair[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { currentTournament } = useTournamentStore();

  // Mock data para desarrollo - eliminado para usar solo datos reales
  const mockPairs: Pair[] = [];

  // Cargar categorías al montar el componente
  useEffect(() => {
    if (currentTournament) {
      loadCategories();
    }
  }, [currentTournament]);

  // Cargar parejas cuando cambia la categoría seleccionada
  useEffect(() => {
    if (selectedCategoryId) {
      loadPairs();
    }
  }, [selectedCategoryId]);

  const loadCategories = async () => {
    if (!currentTournament) return;

    try {
      const data = await getCategories(currentTournament.id);
      setCategories(data);

      // Verificar si hay un parámetro de categoría en la URL
      const categoryFromUrl = searchParams.get("category");

      if (categoryFromUrl && data.some((cat) => cat.id === categoryFromUrl)) {
        // Si el parámetro de URL es válido, usarlo
        setSelectedCategoryId(categoryFromUrl);
      } else if (data.length > 0 && !selectedCategoryId) {
        // Si no hay parámetro válido, usar la primera categoría
        setSelectedCategoryId(data[0].id);
      }
    } catch (error) {
      console.error("Error loading categories:", error);
      toast.error("Error al cargar las categorías");
    }
  };

  const loadPairs = async () => {
    if (!selectedCategoryId) {
      console.log("loadPairs: No selectedCategoryId, skipping");
      return;
    }

    try {
      setIsLoading(true);
      console.log(
        `loadPairs: Loading pairs for category: ${selectedCategoryId}`
      );
      const data = await getPairs(selectedCategoryId);
      console.log(`loadPairs: Loaded ${data.length} pairs for category:`, data);
      setRealPairs(data);
      console.log(`loadPairs: Set realPairs state with ${data.length} pairs`);
    } catch (error) {
      console.error("loadPairs: Error loading pairs:", error);
      setRealPairs([]); // Establecer array vacío en caso de error
      toast.error("Error al cargar las parejas");
    } finally {
      setIsLoading(false);
      console.log("loadPairs: Finished loading, isLoading set to false");
    }
  };

  const handleEditPair = (pair: Pair) => {
    setEditingPair(pair);
    setIsEditDialogOpen(true);
  };

  const handleDeletePair = async (pairId: string) => {
    if (!confirm("¿Estás seguro de que quieres eliminar esta pareja?")) {
      return;
    }

    try {
      await deletePair(pairId);
      toast.success("Pareja eliminada exitosamente");
      loadPairs(); // Recargar la lista
    } catch (error) {
      console.error("Error deleting pair:", error);
      toast.error("Error al eliminar la pareja");
    }
  };

  const selectedCategory = categories.find(
    (cat) => cat.id === selectedCategoryId
  );

  // Usar datos reales siempre, los mock data son solo para desarrollo
  const pairsToShow = realPairs;
  console.log("pairsToShow:", pairsToShow);

  const filteredPairs = pairsToShow.filter(
    (pair) =>
      pair.player1.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      pair.player2.name.toLowerCase().includes(searchTerm.toLowerCase())
  );
  console.log("filteredPairs:", filteredPairs, "searchTerm:", searchTerm);
  console.log(
    "Render state - isLoading:",
    isLoading,
    "filteredPairs.length:",
    filteredPairs.length
  );

  // Debug detallado de cada pareja (solo primera para evitar spam)
  if (filteredPairs.length > 0) {
    console.log("Sample Pair Data:", {
      id: filteredPairs[0].id,
      player1: filteredPairs[0].player1,
      player2: filteredPairs[0].player2,
      seed: filteredPairs[0].seed,
      hasValidData: !!(
        filteredPairs[0].id &&
        filteredPairs[0].player1?.name &&
        filteredPairs[0].player2?.name
      ),
    });
  }

  if (!currentTournament) {
    return (
      <div className="pairs-no-tournament p-6 max-w-7xl mx-auto">
        <Card className="text-center py-12">
          <CardContent>
            <Trophy className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h2 className="text-xl font-medium text-gray-900 mb-2">
              No hay torneo seleccionado
            </h2>
            <p className="text-gray-600 mb-4">
              Selecciona un torneo para gestionar sus parejas
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

  if (categories.length === 0) {
    return (
      <div className="pairs-no-categories p-6 max-w-7xl mx-auto">
        <Card className="text-center py-12">
          <CardContent>
            <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h2 className="text-xl font-medium text-gray-900 mb-2">
              No hay categorías
            </h2>
            <p className="text-gray-600 mb-4">
              Crea categorías primero para poder agregar parejas
            </p>
            <Button
              onClick={() => (window.location.href = "/admin/categories")}
            >
              Ir a Categorías
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="pairs-page p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="pairs-header mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="pairs-title text-3xl font-bold text-gray-900">
              Gestión de Parejas
            </h1>
            <p className="pairs-subtitle text-gray-600">
              Torneo: {currentTournament.name}
              {selectedCategory && ` • ${selectedCategory.name}`}
            </p>
          </div>

          <CreatePairDialog
            isOpen={isCreateDialogOpen}
            onOpenChange={setIsCreateDialogOpen}
            categoryId={selectedCategoryId}
            onPairCreated={loadPairs}
          />
        </div>
      </div>

      {/* Edit Pair Dialog */}
      <EditPairDialog
        isOpen={isEditDialogOpen}
        onOpenChange={setIsEditDialogOpen}
        pair={editingPair}
        onPairUpdated={loadPairs}
      />

      {/* Filters */}
      <div className="pairs-filters mb-6 space-y-4">
        <div className="flex flex-col sm:flex-row gap-4">
          {/* Category selector */}
          <div className="pairs-category-selector">
            <Label htmlFor="category-select">Categoría</Label>
            <Select
              value={selectedCategoryId}
              onValueChange={setSelectedCategoryId}
            >
              <SelectTrigger className="w-full sm:w-64">
                <SelectValue placeholder="Seleccionar categoría" />
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

          {/* Search */}
          <div className="pairs-search flex-1">
            <Label htmlFor="search-pairs">Buscar parejas</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                id="search-pairs"
                placeholder="Buscar por nombre de jugador..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Pairs grid */}
      {selectedCategory && (
        <div className="pairs-content">
          <div className="pairs-stats mb-6">
            <div className="flex items-center gap-4 text-sm text-gray-600">
              <span>{filteredPairs.length} parejas inscritas</span>
              <span>•</span>
              <span>
                Mínimo: {selectedCategory.minPairs} • Máximo:{" "}
                {selectedCategory.maxPairs}
              </span>
            </div>
          </div>

          {(() => {
            if (isLoading) {
              console.log("RENDER: Showing loading skeleton");
              return (
                <div className="pairs-loading grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {[1, 2, 3].map((i) => (
                    <Card key={i} className="animate-pulse">
                      <CardHeader>
                        <div className="h-6 bg-gray-200 rounded mb-2"></div>
                        <div className="h-4 bg-gray-200 rounded w-2/3"></div>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2">
                          <div className="h-4 bg-gray-200 rounded"></div>
                          <div className="h-4 bg-gray-200 rounded"></div>
                          <div className="h-4 bg-gray-200 rounded"></div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              );
            } else if (filteredPairs.length > 0) {
              console.log(
                `RENDER: Showing ${filteredPairs.length} pairs in grid`
              );
              return (
                <div className="pairs-grid grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredPairs.map((pair, index) => (
                    <PairCard
                      key={pair.id}
                      pair={pair}
                      pairNumber={index + 1}
                      onEdit={handleEditPair}
                      onDelete={handleDeletePair}
                    />
                  ))}
                </div>
              );
            } else {
              console.log("RENDER: Showing empty state");
              return (
                <div className="pairs-empty text-center py-12">
                  <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    {searchTerm
                      ? "No se encontraron parejas"
                      : "No hay parejas"}
                  </h3>
                  <p className="text-gray-600 mb-4">
                    {searchTerm
                      ? `No hay parejas que coincidan con "${searchTerm}"`
                      : `Agrega parejas a la categoría ${
                          selectedCategory?.name || "esta categoría"
                        }`}
                  </p>
                  {!searchTerm && (
                    <Button onClick={() => setIsCreateDialogOpen(true)}>
                      <Plus className="h-4 w-4 mr-2" />
                      Agregar Primera Pareja
                    </Button>
                  )}
                </div>
              );
            }
          })()}
        </div>
      )}
    </div>
  );
}

interface PairCardProps {
  pair: Pair;
  pairNumber: number;
  onEdit: (pair: Pair) => void;
  onDelete: (pairId: string) => void;
}

function PairCard({ pair, pairNumber, onEdit, onDelete }: PairCardProps) {
  return (
    <Card className="pair-card transition-all hover:shadow-lg">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="pair-card-title text-lg leading-tight flex items-center gap-2">
              <Users className="h-4 w-4" />
              Pareja #{pairNumber}
            </CardTitle>
          </div>
          <Badge variant="outline">Ranking {pair.seed}</Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Players */}
        <div className="pair-players space-y-3">
          <div className="player-info flex items-center gap-2">
            <User className="h-4 w-4 text-gray-500" />
            <div>
              <p className="font-medium">{pair.player1.name}</p>
              {pair.player1.phone && (
                <p className="text-sm text-gray-500 flex items-center gap-1">
                  <Phone className="h-3 w-3" />
                  {pair.player1.phone}
                </p>
              )}
            </div>
          </div>

          <div className="player-info flex items-center gap-2">
            <User className="h-4 w-4 text-gray-500" />
            <div>
              <p className="font-medium">{pair.player2.name}</p>
              {pair.player2.phone && (
                <p className="text-sm text-gray-500 flex items-center gap-1">
                  <Phone className="h-3 w-3" />
                  {pair.player2.phone}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="pair-actions flex gap-2">
          <Button
            size="sm"
            variant="outline"
            className="flex-1"
            onClick={() => onEdit(pair)}
          >
            <Edit className="h-4 w-4 mr-2" />
            Editar
          </Button>

          <Button size="sm" variant="ghost" onClick={() => onDelete(pair.id)}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

interface CreatePairDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  categoryId: string;
  onPairCreated: () => void;
}

function CreatePairDialog({
  isOpen,
  onOpenChange,
  categoryId,
  onPairCreated,
}: CreatePairDialogProps) {
  const [player1Name, setPlayer1Name] = useState("");
  const [player1Phone, setPlayer1Phone] = useState("");
  const [player2Name, setPlayer2Name] = useState("");
  const [player2Phone, setPlayer2Phone] = useState("");
  const [seed, setSeed] = useState("1");
  const [isCreating, setIsCreating] = useState(false);
  const { currentTournament } = useTournamentStore();

  const handleCreate = async () => {
    if (!player1Name.trim() || !player2Name.trim()) {
      toast.error("Los nombres de los jugadores son obligatorios");
      return;
    }

    try {
      setIsCreating(true);

      const newPair = await createPair({
        tournamentId: currentTournament!.id,
        categoryId,
        player1: {
          name: player1Name.trim(),
          phone: player1Phone.trim() || "",
        },
        player2: {
          name: player2Name.trim(),
          phone: player2Phone.trim() || "",
        },
        seed: parseInt(seed),
      });

      toast.success("Pareja creada exitosamente");
      onPairCreated();
      onOpenChange(false);
      setPlayer1Name("");
      setPlayer1Phone("");
      setPlayer2Name("");
      setPlayer2Phone("");
      setSeed("1");
    } catch (error) {
      console.error("Error creating pair:", error);
      toast.error("Error al crear la pareja");
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Nueva Pareja
        </Button>
      </DialogTrigger>

      <DialogContent className="create-pair-dialog max-w-md">
        <DialogHeader>
          <DialogTitle>Agregar Nueva Pareja</DialogTitle>
        </DialogHeader>

        <div className="create-pair-form space-y-4">
          {/* Jugador 1 */}
          <div className="player-section">
            <h4 className="font-medium mb-2">Jugador 1</h4>
            <div className="space-y-2">
              <div>
                <Label htmlFor="player1-name">Nombre *</Label>
                <Input
                  id="player1-name"
                  value={player1Name}
                  onChange={(e) => setPlayer1Name(e.target.value)}
                  placeholder="Nombre completo"
                />
              </div>
              <div>
                <Label htmlFor="player1-phone">Teléfono</Label>
                <Input
                  id="player1-phone"
                  value={player1Phone}
                  onChange={(e) => setPlayer1Phone(e.target.value)}
                  placeholder="555-1234"
                />
              </div>
            </div>
          </div>

          {/* Jugador 2 */}
          <div className="player-section">
            <h4 className="font-medium mb-2">Jugador 2</h4>
            <div className="space-y-2">
              <div>
                <Label htmlFor="player2-name">Nombre *</Label>
                <Input
                  id="player2-name"
                  value={player2Name}
                  onChange={(e) => setPlayer2Name(e.target.value)}
                  placeholder="Nombre completo"
                />
              </div>
              <div>
                <Label htmlFor="player2-phone">Teléfono</Label>
                <Input
                  id="player2-phone"
                  value={player2Phone}
                  onChange={(e) => setPlayer2Phone(e.target.value)}
                  placeholder="555-1234"
                />
              </div>
            </div>
          </div>

          {/* Ranking */}
          <div>
            <Label htmlFor="pair-seed">Ranking</Label>
            <Select value={seed} onValueChange={setSeed}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Array.from({ length: 50 }, (_, i) => i + 1).map((num) => (
                  <SelectItem key={num} value={num.toString()}>
                    Ranking {num}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleCreate}
              disabled={
                !player1Name.trim() || !player2Name.trim() || isCreating
              }
            >
              {isCreating ? "Creando..." : "Crear Pareja"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

interface EditPairDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  pair: Pair | null;
  onPairUpdated: () => void;
}

function EditPairDialog({
  isOpen,
  onOpenChange,
  pair,
  onPairUpdated,
}: EditPairDialogProps) {
  const [player1Name, setPlayer1Name] = useState("");
  const [player1Phone, setPlayer1Phone] = useState("");
  const [player2Name, setPlayer2Name] = useState("");
  const [player2Phone, setPlayer2Phone] = useState("");
  const [seed, setSeed] = useState("1");
  const [isUpdating, setIsUpdating] = useState(false);
  const { currentTournament } = useTournamentStore();

  // Actualizar los campos cuando cambie la pareja
  useEffect(() => {
    if (pair) {
      setPlayer1Name(pair.player1.name);
      setPlayer1Phone(pair.player1.phone || "");
      setPlayer2Name(pair.player2.name);
      setPlayer2Phone(pair.player2.phone || "");
      setSeed(pair.seed?.toString() || "1");
    }
  }, [pair]);

  const handleUpdate = async () => {
    if (!pair || !player1Name.trim() || !player2Name.trim()) {
      toast.error("Los nombres de los jugadores son obligatorios");
      return;
    }

    try {
      setIsUpdating(true);

      const updatedPair = await updatePair(pair.id, {
        tournamentId: currentTournament!.id,
        categoryId: pair.categoryId,
        player1: {
          name: player1Name.trim(),
          phone: player1Phone.trim() || "",
        },
        player2: {
          name: player2Name.trim(),
          phone: player2Phone.trim() || "",
        },
        seed: parseInt(seed),
      });

      toast.success("Pareja actualizada exitosamente");
      onPairUpdated();
      onOpenChange(false);
    } catch (error) {
      console.error("Error updating pair:", error);
      toast.error("Error al actualizar la pareja");
    } finally {
      setIsUpdating(false);
    }
  };

  if (!pair) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Editar Pareja</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Jugador 1 */}
          <div className="space-y-2">
            <Label htmlFor="edit-player1-name">Jugador 1</Label>
            <Input
              id="edit-player1-name"
              value={player1Name}
              onChange={(e) => setPlayer1Name(e.target.value)}
              placeholder="Nombre del jugador 1"
            />
            <Input
              value={player1Phone}
              onChange={(e) => setPlayer1Phone(e.target.value)}
              placeholder="Teléfono (opcional)"
            />
          </div>

          {/* Jugador 2 */}
          <div className="space-y-2">
            <Label htmlFor="edit-player2-name">Jugador 2</Label>
            <Input
              id="edit-player2-name"
              value={player2Name}
              onChange={(e) => setPlayer2Name(e.target.value)}
              placeholder="Nombre del jugador 2"
            />
            <Input
              value={player2Phone}
              onChange={(e) => setPlayer2Phone(e.target.value)}
              placeholder="Teléfono (opcional)"
            />
          </div>

          {/* Ranking */}
          <div>
            <Label htmlFor="edit-pair-seed">Ranking</Label>
            <Select value={seed} onValueChange={setSeed}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Array.from({ length: 50 }, (_, i) => i + 1).map((num) => (
                  <SelectItem key={num} value={num.toString()}>
                    Ranking {num}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex justify-end space-x-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            onClick={handleUpdate}
            disabled={!player1Name.trim() || !player2Name.trim() || isUpdating}
          >
            {isUpdating ? "Actualizando..." : "Actualizar Pareja"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
