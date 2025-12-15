"use client"

import { useState, useEffect, useMemo } from "react"
import { useOrganizationData, type Instancia, type Categoria } from "@/hooks/use-organization-data"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Skeleton } from "@/components/ui/skeleton"
import { CategoryConfigDrawer } from "./category-config-drawer"
import { TriggersOverviewDrawer } from "./triggers-overview-drawer"
import { AIAgentsDrawer } from "./ai-agents-drawer"
import { SyncGroupsDialog } from "./sync-groups-dialog"
import { MassMessageModal } from "./mass-message-modal"
import Link from "next/link"
import {
  Users,
  Zap,
  Smartphone,
  Send,
  Bot,
  FileAudio,
  Plus,
  RefreshCw,
  Check,
  UserPlus,
  Bell
} from "lucide-react"

// Onboarding steps
const onboardingSteps = [
  { id: 1, title: "Conectar WhatsApp", description: "Escaneie o QR Code para vincular seu numero.", completed: false },
  { id: 2, title: "Sincronizar grupos", description: "Importe seus grupos do WhatsApp.", completed: false },
  { id: 3, title: "Criar categorias", description: "Organize grupos por tags (Vendas, Suporte, etc).", completed: false },
  { id: 4, title: "Configurar primeiro gatilho", description: "Crie uma automacao para moderar ou responder.", completed: false },
]

export function CommandCenter() {
  const {
    instancias,
    categorias,
    grupos,
    agentes,
    gatilhos,
    loading,
    refresh,
    refreshInstancias,
    refreshCategorias,
    refreshGrupos,
    refreshAgentes,
    refreshGatilhos,
    instanciaConectada,
    gruposPorCategoria,
  } = useOrganizationData()

  // Estado da instancia selecionada
  const [selectedInstance, setSelectedInstance] = useState<Instancia | null>(null)
  const [isRefreshing, setIsRefreshing] = useState(false)

  // Drawers e modais
  const [categoryConfigOpen, setCategoryConfigOpen] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState<Categoria | null>(null)
  const [triggersDrawerOpen, setTriggersDrawerOpen] = useState(false)
  const [aiDrawerOpen, setAIDrawerOpen] = useState(false)
  const [syncDialogOpen, setSyncDialogOpen] = useState(false)
  const [messageModalOpen, setMessageModalOpen] = useState(false)

  // Selecionar instancia automaticamente
  useEffect(() => {
    if (instancias.length > 0 && !selectedInstance) {
      setSelectedInstance(instanciaConectada || instancias[0])
    }
  }, [instancias, instanciaConectada, selectedInstance])

  // Estatisticas
  const stats = useMemo(() => ({
    grupos: grupos.length,
    gatilhosAtivos: gatilhos.filter(g => g.ativo).length,
    gatilhosPausados: gatilhos.filter(g => !g.ativo).length,
    instanciasConectadas: instancias.filter(i => i.status === "conectado").length,
    totalInstancias: instancias.length,
    categorias: categorias.length,
    agentesAtivos: agentes.filter(a => a.ativo).length,
  }), [grupos, gatilhos, instancias, categorias, agentes])

  // Calcular progresso do onboarding
  const onboardingProgress = useMemo(() => {
    let completed = 0
    if (stats.instanciasConectadas > 0) completed++
    if (stats.grupos > 0) completed++
    if (stats.categorias > 0) completed++
    if (stats.gatilhosAtivos > 0) completed++
    return { completed, total: 4, percentage: (completed / 4) * 100 }
  }, [stats])

  // Refresh all data
  const handleRefresh = async () => {
    setIsRefreshing(true)
    await refresh()
    setIsRefreshing(false)
  }

  // Handlers
  const handleOpenCategoryConfig = (categoria: Categoria) => {
    setSelectedCategory(categoria)
    setCategoryConfigOpen(true)
  }

  const handleCategoryUpdate = () => {
    refreshCategorias()
    refreshGrupos()
  }

  if (loading) {
    return (
      <div className="flex-1 space-y-4 p-4 md:p-6">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <Skeleton className="h-5 w-24" />
            <Skeleton className="h-3 w-36" />
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Skeleton key={i} className="h-20" />
          ))}
        </div>
        <Skeleton className="h-12" />
        <Skeleton className="h-24" />
      </div>
    )
  }

  return (
    <div className="flex-1 space-y-4 p-4 md:p-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Dashboard</h2>
          <p className="text-sm text-muted-foreground">Visao geral da sua organizacao.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <Bell className="h-4 w-4 text-muted-foreground" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={handleRefresh}
            disabled={isRefreshing}
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </div>

      {/* Onboarding Checklist */}
      {onboardingProgress.completed < 4 && (
        <Card>
          <CardContent className="p-4">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-sm font-semibold">Bem-vindo ao Sincron Grupos</h3>
                <p className="text-xs text-muted-foreground">Complete os passos para comecar.</p>
              </div>
              <div className="flex items-center gap-3">
                <Progress value={onboardingProgress.percentage} className="w-24 h-1.5" />
                <span className="text-xs font-medium text-primary">{onboardingProgress.completed}/4</span>
              </div>
            </div>

            <div className="mt-3 grid grid-cols-2 lg:grid-cols-4 gap-3">
              <div className={`flex items-center gap-2 p-2 rounded-lg bg-muted/50 ${stats.instanciasConectadas > 0 ? "" : "opacity-60"}`}>
                <div className={`flex items-center justify-center w-6 h-6 rounded-full text-xs ${
                  stats.instanciasConectadas > 0 ? "bg-primary text-primary-foreground" : "bg-card border border-border text-muted-foreground"
                }`}>
                  {stats.instanciasConectadas > 0 ? <Check className="h-3 w-3" /> : "1"}
                </div>
                <span className="text-xs font-medium">Conectar WhatsApp</span>
              </div>

              <div className={`flex items-center gap-2 p-2 rounded-lg bg-muted/50 ${stats.grupos > 0 ? "" : "opacity-60"}`}>
                <div className={`flex items-center justify-center w-6 h-6 rounded-full text-xs ${
                  stats.grupos > 0 ? "bg-primary text-primary-foreground" : "bg-card border border-border text-muted-foreground"
                }`}>
                  {stats.grupos > 0 ? <Check className="h-3 w-3" /> : "2"}
                </div>
                <span className="text-xs font-medium">Sincronizar grupos</span>
              </div>

              <div className={`flex items-center gap-2 p-2 rounded-lg bg-muted/50 ${stats.categorias > 0 ? "" : "opacity-60"}`}>
                <div className={`flex items-center justify-center w-6 h-6 rounded-full text-xs ${
                  stats.categorias > 0 ? "bg-primary text-primary-foreground" : "bg-card border border-border text-muted-foreground"
                }`}>
                  {stats.categorias > 0 ? <Check className="h-3 w-3" /> : "3"}
                </div>
                <span className="text-xs font-medium">Criar categorias</span>
              </div>

              <div className={`flex items-center gap-2 p-2 rounded-lg bg-muted/50 ${stats.gatilhosAtivos > 0 ? "" : "opacity-60"}`}>
                <div className={`flex items-center justify-center w-6 h-6 rounded-full text-xs ${
                  stats.gatilhosAtivos > 0 ? "bg-primary text-primary-foreground" : "bg-card border border-border text-muted-foreground"
                }`}>
                  {stats.gatilhosAtivos > 0 ? <Check className="h-3 w-3" /> : "4"}
                </div>
                <span className="text-xs font-medium">Criar gatilho</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Metric Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <Link href="/instances">
          <Card className="hover:border-primary/50 transition-colors cursor-pointer">
            <CardContent className="p-3">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 flex items-center justify-center bg-green-100 rounded">
                  <Smartphone className="h-3.5 w-3.5 text-green-600" />
                </div>
                <span className="text-xs font-medium text-muted-foreground">Instancia</span>
              </div>
              <p className="text-lg font-bold mt-2 flex items-center">
                <span className={`w-2 h-2 rounded-full mr-1.5 ${stats.instanciasConectadas > 0 ? "bg-primary" : "bg-muted-foreground"}`}></span>
                {stats.instanciasConectadas > 0 ? "Online" : "Offline"}
              </p>
            </CardContent>
          </Card>
        </Link>

        <Link href="/groups">
          <Card className="hover:border-primary/50 transition-colors cursor-pointer">
            <CardContent className="p-3">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 flex items-center justify-center bg-blue-100 rounded">
                  <Users className="h-3.5 w-3.5 text-blue-600" />
                </div>
                <span className="text-xs font-medium text-muted-foreground">Grupos</span>
              </div>
              <p className="text-lg font-bold mt-2">{stats.grupos}</p>
            </CardContent>
          </Card>
        </Link>

        <Link href="/triggers">
          <Card className="hover:border-primary/50 transition-colors cursor-pointer">
            <CardContent className="p-3">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 flex items-center justify-center bg-yellow-100 rounded">
                  <Zap className="h-3.5 w-3.5 text-yellow-600" />
                </div>
                <span className="text-xs font-medium text-muted-foreground">Gatilhos</span>
              </div>
              <p className="text-lg font-bold mt-2">{stats.gatilhosAtivos} <span className="text-xs font-normal text-muted-foreground">ativos</span></p>
            </CardContent>
          </Card>
        </Link>

        <Link href="/messages">
          <Card className="hover:border-primary/50 transition-colors cursor-pointer">
            <CardContent className="p-3">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 flex items-center justify-center bg-indigo-100 rounded">
                  <Send className="h-3.5 w-3.5 text-indigo-600" />
                </div>
                <span className="text-xs font-medium text-muted-foreground">Mensagens</span>
              </div>
              <p className="text-lg font-bold mt-2">0 <span className="text-xs font-normal text-muted-foreground">agendadas</span></p>
            </CardContent>
          </Card>
        </Link>

        <Link href="/ai">
          <Card className="hover:border-primary/50 transition-colors cursor-pointer">
            <CardContent className="p-3">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 flex items-center justify-center bg-purple-100 rounded">
                  <Bot className="h-3.5 w-3.5 text-purple-600" />
                </div>
                <span className="text-xs font-medium text-muted-foreground">Agentes IA</span>
              </div>
              <p className="text-lg font-bold mt-2">{stats.agentesAtivos} <span className="text-xs font-normal text-muted-foreground">ativos</span></p>
            </CardContent>
          </Card>
        </Link>

        <Link href="/transcription">
          <Card className="hover:border-primary/50 transition-colors cursor-pointer">
            <CardContent className="p-3">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 flex items-center justify-center bg-pink-100 rounded">
                  <FileAudio className="h-3.5 w-3.5 text-pink-600" />
                </div>
                <span className="text-xs font-medium text-muted-foreground">Transcricao</span>
              </div>
              <p className="text-lg font-bold mt-2">0 <span className="text-xs font-normal text-muted-foreground">grupos</span></p>
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardContent className="p-3">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold">Acoes Rapidas</h3>
            </div>
            <div className="flex items-center gap-2">
              <Button size="sm" className="h-7 text-xs" onClick={() => setMessageModalOpen(true)}>
                <Plus className="h-3 w-3 mr-1" />
                Mensagem
              </Button>
              <Button size="sm" variant="secondary" className="h-7 text-xs" asChild>
                <Link href="/triggers/new">
                  <Plus className="h-3 w-3 mr-1" />
                  Gatilho
                </Link>
              </Button>
              <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setSyncDialogOpen(true)}>
                <RefreshCw className="h-3 w-3 mr-1" />
                Sincronizar
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Recent Activity */}
      <Card>
        <CardContent className="p-3">
          <h3 className="text-sm font-semibold mb-3">Atividade Recente</h3>
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-xs">
              <span className="h-5 w-5 rounded-full bg-accent flex items-center justify-center">
                <Zap className="h-2.5 w-2.5 text-accent-foreground" />
              </span>
              <span className="flex-1">Gatilho <span className="font-medium text-primary">&quot;Boas-vindas&quot;</span> ativado</span>
              <span className="text-muted-foreground">2 min</span>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <span className="h-5 w-5 rounded-full bg-muted-foreground flex items-center justify-center">
                <Users className="h-2.5 w-2.5 text-white" />
              </span>
              <span className="flex-1">Sincronizacao: <span className="font-medium">2 grupos</span> adicionados</span>
              <span className="text-muted-foreground">1h</span>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <span className="h-5 w-5 rounded-full bg-primary flex items-center justify-center">
                <UserPlus className="h-2.5 w-2.5 text-primary-foreground" />
              </span>
              <span className="flex-1"><span className="font-medium">Carlos</span> adicionado a equipe</span>
              <span className="text-muted-foreground">3h</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Footer */}
      <footer className="py-2 text-center text-xs text-muted-foreground">
        <p>&copy; 2025 Sincron Grupos</p>
      </footer>

      {/* Drawers */}
      {selectedCategory && (
        <CategoryConfigDrawer
          open={categoryConfigOpen}
          onOpenChange={setCategoryConfigOpen}
          categoria={selectedCategory}
          onUpdate={handleCategoryUpdate}
        />
      )}

      <TriggersOverviewDrawer
        open={triggersDrawerOpen}
        onOpenChange={setTriggersDrawerOpen}
        gatilhos={gatilhos}
        categorias={categorias}
        onUpdate={refreshGatilhos}
      />

      <AIAgentsDrawer
        open={aiDrawerOpen}
        onOpenChange={setAIDrawerOpen}
        agentes={agentes}
        onUpdate={refreshAgentes}
      />

      {/* Modais */}
      <SyncGroupsDialog
        open={syncDialogOpen}
        onOpenChange={setSyncDialogOpen}
        instanceToken={selectedInstance?.api_key || instanciaConectada?.api_key || null}
        instanceId={selectedInstance?.id || instanciaConectada?.id || null}
        categorias={categorias}
        gruposCadastrados={grupos}
        onUpdate={() => {
          refreshGrupos()
          refreshCategorias()
        }}
      />

      <MassMessageModal
        open={messageModalOpen}
        onOpenChange={setMessageModalOpen}
        instanceToken={selectedInstance?.api_key || instanciaConectada?.api_key || null}
        categorias={categorias}
        grupos={grupos}
        onUpdate={refresh}
      />
    </div>
  )
}
