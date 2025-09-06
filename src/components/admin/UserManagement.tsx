"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import {
  Users,
  UserPlus,
  Shield,
  Edit,
  Trash2,
  Crown,
  Settings,
  Eye,
  Gavel,
  Search,
  Mail,
  Phone,
  Building,
  Calendar,
  AlertTriangle,
} from "lucide-react";
import { toast } from "sonner";
import { useUserRole } from "@/hooks/useUserRole";
import { useTournamentStore } from "@/stores/tournament-store";
import {
  getTournamentUsers,
  assignRole,
  revokeRole,
  updateUserProfile,
} from "@/lib/supabase-queries";
import type { UserRole, UserRoleAssignment, UserProfile } from "@/types";

interface UserWithProfile extends UserRoleAssignment {
  profile?: UserProfile;
}

const roleConfig = {
  owner: {
    label: "Propietario",
    icon: Crown,
    color: "bg-purple-100 text-purple-800 border-purple-200",
    description: "Control total del torneo",
  },
  admin: {
    label: "Administrador",
    icon: Settings,
    color: "bg-blue-100 text-blue-800 border-blue-200",
    description: "Gestión completa del torneo",
  },
  referee: {
    label: "Árbitro",
    icon: Gavel,
    color: "bg-green-100 text-green-800 border-green-200",
    description: "Captura de resultados",
  },
  viewer: {
    label: "Espectador",
    icon: Eye,
    color: "bg-gray-100 text-gray-800 border-gray-200",
    description: "Solo visualización",
  },
};

export function UserManagement() {
  const { userContext, logUserAction, hasPermission } = useUserRole();
  const { currentTournament } = useTournamentStore();
  const [users, setUsers] = useState<UserWithProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [isAssignDialogOpen, setIsAssignDialogOpen] = useState(false);
  const [isEditProfileOpen, setIsEditProfileOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserWithProfile | null>(
    null
  );
  const [newUserEmail, setNewUserEmail] = useState("");
  const [newUserRole, setNewUserRole] = useState<UserRole>("viewer");

  // Estados para edición de perfil
  const [profileForm, setProfileForm] = useState({
    fullName: "",
    phone: "",
    organization: "",
    bio: "",
  });

  const canManageUsers = hasPermission("canManageUsers");

  // Cargar usuarios del torneo
  const loadUsers = async () => {
    if (!currentTournament) return;

    try {
      setIsLoading(true);
      const tournamentUsers = await getTournamentUsers(currentTournament.id);
      setUsers(tournamentUsers);
    } catch (error) {
      console.error("Error loading users:", error);
      toast.error("Error al cargar usuarios");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, [currentTournament]);

  // Filtrar usuarios por búsqueda
  const filteredUsers = users.filter((user) => {
    const searchLower = searchTerm.toLowerCase();
    return (
      user.profile?.fullName?.toLowerCase().includes(searchLower) ||
      user.profile?.organization?.toLowerCase().includes(searchLower) ||
      user.role.toLowerCase().includes(searchLower)
    );
  });

  // Asignar rol a usuario
  const handleAssignRole = async () => {
    if (!currentTournament || !userContext?.user.id || !newUserEmail) return;

    try {
      // Por ahora simulamos que el usuario existe
      // En una implementación real, buscarías el usuario por email
      const mockUserId = "mock-user-id"; // Esto debería venir de una búsqueda real

      await assignRole(
        mockUserId,
        currentTournament.id,
        newUserRole,
        userContext.user.id
      );

      await logUserAction("user_role_assigned", "user_role", mockUserId, {
        targetUserEmail: newUserEmail,
        assignedRole: newUserRole,
      });

      toast.success(
        `Rol ${roleConfig[newUserRole].label} asignado correctamente`
      );
      setIsAssignDialogOpen(false);
      setNewUserEmail("");
      setNewUserRole("viewer");
      loadUsers();
    } catch (error) {
      console.error("Error assigning role:", error);
      toast.error("Error al asignar rol");
    }
  };

  // Revocar rol de usuario
  const handleRevokeRole = async (user: UserWithProfile) => {
    if (!currentTournament || !userContext?.user.id) return;

    try {
      await revokeRole(user.userId, currentTournament.id);

      await logUserAction("user_role_revoked", "user_role", user.id, {
        targetUserId: user.userId,
        revokedRole: user.role,
      });

      toast.success("Rol revocado correctamente");
      loadUsers();
    } catch (error) {
      console.error("Error revoking role:", error);
      toast.error("Error al revocar rol");
    }
  };

  // Abrir diálogo de edición de perfil
  const handleEditProfile = (user: UserWithProfile) => {
    setSelectedUser(user);
    setProfileForm({
      fullName: user.profile?.fullName || "",
      phone: user.profile?.phone || "",
      organization: user.profile?.organization || "",
      bio: user.profile?.bio || "",
    });
    setIsEditProfileOpen(true);
  };

  // Actualizar perfil de usuario
  const handleUpdateProfile = async () => {
    if (!selectedUser) return;

    try {
      await updateUserProfile(selectedUser.userId, profileForm);

      await logUserAction(
        "user_profile_updated",
        "user_profile",
        selectedUser.userId,
        {
          updatedFields: Object.keys(profileForm),
        }
      );

      toast.success("Perfil actualizado correctamente");
      setIsEditProfileOpen(false);
      setSelectedUser(null);
      loadUsers();
    } catch (error) {
      console.error("Error updating profile:", error);
      toast.error("Error al actualizar perfil");
    }
  };

  if (!currentTournament) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <div className="text-center">
            <AlertTriangle className="h-12 w-12 mx-auto mb-4 text-amber-500" />
            <p className="text-gray-600">
              Selecciona un torneo para gestionar usuarios
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!canManageUsers) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <div className="text-center">
            <Shield className="h-12 w-12 mx-auto mb-4 text-red-500" />
            <p className="text-gray-600">
              No tienes permisos para gestionar usuarios
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header con búsqueda y acciones */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              <CardTitle>Gestión de Usuarios</CardTitle>
            </div>

            <Dialog
              open={isAssignDialogOpen}
              onOpenChange={setIsAssignDialogOpen}
            >
              <DialogTrigger asChild>
                <Button>
                  <UserPlus className="h-4 w-4 mr-2" />
                  Asignar Rol
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Asignar Rol a Usuario</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="email">Email del Usuario</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="usuario@ejemplo.com"
                      value={newUserEmail}
                      onChange={(e) => setNewUserEmail(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="role">Rol</Label>
                    <Select
                      value={newUserRole}
                      onValueChange={(value) =>
                        setNewUserRole(value as UserRole)
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(roleConfig).map(([role, config]) => (
                          <SelectItem key={role} value={role}>
                            <div className="flex items-center gap-2">
                              <config.icon className="h-4 w-4" />
                              {config.label}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      onClick={() => setIsAssignDialogOpen(false)}
                      className="flex-1"
                    >
                      Cancelar
                    </Button>
                    <Button onClick={handleAssignRole} className="flex-1">
                      Asignar Rol
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Buscar usuarios..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Badge variant="secondary">
              {filteredUsers.length} usuario
              {filteredUsers.length !== 1 ? "s" : ""}
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Lista de usuarios */}
      <div className="grid gap-4">
        {isLoading ? (
          <Card>
            <CardContent className="flex items-center justify-center py-8">
              <div className="text-center">
                <Users className="h-8 w-8 mx-auto mb-2 animate-pulse text-blue-500" />
                <p className="text-sm text-gray-500">Cargando usuarios...</p>
              </div>
            </CardContent>
          </Card>
        ) : filteredUsers.length === 0 ? (
          <Card>
            <CardContent className="flex items-center justify-center py-8">
              <div className="text-center">
                <Users className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                <p className="text-gray-600">No se encontraron usuarios</p>
              </div>
            </CardContent>
          </Card>
        ) : (
          filteredUsers.map((user) => {
            const roleInfo = roleConfig[user.role];
            const RoleIcon = roleInfo.icon;

            return (
              <Card key={user.id}>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <Avatar>
                        <AvatarImage src={user.profile?.avatarUrl} />
                        <AvatarFallback>
                          {user.profile?.fullName?.charAt(0) || "?"}
                        </AvatarFallback>
                      </Avatar>

                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <h3 className="font-medium">
                            {user.profile?.fullName || "Sin nombre"}
                          </h3>
                          {user.profile?.isVerified && (
                            <Badge variant="secondary" className="text-xs">
                              Verificado
                            </Badge>
                          )}
                        </div>

                        <div className="flex items-center gap-4 text-sm text-gray-500">
                          {user.profile?.organization && (
                            <div className="flex items-center gap-1">
                              <Building className="h-3 w-3" />
                              {user.profile.organization}
                            </div>
                          )}
                          {user.profile?.phone && (
                            <div className="flex items-center gap-1">
                              <Phone className="h-3 w-3" />
                              {user.profile.phone}
                            </div>
                          )}
                          <div className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {new Date(user.grantedAt).toLocaleDateString()}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <Badge className={roleInfo.color}>
                        <RoleIcon className="h-3 w-3 mr-1" />
                        {roleInfo.label}
                      </Badge>

                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEditProfile(user)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>

                        {user.role !== "owner" && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRevokeRole(user)}
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      {/* Diálogo de edición de perfil */}
      <Dialog open={isEditProfileOpen} onOpenChange={setIsEditProfileOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Editar Perfil</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="fullName">Nombre Completo</Label>
              <Input
                id="fullName"
                value={profileForm.fullName}
                onChange={(e) =>
                  setProfileForm((prev) => ({
                    ...prev,
                    fullName: e.target.value,
                  }))
                }
              />
            </div>
            <div>
              <Label htmlFor="phone">Teléfono</Label>
              <Input
                id="phone"
                value={profileForm.phone}
                onChange={(e) =>
                  setProfileForm((prev) => ({ ...prev, phone: e.target.value }))
                }
              />
            </div>
            <div>
              <Label htmlFor="organization">Organización</Label>
              <Input
                id="organization"
                value={profileForm.organization}
                onChange={(e) =>
                  setProfileForm((prev) => ({
                    ...prev,
                    organization: e.target.value,
                  }))
                }
              />
            </div>
            <div>
              <Label htmlFor="bio">Biografía</Label>
              <Textarea
                id="bio"
                value={profileForm.bio}
                onChange={(e) =>
                  setProfileForm((prev) => ({ ...prev, bio: e.target.value }))
                }
                rows={3}
              />
            </div>
            <Separator />
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setIsEditProfileOpen(false)}
                className="flex-1"
              >
                Cancelar
              </Button>
              <Button onClick={handleUpdateProfile} className="flex-1">
                Guardar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
