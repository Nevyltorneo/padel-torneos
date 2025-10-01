import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function HomePage() {
  return (
    <div className="home-page min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="home-container max-w-6xl mx-auto px-4 py-12">
        {/* Header */}
        <div className="home-header text-center mb-12">
          <h1 className="home-title text-4xl font-bold text-gray-900 mb-4">
            🏓 MiTorneo
          </h1>
          <p className="home-subtitle text-xl text-gray-600 max-w-2xl mx-auto">
            Gestión completa y automática de torneos de pádel. El humano solo
            captura resultados, la app se encarga del resto.
          </p>
        </div>

        {/* Features Grid */}
        <div className="home-features grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
          <Card className="home-feature-card">
            <CardHeader>
              <CardTitle className="home-feature-title flex items-center gap-2">
                ⚡ Generación Automática
              </CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription className="home-feature-description">
                Grupos balanceados, calendario round-robin y asignación dinámica
                de canchas sin intervención manual.
              </CardDescription>
            </CardContent>
          </Card>

          <Card className="home-feature-card">
            <CardHeader>
              <CardTitle className="home-feature-title flex items-center gap-2">
                📊 Tabla de Posiciones
              </CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription className="home-feature-description">
                Cálculo automático con criterios de desempate: puntos,
                diferencia de sets/games y head-to-head.
              </CardDescription>
            </CardContent>
          </Card>

          <Card className="home-feature-card">
            <CardHeader>
              <CardTitle className="home-feature-title flex items-center gap-2">
                🏆 Eliminatorias
              </CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription className="home-feature-description">
                Avance automático a cuadro eliminatorio con seeding inteligente
                y bracket de hasta 16 parejas.
              </CardDescription>
            </CardContent>
          </Card>

          <Card className="home-feature-card">
            <CardHeader>
              <CardTitle className="home-feature-title flex items-center gap-2">
                📱 Tiempo Real
              </CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription className="home-feature-description">
                Asignación automática de canchas al liberarse y actualización en
                vivo de resultados.
              </CardDescription>
            </CardContent>
          </Card>

          <Card className="home-feature-card">
            <CardHeader>
              <CardTitle className="home-feature-title flex items-center gap-2">
                🎯 Vista Pública
              </CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription className="home-feature-description">
                Scoreboard público responsive para que jugadores y espectadores
                sigan el torneo en vivo.
              </CardDescription>
            </CardContent>
          </Card>

          <Card className="home-feature-card">
            <CardHeader>
              <CardTitle className="home-feature-title flex items-center gap-2">
                ⚙️ Configuración
              </CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription className="home-feature-description">
                Configuración JSON por torneo: días, horarios, canchas, reglas.
                Todo sin tocar código.
              </CardDescription>
            </CardContent>
          </Card>
        </div>

        {/* CTA Section */}
        <div className="home-cta text-center space-y-6">
          <h2 className="home-cta-title text-2xl font-semibold text-gray-900">
            ¿Listo para organizar tu torneo?
          </h2>

          <div className="home-cta-buttons flex flex-col sm:flex-row gap-4 justify-center">
            <Button asChild size="lg" className="home-cta-admin">
              <Link href="/login">Administrar Torneo</Link>
            </Button>

            <Button
              asChild
              variant="outline"
              size="lg"
              className="home-cta-public"
            >
              <Link href="/public">Ver Torneos Públicos</Link>
            </Button>
          </div>
        </div>

        {/* Footer */}
        <div className="home-footer text-center mt-16 pt-8 border-t border-gray-200">
          <p className="home-footer-text text-sm text-gray-500">
            Desarrollado con Next.js, TypeScript, Tailwind CSS y Supabase
          </p>
        </div>
      </div>
    </div>
  );
}
