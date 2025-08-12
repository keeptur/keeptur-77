import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";

interface TaskRelationshipData {
  person: any | null;
  assignee: any | null;
  category: any | null;
}

// Cache global para relacionamentos de tarefas
const relationshipsCache = new Map<string, TaskRelationshipData>();

export function useTaskRelationshipsOptimized(taskId: string | null) {
  return useQuery({
    queryKey: ["task-relationships", taskId],
    queryFn: async () => {
      if (!taskId) return null;
      
      // Verificar cache primeiro
      const cached = relationshipsCache.get(taskId);
      if (cached) {
        return cached;
      }

      console.log("Fetching task relationships for:", taskId);
      
      // Usar o método correto da API que já existe
      const relationshipData = await api.getTaskRelatedData(taskId);

      // Armazenar no cache
      relationshipsCache.set(taskId, relationshipData);
      
      console.log("Task relationships loaded:", relationshipData);
      return relationshipData;
    },
    enabled: !!taskId,
    staleTime: 10 * 60 * 1000, // 10 minutos
    gcTime: 15 * 60 * 1000, // 15 minutos (novo nome no react-query v5)
    retry: 1
  });
}

// Hook para limpar cache quando necessário
export function clearTaskRelationshipsCache(taskId?: string) {
  if (taskId) {
    relationshipsCache.delete(taskId);
  } else {
    relationshipsCache.clear();
  }
}