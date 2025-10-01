"use client";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface RealtimeIndicatorProps {
  isConnected: boolean;
  lastUpdate?: Date;
  className?: string;
  showLastUpdate?: boolean;
}

export function RealtimeIndicator({
  isConnected,
  lastUpdate,
  className,
  showLastUpdate = true,
}: RealtimeIndicatorProps) {
  const formatTime = (date: Date) => {
    return date.toLocaleTimeString("es-ES", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  };

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <Badge
        variant={isConnected ? "default" : "destructive"}
        className={cn(
          "flex items-center gap-1.5 transition-all duration-300",
          isConnected
            ? "bg-green-100 text-green-800 border-green-200 dark:bg-green-900 dark:text-green-100"
            : "bg-red-100 text-red-800 border-red-200 dark:bg-red-900 dark:text-red-100"
        )}
      >
        <div
          className={cn(
            "w-2 h-2 rounded-full transition-all duration-300",
            isConnected ? "bg-green-500 animate-pulse" : "bg-red-500"
          )}
        />
        {isConnected ? "En Vivo" : "Desconectado"}
      </Badge>

      {showLastUpdate && lastUpdate && (
        <span className="text-xs text-muted-foreground">
          Actualizado: {formatTime(lastUpdate)}
        </span>
      )}
    </div>
  );
}
