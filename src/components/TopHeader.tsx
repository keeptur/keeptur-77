import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Bell, Moon, Sun, ChevronDown, User } from "lucide-react";
import { useTheme } from "@/providers/ThemeProvider";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { api } from "@/lib/api";
import { useNavigate } from "react-router-dom";
import { NotificationCenter } from "@/components/notifications/NotificationCenter";
import { UserProfile } from "@/components/shared/UserProfile";

export function TopHeader() {
  const { theme, setTheme } = useTheme();
  const navigate = useNavigate();

  // Buscar dados do usuário atual
  const { data: userProfile } = useQuery({
    queryKey: ["current-user"],
    queryFn: async () => {
      try {
        const response = await api.getCurrentUser();
        return response.data;
      } catch (error) {
        // Fallback para dados simulados
        return {
          name: "Usuário Système",
          email: "usuario@keeptur.com",
          avatar: "",
          initials: "US"
        };
      }
    },
    staleTime: 5 * 60 * 1000 // 5 minutos
  });

  const currentUser = userProfile || {
    name: "Usuário",
    email: "usuario@keeptur.com", 
    avatar: "",
    initials: "U"
  };

  const toggleTheme = () => {
    setTheme(theme === "dark" ? "light" : "dark");
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Bom dia";
    if (hour < 18) return "Boa tarde";
    return "Boa noite";
  };

  return (
    <div className="sticky top-0 z-40 bg-background/80 backdrop-blur-sm border-b border-border">
      <div className="flex h-16 items-center justify-between px-2 sm:px-6 lg:px-8">
        <div className="flex items-center gap-2">
          <SidebarTrigger />
          <div className="hidden sm:block">
            <h2 className="text-lg font-semibold text-foreground leading-tight">
              {getGreeting()}, {currentUser.name}!
            </h2>
            <p className="text-sm text-muted-foreground leading-tight">
              KEEPTUR - Sistema Integrado ao Monde
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Theme Toggle */}
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleTheme}
            className="w-9 h-9"
          >
            <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
            <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
            <span className="sr-only">Alternar tema</span>
          </Button>

          {/* Notifications - Usar novo centro de notificações */}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="icon" className="relative w-9 h-9">
                <Bell className="h-4 w-4" />
                <Badge 
                  variant="destructive" 
                  className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs"
                >
                  2
                </Badge>
                <span className="sr-only">Notificações</span>
              </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-80 p-0">
              <NotificationCenter />
            </PopoverContent>
          </Popover>

          {/* User Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="flex items-center gap-2 h-9 px-2">
                <Avatar className="h-7 w-7">
                  <AvatarImage src={currentUser.avatar} alt={currentUser.name} />
                  <AvatarFallback className="text-xs">{currentUser.initials}</AvatarFallback>
                </Avatar>
                <span className="hidden sm:inline text-sm font-medium">
                  {currentUser.name}
                </span>
                <ChevronDown className="h-3 w-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium">{currentUser.name}</p>
                  <p className="text-xs text-muted-foreground">{currentUser.email}</p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => navigate("/profile")}>
                <User className="mr-2 h-4 w-4" />
                Perfil
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate("/settings")}>
                <User className="mr-2 h-4 w-4" />
                Configurações
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                onClick={() => {
                  // Limpar token de autenticação
                  localStorage.removeItem('monde_token');
                  localStorage.removeItem('keeptur-theme');
                  // Forçar reload para limpar todos os estados
                  window.location.href = '/login';
                }}
                className="text-destructive"
              >
                Sair
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </div>
  );
}