"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Match, Score, ScoreSet, Pair } from "@/types";
import { PairTag } from "@/components/atoms/PairTag";
import { cn } from "@/lib/utils";

interface ScoreFormProps {
  match: Match;
  pairA: Pair;
  pairB: Pair;
  onSubmit: (score: Score) => void;
  onCancel?: () => void;
  isLoading?: boolean;
  className?: string;
}

export function ScoreForm({
  match,
  pairA,
  pairB,
  onSubmit,
  onCancel,
  isLoading = false,
  className,
}: ScoreFormProps) {
  // Convertir la estructura del score del match a ScoreSet[]
  const convertScoreToSets = (score: any): ScoreSet[] => {
    if (!score) return [{ a: 0, b: 0 }];

    const sets: ScoreSet[] = [];

    // Convertir pairA scores a sets
    if (score.pairA) {
      const pairAScores = [score.pairA.set1, score.pairA.set2];
      if (score.pairA.set3 !== undefined) pairAScores.push(score.pairA.set3);
      if (score.pairA.superDeath !== undefined)
        pairAScores.push(score.pairA.superDeath);

      // Convertir pairB scores a sets
      const pairBScores = [score.pairB.set1, score.pairB.set2];
      if (score.pairB.set3 !== undefined) pairBScores.push(score.pairB.set3);
      if (score.pairB.superDeath !== undefined)
        pairBScores.push(score.pairB.superDeath);

      // Crear sets con los puntajes disponibles
      const maxSets = Math.max(pairAScores.length, pairBScores.length);
      for (let i = 0; i < maxSets; i++) {
        sets.push({
          a: pairAScores[i] || 0,
          b: pairBScores[i] || 0,
        });
      }
    }

    return sets.length > 0 ? sets : [{ a: 0, b: 0 }];
  };

  const [sets, setSets] = useState<ScoreSet[]>(convertScoreToSets(match.score));
  const [notes, setNotes] = useState("");

  const addSet = () => {
    if (sets.length < 5) {
      // Máximo 5 sets
      setSets([...sets, { a: 0, b: 0 }]);
    }
  };

  const removeSet = (index: number) => {
    if (sets.length > 1) {
      setSets(sets.filter((_, i) => i !== index));
    }
  };

  const updateSet = (index: number, player: "a" | "b", value: string) => {
    const numValue = parseInt(value) || 0;
    if (numValue >= 0 && numValue <= 20) {
      // Validación básica
      const newSets = [...sets];
      newSets[index] = { ...newSets[index], [player]: numValue };
      setSets(newSets);
    }
  };

  const calculateWinner = (sets: ScoreSet[]): string | null => {
    let setsA = 0;
    let setsB = 0;

    sets.forEach((set) => {
      if (set.a > set.b) setsA++;
      else if (set.b > set.a) setsB++;
    });

    // Para ganar necesita mayoría de sets
    const setsToWin = Math.ceil(sets.length / 2);

    if (setsA >= setsToWin) return pairA.id;
    if (setsB >= setsToWin) return pairB.id;

    return null;
  };

  const winner = calculateWinner(sets);
  const isValidScore = sets.every((set) => set.a !== set.b) && winner !== null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!isValidScore) return;

    const score: Score = {
      sets: sets.filter((set) => set.a > 0 || set.b > 0), // Solo sets jugados
      winnerPairId: winner!,
      notes: notes.trim() || undefined,
    };

    onSubmit(score);
  };

  return (
    <Card className={cn("score-form-container", className)}>
      <CardHeader>
        <CardTitle className="score-form-title">
          Resultado del Partido
        </CardTitle>
        <div className="score-form-match-info space-y-2">
          <div className="flex items-center justify-between">
            <PairTag pair={pairA} variant="outline" />
            <span className="text-sm text-muted-foreground">vs</span>
            <PairTag pair={pairB} variant="outline" />
          </div>
          <div className="text-xs text-muted-foreground text-center">
            {match.stage} • {match.day}{" "}
            {match.startTime && `• ${match.startTime}`}
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <form onSubmit={handleSubmit} className="score-form-content space-y-4">
          {/* Sets */}
          <div className="score-form-sets space-y-3">
            <div className="flex items-center justify-between">
              <Label className="score-form-sets-label">Sets</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addSet}
                disabled={sets.length >= 5}
                className="score-form-add-set"
              >
                Agregar Set
              </Button>
            </div>

            <div className="space-y-2">
              {sets.map((set, index) => (
                <div
                  key={index}
                  className="score-form-set flex items-center gap-2 p-2 border rounded"
                >
                  <span className="text-sm font-medium w-12">
                    Set {index + 1}
                  </span>

                  <div className="flex items-center gap-2 flex-1">
                    <div className="flex-1">
                      <Input
                        type="number"
                        value={set.a || ""}
                        onChange={(e) => updateSet(index, "a", e.target.value)}
                        placeholder="0"
                        className="score-form-set-input text-center"
                        min="0"
                        max="20"
                      />
                    </div>

                    <span className="text-sm text-muted-foreground">-</span>

                    <div className="flex-1">
                      <Input
                        type="number"
                        value={set.b || ""}
                        onChange={(e) => updateSet(index, "b", e.target.value)}
                        placeholder="0"
                        className="score-form-set-input text-center"
                        min="0"
                        max="20"
                      />
                    </div>
                  </div>

                  {sets.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeSet(index)}
                      className="score-form-remove-set text-destructive"
                    >
                      ×
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Winner Preview */}
          {winner && (
            <div className="score-form-winner">
              <Separator />
              <div className="flex items-center justify-center gap-2 py-2">
                <span className="text-sm text-muted-foreground">Ganador:</span>
                <PairTag
                  pair={winner === pairA.id ? pairA : pairB}
                  variant="default"
                />
              </div>
            </div>
          )}

          {/* Notes */}
          <div className="score-form-notes">
            <Label htmlFor="notes" className="score-form-notes-label">
              Notas (opcional)
            </Label>
            <Input
              id="notes"
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Observaciones del partido"
              className="score-form-notes-input"
            />
          </div>

          {/* Actions */}
          <div className="score-form-actions flex gap-2 justify-end">
            {onCancel && (
              <Button
                type="button"
                variant="outline"
                onClick={onCancel}
                disabled={isLoading}
                className="score-form-cancel"
              >
                Cancelar
              </Button>
            )}
            <Button
              type="submit"
              disabled={!isValidScore || isLoading}
              className="score-form-submit"
            >
              {isLoading ? "Guardando..." : "Guardar Resultado"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
