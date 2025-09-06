"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Pair, Player } from "@/types";
import { cn } from "@/lib/utils";

interface PairFormProps {
  onSubmit: (pair: Omit<Pair, "id" | "tournamentId" | "categoryId">) => void;
  onCancel?: () => void;
  initialData?: Partial<Pair>;
  isLoading?: boolean;
  className?: string;
}

export function PairForm({
  onSubmit,
  onCancel,
  initialData,
  isLoading = false,
  className,
}: PairFormProps) {
  const [player1, setPlayer1] = useState<Player>({
    name: initialData?.player1?.name || "",
    phone: initialData?.player1?.phone || "",
    email: initialData?.player1?.email || "",
  });

  const [player2, setPlayer2] = useState<Player>({
    name: initialData?.player2?.name || "",
    phone: initialData?.player2?.phone || "",
    email: initialData?.player2?.email || "",
  });

  const [seed, setSeed] = useState<string>(initialData?.seed?.toString() || "");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!player1.name.trim() || !player2.name.trim()) {
      return; // Validación básica
    }

    onSubmit({
      player1: {
        name: player1.name.trim(),
        phone: player1.phone?.trim() || undefined,
        email: player1.email?.trim() || undefined,
      },
      player2: {
        name: player2.name.trim(),
        phone: player2.phone?.trim() || undefined,
        email: player2.email?.trim() || undefined,
      },
      seed: seed ? parseInt(seed) : undefined,
    });
  };

  const updatePlayer1 = (field: keyof Player, value: string) => {
    setPlayer1((prev) => ({ ...prev, [field]: value }));
  };

  const updatePlayer2 = (field: keyof Player, value: string) => {
    setPlayer2((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <Card className={cn("pair-form-container", className)}>
      <CardHeader>
        <CardTitle className="pair-form-title">
          {initialData ? "Editar Pareja" : "Nueva Pareja"}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="pair-form-content space-y-6">
          {/* Jugador 1 */}
          <div className="pair-form-player1 space-y-3">
            <h3 className="text-sm font-medium text-muted-foreground">
              Jugador 1
            </h3>
            <div className="space-y-2">
              <div>
                <Label htmlFor="player1-name" className="pair-form-label">
                  Nombre *
                </Label>
                <Input
                  id="player1-name"
                  type="text"
                  value={player1.name}
                  onChange={(e) => updatePlayer1("name", e.target.value)}
                  placeholder="Nombre del jugador 1"
                  className="pair-form-input"
                  required
                />
              </div>
              <div>
                <Label htmlFor="player1-phone" className="pair-form-label">
                  Teléfono
                </Label>
                <Input
                  id="player1-phone"
                  type="tel"
                  value={player1.phone}
                  onChange={(e) => updatePlayer1("phone", e.target.value)}
                  placeholder="Teléfono (opcional)"
                  className="pair-form-input"
                />
              </div>
              <div>
                <Label htmlFor="player1-email" className="pair-form-label">
                  Email
                </Label>
                <Input
                  id="player1-email"
                  type="email"
                  value={player1.email}
                  onChange={(e) => updatePlayer1("email", e.target.value)}
                  placeholder="Email (opcional)"
                  className="pair-form-input"
                />
              </div>
            </div>
          </div>

          {/* Jugador 2 */}
          <div className="pair-form-player2 space-y-3">
            <h3 className="text-sm font-medium text-muted-foreground">
              Jugador 2
            </h3>
            <div className="space-y-2">
              <div>
                <Label htmlFor="player2-name" className="pair-form-label">
                  Nombre *
                </Label>
                <Input
                  id="player2-name"
                  type="text"
                  value={player2.name}
                  onChange={(e) => updatePlayer2("name", e.target.value)}
                  placeholder="Nombre del jugador 2"
                  className="pair-form-input"
                  required
                />
              </div>
              <div>
                <Label htmlFor="player2-phone" className="pair-form-label">
                  Teléfono
                </Label>
                <Input
                  id="player2-phone"
                  type="tel"
                  value={player2.phone}
                  onChange={(e) => updatePlayer2("phone", e.target.value)}
                  placeholder="Teléfono (opcional)"
                  className="pair-form-input"
                />
              </div>
              <div>
                <Label htmlFor="player2-email" className="pair-form-label">
                  Email
                </Label>
                <Input
                  id="player2-email"
                  type="email"
                  value={player2.email}
                  onChange={(e) => updatePlayer2("email", e.target.value)}
                  placeholder="Email (opcional)"
                  className="pair-form-input"
                />
              </div>
            </div>
          </div>

          {/* Seed */}
          <div className="pair-form-seed">
            <Label htmlFor="seed" className="pair-form-label">
              Semilla (Ranking)
            </Label>
            <Input
              id="seed"
              type="number"
              value={seed}
              onChange={(e) => setSeed(e.target.value)}
              placeholder="Posición en ranking (opcional)"
              className="pair-form-input"
              min="1"
            />
          </div>

          {/* Botones */}
          <div className="pair-form-actions flex gap-2 justify-end">
            {onCancel && (
              <Button
                type="button"
                variant="outline"
                onClick={onCancel}
                className="pair-form-cancel"
                disabled={isLoading}
              >
                Cancelar
              </Button>
            )}
            <Button
              type="submit"
              className="pair-form-submit"
              disabled={
                isLoading || !player1.name.trim() || !player2.name.trim()
              }
            >
              {isLoading
                ? "Guardando..."
                : initialData
                ? "Actualizar"
                : "Crear Pareja"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
