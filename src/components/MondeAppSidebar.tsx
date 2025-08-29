import { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { useTheme } from "@/providers/ThemeProvider";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import {
  Home,
  Calendar,
  Users,
  Settings,
  BarChart3,
  CreditCard,
  Clock,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

function SubscriptionStatus() {
  const [subscriptionData, setSubscriptionData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    
    const fetchSubscriptionData = async () => {
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        const mondeToken = localStorage.getItem('monde_token');
        
        // Get email from session or monde token
        let email = sessionData.session?.user?.email;
        if (!email && mondeToken) {
          try {
            const payload = JSON.parse(atob((mondeToken.split('.')[1] || '')));
            email = payload?.email;
          } catch {}
        }

        if (!email) {
          if (mounted) setLoading(false);
          return;
        }

        // Get subscription data using get-subscription-data function
        const { data, error } = await supabase.functions.invoke('get-subscription-data', {
          body: { email, monde_token: mondeToken }
        });

        if (mounted && data) {
          setSubscriptionData(data);
        }
      } catch (error) {
        console.error("Error fetching subscription data:", error);
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    fetchSubscriptionData();
    
    // Poll every 30 seconds for updates
    const interval = setInterval(fetchSubscriptionData, 30000);
    
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);

  if (loading || !subscriptionData) return null;

  const { subscribed, trial_active, days_remaining, current_plan, subscription_tier } = subscriptionData;

  return (
    <div className="px-3 pb-3">
      <div className={`rounded-lg p-3 border ${
        subscribed 
          ? 'bg-green-500/10 border-green-500/20' 
          : trial_active 
            ? 'bg-primary/10 border-primary/20'
            : 'bg-muted border-border'
      }`}>
        <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
          <Clock className="w-3 h-3" />
          {subscribed ? 'Assinatura' : trial_active ? 'Trial' : 'Inativo'}
        </div>
        <div className="text-sm font-medium">
          {subscribed ? (
            <>
              <div>{current_plan?.name || subscription_tier}</div>
              <div className="text-xs text-muted-foreground">
                {days_remaining} dias restantes
              </div>
            </>
          ) : trial_active ? (
            <>
              {days_remaining} dia{days_remaining === 1 ? '' : 's'} restante{days_remaining === 1 ? '' : 's'}
            </>
          ) : (
            <span className="text-xs">Escolha um plano</span>
          )}
        </div>
      </div>
    </div>
  );
}

const items = [
  {
    title: "Dashboard",
    url: "/",
    icon: Home,
  },
  {
    title: "Tarefas",
    url: "/tasks",
    icon: Calendar,
  },
  {
    title: "Pessoas",
    url: "/people",
    icon: Users,
  },
  {
    title: "Planos",
    url: "/plans",
    icon: CreditCard,
  },
];

const adminItems = [
  {
    title: "Usuários",
    url: "/admin?t=users",
    icon: Users,
  },
  {
    title: "Planos",
    url: "/admin?t=plans",
    icon: CreditCard,
  },
  {
    title: "E-mails",
    url: "/admin?t=emails",
    icon: Settings,
  },
  {
    title: "Logs",
    url: "/admin?t=logs",
    icon: BarChart3,
  },
];

export function MondeAppSidebar() {
  const location = useLocation();
  const { theme } = useTheme();
  const { state } = useSidebar();
  const isCollapsed = state === "collapsed";
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkAdminStatus = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: roles } = await supabase
            .from("user_roles")
            .select("role")
            .eq("user_id", user.id);
          
          const userIsAdmin = roles?.some((r) => r.role === "admin") || false;
          setIsAdmin(userIsAdmin);
        }
      } catch (error) {
        console.error("Error checking admin status:", error);
      } finally {
        setIsLoading(false);
      }
    };

    checkAdminStatus();
  }, []);

  const fullPath = `${location.pathname}${location.search || ""}`;

  return (
    <Sidebar
      collapsible="icon"
      className="border-r border-border bg-background"
      style={{ width: isCollapsed ? "64px" : "280px" }}
    >
      {/* Always visible trigger with high z-index when collapsed */}
      <SidebarTrigger 
        className={`fixed top-4 left-2 z-[10000] ${
          isCollapsed ? 'block' : 'hidden'
        } bg-background border border-border shadow-md hover:bg-accent pointer-events-auto`}
      />
      <SidebarHeader className="p-4 border-b border-border bg-background">
        {/* Show subscription status for all users */}
        <SubscriptionStatus />
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

      <SidebarContent className="px-2 py-4 bg-background">
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => {
                const isActive =
                  fullPath === item.url ||
                  // Admin: pathname é /admin e o query define a aba
                  (item.url.startsWith("/admin") &&
                    location.pathname === "/admin" &&
                    (item.url.split("?")[1] || "").split("&").every((kv) => location.search.includes(kv)));

                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive}
                      tooltip={item.title}
                      className="transition-colors"
                    >
                      <a href={item.url}>
                        <item.icon className="w-4 h-4" />
                        <span>{item.title}</span>
                      </a>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {!isLoading && isAdmin && (
          <SidebarGroup>
            <SidebarGroupLabel>Administração</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {adminItems.map((item) => {
                  const isActive =
                    fullPath === item.url ||
                    (item.url.startsWith("/admin") &&
                      location.pathname === "/admin" &&
                      (item.url.split("?")[1] || "").split("&").every((kv) => location.search.includes(kv)));

                  return (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton
                        asChild
                        isActive={isActive}
                        tooltip={item.title}
                        className="transition-colors"
                      >
                        <a href={item.url}>
                          <item.icon className="w-4 h-4" />
                          <span>{item.title}</span>
                        </a>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>
    </Sidebar>
  );
}