"use client"

import { useState } from "react"
import {
  User,
  Shield,
  Bell,
  Sliders,
  Building2,
  Plug,
  AlertTriangle,
  Monitor,
  Smartphone,
  CreditCard,
  Key,
  Zap,
  Code,
  Download,
  Trash2,
  Loader2
} from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Separator } from "@/components/ui/separator"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { createClient } from "@/lib/supabase/client"
import { toast } from "sonner"

export default function SettingsPage() {
  // Account state
  const [name, setName] = useState("Michelle Santos")
  const [email, setEmail] = useState("michelle@sincron.com")
  const [phone, setPhone] = useState("+55 11 99999-9999")
  const [role, setRole] = useState("admin")

  // Password state
  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false)

  // Security state
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false)

  // Notifications state
  const [notifications, setNotifications] = useState({
    email: true,
    messages: true,
    triggers: true,
    reports: false,
    updates: true,
  })

  // Preferences state
  const [language, setLanguage] = useState("pt-BR")
  const [timezone, setTimezone] = useState("America/Sao_Paulo")
  const [dateFormat, setDateFormat] = useState("DD/MM/YYYY")
  const [theme, setTheme] = useState("light")

  // Organization state
  const [orgName, setOrgName] = useState("Sincron Grupos Ltda")

  // Handle password update
  const handlePasswordUpdate = async () => {
    // Validation
    if (!newPassword || !confirmPassword) {
      toast.error("Preencha todos os campos de senha")
      return
    }

    if (newPassword.length < 6) {
      toast.error("A nova senha deve ter pelo menos 6 caracteres")
      return
    }

    if (newPassword !== confirmPassword) {
      toast.error("As senhas não coincidem")
      return
    }

    setIsUpdatingPassword(true)

    try {
      const supabase = createClient()

      const { error } = await supabase.auth.updateUser({
        password: newPassword
      })

      if (error) {
        throw error
      }

      toast.success("Senha atualizada com sucesso!")
      setCurrentPassword("")
      setNewPassword("")
      setConfirmPassword("")
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Erro ao atualizar senha"
      toast.error(errorMessage)
    } finally {
      setIsUpdatingPassword(false)
    }
  }

  return (
    <div className="flex-1 space-y-4 p-4 md:p-6">
      <div>
        <h2 className="text-lg font-bold text-foreground">Configuracoes</h2>
        <p className="text-sm text-muted-foreground">Preferencias e conta</p>
      </div>

      <div className="max-w-4xl space-y-4">
        {/* Account Section */}
        <Card>
          <CardHeader className="border-b py-3 px-4">
            <CardTitle className="flex items-center gap-2 text-sm">
              <User className="h-4 w-4 text-primary" />
              Conta
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 p-4">
            {/* Profile Photo */}
            <div className="flex items-start gap-4">
              <Avatar className="h-14 w-14 border-2 border-border">
                <AvatarImage src="https://storage.googleapis.com/uxpilot-auth.appspot.com/avatars/avatar-1.jpg" />
                <AvatarFallback>MS</AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <Label className="mb-1 block text-sm font-medium">Foto</Label>
                <div className="flex items-center gap-2">
                  <Button size="sm" className="h-8 text-xs">Alterar</Button>
                  <Button variant="ghost" size="sm" className="h-8 text-xs text-destructive hover:text-destructive">
                    Remover
                  </Button>
                </div>
              </div>
            </div>

            {/* Form Fields */}
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-1">
                <Label htmlFor="name" className="text-xs font-medium">Nome</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="h-9 text-sm"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="email" className="text-xs font-medium">E-mail</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-9 text-sm"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="phone" className="text-xs font-medium">Telefone</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="h-9 text-sm"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="role" className="text-xs font-medium">Funcao</Label>
                <Select value={role} onValueChange={setRole}>
                  <SelectTrigger className="h-9 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="gerente">Gerente</SelectItem>
                    <SelectItem value="operador">Operador</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" size="sm" className="h-8 text-xs">Cancelar</Button>
              <Button>Salvar Alteracoes</Button>
            </div>
          </CardContent>
        </Card>

        {/* Security Section */}
        <Card>
          <CardHeader className="border-b py-3 px-4">
            <CardTitle className="flex items-center gap-2 text-sm">
              <Shield className="h-4 w-4 text-primary" />
              Seguranca
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 p-4">
            {/* Password Change */}
            <div>
              <Label className="mb-2 block text-xs font-medium">Alterar Senha</Label>
              <div className="space-y-2">
                <Input
                  type="password"
                  placeholder="Senha atual"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="h-9 text-sm"
                />
                <Input
                  type="password"
                  placeholder="Nova senha (min 6)"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="h-9 text-sm"
                />
                <Input
                  type="password"
                  placeholder="Confirmar"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="h-9 text-sm"
                />
              </div>
              <Button
                className="mt-3 h-8 text-xs"
                size="sm"
                onClick={handlePasswordUpdate}
                disabled={isUpdatingPassword}
              >
                {isUpdatingPassword && <Loader2 className="mr-1 h-3 w-3 animate-spin" />}
                Atualizar
              </Button>
            </div>

            <Separator />

            {/* Two Factor */}
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-medium">2FA</h4>
                <p className="text-xs text-muted-foreground">Seguranca extra</p>
              </div>
              <Switch
                checked={twoFactorEnabled}
                onCheckedChange={setTwoFactorEnabled}
              />
            </div>

            <Separator />

            {/* Active Sessions */}
            <div>
              <h4 className="mb-2 text-xs font-medium">Sessoes</h4>
              <div className="space-y-2">
                <div className="flex items-center justify-between rounded-lg bg-muted p-2.5">
                  <div className="flex items-center gap-2">
                    <Monitor className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-xs font-medium">Windows - Chrome</p>
                      <p className="text-[10px] text-muted-foreground">Ativo agora</p>
                    </div>
                  </div>
                  <Badge variant="secondary" className="bg-primary/10 text-primary text-[10px] px-1.5 py-0">
                    Atual
                  </Badge>
                </div>
                <div className="flex items-center justify-between rounded-lg bg-muted p-2.5">
                  <div className="flex items-center gap-2">
                    <Smartphone className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-xs font-medium">iPhone - Safari</p>
                      <p className="text-[10px] text-muted-foreground">2h atras</p>
                    </div>
                  </div>
                  <Button variant="ghost" size="sm" className="h-7 text-xs text-destructive hover:text-destructive">
                    Encerrar
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Notifications Section */}
        <Card>
          <CardHeader className="border-b py-3 px-4">
            <CardTitle className="flex items-center gap-2 text-sm">
              <Bell className="h-4 w-4 text-primary" />
              Notificacoes
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-0 p-4">
            <div className="flex items-center justify-between border-b py-2">
              <span className="text-xs font-medium">E-mail</span>
              <Switch
                checked={notifications.email}
                onCheckedChange={(checked) => setNotifications({...notifications, email: checked})}
              />
            </div>
            <div className="flex items-center justify-between border-b py-2">
              <span className="text-xs font-medium">Mensagens</span>
              <Switch
                checked={notifications.messages}
                onCheckedChange={(checked) => setNotifications({...notifications, messages: checked})}
              />
            </div>
            <div className="flex items-center justify-between border-b py-2">
              <span className="text-xs font-medium">Gatilhos</span>
              <Switch
                checked={notifications.triggers}
                onCheckedChange={(checked) => setNotifications({...notifications, triggers: checked})}
              />
            </div>
            <div className="flex items-center justify-between border-b py-2">
              <span className="text-xs font-medium">Relatorios</span>
              <Switch
                checked={notifications.reports}
                onCheckedChange={(checked) => setNotifications({...notifications, reports: checked})}
              />
            </div>
            <div className="flex items-center justify-between py-2">
              <span className="text-xs font-medium">Atualizacoes</span>
              <Switch
                checked={notifications.updates}
                onCheckedChange={(checked) => setNotifications({...notifications, updates: checked})}
              />
            </div>
          </CardContent>
        </Card>

        {/* Preferences Section */}
        <Card>
          <CardHeader className="border-b py-3 px-4">
            <CardTitle className="flex items-center gap-2 text-sm">
              <Sliders className="h-4 w-4 text-primary" />
              Preferencias
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 p-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs font-medium">Idioma</Label>
                <Select value={language} onValueChange={setLanguage}>
                  <SelectTrigger className="h-9 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pt-BR">Portugues</SelectItem>
                    <SelectItem value="en-US">English</SelectItem>
                    <SelectItem value="es">Espanol</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-medium">Fuso</Label>
                <Select value={timezone} onValueChange={setTimezone}>
                  <SelectTrigger className="h-9 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="America/Sao_Paulo">Sao Paulo</SelectItem>
                    <SelectItem value="America/New_York">New York</SelectItem>
                    <SelectItem value="Europe/London">London</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-medium">Tema</Label>
              <RadioGroup value={theme} onValueChange={setTheme} className="flex gap-4">
                <div className="flex items-center gap-1.5">
                  <RadioGroupItem value="light" id="light" />
                  <Label htmlFor="light" className="cursor-pointer text-xs font-normal">Claro</Label>
                </div>
                <div className="flex items-center gap-1.5">
                  <RadioGroupItem value="dark" id="dark" />
                  <Label htmlFor="dark" className="cursor-pointer text-xs font-normal">Escuro</Label>
                </div>
                <div className="flex items-center gap-1.5">
                  <RadioGroupItem value="auto" id="auto" />
                  <Label htmlFor="auto" className="cursor-pointer text-xs font-normal">Auto</Label>
                </div>
              </RadioGroup>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" size="sm" className="h-8 text-xs">Restaurar</Button>
              <Button size="sm" className="h-8 text-xs">Salvar</Button>
            </div>
          </CardContent>
        </Card>

        {/* Organization Section */}
        <Card>
          <CardHeader className="border-b py-3 px-4">
            <CardTitle className="flex items-center gap-2 text-sm">
              <Building2 className="h-4 w-4 text-primary" />
              Organizacao
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 p-4">
            <div className="space-y-1">
              <Label className="text-xs font-medium">Nome</Label>
              <Input
                id="orgName"
                value={orgName}
                onChange={(e) => setOrgName(e.target.value)}
                className="h-9 text-sm"
              />
            </div>

            {/* Plan Info */}
            <div className="rounded-lg border bg-muted/50 p-3">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <h4 className="text-xs font-medium">Plano Professional</h4>
                </div>
                <Badge className="bg-primary text-[10px] px-1.5 py-0">Ativo</Badge>
              </div>
              <div className="grid grid-cols-3 gap-3 text-center">
                <div>
                  <p className="text-[10px] text-muted-foreground">Grupos</p>
                  <p className="text-sm font-bold">47/120</p>
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground">Usuarios</p>
                  <p className="text-sm font-bold">8/20</p>
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground">Renovacao</p>
                  <p className="text-sm font-bold">15d</p>
                </div>
              </div>
              <Button size="sm" className="mt-3 w-full h-8 text-xs">Gerenciar Plano</Button>
            </div>

            {/* Billing Info */}
            <div className="flex items-center justify-between rounded-lg bg-muted p-2.5">
              <div className="flex items-center gap-2">
                <CreditCard className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-xs font-medium">**** 4242</p>
                  <p className="text-[10px] text-muted-foreground">12/2025</p>
                </div>
              </div>
              <Button variant="ghost" size="sm" className="h-7 text-xs text-primary">
                Editar
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Integrations Section */}
        <Card>
          <CardHeader className="border-b py-3 px-4">
            <CardTitle className="flex items-center gap-2 text-sm">
              <Plug className="h-4 w-4 text-primary" />
              Integracoes
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 p-4">
            <div className="flex items-center justify-between rounded-lg border p-2.5">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded bg-orange-500">
                  <Zap className="h-4 w-4 text-white" />
                </div>
                <span className="text-xs font-medium">Zapier</span>
              </div>
              <Button size="sm" className="h-7 text-xs">Conectar</Button>
            </div>
            <div className="flex items-center justify-between rounded-lg border bg-accent/5 p-2.5">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded bg-accent">
                  <Code className="h-4 w-4 text-white" />
                </div>
                <span className="text-xs font-medium">Webhooks (3)</span>
              </div>
              <Button variant="outline" size="sm" className="h-7 text-xs">Gerenciar</Button>
            </div>
            <div className="flex items-center justify-between rounded-lg border p-2.5">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded bg-blue-600">
                  <Key className="h-4 w-4 text-white" />
                </div>
                <span className="text-xs font-medium">API Keys</span>
              </div>
              <Button variant="outline" size="sm" className="h-7 text-xs">Ver</Button>
            </div>
          </CardContent>
        </Card>

        {/* Danger Zone */}
        <Card className="border-2 border-destructive/20">
          <CardHeader className="border-b border-destructive/20 py-3 px-4">
            <CardTitle className="flex items-center gap-2 text-sm text-destructive">
              <AlertTriangle className="h-4 w-4" />
              Zona de Perigo
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-0 p-4">
            <div className="flex items-center justify-between border-b py-2">
              <span className="text-xs font-medium">Exportar Dados</span>
              <Button variant="outline" size="sm" className="h-7 text-xs">
                <Download className="mr-1 h-3 w-3" />
                Exportar
              </Button>
            </div>
            <div className="flex items-center justify-between py-2">
              <span className="text-xs font-medium text-destructive">Excluir Conta</span>
              <Button variant="destructive" size="sm" className="h-7 text-xs">
                <Trash2 className="mr-1 h-3 w-3" />
                Excluir
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Footer */}
        <footer className="pb-3 pt-4 text-center text-xs text-muted-foreground">
          <p>Copyright &copy; 2025 Sincron Grupos</p>
        </footer>
      </div>
    </div>
  )
}
