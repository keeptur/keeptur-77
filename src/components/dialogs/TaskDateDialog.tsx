import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar, Clock, X, AlertTriangle } from "lucide-react";
import { format, addHours, isBefore, isAfter } from "date-fns";

interface TaskDateDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (newDate: string) => void;
  taskTitle: string;
  mode: "reopen" | "overdue";
  target?: "pending" | "overdue" | "completed";
  context?: "move" | "restore" | "reopen";
  hideDateInput?: boolean;
}

export function TaskDateDialog({ isOpen, onClose, onConfirm, taskTitle, mode, target, context, hideDateInput }: TaskDateDialogProps) {
  // Valor padrão depende do destino: overdue (-1h) ou pendente (+1h)
  const effectiveTarget = target || (mode === "overdue" ? "overdue" : "pending");
  const isOverdueTarget = effectiveTarget === "overdue";
  const computeDefault = () => format(addHours(new Date(), isOverdueTarget ? -1 : 1), "yyyy-MM-dd'T'HH:mm");
  const [newDate, setNewDate] = useState<string>(computeDefault());
  const [error, setError] = useState<string>("");

  // Corrige bug: ao abrir ou mudar o modo, resetar o valor padrão corretamente
  useEffect(() => {
    if (isOpen) {
      const def = computeDefault();
      setNewDate(def);
      setError("");
    }
  }, [isOpen, mode]);

const handleConfirm = () => {
    // Se for concluir ou esconder o input, não validar data
    if (hideDateInput || effectiveTarget === "completed") {
      onConfirm("");
      onClose();
      return;
    }

    // Validações
    const now = new Date();
    const selected = new Date(newDate);

    if (effectiveTarget === "overdue") {
      if (!isBefore(selected, now)) {
        setError("Para marcar como atrasada, escolha uma data/hora anterior ao momento atual.");
        return;
      }
    } else {
      // pending/reopen -> pendente
      if (!isAfter(selected, now)) {
        setError("Para marcar como pendente, escolha uma data/hora posterior ao momento atual.");
        return;
      }
    }

    onConfirm(newDate);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            {context === "restore" ? "Restaurar Tarefa" : context === "reopen" ? "Reabrir Tarefa" : "Atualizar Data de Vencimento"}
          </DialogTitle>
          <DialogDescription>
            {context === "restore"
              ? "Confirme a restauração desta tarefa."
              : context === "reopen"
              ? "Confirme a reabertura desta tarefa."
              : "Defina a nova data e hora de vencimento."}
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
<p className="text-sm text-muted-foreground">
            A tarefa "<span className="font-medium">{taskTitle}</span>" {context === "restore" ? "será restaurada" : context === "reopen" ? "será reaberta" : "será atualizada"}.
          </p>
          <div className="rounded-md bg-muted/50 p-3 text-xs">
            {effectiveTarget === "overdue" ? (
              <p>
                Regra: a data/hora deve ser anterior ao momento atual. Se não alterar, usaremos automaticamente {format(addHours(new Date(), -1), "dd/MM/yyyy 'às' HH:mm")} (-1h).
              </p>
            ) : effectiveTarget === "completed" ? (
              <p>
                Confirme para concluir a tarefa. Não é necessário informar data/hora.
              </p>
            ) : (
              <p>
                Regra: a data/hora deve ser posterior ao momento atual. Se não alterar, usaremos automaticamente {format(addHours(new Date(), 1), "dd/MM/yyyy 'às' HH:mm")} (+1h).
              </p>
            )}
          </div>
          
<div className="space-y-2">
            {effectiveTarget !== "completed" && !hideDateInput && (
              <>
                <Label htmlFor="newDate">Nova Data e Hora de Vencimento</Label>
                <div className="relative">
                  <Clock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="newDate"
                    type="datetime-local"
                    value={newDate}
                    onChange={(e) => {
                      setNewDate(e.target.value);
                      setError("");
                    }}
                    className="pl-10"
                  />
                </div>
              </>
            )}
            {error && (
              <div className="flex items-center gap-2 text-destructive text-xs mt-1">
                <AlertTriangle className="h-3 w-3" />
                <span>{error}</span>
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2">
          <Button variant="outline" onClick={onClose}>
            <X className="h-4 w-4 mr-2" />
            Cancelar
          </Button>
          <Button onClick={handleConfirm}>
            <Calendar className="h-4 w-4 mr-2" />
            Confirmar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}