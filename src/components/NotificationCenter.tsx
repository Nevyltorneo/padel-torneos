"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Bell,
  BellRing,
  Check,
  CheckCheck,
  Settings,
  Trash2,
  Calendar,
  Trophy,
  Clock,
  Users,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { useNotifications } from "@/hooks/useNotifications";
import { Notification, NotificationType } from "@/types";

interface NotificationCenterProps {
  tournamentId?: string;
  className?: string;
}

export function NotificationCenter({
  tournamentId,
  className,
}: NotificationCenterProps) {
  const {
    notifications,
    unreadCount,
    preferences,
    isLoading,
    pushSupported,
    pushPermission,
    requestPushPermission,
    markAsRead,
    markAllAsRead,
    deleteNotif,
    updatePreferences,
  } = useNotifications(tournamentId);

  const [showSettings, setShowSettings] = useState(false);

  // Iconos por tipo de notificación
  const getNotificationIcon = (type: NotificationType) => {
    switch (type) {
      case "match_scheduled":
      case "match_rescheduled":
        return <Calendar className="h-4 w-4" />;
      case "match_reminder":
        return <Clock className="h-4 w-4" />;
      case "match_result":
      case "bracket_advance":
        return <Trophy className="h-4 w-4" />;
      case "tournament_update":
      case "tournament_finished":
        return <Users className="h-4 w-4" />;
      default:
        return <Bell className="h-4 w-4" />;
    }
  };

  // Color por tipo de notificación
  const getNotificationColor = (type: NotificationType) => {
    switch (type) {
      case "match_scheduled":
        return "text-blue-600 bg-blue-50";
      case "match_reminder":
        return "text-orange-600 bg-orange-50";
      case "match_rescheduled":
        return "text-yellow-600 bg-yellow-50";
      case "match_result":
      case "bracket_advance":
        return "text-green-600 bg-green-50";
      case "tournament_finished":
        return "text-purple-600 bg-purple-50";
      default:
        return "text-gray-600 bg-gray-50";
    }
  };

  const handleNotificationClick = async (notification: Notification) => {
    if (!notification.isRead) {
      await markAsRead(notification.id);
    }
  };

  return (
    <div className={className}>
      {/* Botón de notificaciones */}
      <Dialog>
        <DialogTrigger asChild>
          <Button variant="ghost" size="icon" className="relative">
            {unreadCount > 0 ? (
              <BellRing className="h-5 w-5" />
            ) : (
              <Bell className="h-5 w-5" />
            )}
            {unreadCount > 0 && (
              <Badge
                variant="destructive"
                className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs"
              >
                {unreadCount > 99 ? "99+" : unreadCount}
              </Badge>
            )}
          </Button>
        </DialogTrigger>

        <DialogContent className="max-w-md max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader className="flex flex-row items-center justify-between space-y-0">
            <DialogTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Notificaciones
              {unreadCount > 0 && (
                <Badge variant="secondary">{unreadCount}</Badge>
              )}
            </DialogTitle>

            <div className="flex items-center gap-2">
              {/* Botón marcar todas como leídas */}
              {unreadCount > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={markAllAsRead}
                  className="h-8 px-2"
                >
                  <CheckCheck className="h-4 w-4" />
                </Button>
              )}

              {/* Menú de configuración */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-8 px-2">
                    <Settings className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuItem onClick={() => setShowSettings(true)}>
                    <Settings className="mr-2 h-4 w-4" />
                    Configurar notificaciones
                  </DropdownMenuItem>
                  {pushSupported && pushPermission !== "granted" && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={requestPushPermission}>
                        <BellRing className="mr-2 h-4 w-4" />
                        Habilitar notificaciones push
                      </DropdownMenuItem>
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </DialogHeader>

          {/* Lista de notificaciones */}
          <div className="flex-1 overflow-y-auto space-y-2 pr-2">
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
              </div>
            ) : notifications.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Bell className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No tienes notificaciones</p>
              </div>
            ) : (
              notifications.map((notification) => (
                <Card
                  key={notification.id}
                  className={cn(
                    "cursor-pointer transition-colors hover:bg-muted/50",
                    !notification.isRead &&
                      "border-l-4 border-l-blue-500 bg-blue-50/30"
                  )}
                  onClick={() => handleNotificationClick(notification)}
                >
                  <CardContent className="p-3">
                    <div className="flex items-start gap-3">
                      {/* Icono */}
                      <div
                        className={cn(
                          "rounded-full p-2 flex-shrink-0",
                          getNotificationColor(notification.type)
                        )}
                      >
                        {getNotificationIcon(notification.type)}
                      </div>

                      {/* Contenido */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1">
                            <h4
                              className={cn(
                                "text-sm font-medium",
                                !notification.isRead && "font-semibold"
                              )}
                            >
                              {notification.title}
                            </h4>
                            <p className="text-sm text-muted-foreground mt-1">
                              {notification.message}
                            </p>
                            <p className="text-xs text-muted-foreground mt-2">
                              {formatDistanceToNow(
                                new Date(notification.createdAt),
                                {
                                  addSuffix: true,
                                  locale: es,
                                }
                              )}
                            </p>
                          </div>

                          {/* Acciones */}
                          <div className="flex items-center gap-1">
                            {!notification.isRead && (
                              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                            )}
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100"
                              onClick={(e) => {
                                e.stopPropagation();
                                deleteNotif(notification.id);
                              }}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog de configuración */}
      <Dialog open={showSettings} onOpenChange={setShowSettings}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Configuración de Notificaciones</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Notificaciones Push */}
            {pushSupported && (
              <div className="space-y-2">
                <Label className="text-sm font-medium">
                  Notificaciones Push
                </Label>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">
                    {pushPermission === "granted"
                      ? "Habilitadas"
                      : "Deshabilitadas"}
                  </span>
                  {pushPermission !== "granted" && (
                    <Button size="sm" onClick={requestPushPermission}>
                      Habilitar
                    </Button>
                  )}
                </div>
              </div>
            )}

            {/* Preferencias por tipo */}
            {preferences && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label htmlFor="match-reminders">
                    Recordatorios de partidos
                  </Label>
                  <Switch
                    id="match-reminders"
                    checked={preferences.matchReminders}
                    onCheckedChange={(checked) =>
                      updatePreferences({ matchReminders: checked })
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <Label htmlFor="schedule-changes">Cambios de horario</Label>
                  <Switch
                    id="schedule-changes"
                    checked={preferences.scheduleChanges}
                    onCheckedChange={(checked) =>
                      updatePreferences({ scheduleChanges: checked })
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <Label htmlFor="results">Resultados de partidos</Label>
                  <Switch
                    id="results"
                    checked={preferences.results}
                    onCheckedChange={(checked) =>
                      updatePreferences({ results: checked })
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <Label htmlFor="tournament-updates">
                    Actualizaciones del torneo
                  </Label>
                  <Switch
                    id="tournament-updates"
                    checked={preferences.tournamentUpdates}
                    onCheckedChange={(checked) =>
                      updatePreferences({ tournamentUpdates: checked })
                    }
                  />
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
