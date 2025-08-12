import { useState, useEffect } from "react";
import { format, addHours } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CheckSquare, Plus, Edit3, X, Save, Calendar } from "lucide-react";
import { Task, TaskHistoric, UpdateTaskData } from "@/types/api";
import { useTaskRelationshipsOptimized } from "@/hooks/useTaskRelationshipsOptimized";
import { useTaskHistorics } from "@/hooks/useTaskHistorics";
import { usePeopleInfinite } from "@/hooks/usePeopleInfinite";
import { useTaskManager } from "@/hooks/useTaskManager";
import { api } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getTaskStatus, getStatusLabel, getStatusColor } from "@/utils/taskStatus";
import { TaskDateDialog } from "@/components/dialogs/TaskDateDialog";
interface TaskDetailsModalProps {
  task: Task | null;
  isOpen: boolean;
  onClose: () => void;
  taskHistorics?: TaskHistoric[];
}
export function TaskDetailsModal({
  task,
  isOpen,
  onClose
}: TaskDetailsModalProps) {
  const {
    toast
  } = useToast();
  const queryClient = useQueryClient();
  const [updateText, setUpdateText] = useState("");
  const [nextReturnDate, setNextReturnDate] = useState("");
  const [nextReturnTime, setNextReturnTime] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [selectedPersonId, setSelectedPersonId] = useState<string>("none");
  const [selectedAssigneeId, setSelectedAssigneeId] = useState<string>("none");
const [editedDueDate, setEditedDueDate] = useState<string>("");

  const [isDateDialogOpen, setIsDateDialogOpen] = useState(false);
  const [pendingReopenContext, setPendingReopenContext] = useState<"restore" | "reopen">("reopen");

  // Task manager hook
  const {
    updateTaskStatus,
    updateTaskMutation
  } = useTaskManager();

  // Buscar dados relacionados da tarefa
  const {
    data: relatedData,
    isLoading: loadingRelations
  } = useTaskRelationshipsOptimized(task?.id || null);

  // Buscar históricos da tarefa
  const {
    data: taskHistorics = [],
    isLoading: loadingHistorics
  } = useTaskHistorics(task?.id || null);

  // Buscar pessoas para seleção
  const {
    data: peoplePages
  } = usePeopleInfinite({
    search: ""
  });

  // Buscar usuários da empresa (apenas usuários do sistema)
  const {
    data: companyUsersResponse
  } = useQuery({
    queryKey: ["company-users"],
    queryFn: () => api.getCompanyUsers(),
    staleTime: 5 * 60 * 1000,
    enabled: isOpen
  });
  const companyUsers = companyUsersResponse?.data || [];

  // Sincronizar estado local com dados da tarefa
  useEffect(() => {
    if (task && relatedData) {
      setSelectedPersonId(relatedData.person?.id || "none");
      setSelectedAssigneeId(relatedData.assignee?.id || "none");
      setEditedDueDate(task.attributes.due ? new Date(task.attributes.due).toISOString().slice(0, 16) : "");
    }
  }, [task, relatedData]);
  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return !isNaN(date.getTime()) ? format(date, "dd/MM/yyyy HH:mm", {
        locale: ptBR
      }) : "Data inválida";
    } catch {
      return "Data inválida";
    }
  };
  const getStatusBadge = () => {
    if (!task) return null;
    const status = getTaskStatus(task);
    return <Badge className={getStatusColor(status)}>
        {getStatusLabel(status)}
      </Badge>;
  };
  const getPriorityBadge = () => {
    return <Badge variant="destructive" className="text-xs">Alta</Badge>;
  };

  // Função para gerar iniciais do nome
  const getInitials = (name: string) => {
    if (!name) return "??";
    const parts = name.split(" ");
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  // Função para concluir tarefa
  const handleCompleteTask = async () => {
    if (!task) return;
    try {
      await updateTaskStatus(task.id, true);
      toast({
        title: "Tarefa concluída com sucesso!"
      });
      onClose();
    } catch (error) {
      console.error("Error completing task:", error);
    }
  };

// Função para reabrir/restaurar tarefa (abre diálogo)
  const handleReopenTask = async () => {
    if (!task) return;
    setPendingReopenContext(task.attributes.deleted ? "restore" : "reopen");
    setIsDateDialogOpen(true);
  };

  // Confirmação do diálogo de data
  const handleDateConfirm = async (newDueDate: string) => {
    if (!task) return;
    try {
      // Garantir data padrão (+1h) se vazio
      const finalDue = newDueDate && newDueDate.length > 0
        ? newDueDate
        : format(addHours(new Date(), 1), "yyyy-MM-dd'T'HH:mm");

      await updateTaskStatus(task.id, false, finalDue, { restore: pendingReopenContext === "restore" });
      toast({ title: pendingReopenContext === "restore" ? "Tarefa restaurada" : "Tarefa reaberta" });
      setIsDateDialogOpen(false);
      onClose();
    } catch (error) {
      console.error("Error confirming reopen/restore:", error);
      toast({ title: "Erro ao atualizar tarefa", variant: "destructive" });
    }
  };

  // Função para adicionar atualização
  const handleAddUpdate = async () => {
    if (!task) return;

    // Validar se há conteúdo para adicionar
    if (!updateText.trim() && !nextReturnDate) {
      toast({
        title: "Erro",
        description: "Adicione uma atualização ou defina uma data de retorno.",
        variant: "destructive"
      });
      return;
    }
    try {
      const userResp = await api.getUserFromToken().catch(() => null);
      const currentUserName = userResp?.data?.attributes?.name || "Usuário";

      // Criar histórico se há texto de atualização - Using 'text' field for user input
      if (updateText.trim()) {
        const historicData = {
          type: "task-historics" as const,
          attributes: {
            text: updateText.trim(),
            // Use 'text' field for user textarea input (manual updates)
            "date-time": new Date().toISOString()
          },
          relationships: {
            task: {
              data: {
                type: "tasks" as const,
                id: task.id
              }
            }
          }
        };
        console.log("Creating task historic with text field:", historicData);
        try {
          await api.createTaskHistoric(historicData);
          console.log("Task historic created successfully");
        } catch (historicError) {
          console.error("Failed to create task historic for update:", historicError);
          toast({
            title: "Erro ao criar histórico",
            description: "O texto pode não ter sido salvo.",
            variant: "destructive"
          });
        }
      }

      // Atualizar data de retorno se definida e criar histórico
      if (nextReturnDate) {
        const dueDateTime = nextReturnTime ? `${nextReturnDate}T${nextReturnTime}:00` : `${nextReturnDate}T09:00:00`;
        const updateData: UpdateTaskData = {
          type: "tasks",
          id: task.id,
          attributes: {
            due: dueDateTime
          }
        };
        await updateTaskMutation.mutateAsync({
          id: task.id,
          data: updateData
        });

        // Criar histórico da mudança de data - Using 'historic' field for system changes
        try {
          await api.createTaskHistoric({
            type: "task-historics",
            attributes: {
              historic: `Vencimento alterado para ${formatDate(dueDateTime)}`,
              description: `${currentUserName} - ${format(new Date(), "dd/MM/yyyy HH:mm", {
                locale: ptBR
              })}`,
              "date-time": new Date().toISOString()
            },
            relationships: {
              task: {
                data: {
                  type: "tasks" as const,
                  id: task.id
                }
              }
            }
          });
        } catch (historicError) {
          console.warn("Failed to create task historic for date change:", historicError);
          // Continue execution, task update was already successful
        }
      }

      // Invalidar cache dos históricos e forçar reload imediato
      queryClient.removeQueries({
        queryKey: ["task-historics", task.id]
      });
      queryClient.removeQueries({
        queryKey: ["task-historics"]
      }); // Remove all historics cache
      await queryClient.invalidateQueries({
        queryKey: ["task-historics", task.id]
      });
      await queryClient.invalidateQueries({
        queryKey: ["task-historics"]
      });

      // Aguardar um pouco e buscar novamente para garantir sincronização
      setTimeout(async () => {
        await queryClient.refetchQueries({
          queryKey: ["task-historics", task.id]
        });
      }, 100); // Reduced to 100ms for faster updates

      // Limpar campos
      setUpdateText("");
      setNextReturnDate("");
      setNextReturnTime("");
      toast({
        title: "Atualização adicionada com sucesso!"
      });
    } catch (error) {
      console.error("Error adding update:", error);
      toast({
        title: "Erro ao adicionar atualização",
        description: "Tente novamente.",
        variant: "destructive"
      });
    }
  };

  // Função para salvar edições
  const handleSaveEdits = async () => {
    if (!task) return;
    try {
      const updateData: UpdateTaskData = {
        type: "tasks",
        id: task.id,
        attributes: {}
      };

      // Atualizar data se modificada
      if (editedDueDate !== (task.attributes.due ? new Date(task.attributes.due).toISOString().slice(0, 16) : "")) {
        updateData.attributes.due = editedDueDate ? `${editedDueDate}:00` : null;
      }

      // Atualizar relacionamentos se modificados
      const relationshipsToUpdate: {
        person?: string | null;
        assignee?: string | null;
      } = {};
      if (selectedPersonId !== (relatedData?.person?.id || "none")) {
        relationshipsToUpdate.person = selectedPersonId === "none" ? null : selectedPersonId;
      }
      if (selectedAssigneeId !== (relatedData?.assignee?.id || "none")) {
        relationshipsToUpdate.assignee = selectedAssigneeId === "none" ? null : selectedAssigneeId;
      }
      if (Object.keys(relationshipsToUpdate).length > 0) {
        await api.updateTaskRelationships(task.id, relationshipsToUpdate);
      }

      // Atualizar tarefa se há mudanças nos atributos
      if (Object.keys(updateData.attributes).length > 0) {
        await updateTaskMutation.mutateAsync({
          id: task.id,
          data: updateData
        });
      }

      // Invalidar cache
      queryClient.invalidateQueries({
        queryKey: ["task-related-data", task.id]
      });
      setIsEditing(false);
      toast({
        title: "Alterações salvas com sucesso!"
      });
    } catch (error) {
      console.error("Error saving edits:", error);
      toast({
        title: "Erro ao salvar alterações",
        description: "Tente novamente.",
        variant: "destructive"
      });
    }
  };

  // Função para cancelar edições
  const handleCancelEdits = () => {
    // Resetar para valores originais
    setSelectedPersonId(relatedData?.person?.id || "none");
    setSelectedAssigneeId(relatedData?.assignee?.id || "none");
    setEditedDueDate(task?.attributes.due ? new Date(task.attributes.due).toISOString().slice(0, 16) : "");
    setIsEditing(false);
  };
  if (!task) return null;
  const {
    person,
    assignee,
    category
  } = relatedData || {};
  return <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl h-[90vh] p-5 overflow-hidden">
        {/* Header */}
        <DialogHeader className="px-4 py-1 border-b bg-background">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-sm font-semibold">
              Detalhes da Tarefa
            </DialogTitle>
            <div className="flex items-center gap-1">
{!isEditing ? (
                  <>
                    {task.attributes.deleted ? (
                      <Button variant="outline" size="sm" className="text-xs h-7 px-2 opacity-60 cursor-not-allowed" disabled onClick={(e)=>e.preventDefault()}>
                        Restauração no Monde
                      </Button>
                    ) : task.attributes.completed ? (
                      <Button variant="outline" size="sm" className="text-xs h-7 px-2" onClick={handleReopenTask}>
                        <CheckSquare className="h-3 w-3 mr-1" />
                        Reabrir Tarefa
                      </Button>
                    ) : (
                      <>
                        <Button variant="outline" size="sm" className="text-xs h-7 px-2" onClick={handleCompleteTask} disabled={task.attributes.completed}>
                          <CheckSquare className="h-3 w-3 mr-1" />
                          Concluir
                        </Button>
                        <Button variant="outline" size="sm" className="text-xs h-7 px-2" onClick={() => setIsEditing(true)}>
                          <Edit3 className="h-3 w-3 mr-1" />
                          Editar
                        </Button>
                      </>
                    )}
                  </>
                ) : (
                  <>
                    <Button variant="outline" size="sm" className="text-xs h-7 px-2" onClick={handleSaveEdits} disabled={updateTaskMutation.isPending}>
                      <Save className="h-3 w-3 mr-1" />
                      Salvar
                    </Button>
                    <Button variant="ghost" size="sm" className="text-xs h-7 px-2" onClick={handleCancelEdits}>
                      Cancelar
                    </Button>
                  </>
                )}
              <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={onClose}>
                <X className="h-3 w-3" />
              </Button>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-auto p-4">
          <div className="space-y-3">
            {/* Task Number and Status */}
            <div className="flex items-center justify-between">
              <div className="text-sm text-muted-foreground">
                #{task.attributes.number?.toString().padStart(3, '0') || '001'}
              </div>
              {getStatusBadge()}
            </div>

            {/* Title */}
            <div>
              <Label className="text-sm font-medium text-muted-foreground">Título</Label>
              <div className="mt-1 text-sm font-semibold text-foreground uppercase">
                {task.attributes.title || "Sem título"}
              </div>
            </div>

            {/* 2x2 Grid: Client, Assignee, Date/Time, Priority */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-sm font-medium text-muted-foreground">Cliente</Label>
                {isEditing && !task.attributes.completed && !task.attributes.deleted ? <div className="mt-1 flex items-center gap-1">
                    <Select value={selectedPersonId} onValueChange={setSelectedPersonId}>
                      <SelectTrigger className="h-8 text-sm bg-[#f1f5f9]">
                        <SelectValue placeholder="Selecionar cliente" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Nenhum cliente</SelectItem>
                        {peoplePages?.pages.flatMap(page => page.data).map(person => <SelectItem key={person.id} value={person.id}>
                            {person.attributes.name || person.attributes["full-name"]}
                          </SelectItem>)}
                      </SelectContent>
                    </Select>
                    {selectedPersonId && selectedPersonId !== "none" && <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => setSelectedPersonId("none")}>
                        <X className="h-3 w-3" />
                      </Button>}
                  </div> : <div className="mt-1 text-sm text-foreground">
                    {loadingRelations ? "Carregando..." : person?.attributes?.name || person?.attributes?.["full-name"] || "Nenhum cliente"}
                  </div>}
              </div>
              <div>
                <Label className="text-sm font-medium text-muted-foreground">Responsável</Label>
                {isEditing && !task.attributes.completed && !task.attributes.deleted ? <div className="mt-1 flex items-center gap-1">
                    <Select value={selectedAssigneeId} onValueChange={setSelectedAssigneeId}>
                      <SelectTrigger className="h-8 text-sm bg-[#f1f5f9]">
                        <SelectValue placeholder="Selecionar responsável" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Nenhum responsável</SelectItem>
                        {companyUsers.map(user => <SelectItem key={user.id} value={user.id}>
                            {user.attributes.name}
                          </SelectItem>)}
                      </SelectContent>
                    </Select>
                    {selectedAssigneeId && selectedAssigneeId !== "none" && <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => setSelectedAssigneeId("none")}>
                        <X className="h-3 w-3" />
                      </Button>}
                  </div> : <div className="mt-1 text-sm text-foreground">
                    {loadingRelations ? "Carregando..." : assignee?.attributes?.name || assignee?.attributes?.["full-name"] || "Nenhum responsável"}
                  </div>}
              </div>
              <div>
                <Label className="text-sm font-medium text-muted-foreground">Data/Hora</Label>
                {isEditing && !task.attributes.completed && !task.attributes.deleted ? <div className="mt-1">
                    <Input type="datetime-local" value={editedDueDate} onChange={e => setEditedDueDate(e.target.value)} className="h-8 text-sm bg-[#f1f5f9]" />
                  </div> : <div className="mt-1 text-sm text-foreground">
                    {task.attributes.due ? formatDate(task.attributes.due) : "Não definido"}
                  </div>}
              </div>
              <div>
                <Label className="text-sm font-medium text-muted-foreground">Prioridade</Label>
                <div className="mt-1">
                  {getPriorityBadge()}
                </div>
              </div>
            </div>

            {/* Description */}
            <div>
              <Label className="text-sm font-medium text-muted-foreground">Descrição</Label>
              <div className="mt-1 text-sm text-foreground">
                {task.attributes.description || "Discussão sobre próximos passos"}
              </div>
            </div>

            {/* Updates Section */}
            <div>
              <Label className="text-sm font-semibold text-foreground">Atualizações</Label>
              <div className="mt-2">
                <Textarea placeholder="Adicione uma nova atualização..." value={updateText} onChange={e => setUpdateText(e.target.value)} disabled={task.attributes.completed || task.attributes.deleted} className="min-h-[60px] resize-none bg-[#f1f5f9] border-slate-200 text-sm disabled:opacity-50 disabled:cursor-not-allowed" />
              </div>
            </div>

            {/* Next Return Section */}
            <div className="border-t pt-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Data do Próximo Retorno</Label>
                  <div className="mt-1">
                    <Input type="date" value={nextReturnDate} onChange={e => setNextReturnDate(e.target.value)} placeholder="-/-/-" disabled={task.attributes.completed || task.attributes.deleted} className="h-8 text-sm bg-[#f1f5f9] border-slate-200 disabled:opacity-50 disabled:cursor-not-allowed" />
                  </div>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Hora do Próximo Retorno</Label>
                  <div className="mt-1 flex items-center gap-2">
                    <Input type="time" value={nextReturnTime} onChange={e => setNextReturnTime(e.target.value)} disabled={task.attributes.completed || task.attributes.deleted} className="flex-1 h-8 text-sm bg-[#f1f5f9] border-slate-200 disabled:opacity-50 disabled:cursor-not-allowed" />
                    <Button size="sm" className="h-8 px-2" onClick={handleAddUpdate} disabled={updateTaskMutation.isPending || task.attributes.completed || task.attributes.deleted}>
                      <Plus className="h-3 w-3 mr-1" />
                      Adicionar
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            {/* History Section */}
            <div className="space-y-2">
              <Label className="text-sm font-semibold text-foreground">Histórico</Label>
              {loadingHistorics ? <div className="text-sm text-muted-foreground">Carregando históricos...</div> : taskHistorics.length > 0 ? taskHistorics.map((historic, index) => {
              // Alternar cores de fundo para diferentes históricos
              const bgColor = index % 2 === 0 ? '#fef3c7' : '#f1f5f9';
              return <div key={historic.id || index} className="flex gap-2 p-2 rounded-lg border" style={{
                backgroundColor: bgColor
              }}>
                      <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center">
                        <span className="text-xs font-medium text-primary">
                          {getInitials(historic.attributes?.["user-name"] || historic.attributes?.description?.split(' ')[0] || "U")}
                        </span>
                      </div>
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center gap-2 text-xs">
                          <span className="font-medium">
                            {historic.attributes?.["user-name"] || "Sistema"}
                          </span>
                          <span className="text-muted-foreground">
                            - {historic.attributes['date-time'] || historic.attributes['created-at'] ? formatDate(historic.attributes['date-time'] || historic.attributes['created-at']) : 'Data não disponível'}
                          </span>
                        </div>
                        <div className="text-xs text-foreground">
                          {historic.attributes.text || historic.attributes.historic || historic.attributes.description || 'Sem descrição'}
                        </div>
                      </div>
                    </div>;
            }) : <div className="text-sm text-muted-foreground">Nenhum histórico disponível</div>}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>;
}