import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

export default function Setup() {
  const { toast } = useToast();
  const [email, setEmail] = useState("contato@keeptur.com");
  const [password, setPassword] = useState("");
  const [token, setToken] = useState("");
  const [loading, setLoading] = useState(false);
  const [signing, setSigning] = useState(false);

  const run = async () => {
    if (!email || !password || !token) {
      toast({ title: "Preencha todos os campos", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("bootstrap-admin", {
        body: { email, password, token },
      });
      if (error) throw error;
      toast({ title: "Administrador criado", description: `ID: ${data?.user_id || "ok"}` });
    } catch (err: any) {
      toast({ title: "Erro ao criar admin", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const signIn = async () => {
    if (!email || !password) {
      toast({ title: "Informe email e senha" });
      return;
    }
    setSigning(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      toast({ title: "Login realizado" });
      window.location.href = "/admin";
    } catch (err: any) {
      toast({ title: "Erro ao entrar", description: err.message, variant: "destructive" });
    } finally {
      setSigning(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-lg">
        <Card>
          <CardHeader>
            <CardTitle>Configuração Inicial (uma vez)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Email do Admin</Label>
              <Input value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div>
              <Label>Senha do Admin</Label>
              <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
            </div>
            <div>
              <Label>Bootstrap Token (segredo)</Label>
              <Input value={token} onChange={(e) => setToken(e.target.value)} />
            </div>
            <div className="flex gap-2 flex-wrap">
              <Button onClick={run} disabled={loading}>{loading ? "Criando..." : "Criar Admin"}</Button>
              <Button variant="secondary" onClick={signIn} disabled={signing}>{signing ? "Entrando..." : "Entrar como Admin"}</Button>
              <Button variant="outline" onClick={() => (window.location.href = "/login")}>Voltar</Button>
            </div>
            <p className="text-sm text-muted-foreground">Após criar, remova/rotacione o token e/ou desative a função.</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
