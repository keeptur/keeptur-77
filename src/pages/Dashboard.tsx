import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Calendar, List, LayoutGrid, Plus, Search } from "lucide-react";
import { TaskStatsCards } from "@/components/tasks/TaskStatsCards";
import { TaskFilters } from "@/components/tasks/TaskFilters";
import { Task, CreateTaskData, UpdateTaskData } from "@/types/api";
import { useTasks } from "@/hooks/useTasks";
import { NewTaskModal } from "@/components/tasks/NewTaskModal";
import { useTaskManager } from "@/hooks/useTaskManager";
import { TaskKanban } from "@/components/tasks/TaskKanban";
import { TaskTable } from "@/components/tasks/TaskTable";
import { TaskCalendar } from "@/components/tasks/TaskCalendar";
import { TaskDateDialog } from "@/components/dialogs/TaskDateDialog";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { format, addHours } from "date-fns";
import "react-big-calendar/lib/css/react-big-calendar.css";
export default function Dashboard() {
  const {
    toast
  } = useToast();
  const queryClient = useQueryClient();
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"create" | "edit" | "view">("view");
  const [activeTab, setActiveTab] = useState("list");
  const [taskHistorics, setTaskHistorics] = useState<any[]>([]);
  const [showDeleted, setShowDeleted] = useState(false);

  // Estado para o diálogo de data
  const [isDateDialogOpen, setIsDateDialogOpen] = useState(false);
const [pendingTaskUpdate, setPendingTaskUpdate] = useState<{
    taskId: string;
    taskTitle: string;
    target: "pending" | "overdue" | "completed";
    context: "move" | "restore" | "reopen";
    needsRestore?: boolean;
    needsReopen?: boolean;
  } | null>(null);
  const {
    tasks,
    tasksByStatus,
    getTaskHistorics,
    isLoading,
    searchTerm,
    setSearchTerm,
    statusFilter,
    setStatusFilter,
    categoryFilter,
    setCategoryFilter,
    assigneeFilter,
    setAssigneeFilter,
    updateTaskStatus,
    reopenTask,
    updateTaskMutation,
    deleteTaskMutation
  } = useTasks();

  // Mutations
  const createTaskMutation = useMutation({
    mutationFn: (data: CreateTaskData) => api.createTask(data),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["tasks"]
      });
      toast({
        title: "Tarefa criada com sucesso!"
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao criar tarefa",
        description: error.message,
        variant: "destructive"
      });
    }
  });
  const handleTaskClick = async (task: Task) => {
    setSelectedTask(task);
    setModalMode("view");

    // Load task historics
    try {
      const historics = await getTaskHistorics(task.id);
      setTaskHistorics(historics.data || []);
    } catch (error) {
      console.error("Error loading task historics:", error);
      setTaskHistorics([]);
    }
    setIsModalOpen(true);
  };
  const handleEditTask = async (task: Task) => {
    setSelectedTask(task);
    setModalMode("edit");

    // Load task historics
    try {
      const historics = await getTaskHistorics(task.id);
      setTaskHistorics(historics.data || []);
    } catch (error) {
      console.error("Error loading task historics:", error);
      setTaskHistorics([]);
    }
    setIsModalOpen(true);
  };
  const handleNewTask = async () => {
    setSelectedTask(null);
    setModalMode("create");
    setTaskHistorics([]);
    // Prefetch required data to ensure dropdowns are ready
    await Promise.all([
      queryClient.prefetchQuery({ queryKey: ["task-categories"], queryFn: () => api.getTaskCategories({ size: 1000 }) }),
      queryClient.prefetchQuery({ queryKey: ["company-users"], queryFn: () => api.getCompanyUsers() }),
    ]);
    setIsModalOpen(true);
  };
  const handleTaskSave = async (data: CreateTaskData | UpdateTaskData) => {
    if (modalMode === "create") {
      await createTaskMutation.mutateAsync(data as CreateTaskData);
    } else if (selectedTask) {
      await updateTaskMutation.mutateAsync({
        id: selectedTask.id,
        data: data as UpdateTaskData
      });
    }
    setIsModalOpen(false);
  };
const handleTaskMove = async (taskId: string, target: "pending" | "overdue" | "completed" | "deleted") => {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;

    // Detecta se está marcado como excluída (pela coluna ou por atributos)
    const isInDeletedColumn = !!tasksByStatus.deleted.find(t => t.id === taskId);
    const a: any = task.attributes as any;
    const hasDeletionSignals = !!(
      a.deleted || a.excluded ||
      a["is-deleted"] || a["is_deleted"] ||
      a["is-excluded"] || a["is_excluded"] ||
      a["deleted-at"] || a["deleted_at"] || a["deletedAt"] ||
      a["excluded-at"] || a["excluded_at"] || a["excludedAt"] ||
      a["cancelled-at"] || a["canceled-at"] || a["cancelled_at"] || a["cancelledAt"] || a["canceled_at"] || a["canceledAt"]
    );
    const isDeleted = isInDeletedColumn || hasDeletionSignals;

    // Excluir
    if (target === "deleted") {
      await deleteTaskMutation.mutateAsync(taskId);
      return;
    }

    // Sempre abrir diálogo para pendente/atrasada/concluída
    const context: "move" | "restore" | "reopen" = isDeleted
      ? "restore"
      : task.attributes.completed && target !== "completed"
      ? "reopen"
      : "move";

    setPendingTaskUpdate({
      taskId,
      taskTitle: task.attributes.title,
      target,
      context,
      needsRestore: isDeleted,
      needsReopen: !!task.attributes.completed,
    });
    setIsDateDialogOpen(true);
  };
const handleDateDialogConfirm = async (newDueDate: string) => {
    if (!pendingTaskUpdate) return;
    const { taskId, target, context, needsRestore } = pendingTaskUpdate;

    // Snapshot do cache anterior para possível rollback
    const previousTasksQueries = queryClient.getQueriesData({ queryKey: ["tasks"] });

    try {
      // Atualização OTIMISTA de restauração (não enviar deleted/deleted-at para a API)
      if (needsRestore) {
        queryClient.setQueriesData({ queryKey: ["tasks"] }, (old: any) => {
          if (!old) return old;
          try {
            return {
              ...old,
              data: (old.data || []).map((t: any) =>
                t.id === taskId
                  ? {
                      ...t,
                      attributes: {
                        ...t.attributes,
                        // limpar sinais de exclusão/cancelamento
                        deleted: false,
                        excluded: false,
                        "is-deleted": false,
                        "is_deleted": false,
                        "is-excluded": false,
                        "is_excluded": false,
                        "deleted-at": undefined,
                        "deleted_at": undefined,
                        deletedAt: undefined,
                        "excluded-at": undefined,
                        "excluded_at": undefined,
                        excludedAt: undefined,
                        "cancelled-at": undefined,
                        "canceled-at": undefined,
                        "cancelled_at": undefined,
                        cancelledAt: undefined,
                        "canceled_at": undefined,
                        canceledAt: undefined,
                        visible: true,
                      },
                    }
                  : t
              ),
            };
          } catch {
            return old;
          }
        });
      }

      if (target === "completed") {
        await updateTaskStatus(taskId, true, undefined, { restore: needsRestore });
        toast({ title: needsRestore ? "Tarefa restaurada e concluída" : "Tarefa concluída" });
      } else {
        // Garantir data padrão se vazia
        let finalDue = newDueDate;
        if (!finalDue) {
          const delta = target === "overdue" ? -1 : 1;
          finalDue = format(addHours(new Date(), delta), "yyyy-MM-dd'T'HH:mm");
        }
        await updateTaskStatus(taskId, false, finalDue, { restore: needsRestore && context === "restore" });
        const action = context === "restore" ? "restaurada" : context === "reopen" ? "reaberta" : "atualizada";
        const dest = target === "overdue" ? "atrasada" : "pendente";
        toast({ title: `Tarefa ${action} e movida para ${dest}` });
      }
    } catch (error: any) {
      // Rollback do cache em caso de erro
      previousTasksQueries.forEach(([key, data]) => {
        queryClient.setQueryData(key, data);
      });
      toast({ title: "Erro ao atualizar tarefa", description: error.message, variant: "destructive" });
    } finally {
      setIsDateDialogOpen(false);
      setPendingTaskUpdate(null);
    }
  };
  if (isLoading) {
    return <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>;
  }
  return <div className="space-y-6">
      {/* Header - removido daqui pois botão foi movido para dentro dos tabs */}

      {/* Statistics Cards */}
      <TaskStatsCards tasks={tasks} showDeleted={showDeleted} />

      <div className="bg-card rounded-xl p-6 border border-border shadow-sm">
        <div className="flex items-center justify-between mb-6">
          <div className="flex space-x-1">
            <Button variant={activeTab === "list" ? "default" : "outline"} onClick={() => setActiveTab("list")} className="rounded-button">
              <List className="h-4 w-4 mr-2" />
              Lista
            </Button>
            <Button variant={activeTab === "kanban" ? "default" : "outline"} onClick={() => setActiveTab("kanban")} className="rounded-button">
              <LayoutGrid className="h-4 w-4 mr-2" />
              Kanban
            </Button>
            <Button variant={activeTab === "calendar" ? "default" : "outline"} onClick={() => setActiveTab("calendar")} className="rounded-button">
              <Calendar className="h-4 w-4 mr-2" />
              Calendário
            </Button>
          </div>
          
          <Button onClick={handleNewTask} className="rounded-button">
            <Plus className="h-4 w-4 mr-2" />
            Nova Tarefa
          </Button>
        </div>

        <TaskFilters searchTerm={searchTerm} setSearchTerm={setSearchTerm} statusFilter={statusFilter} setStatusFilter={setStatusFilter} categoryFilter={categoryFilter} setCategoryFilter={setCategoryFilter} assigneeFilter={assigneeFilter} setAssigneeFilter={setAssigneeFilter} showDeleted={showDeleted} setShowDeleted={setShowDeleted} />

        {/* Content based on active tab */}
        {activeTab === "list" && <TaskTable tasks={tasks} onUpdateTask={async (taskId, data) => {
        await updateTaskMutation.mutateAsync({
          id: taskId,
          data
        });
      }} isLoading={isLoading} />}
        
        {activeTab === "kanban" && <TaskKanban tasksByStatus={tasksByStatus} onTaskClick={handleTaskClick} onTaskMove={handleTaskMove} onTaskReopen={reopenTask} onTaskDelete={async (taskId) => {
          await deleteTaskMutation.mutateAsync(taskId);
        }} showDeleted={showDeleted} />}
        
        {activeTab === "calendar" && <TaskCalendar tasks={tasks} onTaskClick={handleTaskClick} />}
      </div>

      <NewTaskModal 
        task={selectedTask} 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        onSave={handleTaskSave}
        mode={modalMode}
        taskHistorics={taskHistorics}
      />

<TaskDateDialog
        isOpen={isDateDialogOpen}
        onClose={() => {
          setIsDateDialogOpen(false);
          setPendingTaskUpdate(null);
        }}
        onConfirm={handleDateDialogConfirm}
        taskTitle={pendingTaskUpdate?.taskTitle || ""}
        mode={pendingTaskUpdate?.target === "overdue" ? "overdue" : "reopen"}
        target={pendingTaskUpdate?.target || "pending"}
        context={pendingTaskUpdate?.context || "move"}
        hideDateInput={pendingTaskUpdate?.target === "completed"}
      />
    </div>;
}