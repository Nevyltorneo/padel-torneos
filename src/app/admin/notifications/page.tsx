"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  Bell,
  Send,
  TestTube,
  Users,
  Calendar,
  Trophy,
  Clock,
  CheckCircle,
  AlertCircle,
  Info,
} from "lucide-react";
import { useNotifications } from "@/hooks/useNotifications";
import { useCurrentTournament } from "@/stores/tournament-store";
import { NotificationType } from "@/types";
import { toast } from "sonner";

export default function NotificationsPage() {
  const currentTournament = useCurrentTournament();
  const {
    notifications,
    unreadCount,
    preferences,
    pushSupported,
    pushPermission,
    createNewNotification,
    requestPushPermission,
  } = useNotifications(currentTournament?.id);

  const [testNotification, setTestNotification] = useState({
    type: "general" as NotificationType,
    title: "",
    message: "",
  });

  // Tipos de notificación con sus configuraciones
  const notificationTypes = [
    {
      value: "match_scheduled",
      label: "Partido Programado",
      icon: Calendar,
      color: "bg-blue-100 text-blue-800",
      description: "Cuando se programa un nuevo partido",
    },
    {
      value: "match_reminder",
      label: "Recordatorio de Partido",
      icon: Clock,
      color: "bg-orange-100 text-orange-800",
      description: "15 minutos antes del partido",
    },
    {
      value: "match_rescheduled",
      label: "Cambio de Horario",
      icon: AlertCircle,
      color: "bg-yellow-100 text-yellow-800",
      description: "Cuando se reprograma un partido",
    },
    {
      value: "match_result",
      label: "Resultado de Partido",
      icon: Trophy,
      color: "bg-green-100 text-green-800",
      description: "Cuando se guarda un resultado",
    },
    {
      value: "tournament_update",
      label: "Actualización del Torneo",
      icon: Info,
      color: "bg-blue-100 text-blue-800",
      description: "Cambios generales del torneo",
    },
    {
      value: "bracket_advance",
      label: "Avance de Fase",
      icon: Trophy,
      color: "bg-green-100 text-green-800",
      description: "Cuando una pareja avanza de fase",
    },
    {
      value: "tournament_finished",
      label: "Torneo Terminado",
      icon: Trophy,
      color: "bg-purple-100 text-purple-800",
      description: "Cuando el torneo ha finalizado",
    },
    {
      value: "general",
      label: "General",
      icon: Bell,
      color: "bg-gray-100 text-gray-800",
      description: "Notificación general",
    },
  ];

  const handleCreateTestNotification = async () => {
    if (!testNotification.title || !testNotification.message) {
      toast.error("Por favor completa el título y mensaje");
      return;
    }

    const notification = await createNewNotification(
      testNotification.type,
      testNotification.title,
      testNotification.message,
      { test: true, createdAt: new Date().toISOString() }
    );

    if (notification) {
      toast.success("¡Notificación de prueba creada!");
      setTestNotification({
        type: "general",
        title: "",
        message: "",
      });
    }
  };

  const handleQuickTest = async (type: NotificationType) => {
    const typeConfig = notificationTypes.find((t) => t.value === type);
    if (!typeConfig) return;

    await createNewNotification(
      type,
      `Prueba: ${typeConfig.label}`,
      `Esta es una notificación de prueba para ${typeConfig.label.toLowerCase()}`,
      { test: true, quickTest: true }
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Centro de Notificaciones
          </h1>
          <p className="text-muted-foreground">
            Gestiona las notificaciones del torneo y prueba el sistema
          </p>
        </div>
        <Badge variant="outline" className="flex items-center gap-2">
          <Bell className="h-4 w-4" />
          {unreadCount} sin leer
        </Badge>
      </div>

      {/* Estado del sistema */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-full">
                <Bell className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm font-medium">Total Notificaciones</p>
                <p className="text-2xl font-bold">{notifications.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-100 rounded-full">
                <AlertCircle className="h-5 w-5 text-orange-600" />
              </div>
              <div>
                <p className="text-sm font-medium">Sin Leer</p>
                <p className="text-2xl font-bold">{unreadCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div
                className={`p-2 rounded-full ${
                  pushPermission === "granted" ? "bg-green-100" : "bg-red-100"
                }`}
              >
                {pushPermission === "granted" ? (
                  <CheckCircle className="h-5 w-5 text-green-600" />
                ) : (
                  <AlertCircle className="h-5 w-5 text-red-600" />
                )}
              </div>
              <div>
                <p className="text-sm font-medium">Push Notifications</p>
                <p className="text-sm font-semibold">
                  {pushPermission === "granted"
                    ? "Habilitadas"
                    : "Deshabilitadas"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Habilitar notificaciones push */}
      {pushSupported && pushPermission !== "granted" && (
        <Card className="border-orange-200 bg-orange-50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <AlertCircle className="h-5 w-5 text-orange-600" />
                <div>
                  <p className="font-medium">
                    Notificaciones Push Deshabilitadas
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Habilita las notificaciones para recibir alertas en tiempo
                    real
                  </p>
                </div>
              </div>
              <Button onClick={requestPushPermission}>Habilitar</Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Crear notificación de prueba */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TestTube className="h-5 w-5" />
              Crear Notificación de Prueba
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="type">Tipo de Notificación</Label>
              <Select
                value={testNotification.type}
                onValueChange={(value: NotificationType) =>
                  setTestNotification((prev) => ({ ...prev, type: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona un tipo" />
                </SelectTrigger>
                <SelectContent>
                  {notificationTypes.map((type) => {
                    const IconComponent = type.icon;
                    return (
                      <SelectItem key={type.value} value={type.value}>
                        <div className="flex items-center gap-2">
                          <IconComponent className="h-4 w-4" />
                          {type.label}
                        </div>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="title">Título</Label>
              <Input
                id="title"
                placeholder="Título de la notificación"
                value={testNotification.title}
                onChange={(e) =>
                  setTestNotification((prev) => ({
                    ...prev,
                    title: e.target.value,
                  }))
                }
              />
            </div>

            <div>
              <Label htmlFor="message">Mensaje</Label>
              <Textarea
                id="message"
                placeholder="Contenido de la notificación"
                value={testNotification.message}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                  setTestNotification((prev) => ({
                    ...prev,
                    message: e.target.value,
                  }))
                }
                rows={3}
              />
            </div>

            <Button onClick={handleCreateTestNotification} className="w-full">
              <Send className="h-4 w-4 mr-2" />
              Crear Notificación
            </Button>
          </CardContent>
        </Card>

        {/* Tipos de notificaciones */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Tipos de Notificaciones
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {notificationTypes.map((type) => {
                const IconComponent = type.icon;
                return (
                  <div
                    key={type.value}
                    className="flex items-center justify-between p-3 border rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-full ${type.color}`}>
                        <IconComponent className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="font-medium">{type.label}</p>
                        <p className="text-sm text-muted-foreground">
                          {type.description}
                        </p>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        handleQuickTest(type.value as NotificationType)
                      }
                    >
                      Probar
                    </Button>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Preferencias actuales */}
      {preferences && (
        <Card>
          <CardHeader>
            <CardTitle>Preferencias Actuales</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div
                  className={`p-2 rounded-full mx-auto w-fit ${
                    preferences.matchReminders ? "bg-green-100" : "bg-red-100"
                  }`}
                >
                  {preferences.matchReminders ? (
                    <CheckCircle className="h-4 w-4 text-green-600" />
                  ) : (
                    <AlertCircle className="h-4 w-4 text-red-600" />
                  )}
                </div>
                <p className="text-sm font-medium mt-2">Recordatorios</p>
                <p className="text-xs text-muted-foreground">
                  {preferences.matchReminders ? "Habilitado" : "Deshabilitado"}
                </p>
              </div>

              <div className="text-center">
                <div
                  className={`p-2 rounded-full mx-auto w-fit ${
                    preferences.scheduleChanges ? "bg-green-100" : "bg-red-100"
                  }`}
                >
                  {preferences.scheduleChanges ? (
                    <CheckCircle className="h-4 w-4 text-green-600" />
                  ) : (
                    <AlertCircle className="h-4 w-4 text-red-600" />
                  )}
                </div>
                <p className="text-sm font-medium mt-2">Cambios</p>
                <p className="text-xs text-muted-foreground">
                  {preferences.scheduleChanges ? "Habilitado" : "Deshabilitado"}
                </p>
              </div>

              <div className="text-center">
                <div
                  className={`p-2 rounded-full mx-auto w-fit ${
                    preferences.results ? "bg-green-100" : "bg-red-100"
                  }`}
                >
                  {preferences.results ? (
                    <CheckCircle className="h-4 w-4 text-green-600" />
                  ) : (
                    <AlertCircle className="h-4 w-4 text-red-600" />
                  )}
                </div>
                <p className="text-sm font-medium mt-2">Resultados</p>
                <p className="text-xs text-muted-foreground">
                  {preferences.results ? "Habilitado" : "Deshabilitado"}
                </p>
              </div>

              <div className="text-center">
                <div
                  className={`p-2 rounded-full mx-auto w-fit ${
                    preferences.tournamentUpdates
                      ? "bg-green-100"
                      : "bg-red-100"
                  }`}
                >
                  {preferences.tournamentUpdates ? (
                    <CheckCircle className="h-4 w-4 text-green-600" />
                  ) : (
                    <AlertCircle className="h-4 w-4 text-red-600" />
                  )}
                </div>
                <p className="text-sm font-medium mt-2">Actualizaciones</p>
                <p className="text-xs text-muted-foreground">
                  {preferences.tournamentUpdates
                    ? "Habilitado"
                    : "Deshabilitado"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
