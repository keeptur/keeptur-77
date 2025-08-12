import { useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Grid, List, Users, Search } from "lucide-react";
import { Person, CreatePersonData, UpdatePersonData } from "@/types/api";
import { CompactPersonModal } from "@/components/modals/CompactPersonModal";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/lib/api";
import { PeopleTableView } from "@/components/people/PeopleTableView";
import { PeopleCardView } from "@/components/people/PeopleCardView";
import { PeopleFilters } from "@/components/people/PeopleFilters";
import { usePeopleInfiniteScroll } from "@/hooks/usePeopleInfiniteScroll";

const PersonSkeleton = () => <div className="space-y-4">
    {Array.from({
    length: 6
  }).map((_, i) => <div key={i} className="border border-border/50 rounded-lg p-4">
        <div className="flex items-center gap-3">
          <Skeleton className="w-10 h-10 rounded-full" />
          <div className="space-y-2 flex-1">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-3 w-24" />
          </div>
          <div className="flex gap-2">
            <Skeleton className="h-8 w-8" />
            <Skeleton className="h-8 w-8" />
            <Skeleton className="h-8 w-8" />
          </div>
        </div>
      </div>)}
  </div>;
export default function People() {
  const {
    toast
  } = useToast();
  const queryClient = useQueryClient();
  const [searchInput, setSearchInput] = useState("");
  const [kindInput, setKindInput] = useState<string>("all");
  const [appliedSearch, setAppliedSearch] = useState("");
  const [appliedKind, setAppliedKind] = useState<string>("all");
  const [selectedPerson, setSelectedPerson] = useState<Person | null>(null);
  const [modalMode, setModalMode] = useState<"create" | "edit" | "view">("view");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [viewMode, setViewMode] = useState<"table" | "grid">("table");
  const [enabledSearch, setEnabledSearch] = useState(false);

  // Usar o hook de scroll infinito
  const {
    people,
    isLoading,
    isFetchingNextPage,
    hasNextPage,
    totalCount,
    loadMore
  } = usePeopleInfiniteScroll({
    search: appliedSearch,
    kindFilter: appliedKind,
    pageSize: 50,
    enabledSearch
  });

  // Filtro estrito no cliente para evitar correspondências "parecidas" (ex.: fabiana vs fabio)
  const normalize = (s: string) =>
    s
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase();
  const filteredPeople = useMemo(() => {
    if (!appliedSearch.trim()) return people;
    const q = normalize(appliedSearch.trim());
    return people.filter((p) => {
      const name = normalize(p.attributes.name || "");
      const email = normalize(p.attributes.email || "");
      const tokens = name.split(/\s+/).filter(Boolean);
      // Regras: palavra inicia com termo OU termo inteiro em alguma palavra; não usar fuzzy
      const starts = tokens.some((t) => t.startsWith(q));
      const wholeWord = (" " + name + " ").includes(" " + q + " ");
      const emailMatch = email.startsWith(q) || email.includes("." + q); // leve ajuda para e-mails
      return starts || wholeWord || emailMatch;
    });
  }, [people, appliedSearch]);

  // Mutations
  const createPersonMutation = useMutation({
    mutationFn: (data: CreatePersonData) => api.createPerson(data),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["people"]
      });
      toast({
        title: "Pessoa criada com sucesso!"
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao criar pessoa",
        description: error.message,
        variant: "destructive"
      });
    }
  });
  const updatePersonMutation = useMutation({
    mutationFn: ({
      id,
      data
    }: {
      id: string;
      data: UpdatePersonData;
    }) => api.updatePerson(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["people"]
      });
      toast({
        title: "Pessoa atualizada com sucesso!"
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao atualizar pessoa",
        description: error.message,
        variant: "destructive"
      });
    }
  });
  const handleNewPerson = () => {
    setSelectedPerson(null);
    setModalMode("create");
    setIsModalOpen(true);
  };
  const handleViewPerson = (person: Person) => {
    setSelectedPerson(person);
    setModalMode("view");
    setIsModalOpen(true);
  };
  const handleEditPerson = (person: Person) => {
    setSelectedPerson(person);
    setModalMode("edit");
    setIsModalOpen(true);
  };
  const handleSavePerson = async (data: CreatePersonData | UpdatePersonData) => {
    if (modalMode === "create") {
      await createPersonMutation.mutateAsync(data as CreatePersonData);
    } else {
      await updatePersonMutation.mutateAsync({
        id: selectedPerson!.id,
        data: data as UpdatePersonData
      });
    }
    setIsModalOpen(false);
  };
  if (isLoading) {
    return <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <Skeleton className="h-8 w-48 mb-2" />
            <Skeleton className="h-4 w-64" />
          </div>
          <Skeleton className="h-10 w-32" />
        </div>
        <Skeleton className="h-32 w-full rounded-lg" />
        <PersonSkeleton />
      </div>;
  }
  return <div className="space-y-6">
      {/* Header da página */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Pessoas</h1>
          <p className="text-muted-foreground">Gerencie clientes e contatos</p>
        </div>
        <div className="flex items-center gap-3" />
      </div>

      {/* Busca e Filtros */}
      <div className="space-y-4">
        <PeopleFilters 
          searchTerm={searchInput}
          onSearchChange={(term) => { setSearchInput(term); }}
          onSearchSubmit={() => {
            const canSearch = !!(searchInput.trim() || kindInput !== "all");
            setAppliedSearch(searchInput.trim());
            setAppliedKind(kindInput);
            setEnabledSearch(canSearch);
          }}
          kindFilter={kindInput}
          onKindFilterChange={setKindInput}
          isFetching={isFetchingNextPage}
          viewMode={viewMode}
          onViewModeChange={setViewMode}
        />
      </div>

      {/* Renderizar pessoas ou mensagem de busca */}
      {enabledSearch ? <>
          {viewMode === "table" ? <PeopleTableView people={filteredPeople} onView={handleViewPerson} onEdit={handleEditPerson} /> : <PeopleCardView people={filteredPeople} onView={handleViewPerson} onEdit={handleEditPerson} />}
          
          {isFetchingNextPage && <div className="text-center py-4">Carregando mais pessoas...</div>}
        </> : <div className="text-center py-16 bg-gradient-to-br from-muted/30 to-muted/50 rounded-xl">
          <Search className="h-16 w-16 text-primary/40 mx-auto mb-6" />
          <h3 className="text-xl font-semibold mb-3 text-foreground">
            Digite para pesquisar pessoas
          </h3>
          <p className="text-muted-foreground mb-6 max-w-md mx-auto">
            Use o campo de busca acima para encontrar clientes, fornecedores e contatos.
          </p>
          <Button onClick={handleNewPerson} size="lg" className="shadow-lg">
            <Plus className="h-5 w-5 mr-2" />
            Cadastrar Nova Pessoa
          </Button>
        </div>}

      <CompactPersonModal person={selectedPerson} isOpen={isModalOpen} mode={modalMode} onClose={() => setIsModalOpen(false)} onSave={handleSavePerson} />
    </div>;
}