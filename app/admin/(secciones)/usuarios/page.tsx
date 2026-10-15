"use client"

import { useEffect, useRef, useState } from "react"
import {
  AlertCircle,
  Building2,
  Check,
  Search,
  Shield,
  ShieldAlert,
  Store,
  UserCheck,
  UserCog,
  Users,
  UserX,
  X,
} from "lucide-react"
import { toast } from "sonner"

import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { Spinner } from "@/components/ui/spinner"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import {
  MOCK_CLIENTS_ADMIN,
  MOCK_PROFILES,
  MOCK_USERS,
} from "@/lib/mock/data"
import { useAdminSettings } from "@/lib/mock/admin-settings"
import { formatDate } from "@/lib/domain/format"
import { ROLE_LABEL, type Role, type UserRow } from "@/lib/domain/types"

const ROLE_BADGE_STYLE: Record<Role, string> = {
  admin: "border-purple-200 bg-purple-50 text-purple-900 font-semibold",
  cliente: "border-blue-200 bg-blue-50 text-blue-900 font-medium",
  proveedor: "border-amber-200 bg-amber-50 text-amber-900 font-medium",
  canjeador: "border-slate-200 bg-slate-50 text-slate-800 font-medium",
}

export default function AdminUsuariosPage() {
  const { providers } = useAdminSettings()
  const [loading, setLoading] = useState(true)
  const [users, setUsers] = useState<UserRow[]>(MOCK_USERS)

  // Filtros y búsqueda
  const [search, setSearch] = useState("")
  const [roleFilter, setRoleFilter] = useState<string>("all")

  // Modal para cambiar rol
  const [roleDialogOpen, setRoleDialogOpen] = useState(false)
  const [selectedUserForRole, setSelectedUserForRole] = useState<UserRow | null>(null)
  const [newRole, setNewRole] = useState<Role>("canjeador")
  const [selectedClientId, setSelectedClientId] = useState<string>("")
  const [newClientName, setNewClientName] = useState("")
  // Empresas creadas aquí durante la sesión (estado local, se pierden al recargar)
  const [extraClients, setExtraClients] = useState<{ id: string; name: string }[]>([])
  const [selectedProviderId, setSelectedProviderId] = useState<string>(providers[0]?.id || "")

  // AlertDialog de confirmación para cambio de rol
  const [confirmRoleAlertOpen, setConfirmRoleAlertOpen] = useState(false)
  const [isProcessingRole, setIsProcessingRole] = useState(false)
  const isProcessingRoleRef = useRef(false)

  // AlertDialog de confirmación para bloquear / desbloquear
  const [blockAlertOpen, setBlockAlertOpen] = useState(false)
  const [selectedUserForBlock, setSelectedUserForBlock] = useState<UserRow | null>(null)
  const [isProcessingBlock, setIsProcessingBlock] = useState(false)
  const isProcessingBlockRef = useRef(false)

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 400)
    return () => clearTimeout(timer)
  }, [])

  // Filtrado de usuarios
  const query = search.trim().toLowerCase()
  const filteredUsers = users.filter((u) => {
    const matchesSearch =
      !query ||
      u.fullName.toLowerCase().includes(query) ||
      u.email.toLowerCase().includes(query)
    const matchesRole = roleFilter === "all" || u.role === roleFilter
    return matchesSearch && matchesRole
  })

  // Conteo de administradores activos
  const activeAdminsCount = users.filter((u) => u.role === "admin" && !u.blocked).length

  // Iniciar cambio de rol
  const handleOpenChangeRole = (user: UserRow) => {
    setSelectedUserForRole(user)
    setNewRole(user.role)
    setSelectedClientId(MOCK_CLIENTS_ADMIN[0]?.id || "")
    setNewClientName("")
    setSelectedProviderId(providers[0]?.id || "")
    setRoleDialogOpen(true)
  }

  const clientOptions = [
    ...MOCK_CLIENTS_ADMIN.map((c) => ({ id: c.id, name: c.name })),
    ...extraClients,
  ]
  const NEW_CLIENT = "__new__"
  const isNewClient = newRole === "cliente" && selectedClientId === NEW_CLIENT
  const trimmedNewName = newClientName.trim().replace(/\s+/g, " ")
  const newNameError = !isNewClient
    ? null
    : trimmedNewName.length < 2 || trimmedNewName.length > 60
      ? "Escribe el nombre de la empresa (entre 2 y 60 caracteres)."
      : clientOptions.some((c) => c.name.toLowerCase() === trimmedNewName.toLowerCase())
        ? "Ya existe una empresa con ese nombre. Elígela de la lista."
        : null
  const canProceedRole =
    newRole !== "cliente" || (selectedClientId !== "" && (!isNewClient || !newNameError))

  const handleProceedToConfirmRole = (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedUserForRole || !canProceedRole) return
    setRoleDialogOpen(false)
    setConfirmRoleAlertOpen(true)
  }

  // Ejecutar cambio de rol con 800 ms de simulación (Regla 7)
  const handleConfirmRoleChange = () => {
    if (!selectedUserForRole || isProcessingRoleRef.current || isProcessingRole) return
    isProcessingRoleRef.current = true
    setIsProcessingRole(true)

    setTimeout(() => {
      setUsers((prev) =>
        prev.map((u) => (u.id === selectedUserForRole.id ? { ...u, role: newRole } : u))
      )
      if (isNewClient) {
        setExtraClients((prev) => [...prev, { id: `c-new-${Date.now()}`, name: trimmedNewName }])
      }
      setIsProcessingRole(false)
      isProcessingRoleRef.current = false
      setConfirmRoleAlertOpen(false)
      toast.success(
        isNewClient
          ? `Rol de ${selectedUserForRole.fullName} actualizado a ${ROLE_LABEL[newRole]} y empresa «${trimmedNewName}» creada`
          : `Rol de ${selectedUserForRole.fullName} actualizado a ${ROLE_LABEL[newRole]}`
      )
    }, 800)
  }

  // Iniciar bloqueo/desbloqueo
  const handleOpenBlockToggle = (user: UserRow) => {
    setSelectedUserForBlock(user)
    setBlockAlertOpen(true)
  }

  // Ejecutar bloqueo/desbloqueo con 800 ms (Regla 7)
  const handleConfirmBlockToggle = () => {
    if (!selectedUserForBlock || isProcessingBlockRef.current || isProcessingBlock) return
    isProcessingBlockRef.current = true
    setIsProcessingBlock(true)

    setTimeout(() => {
      const willBeBlocked = !selectedUserForBlock.blocked
      setUsers((prev) =>
        prev.map((u) =>
          u.id === selectedUserForBlock.id ? { ...u, blocked: willBeBlocked } : u
        )
      )
      setIsProcessingBlock(false)
      isProcessingBlockRef.current = false
      setBlockAlertOpen(false)
      toast.success(
        willBeBlocked
          ? `Usuario ${selectedUserForBlock.fullName} bloqueado`
          : `Usuario ${selectedUserForBlock.fullName} desbloqueado`
      )
    }, 800)
  }

  if (loading) {
    return (
      <div className="space-y-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-10 w-36" />
        </div>
        <div className="flex gap-4">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-10 w-44" />
        </div>
        <Skeleton className="h-96 w-full" />
      </div>
    )
  }

  return (
    <TooltipProvider>
      <div className="space-y-8">
        <div>
          <h2 className="text-xl font-semibold tracking-tight">Gestión de usuarios</h2>
          <p className="text-sm text-muted-foreground">
            Control de cuentas, asignación de roles y permisos de acceso al sistema
          </p>
        </div>

        <Card>
          <CardHeader className="space-y-4">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <CardTitle className="text-lg">Directorio de usuarios</CardTitle>
                <CardDescription>
                  {filteredUsers.length} de {users.length} usuarios registrados
                </CardDescription>
              </div>

              {/* Buscador y filtro */}
              <div className="flex flex-wrap items-center gap-3">
                <div className="relative w-full sm:w-64">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar por nombre o correo…"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-9 pr-9"
                  />
                  {search && (
                    <button
                      type="button"
                      onClick={() => setSearch("")}
                      className="absolute right-3 top-2.5 text-muted-foreground hover:text-foreground"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>

                <Select value={roleFilter} onValueChange={setRoleFilter}>
                  <SelectTrigger className="w-full sm:w-44">
                    <SelectValue placeholder="Filtrar por rol" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos los roles</SelectItem>
                    <SelectItem value="admin">Nosotros</SelectItem>
                    <SelectItem value="cliente">Cliente</SelectItem>
                    <SelectItem value="proveedor">Proveedor</SelectItem>
                    <SelectItem value="canjeador">Canjeador</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {filteredUsers.length === 0 ? (
              <div className="rounded-lg border border-dashed p-10 text-center">
                <Users className="mx-auto h-10 w-10 text-muted-foreground" />
                <h3 className="mt-4 text-base font-semibold">No se encontraron usuarios</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  No hay usuarios que coincidan con &ldquo;{search}&rdquo; y el filtro de rol.
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-4"
                  onClick={() => {
                    setSearch("")
                    setRoleFilter("all")
                  }}
                >
                  Limpiar filtros
                </Button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table className="min-w-[760px]">
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nombre</TableHead>
                      <TableHead>Correo electrónico</TableHead>
                      <TableHead className="text-center">Rol</TableHead>
                      <TableHead>Documento</TableHead>
                      <TableHead>Fecha de alta</TableHead>
                      <TableHead className="text-center">Estado</TableHead>
                      <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredUsers.map((u) => {
                      const isSelfAdmin = u.id === MOCK_PROFILES.admin.id
                      const isLastAdmin = u.role === "admin" && activeAdminsCount <= 1

                      // Razón por la que no se puede cambiar de rol
                      let roleChangeDisabledReason: string | null = null
                      if (isSelfAdmin) {
                        roleChangeDisabledReason = "No puedes cambiar tu propio rol"
                      } else if (isLastAdmin) {
                        roleChangeDisabledReason = "No puedes dejar al sistema sin administradores activos"
                      }

                      // Razón por la que no se puede bloquear
                      let blockDisabledReason: string | null = null
                      if (isSelfAdmin) {
                        blockDisabledReason = "No puedes bloquearte a ti mismo"
                      } else if (isLastAdmin && !u.blocked) {
                        blockDisabledReason = "No puedes bloquear al único administrador activo"
                      }

                      return (
                        <TableRow key={u.id} className={u.blocked ? "bg-muted/30 opacity-75" : undefined}>
                          <TableCell className="font-semibold text-foreground">
                            {u.fullName}
                            {isSelfAdmin && (
                              <span className="ml-2 rounded bg-purple-100 px-1.5 py-0.5 text-[10px] font-bold text-purple-800">
                                Tú
                              </span>
                            )}
                          </TableCell>
                          <TableCell className="text-muted-foreground text-sm font-mono">
                            {u.email}
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge variant="outline" className={ROLE_BADGE_STYLE[u.role]}>
                              {ROLE_LABEL[u.role]}
                            </Badge>
                          </TableCell>
                          <TableCell className="font-mono text-xs text-muted-foreground">
                            {u.docMasked}
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {formatDate(u.createdAt)}
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge
                              variant="outline"
                              className={
                                u.blocked
                                  ? "border-destructive/30 bg-destructive/10 text-destructive font-medium"
                                  : "border-emerald-200 bg-emerald-50 text-emerald-800 font-medium"
                              }
                            >
                              {u.blocked ? "Bloqueado" : "Activo"}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1">
                              {/* Botón Cambiar Rol */}
                              {roleChangeDisabledReason ? (
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <span tabIndex={0} className="inline-block">
                                      <Button variant="ghost" size="sm" disabled>
                                        <UserCog className="mr-1 h-3.5 w-3.5" /> Cambiar rol
                                      </Button>
                                    </span>
                                  </TooltipTrigger>
                                  <TooltipContent>{roleChangeDisabledReason}</TooltipContent>
                                </Tooltip>
                              ) : (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleOpenChangeRole(u)}
                                >
                                  <UserCog className="mr-1 h-3.5 w-3.5" /> Cambiar rol
                                </Button>
                              )}

                              {/* Botón Bloquear / Desbloquear */}
                              {blockDisabledReason ? (
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <span tabIndex={0} className="inline-block">
                                      <Button variant="ghost" size="sm" disabled>
                                        <ShieldAlert className="mr-1 h-3.5 w-3.5" />
                                        {u.blocked ? "Desbloquear" : "Bloquear"}
                                      </Button>
                                    </span>
                                  </TooltipTrigger>
                                  <TooltipContent>{blockDisabledReason}</TooltipContent>
                                </Tooltip>
                              ) : (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleOpenBlockToggle(u)}
                                  className={
                                    u.blocked
                                      ? "text-emerald-700 hover:text-emerald-800"
                                      : "text-muted-foreground hover:text-destructive"
                                  }
                                >
                                  {u.blocked ? (
                                    <>
                                      <UserCheck className="mr-1 h-3.5 w-3.5" /> Desbloquear
                                    </>
                                  ) : (
                                    <>
                                      <UserX className="mr-1 h-3.5 w-3.5" /> Bloquear
                                    </>
                                  )}
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Dialog para Seleccionar Nuevo Rol y Entidad Vinculada */}
        <Dialog open={roleDialogOpen} onOpenChange={setRoleDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Cambiar rol de usuario</DialogTitle>
              <DialogDescription>
                Modifica los permisos de acceso para <strong>{selectedUserForRole?.fullName}</strong>.
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleProceedToConfirmRole} className="space-y-4 pt-2">
              <div className="space-y-2">
                <Label htmlFor="roleSelect">Nuevo rol</Label>
                <Select value={newRole} onValueChange={(val) => setNewRole(val as Role)}>
                  <SelectTrigger id="roleSelect">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="canjeador">Canjeador</SelectItem>
                    <SelectItem value="cliente">Cliente (Corporativo)</SelectItem>
                    <SelectItem value="proveedor">Proveedor (Marca)</SelectItem>
                    <SelectItem value="admin">Nosotros (Administrador)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Si es Cliente: Seleccionar empresa cliente */}
              {newRole === "cliente" && (
                <div className="space-y-2 rounded-lg border bg-blue-50/40 p-3">
                  <Label htmlFor="clientSelect" className="flex items-center gap-1.5 text-blue-900">
                    <Building2 className="h-4 w-4" /> Empresa cliente vinculada
                  </Label>
                  <Select value={selectedClientId} onValueChange={setSelectedClientId}>
                    <SelectTrigger id="clientSelect" className="bg-background">
                      <SelectValue placeholder="Selecciona una empresa" />
                    </SelectTrigger>
                    <SelectContent>
                      {clientOptions.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.name}
                        </SelectItem>
                      ))}
                      <SelectItem value={NEW_CLIENT}>＋ Nueva empresa…</SelectItem>
                    </SelectContent>
                  </Select>
                  {isNewClient && (
                    <div className="space-y-1 pt-1">
                      <Label htmlFor="newClientName" className="text-blue-900">
                        Nombre de la nueva empresa
                      </Label>
                      <Input
                        id="newClientName"
                        value={newClientName}
                        maxLength={60}
                        autoFocus
                        placeholder="Ej. Ferretería El Roble"
                        className="bg-background"
                        onChange={(e) => setNewClientName(e.target.value)}
                      />
                      {newClientName && newNameError && (
                        <p className="text-xs text-destructive">{newNameError}</p>
                      )}
                    </div>
                  )}
                  <p className="text-xs text-muted-foreground">
                    El usuario administrará la bolsa y bonos de esta empresa.
                  </p>
                </div>
              )}

              {/* Si es Proveedor: Seleccionar proveedor */}
              {newRole === "proveedor" && (
                <div className="space-y-2 rounded-lg border bg-amber-50/40 p-3">
                  <Label htmlFor="providerSelect" className="flex items-center gap-1.5 text-amber-900">
                    <Store className="h-4 w-4" /> Proveedor comercial vinculado
                  </Label>
                  <Select value={selectedProviderId} onValueChange={setSelectedProviderId}>
                    <SelectTrigger id="providerSelect" className="bg-background">
                      <SelectValue placeholder="Selecciona un proveedor" />
                    </SelectTrigger>
                    <SelectContent>
                      {providers.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    El usuario gestionará cobros en caja y liquidaciones de esta marca.
                  </p>
                </div>
              )}

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setRoleDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={!canProceedRole}>
                  Continuar
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* AlertDialog: Confirmación de Cambio de Rol (Regla 7) */}
        <AlertDialog
          open={confirmRoleAlertOpen}
          onOpenChange={(open) => {
            if (!open && !isProcessingRole) setConfirmRoleAlertOpen(false)
          }}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>¿Confirmar cambio de rol?</AlertDialogTitle>
              <AlertDialogDescription>
                Vas a cambiar el rol de {selectedUserForRole?.fullName} a {ROLE_LABEL[newRole]}.
                {isNewClient && <> Se creará la empresa «{trimmedNewName}» y quedará vinculada a este usuario.</>}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isProcessingRole}>Cancelar</AlertDialogCancel>
              <Button
                type="button"
                disabled={isProcessingRole}
                onClick={handleConfirmRoleChange}
              >
                {isProcessingRole && <Spinner className="mr-2" />}
                Confirmar cambio
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* AlertDialog: Confirmación de Bloquear / Desbloquear (Regla 7) */}
        <AlertDialog
          open={blockAlertOpen}
          onOpenChange={(open) => {
            if (!open && !isProcessingBlock) setBlockAlertOpen(false)
          }}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>
                {selectedUserForBlock?.blocked ? "¿Desbloquear usuario?" : "¿Bloquear usuario?"}
              </AlertDialogTitle>
              <AlertDialogDescription>
                {selectedUserForBlock?.blocked
                  ? `¿Desbloquear al usuario ${selectedUserForBlock?.fullName}? Podrá acceder nuevamente a la plataforma.`
                  : `¿Bloquear al usuario ${selectedUserForBlock?.fullName}? No podrá acceder a la plataforma mientras esté bloqueado.`}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isProcessingBlock}>Cancelar</AlertDialogCancel>
              <Button
                type="button"
                variant={selectedUserForBlock?.blocked ? "default" : "destructive"}
                disabled={isProcessingBlock}
                onClick={handleConfirmBlockToggle}
              >
                {isProcessingBlock && <Spinner className="mr-2" />}
                {selectedUserForBlock?.blocked ? "Desbloquear" : "Bloquear usuario"}
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </TooltipProvider>
  )
}
