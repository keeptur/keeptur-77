import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { TaskHistoric } from "@/types/api";

export function useTaskHistorics(taskId: string | null) {
  return useQuery({
    queryKey: ["task-historics", taskId],
    queryFn: async () => {
      if (!taskId) return [];
      
      console.log("Fetching task historics for:", taskId);
      
      // Try direct task relationship endpoint first (most efficient)
      try {
        console.log("Trying direct task relationship endpoint");
        const response = await api.getTaskRelationship(taskId, 'task-historics');
        console.log("Direct relationship endpoint success:", response);
        const data = Array.isArray(response.data) ? response.data : [response.data].filter(Boolean);
        
        // Remove duplicates by ID and apply robust frontend sorting
        const uniqueData = data.reduce((acc: any[], current: any) => {
          const existingIndex = acc.findIndex(item => item.id === current.id);
          if (existingIndex === -1) {
            acc.push(current);
          }
          return acc;
        }, []);

        const sortedData = uniqueData.sort((a, b) => {
          const getValidDate = (historic: any) => {
            const dateTime = historic.attributes?.["date-time"];
            const createdAt = historic.attributes?.["created-at"];
            
            if (dateTime) {
              const date = new Date(dateTime);
              if (!isNaN(date.getTime())) return date;
            }
            
            if (createdAt) {
              const date = new Date(createdAt);
              if (!isNaN(date.getTime())) return date;
            }
            
            return new Date(0); // Fallback to epoch
          };
          
          const dateA = getValidDate(a);
          const dateB = getValidDate(b);
          
          return dateB.getTime() - dateA.getTime(); // Most recent first
        });
        
        console.log("Sorted historics data:", sortedData.length, "items, first 3 dates:", 
          sortedData.slice(0, 3).map(h => ({
            id: h.id,
            dateTime: h.attributes?.["date-time"],
            createdAt: h.attributes?.["created-at"]
          }))
        );
        
        return sortedData;
      } catch (error) {
        console.warn("Direct relationship endpoint failed:", error);
      }
      
      // Try multiple filter formats based on common API patterns
      const filterAttempts = [
        { "task-id": taskId },
        { "task_id": taskId },
        { "task": taskId },
        { "taskId": taskId }
      ];
      
      for (const filter of filterAttempts) {
        try {
          console.log("Trying filter format:", filter);
          const response = await api.getTaskHistorics({
            filter,
            sort: "-date-time",
            size: 100
          });
          
          if (response.data && response.data.length > 0) {
            console.log("Task historics loaded with filter:", filter, response.data.length, "items");
            
            // Remove duplicates and apply same sorting logic
            const uniqueData = response.data.reduce((acc: any[], current: any) => {
              const existingIndex = acc.findIndex(item => item.id === current.id);
              if (existingIndex === -1) {
                acc.push(current);
              }
              return acc;
            }, []);

            const sortedData = uniqueData.sort((a, b) => {
              const getValidDate = (historic: any) => {
                const dateTime = historic.attributes?.["date-time"];
                const createdAt = historic.attributes?.["created-at"];
                
                if (dateTime) {
                  const date = new Date(dateTime);
                  if (!isNaN(date.getTime())) return date;
                }
                
                if (createdAt) {
                  const date = new Date(createdAt);
                  if (!isNaN(date.getTime())) return date;
                }
                
                return new Date(0);
              };
              
              const dateA = getValidDate(a);
              const dateB = getValidDate(b);
              
              return dateB.getTime() - dateA.getTime();
            });
            
            return sortedData;
          }
        } catch (error) {
          console.warn("Filter attempt failed:", filter, error);
          continue;
        }
      }
      
      // If all specific filters fail, try without filter and filter client-side
      try {
        console.log("Trying to fetch all historics and filter client-side");
        const response = await api.getTaskHistorics({
          sort: "-date-time", 
          size: 500
        });
        
        // Filter client-side if we have task relationships
        const allHistorics = response.data || [];
        console.log("All historics fetched:", allHistorics.length);
        
        // Try multiple relationship patterns for filtering
        const filtered = allHistorics.filter(historic => {
          // Pattern 1: Check relationships.task.data.id
          const taskRelation = historic.relationships?.task;
          if (taskRelation && 'data' in taskRelation && taskRelation.data) {
            return (taskRelation.data as any).id === taskId;
          }
          
          // Pattern 2: Check attributes.task-id or task_id
          const taskIdAttr = historic.attributes?.["task-id"] || historic.attributes?.["task_id"];
          if (taskIdAttr === taskId) {
            return true;
          }
          
          // Pattern 3: Check if historic contains taskId in any additional field
          // (removing invalid attribute check)
          
          return false;
        });
        
        console.log("Client-side filtered historics:", filtered.length);
        
        // Remove duplicates from filtered results and apply sorting
        const uniqueFiltered = filtered.reduce((acc: any[], current: any) => {
          const existingIndex = acc.findIndex(item => item.id === current.id);
          if (existingIndex === -1) {
            acc.push(current);
          }
          return acc;
        }, []);

        const sortedFiltered = uniqueFiltered.sort((a, b) => {
          const getValidDate = (historic: any) => {
            const dateTime = historic.attributes?.["date-time"];
            const createdAt = historic.attributes?.["created-at"];
            
            if (dateTime) {
              const date = new Date(dateTime);
              if (!isNaN(date.getTime())) return date;
            }
            
            if (createdAt) {
              const date = new Date(createdAt);
              if (!isNaN(date.getTime())) return date;
            }
            
            return new Date(0);
          };
          
          const dateA = getValidDate(a);
          const dateB = getValidDate(b);
          
          return dateB.getTime() - dateA.getTime();
        });
        
        console.log("Final sorted filtered historics:", sortedFiltered.length, "items, first 3 dates:", 
          sortedFiltered.slice(0, 3).map(h => ({
            id: h.id,
            dateTime: h.attributes?.["date-time"],
            createdAt: h.attributes?.["created-at"]
          }))
        );
        
        return sortedFiltered;
      } catch (error) {
        console.error("All attempts failed:", error);
        return [];
      }
    },
    enabled: !!taskId,
    staleTime: 0, // Always consider data stale for real-time updates
    gcTime: 0, // Don't keep in cache - always fetch fresh data
    retry: 3,
    refetchOnWindowFocus: true,
    refetchOnMount: true,
    refetchInterval: 10000 // Auto-refresh every 10 seconds
  });
}