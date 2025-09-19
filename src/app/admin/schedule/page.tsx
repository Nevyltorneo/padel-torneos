"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Calendar as CalendarIcon,
  Calendar,
  Clock,
  MapPin,
  Users,
  Play,
  Plus,
  Edit,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Trophy,
} from "lucide-react";
import { toast } from "sonner";
import { format, parseISO, addDays, isSameDay } from "date-fns";
import { es } from "date-fns/locale";

import { useCurrentTournament } from "@/stores/tournament-store";
import { Match, Pair, Category, Court, DaySchedule } from "@/types";
import {
  getCategories,
  getPairs,
  getAllMatchesByCategory,
  updateMatchSchedule,
  getCourts,
  createCourt,
  deleteCourt,
  notifyMatchScheduled,
} from "@/lib/supabase-queries";

export default function CalendarPage() {
  const currentTournament = useCurrentTournament();
  const [categories, setCategories] = useState<Category[]>([]);
  const [allPairs, setAllPairs] = useState<Pair[]>([]);
  const [allMatches, setAllMatches] = useState<Match[]>([]);
  const [allCategories, setAllCategories] = useState<Category[]>([]);
  const [courts, setCourts] = useState<Court[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [tournamentDays, setTournamentDays] = useState<DaySchedule[]>([]);
  const [availableTimeSlots, setAvailableTimeSlots] = useState<string[]>([]);

  // Estados para diálogos
  const [showScheduleDialog, setShowScheduleDialog] = useState(false);
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);
  const [scheduleForm, setScheduleForm] = useState({
    day: "",
    startTime: "",
    courtId: "",
  });

  // Estados para gestión de canchas
  const [showCourtDialog, setShowCourtDialog] = useState(false);
  const [courtForm, setCourtsForm] = useState({
    name: "",
  });

  useEffect(() => {
    if (currentTournament) {
      loadData();
    }
  }, [currentTournament]);

  const loadData = async () => {
    try {
      setIsLoading(true);
      const [categoriesData, courtsData] = await Promise.all([
        getCategories(currentTournament!.id),
        getCourts(currentTournament!.id),
      ]);

      setCategories(categoriesData);
      setAllCategories(categoriesData); // Para el algoritmo de programación
      setCourts(courtsData);

      // Cargar configuración de días del torneo
      if (currentTournament?.config?.days) {
        setTournamentDays(currentTournament.config.days);

        // Si hay días configurados, establecer el primer día activo como fecha actual
        const activeDays = currentTournament.config.days.filter(
          (d) => d.isActive
        );
        if (activeDays.length > 0) {
          setCurrentDate(new Date(activeDays[0].date + "T00:00:00"));
        }
      }

      // Cargar todos los partidos de todas las categorías
      if (categoriesData.length > 0) {
        const allMatchesPromises = categoriesData.map((category) =>
          getAllMatchesByCategory(category.id)
        );
        const allMatchesArrays = await Promise.all(allMatchesPromises);
        const flatMatches = allMatchesArrays.flat();
        setAllMatches(flatMatches);

        // Cargar todas las parejas de todas las categorías
        const allPairsPromises = categoriesData.map((category) =>
          getPairs(category.id)
        );
        const allPairsArrays = await Promise.all(allPairsPromises);
        const flatPairs = allPairsArrays.flat();
        setAllPairs(flatPairs);
      }
    } catch (error) {
      console.error("Error loading data:", error);
      toast.error("Error al cargar datos");
    } finally {
      setIsLoading(false);
    }
  };

  // Función para generar slots de tiempo basados en la configuración del día
  const getTimeSlotsForDay = (daySchedule: DaySchedule): string[] => {
    const slots = [];
    const startHour = parseInt(daySchedule.startHour.split(":")[0]);
    const startMinute = parseInt(daySchedule.startHour.split(":")[1]);
    const endHour = parseInt(daySchedule.endHour.split(":")[0]);
    const endMinute = parseInt(daySchedule.endHour.split(":")[1]);

    const slotDuration = currentTournament?.config?.slotMinutes || 90;

    let currentTime = startHour * 60 + startMinute; // Convertir a minutos
    const endTime = endHour * 60 + endMinute;

    while (currentTime < endTime) {
      const hours = Math.floor(currentTime / 60);
      const minutes = currentTime % 60;
      const timeString = `${hours.toString().padStart(2, "0")}:${minutes
        .toString()
        .padStart(2, "0")}`;
      slots.push(timeString);
      currentTime += slotDuration;
    }

    return slots;
  };

  // Función para distribuir automáticamente los partidos
  const handleAutoScheduleMatches = async () => {
    if (
      !currentTournament ||
      tournamentDays.length === 0 ||
      courts.length === 0
    ) {
      toast.error("Necesitas configurar días y canchas primero");
      return;
    }

    try {
      toast.loading("Distribuyendo partidos automáticamente...", {
        id: "auto-schedule",
      });

      // Obtener solo partidos de FASE DE GRUPOS pendientes (sin programar)
      const pendingMatches = allMatches.filter(
        (match) => match.stage === "group" && (!match.day || !match.startTime)
      );

      if (pendingMatches.length === 0) {
        toast.info(
          "No hay partidos de fase de grupos pendientes por programar",
          {
            id: "auto-schedule",
          }
        );
        return;
      }

      console.log(
        `🏆 Solo programando FASE DE GRUPOS: ${pendingMatches.length} partidos`
      );

      // Agrupar partidos por categoría para programar desde la más baja (6ta) a la más alta
      const matchesByCategory = pendingMatches.reduce((acc, match) => {
        if (!acc[match.categoryId]) {
          acc[match.categoryId] = [];
        }
        acc[match.categoryId].push(match);
        return acc;
      }, {} as { [categoryId: string]: Match[] });

      // Ordenar categorías de la más baja a la más alta
      const sortedCategoryIds = Object.keys(matchesByCategory).sort((a, b) => {
        const categoryA = allCategories.find((cat) => cat.id === a);
        const categoryB = allCategories.find((cat) => cat.id === b);

        // Extraer número de categoría (6ta, 5ta, 4ta, etc.)
        const getNumFromCategory = (name: string) => {
          const match = name.match(/(\d+)/);
          return match ? parseInt(match[1]) : 0;
        };

        const numA = getNumFromCategory(categoryA?.name || "");
        const numB = getNumFromCategory(categoryB?.name || "");

        // Ordenar de mayor a menor número (6ta primero, luego 5ta, etc.)
        return numB - numA;
      });

      console.log(
        `📊 Categorías ordenadas (6ta → 1ra):`,
        sortedCategoryIds.map((id) => {
          const cat = allCategories.find((c) => c.id === id);
          return `${cat?.name} (${matchesByCategory[id].length} partidos)`;
        })
      );

      // Crear matriz de disponibilidad
      const schedule: {
        [day: string]: { [time: string]: { [courtId: string]: boolean } };
      } = {};

      // Inicializar disponibilidad
      tournamentDays.forEach((daySchedule) => {
        if (!daySchedule.isActive) return;

        schedule[daySchedule.date] = {};
        const timeSlots = getTimeSlotsForDay(daySchedule);

        timeSlots.forEach((timeSlot) => {
          schedule[daySchedule.date][timeSlot] = {};
          courts.forEach((court) => {
            schedule[daySchedule.date][timeSlot][court.id] = true; // Disponible
          });
        });
      });

      // Marcar slots ocupados por partidos ya programados
      allMatches.forEach((match) => {
        if (match.day && match.startTime && match.courtId) {
          if (schedule[match.day] && schedule[match.day][match.startTime]) {
            schedule[match.day][match.startTime][match.courtId] = false; // Ocupado
          }
        }
      });

      // Crear matriz de disponibilidad de parejas
      const pairSchedule: { [day: string]: { [time: string]: Set<string> } } =
        {};

      // Inicializar disponibilidad de parejas
      tournamentDays.forEach((daySchedule) => {
        if (!daySchedule.isActive) return;

        pairSchedule[daySchedule.date] = {};
        const timeSlots = getTimeSlotsForDay(daySchedule);

        timeSlots.forEach((timeSlot) => {
          pairSchedule[daySchedule.date][timeSlot] = new Set<string>();
        });
      });

      // Marcar parejas ocupadas por partidos ya programados
      allMatches.forEach((match) => {
        if (
          match.day &&
          match.startTime &&
          pairSchedule[match.day] &&
          pairSchedule[match.day][match.startTime]
        ) {
          pairSchedule[match.day][match.startTime].add(match.pairAId);
          pairSchedule[match.day][match.startTime].add(match.pairBId);
        }
      });

      // Distribuir partidos por categoría (de 6ta a 1ra)
      let totalScheduledCount = 0;
      console.log(`🎯 Iniciando programación por categorías...`);

      for (const categoryId of sortedCategoryIds) {
        const categoryMatches = matchesByCategory[categoryId];
        const category = allCategories.find((c) => c.id === categoryId);

        console.log(
          `\n🏆 Programando ${category?.name}: ${categoryMatches.length} partidos`
        );

        let categoryScheduledCount = 0;

        for (const match of categoryMatches) {
          let scheduled = false;
          console.log(
            `\n🏓 Programando partido: ${match.pairAId} vs ${match.pairBId}`
          );

          // Buscar primer slot disponible (día por día, hora por hora)
          for (const day of Object.keys(schedule).sort()) {
            // Ordenar días
            if (scheduled) break;

            for (const time of Object.keys(schedule[day]).sort()) {
              // Ordenar horas
              if (scheduled) break;

              // Verificar si las parejas están disponibles en este horario
              const pairsInThisSlot = pairSchedule[day][time];
              const pairAAvailable = !pairsInThisSlot.has(match.pairAId);
              const pairBAvailable = !pairsInThisSlot.has(match.pairBId);

              console.log(
                `   📅 ${day} ${time}: Pareja A disponible: ${pairAAvailable}, Pareja B disponible: ${pairBAvailable}`
              );

              if (!pairAAvailable || !pairBAvailable) {
                console.log(`   ❌ Parejas ocupadas en ${day} ${time}`);
                continue; // Parejas no disponibles, probar siguiente slot
              }

              // Buscar cancha disponible
              for (const courtId of Object.keys(schedule[day][time])) {
                if (schedule[day][time][courtId]) {
                  console.log(
                    `   ✅ Programando en ${day} ${time} - Cancha ${courtId} (${category?.name})`
                  );

                  // Slot y cancha disponibles, y parejas libres - programar partido
                  await updateMatchSchedule(match.id, day, time, courtId);

                  // Buscar las parejas para la notificación
                  const pairA = allPairs.find((p) => p.id === match.pairAId);
                  const pairB = allPairs.find((p) => p.id === match.pairBId);

                  // Crear notificación de partido programado
                  if (pairA && pairB) {
                    const updatedMatch = {
                      ...match,
                      day,
                      startTime: time,
                      courtId,
                    };
                    await notifyMatchScheduled(updatedMatch, pairA, pairB);
                  }

                  // Marcar como ocupado
                  schedule[day][time][courtId] = false; // Cancha ocupada
                  pairSchedule[day][time].add(match.pairAId); // Pareja A ocupada
                  pairSchedule[day][time].add(match.pairBId); // Pareja B ocupada

                  categoryScheduledCount++;
                  totalScheduledCount++;
                  scheduled = true;
                  break;
                } else {
                  console.log(
                    `   🏟️ Cancha ${courtId} ocupada en ${day} ${time}`
                  );
                }
              }
            }
          }

          if (!scheduled) {
            console.warn(
              `❌ No se pudo programar el partido: ${match.id} - Sin slots disponibles`
            );
          }
        }

        console.log(
          `✅ ${category?.name}: ${categoryScheduledCount}/${categoryMatches.length} partidos programados`
        );
      }

      console.log(
        `🎉 Programación completada: ${totalScheduledCount}/${pendingMatches.length} partidos de FASE DE GRUPOS programados`
      );

      // Recargar datos
      await loadData();

      toast.success(
        `¡${totalScheduledCount} partidos de FASE DE GRUPOS programados automáticamente!`,
        {
          id: "auto-schedule",
        }
      );
    } catch (error) {
      console.error("Error in auto scheduling:", error);
      toast.error("Error al distribuir partidos", { id: "auto-schedule" });
    }
  };

  // 🏆 NUEVA FUNCIÓN: Programar eliminatorias automáticamente
  const handleAutoScheduleEliminations = async () => {
    if (
      !currentTournament ||
      tournamentDays.length === 0 ||
      courts.length === 0
    ) {
      toast.error("Necesitas configurar días y canchas primero");
      return;
    }

    try {
      toast.loading("Programando eliminatorias automáticamente...", {
        id: "auto-schedule-eliminations",
      });

      // Obtener partidos de ELIMINATORIAS pendientes (sin programar)
      const eliminationMatches = allMatches.filter(
        (match) =>
          ["quarterfinals", "semifinals", "final", "third_place"].includes(
            match.stage
          ) &&
          (!match.day || !match.startTime)
      );

      if (eliminationMatches.length === 0) {
        toast.info(
          "No hay partidos de eliminatorias pendientes por programar",
          {
            id: "auto-schedule-eliminations",
          }
        );
        return;
      }

      console.log(
        `🏆 Programando ELIMINATORIAS: ${eliminationMatches.length} partidos`
      );

      // Agrupar por categoría y ordenar por prioridad (categoría más baja primero)
      const matchesByCategory = eliminationMatches.reduce((acc, match) => {
        if (!acc[match.categoryId]) {
          acc[match.categoryId] = [];
        }
        acc[match.categoryId].push(match);
        return acc;
      }, {} as { [categoryId: string]: Match[] });

      // Ordenar categorías de la más baja a la más alta
      const sortedCategoryIds = Object.keys(matchesByCategory).sort((a, b) => {
        const categoryA = allCategories.find((cat) => cat.id === a);
        const categoryB = allCategories.find((cat) => cat.id === b);

        const getNumFromCategory = (name: string) => {
          const match = name.match(/(\d+)/);
          return match ? parseInt(match[1]) : 0;
        };

        const numA = getNumFromCategory(categoryA?.name || "");
        const numB = getNumFromCategory(categoryB?.name || "");

        return numB - numA; // Más alto = más baja categoría
      });

      // Crear estructura de horarios disponibles (empezar después de grupos)
      const schedule: {
        [day: string]: { [time: string]: { [courtId: string]: boolean } };
      } = {};

      // Obtener partidos YA programados para evitar conflictos
      const scheduledMatches = allMatches.filter(
        (match) => match.day && match.startTime && match.courtId
      );

      // Inicializar estructura de disponibilidad
      tournamentDays.forEach((dayConfig) => {
        const dayString = dayConfig.date;
        schedule[dayString] = {};

        const timeSlots = getTimeSlotsForDay(dayConfig);
        timeSlots.forEach((timeSlot) => {
          schedule[dayString][timeSlot] = {};
          courts.forEach((court) => {
            schedule[dayString][timeSlot][court.id] = true; // Disponible
          });
        });

        // Marcar slots ocupados por partidos ya programados
        scheduledMatches
          .filter((match) => match.day === dayString)
          .forEach((match) => {
            if (schedule[dayString][match.startTime!] && match.courtId) {
              schedule[dayString][match.startTime!][match.courtId] = false;
            }
          });
      });

      // Definir orden de prioridad de etapas (final primero para mejores horarios)
      const stageOrder = [
        "final",
        "third_place",
        "semifinals",
        "quarterfinals",
      ];

      let totalScheduledCount = 0;

      // Programar por categoría (más baja primero) y luego por etapa
      for (const categoryId of sortedCategoryIds) {
        const category = allCategories.find((c) => c.id === categoryId);
        const categoryMatches = matchesByCategory[categoryId];

        // Ordenar partidos por etapa (finales primero)
        const matchesByStage = stageOrder.reduce((acc, stage) => {
          acc[stage] = categoryMatches.filter((m) => m.stage === stage);
          return acc;
        }, {} as { [stage: string]: Match[] });

        console.log(`📊 ${category?.name}: Programando eliminatorias...`);

        for (const stage of stageOrder) {
          const stageMatches = matchesByStage[stage];
          if (stageMatches.length === 0) continue;

          console.log(`   🎯 ${stage}: ${stageMatches.length} partidos`);

          for (const match of stageMatches) {
            let scheduled = false;

            // Buscar primer slot disponible
            for (const day of Object.keys(schedule)) {
              if (scheduled) break;

              for (const time of Object.keys(schedule[day])) {
                if (scheduled) break;

                for (const courtId of Object.keys(schedule[day][time])) {
                  if (schedule[day][time][courtId]) {
                    console.log(
                      `   ✅ Programando ${stage} en ${day} ${time} - ${courtId}`
                    );

                    await updateMatchSchedule(match.id, day, time, courtId);

                    // Marcar como ocupado
                    schedule[day][time][courtId] = false;
                    totalScheduledCount++;
                    scheduled = true;
                    break;
                  }
                }
              }
            }

            if (!scheduled) {
              console.warn(
                `❌ No se pudo programar partido ${match.id} (${stage})`
              );
            }
          }
        }
      }

      // Recargar datos
      await loadData();

      toast.success(
        `¡${totalScheduledCount} partidos de eliminatorias programados exitosamente!`,
        { id: "auto-schedule-eliminations" }
      );

      console.log(
        `🎉 Programación de eliminatorias completada: ${totalScheduledCount} partidos`
      );
    } catch (error) {
      console.error("Error in elimination scheduling:", error);
      toast.error("Error al programar eliminatorias", {
        id: "auto-schedule-eliminations",
      });
    }
  };

  // Función para limpiar todos los horarios programados
  const handleClearAllSchedules = async () => {
    try {
      toast.loading("Limpiando todos los horarios...", {
        id: "clear-schedules",
      });

      console.log("🧹 Iniciando limpieza de horarios...");
      console.log("📊 Total de partidos:", allMatches.length);

      // Obtener todos los partidos programados
      const scheduledMatches = allMatches.filter(
        (match) => match.day && match.startTime
      );

      console.log(
        "📅 Partidos programados encontrados:",
        scheduledMatches.length
      );

      if (scheduledMatches.length === 0) {
        toast.info("No hay horarios programados para limpiar", {
          id: "clear-schedules",
        });
        return;
      }

      // Limpiar horarios de todos los partidos programados
      let cleanedCount = 0;
      for (const match of scheduledMatches) {
        console.log(
          `🗑️ Limpiando partido ${match.id}: ${match.day} ${match.startTime}`
        );
        await updateMatchSchedule(match.id, "", "", "");
        cleanedCount++;
      }

      console.log(`✅ Limpieza completada: ${cleanedCount} horarios limpiados`);

      // Recargar datos
      await loadData();

      toast.success(`¡${cleanedCount} horarios limpiados!`, {
        id: "clear-schedules",
      });
    } catch (error) {
      console.error("❌ Error clearing schedules:", error);
      toast.error("Error al limpiar horarios", { id: "clear-schedules" });
    }
  };

  const handleScheduleMatch = (match: Match) => {
    setSelectedMatch(match);
    setScheduleForm({
      day: match.day || "",
      startTime: match.startTime || "",
      courtId: match.courtId || "",
    });
    setShowScheduleDialog(true);
  };

  const handleSubmitSchedule = async () => {
    if (!selectedMatch) return;

    try {
      toast.loading("Programando partido...", { id: "schedule-match" });

      await updateMatchSchedule(
        selectedMatch.id,
        scheduleForm.day,
        scheduleForm.startTime,
        scheduleForm.courtId
      );

      // Recargar datos
      await loadData();

      toast.success("¡Partido programado exitosamente!", {
        id: "schedule-match",
      });
      setShowScheduleDialog(false);
    } catch (error) {
      console.error("Error scheduling match:", error);
      toast.error("Error al programar partido", { id: "schedule-match" });
    }
  };

  const handleCreateCourt = async () => {
    if (!currentTournament) return;

    try {
      toast.loading("Creando cancha...", { id: "create-court" });

      await createCourt(currentTournament.id, courtForm.name);

      // Recargar canchas
      const courtsData = await getCourts(currentTournament.id);
      setCourts(courtsData);

      setCourtsForm({ name: "" });
      toast.success("¡Cancha creada exitosamente!", { id: "create-court" });
      setShowCourtDialog(false);
    } catch (error) {
      console.error("Error creating court:", error);
      toast.error("Error al crear cancha", { id: "create-court" });
    }
  };

  const handleDeleteCourt = async (courtId: string) => {
    try {
      toast.loading("Eliminando cancha...", { id: "delete-court" });

      await deleteCourt(courtId);

      // Recargar canchas
      const courtsData = await getCourts(currentTournament!.id);
      setCourts(courtsData);

      toast.success("¡Cancha eliminada exitosamente!", { id: "delete-court" });
    } catch (error) {
      console.error("Error deleting court:", error);
      toast.error("Error al eliminar cancha", { id: "delete-court" });
    }
  };

  const getPairById = (pairId: string): Pair | undefined => {
    return allPairs.find((p) => p.id === pairId);
  };

  const getCourtById = (courtId: string): Court | undefined => {
    return courts.find((c) => c.id === courtId);
  };

  const getMatchesForDay = (date: Date): Match[] => {
    const dateString = format(date, "yyyy-MM-dd");
    return allMatches.filter((match) => match.day === dateString);
  };

  const getCategoryName = (categoryId: string): string => {
    const category = categories.find((c) => c.id === categoryId);
    return category?.name || "Categoría desconocida";
  };

  const getTimeSlots = () => {
    // Si hay un día seleccionado, usar sus horarios
    const currentDateString = format(currentDate, "yyyy-MM-dd");
    const daySchedule = tournamentDays.find(
      (d) => d.date === currentDateString
    );

    if (daySchedule) {
      return getTimeSlotsForDay(daySchedule);
    }

    // Fallback a horarios por defecto
    const slots = [];
    for (let hour = 8; hour <= 22; hour++) {
      slots.push(`${hour.toString().padStart(2, "0")}:00`);
      slots.push(`${hour.toString().padStart(2, "0")}:30`);
    }
    return slots;
  };

  const formatPairName = (pair?: Pair): string => {
    if (!pair) return "TBD";
    return `${pair.player1?.name || "Jugador 1"} / ${
      pair.player2?.name || "Jugador 2"
    }`;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "scheduled":
        return "bg-blue-100 text-blue-800";
      case "playing":
        return "bg-yellow-100 text-yellow-800";
      case "finished":
        return "bg-green-100 text-green-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  if (!currentTournament) {
    return (
      <div className="calendar-no-tournament p-6 max-w-7xl mx-auto">
        <Card className="text-center py-12">
          <CardContent>
            <CalendarIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h2 className="text-xl font-medium text-gray-900 mb-2">
              No hay torneo seleccionado
            </h2>
            <p className="text-gray-600 mb-4">
              Selecciona un torneo para ver el calendario.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="calendar-loading p-6 max-w-7xl mx-auto">
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p>Cargando calendario...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="calendar-page p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="calendar-header">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-3xl font-bold text-blue-900 flex items-center gap-3">
                  <CalendarIcon className="h-8 w-8" />
                  Calendario del Torneo
                </CardTitle>
                <p className="text-gray-600 mt-1">
                  Torneo: {currentTournament.name}
                </p>
              </div>
              <div className="flex gap-3">
                <Button
                  onClick={() => setShowCourtDialog(true)}
                  variant="outline"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Nueva Cancha
                </Button>
              </div>
            </div>
          </CardHeader>
        </Card>
      </div>

      {/* Información del torneo */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Trophy className="h-5 w-5" />
            {currentTournament.name}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-blue-600" />
              <span className="text-sm">
                {tournamentDays.filter((d) => d.isActive).length} días activos
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-green-600" />
              <span className="text-sm">
                {currentTournament.config.slotMinutes} min por partido
              </span>
            </div>
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-purple-600" />
              <span className="text-sm">
                {courts.length} canchas disponibles
              </span>
            </div>
          </div>

          {tournamentDays.length > 0 && (
            <div className="mt-4">
              <h4 className="text-sm font-medium text-gray-700 mb-2">
                Días del torneo:
              </h4>
              <div className="flex flex-wrap gap-2">
                {tournamentDays.map((day) => (
                  <Badge
                    key={day.date}
                    variant={day.isActive ? "default" : "secondary"}
                    className="text-xs"
                  >
                    {format(new Date(day.date + "T00:00:00"), "dd MMM", {
                      locale: es,
                    })}
                    <span className="ml-1 text-xs opacity-75">
                      {day.startHour}-{day.endHour}
                    </span>
                  </Badge>
                ))}
              </div>
            </div>
          )}

          <div className="mt-4 flex gap-2">
            <Button
              onClick={handleAutoScheduleMatches}
              className="flex items-center gap-2"
            >
              <Clock className="h-4 w-4" />
              Programar Fase de Grupos
            </Button>
            <Button
              onClick={handleAutoScheduleEliminations}
              className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700"
            >
              <Trophy className="h-4 w-4" />
              Programar Eliminatorias
            </Button>
            <Button
              onClick={handleClearAllSchedules}
              variant="outline"
              className="flex items-center gap-2"
            >
              <Trash2 className="h-4 w-4" />
              Limpiar Horarios
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Navegación de fechas */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentDate(addDays(currentDate, -1))}
            >
              <ChevronLeft className="h-4 w-4" />
              Anterior
            </Button>
            <CardTitle className="text-xl">
              {format(currentDate, "EEEE, dd 'de' MMMM 'de' yyyy", {
                locale: es,
              })}
            </CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentDate(addDays(currentDate, 1))}
            >
              Siguiente
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
      </Card>

      {/* Vista del calendario */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Partidos del día */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Play className="h-5 w-5" />
                Partidos del día
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {getMatchesForDay(currentDate).length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <CalendarIcon className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                    <p>No hay partidos programados para este día</p>
                  </div>
                ) : (
                  getMatchesForDay(currentDate).map((match) => {
                    const pairA = getPairById(match.pairAId);
                    const pairB = getPairById(match.pairBId);
                    const court = getCourtById(match.courtId || "");

                    return (
                      <div
                        key={match.id}
                        className="border rounded-lg p-4 hover:bg-gray-50 transition-colors"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-4 mb-2">
                              <Badge className={getStatusColor(match.status)}>
                                {match.status === "scheduled"
                                  ? "Programado"
                                  : match.status === "playing"
                                  ? "Jugando"
                                  : match.status === "completed"
                                  ? "Finalizado"
                                  : "Pendiente"}
                              </Badge>
                              <Badge variant="outline" className="text-xs">
                                {getCategoryName(match.categoryId)}
                              </Badge>
                              <span className="text-sm text-gray-500">
                                {match.stage === "group"
                                  ? "Fase de Grupos"
                                  : match.stage === "quarterfinals"
                                  ? "Cuartos de Final"
                                  : match.stage === "semifinals"
                                  ? "Semifinal"
                                  : match.stage === "final"
                                  ? "Final"
                                  : match.stage === "third_place"
                                  ? "Tercer Lugar"
                                  : match.stage}
                              </span>
                            </div>
                            <div className="grid grid-cols-3 gap-4 items-center">
                              <div className="text-center">
                                <p className="font-medium">
                                  {formatPairName(pairA)}
                                </p>
                              </div>
                              <div className="text-center text-gray-500 font-bold">
                                VS
                              </div>
                              <div className="text-center">
                                <p className="font-medium">
                                  {formatPairName(pairB)}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-4 mt-2 text-sm text-gray-600">
                              {match.startTime && (
                                <div className="flex items-center gap-1">
                                  <Clock className="h-4 w-4" />
                                  {match.startTime}
                                </div>
                              )}
                              {court && (
                                <div className="flex items-center gap-1">
                                  <MapPin className="h-4 w-4" />
                                  {court.name}
                                </div>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleScheduleMatch(match)}
                            >
                              <Edit className="h-4 w-4 mr-1" />
                              {match.startTime ? "Editar" : "Programar"}
                            </Button>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Panel lateral - Canchas */}
        <div>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                Canchas Disponibles
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {courts.length === 0 ? (
                  <div className="text-center py-4 text-gray-500">
                    <p className="text-sm">No hay canchas registradas</p>
                    <Button
                      size="sm"
                      className="mt-2"
                      onClick={() => setShowCourtDialog(true)}
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      Crear Primera Cancha
                    </Button>
                  </div>
                ) : (
                  courts.map((court) => (
                    <div
                      key={court.id}
                      className="flex items-center justify-between p-3 border rounded-lg"
                    >
                      <div>
                        <p className="font-medium">{court.name}</p>
                        <p className="text-sm text-gray-500">ID: {court.id}</p>
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDeleteCourt(court.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Dialog para programar partido */}
      <Dialog open={showScheduleDialog} onOpenChange={setShowScheduleDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Programar Partido</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {selectedMatch && (
              <div className="bg-gray-50 p-3 rounded-lg">
                <p className="font-medium">
                  {formatPairName(getPairById(selectedMatch.pairAId))} vs{" "}
                  {formatPairName(getPairById(selectedMatch.pairBId))}
                </p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="day">Fecha</Label>
                <Input
                  id="day"
                  type="date"
                  value={scheduleForm.day}
                  onChange={(e) =>
                    setScheduleForm({ ...scheduleForm, day: e.target.value })
                  }
                />
              </div>
              <div>
                <Label htmlFor="startTime">Hora</Label>
                <Select
                  value={scheduleForm.startTime}
                  onValueChange={(value) =>
                    setScheduleForm({ ...scheduleForm, startTime: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar hora" />
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
            </div>

            <div>
              <Label htmlFor="court">Cancha</Label>
              <Select
                value={scheduleForm.courtId}
                onValueChange={(value) =>
                  setScheduleForm({ ...scheduleForm, courtId: value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar cancha" />
                </SelectTrigger>
                <SelectContent>
                  {courts.map((court) => (
                    <SelectItem key={court.id} value={court.id}>
                      {court.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex justify-end gap-3">
              <Button
                variant="outline"
                onClick={() => setShowScheduleDialog(false)}
              >
                Cancelar
              </Button>
              <Button onClick={handleSubmitSchedule}>Programar</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog para crear cancha */}
      <Dialog open={showCourtDialog} onOpenChange={setShowCourtDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nueva Cancha</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="courtName">Nombre de la Cancha</Label>
              <Input
                id="courtName"
                placeholder="ej. Cancha 1, Cancha Central"
                value={courtForm.name}
                onChange={(e) =>
                  setCourtsForm({ ...courtForm, name: e.target.value })
                }
              />
            </div>

            <div className="flex justify-end gap-3">
              <Button
                variant="outline"
                onClick={() => setShowCourtDialog(false)}
              >
                Cancelar
              </Button>
              <Button onClick={handleCreateCourt}>Crear Cancha</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
