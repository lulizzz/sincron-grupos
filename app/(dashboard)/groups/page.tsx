"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
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
  Users,
  Plus,
  Check,
  Search,
  Loader2,
  Pencil,
  Trash2,
  AlertTriangle,
  RefreshCw,
  MoreVertical,
  Bell,
  ChevronLeft,
  ChevronRight,
  Smartphone,
} from "lucide-react"
import { Label } from "@/components/ui/label"
import { createClient } from "@/lib/supabase/client"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import Link from "next/link"

interface WhatsAppGroup {
  id: string
  name: string
  picture?: string | null
  participants?: number
  description?: string | null
}

interface Categoria {
  id: number
  nome: string
  cor: string
}

interface GrupoCadastrado {
  id: number
  chat_id_whatsapp: string
  nome: string
  foto_url?: string | null
  id_categoria?: number | null
  ativo: boolean
  categorias?: number[]
}

const ITEMS_PER_PAGE = 10

export default function GroupsPage() {
  const [whatsappGroups, setWhatsappGroups] = useState<WhatsAppGroup[]>([])
  const [gruposCadastrados, setGruposCadastrados] = useState<GrupoCadastrado[]>([])
  const [categorias, setCategorias] = useState<Categoria[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingGroups, setLoadingGroups] = useState(false)
  const [instanceToken, setInstanceToken] = useState<string | null>(null)
  const [instanceId, setInstanceId] = useState<number | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)

  // Filters
  const [searchFilter, setSearchFilter] = useState("")
  const [categoryFilter, setCategoryFilter] = useState("all")
  const [statusFilter, setStatusFilter] = useState("all")
  const [currentPage, setCurrentPage] = useState(1)

  // Modal state
  const [dialogOpen, setDialogOpen] = useState(false)
  const [selectedGroups, setSelectedGroups] = useState<Set<string>>(new Set())
  const [selectedCategories, setSelectedCategories] = useState<Record<string, number[]>>({})
  const [saving, setSaving] = useState(false)
  const [modalSearchFilter, setModalSearchFilter] = useState("")

  // Edit group state
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [editingGroup, setEditingGroup] = useState<GrupoCadastrado | null>(null)
  const [editGroupCategories, setEditGroupCategories] = useState<number[]>([])
  const [savingEdit, setSavingEdit] = useState(false)

  // Delete group state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [groupToDelete, setGroupToDelete] = useState<GrupoCadastrado | null>(null)
  const [deletingGroup, setDeletingGroup] = useState(false)

  const supabase = createClient()

  // Carregar dados iniciais
  const loadData = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user?.email) return

      const { data: usuarioSistema } = await supabase
        .from("usuarios_sistema")
        .select("id_organizacao")
        .eq("email", user.email)
        .single()

      if (!usuarioSistema) return

      const { data: instancia } = await supabase
        .from("instancias_whatsapp")
        .select("id, api_key, status")
        .eq("id_organizacao", usuarioSistema.id_organizacao)
        .eq("status", "conectado")
        .single()

      if (instancia?.api_key) {
        setInstanceToken(instancia.api_key)
        setInstanceId(instancia.id)
        setIsConnected(true)
      }

      const { data: cats } = await supabase
        .from("categorias")
        .select("id, nome, cor")
        .eq("id_organizacao", usuarioSistema.id_organizacao)
        .eq("ativo", true)
        .order("ordem", { ascending: true })

      setCategorias(cats || [])

      const { data: grupos } = await supabase
        .from("grupos")
        .select("*")
        .eq("id_organizacao", usuarioSistema.id_organizacao)
        .order("nome", { ascending: true })

      const { data: gruposCategorias } = await supabase
        .from("grupos_categorias")
        .select("id_grupo, id_categoria")

      const categoriasPorGrupo: Record<number, number[]> = {}
      gruposCategorias?.forEach(gc => {
        if (!categoriasPorGrupo[gc.id_grupo]) {
          categoriasPorGrupo[gc.id_grupo] = []
        }
        categoriasPorGrupo[gc.id_grupo].push(gc.id_categoria)
      })

      const gruposComCategorias = grupos?.map(g => ({
        ...g,
        categorias: categoriasPorGrupo[g.id] || (g.id_categoria ? [g.id_categoria] : [])
      })) || []

      setGruposCadastrados(gruposComCategorias)
    } catch (err) {
      console.error("Erro ao carregar dados:", err)
    } finally {
      setLoading(false)
    }
  }, [supabase])

  const fetchWhatsAppGroups = useCallback(async (showRefresh = false) => {
    if (!instanceToken) return

    if (showRefresh) {
      setIsRefreshing(true)
    } else {
      setLoadingGroups(true)
    }

    try {
      const response = await fetch(`/api/uazapi/instances/${instanceToken}/groups`)
      if (!response.ok) throw new Error("Falha ao buscar grupos")

      const data = await response.json()
      setWhatsappGroups(data.groups || [])
      if (showRefresh) {
        toast.success("Grupos atualizados!")
      }
    } catch (err) {
      console.error("Erro ao buscar grupos:", err)
      toast.error("Erro ao buscar grupos do WhatsApp")
    } finally {
      setLoadingGroups(false)
      setIsRefreshing(false)
    }
  }, [instanceToken])

  useEffect(() => {
    loadData()
  }, [loadData])

  useEffect(() => {
    if (instanceToken) {
      fetchWhatsAppGroups()
    }
  }, [instanceToken, fetchWhatsAppGroups])

  // Filtered and paginated groups
  const filteredGrupos = useMemo(() => {
    return gruposCadastrados.filter(grupo => {
      const matchesSearch = grupo.nome.toLowerCase().includes(searchFilter.toLowerCase())

      const matchesCategory = categoryFilter === "all" ||
        (grupo.categorias && grupo.categorias.includes(Number(categoryFilter))) ||
        grupo.id_categoria === Number(categoryFilter)

      const matchesStatus = statusFilter === "all" ||
        (statusFilter === "active" && grupo.ativo) ||
        (statusFilter === "archived" && !grupo.ativo)

      return matchesSearch && matchesCategory && matchesStatus
    })
  }, [gruposCadastrados, searchFilter, categoryFilter, statusFilter])

  const totalPages = Math.ceil(filteredGrupos.length / ITEMS_PER_PAGE)
  const paginatedGrupos = filteredGrupos.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  )

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1)
  }, [searchFilter, categoryFilter, statusFilter])

  const gruposNaoCadastrados = whatsappGroups.filter(
    (g) => !gruposCadastrados.some((gc) => gc.chat_id_whatsapp === g.id)
  )

  const toggleGroupSelection = (groupId: string) => {
    const newSelected = new Set(selectedGroups)
    if (newSelected.has(groupId)) {
      newSelected.delete(groupId)
      const newCategories = { ...selectedCategories }
      delete newCategories[groupId]
      setSelectedCategories(newCategories)
    } else {
      newSelected.add(groupId)
    }
    setSelectedGroups(newSelected)
  }

  const toggleCategoryForGroup = (groupId: string, categoryId: number) => {
    const current = selectedCategories[groupId] || []
    if (current.includes(categoryId)) {
      setSelectedCategories({
        ...selectedCategories,
        [groupId]: current.filter(id => id !== categoryId)
      })
    } else {
      setSelectedCategories({
        ...selectedCategories,
        [groupId]: [...current, categoryId]
      })
    }
  }

  const handleSaveGroups = async () => {
    if (selectedGroups.size === 0) {
      toast.error("Selecione pelo menos um grupo")
      return
    }

    setSaving(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user?.email) return

      const { data: usuarioSistema } = await supabase
        .from("usuarios_sistema")
        .select("id_organizacao")
        .eq("email", user.email)
        .single()

      if (!usuarioSistema) return

      const gruposParaSalvar = Array.from(selectedGroups).map((groupId) => {
        const group = whatsappGroups.find((g) => g.id === groupId)!
        const cats = selectedCategories[groupId] || []
        return {
          id_organizacao: usuarioSistema.id_organizacao,
          id_instancia: instanceId,
          chat_id_whatsapp: groupId,
          nome: group.name,
          id_categoria: cats.length > 0 ? cats[0] : null,
          ativo: true,
        }
      })

      const { data: gruposInseridos, error } = await supabase
        .from("grupos")
        .insert(gruposParaSalvar)
        .select("id, chat_id_whatsapp")

      if (error) throw new Error(error.message)

      if (gruposInseridos) {
        const relacoes: { id_grupo: number; id_categoria: number }[] = []
        gruposInseridos.forEach(grupo => {
          const cats = selectedCategories[grupo.chat_id_whatsapp] || []
          cats.forEach(catId => {
            relacoes.push({ id_grupo: grupo.id, id_categoria: catId })
          })
        })

        if (relacoes.length > 0) {
          await supabase.from("grupos_categorias").insert(relacoes)
        }
      }

      toast.success(`${gruposParaSalvar.length} grupo(s) cadastrado(s) com sucesso!`)
      setDialogOpen(false)
      setSelectedGroups(new Set())
      setSelectedCategories({})
      loadData()
    } catch (err) {
      console.error("Erro ao salvar grupos:", err)
      toast.error("Erro ao cadastrar grupos")
    } finally {
      setSaving(false)
    }
  }

  const handleOpenEditDialog = (grupo: GrupoCadastrado) => {
    setEditingGroup(grupo)
    setEditGroupCategories(grupo.categorias || (grupo.id_categoria ? [grupo.id_categoria] : []))
    setEditDialogOpen(true)
  }

  const toggleEditCategory = (catId: number) => {
    setEditGroupCategories(prev => {
      if (prev.includes(catId)) {
        return prev.filter(id => id !== catId)
      } else {
        return [...prev, catId]
      }
    })
  }

  const handleSaveEdit = async () => {
    if (!editingGroup) return

    setSavingEdit(true)
    try {
      await supabase
        .from("grupos_categorias")
        .delete()
        .eq("id_grupo", editingGroup.id)

      if (editGroupCategories.length > 0) {
        await supabase
          .from("grupos_categorias")
          .insert(editGroupCategories.map(catId => ({
            id_grupo: editingGroup.id,
            id_categoria: catId
          })))
      }

      await supabase
        .from("grupos")
        .update({ id_categoria: editGroupCategories[0] || null })
        .eq("id", editingGroup.id)

      toast.success("Grupo atualizado com sucesso!")
      setEditDialogOpen(false)
      setEditingGroup(null)
      loadData()
    } catch (err) {
      console.error("Erro ao atualizar grupo:", err)
      toast.error("Erro ao atualizar grupo")
    } finally {
      setSavingEdit(false)
    }
  }

  const handleOpenDeleteDialog = (grupo: GrupoCadastrado) => {
    setGroupToDelete(grupo)
    setDeleteDialogOpen(true)
  }

  const handleDeleteGroup = async () => {
    if (!groupToDelete) return

    setDeletingGroup(true)
    try {
      await supabase
        .from("grupos_categorias")
        .delete()
        .eq("id_grupo", groupToDelete.id)

      const { error } = await supabase
        .from("grupos")
        .delete()
        .eq("id", groupToDelete.id)

      if (error) throw error

      toast.success("Grupo excluido com sucesso!")
      setDeleteDialogOpen(false)
      setGroupToDelete(null)
      loadData()
    } catch (err) {
      console.error("Erro ao excluir grupo:", err)
      toast.error("Erro ao excluir grupo")
    } finally {
      setDeletingGroup(false)
    }
  }

  const getCategoryColor = (catId: number) => {
    const cat = categorias.find(c => c.id === catId)
    return cat?.cor || "#64748b"
  }

  const getCategoryName = (catId: number) => {
    const cat = categorias.find(c => c.id === catId)
    return cat?.nome || "Categoria"
  }

  if (loading) {
    return (
      <div className="flex-1 space-y-4 p-4 md:p-6">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <Skeleton className="h-6 w-24" />
            <Skeleton className="h-4 w-40" />
          </div>
        </div>
        <div className="flex gap-3">
          <Skeleton className="h-9 w-52" />
          <Skeleton className="h-9 w-36" />
          <Skeleton className="h-9 w-36" />
        </div>
        <Skeleton className="h-80" />
      </div>
    )
  }

  return (
    <div className="flex-1 space-y-4 p-4 md:p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-foreground">Grupos</h2>
          <p className="text-sm text-muted-foreground">Gerencie grupos do WhatsApp</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <Bell className="h-4 w-4 text-muted-foreground" />
          </Button>
          {isConnected && (
            <Button size="sm" onClick={() => setDialogOpen(true)}>
              <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
              Sincronizar
            </Button>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Buscar..."
            value={searchFilter}
            onChange={(e) => setSearchFilter(e.target.value)}
            className="pl-8 h-9 text-sm"
          />
        </div>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-40 h-9 text-sm">
            <SelectValue placeholder="Categoria" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas</SelectItem>
            {categorias.map(cat => (
              <SelectItem key={cat.id} value={String(cat.id)}>
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full" style={{ backgroundColor: cat.cor }} />
                  {cat.nome}
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-32 h-9 text-sm">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="active">Ativo</SelectItem>
            <SelectItem value="archived">Arquivado</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Groups Table */}
      {gruposCadastrados.length > 0 ? (
        <Card>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="font-medium text-xs py-2">Nome</TableHead>
                  <TableHead className="font-medium text-xs py-2">Categorias</TableHead>
                  <TableHead className="font-medium text-xs py-2">Membros</TableHead>
                  <TableHead className="font-medium text-xs py-2">Status</TableHead>
                  <TableHead className="font-medium text-xs py-2 text-right">Acoes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedGrupos.map((grupo) => (
                  <TableRow
                    key={grupo.id}
                    className="hover:bg-muted/50 cursor-pointer"
                    onClick={() => handleOpenEditDialog(grupo)}
                  >
                    <TableCell className="font-medium text-sm py-2">{grupo.nome}</TableCell>
                    <TableCell className="py-2">
                      <div className="flex flex-wrap gap-1">
                        {grupo.categorias && grupo.categorias.length > 0 ? (
                          grupo.categorias.map(catId => (
                            <Badge
                              key={catId}
                              variant="secondary"
                              className="text-[10px] px-1.5 py-0"
                              style={{
                                backgroundColor: getCategoryColor(catId) + "20",
                                color: getCategoryColor(catId),
                              }}
                            >
                              <span
                                className="w-1 h-1 rounded-full mr-1"
                                style={{ backgroundColor: getCategoryColor(catId) }}
                              />
                              {getCategoryName(catId)}
                            </Badge>
                          ))
                        ) : (
                          <span className="text-muted-foreground text-xs">-</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm py-2">-</TableCell>
                    <TableCell className="py-2">
                      <Badge variant={grupo.ativo ? "default" : "secondary"} className={cn(
                        "text-[10px] px-1.5 py-0",
                        grupo.ativo
                          ? "bg-green-100 text-green-800 hover:bg-green-100"
                          : "bg-red-100 text-red-800 hover:bg-red-100"
                      )}>
                        {grupo.ativo ? "Ativo" : "Arquivado"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right py-2">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                          <Button variant="ghost" size="icon" className="h-7 w-7">
                            <MoreVertical className="h-3.5 w-3.5" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={(e) => {
                            e.stopPropagation()
                            handleOpenEditDialog(grupo)
                          }}>
                            <Pencil className="h-3.5 w-3.5 mr-2" />
                            Editar
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={(e) => {
                              e.stopPropagation()
                              handleOpenDeleteDialog(grupo)
                            }}
                            className="text-destructive"
                          >
                            <Trash2 className="h-3.5 w-3.5 mr-2" />
                            Excluir
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between px-3 py-2 border-t">
            <span className="text-xs text-muted-foreground">
              {((currentPage - 1) * ITEMS_PER_PAGE) + 1}-{Math.min(currentPage * ITEMS_PER_PAGE, filteredGrupos.length)} de {filteredGrupos.length}
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
                disabled={currentPage === totalPages}
              >
                <ChevronRight className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        </Card>
      ) : (
        <Card className="p-8">
          <div className="text-center">
            <div className="w-12 h-12 bg-muted rounded-full flex items-center justify-center mx-auto mb-3">
              <Users className="h-5 w-5 text-muted-foreground" />
            </div>
            <h3 className="text-sm font-semibold mb-1">Nenhum grupo cadastrado</h3>
            <p className="text-xs text-muted-foreground mb-4">
              {isConnected
                ? "Adicione grupos do WhatsApp para gerencia-los"
                : "Conecte uma instancia WhatsApp primeiro"}
            </p>
            {isConnected ? (
              <Button size="sm" onClick={() => setDialogOpen(true)}>
                <Plus className="h-3.5 w-3.5 mr-1.5" />
                Adicionar Grupos
              </Button>
            ) : (
              <Button size="sm" asChild>
                <Link href="/instances">
                  <Smartphone className="h-3.5 w-3.5 mr-1.5" />
                  Ver Instancias
                </Link>
              </Button>
            )}
          </div>
        </Card>
      )}

      {/* Footer */}
      <footer className="py-3 text-center text-xs text-muted-foreground border-t">
        <p>Copyright &copy; 2025 Sincron Grupos</p>
      </footer>

      {/* Sync Groups Dialog */}
      <Dialog open={dialogOpen} onOpenChange={(open) => {
        setDialogOpen(open)
        if (!open) setModalSearchFilter("")
      }}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Sincronizar Grupos
            </DialogTitle>
            <DialogDescription>
              Selecione grupos e categorias
            </DialogDescription>
          </DialogHeader>

          {gruposNaoCadastrados.length > 0 && (
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Pesquisar..."
                value={modalSearchFilter}
                onChange={(e) => setModalSearchFilter(e.target.value)}
                className="pl-9"
              />
            </div>
          )}

          <div className="flex-1 overflow-y-auto py-2 space-y-2">
            {loadingGroups ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : gruposNaoCadastrados.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-6 text-center">
                <div className="p-3 rounded-xl bg-muted mb-3">
                  <Check className="h-8 w-8 text-muted-foreground" />
                </div>
                <h3 className="font-semibold">Todos ja adicionados!</h3>
                <p className="text-sm text-muted-foreground mt-0.5">
                  Nenhum grupo disponivel
                </p>
              </div>
            ) : (
              gruposNaoCadastrados
                .filter((g) => g.name.toLowerCase().includes(modalSearchFilter.toLowerCase()))
                .map((group) => (
                <div
                  key={group.id}
                  className={cn(
                    "rounded-lg border transition-all p-3",
                    selectedGroups.has(group.id)
                      ? "ring-2 ring-primary bg-muted/50"
                      : "hover:bg-muted/30"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <Checkbox
                      checked={selectedGroups.has(group.id)}
                      onCheckedChange={() => toggleGroupSelection(group.id)}
                    />
                    <Avatar className="h-10 w-10 shrink-0">
                      <AvatarImage src={group.picture || undefined} />
                      <AvatarFallback className="bg-muted">
                        <Users className="h-4 w-4 text-muted-foreground" />
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{group.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {group.participants ? `${group.participants} participantes` : "WhatsApp"}
                      </p>
                    </div>
                  </div>

                  {selectedGroups.has(group.id) && categorias.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t">
                      {categorias.map((cat) => {
                        const isSelected = (selectedCategories[group.id] || []).includes(cat.id)
                        return (
                          <button
                            key={cat.id}
                            type="button"
                            onClick={() => toggleCategoryForGroup(group.id, cat.id)}
                            className={cn(
                              "flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium transition-all",
                              !isSelected && "opacity-60 hover:opacity-100"
                            )}
                            style={{
                              backgroundColor: isSelected ? cat.cor + "20" : "transparent",
                              borderColor: cat.cor,
                              color: cat.cor,
                              border: `1px solid ${cat.cor}`,
                            }}
                          >
                            <div
                              className="h-2 w-2 rounded-full"
                              style={{ backgroundColor: cat.cor }}
                            />
                            {cat.nome}
                            {isSelected && <Check className="h-3 w-3" />}
                          </button>
                        )
                      })}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>

          <DialogFooter className="border-t pt-4">
            <p className="text-sm text-muted-foreground flex-1">
              {selectedGroups.size} selecionado(s)
            </p>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={saving}>
              Cancelar
            </Button>
            <Button onClick={handleSaveGroups} disabled={saving || selectedGroups.size === 0}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Adicionar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Group Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Editar Grupo</DialogTitle>
          </DialogHeader>

          {editingGroup && (
            <div className="space-y-4">
              <div>
                <Label className="text-muted-foreground text-sm">Nome do grupo</Label>
                <Input value={editingGroup.nome} disabled className="bg-muted mt-1" />
              </div>

              <div>
                <Label className="text-sm">Categorias</Label>
                <div className="flex flex-wrap gap-2 mt-2">
                  {categorias.map(cat => {
                    const isSelected = editGroupCategories.includes(cat.id)
                    return (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => toggleEditCategory(cat.id)}
                        className={cn(
                          "flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-all border",
                          isSelected && "ring-2 ring-offset-1"
                        )}
                        style={{
                          backgroundColor: isSelected ? cat.cor + "20" : "transparent",
                          borderColor: cat.cor,
                          color: cat.cor,
                          boxShadow: isSelected ? `0 0 0 2px ${cat.cor}40` : "none",
                        }}
                      >
                        <div className="h-2 w-2 rounded-full" style={{ backgroundColor: cat.cor }} />
                        {cat.nome}
                        {isSelected && <Check className="h-3 w-3" />}
                      </button>
                    )
                  })}
                </div>
              </div>

              <div>
                <Label className="text-muted-foreground text-sm">ID WhatsApp</Label>
                <Input value={editingGroup.chat_id_whatsapp} disabled className="bg-muted mt-1 text-xs" />
              </div>
            </div>
          )}

          <DialogFooter className="bg-muted -mx-6 -mb-6 mt-6 p-4 rounded-b-lg">
            <Button variant="outline" onClick={() => setEditDialogOpen(false)} disabled={savingEdit}>
              Cancelar
            </Button>
            <Button onClick={handleSaveEdit} disabled={savingEdit}>
              {savingEdit ? <Loader2 className="h-4 w-4 animate-spin" /> : "Salvar Alteracoes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Group Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              Excluir Grupo
            </DialogTitle>
          </DialogHeader>

          {groupToDelete && (
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-3 rounded-lg bg-muted">
                <div className="h-10 w-10 rounded-full bg-background flex items-center justify-center">
                  <Users className="h-5 w-5 text-muted-foreground" />
                </div>
                <div>
                  <p className="font-medium">{groupToDelete.nome}</p>
                  <p className="text-xs text-muted-foreground">
                    {groupToDelete.categorias?.length || 0} categoria(s)
                  </p>
                </div>
              </div>
              <p className="text-sm text-muted-foreground">
                O grupo sera removido do sistema mas continuara no WhatsApp.
              </p>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)} disabled={deletingGroup}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={handleDeleteGroup} disabled={deletingGroup}>
              {deletingGroup ? <Loader2 className="h-4 w-4 animate-spin" /> : "Excluir"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
