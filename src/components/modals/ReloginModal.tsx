import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";

interface ReloginModalProps {
  isOpen: boolean;
  onRelogin: () => void;
  onCancel: () => void;
}

export function ReloginModal({ isOpen, onRelogin, onCancel }: ReloginModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={() => {}}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-yellow-100 dark:bg-yellow-900/30 flex items-center justify-center">
              <AlertTriangle className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
            </div>
            <div>
              <DialogTitle>Sessão Expirada</DialogTitle>
              <DialogDescription>
                Sua sessão expirou ou está prestes a expirar. Faça login novamente para continuar.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>
        
        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button variant="outline" onClick={onCancel}>
            Cancelar
          </Button>
          <Button onClick={onRelogin} className="w-full sm:w-auto">
            Fazer Login Novamente
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}