import { useState, useRef, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CompactPersonModal } from "@/components/modals/CompactPersonModal";
import { usePeopleInfinite } from "@/hooks/usePeopleInfinite";
import { useDebounce } from "@/hooks/use-debounce";
import { Check, ChevronsUpDown, Plus, User, Building, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Person, CreatePersonData } from "@/types/api";
import { useToast } from "@/hooks/use-toast";

interface PersonSelectorProps {
  value?: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  label?: string;
  disabled?: boolean;
}

export function PersonSelector({ 
  value, 
  onValueChange, 
  placeholder = "Buscar cliente...", 
  label = "Cliente",
  disabled = false 
}: PersonSelectorProps) {
  const [open, setOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [isPersonModalOpen, setIsPersonModalOpen] = useState(false);
  const [personModalMode, setPersonModalMode] = useState<"individual" | "company">("individual");
  const debouncedSearchTerm = useDebounce(searchTerm, 300);
  const { toast } = useToast();

  // Usar hook de scroll infinito para pessoas
  const { people, isLoading, isFetchingNextPage, hasNextPage, fetchNextPage } = usePeopleInfinite({
    search: debouncedSearchTerm,
    pageSize: 50
  });
  const selectedPerson = people.find(p => p.id === value);

  const handleCreatePerson = async (data: CreatePersonData) => {
    try {
      // Garantir que o tipo correto seja definido antes de salvar
      const dataWithCorrectType = {
        ...data,
        attributes: {
          ...data.attributes,
          kind: personModalMode
        }
      };
      
      const response = await api.createPerson(dataWithCorrectType);
      const newPerson = response.data;
      
      // Selecionar a pessoa recém-criada
      onValueChange(newPerson.id);
      setIsPersonModalOpen(false);
      setOpen(false);
      
      toast({
        title: "Cliente criado com sucesso!",
        description: `${newPerson.attributes.name} foi adicionado à lista de clientes.`
      });
    } catch (error: any) {
      toast({
        title: "Erro ao criar cliente",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const openCreatePersonModal = (type: "individual" | "company") => {
    setPersonModalMode(type);
    setIsPersonModalOpen(true);
    setOpen(false);
  };

  return (
    <>
      <div className="space-y-2">
        {label && <Label>{label}</Label>}
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              role="combobox"
              aria-expanded={open}
              className="w-full justify-between"
              disabled={disabled}
            >
              {selectedPerson ? (
                <div className="flex items-center gap-2">
                  {selectedPerson.attributes.kind === "individual" ? (
                    <User className="h-4 w-4" />
                  ) : (
                    <Building className="h-4 w-4" />
                  )}
                  <span className="truncate">{selectedPerson.attributes.name}</span>
                </div>
              ) : (
                placeholder
              )}
              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-full p-0" align="start">
            <Command>
              <CommandInput 
                placeholder="Digite para buscar cliente..."
                value={searchTerm}
                onValueChange={setSearchTerm}
              />
              <CommandList>
                <CommandEmpty>
                  <div className="p-4 text-center space-y-3">
                    <p className="text-sm text-muted-foreground">
                      {searchTerm ? "Nenhum cliente encontrado" : "Digite pelo menos 2 caracteres para buscar"}
                    </p>
                    <div className="flex flex-col gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openCreatePersonModal("individual")}
                        className="w-full"
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Criar Pessoa Física
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openCreatePersonModal("company")}
                        className="w-full"
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Criar Pessoa Jurídica
                      </Button>
                    </div>
                  </div>
                </CommandEmpty>
                <CommandGroup>
                  {people.filter(person => person.id && person.id.trim() !== "").map((person) => (
                    <CommandItem
                      key={person.id}
                      value={person.id}
                      onSelect={() => {
                        onValueChange(person.id === value ? "" : person.id);
                        setOpen(false);
                      }}
                    >
                      <Check
                        className={cn(
                          "mr-2 h-4 w-4",
                          value === person.id ? "opacity-100" : "opacity-0"
                        )}
                      />
                      <div className="flex items-center gap-2 flex-1">
                        {person.attributes.kind === "individual" ? (
                          <User className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <Building className="h-4 w-4 text-muted-foreground" />
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="font-medium truncate">{person.attributes.name}</div>
                          <div className="text-xs text-muted-foreground truncate">
                            {person.attributes.email || person.attributes.cpf || person.attributes.cnpj || `#${person.attributes.code}`}
                          </div>
                        </div>
                      </div>
                    </CommandItem>
                  ))}
                </CommandGroup>
                {/* Botão para carregar mais resultados */}
                {hasNextPage && people.length > 0 && (
                  <CommandGroup>
                    <div className="p-2 border-t">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => fetchNextPage()}
                        disabled={isFetchingNextPage}
                        className="w-full"
                      >
                        {isFetchingNextPage ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Carregando...
                          </>
                        ) : (
                          "Carregar mais resultados"
                        )}
                      </Button>
                    </div>
                  </CommandGroup>
                )}
                
                {/* Botões para criar nova pessoa */}
                {people.length > 0 && (
                  <CommandGroup>
                    <div className="p-2 border-t">
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openCreatePersonModal("individual")}
                          className="flex-1"
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          Pessoa Física
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openCreatePersonModal("company")}
                          className="flex-1"
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          Pessoa Jurídica
                        </Button>
                      </div>
                    </div>
                  </CommandGroup>
                )}
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      </div>

      <CompactPersonModal
        person={personModalMode === "company" ? { attributes: { kind: "company" } } as any : null}
        isOpen={isPersonModalOpen}
        mode="create"
        onClose={() => setIsPersonModalOpen(false)}
        onSave={handleCreatePerson}
      />
    </>
  );
}