import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export function PaymentVerifier() {
  const { toast } = useToast();

  useEffect(() => {
    const url = new URL(window.location.href);
    const sessionId = url.searchParams.get('session_id');
    if (!sessionId) return;

    const verify = async () => {
      try {
        const { data, error } = await supabase.functions.invoke('verify-payment', {
          body: { session_id: sessionId }
        });
        if (error) throw error;

        if ((data as any)?.paid) {
          toast({
            title: "Pagamento confirmado!",
            description: `Plano ${(data as any)?.plan_name || ''} ativado.`,
          });
        } else {
          toast({
            title: "Pagamento pendente",
            description: "Estamos processando seu pagamento. Tente novamente em instantes.",
            variant: "destructive",
          });
        }
      } catch (e: any) {
        toast({
          title: "Erro ao verificar pagamento",
          description: e?.message || 'Tente novamente.',
          variant: "destructive",
        });
      } finally {
        // Clean URL
        url.searchParams.delete('session_id');
        window.history.replaceState({}, document.title, url.toString());
      }
    };

    verify();
  }, [toast]);

  return null;
}
