"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
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
  Megaphone,
  Plus,
  Send,
  Clock,
  CheckCircle2,
  XCircle,
  Loader2,
  FileText,
  Image,
  Video,
  AudioLines,
  Calendar,
  Users,
  Tag,
  Trash2,
} from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"

type TipoMensagem = "texto" | "imagem" | "video" | "audio"
type TipoDestinatario = "grupos" | "categoria"
type StatusMensagem = "pendente" | "enviando" | "concluido" | "erro" | "cancelado"

interface Categoria {
  id: number
  nome: string
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
  enviar_agora: boolean
  dt_agendamento: string | null
  status: StatusMensagem
  dt_enviado: string | null
  erro_mensagem: string | null
  dt_create: string
}

const TIPOS_MENSAGEM = [
  { value: "texto" as TipoMensagem, label: "Texto", icon: FileText },
  { value: "imagem" as TipoMensagem, label: "Imagem", icon: Image },
  { value: "video" as TipoMensagem, label: "Video", icon: Video },
  { value: "audio" as TipoMensagem, label: "Audio", icon: AudioLines },
]

const STATUS_CONFIG: Record<StatusMensagem, { label: string; color: string; icon: typeof Clock }> = {
  pendente: { label: "Pendente", color: "bg-muted text-muted-foreground", icon: Clock },
  enviando: { label: "Enviando", color: "bg-muted text-foreground", icon: Loader2 },
  concluido: { label: "Concluido", color: "bg-foreground text-background", icon: CheckCircle2 },
  erro: { label: "Erro", color: "bg-destructive text-destructive-foreground", icon: XCircle },
  cancelado: { label: "Cancelado", color: "bg-muted text-muted-foreground", icon: XCircle },
}

export default function MessagesPage() {
  const [mensagens, setMensagens] = useState<MensagemProgramada[]>([])
  const [categorias, setCategorias] = useState<Categoria[]>([])
  const [grupos, setGrupos] = useState<Grupo[]>([])
  const [loading, setLoading] = useState(true)
  const [instanceToken, setInstanceToken] = useState<string | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const [filtroStatus, setFiltroStatus] = useState<"todas" | StatusMensagem>("todas")

  // Modal state
  const [dialogOpen, setDialogOpen] = useState(false)
  const [saving, setSaving] = useState(false)

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
        .select("id, nome")
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

  const handleSaveMensagem = async () => {
    // Validacoes
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

      // Montar data de agendamento
      let dtAgendamento: string | null = null
      if (!enviarAgora && dataAgendamento && horaAgendamento) {
        dtAgendamento = new Date(`${dataAgendamento}T${horaAgendamento}`).toISOString()
      }

      // Inserir mensagem
      const { data: novaMensagem, error } = await supabase
        .from("mensagens_programadas")
        .insert({
          id_organizacao: usuarioSistema.id_organizacao,
          tipo_mensagem: tipoMensagem,
          conteudo_texto: tipoMensagem === "texto" ? conteudoTexto : legendaMidia || null,
          url_midia: tipoMensagem !== "texto" ? urlMidia : null,
          grupos_ids: tipoDestinatario === "grupos" ? Array.from(gruposSelecionados) : null,
          categoria_id: tipoDestinatario === "categoria" ? categoriaSelecionada : null,
          enviar_agora: enviarAgora,
          dt_agendamento: dtAgendamento,
          status: enviarAgora ? "enviando" : "pendente",
          criado_por: usuarioSistema.id,
        })
        .select()
        .single()

      if (error) throw error

      // Se for enviar agora, processar envio
      if (enviarAgora && instanceToken && novaMensagem) {
        await processarEnvio(novaMensagem as MensagemProgramada)
      }

      toast.success(enviarAgora ? "Mensagem enviada!" : "Mensagem agendada!")
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
      // Determinar grupos para enviar
      let gruposParaEnviar: Grupo[] = []

      if (mensagem.grupos_ids && mensagem.grupos_ids.length > 0) {
        gruposParaEnviar = grupos.filter(g => mensagem.grupos_ids!.includes(g.id))
      } else if (mensagem.categoria_id) {
        gruposParaEnviar = grupos.filter(g => g.id_categoria === mensagem.categoria_id)
      }

      if (gruposParaEnviar.length === 0) {
        throw new Error("Nenhum grupo encontrado para enviar")
      }

      // Enviar para cada grupo
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

          // Pequeno delay entre envios
          await new Promise(resolve => setTimeout(resolve, 500))
        } catch {
          erros.push(`Erro ao enviar para ${grupo.nome}`)
        }
      }

      // Atualizar status
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

  const handleCancelar = async (mensagemId: number) => {
    try {
      await supabase
        .from("mensagens_programadas")
        .update({ status: "cancelado" })
        .eq("id", mensagemId)

      toast.success("Mensagem cancelada")
      loadData()
    } catch {
      toast.error("Erro ao cancelar mensagem")
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

  const mensagensFiltradas = filtroStatus === "todas"
    ? mensagens
    : mensagens.filter(m => m.status === filtroStatus)

  const getDestinatarioLabel = (mensagem: MensagemProgramada) => {
    if (mensagem.categoria_id) {
      const cat = categorias.find(c => c.id === mensagem.categoria_id)
      return `Categoria: ${cat?.nome || "?"}`
    }
    if (mensagem.grupos_ids && mensagem.grupos_ids.length > 0) {
      return `${mensagem.grupos_ids.length} grupo(s)`
    }
    return "-"
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Card className="p-6">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Header - Compacto */}
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold tracking-tight">Mensagens</h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            Envio em massa
          </p>
        </div>
        {isConnected && (
          <Button size="sm" className="shrink-0 h-8 sm:h-9" onClick={() => setDialogOpen(true)}>
            <Plus className="h-4 w-4 sm:mr-2" />
            <span className="hidden sm:inline">Nova</span>
          </Button>
        )}
      </div>

      {/* Filtros - Compactos */}
      <div className="flex gap-1.5 flex-wrap">
        <Button
          variant={filtroStatus === "todas" ? "default" : "outline"}
          size="sm"
          className="h-7 text-xs px-2"
          onClick={() => setFiltroStatus("todas")}
        >
          Todas
        </Button>
        <Button
          variant={filtroStatus === "pendente" ? "default" : "outline"}
          size="sm"
          className="h-7 text-xs px-2"
          onClick={() => setFiltroStatus("pendente")}
        >
          <Clock className="h-3 w-3 mr-1" />
          Pend.
        </Button>
        <Button
          variant={filtroStatus === "concluido" ? "default" : "outline"}
          size="sm"
          className="h-7 text-xs px-2"
          onClick={() => setFiltroStatus("concluido")}
        >
          <CheckCircle2 className="h-3 w-3 mr-1" />
          Enviadas
        </Button>
        <Button
          variant={filtroStatus === "erro" ? "default" : "outline"}
          size="sm"
          className="h-7 text-xs px-2"
          onClick={() => setFiltroStatus("erro")}
        >
          <XCircle className="h-3 w-3 mr-1" />
          Erros
        </Button>
      </div>

      {/* Lista de mensagens - Compacta */}
      {mensagensFiltradas.length > 0 ? (
        <Card>
          <CardHeader className="p-3 sm:p-4 pb-2">
            <div className="flex items-center gap-2">
              <Megaphone className="h-4 w-4 text-muted-foreground" />
              <CardTitle className="text-sm sm:text-base font-medium">Historico</CardTitle>
              <Badge variant="secondary" className="text-[10px] ml-auto">
                {mensagensFiltradas.length}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y">
              {mensagensFiltradas.map((mensagem) => {
                const StatusIcon = STATUS_CONFIG[mensagem.status].icon
                const tipoConfig = TIPOS_MENSAGEM.find(t => t.value === mensagem.tipo_mensagem)
                const TipoIcon = tipoConfig?.icon || FileText

                return (
                  <div key={mensagem.id} className="px-3 sm:px-4 py-2.5 hover:bg-muted/30 transition-colors group/item">
                    <div className="flex items-center gap-2 sm:gap-3">
                      <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center shrink-0">
                        <TipoIcon className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">
                          {mensagem.tipo_mensagem === "texto"
                            ? mensagem.conteudo_texto?.substring(0, 40) + (mensagem.conteudo_texto && mensagem.conteudo_texto.length > 40 ? "..." : "")
                            : `${tipoConfig?.label || mensagem.tipo_mensagem}${mensagem.conteudo_texto ? `: ${mensagem.conteudo_texto.substring(0, 20)}...` : ""}`
                          }
                        </p>
                        <p className="text-[10px] sm:text-xs text-muted-foreground truncate">
                          {getDestinatarioLabel(mensagem)}
                          {mensagem.dt_agendamento && !mensagem.enviar_agora && (
                            <span className="hidden sm:inline"> • {format(new Date(mensagem.dt_agendamento), "dd/MM HH:mm", { locale: ptBR })}</span>
                          )}
                        </p>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Badge className={cn("text-[10px] px-1.5 py-0 h-5", STATUS_CONFIG[mensagem.status].color)}>
                          <StatusIcon className={cn("h-2.5 w-2.5 mr-0.5", mensagem.status === "enviando" && "animate-spin")} />
                          <span className="hidden sm:inline">{STATUS_CONFIG[mensagem.status].label}</span>
                        </Badge>
                        {mensagem.status === "pendente" && (
                          <Button variant="ghost" size="sm" className="h-7 text-xs sm:opacity-0 sm:group-hover/item:opacity-100" onClick={() => handleCancelar(mensagem.id)}>
                            <XCircle className="h-3.5 w-3.5 sm:mr-1" />
                            <span className="hidden sm:inline">Cancelar</span>
                          </Button>
                        )}
                        {(mensagem.status === "concluido" || mensagem.status === "erro" || mensagem.status === "cancelado") && (
                          <Button variant="ghost" size="icon" className="h-7 w-7 sm:opacity-0 sm:group-hover/item:opacity-100" onClick={() => handleExcluir(mensagem.id)}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </div>
                    </div>
                    {mensagem.erro_mensagem && (
                      <p className="text-[10px] text-destructive mt-1 ml-10 truncate">
                        {mensagem.erro_mensagem}
                      </p>
                    )}
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="p-6 text-center">
          <div className="mx-auto w-fit p-3 rounded-xl bg-muted mb-3">
            <Megaphone className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="text-base font-semibold mb-1">
            {filtroStatus === "todas" ? "Nenhuma mensagem" : `Nenhuma ${STATUS_CONFIG[filtroStatus as StatusMensagem]?.label.toLowerCase()}`}
          </h3>
          <p className="text-muted-foreground text-sm mb-4 max-w-xs mx-auto">
            {isConnected
              ? "Crie sua primeira mensagem"
              : "Conecte uma instancia primeiro"}
          </p>
          {isConnected ? (
            <Button size="sm" onClick={() => setDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Nova
            </Button>
          ) : (
            <a href="/instances">
              <Button variant="outline" size="sm">Ver Instancias</Button>
            </a>
          )}
        </Card>
      )}

      {/* Modal de nova mensagem - Compacto */}
      <Dialog open={dialogOpen} onOpenChange={(open) => {
        setDialogOpen(open)
        if (!open) resetForm()
      }}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto p-4 sm:p-6">
          <DialogHeader className="pb-2">
            <DialogTitle className="flex items-center gap-2 text-base sm:text-lg">
              <Megaphone className="h-4 w-4 sm:h-5 sm:w-5" />
              Nova Mensagem
            </DialogTitle>
            <DialogDescription className="text-xs sm:text-sm">
              Envie ou agende para seus grupos
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Tipo de conteudo */}
            <div className="space-y-1.5">
              <Label className="text-sm">Tipo</Label>
              <div className="grid grid-cols-4 gap-1.5">
                {TIPOS_MENSAGEM.map((tipo) => (
                  <Button
                    key={tipo.value}
                    type="button"
                    variant={tipoMensagem === tipo.value ? "default" : "outline"}
                    size="sm"
                    onClick={() => setTipoMensagem(tipo.value)}
                    className="h-8 text-xs"
                  >
                    <tipo.icon className="h-3.5 w-3.5 sm:mr-1" />
                    <span className="hidden sm:inline">{tipo.label}</span>
                  </Button>
                ))}
              </div>
            </div>

            {/* Destinatarios */}
            <div className="space-y-2">
              <Label className="text-sm">Destinatarios</Label>
              <div className="flex gap-3 text-sm">
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="radio"
                    name="tipoDestinatario"
                    checked={tipoDestinatario === "grupos"}
                    onChange={() => setTipoDestinatario("grupos")}
                    className="w-3.5 h-3.5"
                  />
                  <Users className="h-3.5 w-3.5" />
                  Grupos
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="radio"
                    name="tipoDestinatario"
                    checked={tipoDestinatario === "categoria"}
                    onChange={() => setTipoDestinatario("categoria")}
                    className="w-3.5 h-3.5"
                  />
                  <Tag className="h-3.5 w-3.5" />
                  Categoria
                </label>
              </div>

              {tipoDestinatario === "grupos" && (
                <div className="max-h-32 overflow-y-auto border rounded-lg p-2 space-y-1.5">
                  {grupos.length === 0 ? (
                    <p className="text-xs text-muted-foreground">Nenhum grupo</p>
                  ) : (
                    grupos.map((grupo) => (
                      <label key={grupo.id} className="flex items-center gap-2 cursor-pointer">
                        <Checkbox
                          checked={gruposSelecionados.has(grupo.id)}
                          onCheckedChange={() => toggleGrupo(grupo.id)}
                          className="h-4 w-4"
                        />
                        <span className="text-xs truncate">{grupo.nome}</span>
                      </label>
                    ))
                  )}
                </div>
              )}

              {tipoDestinatario === "categoria" && (
                <Select
                  value={categoriaSelecionada?.toString() || ""}
                  onValueChange={(v) => setCategoriaSelecionada(parseInt(v))}
                >
                  <SelectTrigger className="h-8 sm:h-9 text-sm">
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    {categorias.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id.toString()}>
                        {cat.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            {/* Conteudo */}
            <div className="space-y-1.5">
              <Label className="text-sm">
                {tipoMensagem === "texto" ? "Mensagem" : "URL"}
              </Label>
              {tipoMensagem === "texto" ? (
                <Textarea
                  placeholder="Digite sua mensagem..."
                  value={conteudoTexto}
                  onChange={(e) => setConteudoTexto(e.target.value)}
                  rows={3}
                  className="text-sm"
                />
              ) : (
                <div className="space-y-2">
                  <Input
                    placeholder={`URL do ${tipoMensagem}`}
                    value={urlMidia}
                    onChange={(e) => setUrlMidia(e.target.value)}
                    className="h-8 sm:h-9 text-sm"
                  />
                  {tipoMensagem !== "audio" && (
                    <Input
                      placeholder="Legenda (opcional)"
                      value={legendaMidia}
                      onChange={(e) => setLegendaMidia(e.target.value)}
                      className="h-8 sm:h-9 text-sm"
                    />
                  )}
                </div>
              )}
            </div>

            {/* Agendamento */}
            <div className="space-y-2">
              <Label className="text-sm">Quando enviar</Label>
              <div className="flex gap-3 text-sm">
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="radio"
                    name="enviarAgora"
                    checked={enviarAgora}
                    onChange={() => setEnviarAgora(true)}
                    className="w-3.5 h-3.5"
                  />
                  <Send className="h-3.5 w-3.5" />
                  Agora
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="radio"
                    name="enviarAgora"
                    checked={!enviarAgora}
                    onChange={() => setEnviarAgora(false)}
                    className="w-3.5 h-3.5"
                  />
                  <Calendar className="h-3.5 w-3.5" />
                  Agendar
                </label>
              </div>

              {!enviarAgora && (
                <div className="flex gap-2">
                  <Input
                    type="date"
                    value={dataAgendamento}
                    onChange={(e) => setDataAgendamento(e.target.value)}
                    min={new Date().toISOString().split("T")[0]}
                    className="flex-1 h-8 text-sm"
                  />
                  <Input
                    type="time"
                    value={horaAgendamento}
                    onChange={(e) => setHoraAgendamento(e.target.value)}
                    className="w-24 h-8 text-sm"
                  />
                </div>
              )}
            </div>
          </div>

          <DialogFooter className="pt-3 gap-2">
            <Button
              variant="outline"
              size="sm"
              className="h-8"
              onClick={() => {
                setDialogOpen(false)
                resetForm()
              }}
              disabled={saving}
            >
              Cancelar
            </Button>
            <Button size="sm" className="h-8" onClick={handleSaveMensagem} disabled={saving}>
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  {enviarAgora ? <Send className="h-4 w-4 mr-1.5" /> : <Clock className="h-4 w-4 mr-1.5" />}
                  {enviarAgora ? "Enviar" : "Agendar"}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
