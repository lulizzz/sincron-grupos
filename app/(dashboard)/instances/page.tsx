"use client"

import { useState, useEffect, useCallback, useMemo, useRef } from "react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Separator } from "@/components/ui/separator"
import {
  RefreshCw,
  Plus,
  Wifi,
  WifiOff,
  User,
  Building2,
  Smartphone,
  Loader2,
  Users,
  Zap,
  Send,
  Clock,
  MoreVertical,
  Power,
  QrCode,
  Info,
  Bell
} from "lucide-react"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import { getUAZAPIService, type InstanciaStatusCompleto } from "@/lib/uazapi"
import { cn } from "@/lib/utils"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

type Instancia = {
  id: number
  id_organizacao: number
  nome_instancia: string
  api_key: string | null
  api_url: string | null
  status: string | null
  numero_telefone: string | null
  profile_name?: string | null
  profile_pic_url?: string | null
  is_business?: boolean | null
  webhook_url: string | null
  ativo: boolean | null
  dt_create: string | null
  dt_update: string | null
}

type InstanciaComLiveStatus = Instancia & {
  liveStatus?: InstanciaStatusCompleto | null
  isChecking?: boolean
}

const POLLING_INTERVAL = 30000 // 30 segundos

export default function InstancesPage() {
  const [instancias, setInstancias] = useState<InstanciaComLiveStatus[]>([])
  const [loading, setLoading] = useState(true)
  const [lastCheck, setLastCheck] = useState<Date | null>(null)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [stats, setStats] = useState({ grupos: 0, gatilhos: 0 })

  const instanciasRef = useRef<InstanciaComLiveStatus[]>([])
  const hasCheckedRef = useRef(false)

  const supabase = useMemo(() => createClient(), [])
  const apiService = useMemo(() => getUAZAPIService(), [])

  // Manter ref sincronizado com state
  useEffect(() => {
    instanciasRef.current = instancias
  }, [instancias])

  // Carregar instancias do Supabase
  const loadInstancias = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user?.email) return

      const { data: usuarioSistema } = await supabase
        .from("usuarios_sistema")
        .select("*, organizacoes(*)")
        .eq("email", user.email)
        .single()

      const organizacao = usuarioSistema?.organizacoes as { id: number } | null
      if (!organizacao?.id) return

      const { data } = await supabase
        .from("instancias_whatsapp")
        .select("*")
        .eq("id_organizacao", organizacao.id)
        .order("dt_create", { ascending: false })

      if (data) {
        setInstancias(data.map(i => ({ ...i, isChecking: false })))
      }

      // Carregar stats
      const { count: gruposCount } = await supabase
        .from("grupos")
        .select("*", { count: "exact", head: true })
        .eq("id_organizacao", organizacao.id)

      const { count: gatilhosCount } = await supabase
        .from("gatilhos")
        .select("*", { count: "exact", head: true })
        .eq("id_organizacao", organizacao.id)
        .eq("ativo", true)

      setStats({
        grupos: gruposCount || 0,
        gatilhos: gatilhosCount || 0
      })
    } catch (err) {
      console.error("Erro ao carregar instancias:", err)
    } finally {
      setLoading(false)
    }
  }, [supabase])

  // Verificar status de uma instancia especifica
  const checkInstanceStatus = useCallback(async (instancia: InstanciaComLiveStatus) => {
    if (!instancia.api_key) return instancia

    try {
      const statusResponse = await apiService.obterStatus(instancia.api_key)
      const extracted = statusResponse.extractedStatus

      if (extracted) {
        const newStatus = extracted.connected && extracted.loggedIn ? "conectado" : "desconectado"

        // Atualizar no banco se mudou
        if (instancia.status !== newStatus) {
          await supabase
            .from("instancias_whatsapp")
            .update({
              status: newStatus,
              numero_telefone: extracted.phoneNumber,
              profile_name: extracted.profileName,
              profile_pic_url: extracted.profilePicUrl,
              is_business: extracted.isBusiness,
              dt_update: new Date().toISOString(),
            })
            .eq("id", instancia.id)
        }

        return {
          ...instancia,
          status: newStatus,
          numero_telefone: extracted.phoneNumber,
          profile_name: extracted.profileName,
          profile_pic_url: extracted.profilePicUrl,
          is_business: extracted.isBusiness,
          liveStatus: extracted,
          isChecking: false,
        }
      }
    } catch (err) {
      console.error(`Erro ao verificar status da instancia ${instancia.id}:`, err)
    }

    return { ...instancia, isChecking: false }
  }, [apiService, supabase])

  // Verificar status de todas as instancias
  const checkAllStatuses = useCallback(async () => {
    const currentInstancias = instanciasRef.current
    if (currentInstancias.length === 0) return

    setIsRefreshing(true)
    setInstancias(prev => prev.map(i => ({ ...i, isChecking: !!i.api_key })))

    const updated = await Promise.all(
      currentInstancias.map(instancia => checkInstanceStatus(instancia))
    )

    setInstancias(updated)
    setLastCheck(new Date())
    setIsRefreshing(false)
  }, [checkInstanceStatus])

  // Carregar instancias ao montar
  useEffect(() => {
    loadInstancias()
  }, [loadInstancias])

  // Verificar status apos carregar instancias (apenas uma vez)
  useEffect(() => {
    if (!loading && instancias.length > 0 && !hasCheckedRef.current) {
      hasCheckedRef.current = true
      checkAllStatuses()
    }
  }, [loading, instancias.length, checkAllStatuses])

  // Polling automatico a cada 30 segundos
  useEffect(() => {
    if (loading || instancias.length === 0) return

    const interval = setInterval(() => {
      checkAllStatuses()
    }, POLLING_INTERVAL)

    return () => clearInterval(interval)
  }, [loading, instancias.length, checkAllStatuses])

  // Instancia principal (primeira conectada ou primeira da lista)
  const instanciaPrincipal = useMemo(() => {
    const conectada = instancias.find(i => i.status === "conectado")
    return conectada || instancias[0] || null
  }, [instancias])

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "N/A"
    return new Date(dateString).toLocaleDateString("pt-BR", {
      day: "numeric",
      month: "long",
      year: "numeric"
    })
  }

  if (loading) {
    return (
      <div className="flex-1 space-y-4 p-4 md:p-6">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <Skeleton className="h-5 w-36" />
            <Skeleton className="h-3 w-24" />
          </div>
        </div>
        <Skeleton className="h-32" />
        <Skeleton className="h-24" />
      </div>
    )
  }

  const isConnected = instanciaPrincipal?.status === "conectado"

  return (
    <div className="flex-1 space-y-4 p-4 md:p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Instancias WhatsApp</h2>
          <p className="text-sm text-muted-foreground">Gerencie suas conexoes.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <Bell className="h-4 w-4 text-muted-foreground" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={checkAllStatuses}
            disabled={isRefreshing}
          >
            <RefreshCw className={cn("h-3.5 w-3.5", isRefreshing && "animate-spin")} />
          </Button>
          {instancias.length === 0 && (
            <Button size="sm" className="h-8" asChild>
              <Link href="/instances/new">
                <Plus className="h-3.5 w-3.5 mr-1" />
                Nova
              </Link>
            </Button>
          )}
        </div>
      </div>

      {instanciaPrincipal ? (
        <>
          {/* Instance Card */}
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "w-10 h-10 rounded-full flex items-center justify-center",
                    isConnected ? "bg-green-100" : "bg-muted"
                  )}>
                    <Smartphone className={cn(
                      "h-5 w-5",
                      isConnected ? "text-green-600" : "text-muted-foreground"
                    )} />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold">{instanciaPrincipal.nome_instancia}</h3>
                    <p className="text-xs text-muted-foreground">
                      {instanciaPrincipal.liveStatus?.phoneFormatted ||
                       instanciaPrincipal.numero_telefone ||
                       "Numero nao disponivel"}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge className={cn(
                    "gap-1 text-xs h-6",
                    isConnected
                      ? "bg-green-100 text-green-700 hover:bg-green-100"
                      : "bg-muted text-muted-foreground hover:bg-muted"
                  )}>
                    <span className={cn(
                      "w-1.5 h-1.5 rounded-full",
                      isConnected ? "bg-green-500 animate-pulse" : "bg-muted-foreground"
                    )} />
                    {isConnected ? "Online" : "Offline"}
                  </Badge>
                  {instanciaPrincipal.isChecking && (
                    <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
                  )}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-7 w-7">
                        <MoreVertical className="h-3.5 w-3.5" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem asChild>
                        <Link href={`/instances/${instanciaPrincipal.id}`}>Configuracoes</Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem className="text-destructive">Desconectar</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-4 gap-2">
                <div className="text-center p-2 bg-muted rounded">
                  <p className="text-lg font-bold">{stats.grupos}</p>
                  <p className="text-xs text-muted-foreground">Grupos</p>
                </div>
                <div className="text-center p-2 bg-muted rounded">
                  <p className="text-lg font-bold">{stats.gatilhos}</p>
                  <p className="text-xs text-muted-foreground">Gatilhos</p>
                </div>
                <div className="text-center p-2 bg-muted rounded">
                  <p className="text-lg font-bold">0</p>
                  <p className="text-xs text-muted-foreground">Msgs hoje</p>
                </div>
                <div className="text-center p-2 bg-muted rounded">
                  <p className="text-lg font-bold">{isConnected ? "99%" : "0%"}</p>
                  <p className="text-xs text-muted-foreground">Uptime</p>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-between mt-4 pt-3 border-t">
                <span className="text-xs text-muted-foreground">
                  {isConnected ? "Conectada agora" : "Desconectada"}
                </span>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" className="h-7 text-xs" onClick={checkAllStatuses} disabled={isRefreshing}>
                    <RefreshCw className={cn("h-3 w-3 mr-1", isRefreshing && "animate-spin")} />
                    Reconectar
                  </Button>
                  {isConnected && (
                    <Button size="sm" variant="outline" className="h-7 text-xs border-destructive text-destructive hover:bg-destructive/10">
                      <Power className="h-3 w-3 mr-1" />
                      Desconectar
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* QR Code Section (when disconnected) */}
          {!isConnected && (
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3 mb-3">
                  <QrCode className="h-4 w-4 text-primary" />
                  <h3 className="text-sm font-semibold">Conectar WhatsApp</h3>
                </div>
                <div className="flex items-start gap-4">
                  <div className="w-32 h-32 rounded flex items-center justify-center border-2 border-dashed border-border bg-muted/50 flex-shrink-0">
                    <QrCode className="h-10 w-10 text-muted-foreground" />
                  </div>
                  <div className="flex-1 space-y-2">
                    <ol className="space-y-1 text-xs text-muted-foreground">
                      <li className="flex items-center gap-2">
                        <span className="w-4 h-4 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-[10px] font-bold">1</span>
                        Abra o WhatsApp no celular
                      </li>
                      <li className="flex items-center gap-2">
                        <span className="w-4 h-4 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-[10px] font-bold">2</span>
                        Menu → Aparelhos conectados
                      </li>
                      <li className="flex items-center gap-2">
                        <span className="w-4 h-4 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-[10px] font-bold">3</span>
                        Conectar aparelho → Escanear QR
                      </li>
                    </ol>
                    <Button size="sm" className="h-7 text-xs mt-2" asChild>
                      <Link href={`/instances/${instanciaPrincipal.id}/connect`}>
                        <RefreshCw className="h-3 w-3 mr-1" />
                        Gerar QR Code
                      </Link>
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Instance Info */}
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <Info className="h-4 w-4 text-primary" />
                <h3 className="text-sm font-semibold">Informacoes da Instancia</h3>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div>
                  <label className="text-xs text-muted-foreground">Nome</label>
                  <p className="text-sm font-medium">{instanciaPrincipal.nome_instancia}</p>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Numero</label>
                  <p className="text-sm font-medium">
                    {instanciaPrincipal.liveStatus?.phoneFormatted ||
                     instanciaPrincipal.numero_telefone ||
                     "-"}
                  </p>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Criada em</label>
                  <p className="text-sm font-medium">{formatDate(instanciaPrincipal.dt_create)}</p>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Ultima atividade</label>
                  <p className="text-sm font-medium">
                    {isConnected ? "Agora" : formatDate(instanciaPrincipal.dt_update)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      ) : (
        /* Empty State */
        <Card>
          <CardContent className="p-6 text-center">
            <div className="w-12 h-12 bg-muted rounded-full flex items-center justify-center mx-auto mb-3">
              <Smartphone className="h-6 w-6 text-muted-foreground" />
            </div>
            <h3 className="text-sm font-semibold mb-1">Nenhuma instancia</h3>
            <p className="text-xs text-muted-foreground mb-3">
              Conecte seu WhatsApp para comecar
            </p>
            <Button size="sm" className="h-7 text-xs" asChild>
              <Link href="/instances/new">
                <Plus className="h-3 w-3 mr-1" />
                Nova Instancia
              </Link>
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Footer */}
      <footer className="py-2 text-center text-xs text-muted-foreground">
        <p>&copy; 2025 Sincron Grupos</p>
      </footer>
    </div>
  )
}
