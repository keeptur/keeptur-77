import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Clock, FileText, AlertCircle, MessageSquare, Settings } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { TaskHistoric } from "@/types/api";
import { useTaskHistorics } from "@/hooks/useTaskHistorics";

// Grouped historic entry type
interface GroupedHistoric {
  dateTime: string;
  user: string;
  userTexts: string[];
  systemChanges: string[];
  statusChanges: Array<{ oldStatus?: string; newStatus?: string }>;
  descriptions: string[];
}

interface TaskHistoricDisplayProps {
  taskId: string;
}

export function TaskHistoricDisplay({ taskId }: TaskHistoricDisplayProps) {
  const { data: historics = [], isLoading } = useTaskHistorics(taskId);

  // Group historics by same minute
  const groupHistoricsByTime = (historics: TaskHistoric[]): GroupedHistoric[] => {
    const groups: { [key: string]: GroupedHistoric } = {};
    
    historics.forEach(historic => {
      const dateTime = historic.attributes["date-time"] || historic.attributes["created-at"];
      if (!dateTime) return;
      
      // Group by date and hour:minute (ignore seconds)
      const date = new Date(dateTime);
      const groupKey = format(date, "yyyy-MM-dd HH:mm", { locale: ptBR });
      
      if (!groups[groupKey]) {
        // Extract user name from description
        const userName = historic.attributes.description?.match(/por (.+?):/)?.[1] || 
                        historic.attributes.description?.match(/^(.+?) -/)?.[1] ||
                        "Sistema";
        
        groups[groupKey] = {
          dateTime: dateTime,
          user: userName,
          userTexts: [],
          systemChanges: [],
          statusChanges: [],
          descriptions: []
        };
      }
      
      // Categorize the historic entry
      if (historic.attributes.text) {
        groups[groupKey].userTexts.push(historic.attributes.text);
      } else if (historic.attributes.historic) {
        groups[groupKey].systemChanges.push(historic.attributes.historic);
      } else if (historic.attributes["old-status"] && historic.attributes["new-status"]) {
        groups[groupKey].statusChanges.push({
          oldStatus: historic.attributes["old-status"],
          newStatus: historic.attributes["new-status"]
        });
      } else if (historic.attributes.description) {
        groups[groupKey].descriptions.push(historic.attributes.description);
      }
    });
    
    // Convert to array and sort by date (most recent first)
    return Object.values(groups).sort((a, b) => 
      new Date(b.dateTime).getTime() - new Date(a.dateTime).getTime()
    );
  };

  const getStatusBadgeVariant = (newStatus: string) => {
    if (newStatus === "completed") return "default";
    if (newStatus === "cancelled") return "destructive";
    return "secondary";
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Histórico da Tarefa</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-start gap-3">
                <Skeleton className="h-4 w-4 rounded-full mt-1" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-3 w-24" />
                  <Skeleton className="h-4 w-full" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (historics.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Histórico da Tarefa</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6 text-muted-foreground">
            <Clock className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">Nenhum histórico encontrado</p>
          </div>
        </CardContent>
      </Card>
    );
  }


  // Get grouped historics
  const groupedHistorics = groupHistoricsByTime(historics);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm flex items-center gap-2">
          <Clock className="h-4 w-4" />
          Histórico da Tarefa ({historics.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-64">
          <div className="space-y-4">
            {groupedHistorics.map((group, index) => (
              <div key={index} className="p-3 rounded-lg border bg-muted/50">
                {/* Group Header */}
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">{group.user}</span>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {format(new Date(group.dateTime), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                  </span>
                </div>

                {/* Group Content */}
                <div className="space-y-2">
                  {/* User Text Messages */}
                  {group.userTexts.map((text, textIndex) => (
                    <div key={textIndex} className="flex items-start gap-2">
                      <MessageSquare className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
                      <p className="text-sm text-foreground font-medium bg-blue-50 dark:bg-blue-950/50 p-2 rounded border-l-4 border-blue-400 flex-1">
                        {text}
                      </p>
                    </div>
                  ))}

                  {/* Status Changes */}
                  {group.statusChanges.map((statusChange, statusIndex) => (
                    <div key={statusIndex} className="flex items-start gap-2">
                      <AlertCircle className="h-4 w-4 text-warning mt-0.5 flex-shrink-0" />
                      <div className="flex items-center gap-2">
                        <Badge variant={getStatusBadgeVariant(statusChange.newStatus || "")} className="text-xs">
                          {statusChange.oldStatus} → {statusChange.newStatus}
                        </Badge>
                      </div>
                    </div>
                  ))}

                  {/* System Changes */}
                  {group.systemChanges.map((change, changeIndex) => (
                    <div key={changeIndex} className="flex items-start gap-2">
                      <Settings className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                      <p className="text-sm text-muted-foreground bg-gray-50 dark:bg-gray-800/50 p-2 rounded border-l-4 border-gray-400 flex-1">
                        {change}
                      </p>
                    </div>
                  ))}

                  {/* Descriptions (fallback) */}
                  {group.descriptions.map((description, descIndex) => (
                    <div key={descIndex} className="flex items-start gap-2">
                      <FileText className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                      <p className="text-sm text-muted-foreground flex-1">{description}</p>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}