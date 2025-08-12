
import { useState, useMemo, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Task, CreateTaskData, UpdateTaskData } from "@/types/api";
import { useToast } from "@/hooks/use-toast";
import { useDebounce } from "@/hooks/use-debounce";
import { format, addHours, isPast } from "date-fns";
import { getTaskStatus } from "@/utils/taskStatus";
import { deriveLastStatusMap } from "@/utils/deriveTaskStatus";

export function useTasks() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("mine"); // Default to user's tasks
  const [categoryFilter, setCategoryFilter] = useState<string>("");
  const [assigneeFilter, setAssigneeFilter] = useState<string>("");
  // Mantém IDs excluídos no cliente para refletir imediatamente no Kanban
  const [clientDeletedIds, setClientDeletedIds] = useState<Set<string>>(new Set());

  // Persistência local de exclusões por usuário
  const currentUserId = api.getCurrentUserIdFromToken();
  const storageKey = `kt_clientDeleted_${currentUserId ?? 'anon'}`;

  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) {
        const arr = JSON.parse(raw);
        if (Array.isArray(arr)) {
          setClientDeletedIds(new Set(arr));
        }
      }
      console.log("useTasks: Hydrated clientDeletedIds from storage", { key: storageKey, count: Array.from(clientDeletedIds).length });
    } catch (e) {
      console.warn("useTasks: Failed to hydrate clientDeletedIds", e);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storageKey]);

  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(Array.from(clientDeletedIds)));
    } catch (e) {
      console.warn("useTasks: Failed to persist clientDeletedIds", e);
    }
  }, [clientDeletedIds, storageKey]);

  // Debounce search term to avoid too many API calls
  const debouncedSearchTerm = useDebounce(searchTerm, 500);

  console.log("useTasks: Initializing hook with filters:", { searchTerm: debouncedSearchTerm, statusFilter });

  // Query para buscar todas as tarefas
  const { 
    data: tasksResponse, 
    isLoading, 
    error,
    refetch 
  } = useQuery({
    queryKey: ["tasks", debouncedSearchTerm, statusFilter, categoryFilter, assigneeFilter],
    queryFn: async () => {
      console.log("useTasks: Fetching tasks from API...");
      
      // Verificar se está autenticado antes de fazer a requisição
      if (!api.isAuthenticated()) {
        throw new Error('Usuário não autenticado');
      }

      try {
        const PAGE_SIZE = 50;
        const MAX_PAGES = 5;
        const include = "assignee,person,category,task-historics";
        const sort = "-registered-at";

        // Build filter object based on API docs
        const filters: Record<string, string> = {};

        // Use filter[search] for search functionality
        if (debouncedSearchTerm && debouncedSearchTerm.length >= 2) {
          filters.search = debouncedSearchTerm;
        }

        // Server-side "My Tasks" per docs: filter[assigned]=user_tasks
        if (statusFilter === "mine") {
          filters.assigned = "user_tasks";
        }

        const allTasks: any[] = [];
        const allIncluded: any[] = [];
        for (let page = 1; page <= MAX_PAGES; page++) {
          const res = await api.getTasks({
            page,
            size: PAGE_SIZE,
            sort,
            include,
            filter: Object.keys(filters).length ? filters : undefined,
          });
          const batch = res?.data || [];
          allTasks.push(...batch);
          if (Array.isArray((res as any)?.included)) {
            allIncluded.push(...(res as any).included);
          }
          if (batch.length < PAGE_SIZE) break;
        }

        // Tentar buscar tarefas excluídas/canceladas também
        try {
          const extraFiltersList: Record<string, string>[] = [
            { deleted: "true" },
            { excluded: "true" },
            { visible: "false" },
          ];
          for (const extra of extraFiltersList) {
            for (let page = 1; page <= MAX_PAGES; page++) {
              const res2 = await api.getTasks({
                page,
                size: PAGE_SIZE,
                sort,
                include,
                filter: extra,
              });
              const batch2 = (res2 as any)?.data || [];
              allTasks.push(...batch2);
              if (Array.isArray((res2 as any)?.included)) {
                allIncluded.push(...(res2 as any).included);
              }
              if (batch2.length < PAGE_SIZE) break;
            }
          }
        } catch (e) {
          console.warn("useTasks: Extra fetch for deleted/excluded tasks failed", e);
        }

        // Deduplicar por ID
        const seen = new Set<string>();
        const deduped = allTasks.filter((t: any) => {
          if (!t?.id) return false;
          if (seen.has(t.id)) return false;
          seen.add(t.id);
          return true;
        });

        const aggregated = { data: deduped, included: allIncluded } as any;
        console.log("useTasks: Aggregated tasks (with possible deleted):", aggregated.data.length);
        return aggregated;
      } catch (error) {
        console.error("useTasks: Error fetching tasks:", error);
        throw error;
      }
    },
    staleTime: 5 * 60 * 1000, // Increased to 5 minutes for better caching
    retry: (failureCount, error) => {
      // Handle rate limiting
      if (error.message.includes('429') || error.message.includes('Too Many Requests')) {
        return failureCount < 2; // Reduce retries for rate limiting
      }
      // Não retry se o usuário não estiver autenticado
      if (error.message.includes('não autenticado') || error.message.includes('Token expirado')) {
        return false;
      }
      return failureCount < 3;
    },
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    refetchInterval: 30000,
    refetchIntervalInBackground: true,
    refetchOnWindowFocus: true,
    enabled: api.isAuthenticated() // Só executar se autenticado
  });

  // Carregar historicos recentes (uma única chamada) para detectar exclusões/cancelamentos de forma robusta
  const { data: recentHistoricsResponse } = useQuery({
    queryKey: ["task-historics", "recent"],
      queryFn: async () => {
        const PAGE_SIZE = 50;
        const MAX_PAGES = 10;
        const all: any[] = [];
        for (let page = 1; page <= MAX_PAGES; page++) {
          const res = await api.getTaskHistorics({ 
            size: PAGE_SIZE, page, sort: "-date-time"
          });
          const batch = res?.data || [];
          all.push(...batch);
          if (batch.length < PAGE_SIZE) break;
        }
        return { data: all } as any;
      },
    staleTime: 120 * 1000,
    refetchInterval: 60 * 1000,
    refetchIntervalInBackground: true,
    enabled: api.isAuthenticated()
  });

  // Derivar status real das tarefas a partir de históricos e included
  const derivedStatusMap = useMemo(() => {
    try {
      const included = (tasksResponse as any)?.included;
      const historics = recentHistoricsResponse?.data;
      const map = deriveLastStatusMap(historics as any, included as any);
      console.log("useTasks: Derived status map sizes:", {
        historics: historics?.length || 0,
        included: included?.length || 0,
        derivedKeys: Object.keys(map).length,
      });
      return map;
    } catch (e) {
      console.warn("useTasks: Failed to derive status map:", e);
      return {} as Record<string, "deleted" | "completed">;
    }
  }, [recentHistoricsResponse?.data, tasksResponse]);

  // Processar dados das tarefas com detecção de atraso e filtragem local
  const tasks: Task[] = useMemo(() => {
    let taskList = tasksResponse?.data || [];
    console.log("useTasks: Processing tasks from API:", taskList.length, "tasks received");
    
    // Apply frontend filtering for "mine" - show only tasks where user is assignee
    if (statusFilter === "mine") {
      const currentUserId = api.getCurrentUserIdFromToken();
      console.log("useTasks: Current user ID:", currentUserId);
      
      if (currentUserId) {
        const originalCount = taskList.length;
        taskList = taskList.filter(task => {
          const assigneeId = task.relationships?.assignee?.data?.id;
          console.log("useTasks: Task", task.id, "- assignee:", assigneeId, "- matches user:", assigneeId === currentUserId);
          return assigneeId === currentUserId;
        });
        console.log(`useTasks: Filtered "My Tasks" for user ${currentUserId}: ${taskList.length} tasks (from ${originalCount} total)`);
      }
    }
    
    // Apply category filter on frontend
    if (categoryFilter && categoryFilter !== "all") {
      taskList = taskList.filter(task => 
        task.relationships?.category?.data?.id === categoryFilter
      );
    }
    
    // Apply assignee filter on frontend
    if (assigneeFilter && assigneeFilter !== "all") {
      taskList = taskList.filter(task => 
        task.relationships?.assignee?.data?.id === assigneeFilter
      );
    }
    
    console.log(`useTasks: Final processed tasks: ${taskList.length} tasks (statusFilter: ${statusFilter})`);
    return taskList;
  }, [tasksResponse?.data, statusFilter, categoryFilter, assigneeFilter]);

// Agrupar tarefas por status incluindo atrasadas
  const tasksByStatus = useMemo(() => {
    const grouped: Record<string, Task[]> = {
      pending: [],
      overdue: [],
      completed: [],
      deleted: [],
    };

    for (const task of tasks) {
      // Priorizar status derivado de históricos/included e exclusões locais
      const derived = (derivedStatusMap as any)?.[task.id] as "deleted" | "completed" | undefined;
      let status = getTaskStatus(task);
      if (derived === "deleted" && status !== "deleted") {
        console.log("useTasks: Overriding status to 'deleted' for task", task.id, {
          previous: status,
          reason: "derived-from-historics",
        });
        status = "deleted" as const;
      } else if (derived === "completed" && status !== "completed") {
        console.log("useTasks: Overriding status to 'completed' for task", task.id, {
          previous: status,
          reason: "derived-from-historics",
        });
        status = "completed" as const;
      }

      // Se o usuário excluiu localmente, refletir imediatamente
      if (clientDeletedIds.has(task.id) && status !== "deleted") {
        status = "deleted" as const;
      }

      if (grouped[status]) {
        grouped[status].push(task);
      }
    }

    console.log("useTasks: Tasks by status:", {
      pending: grouped.pending.length,
      overdue: grouped.overdue.length,
      completed: grouped.completed.length,
      deleted: grouped.deleted.length
    });

    return grouped as { pending: Task[]; overdue: Task[]; completed: Task[]; deleted: Task[] };
  }, [tasks, clientDeletedIds]);

  // Mutation para atualizar tarefa
  const updateTaskMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateTaskData }) => {
      console.log("useTasks: Updating task:", id, data);
      return api.updateTask(id, data);
    },
    onSuccess: (data, variables) => {
      console.log("useTasks: Task updated successfully:", variables.id);
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      toast({ 
        title: "Tarefa atualizada com sucesso!",
        description: "As alterações foram salvas." 
      });
    },
    onError: (error: any, variables) => {
      console.error("useTasks: Error updating task:", variables.id, error);
      toast({ 
        title: "Erro ao atualizar tarefa", 
        description: error.message,
        variant: "destructive" 
      });
    }
  });

  // Mutation para deletar tarefa (com atualização otimista)
  const deleteTaskMutation = useMutation({
    mutationFn: async (id: string) => {
      console.log("useTasks: Soft-deleting task:", id);
      try {
        if ((api as any).softDeleteTask) {
          return await (api as any).softDeleteTask(id);
        }
        return await api.updateTask(id, {
          type: "tasks",
          id,
          attributes: {
            deleted: true,
            "deleted-at": new Date().toISOString(),
            excluded: true,
            "excluded-at": new Date().toISOString(),
            visible: false,
          },
        });
      } catch (err) {
        console.warn("useTasks: Soft delete failed, falling back to DELETE:", err);
        return await api.deleteTask(id);
      }
    },
    onMutate: async (id: string) => {
      // Cancelar quaisquer refetches em andamento para evitar sobrescrever nosso update otimista
      await queryClient.cancelQueries({ queryKey: ["tasks"] });

      // Snapshot do cache anterior de todas as queries que começam com ["tasks"]
      const previous = queryClient.getQueriesData({ queryKey: ["tasks"] });

      // Marcar tarefa como excluída no cache (sem remover, para aparecer na coluna Excluída)
      queryClient.setQueriesData({ queryKey: ["tasks"] }, (oldData: any) => {
        if (!oldData) return oldData;
        try {
          const updated = {
            ...oldData,
            data: (oldData.data || []).map((t: any) =>
              t.id === id
                ? {
                    ...t,
                    attributes: {
                      ...t.attributes,
                      deleted: true,
                      "deleted-at": new Date().toISOString(),
                    },
                  }
                : t
            ),
          };
          return updated;
        } catch {
          return oldData;
        }
      });

      return { previous };
    },
    onError: (error: any, id, context: any) => {
      console.error("useTasks: Error deleting task:", id, error);
      // Restaurar cache anterior em caso de erro
      context?.previous?.forEach?.(([key, data]: any) => {
        queryClient.setQueryData(key, data);
      });
      toast({ 
        title: "Erro ao remover tarefa", 
        description: error.message,
        variant: "destructive" 
      });
    },
    onSuccess: (_, id) => {
      // Marcar como excluída no cliente para refletir no Kanban mesmo se a API não sinalizar
      setClientDeletedIds((prev) => {
        const next = new Set(prev);
        if (typeof id === 'string') next.add(id);
        return next;
      });
      toast({ title: "Tarefa removida com sucesso!" });
    },
    onSettled: () => {
      // Garantir sincronização com o servidor
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
    }
  });

  // Função para atualizar status da tarefa
  const updateTaskStatus = async (taskId: string, completed: boolean, newDueDate?: string, opts?: { restore?: boolean }) => {
    try {
      console.log("useTasks: Updating task status:", { taskId, completed, newDueDate, restore: opts?.restore });
      
      const updateData: UpdateTaskData = {
        type: "tasks",
        id: taskId,
        attributes: {
          completed
        }
      };
      
      if (newDueDate) {
        updateData.attributes.due = newDueDate;
      }

      await updateTaskMutation.mutateAsync({
        id: taskId,
        data: updateData
      });

      if (opts?.restore) {
        setClientDeletedIds((prev) => {
          const next = new Set(prev);
          next.delete(taskId);
          return next;
        });
      }
    } catch (error) {
      console.error("useTasks: Error in updateTaskStatus:", error);
      throw error;
    }
  };

  // Função para reabrir tarefa
  const reopenTask = async (taskId: string) => {
    console.log("useTasks: Reopening task:", taskId);
    await updateTaskStatus(taskId, false, format(addHours(new Date(), 24), 'yyyy-MM-dd'));
  };

  // Função para buscar histórico da tarefa - Fixed to remove unsupported filter
  const getTaskHistorics = async (taskId: string) => {
    console.log("useTasks: Getting task historics for:", taskId);
    try {
      // REMOVED: filter by task-id as it's not supported by API
      // Fetch all historics and filter on frontend
        const PAGE_SIZE = 50;
        const MAX_PAGES = 30;
        const all: any[] = [];
        for (let page = 1; page <= MAX_PAGES; page++) {
          const res = await api.getTaskHistorics({ 
            size: PAGE_SIZE,
            page,
            sort: "-date-time"
          });
          const batch = res?.data || [];
          // Filter incrementally to reduce memory usage
          const filteredBatch = batch.filter(historic => {
            // Multiple ways to verify relationship
            if (historic.relationships?.task?.links?.related?.includes(taskId)) return true;
            if (historic.relationships?.task && 'data' in historic.relationships.task && 
                historic.relationships.task.data && 
                typeof historic.relationships.task.data === 'object' && 
                'id' in historic.relationships.task.data && 
                historic.relationships.task.data.id === taskId) return true;
            if (historic.attributes && 'task-id' in historic.attributes && historic.attributes['task-id'] === taskId) return true;
            if (historic.attributes && 'task_id' in historic.attributes && historic.attributes['task_id'] === taskId) return true;
            return false;
          });
          all.push(...filteredBatch);
          if (batch.length < PAGE_SIZE) break;
        }
        
        console.log("useTasks: Successfully fetched historics for task:", taskId, {
          filtered: all.length
        });
        
        return { data: all } as any;
    } catch (error) {
      console.error("useTasks: Error getting task historics:", error);
      return { data: [] };
    }
  };

  console.log("useTasks: Returning hook data:", {
    tasksCount: tasks.length,
    isLoading,
    error: error?.message
  });

  return {
    tasks,
    tasksByStatus,
    isLoading,
    error,
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
    deleteTaskMutation,
    getTaskHistorics,
    refetch
  };
}
