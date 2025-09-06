"use client";

import { Pair } from "@/types";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface PairTagProps {
  pair: Pair;
  variant?: "default" | "outline" | "secondary" | "destructive";
  showSeed?: boolean;
  className?: string;
  onClick?: () => void;
}

export function PairTag({
  pair,
  variant = "default",
  showSeed = false,
  className,
  onClick,
}: PairTagProps) {
  const pairTagContent = (
    <div className="pair-tag-content flex items-center gap-1">
      {showSeed && pair.seed && (
        <span className="pair-tag-seed text-xs font-bold">#{pair.seed}</span>
      )}
      <span className="pair-tag-players text-sm">
        {pair.player1.name} / {pair.player2.name}
      </span>
    </div>
  );

  return (
    <Badge
      variant={variant}
      className={cn(
        "pair-tag-container cursor-pointer hover:opacity-80 transition-opacity",
        onClick && "hover:bg-primary/90",
        className
      )}
      onClick={onClick}
    >
      {pairTagContent}
    </Badge>
  );
}
