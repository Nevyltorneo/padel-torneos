"use client";

import { PermissionGuard } from "@/components/auth/PermissionGuard";
import { UserManagement } from "@/components/admin/UserManagement";

export default function UsersPage() {
  return (
    <PermissionGuard requiredPermission="canManageUsers">
      <div className="container mx-auto py-6 space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Gestión de Usuarios</h1>
          <p className="text-gray-600 mt-2">
            Administra los roles y permisos de los usuarios en tus torneos
          </p>
        </div>

        <UserManagement />
      </div>
    </PermissionGuard>
  );
}
