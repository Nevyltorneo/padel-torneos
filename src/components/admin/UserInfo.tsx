"use client";

import React from "react";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Crown, Settings, Gavel, Eye } from "lucide-react";
import { useUserRole } from "@/hooks/useUserRole";

const roleConfig = {
  owner: {
    label: "Propietario",
    icon: Crown,
    color: "bg-purple-100 text-purple-800 border-purple-200",
    emoji: "👑",
  },
  admin: {
    label: "Administrador",
    icon: Settings,
    color: "bg-blue-100 text-blue-800 border-blue-200",
    emoji: "⚙️",
  },
  referee: {
    label: "Árbitro",
    icon: Gavel,
    color: "bg-green-100 text-green-800 border-green-200",
    emoji: "⚖️",
  },
  viewer: {
    label: "Espectador",
    icon: Eye,
    color: "bg-gray-100 text-gray-800 border-gray-200",
    emoji: "👀",
  },
};

export function UserInfo({ compact = false }: { compact?: boolean }) {
  const { userContext, isLoading } = useUserRole();

  if (isLoading || !userContext?.user) {
    return null;
  }

  const roleInfo = userContext.role ? roleConfig[userContext.role] : null;

  if (compact) {
    return (
      <div className="flex items-center gap-2">
        <Avatar className="h-6 w-6">
          <AvatarFallback className="text-xs">
            {userContext.user.profile?.fullName?.charAt(0) ||
              userContext.user.email?.charAt(0).toUpperCase() ||
              "?"}
          </AvatarFallback>
        </Avatar>
        {roleInfo && (
          <Badge variant="secondary" className={`${roleInfo.color} text-xs`}>
            {roleInfo.emoji} {roleInfo.label}
          </Badge>
        )}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
      <Avatar>
        <AvatarFallback>
          {userContext.user.profile?.fullName?.charAt(0) ||
            userContext.user.email?.charAt(0).toUpperCase() ||
            "?"}
        </AvatarFallback>
      </Avatar>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <p className="font-medium truncate">
            {userContext.user.profile?.fullName || userContext.user.email}
          </p>
          {roleInfo && (
            <Badge variant="secondary" className={roleInfo.color}>
              {roleInfo.emoji} {roleInfo.label}
            </Badge>
          )}
        </div>

        <div className="text-sm text-gray-500 space-y-1">
          <p className="truncate">{userContext.user.email}</p>
          {userContext.currentTournament && (
            <p className="truncate text-blue-600">
              Torneo: {userContext.currentTournament.name}
            </p>
          )}
          {userContext.user.email === "nrm001sm@hotmail.com" && (
            <p className="truncate text-green-600 font-medium">
              👑 Permisos globales de Owner
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
