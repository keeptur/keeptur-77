import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { UserManagement } from "@/components/plans/UserManagement";

interface ManageUsersModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  planSeats: number;
  users: string[];
  onUsersUpdate: (users: string[]) => void;
}

export function ManageUsersModal({ open, onOpenChange, planSeats, users, onUsersUpdate }: ManageUsersModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Gerenciar usuários do plano</DialogTitle>
        </DialogHeader>
        {/* Reuso do gerenciador existente */}
        <UserManagement planSeats={planSeats} currentUsers={users} onUsersUpdate={onUsersUpdate} />
      </DialogContent>
    </Dialog>
  );
}
