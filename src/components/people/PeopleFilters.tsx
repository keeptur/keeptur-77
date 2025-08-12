import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Search, List, Grid } from "lucide-react";
interface PeopleFiltersProps {
  searchTerm: string;
  kindFilter: string;
  onSearchChange: (value: string) => void;
  onKindFilterChange: (value: string) => void;
  isFetching?: boolean;
  viewMode?: "table" | "grid";
  onViewModeChange?: (mode: "table" | "grid") => void;
  onSearchSubmit?: () => void;
}
export function PeopleFilters({
  searchTerm,
  kindFilter,
  onSearchChange,
  onKindFilterChange,
  isFetching,
  viewMode,
  onViewModeChange,
  onSearchSubmit
}: PeopleFiltersProps) {
  return <div className="bg-card rounded-lg border border-border/50 p-6 shadow-sm">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
        {/* Busca */}
        <div className="lg:col-span-2">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Input
                value={searchTerm}
                onChange={(e) => onSearchChange(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') onSearchSubmit?.();
                }}
                placeholder="Buscar pessoas..."
                disabled={isFetching}
                className="pl-8 shadow-sm border-border/50"
              />
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            </div>
            <Button
              onClick={onSearchSubmit}
              disabled={isFetching}
              className="shrink-0"
            >
              <Search className="h-4 w-4 mr-2" />
              Pesquisar
            </Button>
          </div>
        </div>

        {/* Tipo de Cliente */}
        <div>
          <Select value={kindFilter} onValueChange={onKindFilterChange}>
            <SelectTrigger className="shadow-sm border-border/50">
              <SelectValue placeholder="Tipo de Cliente" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os Tipos</SelectItem>
              <SelectItem value="individual">Pessoa Física</SelectItem>
              <SelectItem value="company">Pessoa Jurídica</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Cidade */}
        <div>
          <Select>
            <SelectTrigger className="shadow-sm border-border/50">
              <SelectValue placeholder="Cidade" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas</SelectItem>
              <SelectItem value="sao-paulo">São Paulo</SelectItem>
              <SelectItem value="rio-janeiro">Rio de Janeiro</SelectItem>
              <SelectItem value="belo-horizonte">Belo Horizonte</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Estado */}
        <div>
          <Select>
            <SelectTrigger className="shadow-sm border-border/50">
              <SelectValue placeholder="Estado" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="SP">SP</SelectItem>
              <SelectItem value="RJ">RJ</SelectItem>
              <SelectItem value="MG">MG</SelectItem>
              <SelectItem value="ES">ES</SelectItem>
              <SelectItem value="SC">SC</SelectItem>
              <SelectItem value="RS">RS</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Alternar visualização */}
        <div className="lg:col-span-1 flex items-center justify-start lg:justify-end">
          <div className="flex items-center gap-1 bg-muted/50 rounded-lg p-1">
            <Button
              variant={viewMode === "table" ? "default" : "ghost"}
              size="sm"
              onClick={() => onViewModeChange?.("table")}
              className="h-8 px-3"
              aria-label="Ver em lista"
            >
              <List className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === "grid" ? "default" : "ghost"}
              size="sm"
              onClick={() => onViewModeChange?.("grid")}
              className="h-8 px-3"
              aria-label="Ver em cards"
            >
              <Grid className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Checkbox Somente pagante - alinhado à esquerda na linha de baixo */}
      <div className="mt-4 pt-4 border-t border-border/50">
        <div className="flex items-center space-x-2">
          <Checkbox id="paying-only" />
          <label htmlFor="paying-only" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
            Somente pagante
          </label>
        </div>
      </div>
    </div>;
}