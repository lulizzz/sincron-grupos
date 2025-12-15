"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Plus,
  Brain,
  Trash2,
  Pencil,
  Bot,
  MessageSquare,
  Sparkles,
  Info,
  Cpu,
  Thermometer,
  Loader2,
  Search,
  Bell,
  MoreVertical,
  BarChart3,
  Settings,
  Check,
  AlertCircle,
  Database,
  MessagesSquare,
  Clock,
  GraduationCap,
  ArrowUp,
  Headset,
  Shield,
  Target,
  ChevronRight,
} from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

type AgenteIA = {
  id: number
  id_organizacao: number
  nome: string
  descricao: string | null
  prompt_sistema: string
  modelo: string
  temperatura: number | null
  max_tokens: number | null
  responder_no_grupo: boolean | null
  ativo: boolean
  dt_create: string | null
}

type FormData = {
  nome: string
  descricao: string
  prompt_sistema: string
  modelo: string
  temperatura: number
  max_tokens: number
  responder_no_grupo: boolean
}

const MODELOS = [
  { value: "gpt-4o-mini", label: "GPT-4o Mini", desc: "Rapido e economico" },
  { value: "gpt-4o", label: "GPT-4o", desc: "Mais inteligente" },
  { value: "gpt-4-turbo", label: "GPT-4 Turbo", desc: "Alta capacidade" },
  { value: "claude-3-haiku", label: "Claude 3 Haiku", desc: "Rapido e eficiente" },
  { value: "claude-3-sonnet", label: "Claude 3 Sonnet", desc: "Equilibrado" },
]

const TIPOS_AGENTE = [
  { value: "vendas", label: "Vendas", icon: Bot },
  { value: "suporte", label: "Atendimento/Suporte", icon: Headset },
  { value: "moderacao", label: "Moderacao", icon: Shield },
  { value: "informativo", label: "Informativo", icon: Info },
]

const initialFormData: FormData = {
  nome: "",
  descricao: "",
  prompt_sistema: "",
  modelo: "gpt-4o-mini",
  temperatura: 0.7,
  max_tokens: 1000,
  responder_no_grupo: true,
}

// Simular estatisticas (em producao, viria do backend)
const getAgentStats = (id: number) => ({
  gruposAtivos: Math.floor(Math.random() * 15) + 1,
  respostasHoje: Math.floor(Math.random() * 100),
  taxaAcerto: Math.floor(Math.random() * 15) + 85,
})

// Atividades recentes simuladas
const ATIVIDADES_RECENTES = [
  { id: 1, agente: "Bot Vendas", grupo: "Vendas SP", tipo: "sucesso", descricao: "Pergunta sobre preco do produto Premium", confianca: 96, tempo: "ha 5 minutos" },
  { id: 2, agente: "Bot Suporte", grupo: "Suporte Premium", tipo: "sucesso", descricao: "Duvida sobre instalacao do aplicativo", confianca: 89, tempo: "ha 12 minutos" },
  { id: 3, agente: "Bot Vendas", grupo: "Leads Novembro", tipo: "sucesso", descricao: "Informacoes sobre formas de pagamento", confianca: 98, tempo: "ha 23 minutos" },
  { id: 4, agente: "Bot Suporte", grupo: "Suporte Geral", tipo: "erro", descricao: "Pergunta fora do escopo de conhecimento", confianca: 34, tempo: "ha 1 hora" },
  { id: 5, agente: "Bot Vendas", grupo: "Comunidade Geral", tipo: "sucesso", descricao: "Informacoes sobre recursos do produto", confianca: 92, tempo: "ha 2 horas" },
]

export default function AIPage() {
  const [agentes, setAgentes] = useState<AgenteIA[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [toggling, setToggling] = useState<number | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [formData, setFormData] = useState<FormData>(initialFormData)
  const [searchFilter, setSearchFilter] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")

  const supabase = createClient()

  // Estatisticas gerais
  const stats = useMemo(() => {
    const totalRespostas = agentes.reduce((acc, a) => acc + (a.ativo ? getAgentStats(a.id).respostasHoje : 0), 0)
    const ativos = agentes.filter(a => a.ativo).length
    const taxaMedia = agentes.length > 0
      ? Math.round(agentes.reduce((acc, a) => acc + getAgentStats(a.id).taxaAcerto, 0) / agentes.length)
      : 0
    return { totalRespostas, ativos, inativos: agentes.length - ativos, taxaMedia }
  }, [agentes])

  // Filtrar agentes
  const filteredAgentes = useMemo(() => {
    return agentes.filter(a => {
      const matchesSearch = a.nome.toLowerCase().includes(searchFilter.toLowerCase()) ||
        (a.descricao?.toLowerCase().includes(searchFilter.toLowerCase()) ?? false)

      const matchesStatus = statusFilter === "all" ||
        (statusFilter === "active" && a.ativo) ||
        (statusFilter === "inactive" && !a.ativo)

      return matchesSearch && matchesStatus
    })
  }, [agentes, searchFilter, statusFilter])

  const loadAgentes = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user?.email) return

      const { data: usuarioSistema } = await supabase
        .from("usuarios_sistema")
        .select("id_organizacao")
        .eq("email", user.email)
        .single()

      if (!usuarioSistema?.id_organizacao) return

      const { data, error } = await supabase
        .from("agentes_ia")
        .select("*")
        .eq("id_organizacao", usuarioSistema.id_organizacao)
        .order("nome")

      if (error) throw error
      setAgentes(data || [])
    } catch (err) {
      console.error("Erro ao carregar agentes:", err)
      toast.error("Erro ao carregar agentes de IA")
    } finally {
      setLoading(false)
    }
  }, [supabase])

  useEffect(() => {
    loadAgentes()
  }, [loadAgentes])

  const handleToggle = async (id: number, ativo: boolean) => {
    setToggling(id)
    try {
      const { error } = await supabase
        .from("agentes_ia")
        .update({ ativo, dt_update: new Date().toISOString() })
        .eq("id", id)

      if (error) throw error

      setAgentes(prev => prev.map(a => a.id === id ? { ...a, ativo } : a))
      toast.success(ativo ? "Agente ativado" : "Agente desativado")
    } catch (err) {
      console.error("Erro ao atualizar agente:", err)
      toast.error("Erro ao atualizar agente")
    } finally {
      setToggling(null)
    }
  }

  const handleSubmit = async () => {
    if (!formData.nome.trim() || !formData.prompt_sistema.trim()) {
      toast.error("Preencha o nome e o prompt do sistema")
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

      if (!usuarioSistema?.id_organizacao) return

      if (editingId) {
        const { error } = await supabase
          .from("agentes_ia")
          .update({
            nome: formData.nome,
            descricao: formData.descricao || null,
            prompt_sistema: formData.prompt_sistema,
            modelo: formData.modelo,
            temperatura: formData.temperatura,
            max_tokens: formData.max_tokens,
            responder_no_grupo: formData.responder_no_grupo,
            dt_update: new Date().toISOString(),
          })
          .eq("id", editingId)

        if (error) throw error
        toast.success("Agente atualizado com sucesso!")
      } else {
        const { error } = await supabase.from("agentes_ia").insert({
          id_organizacao: usuarioSistema.id_organizacao,
          nome: formData.nome,
          descricao: formData.descricao || null,
          prompt_sistema: formData.prompt_sistema,
          modelo: formData.modelo,
          temperatura: formData.temperatura,
          max_tokens: formData.max_tokens,
          responder_no_grupo: formData.responder_no_grupo,
          ativo: true,
        })

        if (error) throw error
        toast.success("Agente criado com sucesso!")
      }

      setDialogOpen(false)
      setEditingId(null)
      setFormData(initialFormData)
      loadAgentes()
    } catch (err) {
      console.error("Erro ao salvar agente:", err)
      toast.error("Erro ao salvar agente")
    } finally {
      setSaving(false)
    }
  }

  const handleEdit = (agente: AgenteIA) => {
    setEditingId(agente.id)
    setFormData({
      nome: agente.nome,
      descricao: agente.descricao || "",
      prompt_sistema: agente.prompt_sistema,
      modelo: agente.modelo,
      temperatura: agente.temperatura || 0.7,
      max_tokens: agente.max_tokens || 1000,
      responder_no_grupo: agente.responder_no_grupo !== false,
    })
    setDialogOpen(true)
  }

  const handleDelete = async (id: number) => {
    try {
      const { error } = await supabase.from("agentes_ia").delete().eq("id", id)
      if (error) throw error

      setAgentes(prev => prev.filter(a => a.id !== id))
      toast.success("Agente removido")
    } catch (err) {
      console.error("Erro ao remover agente:", err)
      toast.error("Erro ao remover agente")
    }
  }

  const handleDialogChange = (open: boolean) => {
    setDialogOpen(open)
    if (!open) {
      setEditingId(null)
      setFormData(initialFormData)
    }
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
        <Skeleton className="h-9 w-full" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-52" />)}
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 space-y-4 p-4 md:p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-foreground">Agentes IA</h2>
          <p className="text-sm text-muted-foreground">Bots de inteligencia artificial</p>
        </div>
        <Button variant="ghost" size="icon" className="h-8 w-8">
          <Bell className="h-4 w-4 text-muted-foreground" />
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
        <div className="flex items-center gap-2">
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
              <SelectItem value="inactive">Inativos</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button size="sm" onClick={() => setDialogOpen(true)}>
          <Plus className="h-3.5 w-3.5 mr-1.5" />
          Novo
        </Button>
      </div>

      {/* Agents Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredAgentes.map((agente) => {
          const agentStats = getAgentStats(agente.id)

          return (
            <Card key={agente.id} className="hover:border-primary transition-colors">
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className={cn(
                      "p-2 rounded-lg",
                      agente.ativo ? "bg-primary/10" : "bg-muted"
                    )}>
                      <Bot className={cn(
                        "h-4 w-4",
                        agente.ativo ? "text-primary" : "text-muted-foreground"
                      )} />
                    </div>
                    <div>
                      <h3 className="font-semibold text-sm">{agente.nome}</h3>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className={cn(
                          "w-1.5 h-1.5 rounded-full",
                          agente.ativo ? "bg-accent" : "bg-muted-foreground"
                        )} />
                        <span className="text-[10px] text-muted-foreground">
                          {agente.ativo ? "Ativo" : "Inativo"}
                        </span>
                      </div>
                    </div>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-7 w-7">
                        <MoreVertical className="h-3.5 w-3.5" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => handleEdit(agente)}>
                        <Pencil className="h-3.5 w-3.5 mr-2" />
                        Editar
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleToggle(agente.id, !agente.ativo)}>
                        {agente.ativo ? "Desativar" : "Ativar"}
                      </DropdownMenuItem>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-destructive">
                            <Trash2 className="h-3.5 w-3.5 mr-2" />
                            Excluir
                          </DropdownMenuItem>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Excluir agente?</AlertDialogTitle>
                            <AlertDialogDescription>
                              O agente sera removido permanentemente.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleDelete(agente.id)}
                              className="bg-destructive text-destructive-foreground"
                            >
                              Excluir
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                <p className="text-xs text-muted-foreground mb-3 line-clamp-2">
                  {agente.descricao || "Sem descricao"}
                </p>

                <div className="space-y-1.5 mb-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Grupos</span>
                    <span className="font-medium">{agente.ativo ? agentStats.gruposAtivos : 0}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Respostas</span>
                    <span className="font-medium">{agente.ativo ? agentStats.respostasHoje : 0}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Acerto</span>
                    <span className={cn("font-medium", agente.ativo ? "text-accent" : "text-muted-foreground")}>
                      {agente.ativo ? `${agentStats.taxaAcerto}%` : "-"}
                    </span>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button variant="secondary" size="sm" className="flex-1 h-8 text-xs">
                    <BarChart3 className="h-3 w-3 mr-1" />
                    Metricas
                  </Button>
                  <Button size="sm" className="flex-1 h-8 text-xs" onClick={() => handleEdit(agente)}>
                    <Settings className="h-3 w-3 mr-1" />
                    Config
                  </Button>
                </div>
              </CardContent>
            </Card>
          )
        })}

        {/* Empty Card - Create New */}
        <Card
          className="border-2 border-dashed hover:border-primary transition-colors cursor-pointer"
          onClick={() => setDialogOpen(true)}
        >
          <CardContent className="p-4 flex flex-col items-center justify-center text-center h-full min-h-[220px]">
            <div className="bg-muted p-3 rounded-full mb-3">
              <Plus className="h-5 w-5 text-muted-foreground" />
            </div>
            <h3 className="font-semibold text-sm mb-1">Novo agente</h3>
            <p className="text-xs text-muted-foreground">Configure um bot de IA</p>
          </CardContent>
        </Card>
      </div>

      {/* Performance Section */}
      <Card>
        <CardHeader className="py-3 px-4">
          <CardTitle className="text-sm">Performance</CardTitle>
        </CardHeader>
        <CardContent className="pt-0 px-4 pb-4">
          <div className="grid grid-cols-3 gap-3 mb-4">
            <div className="bg-muted rounded-lg p-3">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-medium text-muted-foreground">Respostas</span>
                <MessageSquare className="h-3.5 w-3.5 text-muted-foreground" />
              </div>
              <p className="text-xl font-bold">{stats.totalRespostas > 1000 ? `${(stats.totalRespostas / 1000).toFixed(1)}k` : stats.totalRespostas}</p>
            </div>
            <div className="bg-muted rounded-lg p-3">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-medium text-muted-foreground">Acerto</span>
                <Target className="h-3.5 w-3.5 text-muted-foreground" />
              </div>
              <p className="text-xl font-bold">{stats.taxaMedia}%</p>
            </div>
            <div className="bg-muted rounded-lg p-3">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-medium text-muted-foreground">Ativos</span>
                <Bot className="h-3.5 w-3.5 text-muted-foreground" />
              </div>
              <p className="text-xl font-bold">{stats.ativos}/{agentes.length}</p>
            </div>
          </div>
          <div className="bg-muted/50 rounded-lg p-4 text-center">
            <BarChart3 className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-xs text-muted-foreground">Grafico em breve</p>
          </div>
        </CardContent>
      </Card>

      {/* Recent Activity Section */}
      <Card>
        <CardHeader className="py-3 px-4 flex flex-row items-center justify-between">
          <CardTitle className="text-sm">Atividade Recente</CardTitle>
          <Button variant="link" size="sm" className="text-xs text-primary h-auto p-0">Ver todas</Button>
        </CardHeader>
        <CardContent className="pt-0 px-4 pb-4">
          <div className="space-y-3">
            {ATIVIDADES_RECENTES.slice(0, 3).map((atividade, idx) => (
              <div key={atividade.id} className={cn("flex items-start gap-3 pb-3", idx < 2 && "border-b")}>
                <div className={cn(
                  "p-1.5 rounded-lg shrink-0",
                  atividade.tipo === "sucesso" ? "bg-accent/10" : "bg-destructive/10"
                )}>
                  {atividade.tipo === "sucesso" ? (
                    <Check className="h-3 w-3 text-accent" />
                  ) : (
                    <AlertCircle className="h-3 w-3 text-destructive" />
                  )}
                </div>
                <div className="flex-1">
                  <p className="text-xs font-medium">
                    {atividade.agente} - {atividade.grupo}
                  </p>
                  <p className="text-[10px] text-muted-foreground">{atividade.tempo}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Training Section */}
      <Card>
        <CardHeader className="py-3 px-4 flex flex-row items-center justify-between">
          <CardTitle className="text-sm">Treinamento</CardTitle>
          <Button size="sm" className="h-8 text-xs">
            <GraduationCap className="h-3 w-3 mr-1" />
            Treinar
          </Button>
        </CardHeader>
        <CardContent className="pt-0 px-4 pb-4">
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-muted rounded-lg p-3">
              <div className="flex items-center gap-1.5 mb-2">
                <Database className="h-3 w-3 text-primary" />
                <span className="font-medium text-xs">Base</span>
              </div>
              <p className="text-lg font-bold">347</p>
              <p className="text-[10px] text-muted-foreground">docs</p>
            </div>
            <div className="bg-muted rounded-lg p-3">
              <div className="flex items-center gap-1.5 mb-2">
                <MessagesSquare className="h-3 w-3 text-primary" />
                <span className="font-medium text-xs">Conversas</span>
              </div>
              <p className="text-lg font-bold">2.1k</p>
              <p className="text-[10px] text-muted-foreground">30 dias</p>
            </div>
            <div className="bg-muted rounded-lg p-3">
              <div className="flex items-center gap-1.5 mb-2">
                <Clock className="h-3 w-3 text-primary" />
                <span className="font-medium text-xs">Ultimo</span>
              </div>
              <p className="text-lg font-bold">3d</p>
              <p className="text-[10px] text-muted-foreground">atras</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Footer */}
      <footer className="py-3 text-center text-xs text-muted-foreground border-t">
        <p>Copyright &copy; 2025 Sincron Grupos</p>
      </footer>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={handleDialogChange}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? "Editar Agente" : "Criar Novo Agente"}</DialogTitle>
            <DialogDescription>
              Configure as informacoes e comportamento do agente IA.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="nome">Nome do Agente *</Label>
              <Input
                id="nome"
                placeholder="Ex: Bot Vendas"
                value={formData.nome}
                onChange={(e) => setFormData(prev => ({ ...prev, nome: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="descricao">Descricao</Label>
              <Textarea
                id="descricao"
                placeholder="Descreva o proposito e funcao deste agente..."
                rows={3}
                value={formData.descricao}
                onChange={(e) => setFormData(prev => ({ ...prev, descricao: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="modelo">Modelo</Label>
              <Select
                value={formData.modelo}
                onValueChange={(val) => setFormData(prev => ({ ...prev, modelo: val }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MODELOS.map(m => (
                    <SelectItem key={m.value} value={m.value}>
                      <div className="flex items-center justify-between w-full">
                        <span>{m.label}</span>
                        <span className="text-xs text-muted-foreground ml-2">{m.desc}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="prompt">Prompt do Sistema *</Label>
              <Textarea
                id="prompt"
                placeholder="Voce e um assistente de atendimento especializado em..."
                rows={4}
                value={formData.prompt_sistema}
                onChange={(e) => setFormData(prev => ({ ...prev, prompt_sistema: e.target.value }))}
              />
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <Info className="h-3 w-3" />
                Define a personalidade e comportamento do agente
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="temperatura">Temperatura: {formData.temperatura}</Label>
                <Input
                  id="temperatura"
                  type="range"
                  min={0}
                  max={1}
                  step={0.1}
                  value={formData.temperatura}
                  onChange={(e) => setFormData(prev => ({ ...prev, temperatura: Number(e.target.value) }))}
                  className="cursor-pointer"
                />
                <p className="text-xs text-muted-foreground">Menor = mais preciso, Maior = mais criativo</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="max_tokens">Max Tokens</Label>
                <Input
                  id="max_tokens"
                  type="number"
                  min={100}
                  max={4000}
                  value={formData.max_tokens}
                  onChange={(e) => setFormData(prev => ({ ...prev, max_tokens: Number(e.target.value) }))}
                />
              </div>
            </div>

            <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
              <div>
                <p className="font-medium">Responder no grupo</p>
                <p className="text-xs text-muted-foreground">Envia resposta diretamente no grupo</p>
              </div>
              <Switch
                checked={formData.responder_no_grupo}
                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, responder_no_grupo: checked }))}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => handleDialogChange(false)} disabled={saving}>
              Cancelar
            </Button>
            <Button onClick={handleSubmit} disabled={saving}>
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>{editingId ? "Salvar" : "Criar Agente"}</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
