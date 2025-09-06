import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Trophy, Calendar, Users, MapPin, ArrowRight } from "lucide-react";
import { StatusBadge } from "@/components/atoms/StatusBadge";

// Mock data - esto vendría de la base de datos
const publicTournaments: any[] = [];

export default function PublicTournamentsPage() {
  return (
    <div className="public-tournaments min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="public-tournaments-container max-w-6xl mx-auto px-4 py-12">
        {/* Header */}
        <div className="public-tournaments-header text-center mb-12">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Trophy className="h-8 w-8 text-blue-600" />
            <h1 className="text-4xl font-bold text-gray-900">
              Torneos en Vivo
            </h1>
          </div>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Sigue los resultados en tiempo real de todos los torneos de pádel
          </p>
        </div>

        {/* Quick Stats */}
        <div className="public-tournaments-stats grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="public-stat bg-white rounded-lg p-4 text-center shadow-sm">
            <div className="text-2xl font-bold text-blue-600">
              {publicTournaments.length}
            </div>
            <div className="text-sm text-gray-600">Torneos Activos</div>
          </div>
          <div className="public-stat bg-white rounded-lg p-4 text-center shadow-sm">
            <div className="text-2xl font-bold text-green-600">
              {publicTournaments.reduce((sum, t) => sum + t.pairs, 0)}
            </div>
            <div className="text-sm text-gray-600">Parejas Participando</div>
          </div>
          <div className="public-stat bg-white rounded-lg p-4 text-center shadow-sm">
            <div className="text-2xl font-bold text-purple-600">
              {
                publicTournaments.filter((t) => t.status === "in_progress")
                  .length
              }
            </div>
            <div className="text-sm text-gray-600">En Curso</div>
          </div>
        </div>

        {/* Tournaments Grid */}
        <div className="public-tournaments-grid grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {publicTournaments.map((tournament) => (
            <PublicTournamentCard key={tournament.id} tournament={tournament} />
          ))}
        </div>

        {/* Footer */}
        <div className="public-tournaments-footer text-center pt-8 border-t border-gray-200">
          <p className="text-gray-600 mb-4">¿Organizas torneos de pádel?</p>
          <Button asChild>
            <Link href="/admin">
              <Trophy className="h-4 w-4 mr-2" />
              Crear Tu Torneo
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}

interface PublicTournamentCardProps {
  tournament: {
    id: string;
    name: string;
    slug: string;
    status:
      | "active"
      | "registration"
      | "scheduled"
      | "in_progress"
      | "finished";
    days: string[];
    courts: number;
    categories: number;
    pairs: number;
    location: string;
  };
}

function PublicTournamentCard({ tournament }: PublicTournamentCardProps) {
  const formatDates = (days: string[]) => {
    if (days.length === 1) {
      return new Date(days[0]).toLocaleDateString("es-ES", {
        day: "numeric",
        month: "short",
      });
    }
    const start = new Date(days[0]).toLocaleDateString("es-ES", {
      day: "numeric",
      month: "short",
    });
    const end = new Date(days[days.length - 1]).toLocaleDateString("es-ES", {
      day: "numeric",
      month: "short",
    });
    return `${start} - ${end}`;
  };

  return (
    <Card className="public-tournament-card hover:shadow-lg transition-shadow bg-white">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between mb-2">
          <StatusBadge status={tournament.status} />
          {tournament.status === "in_progress" && (
            <Badge variant="default" className="bg-red-500 animate-pulse">
              EN VIVO
            </Badge>
          )}
        </div>

        <CardTitle className="public-tournament-title text-lg leading-tight">
          {tournament.name}
        </CardTitle>

        <CardDescription className="public-tournament-location flex items-center gap-1">
          <MapPin className="h-3 w-3" />
          {tournament.location}
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Tournament Info */}
        <div className="public-tournament-info grid grid-cols-2 gap-3 text-sm">
          <div className="flex items-center gap-2 text-gray-600">
            <Calendar className="h-4 w-4" />
            <span>{formatDates(tournament.days)}</span>
          </div>

          <div className="flex items-center gap-2 text-gray-600">
            <Users className="h-4 w-4" />
            <span>{tournament.pairs} parejas</span>
          </div>

          <div className="flex items-center gap-2 text-gray-600">
            <Trophy className="h-4 w-4" />
            <span>{tournament.categories} categorías</span>
          </div>

          <div className="flex items-center gap-2 text-gray-600">
            <MapPin className="h-4 w-4" />
            <span>{tournament.courts} canchas</span>
          </div>
        </div>

        {/* Action */}
        <Button className="public-tournament-view w-full" asChild>
          <Link href={`/public/t/${tournament.slug}`}>
            Ver Torneo
            <ArrowRight className="h-4 w-4 ml-2" />
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}
