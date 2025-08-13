import { useState, useEffect } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarHeader, SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarTrigger, useSidebar } from "@/components/ui/sidebar";
import { LayoutDashboard, Users, FileText, Settings, LogOut, ChevronLeft, ChevronRight, CreditCard, Mail, Package } from "lucide-react";
import { api } from "@/lib/api";
import { supabase } from "@/integrations/supabase/client";
const navigationItems = [{
  title: "Dashboard",
  url: "/",
  icon: LayoutDashboard
}, {
  title: "Pessoas",
  url: "/people",
  icon: Users
}];

const adminNavigationItems = [
  { title: "Dashboard", url: "/admin?t=dashboard", icon: LayoutDashboard },
  { title: "Usuários", url: "/admin?t=users", icon: Users },
  { title: "Planos", url: "/admin?t=plans", icon: Package },
  { title: "Assinatura", url: "/admin?t=billing", icon: CreditCard },
  { title: "Configurações", url: "/admin?t=settings", icon: Settings },
  { title: "E-mails", url: "/admin?t=emails", icon: Mail },
  { title: "Logs", url: "/admin?t=logs", icon: FileText },
];
export function MondeAppSidebar() {
  const { state } = useSidebar();
  const location = useLocation();
  const navigate = useNavigate();
  const isCollapsed = state === "collapsed";

  const [trialDays, setTrialDays] = useState<number | null>(null);
  const [loadingTrial, setLoadingTrial] = useState(false);

  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoadingTrial(true);
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { setTrialDays(null); return; }

        const { data } = await supabase
          .from('subscribers')
          .select('trial_end, subscription_end, subscribed')
          .or(`user_id.eq.${user.id},email.eq.${user.email}`)
          .order('updated_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (mounted && data?.trial_end && !data?.subscribed) {
          const now = Date.now();
          const t = new Date(data.trial_end).getTime();
          const days = Math.ceil((t - now) / (1000*60*60*24));
          setTrialDays(days);
        } else if (mounted) {
          setTrialDays(null);
        }
      } finally {
        mounted && setLoadingTrial(false);
      }
    })();
    return () => { mounted = false; };
  }, [location.pathname]);

  const handleLogout = () => {
    api.logout();
    navigate("/login");
  };

  const handleSubscribe = async () => {
    const { data, error } = await supabase.functions.invoke('create-checkout', { body: { quantity: 1 } });
    if (!error && (data as any)?.url) {
      window.location.href = (data as any).url as string;
    }
  };
  return <Sidebar collapsible="icon" className="border-r border-border bg-background" style={{
    width: isCollapsed ? '64px' : '280px'
  }}>
      <SidebarHeader className="p-4 border-b border-border">
        <div className="flex items-center justify-between h-8">
<div className="relative flex-1 h-9">
            {/* Light mode - full logo */}
            <img
              src="/lovable-uploads/f6f14c3e-3352-4ebc-b005-0df0af815c32.png"
              alt="Keeptur"
              className={`absolute left-0 top-0 h-9 max-w-[140px] object-contain transition-opacity duration-150 ${isCollapsed ? 'opacity-0' : 'opacity-100'} block dark:hidden`}
            />
            {/* Dark mode - full logo */}
            <img
              src="/lovable-uploads/d37f41bb-b855-4d9b-a4bc-2df94828278a.png"
              alt="Keeptur"
              className={`absolute left-0 top-0 h-9 max-w-[140px] object-contain transition-opacity duration-150 ${isCollapsed ? 'opacity-0' : 'opacity-100'} hidden dark:block`}
            />
            {/* Light mode - collapsed icon */}
            <img
              src="/lovable-uploads/08d4b994-f038-489c-803a-76276e221ba2.png"
              alt="Keeptur"
              className={`absolute left-0 top-0 w-8 h-8 object-contain transition-opacity duration-150 ${isCollapsed ? 'opacity-100' : 'opacity-0'} block dark:hidden`}
            />
            {/* Dark mode - collapsed icon */}
            <img
              src="/lovable-uploads/08d4b994-f038-489c-803a-76276e221ba2.png"
              alt="Keeptur"
              className={`absolute left-0 top-0 w-8 h-8 object-contain transition-opacity duration-150 ${isCollapsed ? 'opacity-100' : 'opacity-0'} hidden dark:block`}
            />
          </div>
          {!isCollapsed && (
            <SidebarTrigger className="h-6 w-6 ml-2">
              <ChevronLeft className="h-4 w-4" />
            </SidebarTrigger>
          )}
        </div>
      </SidebarHeader>
      
      <SidebarContent className="px-2 py-4">
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {(location.pathname.startsWith("/admin") ? adminNavigationItems : navigationItems).map(item => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild isActive={location.pathname === item.url} tooltip={item.title} className={isCollapsed ? "justify-center px-2" : ""}>
                    <NavLink to={item.url} className={`flex items-center text-foreground hover:text-foreground ${isCollapsed ? 'justify-center' : 'space-x-3'}`}>
                      <item.icon className={`h-4 w-4 ${isCollapsed ? 'mx-auto' : ''}`} />
                      {!isCollapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      {/* Footer with logout */}
      <div className="mt-auto p-3 border-t border-border">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild tooltip="Sair" className={`text-destructive hover:text-destructive hover:bg-destructive/10 ${isCollapsed ? "justify-center px-2" : ""}`}>
              <button onClick={handleLogout} className={`flex items-center w-full ${isCollapsed ? 'justify-center' : 'space-x-3'}`}>
                <LogOut className={`h-4 w-4 ${isCollapsed ? 'mx-auto' : ''}`} />
                {!isCollapsed && <span>Sair</span>}
              </button>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
        
        {isCollapsed && <div className="flex justify-center mt-2">
            <SidebarTrigger className="h-6 w-6">
              <ChevronRight className="h-4 w-4" />
            </SidebarTrigger>
          </div>}
      </div>
    </Sidebar>;
}