import { Metadata } from "next";
import { getAllCategories } from "@/lib/supabase-queries";

interface LiveLayoutProps {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({
  params,
}: LiveLayoutProps): Promise<Metadata> {
  const resolvedParams = await params;
  const { slug } = resolvedParams;

  try {
    // Obtener todas las categorías para encontrar la que coincide con el slug
    const categories = await getAllCategories();
    const category = categories.find((c) => c.slug === slug);

    if (!category) {
      return {
        title: "Categoría no encontrada - MiTorneo",
        description: "La categoría solicitada no existe o no está disponible.",
      };
    }

    return {
      title: `Vista en Tiempo Real - ${category.name} | MiTorneo`,
      description: `Sigue el progreso de la categoría ${category.name} en tiempo real. Ve resultados, posiciones y partidos en vivo.`,
      openGraph: {
        title: `Vista en Tiempo Real - ${category.name}`,
        description: `Sigue el progreso de la categoría ${category.name} en tiempo real. Ve resultados, posiciones y partidos en vivo.`,
        type: "website",
        siteName: "MiTorneo - Gestión de Torneos de Pádel",
        images: [
          {
            url: "/og-image.png",
            width: 1200,
            height: 630,
            alt: `Vista en Tiempo Real - ${category.name}`,
          },
        ],
      },
      twitter: {
        card: "summary_large_image",
        title: `Vista en Tiempo Real - ${category.name}`,
        description: `Sigue el progreso de la categoría ${category.name} en tiempo real.`,
        images: ["/og-image.png"],
      },
      icons: {
        icon: "/mito-favicon.ico",
        apple: "/apple-touch-icon.png",
      },
    };
  } catch (error) {
    console.error("Error generating metadata:", error);
    return {
      title: "Vista en Tiempo Real - MiTorneo",
      description: "Sigue el progreso de tu categoría en tiempo real.",
    };
  }
}

export default function LiveLayout({ children }: LiveLayoutProps) {
  return <>{children}</>;
}
