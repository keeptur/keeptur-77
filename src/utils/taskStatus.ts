
import { Task } from "@/types/api";
import { isPast } from "date-fns";

export type TaskStatus = "pending" | "overdue" | "completed" | "deleted";

export function getTaskStatus(task: Task): TaskStatus {
  // Primeiro verificar se a tarefa foi deletada/excluída (inclui cancelada)
  // A API pode marcar exclusão/cancelamento de diversas formas (português/inglês, com/sem acento, boolean/date flags)
  const attrs: any = task.attributes as any;

  // Normaliza strings removendo acentos e deixando minúsculas
  const rawStatus = typeof attrs.status === "string" ? attrs.status
    : typeof attrs.situation === "string" ? attrs.situation
    : typeof attrs.situacao === "string" ? attrs.situacao
    : typeof attrs["status-name"] === "string" ? attrs["status-name"]
    : typeof attrs.statusName === "string" ? attrs.statusName
    : undefined;
  const normalizedStatus = rawStatus
    ? rawStatus.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase()
    : undefined;

  // Sinalizadores comuns para exclusão/cancelamento
  const deletedFlag = attrs.deleted ?? attrs.excluded ?? attrs["is-deleted"] ?? attrs["is_deleted"] ?? attrs["is-excluded"] ?? attrs["is_excluded"]; 
  const deletedAt = attrs["deleted-at"] || attrs["deleted_at"] || attrs["deletedAt"]; 
  const excludedAt = attrs["excluded-at"] || attrs["excluded_at"] || attrs["excludedAt"]; 
  const canceledAt = attrs["cancelled-at"] || attrs["cancelled_at"] || attrs["cancelledAt"] || attrs["canceled-at"] || attrs["canceled_at"] || attrs["canceledAt"]; 
  const visibleFlag = attrs.visible ?? attrs["is-visible"] ?? attrs["is_visible"] ?? attrs.isVisible;

  const truthyish = (v: any) => {
    if (v == null) return false;
    if (typeof v === "string") {
      const s = v.trim().toLowerCase();
      return ["1","true","yes","y","on","sim","s","verdadeiro"].includes(s);
    }
    return v === true || v === 1;
  };
  const falsyish = (v: any) => {
    if (v == null) return false;
    if (typeof v === "string") {
      const s = v.trim().toLowerCase();
      return ["0","false","no","n","off","nao","não","falso"].includes(s);
    }
    return v === false || v === 0;
  };

  // Considerar exclusão por flags/datas e também por status textual comum
  const statusIndicatesDeleted = !!normalizedStatus && (normalizedStatus.includes("exclu") || normalizedStatus.includes("cancel"));
  const isDeleted = truthyish(deletedFlag) || !!deletedAt || !!excludedAt || falsyish(visibleFlag) || statusIndicatesDeleted;

  if (isDeleted) {
    return "deleted";
  }
  
  // Verificar se foi concluída
  const completedFlag = attrs.completed ?? attrs["is-completed"] ?? attrs["is_completed"];
  const completedAt = attrs["completed-at"] || attrs["completed_at"] || attrs["completedAt"];
  const statusIndicatesCompleted = !!normalizedStatus && (
    normalizedStatus === "completed" ||
    normalizedStatus === "done" ||
    normalizedStatus.startsWith("conclu") || // "concluida", "concluído"
    normalizedStatus.startsWith("finaliz")   // "finalizada"
  );
  if (truthyish(completedFlag) || statusIndicatesCompleted || !!completedAt) {
    return "completed";
  }
  
  // Se a tarefa tem data de vencimento no passado, está atrasada
  if (task.attributes.due && isPast(new Date(task.attributes.due))) {
    return "overdue";
  }
  
  return "pending";
}

export function getStatusColor(status: TaskStatus): string {
  switch (status) {
    case "pending":
      return "bg-orange-100 border-orange-300 text-orange-800";
    case "overdue":
      return "bg-red-100 border-red-300 text-red-800";
    case "completed":
      return "bg-green-100 border-green-300 text-green-800";
    case "deleted":
      return "bg-gray-100 border-gray-300 text-gray-700";
    default:
      return "bg-gray-100 border-gray-300 text-gray-700";
  }
}

export function getStatusLabel(status: TaskStatus): string {
  switch (status) {
    case "pending":
      return "Pendente";
    case "overdue":
      return "Atrasada";
    case "completed":
      return "Concluída";
    case "deleted":
      return "Excluída";
    default:
      return "Pendente";
  }
}

export const TASK_COLUMNS = [
  { id: "pending", label: "Pendente", status: "pending" as TaskStatus },
  { id: "overdue", label: "Atrasada", status: "overdue" as TaskStatus },
  { id: "completed", label: "Concluída", status: "completed" as TaskStatus },
  { id: "deleted", label: "Excluída", status: "deleted" as TaskStatus },
] as const;
