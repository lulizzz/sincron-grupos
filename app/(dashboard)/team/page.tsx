"use client"

import { useState, useEffect, useMemo } from "react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  UserPlus,
  Users,
  Mail,
  Shield,
  Crown,
  ShieldCheck,
  User,
  Loader2,
  Search,
  MoreVertical,
  Bell,
  Check,
  X,
  ChevronLeft,
  ChevronRight,
  Trash2,
} from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { toast } from "sonner"
import { PermissionGate } from "@/components/permission-gate"
import { usePermissions, type Permission } from "@/hooks/use-permissions"
import { cn } from "@/lib/utils"

interface Usuario {
  id: number
  nome: string
  email: string
  role: string | null
  ativo: boolean
  accepted_at: string | null
  invite_token: string | null
  ultimo_acesso?: string | null
  permissoes_usuario: {
    gerenciar_instancias: boolean | null
    gerenciar_grupos: boolean | null
    gerenciar_categorias: boolean | null
    enviar_mensagens: boolean | null
    configurar_comandos: boolean | null
    configurar_gatilhos: boolean | null
    ver_analytics: boolean | null
    gerenciar_usuarios: boolean | null
  } | null
}

const PERMISSOES_LABELS: Record<Permission, string> = {
  gerenciar_instancias: "Gerenciar Instancias",
  gerenciar_grupos: "Gerenciar Grupos",
  gerenciar_categorias: "Gerenciar Categorias",
  enviar_mensagens: "Enviar Mensagens",
  configurar_comandos: "Configurar Comandos",
  configurar_gatilhos: "Configurar Gatilhos",
  ver_analytics: "Ver Analytics",
  gerenciar_usuarios: "Gerenciar Usuarios",
}

const PERMISSOES_DESCRICOES: Record<Permission, string> = {
  gerenciar_instancias: "Conectar e desconectar WhatsApp",
  gerenciar_grupos: "Criar, editar e excluir grupos",
  gerenciar_categorias: "Gerenciar categorias de grupos",
  enviar_mensagens: "Mensagens em massa e agendadas",
  configurar_comandos: "Configurar comandos de texto",
  configurar_gatilhos: "Configurar automacoes",
  ver_analytics: "Visualizar estatisticas e relatorios",
  gerenciar_usuarios: "Convidar e remover membros",
}

// Matriz de permissoes por funcao
const PERMISSOES_MATRIZ: {
  recurso: string
  descricao: string
  owner: boolean | string
  admin: boolean | string
  member: boolean | string
}[] = [
  { recurso: "Gerenciar Instancias", descricao: "Conectar e desconectar WhatsApp", owner: true, admin: true, member: false },
  { recurso: "Gerenciar Grupos", descricao: "Criar, editar e excluir grupos", owner: true, admin: true, member: "Visualizar" },
  { recurso: "Criar Gatilhos", descricao: "Configurar automacoes", owner: true, admin: true, member: false },
  { recurso: "Enviar Mensagens", descricao: "Mensagens em massa e agendadas", owner: true, admin: true, member: "Atribuidos" },
  { recurso: "Gerenciar Agentes IA", descricao: "Configurar bots e respostas automaticas", owner: true, admin: true, member: false },
  { recurso: "Acessar Transcricoes", descricao: "Ver audios transcritos", owner: true, admin: true, member: "Atribuidos" },
  { recurso: "Gerenciar Equipe", descricao: "Convidar e remover membros", owner: true, admin: true, member: false },
  { recurso: "Configuracoes da Conta", descricao: "Alterar plano e faturamento", owner: true, admin: false, member: false },
]

const ITEMS_PER_PAGE = 10

export default function TeamPage() {
  const [usuarios, setUsuarios] = useState<Usuario[]>([])
  const [loading, setLoading] = useState(true)
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false)
  const [permDialogOpen, setPermDialogOpen] = useState(false)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [selectedUser, setSelectedUser] = useState<Usuario | null>(null)
  const [inviteEmail, setInviteEmail] = useState("")
  const [inviteName, setInviteName] = useState("")
  const [inviteRole, setInviteRole] = useState<"admin" | "member">("member")
  const [sending, setSending] = useState(false)
  const [searchFilter, setSearchFilter] = useState("")
  const [roleFilter, setRoleFilter] = useState("all")
  const [currentPage, setCurrentPage] = useState(1)
  const [editRole, setEditRole] = useState<string>("member")
  const [permissoes, setPermissoes] = useState<Record<Permission, boolean>>({
    gerenciar_instancias: false,
    gerenciar_grupos: false,
    gerenciar_categorias: false,
    enviar_mensagens: false,
    configurar_comandos: false,
    configurar_gatilhos: false,
    ver_analytics: false,
    gerenciar_usuarios: false,
  })

  const { isOwner } = usePermissions()
  const supabase = createClient()

  // Contagens para estatisticas
  const stats = useMemo(() => {
    const total = usuarios.length
    const owners = usuarios.filter(u => u.role === "owner").length
    const admins = usuarios.filter(u => u.role === "admin").length
    const members = usuarios.filter(u => u.role === "member" || !u.role).length
    return { total, owners, admins, members }
  }, [usuarios])

  // Filtrar usuarios
  const filteredUsuarios = useMemo(() => {
    return usuarios.filter(u => {
      const matchesSearch =
        u.nome.toLowerCase().includes(searchFilter.toLowerCase()) ||
        u.email.toLowerCase().includes(searchFilter.toLowerCase())

      const matchesRole = roleFilter === "all" || u.role === roleFilter

      return matchesSearch && matchesRole
    })
  }, [usuarios, searchFilter, roleFilter])

  // Paginacao
  const totalPages = Math.ceil(filteredUsuarios.length / ITEMS_PER_PAGE)
  const paginatedUsuarios = filteredUsuarios.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  )

  // Reset page quando filtros mudam
  useEffect(() => {
    setCurrentPage(1)
  }, [searchFilter, roleFilter])

  const loadUsuarios = async () => {
    setLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user?.email) return

      const { data: usuarioSistema } = await supabase
        .from("usuarios_sistema")
        .select("id_organizacao")
        .eq("email", user.email)
        .single()

      if (!usuarioSistema) return

      const { data, error } = await supabase
        .from("usuarios_sistema")
        .select(`
          id,
          nome,
          email,
          role,
          ativo,
          accepted_at,
          invite_token,
          permissoes_usuario (
            gerenciar_instancias,
            gerenciar_grupos,
            gerenciar_categorias,
            enviar_mensagens,
            configurar_comandos,
            configurar_gatilhos,
            ver_analytics,
            gerenciar_usuarios
          )
        `)
        .eq("id_organizacao", usuarioSistema.id_organizacao)
        .order("role", { ascending: true })

      if (error) throw error

      setUsuarios(data?.map(u => ({
        ...u,
        permissoes_usuario: Array.isArray(u.permissoes_usuario)
          ? u.permissoes_usuario[0]
          : u.permissoes_usuario
      })) || [])
    } catch (err) {
      console.error("Erro ao carregar usuarios:", err)
      toast.error("Erro ao carregar usuarios")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadUsuarios()
  }, [])

  const getRoleInfo = (role: string | null) => {
    switch (role) {
      case "owner":
        return {
          label: "Proprietario",
          icon: Crown,
          bgColor: "bg-amber-100",
          textColor: "text-amber-700",
        }
      case "admin":
        return {
          label: "Admin",
          icon: ShieldCheck,
          bgColor: "bg-primary/10",
          textColor: "text-primary",
        }
      default:
        return {
          label: "Membro",
          icon: User,
          bgColor: "bg-secondary/10",
          textColor: "text-secondary",
        }
    }
  }

  const formatLastAccess = (user: Usuario) => {
    if (!user.accepted_at) {
      return { time: "Convite pendente", date: "-" }
    }
    // Simular ultimo acesso como recente para demonstracao
    const hours = Math.floor(Math.random() * 24)
    if (hours === 0) {
      return { time: "Agora", date: "Online" }
    }
    return {
      time: `${hours} hora${hours > 1 ? 's' : ''} atras`,
      date: new Date().toLocaleDateString('pt-BR')
    }
  }

  const handleInvite = async () => {
    if (!inviteEmail.trim()) {
      toast.error("Email e obrigatorio")
      return
    }

    setSending(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user?.email) return

      const { data: usuarioSistema } = await supabase
        .from("usuarios_sistema")
        .select("id, id_organizacao")
        .eq("email", user.email)
        .single()

      if (!usuarioSistema) return

      const inviteToken = crypto.randomUUID()
      const expiresAt = new Date()
      expiresAt.setDate(expiresAt.getDate() + 7)

      const { error } = await supabase.from("usuarios_sistema").insert({
        id_organizacao: usuarioSistema.id_organizacao,
        email: inviteEmail,
        nome: inviteName || inviteEmail.split("@")[0],
        role: inviteRole,
        ativo: false,
        invite_token: inviteToken,
        invite_expires_at: expiresAt.toISOString(),
        invited_by: usuarioSistema.id,
      })

      if (error) {
        if (error.code === "23505") {
          toast.error("Este email ja foi convidado")
        } else {
          throw error
        }
        return
      }

      toast.success("Convite enviado com sucesso!")
      toast.info(`Link de convite: ${window.location.origin}/invite/${inviteToken}`)

      setInviteDialogOpen(false)
      setInviteEmail("")
      setInviteName("")
      setInviteRole("member")
      loadUsuarios()
    } catch (err) {
      console.error("Erro ao enviar convite:", err)
      toast.error("Erro ao enviar convite")
    } finally {
      setSending(false)
    }
  }

  const openEditDialog = (usuario: Usuario) => {
    setSelectedUser(usuario)
    setEditRole(usuario.role || "member")
    if (usuario.permissoes_usuario) {
      setPermissoes({
        gerenciar_instancias: usuario.permissoes_usuario.gerenciar_instancias ?? false,
        gerenciar_grupos: usuario.permissoes_usuario.gerenciar_grupos ?? false,
        gerenciar_categorias: usuario.permissoes_usuario.gerenciar_categorias ?? false,
        enviar_mensagens: usuario.permissoes_usuario.enviar_mensagens ?? false,
        configurar_comandos: usuario.permissoes_usuario.configurar_comandos ?? false,
        configurar_gatilhos: usuario.permissoes_usuario.configurar_gatilhos ?? false,
        ver_analytics: usuario.permissoes_usuario.ver_analytics ?? false,
        gerenciar_usuarios: usuario.permissoes_usuario.gerenciar_usuarios ?? false,
      })
    }
    setEditDialogOpen(true)
  }

  const saveUserChanges = async () => {
    if (!selectedUser) return

    setSending(true)
    try {
      // Atualizar role
      await supabase
        .from("usuarios_sistema")
        .update({ role: editRole })
        .eq("id", selectedUser.id)

      // Atualizar permissoes se for membro
      if (editRole === "member") {
        const { data: existing } = await supabase
          .from("permissoes_usuario")
          .select("id")
          .eq("id_usuario_sistema", selectedUser.id)
          .single()

        if (existing) {
          await supabase
            .from("permissoes_usuario")
            .update(permissoes)
            .eq("id_usuario_sistema", selectedUser.id)
        } else {
          await supabase
            .from("permissoes_usuario")
            .insert({
              id_usuario_sistema: selectedUser.id,
              ...permissoes,
            })
        }
      }

      toast.success("Membro atualizado com sucesso")
      setEditDialogOpen(false)
      loadUsuarios()
    } catch (err) {
      console.error("Erro ao salvar:", err)
      toast.error("Erro ao salvar alteracoes")
    } finally {
      setSending(false)
    }
  }

  const handleRemoveUser = async () => {
    if (!selectedUser) return

    setSending(true)
    try {
      await supabase
        .from("permissoes_usuario")
        .delete()
        .eq("id_usuario_sistema", selectedUser.id)

      await supabase
        .from("usuarios_sistema")
        .delete()
        .eq("id", selectedUser.id)

      toast.success("Membro removido com sucesso")
      setEditDialogOpen(false)
      loadUsuarios()
    } catch (err) {
      console.error("Erro ao remover:", err)
      toast.error("Erro ao remover membro")
    } finally {
      setSending(false)
    }
  }

  if (loading) {
    return (
      <div className="flex-1 space-y-4 p-4 md:p-6">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <Skeleton className="h-6 w-24" />
            <Skeleton className="h-4 w-36" />
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[1, 2, 3, 4].map(i => (
            <Skeleton key={i} className="h-20" />
          ))}
        </div>
        <Skeleton className="h-72" />
      </div>
    )
  }

  return (
    <div className="flex-1 space-y-4 p-4 md:p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-foreground">Equipe</h2>
          <p className="text-sm text-muted-foreground">Membros e permissoes</p>
        </div>
        <Button variant="ghost" size="icon" className="h-8 w-8">
          <Bell className="h-4 w-4 text-muted-foreground" />
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card>
          <CardContent className="p-3">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-medium text-muted-foreground">Total</span>
              <Users className="h-4 w-4 text-muted-foreground" />
            </div>
            <p className="text-xl font-bold">{stats.total}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-medium text-muted-foreground">Owners</span>
              <Crown className="h-4 w-4 text-amber-500" />
            </div>
            <p className="text-xl font-bold">{stats.owners}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-medium text-muted-foreground">Admins</span>
              <ShieldCheck className="h-4 w-4 text-primary" />
            </div>
            <p className="text-xl font-bold">{stats.admins}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-medium text-muted-foreground">Membros</span>
              <User className="h-4 w-4 text-secondary" />
            </div>
            <p className="text-xl font-bold">{stats.members}</p>
          </CardContent>
        </Card>
      </div>

      {/* Team Management */}
      <Card>
        {/* Filters Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-3 border-b gap-2">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 flex-1 w-full">
            <div className="relative flex-1 max-w-xs w-full">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Buscar..."
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                className="pl-8 h-9 text-sm"
              />
            </div>
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger className="w-32 h-9 text-sm">
                <SelectValue placeholder="Funcao" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                <SelectItem value="owner">Owner</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="member">Membro</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <PermissionGate permission="gerenciar_usuarios">
            <Button size="sm" onClick={() => setInviteDialogOpen(true)}>
              <UserPlus className="h-3.5 w-3.5 mr-1.5" />
              Convidar
            </Button>
          </PermissionGate>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="font-medium text-xs py-2">Membro</TableHead>
                <TableHead className="font-medium text-xs py-2">Funcao</TableHead>
                <TableHead className="font-medium text-xs py-2">Grupos</TableHead>
                <TableHead className="font-medium text-xs py-2">Acesso</TableHead>
                <TableHead className="font-medium text-xs py-2">Status</TableHead>
                <TableHead className="font-medium text-xs py-2 text-right">Acoes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedUsuarios.map((usuario) => {
                const roleInfo = getRoleInfo(usuario.role)
                const RoleIcon = roleInfo.icon
                const lastAccess = formatLastAccess(usuario)

                return (
                  <TableRow key={usuario.id} className="hover:bg-muted/50">
                    <TableCell className="py-2">
                      <div className="flex items-center gap-2">
                        <Avatar className="h-8 w-8">
                          <AvatarFallback className="bg-muted text-xs">
                            <User className="h-3.5 w-3.5 text-muted-foreground" />
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium text-sm">{usuario.nome}</p>
                          <p className="text-xs text-muted-foreground">{usuario.email}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="py-2">
                      <Badge variant="secondary" className={cn("gap-1 text-[10px] px-1.5 py-0", roleInfo.bgColor, roleInfo.textColor)}>
                        <RoleIcon className="h-2.5 w-2.5" />
                        {roleInfo.label}
                      </Badge>
                    </TableCell>
                    <TableCell className="py-2 text-xs">
                      {usuario.role === "owner" ? "Todos" : "-"}
                    </TableCell>
                    <TableCell className="py-2 text-xs">
                      {lastAccess.time}
                    </TableCell>
                    <TableCell className="py-2">
                      {usuario.accepted_at ? (
                        <Badge variant="secondary" className="bg-green-100 text-green-700 text-[10px] px-1.5 py-0">
                          <span className="w-1.5 h-1.5 rounded-full bg-green-500 mr-1" />
                          Ativo
                        </Badge>
                      ) : usuario.invite_token ? (
                        <Badge variant="secondary" className="bg-amber-100 text-amber-700 text-[10px] px-1.5 py-0">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-500 mr-1" />
                          Pendente
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="bg-gray-100 text-gray-700 text-[10px] px-1.5 py-0">
                          <span className="w-1.5 h-1.5 rounded-full bg-gray-500 mr-1" />
                          Inativo
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right py-2">
                      {usuario.role !== "owner" && (
                        <PermissionGate permission="gerenciar_usuarios">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-7 w-7">
                                <MoreVertical className="h-3.5 w-3.5" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => openEditDialog(usuario)}>
                                <Shield className="h-3.5 w-3.5 mr-2" />
                                Editar
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </PermissionGate>
                      )}
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between px-3 py-2 border-t">
          <span className="text-xs text-muted-foreground">
            {((currentPage - 1) * ITEMS_PER_PAGE) + 1}-{Math.min(currentPage * ITEMS_PER_PAGE, filteredUsuarios.length)} de {filteredUsuarios.length}
          </span>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="sm"
              className="h-7 w-7 p-0"
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </Button>
            {Array.from({ length: Math.min(totalPages, 3) }, (_, i) => {
              const page = i + 1
              return (
                <Button
                  key={page}
                  variant={currentPage === page ? "default" : "outline"}
                  size="sm"
                  className="h-7 w-7 p-0 text-xs"
                  onClick={() => setCurrentPage(page)}
                >
                  {page}
                </Button>
              )
            })}
            <Button
              variant="outline"
              size="sm"
              className="h-7 w-7 p-0"
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages || totalPages === 0}
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </Card>

      {/* Permissions Matrix */}
      <Card>
        <CardHeader className="py-3 px-4">
          <CardTitle className="text-sm">Permissoes por Funcao</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="font-medium text-xs py-2">Recurso</TableHead>
                  <TableHead className="font-medium text-xs py-2 text-center">
                    <div className="flex items-center justify-center gap-1">
                      <Crown className="h-3 w-3 text-amber-500" />
                      Owner
                    </div>
                  </TableHead>
                  <TableHead className="font-medium text-xs py-2 text-center">
                    <div className="flex items-center justify-center gap-1">
                      <ShieldCheck className="h-3 w-3 text-primary" />
                      Admin
                    </div>
                  </TableHead>
                  <TableHead className="font-medium text-xs py-2 text-center">
                    <div className="flex items-center justify-center gap-1">
                      <User className="h-3 w-3 text-secondary" />
                      Membro
                    </div>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {PERMISSOES_MATRIZ.map((perm, idx) => (
                  <TableRow key={idx} className="hover:bg-muted/50">
                    <TableCell className="py-1.5">
                      <p className="font-medium text-xs">{perm.recurso}</p>
                    </TableCell>
                    <TableCell className="text-center py-1.5">
                      {perm.owner === true ? (
                        <Check className="h-3.5 w-3.5 text-accent mx-auto" />
                      ) : perm.owner === false ? (
                        <X className="h-3.5 w-3.5 text-destructive mx-auto" />
                      ) : (
                        <span className="text-[10px] text-muted-foreground">{perm.owner}</span>
                      )}
                    </TableCell>
                    <TableCell className="text-center py-1.5">
                      {perm.admin === true ? (
                        <Check className="h-3.5 w-3.5 text-accent mx-auto" />
                      ) : perm.admin === false ? (
                        <X className="h-3.5 w-3.5 text-destructive mx-auto" />
                      ) : (
                        <span className="text-[10px] text-muted-foreground">{perm.admin}</span>
                      )}
                    </TableCell>
                    <TableCell className="text-center py-1.5">
                      {perm.member === true ? (
                        <Check className="h-3.5 w-3.5 text-accent mx-auto" />
                      ) : perm.member === false ? (
                        <X className="h-3.5 w-3.5 text-destructive mx-auto" />
                      ) : (
                        <span className="text-[10px] text-muted-foreground">{perm.member}</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Footer */}
      <footer className="py-3 text-center text-xs text-muted-foreground border-t">
        <p>Copyright &copy; 2025 Sincron Grupos</p>
      </footer>

      {/* Invite Dialog */}
      <Dialog open={inviteDialogOpen} onOpenChange={setInviteDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Convidar Membro</DialogTitle>
            <DialogDescription>
              Adicione um novo membro a sua organizacao
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="exemplo@email.com"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="name">Nome</Label>
              <Input
                id="name"
                placeholder="Nome do membro"
                value={inviteName}
                onChange={(e) => setInviteName(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="role">Funcao</Label>
              <Select value={inviteRole} onValueChange={(v) => setInviteRole(v as "admin" | "member")}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="member">Membro</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setInviteDialogOpen(false)} disabled={sending}>
              Cancelar
            </Button>
            <Button onClick={handleInvite} disabled={sending}>
              {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Enviar Convite"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit User Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Editar Membro</DialogTitle>
          </DialogHeader>

          {selectedUser && (
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <Avatar className="h-16 w-16">
                  <AvatarFallback className="bg-muted text-lg">
                    <User className="h-8 w-8 text-muted-foreground" />
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-semibold">{selectedUser.nome}</p>
                  <p className="text-sm text-muted-foreground">{selectedUser.email}</p>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Funcao</Label>
                <Select value={editRole} onValueChange={setEditRole}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="member">Membro</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {editRole === "member" && (
                <div className="space-y-2">
                  <Label>Permissoes Individuais</Label>
                  <div className="border rounded-lg p-3 space-y-2 max-h-48 overflow-y-auto">
                    {(Object.keys(PERMISSOES_LABELS) as Permission[]).map((perm) => (
                      <div key={perm} className="flex items-center justify-between">
                        <Label htmlFor={perm} className="cursor-pointer text-sm">
                          {PERMISSOES_LABELS[perm]}
                        </Label>
                        <Switch
                          id={perm}
                          checked={permissoes[perm]}
                          onCheckedChange={(checked) =>
                            setPermissoes({ ...permissoes, [perm]: checked })
                          }
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="pt-4 border-t">
                <Button
                  variant="ghost"
                  className="text-destructive hover:text-destructive hover:bg-destructive/10"
                  onClick={handleRemoveUser}
                  disabled={sending}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Remover membro
                </Button>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)} disabled={sending}>
              Cancelar
            </Button>
            <Button onClick={saveUserChanges} disabled={sending}>
              {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Salvar Alteracoes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
