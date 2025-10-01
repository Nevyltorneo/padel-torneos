"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { 
  Trophy, 
  Users, 
  Target, 
  ArrowRight, 
  Play, 
  Settings,
  CheckCircle,
  XCircle,
  RotateCcw
} from "lucide-react";
import { toast } from "sonner";

interface Standing {
  pairId: string;
  pair: {
    id: string;
    player1: string;
    player2: string;
  };
  pairName: string;
  groupName: string;
  matchesPlayed: number;
  matchesWon: number;
  points: number;
  setsWon: number;
  setsLost: number;
  setsDifference: number;
  gamesWon: number;
  gamesLost: number;
  gamesDifference: number;
}

interface Match {
  id: string;
  pairA: Standing;
  pairB: Standing;
  round: string;
  matchNumber: number;
}

interface ManualEliminationBracketProps {
  selectedPairs: Standing[];
  onMatchesGenerated: (matches: Match[]) => void;
  onBack: () => void;
}

export function ManualEliminationBracket({
  selectedPairs,
  onMatchesGenerated,
  onBack,
}: ManualEliminationBracketProps) {
  const [eliminationType, setEliminationType] = useState<string>("");
  const [matches, setMatches] = useState<Match[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);

  const eliminationOptions = [
    {
      value: "semifinals",
      label: "Semifinales Directas",
      description: "4 parejas → 2 semifinales → final",
      minPairs: 4,
      maxPairs: 4
    },
    {
      value: "quarterfinals",
      label: "Cuartos de Final",
      description: "8 parejas → 4 cuartos → semifinales → final",
      minPairs: 8,
      maxPairs: 8
    },
    {
      value: "octavos",
      label: "Octavos de Final",
      description: "16 parejas → 8 octavos → cuartos → semifinales → final",
      minPairs: 16,
      maxPairs: 16
    },
    {
      value: "custom",
      label: "Personalizado",
      description: "Configura libremente los enfrentamientos",
      minPairs: 2,
      maxPairs: 999
    }
  ];

  const getAvailableOptions = () => {
    return eliminationOptions.filter(option => 
      selectedPairs.length >= option.minPairs && 
      selectedPairs.length <= option.maxPairs
    );
  };

  const generateMatches = () => {
    if (!eliminationType) {
      toast.error("Selecciona un tipo de eliminatoria");
      return;
    }

    setIsGenerating(true);
    
    try {
      let newMatches: Match[] = [];
      
      switch (eliminationType) {
        case "semifinals":
          newMatches = generateSemifinals();
          break;
        case "quarterfinals":
          newMatches = generateQuarterfinals();
          break;
        case "octavos":
          newMatches = generateOctavos();
          break;
        case "custom":
          newMatches = generateCustom();
          break;
        default:
          throw new Error("Tipo de eliminatoria no válido");
      }

      setMatches(newMatches);
      toast.success(`Generados ${newMatches.length} partidos de eliminatorias`);
    } catch (error) {
      console.error("Error generando partidos:", error);
      toast.error("Error al generar los partidos");
    } finally {
      setIsGenerating(false);
    }
  };

  const generateSemifinals = (): Match[] => {
    if (selectedPairs.length !== 4) {
      throw new Error("Se necesitan exactamente 4 parejas para semifinales");
    }

    return [
      {
        id: "semifinal-1",
        pairA: selectedPairs[0],
        pairB: selectedPairs[3],
        round: "Semifinal 1",
        matchNumber: 1
      },
      {
        id: "semifinal-2", 
        pairA: selectedPairs[1],
        pairB: selectedPairs[2],
        round: "Semifinal 2",
        matchNumber: 2
      }
    ];
  };

  const generateQuarterfinals = (): Match[] => {
    if (selectedPairs.length !== 8) {
      throw new Error("Se necesitan exactamente 8 parejas para cuartos de final");
    }

    return [
      {
        id: "quarterfinal-1",
        pairA: selectedPairs[0],
        pairB: selectedPairs[7],
        round: "Cuartos de Final",
        matchNumber: 1
      },
      {
        id: "quarterfinal-2",
        pairA: selectedPairs[1],
        pairB: selectedPairs[6],
        round: "Cuartos de Final",
        matchNumber: 2
      },
      {
        id: "quarterfinal-3",
        pairA: selectedPairs[2],
        pairB: selectedPairs[5],
        round: "Cuartos de Final",
        matchNumber: 3
      },
      {
        id: "quarterfinal-4",
        pairA: selectedPairs[3],
        pairB: selectedPairs[4],
        round: "Cuartos de Final",
        matchNumber: 4
      }
    ];
  };

  const generateOctavos = (): Match[] => {
    if (selectedPairs.length !== 16) {
      throw new Error("Se necesitan exactamente 16 parejas para octavos de final");
    }

    const octavosMatches: Match[] = [];
    for (let i = 0; i < 8; i++) {
      octavosMatches.push({
        id: `octavos-${i + 1}`,
        pairA: selectedPairs[i],
        pairB: selectedPairs[15 - i],
        round: "Octavos de Final",
        matchNumber: i + 1
      });
    }
    return octavosMatches;
  };

  const generateCustom = (): Match[] => {
    // Para personalizado, generar enfrentamientos 1 vs último, 2 vs penúltimo, etc.
    const customMatches: Match[] = [];
    const half = Math.floor(selectedPairs.length / 2);
    
    for (let i = 0; i < half; i++) {
      customMatches.push({
        id: `custom-${i + 1}`,
        pairA: selectedPairs[i],
        pairB: selectedPairs[selectedPairs.length - 1 - i],
        round: "Primera Ronda",
        matchNumber: i + 1
      });
    }
    return customMatches;
  };

  const swapPair = (matchId: string, isPairA: boolean, newPairId: string) => {
    const newPair = selectedPairs.find(p => p.pairId === newPairId);
    if (!newPair) return;

    setMatches(matches.map(match => {
      if (match.id === matchId) {
        if (isPairA) {
          // Validar que no sea la misma pareja que pairB
          if (match.pairB.pairId === newPairId) {
            toast.error("Una pareja no puede jugar contra sí misma");
            return match;
          }
          return { ...match, pairA: newPair };
        } else {
          // Validar que no sea la misma pareja que pairA
          if (match.pairA.pairId === newPairId) {
            toast.error("Una pareja no puede jugar contra sí misma");
            return match;
          }
          return { ...match, pairB: newPair };
        }
      }
      return match;
    }));
  };

  const handleConfirmMatches = () => {
    if (matches.length === 0) {
      toast.error("No hay partidos generados");
      return;
    }
    onMatchesGenerated(matches);
  };

  const availableOptions = getAvailableOptions();

  return (
    <div className="w-full max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <Card>
        <CardHeader className="bg-gradient-to-r from-purple-50 to-blue-50">
          <CardTitle className="flex items-center gap-2 text-xl">
            <Settings className="h-6 w-6 text-purple-600" />
            Configuración de Eliminatorias
          </CardTitle>
          <div className="flex items-center gap-4 text-sm text-gray-600">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              <span>{selectedPairs.length} parejas seleccionadas</span>
            </div>
            <div className="flex items-center gap-2">
              <Target className="h-4 w-4" />
              <span>{matches.length} partidos configurados</span>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Selección de tipo de eliminatoria */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Play className="h-5 w-5 text-blue-600" />
            Tipo de Eliminatoria
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {availableOptions.map((option) => (
              <div
                key={option.value}
                className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                  eliminationType === option.value
                    ? "border-blue-500 bg-blue-50"
                    : "border-gray-200 hover:border-gray-300"
                }`}
                onClick={() => setEliminationType(option.value)}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-4 h-4 rounded-full border-2 ${
                    eliminationType === option.value
                      ? "border-blue-500 bg-blue-500"
                      : "border-gray-300"
                  }`}>
                    {eliminationType === option.value && (
                      <div className="w-full h-full rounded-full bg-white scale-50"></div>
                    )}
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">{option.label}</h3>
                    <p className="text-sm text-gray-600">{option.description}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {availableOptions.length === 0 && (
            <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-yellow-800">
                No hay tipos de eliminatoria disponibles para {selectedPairs.length} parejas.
                Usa "Personalizado" para configurar libremente los enfrentamientos.
              </p>
            </div>
          )}

          <div className="flex items-center gap-4">
            <Button
              onClick={generateMatches}
              disabled={!eliminationType || isGenerating}
              className="flex items-center gap-2"
            >
              <Play className="h-4 w-4" />
              {isGenerating ? "Generando..." : "Generar Partidos"}
            </Button>
            
            {matches.length > 0 && (
              <Button
                variant="outline"
                onClick={() => setMatches([])}
                className="flex items-center gap-2"
              >
                <RotateCcw className="h-4 w-4" />
                Regenerar
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Partidos generados */}
      {matches.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="h-5 w-5 text-amber-600" />
              Partidos Configurados
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {matches.map((match) => (
                <div
                  key={match.id}
                  className="p-4 border border-gray-200 rounded-lg bg-gray-50"
                >
                  <div className="flex items-center justify-between mb-3">
                    <Badge className="bg-blue-600 text-white">
                      {match.round} - Partido {match.matchNumber}
                    </Badge>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
                    {/* Pareja A */}
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-700">Pareja A</label>
                      <Select
                        value={match.pairA.pairId}
                        onValueChange={(value) => swapPair(match.id, true, value)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {selectedPairs
                            .filter(pair => pair.pairId !== match.pairB.pairId) // No mostrar la pareja que ya está en pairB
                            .map((pair) => (
                            <SelectItem key={pair.pairId} value={pair.pairId}>
                              {pair.pairName}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* VS */}
                    <div className="flex items-center justify-center">
                      <div className="text-2xl font-bold text-gray-500">VS</div>
                    </div>

                    {/* Pareja B */}
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-700">Pareja B</label>
                      <Select
                        value={match.pairB.pairId}
                        onValueChange={(value) => swapPair(match.id, false, value)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {selectedPairs
                            .filter(pair => pair.pairId !== match.pairA.pairId) // No mostrar la pareja que ya está en pairA
                            .map((pair) => (
                            <SelectItem key={pair.pairId} value={pair.pairId}>
                              {pair.pairName}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Botones de acción */}
            <div className="flex items-center justify-between mt-6 pt-6 border-t">
              <Button
                variant="outline"
                onClick={onBack}
                className="flex items-center gap-2"
              >
                <XCircle className="h-4 w-4" />
                Volver a Selección
              </Button>
              
              <Button
                onClick={handleConfirmMatches}
                className="flex items-center gap-2 bg-green-600 hover:bg-green-700"
              >
                <CheckCircle className="h-4 w-4" />
                Confirmar y Crear Partidos
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}