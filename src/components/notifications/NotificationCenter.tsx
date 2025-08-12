import { useState, useEffect } from "react";
import { Bell, Check, X, AlertCircle, Info, CheckCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";

export interface Notification {
  id: string;
  type: "info" | "warning" | "success" | "error";
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
  actionUrl?: string;
  actionLabel?: string;
}

interface NotificationCenterProps {
  notifications?: Notification[];
  onMarkAsRead?: (id: string) => void;
  onMarkAllAsRead?: () => void;
  onDismiss?: (id: string) => void;
  className?: string;
}

const getNotificationIcon = (type: Notification["type"]) => {
  switch (type) {
    case "success":
      return <CheckCircle className="h-4 w-4 text-success" />;
    case "warning":
      return <AlertCircle className="h-4 w-4 text-warning" />;
    case "error":
      return <AlertCircle className="h-4 w-4 text-destructive" />;
    default:
      return <Info className="h-4 w-4 text-primary" />;
  }
};

const getNotificationBadgeVariant = (type: Notification["type"]): "default" | "secondary" | "destructive" | "outline" => {
  switch (type) {
    case "success":
      return "default";
    case "warning":
      return "secondary";
    case "error":
      return "destructive";
    default:
      return "outline";
  }
};

// Dados mock para demonstração
const mockNotifications: Notification[] = [
  {
    id: "1",
    type: "info",
    title: "Nova tarefa atribuída",
    message: "Você recebeu uma nova tarefa: 'Revisar documentação do projeto'",
    timestamp: new Date(Date.now() - 2 * 60 * 1000),
    read: false,
    actionUrl: "/tasks",
    actionLabel: "Ver tarefa"
  },
  {
    id: "2", 
    type: "warning",
    title: "Tarefa próxima do vencimento",
    message: "A tarefa 'Preparar apresentação' vence em 2 horas",
    timestamp: new Date(Date.now() - 30 * 60 * 1000),
    read: false,
    actionUrl: "/tasks",
    actionLabel: "Ver tarefa"
  },
  {
    id: "3",
    type: "success",
    title: "Backup concluído",
    message: "O backup automático do sistema foi concluído com sucesso",
    timestamp: new Date(Date.now() - 3 * 60 * 60 * 1000),
    read: true
  },
  {
    id: "4",
    type: "info",
    title: "Relatório mensal disponível",
    message: "O relatório de atividades de janeiro está disponível para visualização",
    timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000),
    read: true,
    actionUrl: "/reports",
    actionLabel: "Ver relatório"
  }
];

export function NotificationCenter({ 
  notifications = mockNotifications,
  onMarkAsRead,
  onMarkAllAsRead,
  onDismiss,
  className 
}: NotificationCenterProps) {
  const [localNotifications, setLocalNotifications] = useState<Notification[]>(notifications);

  useEffect(() => {
    setLocalNotifications(notifications);
  }, [notifications]);

  const unreadCount = localNotifications.filter(n => !n.read).length;

  const handleMarkAsRead = (id: string) => {
    setLocalNotifications(prev => 
      prev.map(n => n.id === id ? { ...n, read: true } : n)
    );
    onMarkAsRead?.(id);
  };

  const handleMarkAllAsRead = () => {
    setLocalNotifications(prev => 
      prev.map(n => ({ ...n, read: true }))
    );
    onMarkAllAsRead?.();
  };

  const handleDismiss = (id: string) => {
    setLocalNotifications(prev => 
      prev.filter(n => n.id !== id)
    );
    onDismiss?.(id);
  };

  const sortedNotifications = [...localNotifications].sort((a, b) => 
    b.timestamp.getTime() - a.timestamp.getTime()
  );

  return (
    <Card className={cn("w-full max-w-md", className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Notificações
            {unreadCount > 0 && (
              <Badge variant="destructive" className="ml-2">
                {unreadCount}
              </Badge>
            )}
          </CardTitle>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleMarkAllAsRead}
              className="text-xs"
            >
              Marcar todas como lidas
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent className="p-0">
        <ScrollArea className="max-h-96">
          {sortedNotifications.length === 0 ? (
            <div className="p-6 text-center text-muted-foreground">
              <Bell className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">Nenhuma notificação</p>
            </div>
          ) : (
            <div className="space-y-0">
              {sortedNotifications.map((notification, index) => (
                <div key={notification.id}>
                  <div 
                    className={cn(
                      "p-4 hover:bg-muted/50 transition-colors",
                      !notification.read && "bg-muted/30"
                    )}
                  >
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5">
                        {getNotificationIcon(notification.type)}
                      </div>
                      
                      <div className="flex-1 min-w-0 space-y-1">
                        <div className="flex items-start justify-between gap-2">
                          <h4 className={cn(
                            "text-sm font-medium leading-tight",
                            !notification.read && "font-semibold"
                          )}>
                            {notification.title}
                          </h4>
                          
                          <div className="flex items-center gap-1">
                            {!notification.read && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6"
                                onClick={() => handleMarkAsRead(notification.id)}
                                title="Marcar como lida"
                              >
                                <Check className="h-3 w-3" />
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6"
                              onClick={() => handleDismiss(notification.id)}
                              title="Dispensar"
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                        
                        <p className="text-xs text-muted-foreground leading-relaxed">
                          {notification.message}
                        </p>
                        
                        <div className="flex items-center justify-between mt-2">
                          <span className="text-xs text-muted-foreground">
                            {format(notification.timestamp, "dd/MM 'às' HH:mm", { locale: ptBR })}
                          </span>
                          
                          <div className="flex items-center gap-2">
                            <Badge 
                              variant={getNotificationBadgeVariant(notification.type)} 
                              className="text-xs py-0 px-2"
                            >
                              {notification.type}
                            </Badge>
                            
                            {notification.actionUrl && notification.actionLabel && (
                              <Button
                                variant="outline"
                                size="sm"
                                className="text-xs h-6 px-2"
                                onClick={() => {
                                  // Navegar para URL
                                  console.log("Navigate to:", notification.actionUrl);
                                }}
                              >
                                {notification.actionLabel}
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  {index < sortedNotifications.length - 1 && <Separator />}
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}