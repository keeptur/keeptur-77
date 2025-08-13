import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Moon, Sun, Bell, ChevronDown, X, Clock } from "lucide-react";
import { SidebarTrigger, useSidebar } from "@/components/ui/sidebar";
import { useTheme } from "next-themes";
import { useNavigate, useLocation } from "react-router-dom";
import { api } from "@/lib/api";
import { useTasks } from "@/hooks/useTasks";
import { isSameDay, parseISO } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

// Componente para mostrar status do trial no menu
function TrialStatus() {
  const [daysRemaining, setDaysRemaining] = useState<number | null>(null);
  const [subscribed, setSubscribed] = useState(false);

  useEffect(() => {
    let mounted = true;
    (async () => {
      console.log("TrialStatus: Loading trial/subscription status");
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user?.email) {
        console.log("TrialStatus: No user email found");
        return;
      }
      
      console.log("TrialStatus: User email:", user.email);
      
      // Buscar configurações dinâmicas
      const { data: settings } = await supabase
        .from('settings')
        .select('trial_days')
        .limit(1)
        .maybeSingle();
      
      console.log("TrialStatus: Settings:", settings);
      
      const { data } = await supabase
        .from('subscribers')
        .select('trial_end, subscribed, subscription_end, trial_start')
        .or(`user_id.eq.${user.id},email.eq.${user.email}`)
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      console.log("TrialStatus: Subscriber data:", data);

      if (mounted && data) {
        const isSubscribed = data.subscribed || (data.subscription_end && new Date(data.subscription_end) > new Date());
        setSubscribed(isSubscribed);
        
        console.log("TrialStatus: Is subscribed:", isSubscribed);
        
        if (isSubscribed) {
          // Mostrar quando termina a assinatura se estiver ativo
          if (data.subscription_end) {
            const now = Date.now();
            const subEnd = new Date(data.subscription_end).getTime();
            const daysLeft = Math.max(0, Math.ceil((subEnd - now) / (1000 * 60 * 60 * 24)));
            console.log("TrialStatus: Subscription days left:", daysLeft);
            setDaysRemaining(daysLeft);
          }
        } else if (data.trial_end) {
          // Mostrar trial restante baseado em trial_end
          const now = Date.now();
          const t = new Date(data.trial_end).getTime();
          const calculatedDays = Math.max(0, Math.ceil((t - now) / (1000 * 60 * 60 * 24)));
          console.log("TrialStatus: Trial days calculated from trial_end:", calculatedDays);
          setDaysRemaining(calculatedDays);
        } else if (data.trial_start && settings?.trial_days) {
          // Fallback: calcular baseado em trial_start + configuração dinâmica
          const trialStart = new Date(data.trial_start);
          const trialEnd = new Date(trialStart);
          trialEnd.setDate(trialEnd.getDate() + settings.trial_days);
          
          const now = Date.now();
          const calculatedDays = Math.max(0, Math.ceil((trialEnd.getTime() - now) / (1000 * 60 * 60 * 24)));
          console.log("TrialStatus: Trial days calculated from start + config:", calculatedDays);
          setDaysRemaining(calculatedDays);
        } else {
          console.log("TrialStatus: No trial data available");
          setDaysRemaining(null);
        }
      }
    })();
    return () => { mounted = false; };
  }, []);

  if (daysRemaining === null) return null;

  return (
    <div className="px-4 py-3 border-b border-border">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Clock className="w-3 h-3" />
        {subscribed ? 'Assinatura' : 'Trial'}
      </div>
      <div className="text-sm font-medium">
        {daysRemaining} dia{daysRemaining === 1 ? '' : 's'} restante{daysRemaining === 1 ? '' : 's'}
      </div>
    </div>
  );
}

export function MondeHeader() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const { theme, setTheme } = useTheme();
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const toggleTheme = () => setTheme(theme === "dark" ? "light" : "dark");
  const handleLogout = async () => {
    try {
      api.logout();
      await supabase.auth.signOut();
      localStorage.removeItem('monde_token');
    } finally {
      // Forçar reload para limpar qualquer estado em memória
      window.location.href = "/login";
    }
  };

  // Check admin role (Supabase)
  const [isAdmin, setIsAdmin] = useState(false);
  const [userName, setUserName] = useState<string>("...");
  const [userRole, setUserRole] = useState<string>("Usuário");
  const [avatarUrl, setAvatarUrl] = useState<string>("");

  // Função para recarregar dados do usuário
  const reloadUserData = async () => {
    console.log("MondeHeader: Starting reloadUserData");
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      console.log("MondeHeader: No user found");
      return;
    }
    
    console.log("MondeHeader: User ID:", user.id);
    console.log("MondeHeader: User email:", user.email);

    // Verificar se é admin primeiro
    const { data: roles } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id);
    
    console.log("MondeHeader: User roles:", roles);
    
    const userIsAdmin = roles?.some(r => r.role === 'admin') || false;
    setIsAdmin(userIsAdmin);
    setUserRole(userIsAdmin ? 'Admin' : 'Usuário');
    
    console.log("MondeHeader: User is admin:", userIsAdmin);

    // Primeiro, sempre tenta pegar o profile do Supabase
    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name, email, avatar_url')
      .eq('id', user.id)
      .maybeSingle();

    console.log("MondeHeader: Supabase profile:", profile);

    if (userIsAdmin) {
      // Para admin, usar dados do Supabase
      if (profile) {
        const adminName = profile.full_name || profile.email || 'Usuário';
        console.log("MondeHeader: Setting admin name:", adminName);
        setUserName(adminName);
        setAvatarUrl(profile.avatar_url || '');
      }
    } else {
      // Para usuário não-admin, priorizar nome da API do Monde
      try {
        console.log("MondeHeader: Trying to get data from Monde API");
        console.log("MondeHeader: API authenticated:", api.isAuthenticated());
        
        const currentUser = await api.getCurrentUser();
        console.log("MondeHeader: getCurrentUser response:", currentUser);
        
        if (currentUser && currentUser.data && currentUser.data.attributes) {
          const attrs = currentUser.data.attributes;
          const mondeName = attrs.name || attrs.login;
          console.log("MondeHeader: Monde name found:", mondeName);
          
          // Usar nome do Monde se existir, senão usar Supabase
          const finalName = mondeName || profile?.full_name || profile?.email || user.email || 'Usuário';
          console.log("MondeHeader: Setting final name:", finalName);
          setUserName(finalName);
          setAvatarUrl(profile?.avatar_url || ''); // Avatar sempre do Supabase
        } else {
          throw new Error("Invalid API response structure");
        }
      } catch (error) {
        console.error("MondeHeader: Error getting data from Monde API:", error);
        console.log("MondeHeader: Fallback to Supabase profile for non-admin user");
        
        // Fallback para profile do Supabase se API do Monde falhar
        if (profile) {
          const fallbackName = profile.full_name || profile.email || user.email || 'Usuário';
          console.log("MondeHeader: Setting fallback name:", fallbackName);
          setUserName(fallbackName);
          setAvatarUrl(profile.avatar_url || '');
        } else {
          console.log("MondeHeader: No profile data available, using email");
          setUserName(user.email || 'Usuário');
        }
      }
    }
  };

  useEffect(() => {
    let mounted = true;
    
    // Event listener para recarregar dados quando o perfil for atualizado
    const handleProfileUpdate = () => {
      if (mounted) {
        reloadUserData();
      }
    };
    
    window.addEventListener('profile-updated', handleProfileUpdate);
    
    // Carregar dados iniciais
    reloadUserData();
    
    return () => { 
      mounted = false; 
      window.removeEventListener('profile-updated', handleProfileUpdate);
    };
  }, []);


  const initials = useMemo(() => {
    const parts = (userName || "").split(" ").filter(Boolean);
    const first = parts[0]?.[0] || "U";
    const last = parts.length > 1 ? parts[parts.length - 1][0] : "";
    return (first + last).toUpperCase();
  }, [userName]);

  // Notificações reais a partir das tarefas
  const { tasks, tasksByStatus } = useTasks();
  const today = new Date();
  const pendingToday = useMemo(() => {
    return tasks.filter(t => {
      const attrs: any = t.attributes;
      if (attrs.completed) return false;
      if (attrs.deleted || attrs["deleted-at"]) return false;
      if (!attrs.due) return false;
      const due = typeof attrs.due === "string" ? parseISO(attrs.due) : new Date(attrs.due);
      return isSameDay(due, today);
    }).length;
  }, [tasks]);
  const overdueCount = tasksByStatus?.overdue?.length || 0;

  // Dismiss por dia
  const dateKey = new Date().toISOString().slice(0,10);
  const [dismissed, setDismissed] = useState<Record<string, boolean>>(() => {
    try { return JSON.parse(localStorage.getItem(`notif-dismiss-${dateKey}`) || "{}"); } catch { return {}; }
  });
  useEffect(() => {
    localStorage.setItem(`notif-dismiss-${dateKey}`, JSON.stringify(dismissed));
  }, [dismissed, dateKey]);

  const notifItems = [
    { id: "pending-today", title: `Hoje você tem ${pendingToday} tarefas pendentes`, hidden: dismissed["pending-today"] || pendingToday === 0 },
    { id: "overdue", title: `Você possui ${overdueCount} tarefas atrasadas`, hidden: dismissed["overdue"] || overdueCount === 0 }
  ];
  const visibleNotif = notifItems.filter(n => !n.hidden);
  const badgeCount = visibleNotif.length;

  return (
    <header className="header flex items-center justify-between h-16 px-10 bg-card border-b border-border transition-all duration-300">
      <div className="flex items-center gap-2"><SidebarTrigger /></div>
      
      <div className="flex items-center space-x-4">
        {/* Theme Toggle */}
        <Button onClick={toggleTheme} variant="outline" size="sm" className="rounded-button">
          <div className="w-5 h-5 flex items-center justify-center">
            {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </div>
        </Button>

        {/* Notifications */}
        <div className="relative">
          <Button onClick={() => setNotifOpen(v => !v)} variant="outline" size="sm" className="rounded-button relative">
            <div className="w-5 h-5 flex items-center justify-center">
              <Bell className="w-4 h-4" />
            </div>
            {badgeCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-destructive text-destructive-foreground text-xs rounded-full flex items-center justify-center">
                {badgeCount}
              </span>
            )}
          </Button>
          {notifOpen && (
            <div className="absolute right-0 mt-2 w-80 bg-card border border-border rounded-lg shadow-lg py-2 z-50">
              {visibleNotif.length === 0 ? (
                <div className="px-4 py-3 text-sm text-muted-foreground">Sem notificações</div>
              ) : (
                visibleNotif.map(n => (
                  <div key={n.id} className="px-4 py-3 flex items-start justify-between gap-3 hover:bg-muted/50">
                    <button className="text-left text-sm flex-1" onClick={() => { navigate("/"); setNotifOpen(false); }}>
                      {n.title}
                    </button>
                    <button className="h-5 w-5 inline-flex items-center justify-center rounded hover:bg-muted/80" onClick={() => setDismissed(prev => ({ ...prev, [n.id]: true }))}>
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {/* User Menu */}
        <div className="relative">
          <Button onClick={() => setUserDropdownOpen(!userDropdownOpen)} variant="outline" className="group flex items-center space-x-3 p-1 rounded-button hover:bg-primary hover:text-primary-foreground">
            <Avatar className="h-8 w-8">
              <AvatarImage src={avatarUrl} alt={userName} />
              <AvatarFallback className="text-xs">{initials}</AvatarFallback>
            </Avatar>
            <div className="hidden md:block text-left">
              <p className="text-sm font-medium text-foreground group-hover:text-primary-foreground">{userName}</p>
              <p className="text-xs text-muted-foreground group-hover:text-primary-foreground/90">{userRole}</p>
            </div>
            <div className="w-4 h-4 flex items-center justify-center">
              <ChevronDown className="w-3 h-3" />
            </div>
          </Button>
          
            {userDropdownOpen && (
              <div className="absolute right-0 mt-2 w-64 bg-card border border-border rounded-lg shadow-lg py-1 z-50">
                {!isAdmin && (
                  <TrialStatus />
                )}
                {isAdmin && (
                  <button onClick={() => { navigate("/admin"); setUserDropdownOpen(false); }} className="block w-full text-left px-4 py-2 text-sm text-foreground hover:bg-muted">
                    Admin
                  </button>
                )}
                <button onClick={() => navigate("/profile")} className="block w-full text-left px-4 py-2 text-sm text-muted-foreground hover:bg-muted">
                  Meu Perfil
                </button>
                <div className="border-t border-border my-1"></div>
                <button onClick={handleLogout} className="block w-full text-left px-4 py-2 text-sm text-destructive hover:bg-muted">
                  Sair
                </button>
              </div>
            )}
        </div>
      </div>
    </header>
  );
}