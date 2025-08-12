
import { useQuery } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search } from "lucide-react";
import { api } from "@/lib/api";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

interface TaskFiltersProps {
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  statusFilter: string;
  setStatusFilter: (status: string) => void;
  categoryFilter?: string;
  setCategoryFilter?: (category: string) => void;
  assigneeFilter?: string;
  setAssigneeFilter?: (assignee: string) => void;
  dateType?: string;
  setDateType?: (type: string) => void;
  startDate?: string;
  setStartDate?: (date: string) => void;
  endDate?: string;
  setEndDate?: (date: string) => void;
  priorityFilter?: string;
  setPriorityFilter?: (priority: string) => void;
  showDeleted?: boolean;
  setShowDeleted?: (value: boolean) => void;
}

export function TaskFilters({ 
  searchTerm, 
  setSearchTerm, 
  statusFilter, 
  setStatusFilter,
  categoryFilter = "",
  setCategoryFilter,
  assigneeFilter = "",
  setAssigneeFilter,
  dateType = "",
  setDateType,
  startDate = "",
  setStartDate,
  endDate = "",
  setEndDate,
  priorityFilter = "",
  setPriorityFilter,
  showDeleted = false,
  setShowDeleted
}: TaskFiltersProps) {
  // Buscar categorias de tarefas
  const { data: categoriesResponse } = useQuery({
    queryKey: ["task-categories"],
    queryFn: () => api.getTaskCategories({ size: 1000 }),
    staleTime: 10 * 60 * 1000 // 10 minutos
  });

  // Buscar usuários da empresa (para lista de responsáveis)
  const { data: usersResponse } = useQuery({
    queryKey: ["company-users"],
    queryFn: () => api.getCompanyUsers(),
    staleTime: 5 * 60 * 1000 // 5 minutos
  });

  const categories = categoriesResponse?.data || [];
  const users = usersResponse?.data || [];
  return (
    <div className="flex flex-wrap gap-3 mb-6">
      <div className="flex gap-2">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar tarefas..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 w-64 rounded-button"
          />
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Filtrar tarefas" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as Tarefas</SelectItem>
            <SelectItem value="mine">Minhas Tarefas</SelectItem>
          </SelectContent>
        </Select>

        {setDateType && (
          <Select value={dateType} onValueChange={setDateType}>
            <SelectTrigger className="w-36">
              <SelectValue placeholder="Data de:" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas</SelectItem>
              <SelectItem value="cadastro">Cadastro</SelectItem>
              <SelectItem value="conclusao">Conclusão</SelectItem>
              <SelectItem value="vencimento">Vencimento</SelectItem>
            </SelectContent>
          </Select>
        )}
        
        {setStartDate && setEndDate && (
          <div className="flex items-center gap-2">
            <input 
              type="date" 
              value={startDate}
              onChange={(e) => setStartDate?.(e.target.value)}
              className="px-3 py-2 border border-input bg-background rounded-button text-sm"
            />
            <span className="text-sm text-muted-foreground">até</span>
            <input 
              type="date" 
              value={endDate}
              onChange={(e) => setEndDate?.(e.target.value)}
              className="px-3 py-2 border border-input bg-background rounded-button text-sm"
            />
          </div>
        )}
      </div>

      {setAssigneeFilter && (
        <Select value={assigneeFilter} onValueChange={setAssigneeFilter}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Todos os Responsáveis" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os Responsáveis</SelectItem>
            {users.filter(user => user.id && user.id.trim() !== "").map((user) => (
              <SelectItem key={user.id} value={user.id}>
                {user.attributes?.name || user.attributes?.["full-name"] || `Usuário ${user.id}`}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {setCategoryFilter && (
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Todas as Categorias" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as Categorias</SelectItem>
            {categories.filter(category => category.id && category.id.trim() !== "").map((category) => (
              <SelectItem key={category.id} value={category.id}>
                {category.attributes?.name || `Categoria ${category.id}`}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}


      {setPriorityFilter && (
        <Select value={priorityFilter} onValueChange={setPriorityFilter}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Prioridade" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas</SelectItem>
            <SelectItem value="low">Baixa</SelectItem>
            <SelectItem value="medium">Média</SelectItem>
            <SelectItem value="high">Alta</SelectItem>
          </SelectContent>
        </Select>
      )}

      <div className="flex items-center gap-2 pl-2 border-l">
        <Switch id="show-deleted" checked={showDeleted} onCheckedChange={(v) => setShowDeleted?.(!!v)} />
        <Label htmlFor="show-deleted" className="text-sm">Mostrar Tarefas Excluídas</Label>
      </div>
    </div>
  );
}
