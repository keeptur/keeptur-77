// Types for Monde API System

export interface ApiResponse<T> {
  data: T;
  links?: {
    first?: string;
    last?: string;
    next?: string;
    prev?: string;
  };
  meta?: {
    total?: number;
    page?: number;
    perPage?: number;
  };
  included?: any[]; // JSON:API included resources (used for status derivation)
}

export interface ApiError {
  errors: {
    id?: string;
    status: string;
    code?: string;
    title: string;
    detail: string;
    source?: {
      pointer?: string;
      parameter?: string;
    };
  }[];
}

export interface AuthToken {
  id: string;
  type: "tokens";
  attributes: {
    login: string;
    token: string;
  };
  links: {
    self: string;
  };
}

export interface Person {
  id: string;
  type: "people";
  attributes: {
    name: string;
    "company-name"?: string;
    address?: string;
    number?: string;
    complement?: string;
    district?: string;
    zip?: string;
    "birth-date"?: string;
    cpf?: string;
    rg?: string;
    "passport-number"?: string;
    "passport-expiration"?: string;
    gender?: string;
    cnpj?: string;
    "city-inscription"?: string;
    "state-inscription"?: string;
    observations?: string;
    "registered-at": string;
    "business-phone"?: string;
    "mobile-phone"?: string;
    phone?: string;
    email?: string;
    website?: string;
    code: number;
    kind: "individual" | "company";
  };
  relationships?: {
    city?: {
      links: {
        self: string;
        related: string;
      };
    };
    creator?: {
      links: {
        self: string;
        related: string;
      };
    };
  };
  links: {
    self: string;
  };
}

export interface Task {
  id: string;
  type: "tasks";
  attributes: {
    title: string;
    number?: number;
    description?: string;
    due?: string; // API usa "due" não "due-date"
    visualized?: boolean;
    completed?: boolean;
    deleted?: boolean; // Campo para verificar se a tarefa foi excluída
    excluded?: boolean; // Compatibilidade com APIs que usam "excluded"
    visible?: boolean; // Algumas APIs ocultam tarefas excluídas
    "completed-at"?: string;
    "deleted-at"?: string | null; // Campo para data de exclusão
    "excluded-at"?: string | null; // Compatibilidade com "excluded-at"
    "registered-at": string; // API usa "registered-at" não "created-at"
    status?: "pending" | "in_progress" | "completed" | "cancelled" | "deleted"; // Incluir status deleted
    priority?: "low" | "medium" | "high" | "urgent"; // Campo não existe na API atual
  };
  relationships?: {
    category?: {
      links: {
        self: string;
        related: string;
      };
      data?: {
        type: "task-categories";
        id: string;
      } | null;
    };
    person?: {
      links: {
        self: string;
        related: string;
      };
      data?: {
        type: "people";
        id: string;
      } | null;
    };
    assignee?: {
      links: {
        self: string;
        related: string;
      };
      data?: {
        type: "people";
        id: string;
      } | null;
    };
    author?: {
      links: {
        self: string;
        related: string;
      };
      data?: {
        type: "people";
        id: string;
      } | null;
    };
    "task-historics"?: {
      links: {
        self: string;
        related: string;
      };
    };
  };
  links: {
    self: string;
  };
}

export interface TaskCategory {
  id: string;
  type: "task-categories";
  attributes: {
    name: string;
    description?: string;
    color?: string;
    "created-at": string;
    "updated-at": string;
  };
  links: {
    self: string;
  };
}

export interface TaskHistoric {
  id: string;
  type: "task-historics";
  attributes: {
    description?: string;
    historic?: string;
    text?: string;
    "date-time"?: string;
    "old-status"?: string;
    "new-status"?: string;
    "created-at"?: string;
  };
  relationships?: {
    task: {
      links: {
        self: string;
        related: string;
      };
    };
    creator: {
      links: {
        self: string;
        related: string;
      };
    };
  };
  links: {
    self: string;
  };
}

export interface City {
  id: string;
  type: "cities";
  attributes: {
    name: string;
    state: string;
    "state-code": string;
    "ibge-code": string;
  };
  links: {
    self: string;
  };
}

// Form types for creating/updating entities
export interface CreatePersonData {
  type: "people";
  attributes: Omit<Person["attributes"], "registered-at" | "code">;
}

export interface UpdatePersonData {
  type: "people";
  attributes: Partial<Omit<Person["attributes"], "registered-at" | "code">>;
}

export interface CreateTaskData {
  type: "tasks";
  attributes: Omit<Task["attributes"], "registered-at" | "number" | "visualized" | "completed-at">;
}

export interface UpdateTaskData {
  type: "tasks";
  id?: string; // ID é obrigatório conforme documentação da API
  attributes: Partial<Omit<Task["attributes"], "registered-at" | "number" | "visualized" | "completed-at">>;
}

export interface CreateTaskHistoricData {
  type: "task-historics";
  attributes: Omit<TaskHistoric["attributes"], "created-at">;
  relationships?: {
    task?: {
      data: {
        type: "tasks";
        id: string;
      };
    };
  };
}

export interface UpdateTaskHistoricData {
  type: "task-historics";
  attributes: Partial<Omit<TaskHistoric["attributes"], "created-at">>;
}