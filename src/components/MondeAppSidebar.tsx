// MondeAppSidebar.tsx
import { useState, useEffect } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarTrigger,
  SidebarRail,
  useSidebar,
} from "@/components/ui/sidebar";
import {
  LayoutDashboard,
  Users,
  
  LogOut,
  CreditCard,
  Mail,
  Package,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { api } from "@/lib/api";
import { supabase } from "@/integrations/supabase/client";

const navigationItems = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard },
  { title: "Pessoas", url: "/people", icon: Users },
  { title: "Assinaturas", url: "/subscription", icon: CreditCard },
];

  const adminNavigationItems = [
    { title: "Dashboard", url: "/admin?t=dashboard", icon: LayoutDashboard },
    { title: "Usuários", url: "/admin?t=users", icon: Users },
    { title: "Planos", url: "/admin?t=plans", icon: Package },
    { title: "E-mails", url: "/admin/emails", icon: Mail },
  ];

export function MondeAppSidebar() {
  const { state } = useSidebar();
  const location = useLocation();
  const navigate = useNavigate();
  const isCollapsed = state === "collapsed";

  const [trialDays, setTrialDays] = useState<number | null>(null);
  const [loadingTrial, setLoadingTrial] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [subscribed, setSubscribed] = useState<boolean | null>(null);
  const [subscriptionDays, setSubscriptionDays] = useState<number | null>(null);
  const [planName, setPlanName] = useState<string | null>(null);
  const [isTrialExpired, setIsTrialExpired] = useState(false);

  useEffect(() => {
    let mounted = true;
    let pollInterval: NodeJS.Timeout | null = null;
    
    const updateTrialData = async () => {
      if (!mounted) return;
      setLoadingTrial(true);
      try {
        const { data: { user } } = await supabase.auth.getUser();

        if (user) {
          // Role admin
          const { data: roles } = await supabase
            .from("user_roles")
            .select("role")
            .eq("user_id", user.id);

          const admin = (roles || []).some((r) => r.role === "admin");
          if (mounted) setIsAdmin(admin);

          if (admin) {
            if (mounted) setTrialDays(null);
            return;
          }

          // Checar subscriber via RLS
          const { data } = await supabase
            .from("subscribers")
            .select("trial_end, subscription_end, subscribed, subscription_tier, additional_trial_days")
            .or(`user_id.eq.${user.id},email.eq.${user.email}`)
            .order("updated_at", { ascending: false })
            .limit(1)
            .maybeSingle();

          if (mounted) {
            const now = Date.now();
            const trialEnd = data?.trial_end ? new Date(data.trial_end).getTime() : null;
            const subEnd = data?.subscription_end ? new Date(data.subscription_end).getTime() : null;
            setSubscribed(!!data?.subscribed);
            setPlanName((data as any)?.subscription_tier || null);

            if (data?.subscribed && subEnd && subEnd > now) {
              // Plano ativo: calcular dias restantes baseado na subscription_end
              setSubscriptionDays(Math.ceil((subEnd - now) / (1000 * 60 * 60 * 24)));
              setTrialDays(null);
            } else if (trialEnd && trialEnd > now && !data?.subscribed) {
              // Trial ativo: calcular dias restantes do trial incluindo dias adicionais
              const additionalDays = (data as any)?.additional_trial_days || 0;
              const adjustedTrialEnd = trialEnd + (additionalDays * 24 * 60 * 60 * 1000);
              setTrialDays(Math.ceil((adjustedTrialEnd - now) / (1000 * 60 * 60 * 24)));
              setSubscriptionDays(null);
            } else {
              // Nem trial nem plano ativo - verificar se trial venceu
              const isExpired = !data?.subscribed && (!trialEnd || trialEnd <= now);
              setIsTrialExpired(isExpired);
              setTrialDays(null);
              setSubscriptionDays(null);
            }
          }
          return;
        }

        // Sem sessão supabase: usar monde_token e edge function
        const mondeToken = localStorage.getItem("monde_token");
        if (mondeToken) {
          try {
            const { data } = await supabase.functions.invoke("sync-subscriber", {
              body: { mondeToken },
            });
            const trialEnd = (data as any)?.trial_end as string | undefined;
            const isSubscribed = !!(data as any)?.subscribed;
            const subscriptionEnd = (data as any)?.subscription_end as string | undefined;

            if (mounted) {
              setSubscribed(isSubscribed);
              if (isSubscribed && subscriptionEnd) {
                const now = Date.now();
                const t = new Date(subscriptionEnd).getTime();
                setSubscriptionDays(Math.ceil((t - now) / (1000 * 60 * 60 * 24)));
                setTrialDays(null);
              } else if (trialEnd && !isSubscribed) {
                const now = Date.now();
                const t = new Date(trialEnd).getTime();
                setTrialDays(Math.ceil((t - now) / (1000 * 60 * 60 * 24)));
                setSubscriptionDays(null);
              } else {
                // Verificar se trial venceu via Monde token
                const isExpired = !isSubscribed && (!trialEnd || new Date(trialEnd).getTime() <= Date.now());
                setIsTrialExpired(isExpired);
                setTrialDays(null);
                setSubscriptionDays(null);
              }
            }
          } catch {
            if (mounted) setTrialDays(null);
          }
        } else {
          if (mounted) setTrialDays(null);
        }
      } finally {
        if (mounted) setLoadingTrial(false);
      }
    };

    // Initial load
    updateTrialData();

    // Listen for explicit subscription updates
    const subUpdatedHandler = () => { updateTrialData(); };
    window.addEventListener('subscription-updated', subUpdatedHandler);

    // Poll every 30 seconds for trial updates
    pollInterval = setInterval(updateTrialData, 30000);

    return () => {
      mounted = false;
      if (pollInterval) clearInterval(pollInterval);
      window.removeEventListener('subscription-updated', subUpdatedHandler);
    };
  }, [location.pathname, location.search]);

  const handleLogout = async () => {
    try {
      api.logout();
      await supabase.auth.signOut();
    } finally {
      navigate("/login");
    }
  };

  const handleSubscribe = async () => {
    const { data: sessionData } = await supabase.auth.getSession();
    let buyerEmail: string | undefined = sessionData.session?.user?.email || undefined;
    const mondeToken = localStorage.getItem("monde_token") || undefined;

    if (!buyerEmail && mondeToken) {
      try {
        const payload = JSON.parse(atob((mondeToken.split(".")[1] || "")));
        if (payload?.email) buyerEmail = String(payload.email);
      } catch {}
    }

    const { data, error } = await supabase.functions.invoke("create-checkout", {
      body: { quantity: 1, monde_token: mondeToken, buyer_email: buyerEmail },
    });

    if (!error && (data as any)?.url) {
      window.location.href = (data as any).url as string;
    }
  };

  const items = isAdmin ? adminNavigationItems : navigationItems;
  const fullPath = `${location.pathname}${location.search || ""}`;

  return (
    <Sidebar
      collapsible="icon"
      className="border-r border-border bg-white dark:bg-background"
      style={{ width: isCollapsed ? "64px" : "280px" }}
    >
      {/* Trigger moved to global header to avoid duplicates */}
      <SidebarHeader className="p-4 border-b border-border bg-white dark:bg-background">
        <div className="flex items-center justify-between h-8">
          <div className="relative flex-1 h-9">
            {/* Light - logo completa */}
            <img
              src="/lovable-uploads/f6f14c3e-3352-4ebc-b005-0df0af815c32.png"
              alt="Keeptur"
              className={`absolute left-0 top-0 h-9 max-w-[140px] object-contain transition-opacity duration-150 ${
                isCollapsed ? "opacity-0" : "opacity-100"
              } block dark:hidden`}
            />
            {/* Dark - logo completa */}
            <img
              src="/lovable-uploads/d37f41bb-b855-4d9b-a4bc-2df94828278a.png"
              alt="Keeptur"
              className={`absolute left-0 top-0 h-9 max-w-[140px] object-contain transition-opacity duration-150 ${
                isCollapsed ? "opacity-0" : "opacity-100"
              } hidden dark:block`}
            />
            {/* Light - ícone colapsado */}
            <img
              src="/lovable-uploads/08d4b994-f038-489c-803a-76276e221ba2.png"
              alt="Keeptur"
              className={`absolute left-0 top-0 w-8 h-8 object-contain transition-opacity duration-150 ${
                isCollapsed ? "opacity-100" : "opacity-0"
              } block dark:hidden`}
            />
            {/* Dark - ícone colapsado */}
            <img
              src="/lovable-uploads/08d4b994-f038-489c-803a-76276e221ba2.png"
              alt="Keeptur"
              className={`absolute left-0 top-0 w-8 h-8 object-contain transition-opacity duration-150 ${
                isCollapsed ? "opacity-100" : "opacity-0"
              } hidden dark:block`}
            />
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent className="px-2 py-4 bg-white dark:bg-background">
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => {
                 const isActive =
                   fullPath === item.url ||
                   (item.url.startsWith("/admin") &&
                     location.pathname === "/admin" &&
                     (item.url.split("?")[1] || "").split("&").every((kv) => location.search.includes(kv)));

                const isBlocked = isTrialExpired && !isAdmin && (item.url === "/" || item.url === "/people");
                const isSubscriptionPage = item.url === "/subscription";

                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive}
                      tooltip={item.title}
                      disabled={isBlocked}
                      className={`${isCollapsed ? "justify-center px-2" : ""} ${
                        isBlocked ? "opacity-50 cursor-not-allowed" : ""
                      } ${
                        isTrialExpired && !isAdmin && isSubscriptionPage 
                          ? "bg-destructive/10 border border-destructive/20" 
                          : ""
                      }`}
                    >
                      <NavLink
                        to={item.url}
                        className={`flex items-center ${
                          isCollapsed ? "justify-center" : "space-x-3"
                        } ${
                          isBlocked ? "pointer-events-none text-muted-foreground" : "text-foreground hover:text-foreground"
                        } ${
                          isTrialExpired && !isAdmin && isSubscriptionPage ? "text-destructive font-medium" : ""
                        }`}
                      >
                        <item.icon className={`h-4 w-4 ${isCollapsed ? "mx-auto" : ""}`} />
                        {!isCollapsed && (
                          <div className="flex items-center gap-2">
                            <span>{item.title}</span>
                            {isTrialExpired && !isAdmin && isSubscriptionPage && (
                              <Badge variant="destructive" className="text-xs">
                                Renovar
                              </Badge>
                            )}
                          </div>
                        )}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      {/* Footer: trial + sair */}
      <div className="mt-auto p-3 border-t border-border">
        {isAdmin ? (
          <div className={isCollapsed ? "px-1 mb-2" : "mb-3"}>
            <div className="rounded-lg border border-green-300 bg-green-50 p-2">
              <div className={isCollapsed ? "flex justify-center" : "flex items-center justify-between gap-2"}>
                {!isCollapsed && (
                  <div>
                    <div className="text-sm font-medium text-green-700">Status Vitalício</div>
                    <div className="text-xs text-green-600">Acesso ilimitado</div>
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : isTrialExpired ? (
          <div className={isCollapsed ? "px-1 mb-2" : "mb-3"}>
            <div className="rounded-lg border border-red-300 bg-red-50 p-2">
              <div className={isCollapsed ? "flex justify-center" : "flex items-center justify-between gap-2"}>
                {!isCollapsed && (
                  <div>
                    <div className="text-sm font-medium text-red-700">Trial Vencido</div>
                    <div className="text-xs text-red-600">Renovar para continuar</div>
                  </div>
                )}
                <NavLink
                  to="/subscription"
                  className="px-2 py-1 text-xs rounded-button bg-red-600 text-white hover:bg-red-700 inline-block text-center no-underline"
                >
                  Renovar Agora
                </NavLink>
              </div>
            </div>
          </div>
        ) : (trialDays !== null && trialDays > 0) || (subscriptionDays !== null && subscriptionDays >= 0) ? (
          <div className={isCollapsed ? "px-1 mb-2" : "mb-3"}>
            <div className="rounded-lg border border-primary/30 bg-primary/10 p-2">
              <div className={isCollapsed ? "flex justify-center" : "flex items-center justify-between gap-2"}>
                {!isCollapsed && (
                  <div>
                    <div className="text-sm font-medium">
                      {subscribed ? `Plano ${planName || ''}`.trim() : 'Período de Trial'}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {loadingTrial
                        ? 'Carregando…'
                        : subscribed && subscriptionDays !== null
                          ? `${subscriptionDays} dias restantes`
                          : `${trialDays ?? 0} dias restantes`}
                    </div>
                  </div>
                )}
                {!subscribed && (
                  <NavLink
                    to="/subscription"
                    className="px-2 py-1 text-xs rounded-button bg-primary text-primary-foreground hover:opacity-90 inline-block text-center no-underline"
                  >
                    Assinar agora
                  </NavLink>
                )}
              </div>
            </div>
          </div>
        ) : null}

        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              tooltip="Sair"
              className={`text-destructive hover:text-destructive hover:bg-destructive/10 ${
                isCollapsed ? "justify-center px-2" : ""
              }`}
            >
              <button
                onClick={handleLogout}
                className={`flex items-center w-full ${isCollapsed ? "justify-center" : "space-x-3"}`}
              >
                <LogOut className={`h-4 w-4 ${isCollapsed ? "mx-auto" : ""}`} />
                {!isCollapsed && <span>Sair</span>}
              </button>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </div>
      
      {/* Rail for resizing */}
      <SidebarRail />
    </Sidebar>
  );
}
