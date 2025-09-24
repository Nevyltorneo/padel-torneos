import { Metadata } from "next";
import { getAllCategories } from "@/lib/supabase-queries";

interface HorariosLayoutProps {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({
  params,
}: HorariosLayoutProps): Promise<Metadata> {
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
      title: `Horarios - ${category.name} | MiTorneo`,
      description: `Consulta los horarios y partidos programados para la categoría ${category.name}.`,
      openGraph: {
        title: `Horarios - ${category.name}`,
        description: `Consulta los horarios y partidos programados para la categoría ${category.name}.`,
        type: "website",
        siteName: "MiTorneo - Gestión de Torneos de Pádel",
        images: [
          {
            url: "/og-image.png",
            width: 1200,
            height: 630,
            alt: `Horarios - ${category.name}`,
          },
        ],
      },
      twitter: {
        card: "summary_large_image",
        title: `Horarios - ${category.name}`,
        description: `Consulta los horarios y partidos programados para la categoría ${category.name}.`,
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
      title: "Horarios - MiTorneo",
      description: "Consulta los horarios y partidos programados.",
    };
  }
}

export default function HorariosLayout({ children }: HorariosLayoutProps) {
  return <>{children}</>;
}
