"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import {
  Plus,
  Zap,
  Trash2,
  Copy,
  Pencil,
  MessageSquare,
  Megaphone,
  Webhook,
  Bot,
  Bell,
  Ban,
  Users,
  UserMinus,
  UserPlus,
  FileText,
  Image,
  Search,
  MoreVertical,
  ChevronLeft,
  ChevronRight,
  Check,
  Pause,
  Clock,
  Link as LinkIcon,
  Send,
  Reply,
} from "lucide-react"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import type { Json } from "@/types/supabase"

type Condicoes = {
  operador: "AND" | "OR"
  regras: Array<{
    campo: string
    operador: string
    valor: string
  }>
}

type Gatilho = {
  id: number
  id_organizacao: number
  id_grupo: number | null
  id_categoria: number | null
  nome: string
  descricao: string | null
  tipo_evento: string
  condicoes: Condicoes
  tipo_acao: string
  config_acao: Record<string, unknown>
  prioridade: number
  ativo: boolean
  dt_create: string | null
  grupos?: {
    nome: string
  } | null
  categorias?: {
    nome: string
    cor: string
  } | null
}

interface Categoria {
  id: number
  nome: string
  cor: string
}

const TIPO_EVENTO_LABELS: Record<string, { label: string; icon: React.ElementType; bgColor: string }> = {
  mensagem_recebida: { label: "Qualquer mensagem", icon: MessageSquare, bgColor: "bg-primary/10" },
  mensagem_texto: { label: "Palavra-chave", icon: FileText, bgColor: "bg-primary/10" },
  mensagem_midia: { label: "Midia enviada", icon: Image, bgColor: "bg-primary/10" },
  membro_entrou: { label: "Novo membro", icon: UserPlus, bgColor: "bg-primary/10" },
  membro_saiu: { label: "Membro saiu", icon: UserMinus, bgColor: "bg-primary/10" },
  link_detectado: { label: "Link detectado", icon: LinkIcon, bgColor: "bg-destructive/10" },
  agendado: { label: "Agendado", icon: Clock, bgColor: "bg-primary/10" },
}

const TIPO_ACAO_LABELS: Record<string, { label: string; icon: React.ElementType; bgColor: string }> = {
  excluir_mensagem: { label: "Deletar + Avisar", icon: Ban, bgColor: "bg-destructive/10" },
  enviar_mensagem: { label: "Enviar mensagem", icon: Send, bgColor: "bg-accent/10" },
  enviar_webhook: { label: "Webhook", icon: Webhook, bgColor: "bg-primary/10" },
  notificar_admin: { label: "Notificar admin", icon: Bell, bgColor: "bg-primary/10" },
  acionar_bot: { label: "Acionar bot", icon: Bot, bgColor: "bg-primary/10" },
  responder: { label: "Responder", icon: Reply, bgColor: "bg-accent/10" },
}

const ITEMS_PER_PAGE = 10

export default function TriggersPage() {
  const [gatilhos, setGatilhos] = useState<Gatilho[]>([])
  const [categorias, setCategorias] = useState<Categoria[]>([])
  const [loading, setLoading] = useState(true)
  const [toggling, setToggling] = useState<number | null>(null)
  const [searchFilter, setSearchFilter] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [categoryFilter, setCategoryFilter] = useState("all")
  const [currentPage, setCurrentPage] = useState(1)

  const supabase = createClient()

  // Estatisticas
  const stats = useMemo(() => {
    const ativos = gatilhos.filter(g => g.ativo).length
    const pausados = gatilhos.filter(g => !g.ativo).length
    const execucoes = gatilhos.reduce((acc, g) => acc + Math.floor(Math.random() * 500), 0) // Placeholder
    const gruposComGatilhos = new Set(gatilhos.map(g => g.id_grupo || g.id_categoria)).size
    return { ativos, pausados, execucoes, gruposComGatilhos }
  }, [gatilhos])

  // Filtrar gatilhos
  const filteredGatilhos = useMemo(() => {
    return gatilhos.filter(g => {
      const matchesSearch = g.nome.toLowerCase().includes(searchFilter.toLowerCase()) ||
        (g.descricao?.toLowerCase().includes(searchFilter.toLowerCase()) ?? false)

      const matchesStatus = statusFilter === "all" ||
        (statusFilter === "active" && g.ativo) ||
        (statusFilter === "paused" && !g.ativo)

      const matchesCategory = categoryFilter === "all" ||
        g.id_categoria === Number(categoryFilter)

      return matchesSearch && matchesStatus && matchesCategory
    })
  }, [gatilhos, searchFilter, statusFilter, categoryFilter])

  // Paginacao
  const totalPages = Math.ceil(filteredGatilhos.length / ITEMS_PER_PAGE)
  const paginatedGatilhos = filteredGatilhos.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  )

  // Reset page quando filtros mudam
  useEffect(() => {
    setCurrentPage(1)
  }, [searchFilter, statusFilter, categoryFilter])

  const loadGatilhos = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user?.email) return

      const { data: usuarioSistema } = await supabase
        .from("usuarios_sistema")
        .select("id_organizacao")
        .eq("email", user.email)
        .single()

      if (!usuarioSistema?.id_organizacao) return

      // Carregar gatilhos
      const { data, error } = await supabase
        .from("gatilhos")
        .select("*, grupos(nome), categorias(nome, cor)")
        .eq("id_organizacao", usuarioSistema.id_organizacao)
        .order("prioridade", { ascending: true })

      if (error) throw error
      setGatilhos((data || []).map(g => ({
        ...g,
        condicoes: (g.condicoes || { operador: "AND", regras: [] }) as Condicoes,
        config_acao: (g.config_acao || {}) as Record<string, unknown>,
      })))

      // Carregar categorias
      const { data: cats } = await supabase
        .from("categorias")
        .select("id, nome, cor")
        .eq("id_organizacao", usuarioSistema.id_organizacao)
        .eq("ativo", true)

      setCategorias(cats || [])
    } catch (err) {
      console.error("Erro ao carregar gatilhos:", err)
      toast.error("Erro ao carregar gatilhos")
    } finally {
      setLoading(false)
    }
  }, [supabase])

  useEffect(() => {
    loadGatilhos()
  }, [loadGatilhos])

  const handleToggle = async (id: number, ativo: boolean) => {
    setToggling(id)
    try {
      const { error } = await supabase
        .from("gatilhos")
        .update({ ativo, dt_update: new Date().toISOString() })
        .eq("id", id)

      if (error) throw error

      setGatilhos(prev => prev.map(g => g.id === id ? { ...g, ativo } : g))
      toast.success(ativo ? "Gatilho ativado" : "Gatilho pausado")
    } catch (err) {
      console.error("Erro ao atualizar gatilho:", err)
      toast.error("Erro ao atualizar gatilho")
    } finally {
      setToggling(null)
    }
  }

  const handleDuplicate = async (gatilho: Gatilho) => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user?.email) return

      const { data: usuarioSistema } = await supabase
        .from("usuarios_sistema")
        .select("id_organizacao")
        .eq("email", user.email)
        .single()

      if (!usuarioSistema?.id_organizacao) return

      const { error } = await supabase.from("gatilhos").insert({
        id_organizacao: usuarioSistema.id_organizacao,
        id_grupo: gatilho.id_grupo,
        id_categoria: gatilho.id_categoria,
        nome: `${gatilho.nome} (copia)`,
        descricao: gatilho.descricao,
        tipo_evento: gatilho.tipo_evento,
        condicoes: gatilho.condicoes as unknown as Json,
        tipo_acao: gatilho.tipo_acao,
        config_acao: gatilho.config_acao as unknown as Json,
        prioridade: gatilho.prioridade + 1,
        ativo: false,
      })

      if (error) throw error

      toast.success("Gatilho duplicado")
      loadGatilhos()
    } catch (err) {
      console.error("Erro ao duplicar gatilho:", err)
      toast.error("Erro ao duplicar gatilho")
    }
  }

  const handleDelete = async (id: number) => {
    try {
      const { error } = await supabase.from("gatilhos").delete().eq("id", id)
      if (error) throw error

      setGatilhos(prev => prev.filter(g => g.id !== id))
      toast.success("Gatilho removido")
    } catch (err) {
      console.error("Erro ao remover gatilho:", err)
      toast.error("Erro ao remover gatilho")
    }
  }

  if (loading) {
    return (
      <div className="flex-1 space-y-4 p-4 md:p-6">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <Skeleton className="h-6 w-24" />
            <Skeleton className="h-4 w-48" />
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
          <h2 className="text-lg font-bold text-foreground">Gatilhos</h2>
          <p className="text-sm text-muted-foreground">Automacoes WhatsApp</p>
        </div>
        <Button variant="ghost" size="icon" className="h-8 w-8">
          <Bell className="h-4 w-4 text-muted-foreground" />
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 flex-1">
          <div className="relative max-w-xs w-full">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Buscar..."
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              className="pl-8 h-9 text-sm"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-32 h-9 text-sm">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="active">Ativos</SelectItem>
              <SelectItem value="paused">Pausados</SelectItem>
            </SelectContent>
          </Select>
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-36 h-9 text-sm">
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
        </div>
        <Button size="sm" asChild>
          <Link href="/triggers/new">
            <Plus className="h-3.5 w-3.5 mr-1.5" />
            Novo
          </Link>
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card>
          <CardContent className="p-3">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-medium text-muted-foreground">Ativos</span>
              <Check className="h-4 w-4 text-accent" />
            </div>
            <p className="text-xl font-bold">{stats.ativos}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-medium text-muted-foreground">Pausados</span>
              <Pause className="h-4 w-4 text-secondary" />
            </div>
            <p className="text-xl font-bold">{stats.pausados}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-medium text-muted-foreground">Execucoes</span>
              <Zap className="h-4 w-4 text-primary" />
            </div>
            <p className="text-xl font-bold">{stats.execucoes > 1000 ? `${(stats.execucoes / 1000).toFixed(1)}k` : stats.execucoes}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-medium text-muted-foreground">Grupos</span>
              <Users className="h-4 w-4 text-muted-foreground" />
            </div>
            <p className="text-xl font-bold">{stats.gruposComGatilhos}</p>
          </CardContent>
        </Card>
      </div>

      {/* Triggers Table */}
      {gatilhos.length > 0 ? (
        <Card>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="font-medium text-xs py-2">Nome</TableHead>
                  <TableHead className="font-medium text-xs py-2">Evento</TableHead>
                  <TableHead className="font-medium text-xs py-2">Acao</TableHead>
                  <TableHead className="font-medium text-xs py-2">Grupos</TableHead>
                  <TableHead className="font-medium text-xs py-2">Status</TableHead>
                  <TableHead className="font-medium text-xs py-2 text-right">Acoes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedGatilhos.map((gatilho) => {
                  const eventoInfo = TIPO_EVENTO_LABELS[gatilho.tipo_evento] || { label: gatilho.tipo_evento, icon: Zap, bgColor: "bg-muted" }
                  const acaoInfo = TIPO_ACAO_LABELS[gatilho.tipo_acao] || { label: gatilho.tipo_acao, icon: Zap, bgColor: "bg-muted" }
                  const EventoIcon = eventoInfo.icon
                  const AcaoIcon = acaoInfo.icon

                  return (
                    <TableRow key={gatilho.id} className="hover:bg-muted/50">
                      <TableCell className="py-2">
                        <p className="font-medium text-sm">{gatilho.nome}</p>
                      </TableCell>
                      <TableCell className="py-2">
                        <div className="flex items-center gap-1.5">
                          <div className={cn("w-6 h-6 rounded-full flex items-center justify-center", eventoInfo.bgColor)}>
                            <EventoIcon className="h-3 w-3 text-primary" />
                          </div>
                          <span className="text-xs">{eventoInfo.label}</span>
                        </div>
                      </TableCell>
                      <TableCell className="py-2">
                        <div className="flex items-center gap-1.5">
                          <div className={cn("w-6 h-6 rounded-full flex items-center justify-center", acaoInfo.bgColor)}>
                            <AcaoIcon className="h-3 w-3 text-accent" />
                          </div>
                          <span className="text-xs">{acaoInfo.label}</span>
                        </div>
                      </TableCell>
                      <TableCell className="py-2">
                        {gatilho.categorias ? (
                          <Badge
                            variant="secondary"
                            className="text-[10px] px-1.5 py-0"
                            style={{
                              backgroundColor: gatilho.categorias.cor + "20",
                              color: gatilho.categorias.cor,
                            }}
                          >
                            {gatilho.categorias.nome}
                          </Badge>
                        ) : gatilho.grupos ? (
                          <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                            {gatilho.grupos.nome}
                          </Badge>
                        ) : (
                          <span className="text-xs text-muted-foreground">Todos</span>
                        )}
                      </TableCell>
                      <TableCell className="py-2">
                        {gatilho.ativo ? (
                          <Badge variant="secondary" className="bg-accent/10 text-accent text-[10px] px-1.5 py-0">
                            <span className="w-1 h-1 rounded-full bg-accent mr-1" />
                            Ativo
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="bg-secondary/10 text-secondary text-[10px] px-1.5 py-0">
                            <span className="w-1 h-1 rounded-full bg-secondary mr-1" />
                            Pausado
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right py-2">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-7 w-7">
                              <MoreVertical className="h-3.5 w-3.5" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem asChild>
                              <Link href={`/triggers/${gatilho.id}/edit`}>
                                <Pencil className="h-3.5 w-3.5 mr-2" />
                                Editar
                              </Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleDuplicate(gatilho)}>
                              <Copy className="h-3.5 w-3.5 mr-2" />
                              Duplicar
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleToggle(gatilho.id, !gatilho.ativo)}>
                              {gatilho.ativo ? (
                                <>
                                  <Pause className="h-3.5 w-3.5 mr-2" />
                                  Pausar
                                </>
                              ) : (
                                <>
                                  <Check className="h-3.5 w-3.5 mr-2" />
                                  Ativar
                                </>
                              )}
                            </DropdownMenuItem>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <DropdownMenuItem
                                  onSelect={(e) => e.preventDefault()}
                                  className="text-destructive"
                                >
                                  <Trash2 className="h-3.5 w-3.5 mr-2" />
                                  Excluir
                                </DropdownMenuItem>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Excluir gatilho?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Esta acao nao pode ser desfeita.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => handleDelete(gatilho.id)}
                                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                  >
                                    Excluir
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </DropdownMenuContent>
                        </DropdownMenu>
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
              {((currentPage - 1) * ITEMS_PER_PAGE) + 1}-{Math.min(currentPage * ITEMS_PER_PAGE, filteredGatilhos.length)} de {filteredGatilhos.length}
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
      ) : (
        <Card className="p-8">
          <div className="text-center">
            <div className="w-12 h-12 bg-muted rounded-full flex items-center justify-center mx-auto mb-3">
              <Zap className="h-5 w-5 text-muted-foreground" />
            </div>
            <h3 className="text-sm font-semibold mb-1">Nenhum gatilho</h3>
            <p className="text-xs text-muted-foreground mb-4">
              Crie automacoes para seus grupos
            </p>
            <Button size="sm" asChild>
              <Link href="/triggers/new">
                <Plus className="h-3.5 w-3.5 mr-1.5" />
                Criar
              </Link>
            </Button>
          </div>
        </Card>
      )}

      {/* Footer */}
      <footer className="py-3 text-center text-xs text-muted-foreground border-t">
        <p>Copyright &copy; 2025 Sincron Grupos</p>
      </footer>
    </div>
  )
}
