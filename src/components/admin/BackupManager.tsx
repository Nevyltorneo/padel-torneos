/**
 * COMPONENTE DE GESTIÓN DE BACKUPS
 * 
 * Interfaz para crear, ver y restaurar backups de torneos
 */

"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Download,
  Upload,
  Trash2,
  History,
  Shield,
  Clock,
  Database,
  AlertTriangle,
} from "lucide-react";
import { TournamentBackupManager, TournamentBackup } from "@/lib/backup/TournamentBackupManager";
import { useCurrentTournament } from "@/hooks/useCurrentTournament";
import { toast } from "sonner";

interface BackupManagerProps {
  className?: string;
}

export function BackupManager({ className }: BackupManagerProps) {
  const currentTournament = useCurrentTournament();
  const [backups, setBackups] = useState<TournamentBackup[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isCreatingBackup, setIsCreatingBackup] = useState(false);
  const [stats, setStats] = useState<any>(null);

  // Estados para crear backup manual
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [backupDescription, setBackupDescription] = useState("");

  useEffect(() => {
    if (currentTournament) {
      loadBackups();
      loadStats();
    }
  }, [currentTournament]);

  const loadBackups = async () => {
    if (!currentTournament) return;

    try {
      setIsLoading(true);
      const tournamentBackups = await TournamentBackupManager.getTournamentBackups(currentTournament.id);
      setBackups(tournamentBackups);
    } catch (error) {
      console.error("Error loading backups:", error);
      toast.error("Error al cargar backups");
    } finally {
      setIsLoading(false);
    }
  };

  const loadStats = async () => {
    if (!currentTournament) return;

    try {
      const backupStats = await TournamentBackupManager.getBackupStats(currentTournament.id);
      setStats(backupStats);
    } catch (error) {
      console.error("Error loading backup stats:", error);
    }
  };

  const handleCreateBackup = async () => {
    if (!currentTournament) return;

    try {
      setIsCreatingBackup(true);
      
      const backupId = await TournamentBackupManager.createBackup(currentTournament.id, {
        type: 'MANUAL',
        description: backupDescription || undefined,
        createdBy: 'user', // TODO: Obtener ID del usuario actual
        maxBackupsToKeep: 5
      });

      toast.success("Backup creado exitosamente");
      setBackupDescription("");
      setIsCreateDialogOpen(false);
      loadBackups();
      loadStats();
    } catch (error) {
      console.error("Error creating backup:", error);
      toast.error("Error al crear backup");
    } finally {
      setIsCreatingBackup(false);
    }
  };

  const handleDeleteBackup = async (backupId: string) => {
    if (!confirm("¿Estás seguro de que quieres eliminar este backup?")) {
      return;
    }

    try {
      await TournamentBackupManager.deleteBackup(backupId);
      toast.success("Backup eliminado");
      loadBackups();
      loadStats();
    } catch (error) {
      console.error("Error deleting backup:", error);
      toast.error("Error al eliminar backup");
    }
  };

  const handleRestoreBackup = async (backupId: string) => {
    if (!confirm("¿Estás seguro de que quieres restaurar este backup? Esto reemplazará todos los datos actuales.")) {
      return;
    }

    try {
      await TournamentBackupManager.restoreFromBackup(backupId);
      toast.success("Backup restaurado exitosamente");
      loadBackups();
    } catch (error) {
      console.error("Error restoring backup:", error);
      toast.error("Error al restaurar backup");
    }
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'AUTO':
        return <Shield className="h-4 w-4" />;
      case 'MANUAL':
        return <Database className="h-4 w-4" />;
      case 'BEFORE_CHANGE':
        return <History className="h-4 w-4" />;
      default:
        return <Database className="h-4 w-4" />;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'AUTO':
        return 'bg-blue-100 text-blue-800';
      case 'MANUAL':
        return 'bg-green-100 text-green-800';
      case 'BEFORE_CHANGE':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (!currentTournament) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>Gestión de Backups</CardTitle>
          <CardDescription>Selecciona un torneo para gestionar sus backups</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-gray-500">No hay torneo seleccionado</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={className}>
      {/* Estadísticas */}
      {stats && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              Estadísticas de Backups
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{stats.totalBackups}</div>
                <div className="text-sm text-gray-600">Total Backups</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{formatFileSize(stats.totalSize)}</div>
                <div className="text-sm text-gray-600">Tamaño Total</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">{stats.byType.MANUAL || 0}</div>
                <div className="text-sm text-gray-600">Manuales</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-600">{stats.byType.AUTO || 0}</div>
                <div className="text-sm text-gray-600">Automáticos</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Acciones */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Gestión de Backups - {currentTournament.name}</CardTitle>
          <CardDescription>
            Crea y gestiona backups de seguridad para este torneo
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Database className="h-4 w-4 mr-2" />
                  Crear Backup
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Crear Backup Manual</DialogTitle>
                  <DialogDescription>
                    Crea un backup completo del torneo actual
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="description">Descripción (opcional)</Label>
                    <Textarea
                      id="description"
                      placeholder="Ej: Backup antes de cambios importantes..."
                      value={backupDescription}
                      onChange={(e) => setBackupDescription(e.target.value)}
                    />
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button 
                      variant="outline" 
                      onClick={() => setIsCreateDialogOpen(false)}
                    >
                      Cancelar
                    </Button>
                    <Button 
                      onClick={handleCreateBackup}
                      disabled={isCreatingBackup}
                    >
                      {isCreatingBackup ? "Creando..." : "Crear Backup"}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>

            <Button variant="outline" onClick={loadBackups} disabled={isLoading}>
              <Clock className="h-4 w-4 mr-2" />
              {isLoading ? "Cargando..." : "Actualizar"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Lista de Backups */}
      <Card>
        <CardHeader>
          <CardTitle>Historial de Backups</CardTitle>
          <CardDescription>
            Lista de todos los backups disponibles para este torneo
          </CardDescription>
        </CardHeader>
        <CardContent>
          {backups.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Database className="h-12 w-12 mx-auto mb-4 text-gray-400" />
              <p>No hay backups disponibles</p>
              <p className="text-sm">Crea tu primer backup para empezar</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Descripción</TableHead>
                  <TableHead>Datos</TableHead>
                  <TableHead>Tamaño</TableHead>
                  <TableHead>Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {backups.map((backup) => (
                  <TableRow key={backup.id}>
                    <TableCell>
                      <Badge className={getTypeColor(backup.type)}>
                        <span className="flex items-center gap-1">
                          {getTypeIcon(backup.type)}
                          {backup.type}
                        </span>
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        {formatDate(backup.createdAt)}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm max-w-xs truncate">
                        {backup.description || 'Sin descripción'}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <div>Parejas: {backup.metadata.totalPairs}</div>
                        <div>Grupos: {backup.metadata.totalGroups}</div>
                        <div>Partidos: {backup.metadata.totalMatches}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        {formatFileSize(backup.metadata.dataSize)}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleRestoreBackup(backup.id)}
                          title="Restaurar backup"
                        >
                          <Upload className="h-3 w-3" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDeleteBackup(backup.id)}
                          title="Eliminar backup"
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
