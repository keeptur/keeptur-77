
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

interface SMTP {
  id: string;
  host: string;
  port: number;
  username: string | null;
  from_email: string;
  secure: boolean;
}

interface Template {
  id: string;
  type: string; // enum no banco; aqui só exibimos
  subject: string;
  html: string;
}

export default function EmailsSection() {
  const { toast } = useToast();
  const [smtp, setSmtp] = useState<SMTP | null>(null);
  const [loadingSmtp, setLoadingSmtp] = useState(true);

  const [templates, setTemplates] = useState<Template[]>([]);
  const [selected, setSelected] = useState<Template | null>(null);
  const [loadingTpl, setLoadingTpl] = useState(true);

  useEffect(() => {
    const loadSMTP = async () => {
      const { data, error } = await supabase.from("smtp_settings").select("*").limit(1).maybeSingle();
      if (error) {
        // Se a tabela estiver vazia, podemos começar com um objeto em branco
        setSmtp(null);
      } else {
        setSmtp(data as any);
      }
      setLoadingSmtp(false);
    };
    const loadTemplates = async () => {
      const { data, error } = await supabase.from("email_templates").select("id, type, subject, html").order("updated_at", { ascending: false });
      if (error) {
        toast({ title: "Erro ao carregar templates", description: error.message, variant: "destructive" });
      } else {
        setTemplates((data || []) as any);
      }
      setLoadingTpl(false);
    };
    loadSMTP().catch(() => setLoadingSmtp(false));
    loadTemplates().catch(() => setLoadingTpl(false));
  }, []);

  const saveSMTP = async () => {
    const payload: any = smtp
      ? { ...smtp, updated_by: null }
      : { host: "", port: 587, username: "", from_email: "", secure: false };

    const { data, error } = await supabase.from("smtp_settings").upsert(payload).select().maybeSingle();
    if (error) {
      toast({ title: "Erro ao salvar SMTP", description: error.message, variant: "destructive" });
    } else {
      setSmtp(data as any);
      toast({ title: "SMTP salvo" });
    }
  };

  const saveTemplate = async () => {
    if (!selected) return;
    const { error } = await supabase
      .from("email_templates")
      .update({ subject: selected.subject, html: selected.html })
      .eq("id", selected.id);
    if (error) {
      toast({ title: "Erro ao salvar template", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Template salvo" });
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <Card>
        <CardHeader>
          <CardTitle>SMTP</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {loadingSmtp ? (
            <div>Carregando...</div>
          ) : (
            <>
              <div>
                <Label>Host</Label>
                <Input value={smtp?.host ?? ""} onChange={(e) => setSmtp((s) => ({ ...(s || {} as any), host: e.target.value }))} />
              </div>
              <div>
                <Label>Porta</Label>
                <Input type="number" value={smtp?.port ?? 587} onChange={(e) => setSmtp((s) => ({ ...(s || {} as any), port: parseInt(e.target.value || "587", 10) }))} />
              </div>
              <div>
                <Label>Usuário</Label>
                <Input value={smtp?.username ?? ""} onChange={(e) => setSmtp((s) => ({ ...(s || {} as any), username: e.target.value }))} />
              </div>
              <div>
                <Label>Remetente (from)</Label>
                <Input value={smtp?.from_email ?? ""} onChange={(e) => setSmtp((s) => ({ ...(s || {} as any), from_email: e.target.value }))} />
              </div>
              <div className="md:col-span-2">
                <Button onClick={saveSMTP}>Salvar SMTP</Button>
              </div>
              <p className="md:col-span-2 text-sm text-muted-foreground">
                As credenciais sensíveis (senha) ficam como Secret no Supabase. Este painel salva host/porta/usuário/from.
              </p>
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Templates de E-mail</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {loadingTpl ? (
            <div>Carregando...</div>
          ) : templates.length === 0 ? (
            <div className="text-sm text-muted-foreground">Nenhum template encontrado.</div>
          ) : (
            <>
              <div className="flex flex-wrap gap-2">
                {templates.map((t) => (
                  <Button
                    key={t.id}
                    variant={selected?.id === t.id ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSelected(t)}
                  >
                    {t.type}
                  </Button>
                ))}
              </div>

              {selected && (
                <div className="space-y-2">
                  <div>
                    <Label>Assunto</Label>
                    <Input value={selected.subject} onChange={(e) => setSelected({ ...selected, subject: e.target.value })} />
                  </div>
                  <div>
                    <Label>HTML</Label>
                    <Textarea className="min-h-[240px]" value={selected.html} onChange={(e) => setSelected({ ...selected, html: e.target.value })} />
                  </div>
                  <Button onClick={saveTemplate}>Salvar Template</Button>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
