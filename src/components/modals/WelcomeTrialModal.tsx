import { useEffect, useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

// Keys used to persist whether the welcome modal was shown and when the trial started.
const WELCOME_KEY = "keeptur:welcome-shown";
const TRIAL_START_KEY = "keeptur:trial-start";

/**
 * Modal de boas‑vindas exibida para usuários não‑admin logo após o login.
 *
 * Esta versão corrige o cálculo do período de trial. O componente agora tenta
 * obter a data de início e fim do trial diretamente da tabela `subscribers`.
 * Caso não haja `trial_end`, ele calcula o prazo com base em `trial_start` +
 * `settings.trial_days` + quaisquer dias adicionais concedidos pelo admin (se
 * disponíveis). Se nenhuma informação estiver presente, utiliza um valor
 * configurado por padrão. O valor final é armazenado em `realTrialDays` para
 * priorizar dados do servidor sobre o cálculo local.
 */
export function WelcomeTrialModal() {
  const [open, setOpen] = useState(false);
  const [allowed, setAllowed] = useState(false);
  const [isReturning, setIsReturning] = useState(false);
  // Número de dias de trial calculado com base em dados reais do servidor. Quando
  // `null`, o cálculo local será usado como fallback.
  const [realTrialDays, setRealTrialDays] = useState<number | null>(null);
  // Configuração de dias de trial definida no painel administrativo. Começa com
  // um valor de 2 para evitar NaN até carregar as configurações.
  const [configuredTrialDays, setConfiguredTrialDays] = useState<number>(2);

  /**
   * Recupera as configurações de trial e os dados de trial do usuário atual.
   * Esta função é invocada sempre que o modal for aberto ou quando as
   * permissões do usuário mudarem. Ela aguarda o carregamento das
   * configurações antes de calcular `realTrialDays` para garantir precisão.
   */
  const fetchTrialInfo = async () => {
    if (!allowed) return;
    // Busca a configuração de dias de trial do admin
    const { data: settings } = await supabase
      .from("settings")
      .select("trial_days")
      .limit(1)
      .maybeSingle();
    const cfgDays = settings?.trial_days ?? configuredTrialDays;
    setConfiguredTrialDays(cfgDays);
    // Recupera o usuário logado
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setRealTrialDays(null);
      return;
    }
    // Verifica se o usuário é admin
    const { data: roles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id);
    const isAdmin = (roles || []).some((r) => r.role === "admin");
    if (isAdmin) {
      setAllowed(false);
      return;
    }
    // Carrega o registro de subscriber para o usuário (ou pelo email)
    const { data: subscriber } = await supabase
      .from("subscribers")
      .select("trial_end, trial_start, subscribed")
      .or(`user_id.eq.${user.id},email.eq.${user.email}`)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (subscriber && !subscriber.subscribed) {
      const nowMs = Date.now();
      // Se há data de término do trial, priorize-a
      if (subscriber.trial_end) {
        const endMs = new Date(subscriber.trial_end as any).getTime();
        const days = Math.max(0, Math.ceil((endMs - nowMs) / (1000 * 60 * 60 * 24)));
        setRealTrialDays(days);
        return;
      }
      // Caso contrário, se houver trial_start, usa configuração dinâmica
      if (subscriber.trial_start) {
        const startDate = new Date(subscriber.trial_start as any);
        const end = new Date(startDate);
        end.setDate(end.getDate() + cfgDays);
        const days = Math.max(0, Math.ceil((end.getTime() - nowMs) / (1000 * 60 * 60 * 24)));
        setRealTrialDays(days);
        return;
      }
    }
    // Se não houver subscriber ou não for possível calcular via servidor,
    // usa o cálculo local (mantém realTrialDays = null) para fallback
    setRealTrialDays(null);
  };

  // Primeiro effect: define se o modal deve ser mostrado (não mostrar para admin)
  useEffect(() => {
    if (window.location.pathname.startsWith("/admin")) {
      setAllowed(false);
      return;
    }
    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setAllowed(true);
        return;
      }
      const { data: roles } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id);
      const isAdmin = (roles || []).some((r) => r.role === "admin");
      setAllowed(!isAdmin);
    })();
  }, []);

  // Segundo effect: sempre que permitido ou a modal abrir, recarrega dados de trial
  useEffect(() => {
    if (allowed) {
      fetchTrialInfo().catch(() => {});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allowed, open]);

  // Controlar exibição da modal com base na permissão e armazenamento local
  useEffect(() => {
    if (!allowed) return;
    const alreadyShown = localStorage.getItem(WELCOME_KEY);
    // Usuário retornando: já viu antes
    if (alreadyShown) {
      setIsReturning(true);
      setOpen(true);
    } else {
      // Primeira visita: armazenar início do trial se ainda não existir
      if (!localStorage.getItem(TRIAL_START_KEY)) {
        localStorage.setItem(TRIAL_START_KEY, new Date().toISOString());
      }
      setOpen(true);
    }
  }, [allowed]);

  // Cálculo de dias restantes: prioriza `realTrialDays` quando disponível
  const daysRemaining = useMemo(() => {
    if (realTrialDays !== null) return realTrialDays;
    // Fallback local: usar a data do localStorage e dias configurados
    const startIso = localStorage.getItem(TRIAL_START_KEY);
    const start = startIso ? new Date(startIso) : new Date();
    const end = new Date(start);
    end.setDate(end.getDate() + configuredTrialDays);
    const diffMs = end.getTime() - Date.now();
    return Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
  }, [open, realTrialDays, configuredTrialDays]);

  const handleClose = () => {
    localStorage.setItem(WELCOME_KEY, "true");
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-md animate-enter">
        <DialogHeader>
          <DialogTitle className="text-2xl">
            {isReturning ? "Bem-vindo de volta!" : "Bem-vindo ao Keeptur! "}
          </DialogTitle>
          <DialogDescription>
            {isReturning
              ? "Continue aproveitando sua experiência com o Keeptur."
              : "Aproveite sua experiência com um período de avaliação gratuito."}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <p className="text-base">
            Você ainda tem <span className="font-semibold text-primary">{daysRemaining} dia{daysRemaining === 1 ? '' : 's'}</span> de trial para explorar todos os recursos.
          </p>
          <p className="text-sm text-muted-foreground">
            O período de teste pode ser ajustado pelo administrador a qualquer momento.
          </p>
        </div>
        <div className="flex justify-end pt-2">
          <Button onClick={handleClose}>{isReturning ? "Continuar" : "Começar"}</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}