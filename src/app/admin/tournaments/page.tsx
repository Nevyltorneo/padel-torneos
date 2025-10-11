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
  Plus,
  Search,
  Calendar,
  Users,
  MapPin,
  Settings,
  Play,
  Trophy,
  Eye,
  Trash2,
} from "lucide-react";
import { StatusBadge } from "@/components/atoms/StatusBadge";
import {
  Tournament,
  TournamentConfig,
  DEFAULT_TOURNAMENT_CONFIG,
} from "@/types";
import { useTournamentStore } from "@/stores/tournament-store";
import { cn } from "@/lib/utils";
import {
  getTournaments,
  createTournament,
  deleteTournament,
  generateSlug as generateSlugUtil,
  getCategories,
  getPairs,
  getCourts,
} from "@/lib/supabase-queries";
import { toast } from "sonner";
import { TournamentConfigValidator, TournamentErrorHandler } from "@/lib/validators";

export default function TournamentsPage() {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState("");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [realTournaments, setRealTournaments] = useState<Tournament[]>([]);

  const {
    tournaments,
    currentTournament,
    setCurrentTournament,
    clearPersistedData,
  } = useTournamentStore();

  // Mock data for development - esto vendría de la base de datos
  const mockTournaments: Tournament[] = [];

  // Cargar torneos reales al montar el componente
  useEffect(() => {
    // Limpiar datos persistidos para evitar mostrar torneos obsoletos
    clearPersistedData();
    loadTournaments();
  }, []);

  const loadTournaments = async () => {
    try {
      setIsLoading(true);
      const data = await getTournaments();
      setRealTournaments(data);
    } catch (error) {
      console.error("Error loading tournaments:", error);
      toast.error("Error al cargar los torneos");
    } finally {
      setIsLoading(false);
    }
  };

  // Usar datos reales si están disponibles, sino usar mock data
  const tournamentsToShow =
    realTournaments.length > 0 ? realTournaments : mockTournaments;

  const filteredTournaments = tournamentsToShow.filter(
    (tournament) =>
      tournament.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tournament.slug.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const selectTournament = (tournament: Tournament) => {
    if (currentTournament?.id === tournament.id) {
      // Si ya está seleccionado, navegar al dashboard
      router.push("/admin");
    } else {
      // Si no está seleccionado, seleccionarlo
      setCurrentTournament(tournament);
      toast.success(`Torneo "${tournament.name}" seleccionado`);
    }
  };

  const handleDeleteTournament = async (tournament: Tournament) => {
    // Confirmar eliminación
    const confirmDelete = window.confirm(
      `¿Estás seguro de que quieres eliminar el torneo "${tournament.name}"? Esta acción eliminará también todas las categorías, parejas, grupos y partidos asociados y no se puede deshacer.`
    );

    if (!confirmDelete) return;

    try {
      toast.loading("Eliminando torneo...", { id: "delete-tournament" });

      // Eliminar el torneo (esto también eliminará todo lo relacionado por CASCADE)
      await deleteTournament(tournament.id);

      // Si el torneo eliminado era el actual, limpiar la selección
      if (currentTournament?.id === tournament.id) {
        setCurrentTournament(null);
      }

      // Recargar la lista de torneos
      loadTournaments();

      toast.success(`Torneo "${tournament.name}" eliminado exitosamente`, {
        id: "delete-tournament",
      });
    } catch (error) {
      console.error("Error deleting tournament:", error);
      toast.error("Error al eliminar torneo", { id: "delete-tournament" });
    }
  };

  return (
    <div className="tournaments-page p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="tournaments-header mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="tournaments-title text-3xl font-bold text-gray-900">
              Gestión de Torneos
            </h1>
            <p className="tournaments-subtitle text-gray-600">
              Crea y administra tus torneos de pádel
            </p>
          </div>

          <CreateTournamentDialog
            isOpen={isCreateDialogOpen}
            onOpenChange={setIsCreateDialogOpen}
            onTournamentCreated={loadTournaments}
          />
        </div>
      </div>

      {/* Search and filters */}
      <div className="tournaments-filters mb-6">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="tournaments-search flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Buscar torneos..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Current tournament info */}
      {currentTournament && (
        <Card className="tournaments-current mb-6 border-blue-200 bg-blue-50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Trophy className="h-5 w-5 text-blue-600" />
                <div>
                  <p className="font-medium text-blue-900">Torneo Actual</p>
                  <p className="text-sm text-blue-700">
                    {currentTournament.name}
                  </p>
                </div>
              </div>
              <Badge variant="default" className="bg-blue-600">
                Seleccionado
              </Badge>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tournaments grid */}
      {isLoading ? (
        <div className="tournaments-loading grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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
      ) : (
        <div className="tournaments-grid grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredTournaments.map((tournament) => (
            <TournamentCard
              key={tournament.id}
              tournament={tournament}
              isSelected={currentTournament?.id === tournament.id}
              onSelect={() => selectTournament(tournament)}
              onDelete={handleDeleteTournament}
            />
          ))}
        </div>
      )}

      {filteredTournaments.length === 0 && (
        <div className="tournaments-empty text-center py-12">
          <Trophy className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            {searchTerm ? "No se encontraron torneos" : "No hay torneos"}
          </h3>
          <p className="text-gray-600 mb-4">
            {searchTerm
              ? `No hay torneos que coincidan con "${searchTerm}"`
              : "Crea tu primer torneo para comenzar"}
          </p>
          {!searchTerm && (
            <Button onClick={() => setIsCreateDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Crear Primer Torneo
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

interface TournamentCardProps {
  tournament: Tournament;
  isSelected: boolean;
  onSelect: () => void;
  onDelete: (tournament: Tournament) => void;
}

function TournamentCard({
  tournament,
  isSelected,
  onSelect,
  onDelete,
}: TournamentCardProps) {
  const router = useRouter();
  const [realData, setRealData] = useState({
    courtsCount: 0,
    pairsCount: 0,
    isLoading: true,
  });

  // Cargar datos reales del torneo
  useEffect(() => {
    const loadTournamentData = async () => {
      try {
        setRealData((prev) => ({ ...prev, isLoading: true }));

        // Cargar datos en paralelo
        const [categoriesData, courtsData] = await Promise.all([
          getCategories(tournament.id),
          getCourts(tournament.id),
        ]);

        // Cargar parejas de todas las categorías
        let totalPairs = 0;
        if (categoriesData.length > 0) {
          const allPairsPromises = categoriesData.map(async (category) => {
            try {
              console.log(
                `Loading pairs for category: ${category.id} (${category.name})`
              );
              const pairs = await getPairs(category.id);
              console.log(
                `Loaded ${pairs.length} pairs for category ${category.name}`
              );
              return pairs;
            } catch (error) {
              console.error(
                `Error loading pairs for category ${category.id} (${category.name}):`,
                error
              );
              return []; // Retornar array vacío en caso de error
            }
          });
          const allPairsArrays = await Promise.all(allPairsPromises);
          totalPairs = allPairsArrays.flat().length;
        }

        setRealData({
          courtsCount: courtsData.length,
          pairsCount: totalPairs,
          isLoading: false,
        });
      } catch (error) {
        console.error("Error loading tournament data:", error);
        setRealData({
          courtsCount: 0,
          pairsCount: 0,
          isLoading: false,
        });
      }
    };

    loadTournamentData();
  }, [tournament.id]);

  const daysCount = tournament.config.days?.length || 0;


  const handleSettings = () => {
    router.push(`/admin/settings?tournament=${tournament.id}`);
  };

  return (
    <Card
      className={cn(
        "tournament-card cursor-pointer transition-all hover:shadow-lg",
        isSelected && "ring-2 ring-blue-500 bg-blue-50"
      )}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="tournament-card-title text-lg leading-tight">
              {tournament.name}
            </CardTitle>
            <CardDescription className="tournament-card-slug mt-1">
              /{tournament.slug}
            </CardDescription>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Tournament info */}
        <div className="tournament-card-info space-y-2">
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Calendar className="h-4 w-4" />
            <span>
              {daysCount} día{daysCount !== 1 ? "s" : ""}
            </span>
          </div>

          <div className="flex items-center gap-2 text-sm text-gray-600">
            <MapPin className="h-4 w-4" />
            <span>
              {realData.isLoading
                ? "..."
                : `${realData.courtsCount} cancha${
                    realData.courtsCount !== 1 ? "s" : ""
                  }`}
            </span>
          </div>

          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Users className="h-4 w-4" />
            <span>
              {realData.isLoading
                ? "..."
                : `${realData.pairsCount} pareja${
                    realData.pairsCount !== 1 ? "s" : ""
                  } inscrita${realData.pairsCount !== 1 ? "s" : ""}`}
            </span>
          </div>
        </div>

        {/* Actions */}
        <div className="tournament-card-actions flex gap-2">
          <Button
            size="sm"
            className="flex-1"
            onClick={onSelect}
            variant={isSelected ? "default" : "outline"}
          >
            {isSelected ? (
              <>
                <Play className="h-4 w-4 mr-2" />
                Gestionar
              </>
            ) : (
              <>
                <Trophy className="h-4 w-4 mr-2" />
                Seleccionar
              </>
            )}
          </Button>


          <Button
            size="sm"
            variant="ghost"
            onClick={handleSettings}
            title="Configuración del torneo"
          >
            <Settings className="h-4 w-4" />
          </Button>

          <Button
            size="sm"
            variant="ghost"
            onClick={() => onDelete(tournament)}
            title="Eliminar torneo"
            className="text-red-600 hover:text-red-700 hover:bg-red-50"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

interface CreateTournamentDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onTournamentCreated: () => void;
}

function CreateTournamentDialog({
  isOpen,
  onOpenChange,
  onTournamentCreated,
}: CreateTournamentDialogProps) {
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  const handleNameChange = (value: string) => {
    setName(value);
    if (!slug || slug === generateSlugUtil(name)) {
      setSlug(generateSlugUtil(value));
    }
  };

  const handleCreate = async () => {
    if (!name.trim() || !slug.trim()) return;

    try {
      setIsCreating(true);

      // Crear configuración por defecto
      const defaultConfig = {
        name: name.trim(),
        days: [],
        slotMinutes: 50,
        courts: [],
        groupStage: {
          pairsPerGroup: 4,
          roundRobin: true,
        },
        knockout: {
          bracketSize: 8,
          thirdPlace: true,
        },
        rules: {
          bestOf: 3,
          setsTo: 6,
          tieBreak: true,
        },
      };

      // Validar configuración inicial (más permisivo para torneos nuevos)
      const validationResult = TournamentConfigValidator.validateInitialConfig(defaultConfig);
      
      if (!validationResult.isValid) {
        console.error("❌ Invalid tournament configuration:", validationResult.errors);
        toast.error("Configuración de torneo inválida", {
          description: validationResult.errors.join(", ")
        });
        return;
      }

      // Mostrar advertencias si las hay
      if (validationResult.warnings && validationResult.warnings.length > 0) {
        console.warn("⚠️ Tournament configuration warnings:", validationResult.warnings);
        toast.warning("Configuración con advertencias", {
          description: validationResult.warnings.join(", ")
        });
      }

      // Crear torneo usando el sistema de manejo de errores
      const newTournament = await TournamentErrorHandler.safeWrite(
        () => createTournament({
          name: name.trim(),
          slug: slug.trim(),
          createdBy: "", // Se asigna automáticamente en la función
          config: defaultConfig,
          status: "active",
        }),
        {
          errorMessage: "Error al crear el torneo",
          showToast: true,
          logError: true
        }
      );

      toast.success("Torneo creado exitosamente");
      onTournamentCreated();
      onOpenChange(false);
      setName("");
      setSlug("");
    } catch (error) {
      console.error("Error creating tournament:", error);
      // El error ya fue manejado por TournamentErrorHandler
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Nuevo Torneo
        </Button>
      </DialogTrigger>

      <DialogContent className="create-tournament-dialog">
        <DialogHeader>
          <DialogTitle>Crear Nuevo Torneo</DialogTitle>
        </DialogHeader>

        <div className="create-tournament-form space-y-4">
          <div>
            <Label htmlFor="tournament-name">Nombre del Torneo</Label>
            <Input
              id="tournament-name"
              value={name}
              onChange={(e) => handleNameChange(e.target.value)}
              placeholder="Ej: Abierto de Pádel Septiembre 2025"
            />
          </div>

          <div>
            <Label htmlFor="tournament-slug">URL del Torneo</Label>
            <Input
              id="tournament-slug"
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              placeholder="abierto-padel-septiembre-2025"
            />
            <p className="text-xs text-gray-500 mt-1">
              Identificador único del torneo
            </p>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleCreate}
              disabled={!name.trim() || !slug.trim() || isCreating}
            >
              {isCreating ? "Creando..." : "Crear Torneo"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
