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
  Filter,
  Send,
  Eraser,
  X,
  Save,
} from "lucide-react";
import { toast } from "sonner";
import { format, parseISO, addDays, isSameDay } from "date-fns";
import { es } from "date-fns/locale";

import { useCurrentTournament } from "@/stores/tournament-store";
import { Match, Pair, Category, Court, DaySchedule } from "@/types";
import { createClient } from "@/lib/supabase";
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
  const supabase = createClient();
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


  // 🆕 NUEVOS ESTADOS PARA CONTROLES GRANULARES
  const [selectedCategoryFilter, setSelectedCategoryFilter] =
    useState<string>("all");
  const [showCleanDialog, setShowCleanDialog] = useState(false);
  const [showNotifyDialog, setShowNotifyDialog] = useState(false);
  const [cleanForm, setCleanForm] = useState({
    targetDate: "",
    categoryId: "all",
  });
  const [notifyForm, setNotifyForm] = useState({
    targetDate: "",
    categoryId: "all",
  });

  // 🆕 ESTADO PARA CAMBIOS PENDIENTES
  const [pendingChanges, setPendingChanges] = useState<{
    [matchId: string]: {
      startTime?: string;
      courtId?: string;
      day?: string;
    };
  }>({});

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

  // 🆕 Función para generar slots desde una hora específica
  const generateTimeSlotsFromStart = (startTime: string): string[] => {
    const slots = [];
    const [startHour, startMinute] = startTime.split(":").map(Number);
    const slotDuration = 90; // 90 minutos por partido

    let currentTime = startHour * 60 + startMinute; // Convertir a minutos
    const endTime = 22 * 60; // Hasta las 22:00

    while (currentTime < endTime) {
      const hour = Math.floor(currentTime / 60);
      const minute = currentTime % 60;
      const timeString = `${hour.toString().padStart(2, "0")}:${minute
        .toString()
        .padStart(2, "0")}`;
      slots.push(timeString);
      currentTime += slotDuration;
    }

    return slots;
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

  // Función para distribuir automáticamente TODOS los partidos (grupos + eliminatorias)
  const handleAutoScheduleAllMatches = async () => {
    console.log("🚀 INICIANDO PROGRAMACIÓN AUTOMÁTICA...");
    console.log("📊 Estado inicial:", {
      currentTournament: !!currentTournament,
      tournamentDays: tournamentDays.length,
      courts: courts.length,
      allMatches: allMatches.length,
    });

    if (
      !currentTournament ||
      tournamentDays.length === 0 ||
      courts.length === 0
    ) {
      console.log("❌ VALIDACIÓN FALLIDA - Configuración incompleta");
      toast.error("Necesitas configurar días y canchas primero");
      return;
    }

    try {
      toast.loading("Distribuyendo partidos automáticamente...", {
        id: "auto-schedule",
      });

      // Obtener TODOS los partidos pendientes (grupos + eliminatorias)
      const allMatchesPending = allMatches.filter(
        (match) => !match.day || !match.startTime
      );

      // Separar por tipo para mejor análisis
      const groupMatches = allMatchesPending.filter(
        (match) => match.stage === "group"
      );
      const eliminationMatches = allMatchesPending.filter(
        (match) => match.stage !== "group"
      );

      console.log("🔍 DEBUG: Análisis de TODOS los partidos:");
      console.log(`   📊 Total de partidos: ${allMatches.length}`);
      console.log(`   ⏳ Partidos sin programar: ${allMatchesPending.length}`);
      console.log(`     🎾 Grupos: ${groupMatches.length}`);
      console.log(`     🏆 Eliminatorias: ${eliminationMatches.length}`);

      if (allMatchesPending.length === 0) {
        console.log("⚠️ No hay partidos pendientes por programar");
        toast.info("No hay partidos pendientes por programar", {
          id: "auto-schedule",
        });
        return;
      }

      // Usar todos los partidos pendientes
      const pendingMatches = allMatchesPending;

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

      const groupCount = groupMatches.length;
      const eliminationCount = eliminationMatches.length;

      toast.success(
        `¡${totalScheduledCount} partidos programados automáticamente! (${groupCount} grupos + ${eliminationCount} eliminatorias)`,
        {
          id: "auto-schedule",
        }
      );
    } catch (error) {
      console.error("Error in auto scheduling:", error);
      toast.error("Error al distribuir partidos", { id: "auto-schedule" });
    }
  };

  const handleCleanSchedulesByDay = async () => {
    if (!cleanForm.targetDate) {
      toast.error("Por favor selecciona una fecha");
      return;
    }

    try {
      toast.loading("Limpiando horarios...", { id: "clean-schedules" });

      // Filtrar partidos del día y categoría específicos
      let matchesToClean = allMatches.filter((match) => {
        const matchDate = match.day;
        const dateMatches = matchDate === cleanForm.targetDate;
        const categoryMatches =
          cleanForm.categoryId === "all" ||
          match.categoryId === cleanForm.categoryId;
        return (
          dateMatches &&
          categoryMatches &&
          (match.day || match.startTime || match.courtId)
        );
      });

      console.log(
        `🧹 Limpiando ${matchesToClean.length} partidos para ${cleanForm.targetDate}`
      );

      // Limpiar cada partido
      for (const match of matchesToClean) {
        await updateMatchSchedule(match.id, "", "", "");
      }

      await loadData();

      const categoryName =
        cleanForm.categoryId === "all"
          ? "todas las categorías"
          : allCategories.find((c) => c.id === cleanForm.categoryId)?.name ||
            "categoría";

      toast.success(
        `¡Horarios limpiados! ${
          matchesToClean.length
        } partidos de ${categoryName} del ${format(
          parseISO(cleanForm.targetDate),
          "dd/MM/yyyy"
        )}`,
        { id: "clean-schedules" }
      );

      setShowCleanDialog(false);
    } catch (error) {
      console.error("Error limpiando horarios:", error);
      toast.error("Error al limpiar horarios", { id: "clean-schedules" });
    }
  };

  // 📧 NUEVA FUNCIÓN: Enviar horarios por día y categoría
  const handleNotifyPlayersByDay = async () => {
    if (!notifyForm.categoryId) {
      toast.error("Por favor selecciona una categoría");
      return;
    }

    if (!notifyForm.targetDate) {
      toast.error("Por favor selecciona un día");
      return;
    }

    try {
      toast.loading("Generando enlace para todos los partidos...", {
        id: "notify-players",
      });

      const baseUrl = window.location.origin;
      const links: string[] = [];

      if (notifyForm.categoryId === "all" && notifyForm.targetDate !== "all") {
        // CASO ESPECIAL: Todas las categorías de un día específico
        console.log("🔍 BUSCANDO PARTIDOS PARA EL DÍA:", notifyForm.targetDate);
        console.log("📊 Total de partidos en BD:", allMatches.length);

        // DIAGNÓSTICO COMPLETO DE TODOS LOS PARTIDOS
        console.log("📋 DIAGNÓSTICO COMPLETO:");
        allMatches.forEach((match, index) => {
          console.log(`Partido ${index + 1}:`);
          console.log(`  - ID: ${match.id}`);
          console.log(`  - Día en BD: ${match.day}`);
          console.log(`  - Día solicitado: ${notifyForm.targetDate}`);
          console.log(`  - Coincide: ${match.day === notifyForm.targetDate}`);
          console.log(`  - Horario: ${match.startTime}`);
          console.log(`  - Cancha: ${match.courtId}`);
          console.log(`  - Categoría: ${getCategoryName(match.categoryId)}`);
          console.log("---");
        });

        const dayMatches = allMatches.filter((match) => {
          const isCorrectDay = match.day === notifyForm.targetDate;
          const hasSchedule = match.day && match.startTime && match.courtId;

          if (isCorrectDay && hasSchedule) {
            console.log(
              `✅ PARTIDO VÁLIDO: ${match.id} - ${getCategoryName(
                match.categoryId
              )}`
            );
          } else {
            console.log(
              `❌ PARTIDO FILTRADO: ${match.id} - Día: ${match.day}, Horario: ${match.startTime}, Cancha: ${match.courtId}`
            );
          }

          return isCorrectDay && hasSchedule;
        });

        console.log("✅ PARTIDOS ENCONTRADOS PARA EL DÍA:", dayMatches.length);

        if (dayMatches.length === 0) {
          toast.warning("No hay partidos programados para este día", {
            id: "notify-players",
          });
          return;
        }

        // Crear enlace especial para ver todos los juegos del día
        const link = `${baseUrl}/horarios/dia/${notifyForm.targetDate}`;
        links.push(link);
      } else if (
        notifyForm.categoryId !== "all" &&
        notifyForm.targetDate !== "all"
      ) {
        // CASO ESPECÍFICO: Categoría específica de un día específico
        console.log("🔍 BUSCANDO PARTIDOS PARA CATEGORÍA Y DÍA:");
        console.log("📊 Categoría:", notifyForm.categoryId);
        console.log("📅 Día:", notifyForm.targetDate);
        console.log("📊 Total de partidos en BD:", allMatches.length);

        const categoryDayMatches = allMatches.filter((match) => {
          const isCorrectCategory = match.categoryId === notifyForm.categoryId;
          const isCorrectDay = match.day === notifyForm.targetDate;
          const hasSchedule = match.day && match.startTime && match.courtId;

          if (isCorrectCategory && isCorrectDay && hasSchedule) {
            console.log(
              `✅ PARTIDO VÁLIDO: ${match.id} - ${getCategoryName(
                match.categoryId
              )}`
            );
          } else {
            console.log(
              `❌ PARTIDO FILTRADO: ${match.id} - Categoría: ${match.categoryId}, Día: ${match.day}, Horario: ${match.startTime}, Cancha: ${match.courtId}`
            );
          }

          return isCorrectCategory && isCorrectDay && hasSchedule;
        });

        console.log(
          "✅ PARTIDOS ENCONTRADOS PARA CATEGORÍA Y DÍA:",
          categoryDayMatches.length
        );

        if (categoryDayMatches.length === 0) {
          toast.warning(
            "No hay partidos programados para esta categoría y día",
            {
              id: "notify-players",
            }
          );
          return;
        }

        // Crear enlace para la categoría específica del día usando slug
        const category = allCategories.find(
          (c) => c.id === notifyForm.categoryId
        );
        const categorySlug = category?.slug || notifyForm.categoryId;
        const link = `${baseUrl}/horarios/${categorySlug}`;
        links.push(link);
      } else if (
        notifyForm.categoryId === "all" &&
        notifyForm.targetDate === "all"
      ) {
        // Todas las categorías de todos los días
        for (const category of allCategories) {
          const categoryMatches = allMatches.filter((match) => {
            const categoryMatches = match.categoryId === category.id;
            const hasSchedule = match.day && match.startTime && match.courtId;
            return categoryMatches && hasSchedule;
          });

          if (categoryMatches.length > 0) {
            const categorySlug = category.slug || category.id;
            const link = `${baseUrl}/horarios/${categorySlug}`;
            links.push(link);
          }
        }
      } else {
        // Categoría específica (con o sin día específico)
        const categoryMatches = allMatches.filter((match) => {
          const categoryMatches = match.categoryId === notifyForm.categoryId;
          const dayMatches =
            notifyForm.targetDate === "all" ||
            match.day === notifyForm.targetDate;
          const hasSchedule = match.day && match.startTime && match.courtId;
          return categoryMatches && dayMatches && hasSchedule;
        });

        if (categoryMatches.length === 0) {
          toast.warning(
            "No hay partidos programados para esta categoría y día",
            {
              id: "notify-players",
            }
          );
          return;
        }

        const category = allCategories.find(
          (c) => c.id === notifyForm.categoryId
        );
        const categorySlug = category?.slug || notifyForm.categoryId;
        const link = `${baseUrl}/horarios/${categorySlug}`;
        links.push(link);
      }

      if (links.length === 0) {
        toast.warning("No hay partidos programados para generar enlaces", {
          id: "notify-players",
        });
        return;
      }

      // Copiar enlaces al portapapeles
      const linksText = links.join("\n");
      await navigator.clipboard.writeText(linksText);

      const categoryName =
        notifyForm.categoryId === "all"
          ? "todas las categorías"
          : allCategories.find((c) => c.id === notifyForm.categoryId)?.name ||
            "categoría";

      const dayName =
        notifyForm.targetDate === "all"
          ? "todos los días"
          : format(new Date(notifyForm.targetDate), "EEEE, dd 'de' MMMM", {
              locale: es,
            });

      toast.success(
        `¡Enlaces generados! ${links.length} enlace(s) copiado(s) al portapapeles para ${categoryName} del ${dayName}`,
        {
          id: "notify-players",
          duration: 5000,
        }
      );

      console.log("🔗 Enlaces generados:", links);

      setShowNotifyDialog(false);
    } catch (error) {
      console.error("Error generando enlace:", error);
      toast.error("Error al generar enlace", { id: "notify-players" });
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

  // 🆕 HANDLER PARA CAMBIO RÁPIDO DE CANCHA (Solo actualiza estado local)
  const handleQuickCourtChange = (matchId: string, newCourtId: string) => {
    console.log(
      `🏟️ Preparando cambio de cancha del partido ${matchId} a ${newCourtId}`
    );

    setPendingChanges((prev) => ({
      ...prev,
      [matchId]: {
        ...prev[matchId],
        courtId: newCourtId,
      },
    }));
  };

  // 🆕 HANDLER PARA CAMBIO RÁPIDO DE HORA (Solo actualiza estado local)
  const handleQuickTimeChange = (matchId: string, newTime: string) => {
    console.log(
      `🕐 Preparando cambio de hora del partido ${matchId} a ${newTime}`
    );

    setPendingChanges((prev) => ({
      ...prev,
      [matchId]: {
        ...prev[matchId],
        startTime: newTime,
      },
    }));
  };

  // 🆕 HANDLER PARA CAMBIO RÁPIDO DE DÍA (Solo actualiza estado local)
  const handleQuickDayChange = (matchId: string, newDay: string) => {
    console.log(
      `📅 Preparando cambio de día del partido ${matchId} a ${newDay}`
    );

    setPendingChanges((prev) => ({
      ...prev,
      [matchId]: {
        ...prev[matchId],
        day: newDay,
      },
    }));
  };

  // 🆕 FUNCIÓN PARA GUARDAR TODOS LOS CAMBIOS PENDIENTES
  const handleSavePendingChanges = async () => {
    try {
      const changedMatchIds = Object.keys(pendingChanges);
      if (changedMatchIds.length === 0) {
        toast.info("No hay cambios pendientes para guardar");
        return;
      }

      console.log(
        `💾 Guardando ${changedMatchIds.length} cambios pendientes...`
      );

      let savedCount = 0;
      for (const matchId of changedMatchIds) {
        const changes = pendingChanges[matchId];
        const match = allMatches.find((m) => m.id === matchId);
        if (!match) continue;

        // Usar valores actuales del match como fallback
        const finalStartTime =
          changes.startTime !== undefined
            ? changes.startTime
            : match.startTime || "";
        const finalCourtId =
          changes.courtId !== undefined ? changes.courtId : match.courtId || "";
        const finalDay =
          changes.day !== undefined ? changes.day : match.day || "";

        console.log(`  💾 Guardando partido ${matchId}:`, {
          dia: finalDay,
          hora: finalStartTime,
          cancha: finalCourtId,
        });

        await updateMatchSchedule(
          matchId,
          finalDay,
          finalStartTime,
          finalCourtId
        );
        savedCount++;
      }

      // Limpiar cambios pendientes
      setPendingChanges({});

      // Recargar datos
      await loadData();

      toast.success(`¡${savedCount} cambios guardados exitosamente!`, {
        id: "save-pending-changes",
      });
    } catch (error) {
      console.error("❌ Error saving pending changes:", error);
      toast.error("Error al guardar cambios", { id: "save-pending-changes" });
    }
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

    // 🎯 FILTRO MEJORADO: Por día y categoría
    const filteredMatches = allMatches.filter((match) => {
      // Si no tiene día asignado, no mostrar
      if (!match.day) return false;

      // Filtro por día
      const dayMatches = match.day === dateString;

      // Filtro por categoría
      const categoryMatches =
        selectedCategoryFilter === "all" ||
        match.categoryId === selectedCategoryFilter;

      return dayMatches && categoryMatches;
    });

    // 🐛 DEBUG TEMPORAL: Verificar fechas disponibles
    if (filteredMatches.length === 0) {
      const uniqueDays = [
        ...new Set(allMatches.map((m) => m.day).filter(Boolean)),
      ];
      console.log(`📋 Días con partidos en BD:`, uniqueDays);
      console.log(
        `📅 Buscando para: ${dateString}, categoría: ${selectedCategoryFilter}`
      );
    }

    return filteredMatches;
  };

  // 🎯 FUNCIÓN PARA OBTENER DÍAS DISPONIBLES
  const getAvailableDays = (): string[] => {
    // Obtener todos los días únicos de los partidos
    const uniqueDays = [
      ...new Set(
        allMatches
          .map((m) => m.day)
          .filter((day): day is string => Boolean(day))
      ),
    ];

    // Generar rango de días más amplio (90 días desde hoy)
    const today = new Date();
    const futureDays: string[] = [];

    for (let i = 0; i < 90; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      const dateString = date.toISOString().split("T")[0];
      futureDays.push(dateString);
    }

    // Combinar días de partidos con días futuros
    const allDays = [...new Set([...uniqueDays, ...futureDays])];

    // Ordenar cronológicamente
    const sortedDays = allDays.sort((a, b) => {
      return new Date(a).getTime() - new Date(b).getTime();
    });

    console.log("📅 Días disponibles:", sortedDays);
    return sortedDays;
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

          {/* 🆕 BOTÓN GUARDAR CAMBIOS */}
          {Object.keys(pendingChanges).length > 0 && (
            <div className="mt-4">
              <Card className="border-orange-200 bg-orange-50">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-3 h-3 bg-orange-400 rounded-full animate-pulse"></div>
                      <span className="text-sm font-medium text-orange-800">
                        Tienes {Object.keys(pendingChanges).length} cambio(s)
                        sin guardar
                      </span>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        onClick={() => setPendingChanges({})}
                        variant="outline"
                        size="sm"
                        className="text-gray-600 hover:text-gray-800"
                      >
                        Descartar
                      </Button>
                      <Button
                        onClick={handleSavePendingChanges}
                        className="bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white shadow-lg"
                        size="sm"
                      >
                        <Save className="h-4 w-4 mr-2" />
                        Guardar Cambios
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* 🎨 CONTROLES MODERNOS Y ELEGANTES */}
          <div className="mt-6 space-y-4">
            {/* Programación Automática */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <Button
                onClick={handleAutoScheduleAllMatches}
                className="flex items-center justify-center gap-2 h-12 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg shadow-lg transition-all duration-200 hover:shadow-xl"
              >
                <Clock className="h-5 w-5" />
                <span>Programar Todos los Partidos</span>
              </Button>
              <Button
                onClick={() => setShowNotifyDialog(true)}
                className="flex items-center justify-center gap-2 h-12 bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg shadow-lg transition-all duration-200 hover:shadow-xl"
              >
                <Send className="h-5 w-5" />
                <span>Generar Enlaces</span>
              </Button>
            </div>

            {/* Control Granular */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <Button
                onClick={() => setShowCleanDialog(true)}
                variant="outline"
                className="flex items-center justify-center gap-2 h-12 border-2 border-red-200 hover:border-red-300 hover:bg-red-50 text-red-700 font-medium rounded-lg transition-all duration-200"
              >
                <Eraser className="h-5 w-5" />
                <span>Limpiar por Día</span>
              </Button>
              <div className="flex items-center gap-2">
                <Filter className="h-5 w-5 text-gray-500" />
                <Select
                  value={selectedCategoryFilter}
                  onValueChange={setSelectedCategoryFilter}
                >
                  <SelectTrigger className="h-12 rounded-lg border-2 font-medium">
                    <SelectValue placeholder="Filtrar categoría" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">📊 Todas las categorías</SelectItem>
                    {allCategories.map((category) => (
                      <SelectItem key={category.id} value={category.id}>
                        🏆 {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
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
                            <div className="flex items-center gap-4 mt-2 text-sm text-gray-600 flex-wrap">
                              {/* 🆕 INPUT EDITABLE DE HORA */}
                              <div className="flex items-center gap-2">
                                <Clock className="h-4 w-4" />
                                <input
                                  type="time"
                                  value={
                                    pendingChanges[match.id]?.startTime !==
                                    undefined
                                      ? pendingChanges[match.id].startTime
                                      : match.startTime || ""
                                  }
                                  onChange={(e) =>
                                    handleQuickTimeChange(
                                      match.id,
                                      e.target.value
                                    )
                                  }
                                  className={`text-sm border rounded px-2 py-1 bg-white hover:border-blue-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-colors ${
                                    pendingChanges[match.id]?.startTime !==
                                    undefined
                                      ? "border-orange-400 bg-orange-50"
                                      : "border-gray-300"
                                  }`}
                                  style={{ minWidth: "100px" }}
                                />
                              </div>

                              {/* 🆕 INPUT EDITABLE DE CANCHA */}
                              <div className="flex items-center gap-2">
                                <MapPin className="h-4 w-4" />
                                <select
                                  value={
                                    pendingChanges[match.id]?.courtId !==
                                    undefined
                                      ? pendingChanges[match.id].courtId
                                      : match.courtId || ""
                                  }
                                  onChange={(e) =>
                                    handleQuickCourtChange(
                                      match.id,
                                      e.target.value
                                    )
                                  }
                                  className={`text-sm border rounded px-2 py-1 bg-white hover:border-blue-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-colors ${
                                    pendingChanges[match.id]?.courtId !==
                                    undefined
                                      ? "border-orange-400 bg-orange-50"
                                      : "border-gray-300"
                                  }`}
                                  style={{ minWidth: "120px" }}
                                >
                                  <option value="">Sin cancha</option>
                                  {courts.map((courtOption) => (
                                    <option
                                      key={courtOption.id}
                                      value={courtOption.id}
                                    >
                                      {courtOption.name}
                                    </option>
                                  ))}
                                </select>
                              </div>

                              {/* 🆕 INPUT EDITABLE DE DÍA */}
                              <div className="flex items-center gap-2">
                                <Calendar className="h-4 w-4" />
                                <input
                                  type="date"
                                  value={
                                    pendingChanges[match.id]?.day !== undefined
                                      ? pendingChanges[match.id].day
                                      : match.day || ""
                                  }
                                  onChange={(e) =>
                                    handleQuickDayChange(
                                      match.id,
                                      e.target.value
                                    )
                                  }
                                  className={`text-sm border rounded px-2 py-1 bg-white hover:border-blue-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-colors ${
                                    pendingChanges[match.id]?.day !== undefined
                                      ? "border-orange-400 bg-orange-50"
                                      : "border-gray-300"
                                  }`}
                                  style={{ minWidth: "140px" }}
                                />
                              </div>
                            </div>
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


      {/* 🧹 Diálogo para limpiar horarios por día */}
      <Dialog open={showCleanDialog} onOpenChange={setShowCleanDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-700">
              <Eraser className="h-5 w-5" />
              🧹 Limpiar Horarios por Día
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="cleanDate">📅 Fecha a limpiar</Label>
              <Input
                id="cleanDate"
                type="date"
                value={cleanForm.targetDate}
                onChange={(e) =>
                  setCleanForm({
                    ...cleanForm,
                    targetDate: e.target.value,
                  })
                }
                min={new Date().toISOString().split("T")[0]}
              />
              <p className="text-xs text-gray-500 mt-1">
                Se limpiarán los horarios de todos los partidos de esta fecha
              </p>
            </div>

            <div>
              <Label htmlFor="cleanCategory">🏆 Categoría</Label>
              <Select
                value={cleanForm.categoryId}
                onValueChange={(value) =>
                  setCleanForm({
                    ...cleanForm,
                    categoryId: value,
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar categoría" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">📊 Todas las categorías</SelectItem>
                  {allCategories.map((category) => (
                    <SelectItem key={category.id} value={category.id}>
                      🏆 {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex gap-2 pt-4">
            <Button
              variant="outline"
              onClick={() => setShowCleanDialog(false)}
              className="flex-1"
            >
              <X className="h-4 w-4 mr-2" />
              Cancelar
            </Button>
            <Button
              onClick={handleCleanSchedulesByDay}
              className="flex-1 bg-red-600 hover:bg-red-700"
            >
              <Eraser className="h-4 w-4 mr-2" />
              Limpiar Horarios
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* 📧 Diálogo para enviar horarios */}
      <Dialog open={showNotifyDialog} onOpenChange={setShowNotifyDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-green-700">
              <Send className="h-5 w-5" />
              🔗 Generar Enlaces de Horarios
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="notifyCategory">🏆 Categoría</Label>
              <Select
                value={notifyForm.categoryId}
                onValueChange={(value) =>
                  setNotifyForm({
                    ...notifyForm,
                    categoryId: value,
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar categoría" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">📊 Todas las categorías</SelectItem>
                  {allCategories.map((category) => (
                    <SelectItem key={category.id} value={category.id}>
                      🏆 {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="notifyDate">📅 Día</Label>
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <input
                    type="date"
                    id="notifyDate"
                    value={
                      notifyForm.targetDate === "all"
                        ? ""
                        : notifyForm.targetDate
                    }
                    onChange={(e) =>
                      setNotifyForm({
                        ...notifyForm,
                        targetDate: e.target.value || "all",
                      })
                    }
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setNotifyForm({
                        ...notifyForm,
                        targetDate: "all",
                      })
                    }
                  >
                    Todos los días
                  </Button>
                </div>
                {notifyForm.targetDate !== "all" && notifyForm.targetDate && (
                  <p className="text-sm text-muted-foreground">
                    📅{" "}
                    {format(
                      new Date(notifyForm.targetDate + "T00:00:00"),
                      "EEEE, dd 'de' MMMM 'de' yyyy",
                      { locale: es }
                    )}
                  </p>
                )}
              </div>
            </div>
          </div>

          <div className="flex gap-2 pt-4">
            <Button
              variant="outline"
              onClick={() => setShowNotifyDialog(false)}
              className="flex-1"
            >
              <X className="h-4 w-4 mr-2" />
              Cancelar
            </Button>
            <Button
              onClick={handleNotifyPlayersByDay}
              className="flex-1 bg-green-600 hover:bg-green-700"
            >
              <Send className="h-4 w-4 mr-2" />
              Generar Enlaces
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
