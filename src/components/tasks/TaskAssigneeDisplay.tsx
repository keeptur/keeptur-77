import { User } from "lucide-react";
import { useTaskAssignee } from "@/hooks/useTaskRelatedData";
import { Badge } from "@/components/ui/badge";

interface TaskAssigneeDisplayProps {
  taskId: string;
  variant?: "badge" | "text" | "compact";
  showIcon?: boolean;
}

export function TaskAssigneeDisplay({ 
  taskId, 
  variant = "text", 
  showIcon = true 
}: TaskAssigneeDisplayProps) {
  const { assignee, loading } = useTaskAssignee(taskId);

  if (loading) {
    return (
      <div className="flex items-center gap-1">
        {showIcon && <User className="h-3 w-3" />}
        <div className="h-4 w-16 bg-muted animate-pulse rounded"></div>
      </div>
    );
  }

  if (!assignee) {
    return (
      <div className="flex items-center gap-1 text-muted-foreground">
        {showIcon && <User className="h-3 w-3" />}
        <span className="text-xs">Não atribuído</span>
      </div>
    );
  }

  const assigneeName = assignee.attributes?.name || "Usuário";

  if (variant === "badge") {
    return (
      <Badge variant="secondary" className="flex items-center gap-1">
        {showIcon && <User className="h-3 w-3" />}
        <span className="text-xs">{assigneeName}</span>
      </Badge>
    );
  }

  if (variant === "compact") {
    return (
      <div className="flex items-center gap-1 text-xs text-muted-foreground">
        {showIcon && <User className="h-3 w-3" />}
        <span className="truncate max-w-20" title={assigneeName}>
          {assigneeName}
        </span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1 text-sm">
      {showIcon && <User className="h-4 w-4 text-muted-foreground" />}
      <span>{assigneeName}</span>
    </div>
  );
}