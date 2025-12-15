"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
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
  Send,
  Clock,
  Loader2,
  FileText,
  Image,
  Video,
  AudioLines,
  Calendar,
  Users,
  Tag,
  Search,
  Bell,
  CheckCheck,
  MoreVertical,
  Pencil,
  Trash2,
  Filter,
  Download,
  Lightbulb,
  Bold,
  Italic,
  Link as LinkIcon,
  Smile,
  Save,
} from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

type TipoMensagem = "texto" | "imagem" | "video" | "audio"
type TipoDestinatario = "grupos" | "categoria"
type StatusMensagem = "pendente" | "enviando" | "concluido" | "erro" | "cancelado" | "rascunho"

interface Categoria {
  id: number
  nome: string
  cor?: string
}

interface Grupo {
  id: number
  nome: string
  chat_id_whatsapp: string
  id_categoria: number | null
}

interface MensagemProgramada {
  id: number
  tipo_mensagem: TipoMensagem
  conteudo_texto: string | null
  url_midia: string | null
  nome_arquivo: string | null
  grupos_ids: number[] | null
  categoria_id: number | null
  enviar_agora: boolean | null
  dt_agendamento: string | null
  status: string | null
  dt_enviado: string | null
  erro_mensagem: string | null
  dt_create: string | null
  criado_por: number | null
}

const TIPOS_MENSAGEM = [
  { value: "texto" as TipoMensagem, label: "Texto", icon: FileText },
  { value: "imagem" as TipoMensagem, label: "Imagem", icon: Image },
  { value: "video" as TipoMensagem, label: "Video", icon: Video },
  { value: "audio" as TipoMensagem, label: "Audio", icon: AudioLines },
]

export default function MessagesPage() {
  const [mensagens, setMensagens] = useState<MensagemProgramada[]>([])
  const [categorias, setCategorias] = useState<Categoria[]>([])
  const [grupos, setGrupos] = useState<Grupo[]>([])
  const [loading, setLoading] = useState(true)
  const [instanceToken, setInstanceToken] = useState<string | null>(null)
  const [isConnected, setIsConnected] = useState(false)

  // Filter state
  const [searchFilter, setSearchFilter] = useState("")
  const [activeTab, setActiveTab] = useState("all")

  // Modal state
  const [dialogOpen, setDialogOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [editingMensagem, setEditingMensagem] = useState<MensagemProgramada | null>(null)

  // Form state
  const [tipoMensagem, setTipoMensagem] = useState<TipoMensagem>("texto")
  const [tipoDestinatario, setTipoDestinatario] = useState<TipoDestinatario>("grupos")
  const [gruposSelecionados, setGruposSelecionados] = useState<Set<number>>(new Set())
  const [categoriaSelecionada, setCategoriaSelecionada] = useState<number | null>(null)
  const [conteudoTexto, setConteudoTexto] = useState("")
  const [urlMidia, setUrlMidia] = useState("")
  const [legendaMidia, setLegendaMidia] = useState("")
  const [enviarAgora, setEnviarAgora] = useState(true)
  const [dataAgendamento, setDataAgendamento] = useState("")
  const [horaAgendamento, setHoraAgendamento] = useState("")

  const supabase = createClient()

  // Contagens para tabs
  const counts = useMemo(() => {
    const all = mensagens.length
    const scheduled = mensagens.filter(m => m.status === "pendente" && m.dt_agendamento).length
    const sent = mensagens.filter(m => m.status === "concluido").length
    const drafts = mensagens.filter(m => m.status === "rascunho").length
    return { all, scheduled, sent, drafts }
  }, [mensagens])

  // Mensagens filtradas por tab e busca
  const filteredMensagens = useMemo(() => {
    return mensagens.filter(m => {
      const matchesSearch = !searchFilter ||
        (m.conteudo_texto?.toLowerCase().includes(searchFilter.toLowerCase()))

      let matchesTab = true
      switch (activeTab) {
        case "scheduled":
          matchesTab = m.status === "pendente" && !!m.dt_agendamento
          break
        case "sent":
          matchesTab = m.status === "concluido"
          break
        case "drafts":
          matchesTab = m.status === "rascunho"
          break
      }

      return matchesSearch && matchesTab
    })
  }, [mensagens, searchFilter, activeTab])

  // Agrupar por tipo
  const agendadas = filteredMensagens.filter(m => m.status === "pendente" && m.dt_agendamento)
  const enviadas = filteredMensagens.filter(m => m.status === "concluido")
  const rascunhos = filteredMensagens.filter(m => m.status === "rascunho")

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

      // Buscar instancia conectada
      const { data: instancia } = await supabase
        .from("instancias_whatsapp")
        .select("api_key, status")
        .eq("id_organizacao", usuarioSistema.id_organizacao)
        .eq("status", "conectado")
        .single()

      if (instancia?.api_key) {
        setInstanceToken(instancia.api_key)
        setIsConnected(true)
      }

      // Buscar categorias
      const { data: cats } = await supabase
        .from("categorias")
        .select("id, nome, cor")
        .eq("id_organizacao", usuarioSistema.id_organizacao)
        .eq("ativo", true)
        .order("ordem", { ascending: true })

      setCategorias(cats || [])

      // Buscar grupos
      const { data: grps } = await supabase
        .from("grupos")
        .select("id, nome, chat_id_whatsapp, id_categoria")
        .eq("id_organizacao", usuarioSistema.id_organizacao)
        .eq("ativo", true)
        .order("nome", { ascending: true })

      setGrupos(grps || [])

      // Buscar mensagens programadas
      const { data: msgs } = await supabase
        .from("mensagens_programadas")
        .select("*")
        .eq("id_organizacao", usuarioSistema.id_organizacao)
        .order("dt_create", { ascending: false })

      setMensagens((msgs || []) as MensagemProgramada[])
    } catch (err) {
      console.error("Erro ao carregar dados:", err)
    } finally {
      setLoading(false)
    }
  }, [supabase])

  useEffect(() => {
    loadData()
  }, [loadData])

  const resetForm = () => {
    setTipoMensagem("texto")
    setTipoDestinatario("grupos")
    setGruposSelecionados(new Set())
    setCategoriaSelecionada(null)
    setConteudoTexto("")
    setUrlMidia("")
    setLegendaMidia("")
    setEnviarAgora(true)
    setDataAgendamento("")
    setHoraAgendamento("")
    setEditingMensagem(null)
  }

  const handleEditar = (mensagem: MensagemProgramada) => {
    setEditingMensagem(mensagem)
    setTipoMensagem(mensagem.tipo_mensagem as TipoMensagem)
    setConteudoTexto(mensagem.conteudo_texto || "")
    setUrlMidia(mensagem.url_midia || "")
    setLegendaMidia(mensagem.tipo_mensagem !== "texto" ? (mensagem.conteudo_texto || "") : "")

    if (mensagem.grupos_ids && mensagem.grupos_ids.length > 0) {
      setTipoDestinatario("grupos")
      setGruposSelecionados(new Set(mensagem.grupos_ids))
      setCategoriaSelecionada(null)
    } else if (mensagem.categoria_id) {
      setTipoDestinatario("categoria")
      setCategoriaSelecionada(mensagem.categoria_id)
      const gruposDaCategoria = grupos.filter(g => g.id_categoria === mensagem.categoria_id)
      setGruposSelecionados(new Set(gruposDaCategoria.map(g => g.id)))
    }

    if (mensagem.dt_agendamento) {
      setEnviarAgora(false)
      const dt = new Date(mensagem.dt_agendamento)
      setDataAgendamento(dt.toISOString().split("T")[0])
      setHoraAgendamento(dt.toTimeString().slice(0, 5))
    } else {
      setEnviarAgora(true)
      setDataAgendamento("")
      setHoraAgendamento("")
    }

    setDialogOpen(true)
  }

  const toggleGrupo = (grupoId: number) => {
    const newSet = new Set(gruposSelecionados)
    if (newSet.has(grupoId)) {
      newSet.delete(grupoId)
    } else {
      newSet.add(grupoId)
    }
    setGruposSelecionados(newSet)
  }

  const selectAllGrupos = () => {
    if (gruposSelecionados.size === grupos.length) {
      setGruposSelecionados(new Set())
    } else {
      setGruposSelecionados(new Set(grupos.map(g => g.id)))
    }
  }

  const handleSaveMensagem = async (saveAsDraft = false) => {
    if (!saveAsDraft) {
      if (tipoDestinatario === "grupos" && gruposSelecionados.size === 0) {
        toast.error("Selecione pelo menos um grupo")
        return
      }
      if (tipoDestinatario === "categoria" && !categoriaSelecionada) {
        toast.error("Selecione uma categoria")
        return
      }
      if (tipoMensagem === "texto" && !conteudoTexto.trim()) {
        toast.error("Digite o texto da mensagem")
        return
      }
      if (tipoMensagem !== "texto" && !urlMidia.trim()) {
        toast.error("Informe a URL da midia")
        return
      }
      if (!enviarAgora && (!dataAgendamento || !horaAgendamento)) {
        toast.error("Informe data e hora do agendamento")
        return
      }
    }

    setSaving(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user?.email) throw new Error("Usuario nao autenticado")

      const { data: usuarioSistema } = await supabase
        .from("usuarios_sistema")
        .select("id, id_organizacao")
        .eq("email", user.email)
        .single()

      if (!usuarioSistema) throw new Error("Usuario nao encontrado")

      let dtAgendamento: string | null = null
      if (!enviarAgora && dataAgendamento && horaAgendamento) {
        dtAgendamento = new Date(`${dataAgendamento}T${horaAgendamento}`).toISOString()
      }

      const mensagemData = {
        tipo_mensagem: tipoMensagem,
        conteudo_texto: tipoMensagem === "texto" ? conteudoTexto : legendaMidia || null,
        url_midia: tipoMensagem !== "texto" ? urlMidia : null,
        grupos_ids: tipoDestinatario === "grupos" ? Array.from(gruposSelecionados) : null,
        categoria_id: tipoDestinatario === "categoria" ? categoriaSelecionada : null,
        enviar_agora: saveAsDraft ? false : enviarAgora,
        dt_agendamento: dtAgendamento,
        status: saveAsDraft ? "rascunho" : (enviarAgora ? "enviando" : "pendente"),
      }

      let mensagemFinal: MensagemProgramada | null = null

      if (editingMensagem) {
        // Atualizando mensagem existente
        const { data: updatedMensagem, error } = await supabase
          .from("mensagens_programadas")
          .update(mensagemData)
          .eq("id", editingMensagem.id)
          .select()
          .single()

        if (error) throw error
        mensagemFinal = updatedMensagem as MensagemProgramada
      } else {
        // Criando nova mensagem
        const { data: novaMensagem, error } = await supabase
          .from("mensagens_programadas")
          .insert({
            ...mensagemData,
            id_organizacao: usuarioSistema.id_organizacao,
            criado_por: usuarioSistema.id,
          })
          .select()
          .single()

        if (error) throw error
        mensagemFinal = novaMensagem as MensagemProgramada
      }

      if (!saveAsDraft && enviarAgora && instanceToken && mensagemFinal) {
        await processarEnvio(mensagemFinal)
      }

      toast.success(
        editingMensagem
          ? "Mensagem atualizada!"
          : (saveAsDraft ? "Rascunho salvo!" : (enviarAgora ? "Mensagem enviada!" : "Mensagem agendada!"))
      )
      setDialogOpen(false)
      resetForm()
      loadData()
    } catch (err) {
      console.error("Erro ao salvar mensagem:", err)
      toast.error("Erro ao salvar mensagem")
    } finally {
      setSaving(false)
    }
  }

  const processarEnvio = async (mensagem: MensagemProgramada) => {
    if (!instanceToken) return

    try {
      let gruposParaEnviar: Grupo[] = []

      if (mensagem.grupos_ids && mensagem.grupos_ids.length > 0) {
        gruposParaEnviar = grupos.filter(g => mensagem.grupos_ids!.includes(g.id))
      } else if (mensagem.categoria_id) {
        gruposParaEnviar = grupos.filter(g => g.id_categoria === mensagem.categoria_id)
      }

      if (gruposParaEnviar.length === 0) {
        throw new Error("Nenhum grupo encontrado para enviar")
      }

      let erros: string[] = []
      for (const grupo of gruposParaEnviar) {
        try {
          let endpoint = ""
          let body: Record<string, unknown> = { chatId: grupo.chat_id_whatsapp }

          switch (mensagem.tipo_mensagem) {
            case "texto":
              endpoint = `/api/uazapi/instances/${instanceToken}/send/text`
              body.text = mensagem.conteudo_texto
              break
            case "imagem":
              endpoint = `/api/uazapi/instances/${instanceToken}/send/image`
              body.imageUrl = mensagem.url_midia
              body.caption = mensagem.conteudo_texto || ""
              break
            case "video":
              endpoint = `/api/uazapi/instances/${instanceToken}/send/video`
              body.videoUrl = mensagem.url_midia
              body.caption = mensagem.conteudo_texto || ""
              break
            case "audio":
              endpoint = `/api/uazapi/instances/${instanceToken}/send/audio`
              body.audioUrl = mensagem.url_midia
              break
          }

          const response = await fetch(endpoint, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
          })

          if (!response.ok) {
            erros.push(`Erro ao enviar para ${grupo.nome}`)
          }

          await new Promise(resolve => setTimeout(resolve, 500))
        } catch {
          erros.push(`Erro ao enviar para ${grupo.nome}`)
        }
      }

      await supabase
        .from("mensagens_programadas")
        .update({
          status: erros.length === 0 ? "concluido" : "erro",
          dt_enviado: new Date().toISOString(),
          erro_mensagem: erros.length > 0 ? erros.join("; ") : null,
        })
        .eq("id", mensagem.id)
    } catch (err) {
      console.error("Erro no processamento:", err)
      await supabase
        .from("mensagens_programadas")
        .update({
          status: "erro",
          erro_mensagem: err instanceof Error ? err.message : "Erro desconhecido",
        })
        .eq("id", mensagem.id)
    }
  }

  const handleExcluir = async (mensagemId: number) => {
    try {
      await supabase
        .from("mensagens_programadas")
        .delete()
        .eq("id", mensagemId)

      toast.success("Mensagem excluida")
      loadData()
    } catch {
      toast.error("Erro ao excluir mensagem")
    }
  }

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "-"
    const date = new Date(dateStr)
    return date.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" }) +
      " as " + date.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })
  }

  const getTimeAgo = (dateStr: string | null) => {
    if (!dateStr) return "-"
    const date = new Date(dateStr)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
    const diffDays = Math.floor(diffHours / 24)

    if (diffDays > 0) return diffDays === 1 ? "Enviado ontem" : `Enviado ha ${diffDays} dias`
    if (diffHours > 0) return `Enviado ha ${diffHours} hora${diffHours > 1 ? 's' : ''}`
    return "Enviado agora"
  }

  const getGruposCount = (mensagem: MensagemProgramada) => {
    if (mensagem.grupos_ids) return mensagem.grupos_ids.length
    if (mensagem.categoria_id) {
      return grupos.filter(g => g.id_categoria === mensagem.categoria_id).length
    }
    return 0
  }

  if (loading) {
    return (
      <div className="flex-1 space-y-6 p-8">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-64" />
          </div>
        </div>
        <Skeleton className="h-10 w-full" />
        <div className="space-y-4">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-32" />)}
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 space-y-6 p-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Mensagens em Massa</h2>
          <p className="text-muted-foreground">Gerencie e programe mensagens para seus grupos.</p>
        </div>
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon">
            <Bell className="h-5 w-5 text-muted-foreground" />
          </Button>
        </div>
      </div>

      {/* Actions & Search */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          {isConnected && (
            <Button onClick={() => setDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Nova Mensagem
            </Button>
          )}
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon">
              <Filter className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="icon">
              <Download className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <div className="relative w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar mensagens..."
            value={searchFilter}
            onChange={(e) => setSearchFilter(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b">
        <div className="flex items-center gap-6">
          <button
            onClick={() => setActiveTab("all")}
            className={cn(
              "pb-3 border-b-2 transition-colors",
              activeTab === "all"
                ? "border-primary text-primary font-semibold"
                : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            Todas
            <Badge variant="secondary" className={cn("ml-1.5", activeTab === "all" ? "bg-primary/10 text-primary" : "")}>
              {counts.all}
            </Badge>
          </button>
          <button
            onClick={() => setActiveTab("scheduled")}
            className={cn(
              "pb-3 border-b-2 transition-colors",
              activeTab === "scheduled"
                ? "border-primary text-primary font-semibold"
                : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            Agendadas
            <Badge variant="secondary" className="ml-1.5">{counts.scheduled}</Badge>
          </button>
          <button
            onClick={() => setActiveTab("sent")}
            className={cn(
              "pb-3 border-b-2 transition-colors",
              activeTab === "sent"
                ? "border-primary text-primary font-semibold"
                : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            Enviadas
            <Badge variant="secondary" className="ml-1.5">{counts.sent}</Badge>
          </button>
          <button
            onClick={() => setActiveTab("drafts")}
            className={cn(
              "pb-3 border-b-2 transition-colors",
              activeTab === "drafts"
                ? "border-primary text-primary font-semibold"
                : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            Rascunhos
            <Badge variant="secondary" className="ml-1.5">{counts.drafts}</Badge>
          </button>
        </div>
      </div>

      {/* Messages Content */}
      {filteredMensagens.length === 0 ? (
        <Card className="p-12">
          <div className="text-center">
            <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
              <Send className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Nenhuma mensagem</h3>
            <p className="text-muted-foreground mb-6">
              {isConnected
                ? "Crie sua primeira mensagem para seus grupos"
                : "Conecte uma instancia primeiro"}
            </p>
            {isConnected ? (
              <Button onClick={() => setDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Nova Mensagem
              </Button>
            ) : (
              <a href="/instances">
                <Button variant="outline">Ver Instancias</Button>
              </a>
            )}
          </div>
        </Card>
      ) : (
        <div className="space-y-8">
          {/* Agendadas */}
          {(activeTab === "all" || activeTab === "scheduled") && agendadas.length > 0 && (
            <section className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold">Mensagens Agendadas</h3>
                <span className="text-sm text-muted-foreground">{agendadas.length} mensagens</span>
              </div>

              {agendadas.map(msg => (
                <Card key={msg.id} className="p-5 hover:border-primary transition-colors">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4 flex-1">
                      <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center shrink-0">
                        <Clock className="h-5 w-5 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-semibold">Mensagem agendada</h4>
                          <Badge variant="secondary" className="bg-accent/10 text-accent text-xs">Agendada</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mb-2 line-clamp-2">
                          {msg.conteudo_texto || "-"}
                        </p>
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1.5">
                            <Calendar className="h-3 w-3" />
                            {formatDate(msg.dt_agendamento)}
                          </span>
                          <span className="flex items-center gap-1.5">
                            <Users className="h-3 w-3" />
                            {getGruposCount(msg)} grupos
                          </span>
                          {msg.categoria_id && (
                            <span className="flex items-center gap-1.5">
                              <Tag className="h-3 w-3" />
                              {categorias.find(c => c.id === msg.categoria_id)?.nome || "Categoria"}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEditar(msg)}>
                        <Pencil className="h-4 w-4 text-muted-foreground" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Excluir mensagem?</AlertDialogTitle>
                            <AlertDialogDescription>Esta acao nao pode ser desfeita.</AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleExcluir(msg.id)} className="bg-destructive text-destructive-foreground">
                              Excluir
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                </Card>
              ))}
            </section>
          )}

          {/* Enviadas */}
          {(activeTab === "all" || activeTab === "sent") && enviadas.length > 0 && (
            <section className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold">Mensagens Enviadas Recentemente</h3>
                <span className="text-sm text-muted-foreground">{enviadas.length} mensagens</span>
              </div>

              {enviadas.map(msg => (
                <Card key={msg.id} className="p-5">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4 flex-1">
                      <div className="w-12 h-12 bg-accent/10 rounded-lg flex items-center justify-center shrink-0">
                        <CheckCheck className="h-5 w-5 text-accent" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-semibold">Mensagem enviada</h4>
                          <Badge variant="secondary" className="bg-accent/10 text-accent text-xs">Enviada</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mb-2 line-clamp-2">
                          {msg.conteudo_texto || "-"}
                        </p>
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1.5">
                            <Clock className="h-3 w-3" />
                            {getTimeAgo(msg.dt_enviado)}
                          </span>
                          <span className="flex items-center gap-1.5">
                            <Users className="h-3 w-3" />
                            {getGruposCount(msg)} grupos
                          </span>
                          <span className="flex items-center gap-1.5 text-accent">
                            <CheckCheck className="h-3 w-3" />
                            Entregue a todos
                          </span>
                        </div>
                      </div>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleExcluir(msg.id)} className="text-destructive">
                          <Trash2 className="h-4 w-4 mr-2" />
                          Excluir
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </Card>
              ))}
            </section>
          )}

          {/* Rascunhos */}
          {(activeTab === "all" || activeTab === "drafts") && rascunhos.length > 0 && (
            <section className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold">Rascunhos</h3>
                <span className="text-sm text-muted-foreground">{rascunhos.length} mensagens</span>
              </div>

              {rascunhos.map(msg => (
                <Card key={msg.id} className="p-5 border-dashed hover:border-primary transition-colors">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4 flex-1">
                      <div className="w-12 h-12 bg-muted rounded-lg flex items-center justify-center shrink-0">
                        <FileText className="h-5 w-5 text-muted-foreground" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-semibold">Rascunho</h4>
                          <Badge variant="secondary" className="text-xs">Rascunho</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mb-2 line-clamp-2">
                          {msg.conteudo_texto || "-"}
                        </p>
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1.5">
                            <Clock className="h-3 w-3" />
                            Editado {getTimeAgo(msg.dt_create).replace("Enviado", "")}
                          </span>
                          <span className="flex items-center gap-1.5">
                            <Users className="h-3 w-3" />
                            {getGruposCount(msg) > 0 ? `${getGruposCount(msg)} grupos` : "Sem grupos selecionados"}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEditar(msg)}>
                        <Pencil className="h-4 w-4 text-muted-foreground" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Excluir rascunho?</AlertDialogTitle>
                            <AlertDialogDescription>Esta acao nao pode ser desfeita.</AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleExcluir(msg.id)} className="bg-destructive text-destructive-foreground">
                              Excluir
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                </Card>
              ))}
            </section>
          )}
        </div>
      )}

      {/* Footer */}
      <footer className="py-4 text-center text-sm text-muted-foreground border-t">
        <p>Copyright &copy; 2025 Sincron Grupos</p>
      </footer>

      {/* Message Modal */}
      <Dialog open={dialogOpen} onOpenChange={(open) => {
        setDialogOpen(open)
        if (!open) resetForm()
      }}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingMensagem ? "Editar Mensagem" : "Nova Mensagem em Massa"}</DialogTitle>
            <DialogDescription>
              {editingMensagem ? "Edite e reenvie ou reagende sua mensagem." : "Envie ou agende mensagens para seus grupos."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5">
            {/* Conteudo */}
            <div className="space-y-2">
              <Label>Conteudo da Mensagem</Label>
              <Textarea
                placeholder="Digite sua mensagem aqui..."
                value={conteudoTexto}
                onChange={(e) => setConteudoTexto(e.target.value)}
                rows={6}
              />
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <Bold className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <Italic className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <LinkIcon className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <Smile className="h-4 w-4" />
                  </Button>
                </div>
                <span className="text-xs text-muted-foreground">{conteudoTexto.length} / 4096 caracteres</span>
              </div>
            </div>

            {/* Selecionar Grupos */}
            <div className="space-y-2">
              <Label>Selecionar Grupos</Label>
              <div className="bg-muted border rounded-lg p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Checkbox
                    checked={gruposSelecionados.size === grupos.length && grupos.length > 0}
                    onCheckedChange={selectAllGrupos}
                  />
                  <Label className="cursor-pointer">Selecionar todos os grupos ({grupos.length})</Label>
                </div>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {grupos.map(grupo => (
                    <div key={grupo.id} className="flex items-center gap-2 p-2 hover:bg-card rounded">
                      <Checkbox
                        checked={gruposSelecionados.has(grupo.id)}
                        onCheckedChange={() => toggleGrupo(grupo.id)}
                      />
                      <Label className="cursor-pointer flex-1">{grupo.nome}</Label>
                    </div>
                  ))}
                </div>
              </div>
              <p className="text-xs text-muted-foreground">Ou filtre por categoria abaixo</p>
            </div>

            {/* Filtrar por Categoria */}
            <div className="space-y-2">
              <Label>Filtrar por Categorias</Label>
              <div className="flex flex-wrap gap-2">
                {categorias.map(cat => (
                  <Button
                    key={cat.id}
                    variant="secondary"
                    size="sm"
                    onClick={() => {
                      setTipoDestinatario("categoria")
                      setCategoriaSelecionada(cat.id)
                      const gruposDaCategoria = grupos.filter(g => g.id_categoria === cat.id)
                      setGruposSelecionados(new Set(gruposDaCategoria.map(g => g.id)))
                    }}
                    className={cn(
                      categoriaSelecionada === cat.id && "bg-primary text-primary-foreground"
                    )}
                  >
                    <Tag className="h-3 w-3 mr-1" />
                    {cat.nome} ({grupos.filter(g => g.id_categoria === cat.id).length})
                  </Button>
                ))}
              </div>
            </div>

            {/* Agendamento */}
            <div className="space-y-2">
              <Label>Agendamento</Label>
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    checked={enviarAgora}
                    onChange={() => setEnviarAgora(true)}
                  />
                  <span>Enviar agora</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    checked={!enviarAgora}
                    onChange={() => setEnviarAgora(false)}
                  />
                  <span>Agendar envio</span>
                </label>
              </div>
              {!enviarAgora && (
                <div className="grid grid-cols-2 gap-3 mt-3">
                  <div>
                    <Label className="text-xs text-muted-foreground">Data</Label>
                    <Input
                      type="date"
                      value={dataAgendamento}
                      onChange={(e) => setDataAgendamento(e.target.value)}
                      min={new Date().toISOString().split("T")[0]}
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Hora</Label>
                    <Input
                      type="time"
                      value={horaAgendamento}
                      onChange={(e) => setHoraAgendamento(e.target.value)}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Personalizacao */}
            <div className="bg-muted border rounded-lg p-4">
              <div className="flex items-start gap-3">
                <Lightbulb className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-semibold text-sm mb-1">Personalizacao</h4>
                  <p className="text-xs text-muted-foreground mb-2">Use variaveis para personalizar sua mensagem:</p>
                  <div className="flex flex-wrap gap-2">
                    <code className="bg-card px-2 py-1 rounded text-xs text-primary">{"{{nome}}"}</code>
                    <code className="bg-card px-2 py-1 rounded text-xs text-primary">{"{{grupo}}"}</code>
                    <code className="bg-card px-2 py-1 rounded text-xs text-primary">{"{{data}}"}</code>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter className="flex items-center justify-between">
            <Button variant="ghost" onClick={() => { setDialogOpen(false); resetForm() }} disabled={saving}>
              Cancelar
            </Button>
            <div className="flex items-center gap-3">
              <Button variant="secondary" onClick={() => handleSaveMensagem(true)} disabled={saving}>
                <Save className="h-4 w-4 mr-2" />
                Salvar Rascunho
              </Button>
              <Button onClick={() => handleSaveMensagem(false)} disabled={saving}>
                {saving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <Send className="h-4 w-4 mr-2" />
                    {enviarAgora ? "Enviar" : "Agendar"}
                  </>
                )}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
