"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Trophy, Users, Target, CheckCircle, XCircle } from "lucide-react";
import { toast } from "sonner";
import { getAllGroupStandings } from "@/lib/supabase-queries";

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

interface ManualEliminationSelectorProps {
  categoryId: string;
  onPairsSelected: (selectedPairs: Standing[]) => void;
  onCancel: () => void;
  readOnly?: boolean; // Para mostrar solo la tabla sin selección
}

export function ManualEliminationSelector({
  categoryId,
  onPairsSelected,
  onCancel,
  readOnly = false,
}: ManualEliminationSelectorProps) {
  const [standings, setStandings] = useState<Standing[]>([]);
  const [selectedPairs, setSelectedPairs] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadStandings();
  }, [categoryId]);

  const loadStandings = async () => {
    try {
      setIsLoading(true);
      const groupStandings = await getAllGroupStandings(categoryId);
      
      // Combinar todas las parejas de todos los grupos
      const allStandings: Standing[] = [];
      Object.entries(groupStandings).forEach(([groupId, groupData]: [string, any]) => {
        groupData.standings.forEach((standing: any) => {
          allStandings.push({
            ...standing,
            groupName: groupData.groupName
          });
        });
      });

      // Ordenar por rendimiento general con los CRITERIOS CORRECTOS de desempate
            allStandings.sort((a, b) => {
              // 1º Puntos (mayor es mejor)
              if (b.points !== a.points) return b.points - a.points;
              
              // 1er criterio de desempate: Diferencia de sets (mayor es mejor)
              if (b.setsDifference !== a.setsDifference) return b.setsDifference - a.setsDifference;
              
              // 2do criterio de desempate: Diferencia de games (mayor es mejor)
              if (b.gamesDifference !== a.gamesDifference) return b.gamesDifference - a.gamesDifference;
              
              // 3er criterio de desempate: Encuentro directo (si son del mismo grupo)
              // Por ahora mantenemos orden alfabético como último criterio
              if (a.pairName < b.pairName) return -1;
              if (a.pairName > b.pairName) return 1;
              
              return 0;
            });

      setStandings(allStandings);
    } catch (error) {
      console.error("Error cargando clasificación:", error);
      toast.error("Error al cargar la clasificación");
    } finally {
      setIsLoading(false);
    }
  };

  const handlePairSelection = (pairId: string, checked: boolean) => {
    if (checked) {
      setSelectedPairs([...selectedPairs, pairId]);
    } else {
      setSelectedPairs(selectedPairs.filter(id => id !== pairId));
    }
  };

  const handleSelectAll = () => {
    const allPairIds = standings.map(s => s.pairId);
    setSelectedPairs(allPairIds);
  };

  const handleDeselectAll = () => {
    setSelectedPairs([]);
  };

  const handleConfirmSelection = () => {
    if (selectedPairs.length < 2) {
      toast.error("Selecciona al menos 2 parejas para las eliminatorias");
      return;
    }

    const selectedStandings = standings.filter(s => selectedPairs.includes(s.pairId));
    onPairsSelected(selectedStandings);
  };

  const getPositionColor = (index: number) => {
    if (index < 3) return "bg-yellow-100 border-yellow-300";
    if (index < 6) return "bg-blue-100 border-blue-300";
    if (index < 9) return "bg-green-100 border-green-300";
    return "bg-gray-50 border-gray-200";
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Cargando clasificación...</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader className="bg-gradient-to-r from-blue-50 to-purple-50">
        <CardTitle className="flex items-center gap-2 text-xl">
          <Trophy className="h-6 w-6 text-amber-600" />
          {readOnly ? "Clasificación General por Rendimiento" : "Selección Manual de Parejas para Eliminatorias"}
        </CardTitle>
        <div className="flex items-center gap-4 text-sm text-gray-600">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            <span>{standings.length} parejas disponibles</span>
          </div>
          {!readOnly && (
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <span>{selectedPairs.length} parejas seleccionadas</span>
            </div>
          )}
        </div>
      </CardHeader>
      
      <CardContent className="p-6">
        {/* Instrucciones - solo mostrar si no es readOnly */}
        {!readOnly && (
          <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
            <h3 className="font-semibold text-blue-900 mb-2">Instrucciones:</h3>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• Selecciona las parejas que quieres que pasen a eliminatorias</li>
              <li>• Puedes elegir cualquier cantidad (mínimo 2 parejas)</li>
              <li>• El orden de selección determinará el seeding en las eliminatorias</li>
              <li>• Después podrás configurar manualmente los enfrentamientos</li>
            </ul>
          </div>
        )}

        {/* Controles - solo mostrar si no es readOnly */}
        {!readOnly && (
          <div className="flex items-center gap-4 mb-6">
            <Button
              variant="outline"
              size="sm"
              onClick={handleSelectAll}
              className="flex items-center gap-2"
            >
              <CheckCircle className="h-4 w-4" />
              Seleccionar Todas
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleDeselectAll}
              className="flex items-center gap-2"
            >
              <XCircle className="h-4 w-4" />
              Deseleccionar Todas
            </Button>
          </div>
        )}

        {/* Tablas de Clasificación por Grupo */}
        <div className="space-y-6">
          <h3 className="font-semibold text-gray-900 flex items-center gap-2">
            <Target className="h-5 w-5 text-blue-600" />
            Clasificación por Grupos
          </h3>
          
          {/* Mostrar cada grupo por separado */}
          {(() => {
            // Agrupar por grupos
            const groupedStandings: { [groupName: string]: Standing[] } = {};
            standings.forEach(standing => {
              if (!groupedStandings[standing.groupName]) {
                groupedStandings[standing.groupName] = [];
              }
              groupedStandings[standing.groupName].push(standing);
            });

            return Object.entries(groupedStandings).map(([groupName, groupStandings]) => (
              <div key={groupName} className="space-y-3">
                <h4 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                  <Badge variant="outline" className="text-sm">{groupName}</Badge>
                </h4>
                
                <div className="space-y-2">
                  {groupStandings.map((standing, index) => (
                    <div
                      key={standing.pairId}
                      className={`p-3 rounded-lg border-2 ${getPositionColor(index)} transition-all hover:shadow-md`}
                    >
                      <div className="flex items-center gap-4">
                        {/* Checkbox - solo mostrar si no es readOnly */}
                        {!readOnly && (
                          <Checkbox
                            checked={selectedPairs.includes(standing.pairId)}
                            onCheckedChange={(checked) => 
                              handlePairSelection(standing.pairId, checked as boolean)
                            }
                            className="h-4 w-4"
                          />
                        )}
                        
                        {/* Posición */}
                        <div className="flex-shrink-0 w-6 h-6 rounded-full bg-white border-2 border-gray-300 flex items-center justify-center font-bold text-xs">
                          {index + 1}
                        </div>
                        
                        {/* Información de la pareja */}
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-semibold text-gray-900">
                              {standing.pairName}
                            </span>
                          </div>
                          
                          <div className="flex items-center gap-4 text-sm text-gray-600">
                            <span>{standing.matchesPlayed} partidos • {standing.matchesWon} victorias</span>
                            <span className="font-medium text-blue-600">{standing.points} pts</span>
                            <span>Sets: {standing.setsWon}-{standing.setsLost}</span>
                          </div>
                        </div>
                        
                        {/* Estado de selección */}
                        {!readOnly && selectedPairs.includes(standing.pairId) && (
                          <div className="flex-shrink-0">
                            <Badge className="bg-green-600 text-white">
                              <CheckCircle className="h-3 w-3 mr-1" />
                              Seleccionada
                            </Badge>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ));
          })()}
        </div>

        {/* Tabla General Combinada */}
        <div className="space-y-3 mt-8">
          <h3 className="font-semibold text-gray-900 flex items-center gap-2">
            <Target className="h-5 w-5 text-blue-600" />
            Clasificación General por Rendimiento
          </h3>
          
          {standings.map((standing, index) => (
              <div
                key={standing.pairId}
                className={`p-4 rounded-lg border-2 ${getPositionColor(index)} transition-all hover:shadow-md`}
              >
                <div className="flex items-center gap-4">
                  {/* Checkbox - solo mostrar si no es readOnly */}
                  {!readOnly && (
                    <Checkbox
                      checked={selectedPairs.includes(standing.pairId)}
                      onCheckedChange={(checked) => 
                        handlePairSelection(standing.pairId, checked as boolean)
                      }
                      className="h-5 w-5"
                    />
                  )}
                
                {/* Posición */}
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-white border-2 border-gray-300 flex items-center justify-center font-bold text-sm">
                  {index + 1}
                </div>
                
                {/* Información de la pareja */}
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-semibold text-gray-900">
                      {standing.pairName}
                    </span>
                    <Badge variant="secondary" className="text-xs">
                      {standing.groupName}
                    </Badge>
                  </div>
                  
                  <div className="flex items-center gap-4 text-sm text-gray-600">
                    <span>{standing.matchesPlayed} partidos • {standing.matchesWon} victorias</span>
                    <span className="font-medium text-blue-600">{standing.points} pts</span>
                    <span>Sets: {standing.setsWon}-{standing.setsLost}</span>
                  </div>
                </div>
                
                {/* Estado de selección */}
                {selectedPairs.includes(standing.pairId) && (
                  <div className="flex-shrink-0">
                    <Badge className="bg-green-600 text-white">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Seleccionada
                    </Badge>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Botones de acción - solo mostrar si no es readOnly */}
        {!readOnly && (
          <div className="flex items-center justify-between mt-8 pt-6 border-t">
            <Button
              variant="outline"
              onClick={onCancel}
              className="flex items-center gap-2"
            >
              <XCircle className="h-4 w-4" />
              Cancelar
            </Button>
            
            <div className="flex items-center gap-4">
              <div className="text-sm text-gray-600">
                {selectedPairs.length} parejas seleccionadas
              </div>
              <Button
                onClick={handleConfirmSelection}
                disabled={selectedPairs.length < 2}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700"
              >
                <Trophy className="h-4 w-4" />
                Continuar con {selectedPairs.length} parejas
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
