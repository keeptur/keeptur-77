import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Task } from "@/types/api";
import { TASK_COLUMNS, getTaskStatus, getStatusColor } from "@/utils/taskStatus";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Calendar, Clock, MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
interface TaskKanbanProps {
  tasksByStatus: Record<string, Task[]>;
  onTaskClick: (task: Task) => void;
  onTaskMove: (taskId: string, target: "pending" | "overdue" | "completed" | "deleted") => Promise<void>;
  onTaskReopen?: (taskId: string, newDueDate: string) => Promise<void>;
  onTaskDelete?: (taskId: string) => Promise<void>;
  showDeleted?: boolean;
}

export function TaskKanban({ tasksByStatus, onTaskClick, onTaskMove, onTaskReopen, onTaskDelete, showDeleted = false }: TaskKanbanProps) {
  const { toast } = useToast();

  const handleDragEnd = async (result: DropResult) => {
    const { destination, source, draggableId } = result;

    console.log("Drag end:", { destination, source, draggableId });

    if (!destination) {
      console.log("No destination, aborting drag");
      return;
    }
    
    if (destination.droppableId === source.droppableId && destination.index === source.index) {
      console.log("Same position, no change needed");
      return;
    }

    // Bloquear mover tarefas a partir da coluna Excluída
    if (source.droppableId === "deleted" && destination.droppableId !== "deleted") {
      toast({
        title: "Restauração apenas no Monde",
        description: "Esta tarefa foi excluída no Monde. Para restaurar, faça isso no Monde.",
      });
      return;
    }

    const taskId = draggableId;
    const newColumnId = destination.droppableId;

    console.log("Moving task:", { taskId, from: source.droppableId, to: newColumnId });

    try {
      await onTaskMove(taskId, newColumnId as any);
    } catch (error) {
      console.error("Error moving task:", error);
      // Em caso de erro, você pode querer mostrar uma notificação ao usuário
    }
  };

  const columns = showDeleted ? TASK_COLUMNS : TASK_COLUMNS.filter(c => c.id !== "deleted");
  const gridColsClass = columns.length === 4 ? "lg:grid-cols-4" : "lg:grid-cols-3";

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <div className={`grid grid-cols-1 md:grid-cols-2 ${gridColsClass} gap-4`}>
        {columns.map((column) => (
          <div key={column.id} className="space-y-4">
            <div className={`font-semibold p-3 rounded-lg text-center ${getStatusColor(column.status)}`}>
              {column.label} ({tasksByStatus[column.status]?.length || 0})
            </div>

            <Droppable droppableId={column.id}>
              {(provided, snapshot) => (
                <div
                  ref={provided.innerRef}
                  {...provided.droppableProps}
                  className={`space-y-3 min-h-[400px] p-2 rounded-lg transition-colors ${
                    snapshot.isDraggingOver ? "bg-muted/50" : ""
                  }`}
                >
                  {tasksByStatus[column.status]?.map((task, index) => (
                    <Draggable key={task.id} draggableId={task.id} index={index} isDragDisabled={column.id === "deleted"}>
                      {(provided, snapshot) => (
                         <Card
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          {...provided.dragHandleProps}
                          className={`group cursor-pointer hover:shadow-md transition-all duration-300 border-l-2 border-l-primary/30 ${
                            snapshot.isDragging ? "rotate-2 shadow-lg scale-105" : ""
                          }`}
                          onClick={() => onTaskClick(task)}
                          onMouseDown={() => {
                            if (column.id === "deleted") {
                              toast({
                                title: "Restauração apenas no Monde",
                                description: "Esta tarefa foi excluída no Monde. Para restaurar, faça isso no Monde.",
                              });
                            }
                          }}
                        >
                          <CardContent className="p-3 space-y-3">
                            {/* Header */}
                            <div className="flex items-start justify-between gap-2">
                              <h4 className="font-medium text-sm line-clamp-2 leading-tight">{task.attributes.title}</h4>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                                  <Button variant="ghost" size="sm" className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <MoreHorizontal className="h-3 w-3" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem onClick={(e) => {
                                    e.stopPropagation();
                                    onTaskClick(task);
                                  }}>
                                    Ver detalhes
                                  </DropdownMenuItem>
                                  {column.id !== "deleted" ? (
                                    <>
                                      <DropdownMenuItem onClick={(e) => {
                                        e.stopPropagation();
                                        onTaskMove(task.id, task.attributes.completed ? "pending" : "completed");
                                      }}>
                                        {task.attributes.completed ? "Reabrir" : "Concluir"}
                                      </DropdownMenuItem>
                                      <DropdownMenuItem onClick={(e) => {
                                        e.stopPropagation();
                                        onTaskDelete?.(task.id);
                                      }}>
                                        Excluir
                                      </DropdownMenuItem>
                                    </>
                                  ) : (
                                    <DropdownMenuItem onClick={(e) => {
                                      e.stopPropagation();
                                      toast({
                                        title: "Restauração apenas no Monde",
                                        description: "Esta tarefa foi excluída no Monde. Para restaurar, faça isso no Monde.",
                                      });
                                    }}>
                                      Restauração apenas no Monde
                                    </DropdownMenuItem>
                                  )}
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>

                            {/* Description */}
                            {task.attributes.description && (
                              <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                                {task.attributes.description}
                              </p>
                            )}

                            {/* Task Number */}
                            {task.attributes.number && (
                              <div className="flex justify-start">
                                <Badge variant="outline" className="text-xs font-mono">
                                  #{task.attributes.number}
                                </Badge>
                              </div>
                            )}

                            {/* Dates */}
                            <div className="space-y-1">
                              {task.attributes.due && (
                                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                  <Clock className="h-3 w-3" />
                                  <span>Vence: {format(new Date(task.attributes.due), "dd/MM", { locale: ptBR })}</span>
                                </div>
                              )}
                              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                <Calendar className="h-3 w-3" />
                                <span>Criada: {format(new Date(task.attributes["registered-at"]), "dd/MM", { locale: ptBR })}</span>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      )}
                    </Draggable>
                  ))}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          </div>
        ))}
      </div>
    </DragDropContext>
  );
}