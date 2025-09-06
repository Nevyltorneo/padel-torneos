"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Trophy,
  Calendar,
  MapPin,
  Users,
  ArrowLeft,
  Clock,
  Target,
  BarChart3,
} from "lucide-react";
import { StatusBadge } from "@/components/atoms/StatusBadge";
import { PairTag } from "@/components/atoms/PairTag";
import { CourtTag } from "@/components/atoms/CourtTag";

interface PublicTournamentPageProps {
  params: {
    slug: string;
  };
}

// Mock data - esto vendría de la base de datos
const mockTournament: {
  id: string;
  name: string;
  slug: string;
  status: "active" | "registration" | "scheduled" | "in_progress" | "finished";
  location: string;
  days: string[];
  config: {
    startHour: string;
    endHour: string;
    slotMinutes: number;
  };
} | null = null;

const mockCategories: any[] = [];
const mockMatches: any[] = [];
const mockStandings: any[] = [];

export default function PublicTournamentPage({
  params: _params,
}: PublicTournamentPageProps) {
  const [activeTab, setActiveTab] = useState("overview");

  const liveMatches = mockMatches.filter((m) => m.status === "playing");
  const recentMatches = mockMatches
    .filter((m) => m.status === "finished")
    .slice(0, 5);

  return (
    <div className="public-tournament min-h-screen bg-gray-50">
      {/* Header */}
      <div className="public-tournament-header bg-white border-b">
        <div className="max-w-6xl mx-auto px-4 py-6">
          <div className="flex items-center gap-4 mb-4">
            <Button variant="ghost" size="sm" asChild>
              <Link href="/public">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Volver
              </Link>
            </Button>
          </div>

          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div className="flex-1">
              {mockTournament ? (
                <>
                  <div className="flex items-center gap-3 mb-2">
                    <Trophy className="h-6 w-6 text-blue-600" />
                    <h1 className="text-3xl font-bold text-gray-900">
                      {mockTournament.name}
                    </h1>
                    <StatusBadge status={mockTournament.status} />
                  </div>

                  <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600">
                    <div className="flex items-center gap-1">
                      <MapPin className="h-4 w-4" />
                      {mockTournament.location}
                    </div>
                    <div className="flex items-center gap-1">
                      <Calendar className="h-4 w-4" />
                      {mockTournament.days.length} días
                    </div>
                    <div className="flex items-center gap-1">
                      <Users className="h-4 w-4" />
                      {mockCategories.reduce(
                        (sum, cat) => sum + cat.pairs,
                        0
                      )}{" "}
                      parejas
                    </div>
                  </div>
                </>
              ) : (
                <div className="text-center py-8">
                  <h1 className="text-2xl font-bold text-gray-900 mb-2">
                    Torneo no encontrado
                  </h1>
                  <p className="text-gray-600">
                    El torneo que buscas no existe o ha sido eliminado.
                  </p>
                </div>
              )}
            </div>

            {liveMatches.length > 0 && (
              <Badge variant="default" className="bg-red-500 animate-pulse">
                🔴 {liveMatches.length} partido
                {liveMatches.length !== 1 ? "s" : ""} en vivo
              </Badge>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="public-tournament-content max-w-6xl mx-auto px-4 py-6">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="public-tournament-tabs grid w-full grid-cols-4">
            <TabsTrigger value="overview">Resumen</TabsTrigger>
            <TabsTrigger value="live">En Vivo</TabsTrigger>
            <TabsTrigger value="standings">Posiciones</TabsTrigger>
            <TabsTrigger value="bracket">Eliminatorias</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6 mt-6">
            {/* Categories Overview */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5" />
                  Categorías
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {mockCategories.map((category) => (
                    <div
                      key={category.id}
                      className="public-category-card p-4 border rounded-lg"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="font-medium">{category.name}</h3>
                        <StatusBadge status={category.status} />
                      </div>
                      <p className="text-sm text-gray-600">
                        {category.pairs} parejas
                      </p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Recent Results */}
            <Card>
              <CardHeader>
                <CardTitle>Resultados Recientes</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {recentMatches.map((match) => (
                    <div
                      key={match.id}
                      className="public-recent-match flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <PairTag
                          pair={match.pairA}
                          variant={
                            match.score?.winnerPairId === match.pairA.id
                              ? "default"
                              : "outline"
                          }
                        />
                        <span className="text-sm text-gray-500">vs</span>
                        <PairTag
                          pair={match.pairB}
                          variant={
                            match.score?.winnerPairId === match.pairB.id
                              ? "default"
                              : "outline"
                          }
                        />
                      </div>

                      <div className="flex items-center gap-2">
                        <CourtTag court={match.court} />
                        <span className="text-sm text-gray-500">
                          {match.startTime}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="live" className="space-y-6 mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Partidos en Vivo
                </CardTitle>
                <CardDescription>
                  Sigue los partidos que se están jugando ahora
                </CardDescription>
              </CardHeader>
              <CardContent>
                {liveMatches.length > 0 ? (
                  <div className="space-y-4">
                    {liveMatches.map((match) => (
                      <div
                        key={match.id}
                        className="public-live-match p-4 border border-red-200 bg-red-50 rounded-lg"
                      >
                        <div className="flex items-center justify-between mb-3">
                          <Badge variant="default" className="bg-red-500">
                            🔴 EN VIVO
                          </Badge>
                          <div className="flex items-center gap-2">
                            <CourtTag
                              court={match.court as any}
                              status="occupied"
                            />
                            <span className="text-sm text-gray-600">
                              {match.startTime}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center justify-center gap-4">
                          <PairTag pair={match.pairA as any} />
                          <span className="text-lg font-bold">VS</span>
                          <PairTag pair={match.pairB as any} />
                        </div>

                        <div className="text-center mt-3">
                          <span className="text-sm text-gray-600">
                            {match.stage} • Categoría:{" "}
                            {
                              mockCategories.find(
                                (c) => c.id === match.categoryId
                              )?.name
                            }
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Clock className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600">
                      No hay partidos en vivo en este momento
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="standings" className="space-y-6 mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Tabla de Posiciones
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left p-2">Pos</th>
                        <th className="text-left p-2">Pareja</th>
                        <th className="text-center p-2">PJ</th>
                        <th className="text-center p-2">G</th>
                        <th className="text-center p-2">P</th>
                        <th className="text-center p-2">Pts</th>
                        <th className="text-center p-2">Diff</th>
                      </tr>
                    </thead>
                    <tbody>
                      {mockStandings.map((standing, index) => (
                        <tr key={standing.pairId} className="border-b">
                          <td className="p-2 font-medium">{index + 1}</td>
                          <td className="p-2">
                            <PairTag
                              pair={standing.pair as any}
                              variant="outline"
                            />
                          </td>
                          <td className="text-center p-2">
                            {standing.matchesPlayed}
                          </td>
                          <td className="text-center p-2">{standing.wins}</td>
                          <td className="text-center p-2">{standing.losses}</td>
                          <td className="text-center p-2 font-bold">
                            {standing.points}
                          </td>
                          <td className="text-center p-2">
                            {standing.setsDiff > 0 ? "+" : ""}
                            {standing.setsDiff}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="bracket" className="space-y-6 mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Cuadro Eliminatorio</CardTitle>
                <CardDescription>
                  Las eliminatorias comenzarán una vez completada la fase de
                  grupos
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-12">
                  <Trophy className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600">
                    El cuadro eliminatorio se mostrará aquí una vez que termine
                    la fase de grupos
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
