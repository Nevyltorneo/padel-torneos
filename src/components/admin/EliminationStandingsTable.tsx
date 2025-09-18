"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Trophy, Medal, Crown, Users, Play, TrendingUp } from "lucide-react";
import { useEliminationStandings } from "@/hooks/useEliminationStandings";

interface EliminationStandingsTableProps {
  categoryId: string;
}

export function EliminationStandingsTable({
  categoryId,
}: EliminationStandingsTableProps) {
  const { standings, isLoading, lastUpdate } = useEliminationStandings({
    categoryId,
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-amber-600" />
            Tabla General de Eliminatorias
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

  if (standings.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-amber-600" />
            Tabla General de Eliminatorias
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-gray-500">
            <Users className="h-12 w-12 mx-auto mb-4 text-gray-300" />
            <p>No hay parejas clasificadas a eliminatorias</p>
            <p className="text-sm">
              Completa la fase de grupos para ver las parejas clasificadas
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "champion":
        return (
          <Badge className="bg-yellow-100 text-yellow-800 border-yellow-300">
            <Crown className="h-3 w-3 mr-1" />
            Campeón
          </Badge>
        );
      case "runner_up":
        return (
          <Badge className="bg-gray-100 text-gray-800 border-gray-300">
            <Medal className="h-3 w-3 mr-1" />
            Subcampeón
          </Badge>
        );
      case "third_place":
        return (
          <Badge className="bg-orange-100 text-orange-800 border-orange-300">
            <Trophy className="h-3 w-3 mr-1" />
            3er Lugar
          </Badge>
        );
      case "active":
        return (
          <Badge className="bg-green-100 text-green-800 border-green-300">
            <Play className="h-3 w-3 mr-1" />
            En competencia
          </Badge>
        );
      case "eliminated":
        return (
          <Badge className="bg-red-100 text-red-800 border-red-300">
            Eliminado
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getTrophyIcon = (index: number, status: string) => {
    if (status === "champion") return "🥇";
    if (status === "runner_up") return "🥈";
    if (status === "third_place") return "🥉";
    return null;
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-amber-600" />
            Tabla General de Eliminatorias
          </CardTitle>
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <TrendingUp className="h-4 w-4" />
            <span>{standings.length} parejas clasificadas</span>
          </div>
        </div>
        <p className="text-sm text-gray-600">
          Mejores 2 parejas de cada grupo • Actualizado:{" "}
          {lastUpdate.toLocaleTimeString()}
        </p>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b bg-gray-50">
                <th className="text-left p-3 font-semibold text-gray-700">
                  Pos
                </th>
                <th className="text-left p-3 font-semibold text-gray-700">
                  Pareja
                </th>
                <th className="text-left p-3 font-semibold text-gray-700">
                  Origen
                </th>
                <th className="text-center p-3 font-semibold text-gray-700">
                  PJ
                </th>
                <th className="text-center p-3 font-semibold text-gray-700">
                  PG
                </th>
                <th className="text-center p-3 font-semibold text-gray-700">
                  Pts
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
              {standings.map((standing, index) => {
                const trophy = getTrophyIcon(index, standing.eliminationStatus);
                const isTopThree = [
                  "champion",
                  "runner_up",
                  "third_place",
                ].includes(standing.eliminationStatus);

                return (
                  <tr
                    key={standing.pair.id}
                    className={`border-b hover:bg-gray-50 ${
                      isTopThree
                        ? "bg-gradient-to-r from-amber-50 to-transparent"
                        : ""
                    }`}
                  >
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        {trophy && <span className="text-lg">{trophy}</span>}
                        <span className="font-medium text-gray-900">
                          {index + 1}
                        </span>
                      </div>
                    </td>
                    <td className="p-3">
                      <div>
                        <p className="font-medium text-gray-900">
                          {standing.pair.player1.name}
                        </p>
                        <p className="font-medium text-gray-900">
                          {standing.pair.player2.name}
                        </p>
                      </div>
                    </td>
                    <td className="p-3">
                      <Badge variant="outline" className="text-xs">
                        {standing.groupPosition}
                      </Badge>
                    </td>
                    <td className="text-center p-3 font-medium">
                      {standing.matchesPlayed}
                    </td>
                    <td className="text-center p-3">
                      <span className="font-medium text-green-600">
                        {standing.matchesWon}
                      </span>
                    </td>
                    <td className="text-center p-3">
                      <span className="font-bold text-blue-600">
                        {standing.points}
                      </span>
                    </td>
                    <td className="text-center p-3">
                      <div className="space-y-1">
                        <div className="text-sm">
                          <span className="text-green-600 font-medium">
                            {standing.setsWon}
                          </span>
                          <span className="text-gray-400 mx-1">-</span>
                          <span className="text-red-500">
                            {standing.setsLost}
                          </span>
                        </div>
                        <div className="text-xs text-gray-500">
                          ({standing.setsDiff > 0 ? "+" : ""}
                          {standing.setsDiff})
                        </div>
                      </div>
                    </td>
                    <td className="text-center p-3">
                      <div className="space-y-1">
                        <div className="text-sm">
                          <span className="text-green-600 font-medium">
                            {standing.gamesWon}
                          </span>
                          <span className="text-gray-400 mx-1">-</span>
                          <span className="text-red-500">
                            {standing.gamesLost}
                          </span>
                        </div>
                        <div className="text-xs text-gray-500">
                          ({standing.gamesDiff > 0 ? "+" : ""}
                          {standing.gamesDiff})
                        </div>
                      </div>
                    </td>
                    <td className="text-center p-3">
                      {getStatusBadge(standing.eliminationStatus)}
                      {standing.currentStage &&
                        standing.eliminationStatus === "active" && (
                          <div className="text-xs text-gray-500 mt-1">
                            {standing.currentStage === "quarterfinal" &&
                              "Cuartos"}
                            {standing.currentStage === "semifinal" &&
                              "Semifinal"}
                            {standing.currentStage === "final" && "Final"}
                          </div>
                        )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Leyenda */}
        <div className="mt-6 p-4 bg-gray-50 rounded-lg">
          <h4 className="font-medium text-gray-700 mb-2">Leyenda:</h4>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-2 text-sm">
            <div>
              <strong>PJ:</strong> Partidos Jugados
            </div>
            <div>
              <strong>PG:</strong> Partidos Ganados
            </div>
            <div>
              <strong>Pts:</strong> Puntos (3 por victoria)
            </div>
            <div>
              <strong>Sets:</strong> Sets Ganados-Perdidos
            </div>
            <div>
              <strong>Games:</strong> Games Ganados-Perdidos
            </div>
          </div>
          <p className="text-xs text-gray-600 mt-2">
            * Solo se muestran las parejas que clasificaron de la fase de grupos
            (mejores 2 de cada grupo)
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
