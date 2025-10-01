"use client";

import { useDroppable } from "@dnd-kit/core";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, Trophy, Eye } from "lucide-react";
import { Group, Pair } from "@/types";
import { cn } from "@/lib/utils";
import { DraggablePair } from "./DraggablePair";

interface DroppableGroupProps {
  group: Group;
  pairs: Pair[];
  onViewMatches: (groupId: string) => void;
  onViewStandings: (groupId: string) => void;
  isOver?: boolean;
  isDragMode?: boolean;
}

export function DroppableGroup({
  group,
  pairs,
  onViewMatches,
  onViewStandings,
  isOver = false,
  isDragMode = false,
}: DroppableGroupProps) {
  const { setNodeRef, isOver: isDroppableOver } = useDroppable({
    id: group.id,
  });

  return (
    <Card
      ref={setNodeRef}
      className={cn(
        "group-card transition-all duration-200 min-h-[300px]",
        isDroppableOver && "ring-2 ring-blue-500 ring-opacity-50",
        isOver && "bg-blue-50 border-blue-300"
      )}
    >
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Users className="h-5 w-5" />
            {group.name}
          </CardTitle>
          <Badge variant="outline" className="text-xs">
            {pairs.length} parejas
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Drop Zone */}
        <div
          className={cn(
            "min-h-[200px] p-4 border-2 border-dashed rounded-lg transition-all duration-200",
            isDroppableOver
              ? "border-blue-400 bg-blue-50"
              : "border-gray-200 bg-gray-50"
          )}
        >
          {pairs.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-500">
              <Users className="h-8 w-8 mb-2" />
              <p className="text-sm text-center">
                {isDroppableOver
                  ? "Suelta la pareja aquí"
                  : "Arrastra parejas aquí"}
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {pairs.map((pair) => (
                <DraggablePair
                  key={pair.id}
                  pair={pair}
                  isDisabled={!isDragMode}
                />
              ))}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <button
            onClick={() => onViewMatches(group.id)}
            className="flex-1 flex items-center justify-center gap-2 px-3 py-2 text-sm bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-md transition-colors"
          >
            <Eye className="h-4 w-4" />
            Ver Partidos
          </button>
          <button
            onClick={() => onViewStandings(group.id)}
            className="flex-1 flex items-center justify-center gap-2 px-3 py-2 text-sm bg-green-100 hover:bg-green-200 text-green-700 rounded-md transition-colors"
          >
            <Trophy className="h-4 w-4" />
            Posiciones
          </button>
        </div>
      </CardContent>
    </Card>
  );
}
