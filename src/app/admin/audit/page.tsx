"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { PermissionGuard } from "@/components/auth/PermissionGuard";
import {
  Shield,
  Search,
  Filter,
  Calendar,
  User,
  Settings,
  Trash2,
  Edit,
  Plus,
  Eye,
  RefreshCw,
  Download,
  AlertTriangle,
} from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { toast } from "sonner";
import { useTournamentStore } from "@/stores/tournament-store";
import { getAuditLogs } from "@/lib/supabase-queries";
import type { AuditLog } from "@/types";

const actionIcons: Record<string, any> = {
  tournament_created: Plus,
  tournament_updated: Edit,
  tournament_deleted: Trash2,
  category_created: Plus,
  category_updated: Edit,
  category_deleted: Trash2,
  pair_created: Plus,
  pair_updated: Edit,
  pair_deleted: Trash2,
  group_generated: Settings,
  match_created: Plus,
  match_updated: Edit,
  score_updated: Edit,
  role_assigned: Shield,
  role_revoked: Trash2,
  user_profile_updated: User,
  default: Eye,
};

const actionLabels: Record<string, string> = {
  tournament_created: "Torneo creado",
  tournament_updated: "Torneo actualizado",
  tournament_deleted: "Torneo eliminado",
  category_created: "Categoría creada",
  category_updated: "Categoría actualizada",
  category_deleted: "Categoría eliminada",
  pair_created: "Pareja creada",
  pair_updated: "Pareja actualizada",
  pair_deleted: "Pareja eliminada",
  group_generated: "Grupos generados",
  match_created: "Partido creado",
  match_updated: "Partido actualizado",
  score_updated: "Resultado actualizado",
  role_assigned: "Rol asignado",
  role_revoked: "Rol revocado",
  user_profile_updated: "Perfil actualizado",
};

export default function AuditPage() {
  const { currentTournament } = useTournamentStore();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [filteredLogs, setFilteredLogs] = useState<AuditLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [actionFilter, setActionFilter] = useState<string>("all");
  const [limit, setLimit] = useState(50);

  // Cargar logs de auditoría
  const loadLogs = async () => {
    try {
      setIsLoading(true);
      const auditLogs = await getAuditLogs(currentTournament?.id, limit);
      setLogs(auditLogs);
      setFilteredLogs(auditLogs);
    } catch (error) {
      console.error("Error loading audit logs:", error);
      toast.error("Error al cargar los logs de auditoría");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadLogs();
  }, [currentTournament, limit]);

  // Filtrar logs
  useEffect(() => {
    let filtered = logs;

    // Filtrar por búsqueda
    if (searchTerm) {
      filtered = filtered.filter(
        (log) =>
          log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (actionLabels[log.action] || log.action)
            .toLowerCase()
            .includes(searchTerm.toLowerCase())
      );
    }

    // Filtrar por acción
    if (actionFilter !== "all") {
      filtered = filtered.filter((log) => log.action.includes(actionFilter));
    }

    setFilteredLogs(filtered);
  }, [logs, searchTerm, actionFilter]);

  // Obtener icono de acción
  const getActionIcon = (action: string) => {
    const IconComponent = actionIcons[action] || actionIcons.default;
    return <IconComponent className="h-4 w-4" />;
  };

  // Obtener label de acción
  const getActionLabel = (action: string) => {
    return (
      actionLabels[action] ||
      action.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())
    );
  };

  // Obtener color de badge por tipo de acción
  const getActionColor = (action: string) => {
    if (action.includes("created")) return "bg-green-100 text-green-800";
    if (action.includes("updated")) return "bg-blue-100 text-blue-800";
    if (action.includes("deleted")) return "bg-red-100 text-red-800";
    if (action.includes("role")) return "bg-purple-100 text-purple-800";
    return "bg-gray-100 text-gray-800";
  };

  // Exportar logs (simulado)
  const handleExport = () => {
    const csvContent = [
      "Fecha,Acción,Usuario,Detalles",
      ...filteredLogs.map((log) =>
        [
          format(new Date(log.createdAt), "dd/MM/yyyy HH:mm", { locale: es }),
          getActionLabel(log.action),
          log.userId,
          JSON.stringify(log.details || {}),
        ].join(",")
      ),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `audit-logs-${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click();
    URL.revokeObjectURL(url);

    toast.success("Logs exportados correctamente");
  };

  return (
    <PermissionGuard requiredPermission="canViewAuditLogs">
      <div className="container mx-auto py-6 space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Logs de Auditoría</h1>
          <p className="text-gray-600 mt-2">
            Historial completo de acciones realizadas en el sistema
          </p>
        </div>

        {/* Filtros y controles */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Filtros</span>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={loadLogs}>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Actualizar
                </Button>
                <Button variant="outline" size="sm" onClick={handleExport}>
                  <Download className="h-4 w-4 mr-2" />
                  Exportar
                </Button>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Buscar acciones..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>

              <Select value={actionFilter} onValueChange={setActionFilter}>
                <SelectTrigger>
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Filtrar por tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas las acciones</SelectItem>
                  <SelectItem value="tournament">Torneos</SelectItem>
                  <SelectItem value="category">Categorías</SelectItem>
                  <SelectItem value="pair">Parejas</SelectItem>
                  <SelectItem value="match">Partidos</SelectItem>
                  <SelectItem value="role">Roles</SelectItem>
                  <SelectItem value="user">Usuarios</SelectItem>
                </SelectContent>
              </Select>

              <Select
                value={limit.toString()}
                onValueChange={(value) => setLimit(parseInt(value))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="25">25 registros</SelectItem>
                  <SelectItem value="50">50 registros</SelectItem>
                  <SelectItem value="100">100 registros</SelectItem>
                  <SelectItem value="200">200 registros</SelectItem>
                </SelectContent>
              </Select>

              <Badge
                variant="secondary"
                className="flex items-center justify-center"
              >
                {filteredLogs.length} registro
                {filteredLogs.length !== 1 ? "s" : ""}
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Lista de logs */}
        <div className="space-y-3">
          {isLoading ? (
            <Card>
              <CardContent className="flex items-center justify-center py-8">
                <div className="text-center">
                  <RefreshCw className="h-8 w-8 mx-auto mb-2 animate-spin text-blue-500" />
                  <p className="text-sm text-gray-500">Cargando logs...</p>
                </div>
              </CardContent>
            </Card>
          ) : filteredLogs.length === 0 ? (
            <Card>
              <CardContent className="flex items-center justify-center py-8">
                <div className="text-center">
                  <AlertTriangle className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                  <p className="text-gray-600">No se encontraron logs</p>
                  <p className="text-sm text-gray-500 mt-1">
                    Intenta ajustar los filtros o crear alguna actividad
                  </p>
                </div>
              </CardContent>
            </Card>
          ) : (
            filteredLogs.map((log) => (
              <Card key={log.id}>
                <CardContent className="p-4">
                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0 mt-1">
                      <div className="p-2 bg-gray-100 rounded-lg">
                        {getActionIcon(log.action)}
                      </div>
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge className={getActionColor(log.action)}>
                          {getActionLabel(log.action)}
                        </Badge>
                        <span className="text-sm text-gray-500">
                          {format(
                            new Date(log.createdAt),
                            "dd/MM/yyyy 'a las' HH:mm",
                            { locale: es }
                          )}
                        </span>
                      </div>

                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <Avatar className="h-6 w-6">
                            <AvatarFallback className="text-xs">
                              {log.userId.charAt(0).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <span className="text-sm font-medium">
                            Usuario: {log.userId}
                          </span>
                        </div>

                        {log.resourceType && (
                          <p className="text-sm text-gray-600">
                            <strong>Recurso:</strong> {log.resourceType}
                            {log.resourceId && ` (${log.resourceId})`}
                          </p>
                        )}

                        {log.details && Object.keys(log.details).length > 0 && (
                          <div className="text-sm text-gray-600 bg-gray-50 p-2 rounded">
                            <strong>Detalles:</strong>
                            <pre className="mt-1 text-xs whitespace-pre-wrap">
                              {JSON.stringify(log.details, null, 2)}
                            </pre>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </PermissionGuard>
  );
}
