import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

const WELCOME_KEY = "keeptur:welcome-shown";
const TRIAL_START_KEY = "keeptur:trial-start";

export function WelcomeTrialModal() {
  const [open, setOpen] = useState(false);
  const [allowed, setAllowed] = useState(false);
  const [isReturning, setIsReturning] = useState(false);
  const [realTrialDays, setRealTrialDays] = useState<number | null>(null);
  const [configuredTrialDays, setConfiguredTrialDays] = useState<number>(2);

  useEffect(() => {
    // Não exibe no admin
    if (window.location.pathname.startsWith('/admin')) {
      setAllowed(false);
      return;
    }

    (async () => {
      console.log("WelcomeTrialModal: Starting setup");
      
      // Buscar configurações de trial do admin
      const { data: settings } = await supabase
        .from('settings')
        .select('trial_days')
        .limit(1)
        .maybeSingle();
      
      console.log("WelcomeTrialModal: Settings from DB:", settings);
      
      if (settings?.trial_days) {
        console.log("WelcomeTrialModal: Setting trial_days to:", settings.trial_days);
        setConfiguredTrialDays(settings.trial_days);
      } else {
        console.log("WelcomeTrialModal: No settings found, using default");
      }

      const { data: { user } } = await supabase.auth.getUser();
      console.log("WelcomeTrialModal: Current user:", user?.email);
      
      if (!user) {
        console.log("WelcomeTrialModal: No user, allowing modal for anonymous");
        setAllowed(true);
      } else {
        const { data: roles } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id);
        const isAdmin = (roles || []).some(r => r.role === 'admin');
        
        console.log("WelcomeTrialModal: User roles:", roles);
        console.log("WelcomeTrialModal: Is admin:", isAdmin);
        
        if (!isAdmin) {
          setAllowed(true);
          // Buscar dados reais de trial do usuário
          const { data: subscriber } = await supabase
            .from('subscribers')
            .select('trial_end, subscribed, trial_start')
            .or(`user_id.eq.${user.id},email.eq.${user.email}`)
            .maybeSingle();
          
          console.log("WelcomeTrialModal: Subscriber data:", subscriber);
          
          if (subscriber?.trial_end && !subscriber?.subscribed) {
            const now = Date.now();
            const trialEnd = new Date(subscriber.trial_end).getTime();
            const remainingDays = Math.max(0, Math.ceil((trialEnd - now) / (1000 * 60 * 60 * 24)));
            console.log("WelcomeTrialModal: Real trial days calculated:", remainingDays);
            setRealTrialDays(remainingDays);
          } else {
            console.log("WelcomeTrialModal: No active trial found");
          }
        } else {
          console.log("WelcomeTrialModal: Admin user, not showing modal");
          setAllowed(false);
        }
      }
    })();
  }, []);

  useEffect(() => {
    if (!allowed) return;
    const alreadyShown = localStorage.getItem(WELCOME_KEY);
    
    if (alreadyShown) {
      // Se já mostrou antes, é usuário retornando
      setIsReturning(true);
      setOpen(true);
    } else {
      // Primeira vez
      if (!localStorage.getItem(TRIAL_START_KEY)) {
        localStorage.setItem(TRIAL_START_KEY, new Date().toISOString());
      }
      setOpen(true);
    }
  }, [allowed]);

  const daysRemaining = useMemo(() => {
    console.log("WelcomeTrialModal: Calculating daysRemaining");
    console.log("WelcomeTrialModal: realTrialDays:", realTrialDays);
    console.log("WelcomeTrialModal: configuredTrialDays:", configuredTrialDays);
    
    // Priorizar dados reais do Supabase quando disponíveis
    if (realTrialDays !== null) {
      console.log("WelcomeTrialModal: Using realTrialDays:", realTrialDays);
      return realTrialDays;
    }
    
    // Fallback para cálculo local com dias configurados pelo admin
    console.log("WelcomeTrialModal: Using configuredTrialDays for calculation");
    const startIso = localStorage.getItem(TRIAL_START_KEY);
    const start = startIso ? new Date(startIso) : new Date();
    const end = new Date(start);
    end.setDate(end.getDate() + configuredTrialDays);
    const diffMs = end.getTime() - Date.now();
    const days = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
    
    console.log("WelcomeTrialModal: Calculated days:", days);
    console.log("WelcomeTrialModal: Trial start:", start);
    console.log("WelcomeTrialModal: Trial end:", end);
    
    return days;
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
            {isReturning ? 'Bem-vindo de volta!' : 'Bem-vindo ao Keeptur! 🎉'}
          </DialogTitle>
          <DialogDescription>
            {isReturning 
              ? 'Continue aproveitando sua experiência com o Keeptur.' 
              : 'Aproveite sua experiência com um período de avaliação gratuito.'
            }
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
          <Button onClick={handleClose}>
            {isReturning ? 'Continuar' : 'Começar'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}