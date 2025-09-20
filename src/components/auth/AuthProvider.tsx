"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase";
import { createUserProfile } from "@/lib/supabase-queries";

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, name: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    // Get initial session
    const getSession = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      setUser(session?.user ?? null);
      setLoading(false);
    };

    getSession();

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [supabase.auth]);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) throw error;
  };

  const signUp = async (email: string, password: string, name: string) => {
    console.log("🔄 Iniciando registro de usuario:", { email, name });

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: name, // Usar full_name como indica el schema
        },
      },
    });

    if (error) {
      console.error("❌ Error en supabase.auth.signUp:", error);
      console.error("❌ Detalles del error:", {
        message: error.message,
        status: error.status,
        name: error.name,
      });
      throw error;
    }

    console.log(
      "✅ Usuario registrado exitosamente en auth.users:",
      data.user?.id
    );

    // Crear perfil manualmente como respaldo por si el trigger falla
    if (data.user) {
      try {
        console.log("🔄 Intentando crear perfil manualmente...");
        await createUserProfile({
          id: data.user.id,
          email: data.user.email,
          user_metadata: data.user.user_metadata || {},
        });
        console.log("✅ Perfil de usuario creado exitosamente (manual)");
      } catch (profileError) {
        console.error("⚠️ Error creando perfil manualmente:", profileError);
        // No lanzar error para no interrumpir el flujo si el trigger ya funcionó
        console.log(
          "ℹ️  Continuando sin perfil manual - quizás el trigger automático ya lo creó"
        );
      }
    }
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  };

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signUp, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
