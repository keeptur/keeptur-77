import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Task } from "@/types/api";
import { getTaskStatus, getStatusLabel, getStatusColor } from "@/utils/taskStatus";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { 
  Calendar, 
  Clock, 
  MoreHorizontal, 
  CheckCircle2, 
  Circle, 
  AlertTriangle, 
  FileText,
  User,
  Tag,
  Star
} from "lucide-react";
import { TaskAssigneeDisplay } from "./TaskAssigneeDisplay";

interface TaskListProps {
  tasks: Task[];
  onTaskClick: (task: Task) => void;
  onTaskMove: (taskId: string, completed: boolean) => Promise<void>;
}

export function TaskList({ tasks, onTaskClick, onTaskMove }: TaskListProps) {
  const getStatusIcon = (task: Task) => {
    const status = getTaskStatus(task);
    switch (status) {
      case "completed":
        return <CheckCircle2 className="h-4 w-4 text-green-600" />;
      case "overdue":
        return <AlertTriangle className="h-4 w-4 text-red-600" />;
      default:
        return <Circle className="h-4 w-4 text-blue-600" />;
    }
  };

  const getPriorityColor = (priority?: string) => {
    switch (priority) {
      case "urgent": return "text-red-500 bg-red-50 border-red-200";
      case "high": return "text-orange-500 bg-orange-50 border-orange-200";
      case "medium": return "text-yellow-600 bg-yellow-50 border-yellow-200";
      case "low": return "text-green-600 bg-green-50 border-green-200";
      default: return "text-muted-foreground bg-muted border-border";
    }
  };

  const getPriorityIcon = (priority?: string) => {
    switch (priority) {
      case "urgent": return <Star className="h-3 w-3 fill-current" />;
      case "high": return <Star className="h-3 w-3 fill-current" />;
      default: return null;
    }
  };

  return (
    <div className="space-y-4">
      {tasks.map((task) => {
        const status = getTaskStatus(task);
        const isOverdue = status === "overdue";
        const isCompleted = status === "completed";
        
        return (
          <Card 
            key={task.id} 
            className={`group hover:shadow-lg transition-all duration-300 cursor-pointer border-l-4 ${
              isOverdue ? "border-l-red-500 bg-red-50/30 hover:bg-red-50/50" : 
              isCompleted ? "border-l-green-500 bg-green-50/30 hover:bg-green-50/50" : 
              "border-l-blue-500 hover:shadow-md hover:border-l-primary"
            } ${task.attributes.completed ? "opacity-75" : ""}`}
            onClick={() => onTaskClick(task)}
          >
            <CardContent className="p-3">
              {/* Compact layout: title left, status and date right */}
              <div className="flex items-center justify-between gap-4">
                {/* Left side: Status icon and title */}
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="flex-shrink-0">
                    {getStatusIcon(task)}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className={`font-semibold text-sm leading-tight truncate ${
                        task.attributes.completed ? "line-through text-muted-foreground" : "text-foreground"
                      }`}>
                        {task.attributes.title}
                      </h3>
                      
                      {task.attributes.number && (
                        <Badge variant="outline" className="text-xs font-mono">
                          #{task.attributes.number}
                        </Badge>
                      )}
                    </div>
                    
                    {/* Description and assignee on second line */}
                    <div className="flex items-center gap-3 mt-1">
                      {task.attributes.description && (
                        <p className="text-xs text-muted-foreground line-clamp-1 flex-1">
                          {task.attributes.description}
                        </p>
                      )}
                      <TaskAssigneeDisplay taskId={task.id} variant="compact" />
                    </div>
                  </div>
                </div>

                {/* Right side: Status, priority, dates and action */}
                <div className="flex items-center gap-3 flex-shrink-0">
                  {/* Status and Priority */}
                  <div className="flex items-center gap-2">
                    <Badge className={`text-xs font-medium ${getStatusColor(status)}`}>
                      {getStatusLabel(status)}
                    </Badge>
                    
                    {task.attributes.priority && task.attributes.priority !== "medium" && (
                      <Badge 
                        variant="outline" 
                        className={`text-xs font-medium ${getPriorityColor(task.attributes.priority)}`}
                      >
                        <div className="flex items-center gap-1">
                          {getPriorityIcon(task.attributes.priority)}
                          <span className="capitalize">{task.attributes.priority}</span>
                        </div>
                      </Badge>
                    )}
                  </div>

                  {/* Dates */}
                  <div className="flex flex-col gap-1 text-xs text-muted-foreground text-right">
                    {task.attributes.due && (
                      <div className={`flex items-center gap-1 ${
                        isOverdue ? "text-red-600 font-medium" : ""
                      }`}>
                        <Clock className="h-3 w-3" />
                        <span>
                          {format(new Date(task.attributes.due), "dd/MM/yyyy", { locale: ptBR })}
                        </span>
                      </div>
                    )}
                    
                    <div className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      <span>
                        {format(new Date(task.attributes["registered-at"]), "dd/MM/yyyy", { locale: ptBR })}
                      </span>
                    </div>
                  </div>

                  {/* Action Menu */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48">
                      <DropdownMenuItem onClick={(e) => {
                        e.stopPropagation();
                        onTaskClick(task);
                      }} className="flex items-center gap-2">
                        <FileText className="h-4 w-4" />
                        Ver detalhes
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={(e) => {
                        e.stopPropagation();
                        onTaskMove(task.id, !task.attributes.completed);
                      }} className="flex items-center gap-2">
                        {task.attributes.completed ? (
                          <>
                            <Circle className="h-4 w-4" />
                            Reabrir tarefa
                          </>
                        ) : (
                          <>
                            <CheckCircle2 className="h-4 w-4" />
                            Concluir tarefa
                          </>
                        )}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
      
      {tasks.length === 0 && (
        <div className="text-center py-16 text-muted-foreground">
          <div className="w-16 h-16 gradient-subtle rounded-full mx-auto mb-4 flex items-center justify-center">
            <FileText className="h-8 w-8 opacity-50" />
          </div>
          <h3 className="text-lg font-medium mb-2">Nenhuma tarefa encontrada</h3>
          <p className="text-sm">Crie uma nova tarefa ou ajuste os filtros para ver suas tarefas.</p>
        </div>
      )}
    </div>
  );
}