import { useState, useEffect, useCallback } from "react";
import { api } from "@/lib/api";

interface TaskRelatedData {
  assignee: any | null;
  author: any | null;
  person: any | null;
  category: any | null;
}

const taskRelatedDataCache = new Map<string, TaskRelatedData>();

export function useTaskRelatedData(taskId: string | null) {
  const [data, setData] = useState<TaskRelatedData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchTaskRelatedData = useCallback(async (id: string) => {
    // Verificar cache primeiro
    const cached = taskRelatedDataCache.get(id);
    if (cached) {
      setData(cached);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Usar método público da API para buscar dados relacionados
      const relatedData = await api.getTaskRelatedData(id);
      
      const processedData: TaskRelatedData = {
        assignee: relatedData.assignee || null,
        author: null, // Author não está disponível no método getTaskRelatedData
        person: relatedData.person || null,
        category: relatedData.category || null
      };

      // Armazenar no cache
      taskRelatedDataCache.set(id, processedData);
      setData(processedData);
    } catch (err) {
      console.error('Error fetching task related data:', err);
      setError(err as Error);
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (taskId) {
      fetchTaskRelatedData(taskId);
    } else {
      setData(null);
      setError(null);
    }
  }, [taskId, fetchTaskRelatedData]);

  return { data, loading, error, refetch: () => taskId && fetchTaskRelatedData(taskId) };
}

// Hook específico para buscar apenas o responsável da tarefa (mais eficiente)
export function useTaskAssignee(taskId: string | null) {
  const [assignee, setAssignee] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchAssignee = useCallback(async (id: string) => {
    // Verificar cache primeiro
    const cached = taskRelatedDataCache.get(id);
    if (cached?.assignee) {
      setAssignee(cached.assignee);
      return;
    }

    setLoading(true);
    try {
      const relatedData = await api.getTaskRelatedData(id);
      if (relatedData?.assignee) {
        setAssignee(relatedData.assignee);
        
        // Atualizar cache parcialmente
        const existingCache = taskRelatedDataCache.get(id) || {
          assignee: null,
          author: null,
          person: null,
          category: null
        };
        taskRelatedDataCache.set(id, { ...existingCache, assignee: relatedData.assignee });
      }
    } catch (error) {
      console.error('Error fetching task assignee:', error);
      setAssignee(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (taskId) {
      fetchAssignee(taskId);
    } else {
      setAssignee(null);
    }
  }, [taskId, fetchAssignee]);

  return { assignee, loading };
}