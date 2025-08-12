import { useInfiniteQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Person } from "@/types/api";

interface UsePeopleInfiniteOptions {
  search?: string;
  filter?: Record<string, string>;
  pageSize?: number;
}

export function usePeopleInfinite({ 
  search = "", 
  filter = {},
  pageSize = 50 
}: UsePeopleInfiniteOptions = {}) {
  
  const query = useInfiniteQuery({
    queryKey: ["people-infinite", search, filter, pageSize],
    queryFn: async ({ pageParam = 1 }) => {
      console.log("Fetching people page:", pageParam);
      
      // Buscar todas as pessoas com tamanho maior de página para ter todos os resultados
      const response = await api.getPeople({
        page: pageParam,
        size: search && search.length >= 2 ? 1000 : pageSize, // Buscar até 1000 pessoas se tiver busca
        search: search,
        filter: filter,
        sort: "-registered-at" // Ordenar por mais recentes
      });
      
      return response;
    },
    initialPageParam: 1,
    getNextPageParam: (lastPage, pages) => {
      const currentPage = pages.length;
      const totalPages = Math.ceil((lastPage.meta?.total || 0) / pageSize);
      
      if (currentPage < totalPages) {
        return currentPage + 1;
      }
      return undefined;
    },
    enabled: true, // Sempre habilitado
    staleTime: 2 * 60 * 1000, // Cache por 2 minutos
  });

  // Flatten das páginas em uma lista única
  const allPeople: Person[] = query.data?.pages?.flatMap(page => page.data) || [];
  
  return {
    ...query,
    people: allPeople,
    totalCount: query.data?.pages?.[0]?.meta?.total || 0,
  };
}