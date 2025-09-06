"use client";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type StatusType =
  | "active"
  | "registration"
  | "groups_generated"
  | "scheduled"
  | "in_progress"
  | "finished"
  | "pending"
  | "playing"
  | "grouping";

interface StatusBadgeProps {
  status: StatusType;
  className?: string;
}

const statusConfig: Record<
  StatusType,
  {
    label: string;
    variant: "default" | "outline" | "secondary" | "destructive";
    color: string;
  }
> = {
  // Tournament statuses
  active: { label: "Activo", variant: "default", color: "status-active" },
  registration: {
    label: "Inscripción",
    variant: "default",
    color: "status-registration",
  },
  groups_generated: {
    label: "Grupos Creados",
    variant: "secondary",
    color: "status-groups",
  },
  scheduled: {
    label: "Programado",
    variant: "default",
    color: "status-scheduled",
  },
  in_progress: {
    label: "En Curso",
    variant: "default",
    color: "status-in-progress",
  },
  finished: {
    label: "Finalizado",
    variant: "secondary",
    color: "status-finished",
  },

  // Match statuses
  pending: { label: "Pendiente", variant: "outline", color: "status-pending" },
  playing: { label: "Jugando", variant: "default", color: "status-playing" },

  // Category statuses
  grouping: {
    label: "Agrupando",
    variant: "secondary",
    color: "status-grouping",
  },
};

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const config = statusConfig[status];

  if (!config) {
    return (
      <Badge
        variant="outline"
        className={cn("status-badge-unknown", className)}
      >
        {status}
      </Badge>
    );
  }

  return (
    <Badge
      variant={config.variant}
      className={cn(
        "status-badge-container",
        `status-badge-${status}`,
        config.color,
        className
      )}
    >
      <span className="status-badge-label text-xs font-medium">
        {config.label}
      </span>
    </Badge>
  );
}
