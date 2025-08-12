import { useState, useEffect, useCallback } from "react";
import { useInfiniteQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Person } from "@/types/api";

interface UsePeopleInfiniteScrollOptions {
  search?: string;
  kindFilter?: string;
  pageSize?: number;
  enabledSearch?: boolean;
}

export function usePeopleInfiniteScroll({ 
  search = "", 
  kindFilter = "all",
  pageSize = 50,
  enabledSearch = false
}: UsePeopleInfiniteScrollOptions = {}) {
  
  const query = useInfiniteQuery({
    queryKey: ["people-infinite-scroll", search, kindFilter, pageSize],
    queryFn: async ({ pageParam = 1 }) => {
      console.log("Fetching people page:", pageParam);
      
      // Preparar filtros para a API
      const filters: Record<string, string> = {};
      if (kindFilter !== "all") {
        filters.kind = kindFilter;
      }

      // Se é uma busca habilitada e tem termo, buscar com o termo
      // Senão, buscar todas as pessoas
      const response = await api.getPeople({
        page: pageParam,
        size: pageSize,
        search: enabledSearch && search && search.length >= 2 ? search : undefined,
        filter: filters,
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
    enabled: true, // Sempre habilitado para carregar pessoas
    staleTime: 2 * 60 * 1000, // Cache por 2 minutos
  });

  // Flatten das páginas em uma lista única
  const allPeople: Person[] = query.data?.pages?.flatMap(page => page.data) || [];
  
  const loadMore = useCallback(() => {
    if (query.hasNextPage && !query.isFetchingNextPage) {
      query.fetchNextPage();
    }
  }, [query]);

  // Hook para detectar scroll no final da página
  useEffect(() => {
    const handleScroll = () => {
      if (
        window.innerHeight + document.documentElement.scrollTop + 1000 >=
        document.documentElement.offsetHeight
      ) {
        loadMore();
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [loadMore]);
  
  return {
    ...query,
    people: allPeople,
    totalCount: query.data?.pages?.[0]?.meta?.total || 0,
    loadMore,
  };
}