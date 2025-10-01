"use client";

import { Court } from "@/types";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface CourtTagProps {
  court: Court;
  status?: "available" | "occupied" | "blocked";
  variant?: "default" | "outline" | "secondary" | "destructive";
  className?: string;
  onClick?: () => void;
}

export function CourtTag({
  court,
  status = "available",
  variant,
  className,
  onClick,
}: CourtTagProps) {
  // Determinar variant basado en status si no se especifica
  const badgeVariant = variant || getVariantFromStatus(status);

  return (
    <Badge
      variant={badgeVariant}
      className={cn(
        "court-tag-container cursor-pointer hover:opacity-80 transition-opacity",
        "court-tag-" + status,
        onClick && "hover:bg-primary/90",
        className
      )}
      onClick={onClick}
    >
      <div className="court-tag-content flex items-center gap-1">
        <span className="court-tag-name text-sm font-medium">{court.name}</span>
        <span className="court-tag-id text-xs opacity-75">({court.id})</span>
      </div>
    </Badge>
  );
}

function getVariantFromStatus(
  status: "available" | "occupied" | "blocked"
): "default" | "outline" | "secondary" | "destructive" {
  switch (status) {
    case "available":
      return "default";
    case "occupied":
      return "secondary";
    case "blocked":
      return "destructive";
    default:
      return "outline";
  }
}
