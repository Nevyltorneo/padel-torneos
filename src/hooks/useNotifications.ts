"use client";

import { useState, useEffect, useCallback } from "react";
import { useUser } from "@supabase/auth-helpers-react";
import type {
  Notification,
  NotificationPreferences,
  NotificationType,
} from "@/types";
import {
  getUserNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  deleteNotification,
  getNotificationPreferences,
  upsertNotificationPreferences,
  createNotification,
} from "@/lib/supabase-queries";
import { createClient } from "@/lib/supabase";
import { toast } from "sonner";

export function useNotifications(tournamentId?: string) {
  const user = useUser();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [preferences, setPreferences] =
    useState<NotificationPreferences | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [pushSupported, setPushSupported] = useState(false);
  const [pushPermission, setPushPermission] =
    useState<NotificationPermission>("default");

  // Verificar soporte para notificaciones push
  useEffect(() => {
    if (typeof window !== "undefined" && "Notification" in window) {
      setPushSupported(true);
      setPushPermission(Notification.permission);
    }
  }, []);

  // Cargar notificaciones y preferencias
  const loadNotifications = useCallback(async () => {
    if (!user?.id) return;

    try {
      setIsLoading(true);

      // Cargar notificaciones
      const userNotifications = await getUserNotifications(
        user.id,
        tournamentId
      );
      setNotifications(userNotifications);

      // Contar no leídas
      const unread = userNotifications.filter((n) => !n.isRead).length;
      setUnreadCount(unread);

      // Cargar preferencias si hay tournamentId
      if (tournamentId) {
        const userPreferences = await getNotificationPreferences(
          user.id,
          tournamentId
        );
        setPreferences(userPreferences);
      }
    } catch (error) {
      console.error("Error loading notifications:", error);
      toast.error("Error al cargar notificaciones");
    } finally {
      setIsLoading(false);
    }
  }, [user?.id, tournamentId]);

  // Cargar notificaciones al montar el componente
  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  // Suscribirse a cambios en tiempo real
  useEffect(() => {
    if (!user?.id) return;

    const supabase = createClient();

    const subscription = supabase
      .channel("notifications")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          console.log("🔔 Notification change:", payload);
          loadNotifications(); // Recargar notificaciones
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [user?.id, loadNotifications]);

  // Solicitar permiso para notificaciones push
  const requestPushPermission = useCallback(async () => {
    if (!pushSupported) {
      toast.error("Tu navegador no soporta notificaciones push");
      return false;
    }

    try {
      const permission = await Notification.requestPermission();
      setPushPermission(permission);

      if (permission === "granted") {
        toast.success("¡Notificaciones push habilitadas!");
        return true;
      } else {
        toast.error("Notificaciones push denegadas");
        return false;
      }
    } catch (error) {
      console.error("Error requesting push permission:", error);
      toast.error("Error al solicitar permisos");
      return false;
    }
  }, [pushSupported]);

  // Mostrar notificación push del navegador
  const showPushNotification = useCallback(
    (title: string, message: string, data?: any) => {
      if (pushPermission === "granted" && document.hidden) {
        new Notification(title, {
          body: message,
          icon: "/favicon.ico",
          badge: "/favicon.ico",
          data: data,
        });
      }
    },
    [pushPermission]
  );

  // Crear nueva notificación
  const createNewNotification = useCallback(
    async (
      type: NotificationType,
      title: string,
      message: string,
      data?: any,
      scheduledFor?: string
    ) => {
      if (!user?.id || !tournamentId) return null;

      try {
        const notification = await createNotification(
          user.id,
          tournamentId,
          type,
          title,
          message,
          data,
          scheduledFor
        );

        // Mostrar notificación push si está habilitada
        showPushNotification(title, message, data);

        // Mostrar toast
        toast.info(title, { description: message });

        return notification;
      } catch (error) {
        console.error("Error creating notification:", error);
        return null;
      }
    },
    [user?.id, tournamentId, showPushNotification]
  );

  // Marcar como leída
  const markAsRead = useCallback(
    async (notificationId: string) => {
      try {
        await markNotificationAsRead(notificationId);
        await loadNotifications(); // Recargar para actualizar estado
      } catch (error) {
        console.error("Error marking notification as read:", error);
        toast.error("Error al marcar notificación");
      }
    },
    [loadNotifications]
  );

  // Marcar todas como leídas
  const markAllAsRead = useCallback(async () => {
    if (!user?.id) return;

    try {
      await markAllNotificationsAsRead(user.id, tournamentId);
      await loadNotifications(); // Recargar para actualizar estado
      toast.success("Todas las notificaciones marcadas como leídas");
    } catch (error) {
      console.error("Error marking all notifications as read:", error);
      toast.error("Error al marcar notificaciones");
    }
  }, [user?.id, tournamentId, loadNotifications]);

  // Eliminar notificación
  const deleteNotif = useCallback(
    async (notificationId: string) => {
      try {
        await deleteNotification(notificationId);
        await loadNotifications(); // Recargar para actualizar estado
        toast.success("Notificación eliminada");
      } catch (error) {
        console.error("Error deleting notification:", error);
        toast.error("Error al eliminar notificación");
      }
    },
    [loadNotifications]
  );

  // Actualizar preferencias
  const updatePreferences = useCallback(
    async (newPreferences: Partial<NotificationPreferences>) => {
      if (!user?.id || !tournamentId) return;

      try {
        const updated = await upsertNotificationPreferences({
          userId: user.id,
          tournamentId,
          ...newPreferences,
        });
        setPreferences(updated);
        toast.success("Preferencias actualizadas");
      } catch (error) {
        console.error("Error updating preferences:", error);
        toast.error("Error al actualizar preferencias");
      }
    },
    [user?.id, tournamentId]
  );

  return {
    // Estado
    notifications,
    unreadCount,
    preferences,
    isLoading,
    pushSupported,
    pushPermission,

    // Acciones
    loadNotifications,
    requestPushPermission,
    createNewNotification,
    markAsRead,
    markAllAsRead,
    deleteNotif,
    updatePreferences,
  };
}
