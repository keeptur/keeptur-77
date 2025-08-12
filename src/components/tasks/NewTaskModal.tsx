import { useState, useEffect, useCallback } from "react";
import { usePeopleInfinite } from "@/hooks/usePeopleInfinite";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckSquare, Calendar, Settings, Tag, Save, Edit3, X, Circle, Clock, Plus, User, Building, Layers } from "lucide-react";
import { Task, Person, TaskCategory, TaskHistoric, CreateTaskData, UpdateTaskData } from "@/types/api";
import { getTaskStatus, getStatusLabel, getStatusColor } from "@/utils/taskStatus";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { TaskRelatedDataDisplay } from "@/components/tasks/TaskRelatedDataDisplay";
import { TaskHistoricDisplay } from "@/components/tasks/TaskHistoricDisplay";
import { TaskDetailsModal } from "@/components/tasks/TaskDetailsModal";
interface NewTaskModalProps {
  task: Task | null;
  isOpen: boolean;
  mode: "create" | "edit" | "view";
  onClose: () => void;
  onSave: (data: CreateTaskData | UpdateTaskData) => Promise<void>;
  taskHistorics?: any[];
}
export function NewTaskModal({
  task,
  isOpen,
  mode,
  onClose,
  onSave,
  taskHistorics = []
}: NewTaskModalProps) {
  // Se não for criação, usar a modal de detalhes (VER TAREFAS) como padrão
  if (mode !== "create") {
    return <TaskDetailsModal task={task} isOpen={isOpen} onClose={onClose} taskHistorics={taskHistorics} />;
  }
  const [isEditing, setIsEditing] = useState(mode === "create" || mode === "edit");
  const [editData, setEditData] = useState({
    title: "",
    description: "",
    due: "",
    completed: false,
    personId: null as string | null,
    assigneeId: null as string | null,
    categoryId: null as string | null
  });

  const { toast } = useToast();

  // Buscar pessoas com scroll infinito e busca
  const [peopleSearch, setPeopleSearch] = useState("");
  const {
    people: peopleList
  } = usePeopleInfinite({
    search: peopleSearch
  });

  // Buscar usuários da empresa (apenas usuários do sistema)
  const {
    data: companyUsersResponse,
    isLoading: usersLoading,
  } = useQuery({
    queryKey: ["company-users"],
    queryFn: () => api.getCompanyUsers(),
    staleTime: 5 * 60 * 1000,
  });

  // Buscar categorias (tamanho aumentado)
  const {
    data: categoriesResponse,
    isLoading: categoriesLoading,
  } = useQuery({
    queryKey: ["task-categories"],
    queryFn: () => api.getTaskCategories({
      size: 1000
    }),
    staleTime: 5 * 60 * 1000,
  });
  const people = peopleList;
  const companyUsers = companyUsersResponse?.data || [];
  const categories = categoriesResponse?.data || [];
  useEffect(() => {
    if (task) {
      const dueDate = task.attributes.due ? new Date(task.attributes.due) : null;
      const formattedDue = dueDate && !isNaN(dueDate.getTime()) ? format(dueDate, "yyyy-MM-dd'T'HH:mm") : "";
      setEditData({
        title: task.attributes.title || "",
        description: task.attributes.description || "",
        due: formattedDue,
        completed: task.attributes.completed || false,
        personId: task.relationships?.person?.data?.id || null,
        assigneeId: task.relationships?.assignee?.data?.id || null,
        categoryId: task.relationships?.category?.data?.id || null
      });
    } else {
      setEditData({
        title: "",
        description: "",
        due: "",
        completed: false,
        personId: null,
        assigneeId: null,
        categoryId: null
      });
    }

    // Reset editing state based on mode
    setIsEditing(mode === "create" || mode === "edit");
  }, [task, mode]);
  const handleSave = async () => {
    // Validações de campos obrigatórios (lado do cliente)
    if (mode === "create") {
      if (!editData.title.trim()) {
        toast({ title: "Título é obrigatório", variant: "destructive" });
        return;
      }
      if (!editData.categoryId) {
        toast({ title: "Categoria é obrigatória", variant: "destructive" });
        return;
      }
      if (!editData.assigneeId) {
        toast({ title: "Responsável é obrigatório", variant: "destructive" });
        return;
      }
    }

    const data = mode === "create"
      ? {
          type: "tasks" as const,
          attributes: {
            title: editData.title,
            description: editData.description || null,
            due: editData.due ? new Date(editData.due).toISOString() : null,
            completed: editData.completed,
          },
          relationships: {
            ...(editData.personId && {
              person: {
                data: { type: "people", id: editData.personId },
              },
            }),
            assignee: {
              data: { type: "people", id: editData.assigneeId as string },
            },
            category: {
              data: { type: "task-categories", id: editData.categoryId as string },
            },
          },
        }
      : {
          type: "tasks" as const,
          id: task!.id,
          attributes: {
            title: editData.title,
            description: editData.description || null,
            due: editData.due ? new Date(editData.due).toISOString() : null,
            completed: editData.completed,
          },
        };

    try {
      console.log("Salvar tarefa - payload:", data);
      await onSave(data);
    } catch (error: any) {
      console.error("Error saving task:", error);
      toast({ title: "Erro ao salvar tarefa", description: error?.message, variant: "destructive" });
    }
  };
  const handleEdit = () => {
    setIsEditing(true);
  };
  const handleCancel = () => {
    if (mode === "create") {
      onClose();
    } else {
      setIsEditing(false);
      // Reset to original values
      if (task) {
        const dueDate = task.attributes.due ? new Date(task.attributes.due) : null;
        const formattedDue = dueDate && !isNaN(dueDate.getTime()) ? format(dueDate, "yyyy-MM-dd'T'HH:mm") : "";
        setEditData({
          title: task.attributes.title || "",
          description: task.attributes.description || "",
          due: formattedDue,
          completed: task.attributes.completed || false,
          personId: task.relationships?.person?.data?.id || null,
          assigneeId: task.relationships?.assignee?.data?.id || null,
          categoryId: task.relationships?.category?.data?.id || null
        });
      }
    }
  };
  const handleToggleCompleted = useCallback(async (newCompleted: boolean) => {
    if (!task || !isEditing) return;
    try {
      const updateData: UpdateTaskData = {
        type: "tasks",
        id: task.id,
        attributes: {
          completed: newCompleted
        }
      };
      await onSave(updateData);

      // Atualizar estado local
      setEditData(prev => ({
        ...prev,
        completed: newCompleted
      }));
    } catch (error) {
      console.error("Error toggling task completion:", error);
    }
  }, [task, isEditing, onSave]);
  const getTitle = () => {
    if (mode === "create") return "Nova Tarefa";
    if (isEditing) return "Editar Tarefa";
    return "Visualizar Tarefa";
  };
  const taskStatus = task ? getTaskStatus(task) : "pending";
  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return !isNaN(date.getTime()) ? format(date, "dd/MM/yyyy 'às' HH:mm", {
        locale: ptBR
      }) : "Data inválida";
    } catch {
      return "Data inválida";
    }
  };
  return <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl h-[90vh] p-5 overflow-hidden">
        <DialogHeader className="px-4 py-1 border-b bg-background">
          <DialogTitle className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <CheckSquare className="h-5 w-5 text-primary" />
              <div>
                <h2 className="text-xl font-semibold">{getTitle()}</h2>
                {task && <p className="text-sm text-muted-foreground">
                    Tarefa #{task.attributes.number}
                  </p>}
              </div>
            </div>
            {task && <Badge className={getStatusColor(taskStatus)}>
                {getStatusLabel(taskStatus)}
              </Badge>}
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-auto p-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column - Main Content (2/3) */}
            <div className="lg:col-span-2 space-y-6">
              {/* Title */}
              <div>
                <Label htmlFor="title">Título da Tarefa</Label>
                {isEditing ? <Input id="title" value={editData.title} onChange={e => setEditData(prev => ({
                ...prev,
                title: e.target.value
              }))} placeholder="Digite o título da tarefa" className="mt-1 text-lg font-medium" /> : <div className="mt-1 text-lg font-medium text-foreground">
                    {task?.attributes.title || "Sem título"}
                  </div>}
              </div>

              {/* Description */}
              <div>
                <Label htmlFor="description">Descrição</Label>
                {isEditing ? <Textarea id="description" value={editData.description || ""} onChange={e => setEditData(prev => ({
                ...prev,
                description: e.target.value
              }))} placeholder="Descrição detalhada da tarefa..." className="mt-1 min-h-[120px]" /> : <div className="mt-1 p-3 bg-muted/50 rounded-md min-h-[120px]">
                    <p className="text-sm text-muted-foreground">
                      {task?.attributes.description || "Nenhuma descrição"}
                    </p>
                  </div>}
              </div>

              {/* Configuration Section */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Settings className="h-4 w-4" />
                    Configurações
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Due Date */}
                  <div>
                    <Label htmlFor="due">Data de Vencimento</Label>
                    {isEditing ? <Input id="due" type="datetime-local" value={editData.due} onChange={e => setEditData(prev => ({
                    ...prev,
                    due: e.target.value
                  }))} className="mt-1" /> : <div className="mt-1 flex items-center gap-2 text-sm">
                        <Clock className="h-4 w-4" />
                        <span>
                          {task?.attributes.due ? formatDate(task.attributes.due) : "Não definido"}
                        </span>
                      </div>}
                  </div>

                  {/* Creation Date - View only */}
                  {task && <div>
                      <Label>Data de Criação</Label>
                      <div className="mt-1 flex items-center gap-2 text-sm">
                        <Calendar className="h-4 w-4" />
                        <span>
                          {formatDate(task.attributes["registered-at"])}
                        </span>
                      </div>
                    </div>}

                  {/* Completed Checkbox */}
                  {task && <div className="flex items-center space-x-2">
                      <Checkbox id="completed" checked={editData.completed} onCheckedChange={handleToggleCompleted} disabled={!isEditing} />
                      <Label htmlFor="completed" className="text-sm font-medium">
                        Marcar como concluída
                      </Label>
                    </div>}
                </CardContent>
              </Card>
            </div>

            {/* Right Column - Sidebar (1/3) */}
            <div className="space-y-6">
              {/* Status Card */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Circle className={`h-3 w-3 ${taskStatus === "completed" ? "text-green-500 fill-green-500" : taskStatus === "overdue" ? "text-red-500 fill-red-500" : "text-yellow-500 fill-yellow-500"}`} />
                    Status
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Badge variant={taskStatus === "completed" ? "default" : taskStatus === "overdue" ? "destructive" : "secondary"}>
                    {taskStatus === "completed" ? "Concluída" : taskStatus === "overdue" ? "Atrasada" : "Pendente"}
                  </Badge>
                </CardContent>
              </Card>

              {/* Relationships Card */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Tag className="h-4 w-4" />
                    Relacionamentos
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Client */}
                  <div>
                    <Label className="text-xs text-muted-foreground flex items-center gap-1">
                      <User className="h-3 w-3" />
                      Cliente
                    </Label>
                    {isEditing ? <div className="mt-1 space-y-2">
                        <Input placeholder="Buscar por nome ou CPF..." value={peopleSearch} onChange={e => setPeopleSearch(e.target.value)} />
                        <Select value={editData.personId || "none"} onValueChange={value => setEditData(prev => ({
                      ...prev,
                      personId: value === "none" ? null : value
                    }))}>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione um cliente" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">Nenhum cliente</SelectItem>
                            {peopleList.filter(person => person.id && person.id.trim() !== "").map(person => <SelectItem key={person.id} value={person.id}>
                                {person.attributes.name}
                              </SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div> : <div className="mt-1 text-sm">
                        {editData.personId ? peopleList.find(p => p.id === editData.personId)?.attributes.name || "Cliente desconhecido" : "Nenhum cliente"}
                      </div>}
                  </div>

                  {/* Assignee */}
                  <div>
                    <Label className="text-xs text-muted-foreground flex items-center gap-1">
                      <User className="h-3 w-3" />
                      Responsável {mode === "create" && <span className="text-red-500">*</span>}
                    </Label>
                    {isEditing ? <Select value={editData.assigneeId || ""} onValueChange={value => setEditData(prev => ({
                    ...prev,
                    assigneeId: value || null
                  }))} required={mode === "create"}>
                        <SelectTrigger className={`mt-1 ${mode === "create" && !editData.assigneeId ? "border-red-300" : ""}`}>
                          <SelectValue placeholder="Selecione um responsável" />
                        </SelectTrigger>
                        <SelectContent>
                          {mode !== "create" && <SelectItem value="">Nenhum responsável</SelectItem>}
                          {usersLoading ? (
                            <SelectItem value="__loading" disabled>Carregando responsáveis...</SelectItem>
                          ) : companyUsers.length === 0 ? (
                            <SelectItem value="__empty" disabled>Nenhum responsável disponível</SelectItem>
                          ) : (
                            companyUsers
                              .filter(user => user.id && user.id.trim() !== "")
                              .map(user => (
                                <SelectItem key={user.id} value={user.id}>
                                  {user.attributes?.name || user.attributes?.["full-name"] || `Usuário ${user.id}`}
                                </SelectItem>
                              ))
                          )}
                        </SelectContent>
                      </Select> : <div className="mt-1 text-sm">
                        {task?.relationships?.assignee?.data ? companyUsers.find(u => u.id === task.relationships.assignee.data.id)?.attributes.name || "Usuário desconhecido" : "Nenhum responsável"}
                      </div>}
                  </div>

                  {/* Category */}
                  <div>
                    <Label className="text-xs text-muted-foreground flex items-center gap-1">
                      <Layers className="h-3 w-3" />
                      Categoria {mode === "create" && <span className="text-red-500">*</span>}
                    </Label>
                    {isEditing ? <Select value={editData.categoryId || ""} onValueChange={value => setEditData(prev => ({
                    ...prev,
                    categoryId: value || null
                  }))} required={mode === "create"}>
                        <SelectTrigger className={`mt-1 ${mode === "create" && !editData.categoryId ? "border-red-300" : ""}`}>
                          <SelectValue placeholder="Selecione uma categoria" />
                        </SelectTrigger>
                        <SelectContent>
                          {mode !== "create" && <SelectItem value="">Nenhuma categoria</SelectItem>}
                          {categoriesLoading ? (
                            <SelectItem value="__loading" disabled>Carregando categorias...</SelectItem>
                          ) : categories.length === 0 ? (
                            <SelectItem value="__empty" disabled>Nenhuma categoria disponível</SelectItem>
                          ) : (
                            categories
                              .filter(cat => cat.id && cat.id.trim() !== "")
                              .map(cat => (
                                <SelectItem key={cat.id} value={cat.id}>
                                  {cat.attributes.name || (cat.attributes as any).description || `Categoria ${cat.id}`}
                                </SelectItem>
                              ))
                          )}
                        </SelectContent>
                      </Select> : <div className="mt-1 text-sm">
                        {task?.relationships?.category?.data ? (categories.find(c => c.id === task.relationships.category.data.id)?.attributes.name || (categories.find(c => c.id === task.relationships.category.data.id)?.attributes as any)?.description || "Categoria desconhecida") : "Nenhuma categoria"}
                      </div>}
                  </div>
                </CardContent>
              </Card>

              {/* History - Only for existing tasks */}
              {task && <TaskHistoricDisplay taskId={task.id} />}
            </div>
          </div>
        </div>

        <Separator />

        {/* Footer Actions */}
        <div className="flex flex-col sm:flex-row justify-between gap-3 pt-4">
          <div className="flex gap-2">
            {isEditing ? <>
                <Button onClick={handleSave} className="flex-1 sm:flex-none">
                  <Save className="h-4 w-4 mr-2" />
                  {mode === "create" ? "Criar Tarefa" : "Salvar"}
                </Button>
                <Button onClick={handleCancel} variant="outline" className="flex-1 sm:flex-none">
                  <X className="h-4 w-4 mr-2" />
                  Cancelar
                </Button>
              </> : mode !== "create" && <Button onClick={handleEdit} variant="outline">
                  <Edit3 className="h-4 w-4 mr-2" />
                  Editar
                </Button>}
          </div>

          {!isEditing && mode !== "create" && <Button onClick={onClose} variant="secondary">
              Fechar
            </Button>}
        </div>
      </DialogContent>
    </Dialog>;
}