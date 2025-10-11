"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import {
  Settings,
  Clock,
  Calendar,
  Trophy,
  Users,
  Target,
  Save,
  RotateCcw,
  Plus,
  Trash2,
  Info,
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { es } from "date-fns/locale";

import {
  useCurrentTournament,
  useTournamentStore,
} from "@/stores/tournament-store";
import { TournamentConfig, DaySchedule, Tournament } from "@/types";
import { updateTournament, getTournaments } from "@/lib/supabase-queries";

export default function SettingsPage() {
  const currentTournament = useCurrentTournament();
  const { tournaments, setTournaments, setCurrentTournament } =
    useTournamentStore();
  const [isLoading, setIsLoading] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [allTournaments, setAllTournaments] = useState<Tournament[]>([]);
  const [selectedTournamentId, setSelectedTournamentId] = useState<string>("");

  // Estado para la configuración
  const [config, setConfig] = useState<TournamentConfig>({
    name: "",
    days: [],
    slotMinutes: 90,
    courts: [],
    groupStage: {
      pairsPerGroup: 4,
      roundRobin: true,
    },
    knockout: {
      thirdPlace: true,
    },
    rules: {
      bestOf: 3,
      setsTo: 6,
      tieBreak: true,
    },
  });

  // Estados para formularios
  const [newDay, setNewDay] = useState("");
  const [newDayStartHour, setNewDayStartHour] = useState("08:00");
  const [newDayEndHour, setNewDayEndHour] = useState("22:00");

  useEffect(() => {
    loadAllTournaments();
  }, []);

  useEffect(() => {
    if (currentTournament) {
      setConfig(currentTournament.config);
      setSelectedTournamentId(currentTournament.id);
    }
  }, [currentTournament]);

  const loadAllTournaments = async () => {
    try {
      const tournamentsData = await getTournaments();
      setAllTournaments(tournamentsData);
    } catch (error) {
      console.error("Error loading tournaments:", error);
      toast.error("Error al cargar torneos");
    }
  };

  const handleTournamentChange = (tournamentId: string) => {
    const selectedTournament = allTournaments.find(
      (t) => t.id === tournamentId
    );
    if (selectedTournament) {
      setCurrentTournament(selectedTournament);
      setConfig(selectedTournament.config);
      setSelectedTournamentId(tournamentId);
      setHasChanges(false);
    }
  };

  const handleConfigChange = (
    section: string,
    field: string,
    value: unknown
  ) => {
    setConfig((prev) => ({
      ...prev,
      [section]: {
        ...(prev[section as keyof TournamentConfig] as Record<string, unknown>),
        [field]: value,
      },
    }));
    setHasChanges(true);
  };

  const handleDirectChange = (field: string, value: unknown) => {
    setConfig((prev) => ({
      ...prev,
      [field]: value,
    }));
    setHasChanges(true);
  };

  const handleAddDay = () => {
    if (!newDay || config.days.some((d) => d.date === newDay)) {
      toast.error("Fecha inválida o ya existe");
      return;
    }

    const newDaySchedule: DaySchedule = {
      date: newDay,
      startHour: newDayStartHour,
      endHour: newDayEndHour,
      isActive: true,
    };

    setConfig((prev) => ({
      ...prev,
      days: [...prev.days, newDaySchedule].sort((a, b) =>
        a.date.localeCompare(b.date)
      ),
    }));

    setNewDay("");
    setNewDayStartHour("08:00");
    setNewDayEndHour("22:00");
    setHasChanges(true);
  };

  const handleRemoveDay = (dayToRemove: string) => {
    setConfig((prev) => ({
      ...prev,
      days: prev.days.filter((day) => day.date !== dayToRemove),
    }));
    setHasChanges(true);
  };

  const handleUpdateDaySchedule = (
    dayDate: string,
    field: keyof DaySchedule,
    value: string | boolean
  ) => {
    setConfig((prev) => ({
      ...prev,
      days: prev.days.map((day) =>
        day.date === dayDate ? { ...day, [field]: value } : day
      ),
    }));
    setHasChanges(true);
  };

  const handleSaveConfiguration = async () => {
    if (!currentTournament) return;

    try {
      setIsLoading(true);
      toast.loading("Guardando configuración...", { id: "save-config" });

      // Solo actualizar la configuración, no todo el torneo
      const updates = {
        config: config,
      };

      const updatedTournament = await updateTournament(
        currentTournament.id,
        updates
      );

      // Actualizar el store con el torneo actualizado desde la BD
      const updatedTournaments = tournaments.map((t) =>
        t.id === currentTournament.id ? updatedTournament : t
      );
      setTournaments(updatedTournaments);

      // Actualizar el torneo actual también
      setCurrentTournament(updatedTournament);

      setHasChanges(false);
      toast.success("¡Configuración guardada exitosamente!", {
        id: "save-config",
      });
    } catch (error) {
      console.error("Error saving configuration:", error);
      toast.error("Error al guardar configuración", { id: "save-config" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetConfiguration = () => {
    if (currentTournament) {
      setConfig(currentTournament.config);
      setHasChanges(false);
      toast.info("Configuración restablecida");
    }
  };

  const getTimeSlots = () => {
    const slots = [];
    for (let hour = 6; hour <= 23; hour++) {
      slots.push(`${hour.toString().padStart(2, "0")}:00`);
      slots.push(`${hour.toString().padStart(2, "0")}:30`);
    }
    return slots;
  };

  const formatDayName = (dateString: string) => {
    try {
      const date = new Date(dateString + "T00:00:00");
      return format(date, "EEEE, dd 'de' MMMM", { locale: es });
    } catch {
      return dateString;
    }
  };

  if (!currentTournament) {
    return (
      <div className="settings-no-tournament p-6 max-w-7xl mx-auto">
        <Card className="text-center py-12">
          <CardContent>
            <Settings className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h2 className="text-xl font-medium text-gray-900 mb-2">
              No hay torneo seleccionado
            </h2>
            <p className="text-gray-600 mb-4">
              Selecciona un torneo para configurarlo.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="settings-page p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="settings-header">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-3xl font-bold text-blue-900 flex items-center gap-3">
                  <Settings className="h-8 w-8" />
                  Configuración del Torneo
                </CardTitle>
                <p className="text-gray-600 mt-1">
                  Torneo: {currentTournament.name}
                </p>
              </div>
              <div className="flex gap-3">
                {hasChanges && (
                  <Button
                    onClick={handleResetConfiguration}
                    variant="outline"
                    disabled={isLoading}
                  >
                    <RotateCcw className="h-4 w-4 mr-2" />
                    Restablecer
                  </Button>
                )}
                <Button
                  onClick={handleSaveConfiguration}
                  disabled={!hasChanges || isLoading}
                >
                  <Save className="h-4 w-4 mr-2" />
                  Guardar Cambios
                </Button>
              </div>
            </div>
            {hasChanges && (
              <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <div className="flex items-center gap-2 text-yellow-800">
                  <Info className="h-4 w-4" />
                  <span className="text-sm font-medium">
                    Tienes cambios sin guardar
                  </span>
                </div>
              </div>
            )}
          </CardHeader>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Configuración General */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="h-5 w-5" />
              Información General
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="tournamentSelector">Seleccionar Torneo</Label>
              <Select
                value={selectedTournamentId}
                onValueChange={handleTournamentChange}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona un torneo para configurar" />
                </SelectTrigger>
                <SelectContent>
                  {allTournaments.map((tournament) => (
                    <SelectItem key={tournament.id} value={tournament.id}>
                      {tournament.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Configuración de Duración */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Duración de Partidos
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="slotMinutes">
                Duración por Partido (minutos)
              </Label>
              <Input
                id="slotMinutes"
                type="number"
                min="15"
                max="180"
                step="5"
                value={config.slotMinutes}
                onChange={(e) =>
                  handleDirectChange("slotMinutes", parseInt(e.target.value) || 30)
                }
                placeholder="30"
                className="w-full"
              />
              <p className="text-xs text-gray-500 mt-1">
                Ejemplos: 30, 35, 45, 60, 90, 120 minutos
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Días del Torneo */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Días y Horarios del Torneo
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Agregar nuevo día */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div>
                <Label htmlFor="newDate" className="text-sm">
                  Fecha
                </Label>
                <Input
                  id="newDate"
                  type="date"
                  value={newDay}
                  onChange={(e) => setNewDay(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="newStartHour" className="text-sm">
                  Hora Inicio
                </Label>
                <Select
                  value={newDayStartHour}
                  onValueChange={setNewDayStartHour}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {getTimeSlots().map((time) => (
                      <SelectItem key={time} value={time}>
                        {time}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="newEndHour" className="text-sm">
                  Hora Fin
                </Label>
                <Select value={newDayEndHour} onValueChange={setNewDayEndHour}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {getTimeSlots().map((time) => (
                      <SelectItem key={time} value={time}>
                        {time}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-end">
                <Button onClick={handleAddDay} size="sm" className="w-full">
                  <Plus className="h-4 w-4 mr-2" />
                  Agregar Día
                </Button>
              </div>
            </div>

            {/* Lista de días configurados */}
            <div className="space-y-3">
              {config.days.length === 0 ? (
                <p className="text-gray-500 text-sm text-center py-8">
                  No hay días configurados. Agrega el primer día del torneo.
                </p>
              ) : (
                config.days.map((daySchedule) => (
                  <div
                    key={daySchedule.date}
                    className="grid grid-cols-1 md:grid-cols-5 gap-3 p-4 bg-white border border-gray-200 rounded-lg hover:shadow-sm transition-shadow"
                  >
                    <div className="md:col-span-2">
                      <p className="font-medium text-gray-900">
                        {formatDayName(daySchedule.date)}
                      </p>
                      <p className="text-sm text-gray-500">
                        {daySchedule.date}
                      </p>
                    </div>

                    <div>
                      <Label className="text-xs text-gray-600">
                        Hora Inicio
                      </Label>
                      <Select
                        value={daySchedule.startHour}
                        onValueChange={(value) =>
                          handleUpdateDaySchedule(
                            daySchedule.date,
                            "startHour",
                            value
                          )
                        }
                      >
                        <SelectTrigger className="h-8">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {getTimeSlots().map((time) => (
                            <SelectItem key={time} value={time}>
                              {time}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label className="text-xs text-gray-600">Hora Fin</Label>
                      <Select
                        value={daySchedule.endHour}
                        onValueChange={(value) =>
                          handleUpdateDaySchedule(
                            daySchedule.date,
                            "endHour",
                            value
                          )
                        }
                      >
                        <SelectTrigger className="h-8">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {getTimeSlots().map((time) => (
                            <SelectItem key={time} value={time}>
                              {time}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          checked={daySchedule.isActive}
                          onCheckedChange={(checked) =>
                            handleUpdateDaySchedule(
                              daySchedule.date,
                              "isActive",
                              checked
                            )
                          }
                        />
                        <Label className="text-xs">Activo</Label>
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleRemoveDay(daySchedule.date)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* Configuración de Grupos */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Fase de Grupos
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 gap-4">
              <div>
                <Label htmlFor="pairsPerGroup">Parejas por Grupo</Label>
                <Select
                  value={config.groupStage.pairsPerGroup?.toString() || "4"}
                  onValueChange={(value) => {
                    const pairsPerGroup = parseInt(value);
                    handleConfigChange("groupStage", "pairsPerGroup", pairsPerGroup);
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="2">2 parejas</SelectItem>
                    <SelectItem value="3">3 parejas</SelectItem>
                    <SelectItem value="4">4 parejas</SelectItem>
                    <SelectItem value="5">5 parejas</SelectItem>
                    <SelectItem value="6">6 parejas</SelectItem>
                    <SelectItem value="7">7 parejas</SelectItem>
                    <SelectItem value="8">8 parejas</SelectItem>
                    <SelectItem value="9">9 parejas</SelectItem>
                    <SelectItem value="10">10 parejas</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-gray-500 mt-1">
                  Número de parejas que tendrá cada grupo
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="roundRobin"
                checked={config.groupStage.roundRobin}
                onCheckedChange={(checked) =>
                  handleConfigChange("groupStage", "roundRobin", checked)
                }
              />
              <Label htmlFor="roundRobin">
                Todos contra todos (Round Robin)
              </Label>
            </div>
          </CardContent>
        </Card>

        {/* Configuración de Eliminatorias */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5" />
              Fase Eliminatoria
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center gap-2 text-blue-800 mb-2">
                <Info className="h-4 w-4" />
                <span className="text-sm font-medium">Bracket Dinámico</span>
              </div>
              <p className="text-sm text-blue-700">
                El tamaño del bracket se determina automáticamente basado en el
                número de grupos y parejas que avanzan. Siempre avanzan los
                primeros lugares de cada grupo, más los mejores segundos lugares
                según sea necesario.
              </p>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="thirdPlace"
                checked={config.knockout.thirdPlace}
                onCheckedChange={(checked) =>
                  handleConfigChange("knockout", "thirdPlace", checked)
                }
              />
              <Label htmlFor="thirdPlace">
                Incluir partido por el tercer lugar
              </Label>
            </div>
          </CardContent>
        </Card>

        {/* Reglas de Juego */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="h-5 w-5" />
              Reglas de Juego
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="bestOf">Mejor de</Label>
                <Select
                  value={config.rules.bestOf.toString()}
                  onValueChange={(value) =>
                    handleConfigChange("rules", "bestOf", parseInt(value))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1 set</SelectItem>
                    <SelectItem value="3">3 sets</SelectItem>
                    <SelectItem value="5">5 sets</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="setsTo">Juegos por Set</Label>
                <Select
                  value={config.rules.setsTo.toString()}
                  onValueChange={(value) =>
                    handleConfigChange("rules", "setsTo", parseInt(value))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="4">Primer a 4</SelectItem>
                    <SelectItem value="6">Primer a 6</SelectItem>
                    <SelectItem value="8">Primer a 8</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="tieBreak"
                checked={config.rules.tieBreak}
                onCheckedChange={(checked) =>
                  handleConfigChange("rules", "tieBreak", checked)
                }
              />
              <Label htmlFor="tieBreak">
                Permitir Super Muerte (tie-break)
              </Label>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Resumen de Configuración */}
      <Card>
        <CardHeader>
          <CardTitle>Resumen de Configuración</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-2">
              <h4 className="font-medium text-gray-900">Configuración</h4>
              <div className="text-sm text-gray-600 space-y-1">
                <p>Duración: {config.slotMinutes} min</p>
                <p>Días configurados: {config.days.length}</p>
                <p>
                  Días activos: {config.days.filter((d) => d.isActive).length}
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <h4 className="font-medium text-gray-900">Grupos</h4>
              <div className="text-sm text-gray-600 space-y-1">
                <p>
                  Parejas por grupo: {config.groupStage.pairsPerGroup}
                </p>
                <p>Round Robin: {config.groupStage.roundRobin ? "Sí" : "No"}</p>
              </div>
            </div>

            <div className="space-y-2">
              <h4 className="font-medium text-gray-900">Eliminatorias</h4>
              <div className="text-sm text-gray-600 space-y-1">
                <p>Bracket: Dinámico (basado en grupos)</p>
                <p>3er lugar: {config.knockout.thirdPlace ? "Sí" : "No"}</p>
                <p>Mejor de: {config.rules.bestOf} sets</p>
              </div>
            </div>
          </div>

          <Separator className="my-4" />

          <div className="space-y-2">
            <h4 className="font-medium text-gray-900">
              Días del Torneo ({config.days.length})
            </h4>
            <div className="space-y-2">
              {config.days.length === 0 ? (
                <Badge variant="outline">No configurado</Badge>
              ) : (
                config.days.map((daySchedule) => (
                  <div
                    key={daySchedule.date}
                    className="flex items-center justify-between p-2 bg-gray-50 rounded text-sm"
                  >
                    <span className="font-medium">{daySchedule.date}</span>
                    <span className="text-gray-600">
                      {daySchedule.startHour} - {daySchedule.endHour}
                      {!daySchedule.isActive && " (Inactivo)"}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
