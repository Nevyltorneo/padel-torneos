"use client";

import React from "react";
import { useUserRole } from "@/hooks/useUserRole";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Shield, Lock, AlertTriangle, ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import type { UserRole, RolePermissions } from "@/types";

interface PermissionGuardProps {
  children: React.ReactNode;
  requiredPermission?: keyof RolePermissions;
  requiredRole?: UserRole;
  minimumRole?: UserRole;
  fallback?: React.ReactNode;
  showFallback?: boolean;
}

export function PermissionGuard({
  children,
  requiredPermission,
  requiredRole,
  minimumRole,
  fallback,
  showFallback = true,
}: PermissionGuardProps) {
  const { userContext, isLoading, hasPermission, hasRole, hasMinimumRole } =
    useUserRole();
  const router = useRouter();

  // Mostrar loading mientras se carga el contexto
  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <Shield className="h-8 w-8 mx-auto mb-2 animate-pulse text-blue-500" />
          <p className="text-sm text-gray-500">Verificando permisos...</p>
        </div>
      </div>
    );
  }

  // Verificar si el usuario está autenticado
  if (!userContext?.user) {
    if (!showFallback) return null;

    return (
      fallback || (
        <Card className="max-w-md mx-auto mt-8">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Lock className="h-5 w-5 text-red-500" />
              <CardTitle className="text-lg">Acceso Restringido</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-gray-600">
              Necesitas iniciar sesión para acceder a esta sección.
            </p>
            <Button onClick={() => router.push("/login")} className="w-full">
              Iniciar Sesión
            </Button>
          </CardContent>
        </Card>
      )
    );
  }

  // Verificar permisos específicos
  let hasAccess = true;
  let denialReason = "";

  if (requiredPermission && !hasPermission(requiredPermission)) {
    hasAccess = false;
    denialReason = `No tienes el permiso requerido: ${requiredPermission}`;
  }

  if (requiredRole && !hasRole(requiredRole)) {
    hasAccess = false;
    denialReason = `Necesitas el rol: ${requiredRole}`;
  }

  if (minimumRole && !hasMinimumRole(minimumRole)) {
    hasAccess = false;
    denialReason = `Necesitas al menos el rol: ${minimumRole}`;
  }

  // Si no tiene acceso, mostrar mensaje de denegación
  if (!hasAccess) {
    if (!showFallback) return null;

    return (
      fallback || (
        <Card className="max-w-md mx-auto mt-8">
          <CardHeader>
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              <CardTitle className="text-lg">Permisos Insuficientes</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <p className="text-sm text-gray-600">
                No tienes permisos para acceder a esta sección.
              </p>
              <p className="text-xs text-gray-500">{denialReason}</p>
              <div className="text-xs text-gray-400 bg-gray-50 p-2 rounded">
                <strong>Tu rol actual:</strong> {userContext.role || "Sin rol"}
                <br />
                <strong>Torneo:</strong>{" "}
                {userContext.currentTournament?.name || "Ninguno seleccionado"}
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => router.back()}
                className="flex-1"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Volver
              </Button>
              <Button onClick={() => router.push("/admin")} className="flex-1">
                Dashboard
              </Button>
            </div>
          </CardContent>
        </Card>
      )
    );
  }

  // Si tiene acceso, renderizar los children
  return <>{children}</>;
}

// Componente específico para proteger rutas de administración
export function AdminGuard({ children }: { children: React.ReactNode }) {
  return <PermissionGuard minimumRole="admin">{children}</PermissionGuard>;
}

// Componente específico para proteger rutas de propietarios
export function OwnerGuard({ children }: { children: React.ReactNode }) {
  return <PermissionGuard requiredRole="owner">{children}</PermissionGuard>;
}

// Componente para mostrar/ocultar elementos basado en permisos
interface ConditionalRenderProps {
  children: React.ReactNode;
  requiredPermission?: keyof RolePermissions;
  requiredRole?: UserRole;
  minimumRole?: UserRole;
  fallback?: React.ReactNode;
}

export function ConditionalRender({
  children,
  requiredPermission,
  requiredRole,
  minimumRole,
  fallback = null,
}: ConditionalRenderProps) {
  return (
    <PermissionGuard
      requiredPermission={requiredPermission}
      requiredRole={requiredRole}
      minimumRole={minimumRole}
      fallback={fallback}
      showFallback={false}
    >
      {children}
    </PermissionGuard>
  );
}
