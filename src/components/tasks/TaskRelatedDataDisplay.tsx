import { User, Building, Tag, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useTaskRelationshipsOptimized } from "@/hooks/useTaskRelationshipsOptimized";

interface TaskRelatedDataDisplayProps {
  taskId: string;
}

export function TaskRelatedDataDisplay({ taskId }: TaskRelatedDataDisplayProps) {
  // Usar hook otimizado para dados relacionados
  const { data: relatedData, isLoading, error } = useTaskRelationshipsOptimized(taskId);

  if (isLoading) {
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <User className="h-4 w-4" />
          <span className="text-sm font-medium">Cliente</span>
        </div>
        <div className="text-sm text-muted-foreground">Nenhum cliente</div>
        
        <div className="flex items-center gap-2">
          <User className="h-4 w-4" />
          <span className="text-sm font-medium">Responsável</span>
        </div>
        <div className="text-sm text-muted-foreground">Nenhum responsável</div>
        
        <div className="flex items-center gap-2">
          <Tag className="h-4 w-4" />
          <span className="text-sm font-medium">Categoria</span>
        </div>
        <div className="text-sm text-muted-foreground">Nenhuma categoria</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-muted-foreground">
          Erro ao carregar dados relacionados
        </p>
      </div>
    );
  }

  const { person, assignee, category } = relatedData || {};

  return (
    <div className="space-y-4">
      {/* Cliente/Pessoa */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <User className="h-4 w-4" />
          <span className="text-sm font-medium">Cliente</span>
        </div>
        {person ? (
          <div className="text-sm text-foreground">
            {person.attributes?.name || 
             person.attributes?.["full-name"] || 
             `Cliente ${person.id}`}
          </div>
        ) : (
          <div className="text-sm text-muted-foreground">
            Nenhum cliente
          </div>
        )}
      </div>

      {/* Responsável */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <User className="h-4 w-4" />
          <span className="text-sm font-medium">Responsável</span>
        </div>
        {assignee ? (
          <div className="text-sm text-foreground">
            {assignee.attributes?.name || 
             assignee.attributes?.["full-name"] || 
             `Usuário ${assignee.id}`}
          </div>
        ) : (
          <div className="text-sm text-muted-foreground">
            Nenhum responsável
          </div>
        )}
      </div>

      {/* Categoria */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <Tag className="h-4 w-4" />
          <span className="text-sm font-medium">Categoria</span>
        </div>
        {category ? (
          <div className="text-sm text-foreground">
            {category.attributes?.name || 
             category.attributes?.description || 
             `Categoria ${category.id}`}
          </div>
        ) : (
          <div className="text-sm text-muted-foreground">
            Nenhuma categoria
          </div>
        )}
      </div>
    </div>
  );
}