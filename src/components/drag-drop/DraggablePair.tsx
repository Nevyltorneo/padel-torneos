"use client";

import { useDraggable } from "@dnd-kit/core";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { User, Phone } from "lucide-react";
import { Pair } from "@/types";
import { cn } from "@/lib/utils";

interface DraggablePairProps {
  pair: Pair;
  isDisabled?: boolean;
}

export function DraggablePair({
  pair,
  isDisabled = false,
}: DraggablePairProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({
      id: pair.id,
      disabled: isDisabled,
    });

  const style = transform
    ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
      }
    : undefined;

  return (
    <Card
      ref={setNodeRef}
      style={style}
      className={cn(
        "pair-card cursor-grab active:cursor-grabbing transition-all duration-200",
        isDragging && "opacity-50 scale-105 shadow-lg",
        isDisabled && "opacity-50 cursor-not-allowed"
      )}
      {...listeners}
      {...attributes}
    >
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <User className="h-4 w-4 text-gray-500" />
            <span className="font-medium text-sm">Pareja #{pair.seed}</span>
          </div>
          <Badge variant="outline" className="text-xs">
            Ranking {pair.seed}
          </Badge>
        </div>

        <div className="space-y-2">
          {/* Player 1 */}
          <div className="flex items-center gap-2">
            <User className="h-3 w-3 text-gray-400" />
            <div className="flex-1">
              <p className="text-sm font-medium">{pair.player1.name}</p>
              {pair.player1.phone && (
                <div className="flex items-center gap-1 text-xs text-gray-500">
                  <Phone className="h-3 w-3" />
                  {pair.player1.phone}
                </div>
              )}
            </div>
          </div>

          {/* Player 2 */}
          <div className="flex items-center gap-2">
            <User className="h-3 w-3 text-gray-400" />
            <div className="flex-1">
              <p className="text-sm font-medium">{pair.player2.name}</p>
              {pair.player2.phone && (
                <div className="flex items-center gap-1 text-xs text-gray-500">
                  <Phone className="h-3 w-3" />
                  {pair.player2.phone}
                </div>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
