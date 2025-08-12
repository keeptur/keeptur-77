import { Task, TaskHistoric } from "@/types/api";

export type DerivedStatus = "deleted" | "completed" | "restored" | undefined;

function normalize(input?: string | null): string {
  if (!input) return "";
  try {
    return input
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase();
  } catch {
    return String(input).toLowerCase();
  }
}

function extractTaskIdFromRelated(related?: string): string | undefined {
  if (!related) return undefined;
  try {
    const parts = related.split("/");
    return parts[parts.length - 1];
  } catch {
    return undefined;
  }
}

function parseHistoricEntry(h: TaskHistoric): DerivedStatus {
  const attr = h.attributes || {};
  const text = [attr.historic, attr.text, attr.description].filter(Boolean).join(" \n ");
  const n = normalize(text);
  const newStatus = normalize((attr as any)["new-status"]);

  // Sinais de RESTAURAÇÃO/REABERTURA (precisa limpar indicador de exclusão)
  if (n.includes("restaur") || n.includes("reabr")) return "restored";

  // Exclusão/cancelamento
  if (
    n.includes("exclu") || // excluído, excluida
    n.includes("cancel") || // cancelado, canceled
    n.includes("inativ") || // inativado
    n.includes("apag") ||   // apagado
    n.includes("removed") ||
    newStatus.includes("exclu") ||
    newStatus.includes("cancel")
  ) {
    return "deleted";
  }

  // Conclusão
  if (
    n.includes("conclu") || // concluída
    n.includes("finaliz") || // finalizada
    n.includes("done") ||
    newStatus.includes("conclu") ||
    newStatus.includes("finaliz") ||
    newStatus.includes("done")
  ) {
    return "completed";
  }

  return undefined;
}

function getHistoricDate(h: TaskHistoric): number {
  const dt = (h.attributes && ((h.attributes as any)["date-time"] || (h.attributes as any)["created-at"])) as string | undefined;
  return dt ? new Date(dt).getTime() : 0;
}

export function deriveLastStatusMap(
  historics?: TaskHistoric[] | null,
  included?: any[] | null
): Record<string, "deleted" | "completed"> {
  const result: Record<string, "deleted" | "completed"> = {};

  // Merge historics from main array and included
  const merged: TaskHistoric[] = [];
  if (Array.isArray(historics)) merged.push(...historics);
  if (Array.isArray(included)) {
    for (const item of included) {
      if (item && (item.type === "task-historics" || item.type === "task_historics")) {
        merged.push(item as TaskHistoric);
      }
    }
  }

  // Dedupe by id
  const byId = new Map<string, TaskHistoric>();
  for (const h of merged) {
    if (h && (h as any).id) byId.set((h as any).id, h);
  }
  const events = Array.from(byId.values());

  // Sort by date ascending so last event per task wins
  events.sort((a, b) => getHistoricDate(a) - getHistoricDate(b));

  const getTaskId = (h: TaskHistoric): string | undefined => {
    const rel = h.relationships as any;
    const related: string | undefined = rel?.task?.links?.related;
    const fromRelated = extractTaskIdFromRelated(related);
    if (fromRelated) return fromRelated;
    const dataId = rel?.task && typeof rel.task === 'object' && 'data' in rel.task ? rel.task.data?.id : undefined;
    if (dataId) return dataId;
    const attr: any = h.attributes || {};
    return (attr["task-id"] || attr["task_id"]) as string | undefined;
  };

  for (const h of events) {
    const taskId = getTaskId(h);
    if (!taskId) continue;
    const parsed = parseHistoricEntry(h);
    if (parsed === "restored") {
      delete result[taskId];
      continue;
    }
    if (parsed === "deleted") {
      result[taskId] = "deleted";
    } else if (parsed === "completed") {
      result[taskId] = "completed";
    }
  }

  return result;
}
