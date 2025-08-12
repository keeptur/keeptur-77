import { useState } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Calendar, User, Eye, MessageSquare, MoreHorizontal, Clock, AlertTriangle } from "lucide-react";
import { Task, UpdateTaskData } from "@/types/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { NewTaskModal } from "@/components/tasks/NewTaskModal";
import { getTaskStatus, getStatusLabel, getStatusColor } from "@/utils/taskStatus";
import { isPast } from "date-fns";
import { TaskAssigneeDisplay } from "./TaskAssigneeDisplay";
interface TaskTableProps {
  tasks: Task[];
  onUpdateTask: (taskId: string, data: UpdateTaskData) => Promise<void>;
  isLoading?: boolean;
}
export function TaskTable({
  tasks,
  onUpdateTask,
  isLoading
}: TaskTableProps) {
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const handleTaskClick = (task: Task) => {
    setSelectedTask(task);
    setIsModalOpen(true);
  };
  const getPriorityColor = (task: Task) => {
    if (task.attributes.completed) return "text-muted-foreground";
    if (task.attributes.due && isPast(new Date(task.attributes.due))) {
      return "text-destructive";
    }
    return "text-foreground";
  };
  const getPriorityBadge = (task: Task) => {
    const status = getTaskStatus(task);
    const statusColor = getStatusColor(status);
    const statusLabel = getStatusLabel(status);
    
    return <Badge variant="outline" className={`border ${statusColor}`}>
      {statusLabel}
    </Badge>;
  };
  if (isLoading) {
    return <Card>
        <CardHeader>
          <CardTitle className="text-lg">Lista de Tarefas</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map(i => <div key={i} className="animate-pulse">
                <div className="flex items-center space-x-4 p-4 border rounded-lg">
                  <div className="h-4 w-4 bg-muted rounded"></div>
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-muted rounded w-1/3"></div>
                    <div className="h-3 bg-muted rounded w-3/4"></div>
                  </div>
                  <div className="h-6 w-16 bg-muted rounded"></div>
                </div>
              </div>)}
          </div>
        </CardContent>
      </Card>;
  }
  if (tasks.length === 0) {
    return <Card>
        <CardHeader>
          <CardTitle className="text-lg">Lista de Tarefas</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Nenhuma tarefa encontrada</p>
          </div>
        </CardContent>
      </Card>;
  }
  return <>
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Eye className="h-5 w-5" />
            Lista de Tarefas ({tasks.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="w-12">#</TableHead>
                  <TableHead className="min-w-[150px]">Título da Tarefa</TableHead>
                  <TableHead className="w-52">Responsável</TableHead>
                  <TableHead className="w-52"> Vencimento</TableHead>
                  <TableHead className="w-28">Status</TableHead>
                  
                  <TableHead className="w-16">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tasks.map(task => <TableRow key={task.id} className="hover:bg-muted/30 cursor-pointer transition-colors" onClick={() => handleTaskClick(task)}>
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      #{task.attributes.number || task.id.slice(-4)}
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <p className={`font-medium line-clamp-1 ${getPriorityColor(task)}`}>
                          {task.attributes.title}
                        </p>
                        {task.attributes.description && <p className="text-xs text-muted-foreground line-clamp-1">
                            {task.attributes.description}
                          </p>}
                      </div>
                    </TableCell>
                    <TableCell>
                      <TaskAssigneeDisplay taskId={task.id} variant="text" />
                    </TableCell>
                    <TableCell>
                      {task.attributes.due ? <div className="flex items-center gap-1 text-sm">
                          <Calendar className="h-3 w-3" />
                          <span className={isPast(new Date(task.attributes.due)) ? "text-destructive font-medium" : ""}>
                            {format(new Date(task.attributes.due), "dd/MM/yyyy HH:mm", {
                        locale: ptBR
                      })}
                          </span>
                        </div> : <span className="text-muted-foreground text-sm">Não definido</span>}
                    </TableCell>
                    <TableCell>
                      {getPriorityBadge(task)}
                    </TableCell>
                    
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild onClick={e => e.stopPropagation()}>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={e => {
                        e.stopPropagation();
                        handleTaskClick(task);
                      }}>
                            <Eye className="h-4 w-4 mr-2" />
                            Ver detalhes
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={e => {
                        e.stopPropagation();
                        // Implementar edição
                      }}>
                            <MessageSquare className="h-4 w-4 mr-2" />
                            Editar
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>)}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <NewTaskModal 
        task={selectedTask} 
        isOpen={isModalOpen} 
        mode="view"
        onClose={() => {
          setIsModalOpen(false);
          setSelectedTask(null);
        }} 
        onSave={async (data) => {
          if (selectedTask && "id" in data) {
            await onUpdateTask(selectedTask.id, data);
          }
        }} 
      />
    </>;
}