import { useState, useCallback } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Task, CreateTaskData, UpdateTaskData } from "@/types/api";
import { useToast } from "@/hooks/use-toast";

interface UseTaskManagerOptions {
  onTaskCreated?: (task: Task) => void;
  onTaskUpdated?: (task: Task) => void;
  onTaskDeleted?: (taskId: string) => void;
}

export function useTaskManager(options: UseTaskManagerOptions = {}) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [modalMode, setModalMode] = useState<"create" | "edit" | "view">("view");
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Create task mutation
  const createTaskMutation = useMutation({
    mutationFn: (data: CreateTaskData) => {
      console.log("Creating task:", data);
      return api.createTask(data);
    },
    onSuccess: (response) => {
      console.log("Task created successfully:", response);
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      toast({ 
        title: "Tarefa criada com sucesso!",
        description: "A nova tarefa foi adicionada." 
      });
      setIsModalOpen(false);
      options.onTaskCreated?.(response.data);
    },
    onError: (error: any) => {
      console.error("Error creating task:", error);
      toast({ 
        title: "Erro ao criar tarefa", 
        description: error.message,
        variant: "destructive" 
      });
    }
  });

  // Update task mutation
  const updateTaskMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateTaskData }) => {
      console.log("Updating task:", id, data);
      return api.updateTask(id, data);
    },
    onSuccess: (response, variables) => {
      console.log("Task updated successfully:", variables.id);
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      queryClient.invalidateQueries({ queryKey: ["task-related-data", variables.id] });
      toast({ 
        title: "Tarefa atualizada com sucesso!",
        description: "As alterações foram salvas." 
      });
      
      // Update local state if this is the selected task
      if (selectedTask?.id === variables.id) {
        setSelectedTask(response.data);
      }
      
      options.onTaskUpdated?.(response.data);
    },
    onError: (error: any, variables) => {
      console.error("Error updating task:", variables.id, error);
      toast({ 
        title: "Erro ao atualizar tarefa", 
        description: error.message,
        variant: "destructive" 
      });
    }
  });

  // Delete task mutation
  const deleteTaskMutation = useMutation({
    mutationFn: (id: string) => {
      console.log("Deleting task:", id);
      return api.deleteTask(id);
    },
    onSuccess: (data, taskId) => {
      console.log("Task deleted successfully:", taskId);
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      toast({ title: "Tarefa removida com sucesso!" });
      
      // Close modal if the deleted task was selected
      if (selectedTask?.id === taskId) {
        setIsModalOpen(false);
        setSelectedTask(null);
      }
      
      options.onTaskDeleted?.(taskId);
    },
    onError: (error: any, taskId) => {
      console.error("Error deleting task:", taskId, error);
      toast({ 
        title: "Erro ao remover tarefa", 
        description: error.message,
        variant: "destructive" 
      });
    }
  });

  // Modal management functions
  const openCreateModal = useCallback(() => {
    setSelectedTask(null);
    setModalMode("create");
    setIsModalOpen(true);
  }, []);

  const openEditModal = useCallback((task: Task) => {
    setSelectedTask(task);
    setModalMode("edit");
    setIsModalOpen(true);
  }, []);

  const openViewModal = useCallback((task: Task) => {
    setSelectedTask(task);
    setModalMode("view");
    setIsModalOpen(true);
  }, []);

  const closeModal = useCallback(() => {
    setIsModalOpen(false);
    setSelectedTask(null);
  }, []);

  // Unified save function for the modal
  const handleSaveTask = useCallback(async (data: CreateTaskData | UpdateTaskData) => {
    if (modalMode === "create") {
      await createTaskMutation.mutateAsync(data as CreateTaskData);
    } else if (modalMode === "edit" && selectedTask) {
      await updateTaskMutation.mutateAsync({
        id: selectedTask.id,
        data: data as UpdateTaskData
      });
    }
  }, [modalMode, selectedTask, createTaskMutation, updateTaskMutation]);

  // Task status update helper
  const updateTaskStatus = useCallback(async (taskId: string, completed: boolean, newDueDate?: string, opts?: { restore?: boolean }) => {
    try {
      console.log("Updating task status:", { taskId, completed, newDueDate, restore: opts?.restore });
      
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

      // Se estiver restaurando, também limpar flags de exclusão no backend (quando suportado)
      if (opts?.restore) {
        const attrs = (updateData.attributes as any);
        attrs.deleted = false;
        attrs["deleted-at"] = null;
        attrs.excluded = false;
        attrs["excluded-at"] = null;
        attrs.visible = true;
      }

      await updateTaskMutation.mutateAsync({
        id: taskId,
        data: updateData
      });
    } catch (error) {
      console.error("Error in updateTaskStatus:", error);
      throw error;
    }
  }, [updateTaskMutation]);

  return {
    // State
    selectedTask,
    modalMode,
    isModalOpen,
    
    // Mutations
    createTaskMutation,
    updateTaskMutation,
    deleteTaskMutation,
    
    // Modal functions
    openCreateModal,
    openEditModal,
    openViewModal,
    closeModal,
    
    // Save function
    handleSaveTask,
    
    // Utility functions
    updateTaskStatus,
    
    // Loading states
    isCreating: createTaskMutation.isPending,
    isUpdating: updateTaskMutation.isPending,
    isDeleting: deleteTaskMutation.isPending,
  };
}