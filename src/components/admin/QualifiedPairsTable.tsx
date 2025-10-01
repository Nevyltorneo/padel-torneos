"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Trophy,
  Medal,
  Users,
  TrendingUp,
  CheckCircle,
  Target,
} from "lucide-react";
import { useEffect, useState } from "react";
import { getAdvancingPairsWithStats } from "@/lib/supabase-queries";
import { Pair } from "@/types";

interface QualifiedPairsTableProps {
  categoryId: string;
}

interface QualifiedPair {
  pair: Pair;
  seed: number;
  position: string;
  groupStanding: {
    points: number;
    matchesPlayed: number;
    matchesWon: number;
    matchesLost: number;
    setsWon: number;
    setsLost: number;
    setsDiff: number;
    gamesWon: number;
    gamesLost: number;
    gamesDiff: number;
    groupPosition: number;
    groupName: string;
  };
}

export function QualifiedPairsTable({ categoryId }: QualifiedPairsTableProps) {
  const [qualifiedPairs, setQualifiedPairs] = useState<QualifiedPair[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [bracketInfo, setBracketInfo] = useState<any>(null);
  const [lastUpdate, setLastUpdate] = useState(new Date());

  useEffect(() => {
    const fetchQualifiedPairs = async () => {
      try {
        setIsLoading(true);
        const result = await getAdvancingPairsWithStats(categoryId);

        // Convertir a formato esperado por el componente
        const detailedPairs: QualifiedPair[] = result.advancingPairs.map(
          (advanced) => ({
            pair: advanced.pair,
            seed: advanced.seed,
            position: advanced.position,
            groupStanding: advanced.groupStanding,
          })
        );

        setQualifiedPairs(detailedPairs);
        setBracketInfo(result.bracketInfo);
        setLastUpdate(new Date());
      } catch (error) {
        console.error("Error fetching qualified pairs:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchQualifiedPairs();
  }, [categoryId]);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-amber-600" />
            Parejas Clasificadas a Eliminatorias
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (qualifiedPairs.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-amber-600" />
            Parejas Clasificadas a Eliminatorias
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-gray-500">
            <Users className="h-12 w-12 mx-auto mb-4 text-gray-300" />
            <p>No hay parejas clasificadas</p>
            <p className="text-sm">
              Completa la fase de grupos para ver las parejas clasificadas
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const getSeedBadge = (seed: number, isFirstPlace: boolean) => {
    if (seed <= 4) {
      return (
        <Badge className="bg-gradient-to-r from-yellow-400 to-amber-500 text-white border-0 font-bold">
          <Target className="h-3 w-3 mr-1" />
          Seed {seed}
        </Badge>
      );
    }

    return (
      <Badge
        variant={isFirstPlace ? "default" : "secondary"}
        className="font-medium"
      >
        Seed {seed}
      </Badge>
    );
  };

  const getPositionBadge = (groupPosition: number) => {
    if (groupPosition === 1) {
      return (
        <Badge className="bg-gold-100 text-gold-800 border-gold-300">
          <Medal className="h-3 w-3 mr-1" />
          1º Lugar
        </Badge>
      );
    }

    return (
      <Badge className="bg-silver-100 text-silver-800 border-silver-300">
        <Medal className="h-3 w-3 mr-1" />
        2º Lugar
      </Badge>
    );
  };

  // Los pares ya vienen ordenados por rendimiento global, NO por posición en grupo
  // Simplemente los mostramos en el orden que vienen (mejor a peor rendimiento)

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-amber-600" />
            Clasificación Final por Rendimiento
          </CardTitle>
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <TrendingUp className="h-4 w-4" />
            <span>{qualifiedPairs.length} parejas clasificadas</span>
          </div>
        </div>
        <div className="flex flex-col gap-1">
          <p className="text-sm text-gray-600">
            Clasificación basada en rendimiento en fase de grupos • Seeding
            automático para eliminatorias
          </p>
          <div className="flex items-center gap-4 text-xs text-gray-500">
            <span>🏆 Bracket de {bracketInfo?.bracketSize} equipos</span>
            <span>🥇 {bracketInfo?.firstPlaces} primeros lugares</span>
            <span>🥈 {bracketInfo?.bestSecondPlaces} mejores segundos</span>
            <span>⏰ Actualizado: {lastUpdate.toLocaleTimeString()}</span>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* Tabla Única - Ordenada por Rendimiento Global */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <h3 className="text-lg font-semibold text-gray-800">
              🏆 Clasificados por Rendimiento Global
            </h3>
            <Badge className="bg-gradient-to-r from-yellow-400 to-amber-500 text-white border-0">
              Ordenados por: 1º Puntos, 2º Sets, 3º Games
            </Badge>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b bg-gradient-to-r from-blue-50 to-purple-50">
                  <th className="text-left p-3 font-semibold text-gray-700">
                    Seed
                  </th>
                  <th className="text-left p-3 font-semibold text-gray-700">
                    Pareja
                  </th>
                  <th className="text-left p-3 font-semibold text-gray-700">
                    Origen
                  </th>
                  <th className="text-center p-3 font-semibold text-gray-700">
                    Pts
                  </th>
                  <th className="text-center p-3 font-semibold text-gray-700">
                    PJ
                  </th>
                  <th className="text-center p-3 font-semibold text-gray-700">
                    PG
                  </th>
                  <th className="text-center p-3 font-semibold text-gray-700">
                    Sets
                  </th>
                  <th className="text-center p-3 font-semibold text-gray-700">
                    Games
                  </th>
                  <th className="text-center p-3 font-semibold text-gray-700">
                    Estado
                  </th>
                </tr>
              </thead>
              <tbody>
                {qualifiedPairs.map((qualified, index) => {
                  // Determinar el color según el seed (mejores seeds = colores más destacados)
                  const isTopSeed = qualified.seed <= 2;
                  const isGoodSeed = qualified.seed <= 4;

                  return (
                    <tr
                      key={qualified.pair.id}
                      className={`border-b hover:bg-blue-50 transition-colors ${
                        isTopSeed
                          ? "bg-gradient-to-r from-yellow-25 via-amber-25 to-transparent"
                          : isGoodSeed
                          ? "bg-gradient-to-r from-blue-25 to-transparent"
                          : ""
                      }`}
                    >
                      <td className="p-3">
                        {getSeedBadge(
                          qualified.seed,
                          qualified.groupStanding.groupPosition === 1
                        )}
                      </td>
                      <td className="p-3">
                        <div>
                          <p className="font-medium text-gray-900">
                            {qualified.pair.player1.name}
                          </p>
                          <p className="font-medium text-gray-900">
                            {qualified.pair.player2.name}
                          </p>
                        </div>
                      </td>
                      <td className="p-3">
                        <div className="space-y-1">
                          <Badge variant="outline" className="text-xs">
                            {qualified.groupStanding.groupName}
                          </Badge>
                          {getPositionBadge(
                            qualified.groupStanding.groupPosition
                          )}
                        </div>
                      </td>
                      <td className="text-center p-3">
                        <span
                          className={`font-bold text-lg ${
                            isTopSeed
                              ? "text-yellow-600"
                              : isGoodSeed
                              ? "text-blue-600"
                              : "text-gray-600"
                          }`}
                        >
                          {qualified.groupStanding.points}
                        </span>
                      </td>
                      <td className="text-center p-3 font-medium">
                        {qualified.groupStanding.matchesPlayed}
                      </td>
                      <td className="text-center p-3">
                        <span className="font-medium text-green-600">
                          {qualified.groupStanding.matchesWon}
                        </span>
                        <span className="text-gray-400">-</span>
                        <span className="text-red-500">
                          {qualified.groupStanding.matchesLost}
                        </span>
                      </td>
                      <td className="text-center p-3">
                        <div className="space-y-1">
                          <div className="text-sm">
                            <span className="text-green-600 font-medium">
                              {qualified.groupStanding.setsWon}
                            </span>
                            <span className="text-gray-400 mx-1">-</span>
                            <span className="text-red-500">
                              {qualified.groupStanding.setsLost}
                            </span>
                          </div>
                          <div className="text-xs text-gray-500">
                            ({qualified.groupStanding.setsDiff > 0 ? "+" : ""}
                            {qualified.groupStanding.setsDiff})
                          </div>
                        </div>
                      </td>
                      <td className="text-center p-3">
                        <div className="space-y-1">
                          <div className="text-sm">
                            <span className="text-green-600 font-medium">
                              {qualified.groupStanding.gamesWon}
                            </span>
                            <span className="text-gray-400 mx-1">-</span>
                            <span className="text-red-500">
                              {qualified.groupStanding.gamesLost}
                            </span>
                          </div>
                          <div className="text-xs text-gray-500">
                            ({qualified.groupStanding.gamesDiff > 0 ? "+" : ""}
                            {qualified.groupStanding.gamesDiff})
                          </div>
                        </div>
                      </td>
                      <td className="text-center p-3">
                        <Badge
                          className={
                            isTopSeed
                              ? "bg-yellow-100 text-yellow-800 border-yellow-300"
                              : isGoodSeed
                              ? "bg-blue-100 text-blue-800 border-blue-300"
                              : "bg-green-100 text-green-800 border-green-300"
                          }
                        >
                          <CheckCircle className="h-3 w-3 mr-1" />
                        </Badge>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Información y Leyenda */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Explicación del Seeding */}
          <div className="p-4 bg-blue-50 rounded-lg">
            <h4 className="font-medium text-blue-800 mb-2 flex items-center gap-2">
              <Target className="h-4 w-4" />
              Seeding de Eliminatorias
            </h4>
            <div className="text-sm text-blue-700 space-y-1">
              <p>
                <strong>Seed 1 vs Seed {qualifiedPairs.length}</strong> (mejor
                vs peor)
              </p>
              <p>
                <strong>Seed 2 vs Seed {qualifiedPairs.length - 1}</strong>
              </p>
              <p>
                <strong>Seed 3 vs Seed {qualifiedPairs.length - 2}</strong>
              </p>
              <p>Y así sucesivamente...</p>
              <p className="text-xs mt-2 text-blue-600">
                ⚡ Los mejores clasificados tienen path más fácil
              </p>
            </div>
          </div>

          {/* Leyenda */}
          <div className="p-4 bg-gray-50 rounded-lg">
            <h4 className="font-medium text-gray-700 mb-2">
              Leyenda de Estadísticas:
            </h4>
            <div className="grid grid-cols-2 gap-1 text-sm text-gray-600">
              <div>
                <strong>Pts:</strong> Puntos totales
              </div>
              <div>
                <strong>PJ:</strong> Partidos Jugados
              </div>
              <div>
                <strong>PG:</strong> Partidos Ganados
              </div>
              <div>
                <strong>Sets:</strong> Sets G-P (diferencia)
              </div>
              <div>
                <strong>Games:</strong> Games G-P (diferencia)
              </div>
              <div>
                <strong>Seed:</strong> Posición en eliminatorias
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              * Clasificación basada en: 1º Puntos, 2º Dif. Sets, 3º Dif. Games
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
