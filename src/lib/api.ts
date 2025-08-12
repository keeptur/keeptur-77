import { 
  ApiResponse, 
  ApiError, 
  AuthToken, 
  Person, 
  Task, 
  TaskCategory, 
  TaskHistoric, 
  City,
  CreatePersonData,
  UpdatePersonData,
  CreateTaskData,
  UpdateTaskData,
  CreateTaskHistoricData,
  UpdateTaskHistoricData
} from "@/types/api";

const API_BASE_URL = "https://web.monde.com.br/api/v2";

class MondeAPI {
  private token: string | null = null;

  constructor() {
    // Try to load token from localStorage
    this.token = localStorage.getItem("monde_token");
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${API_BASE_URL}${endpoint}`;
    
    const headers: Record<string, string> = {
      "Accept": "application/vnd.api+json",
      "Content-Type": "application/vnd.api+json",
      ...((options.headers as Record<string, string>) || {}),
    };

    if (this.token && !endpoint.includes("/tokens")) {
      headers["Authorization"] = `Bearer ${this.token}`;
    }

    console.log(`API Request: ${options.method || 'GET'} ${url}`, {
      hasToken: !!this.token,
      endpoint,
      headers: { ...headers, Authorization: this.token ? 'Bearer ***' : undefined },
      body: options.body ? JSON.parse(options.body as string) : undefined
    });

    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (!response.ok) {
      console.error(`API Error: ${response.status} ${response.statusText}`, {
        url,
        hasToken: !!this.token,
        status: response.status,
        method: options.method || 'GET',
        body: options.body
      });

      const isAuthEndpoint = endpoint.includes("/tokens");
      const requestId = response.headers.get("x-request-id");

      // Tentar parsear o corpo de erro (JSON:API)
      let errorData: ApiError | null = null;
      try {
        errorData = await response.json();
      } catch (_) {
        // Sem corpo ou não-JSON
      }

      const firstErr: any = (errorData as any)?.errors?.[0] || {};
      const code = firstErr?.code;
      const title = firstErr?.title;
      const detail = firstErr?.detail;
      const errorId = firstErr?.id;

      // Endpoint de autenticação (/tokens) -> mensagens específicas, sem logout
      if (isAuthEndpoint) {
        const text = `${title || ""} ${detail || ""}`.toLowerCase();
        let userMessage = "Usuário ou senha inválidos.";

        if (response.status === 429 || /muitas tentativas|rate/.test(text)) {
          userMessage = "Muitas tentativas de login. Tente novamente em alguns minutos.";
        } else if (response.status === 423 || /bloque/.test(text)) {
          userMessage = "Usuário bloqueado. Redefina a senha ou contate o suporte.";
        } else if (response.status === 403 || /permiss/.test(text)) {
          userMessage = "Sem permissão para acessar. Verifique seu perfil com o administrador.";
        } else if (/inativ/.test(text)) {
          userMessage = "Usuário inativo. Solicite ativação ao administrador.";
        } else if (/senha/.test(text) && /(incorret|inv[áa]lid)/.test(text)) {
          userMessage = "Senha incorreta.";
        } else if (response.status === 401) {
          userMessage = "Usuário ou senha inválidos.";
        }

        const err = new Error(userMessage);
        (err as any).code = code || response.status;
        (err as any).status = response.status;
        (err as any).backendTitle = title;
        (err as any).backendDetail = detail;
        (err as any).errorId = errorId;
        (err as any).requestId = requestId;

        console.error('Auth error details', { status: response.status, code, title, detail, errorId, requestId });
        throw err;
      }

      if (response.status === 401) {
        this.logout();
        console.warn('Token inválido removido. Redirecionando para login.');
        window.dispatchEvent(new CustomEvent('token-expired'));
        const err = new Error('Token expirado. Faça login novamente.');
        (err as any).status = response.status;
        (err as any).requestId = requestId;
        throw err;
      }

      // Demais status -> propagar detalhe do backend, anexando metadados úteis
      if (errorData) {
        console.error('API Error Details:', errorData);
        const message = detail || title || `HTTP ${response.status}: ${response.statusText}`;
        const err = new Error(message);
        (err as any).code = code || response.status;
        (err as any).status = response.status;
        (err as any).backendTitle = title;
        (err as any).backendDetail = detail;
        (err as any).errorId = errorId;
        (err as any).requestId = requestId;
        throw err;
      } else {
        const err = new Error(`HTTP ${response.status}: ${response.statusText}`);
        (err as any).status = response.status;
        (err as any).requestId = requestId;
        throw err;
      }
    }

    // Handle 204 No Content or empty/non-JSON responses safely
    const contentType = response.headers.get("content-type") || "";
    if (response.status === 204 || contentType.indexOf("json") === -1) {
      console.log(`API Response: ${options.method || 'GET'} ${url} (no content)`);
      return undefined as any;
    }

    try {
      const data = await response.json();
      console.log(`API Response: ${options.method || 'GET'} ${url}`, data);
      return data;
    } catch (e) {
      console.warn(`API Response parse warning for ${url}:`, e);
      return undefined as any;
    }
  }

  // Verificar se o token está próximo do vencimento
  isTokenExpiringSoon(): boolean {
    if (!this.token) return false;
    
    try {
      const payload = this.token.split('.')[1];
      const decodedPayload = JSON.parse(atob(payload));
      const currentTime = Math.floor(Date.now() / 1000);
      const timeUntilExpiry = decodedPayload.exp - currentTime;
      
      // Retorna true se o token expira em menos de 5 minutos (300 segundos)
      return timeUntilExpiry < 300;
    } catch (error) {
      console.warn('Erro ao verificar expiração do token:', error);
      return true; // Se não conseguir verificar, considere que está expirando
    }
  }

  // Verificar se o token está expirado
  isTokenExpired(): boolean {
    if (!this.token) return true;
    
    try {
      const payload = this.token.split('.')[1];
      const decodedPayload = JSON.parse(atob(payload));
      const currentTime = Math.floor(Date.now() / 1000);
      
      return decodedPayload.exp <= currentTime;
    } catch (error) {
      console.warn('Erro ao verificar expiração do token:', error);
      return true; // Se não conseguir verificar, considere que está expirado
    }
  }

  // Authentication - Corrigido conforme documentação oficial
  async authenticate(login: string, password: string): Promise<string> {
    try {
      console.log('Attempting authentication with:', { login: login.substring(0, 3) + '***' });
      
      const response = await this.request<ApiResponse<AuthToken>>("/tokens", {
        method: "POST",
        body: JSON.stringify({
          data: {
            type: "tokens",
            attributes: {
              login,
              password,
            },
          },
        }),
      });

      console.log('Authentication successful:', { 
        tokenLength: response.data.attributes.token?.length,
        login: response.data.attributes.login 
      });

      this.token = response.data.attributes.token;
      localStorage.setItem("monde_token", this.token);
      
      return this.token;
    } catch (error) {
      console.error('Authentication failed:', error);
      // Limpar token inválido se houver
      this.logout();
      throw error;
    }
  }

  logout(): void {
    this.token = null;
    localStorage.removeItem("monde_token");
  }

  isAuthenticated(): boolean {
    return !!this.token;
  }

  // People endpoints
  // People endpoints - Com scroll infinito e busca otimizada
  async getPeople(params?: {
    page?: number;
    size?: number;
    sort?: string;
    filter?: Record<string, string>;
    search?: string;
  }): Promise<ApiResponse<Person[]>> {
    const searchParams = new URLSearchParams();
    
    if (params?.page) searchParams.set("page[number]", params.page.toString());
    if (params?.size) searchParams.set("page[size]", params.size.toString());
    if (params?.sort) searchParams.set("sort", params.sort);
    
    // Usar filter[search] para busca global conforme documentação
    if (params?.search && params.search.length >= 2) {
      searchParams.set("filter[search]", params.search);
    }
    
    if (params?.filter) {
      Object.entries(params.filter).forEach(([key, value]) => {
        searchParams.set(`filter[${key}]`, value);
      });
    }

    const query = searchParams.toString();
    return this.request<ApiResponse<Person[]>>(`/people${query ? `?${query}` : ""}`);
  }

  async getPerson(id: string): Promise<ApiResponse<Person>> {
    return this.request<ApiResponse<Person>>(`/people/${id}`);
  }

  async createPerson(data: CreatePersonData): Promise<ApiResponse<Person>> {
    return this.request<ApiResponse<Person>>("/people", {
      method: "POST",
      body: JSON.stringify({ data }),
    });
  }

  async updatePerson(id: string, data: UpdatePersonData): Promise<ApiResponse<Person>> {
    return this.request<ApiResponse<Person>>(`/people/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ data }),
    });
  }

  async deletePerson(id: string): Promise<void> {
    await this.request(`/people/${id}`, {
      method: "DELETE",
    });
  }

  // Tasks endpoints
  async getTasks(params?: {
    page?: number;
    size?: number;
    sort?: string;
    filter?: Record<string, string>;
    include?: string;
  }): Promise<ApiResponse<Task[]>> {
    const searchParams = new URLSearchParams();
    
    if (params?.page) searchParams.set("page[number]", params.page.toString());
    if (params?.size) searchParams.set("page[size]", params.size.toString());
    if (params?.sort) searchParams.set("sort", params.sort);
    
    if (params?.filter) {
      Object.entries(params.filter).forEach(([key, value]) => {
        console.log(`Adding filter: filter[${key}] = ${value}`);
        searchParams.set(`filter[${key}]`, value);
      });
    }

    // Include relacionamentos quando explicitamente solicitado (assignee, person, category)
    if (params?.include) {
      searchParams.set("include", params.include);
    }

    const query = searchParams.toString();
    return this.request<ApiResponse<Task[]>>(`/tasks${query ? `?${query}` : ""}`);
  }

  async getTask(id: string, params: Record<string, any> = {}): Promise<ApiResponse<Task>> {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value != null) searchParams.set(key, String(value));
    });
    const query = searchParams.toString();
    return this.request<ApiResponse<Task>>(`/tasks/${id}${query ? `?${query}` : ""}`);
  }

  async createTask(data: CreateTaskData): Promise<ApiResponse<Task>> {
    return this.request<ApiResponse<Task>>("/tasks", {
      method: "POST",
      body: JSON.stringify({ data }),
    });
  }

  async updateTask(id: string, data: UpdateTaskData): Promise<ApiResponse<Task>> {
    return this.request<ApiResponse<Task>>(`/tasks/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ data }),
    });
  }

  async softDeleteTask(id: string): Promise<ApiResponse<Task>> {
    const now = new Date().toISOString();
    return this.updateTask(id, {
      type: "tasks",
      id,
      attributes: {
        deleted: true,
        "deleted-at": now,
        excluded: true,
        "excluded-at": now,
        visible: false,
      },
    });
  }

  async restoreTask(id: string): Promise<ApiResponse<Task>> {
    return this.updateTask(id, {
      type: "tasks",
      id,
      attributes: {
        excluded: false,
        "excluded-at": null as any,
        visible: true,
      },
    });
  }

  async deleteTask(id: string): Promise<void> {
    await this.request(`/tasks/${id}`, {
      method: "DELETE",
    });
  }

  // Task Categories endpoints
  async getTaskCategories(params: { size?: number; sort?: string } = {}): Promise<ApiResponse<TaskCategory[]>> {
    const { size = 1000, sort = "description" } = params;
    const query = `?page[size]=${size}&sort=${encodeURIComponent(sort)}`;
    try {
      return await this.request<ApiResponse<TaskCategory[]>>(`/task-categories${query}`);
    } catch (error: any) {
      // Fallback para APIs que usam underscore
      if (String(error?.message || "").includes("404")) {
        return await this.request<ApiResponse<TaskCategory[]>>(`/task_categories${query}`);
      }
      throw error;
    }
  }


  async getTaskCategory(id: string): Promise<ApiResponse<TaskCategory>> {
    return this.request<ApiResponse<TaskCategory>>(`/task-categories/${id}`);
  }


  // Task Historics endpoints
  async getTaskHistorics(params?: {
    page?: number;
    size?: number;
    sort?: string;
    filter?: Record<string, string>;
  }): Promise<ApiResponse<TaskHistoric[]>> {
    const searchParams = new URLSearchParams();
    
    if (params?.page) searchParams.set("page[number]", params.page.toString());
    if (params?.size) searchParams.set("page[size]", params.size.toString());
    if (params?.sort) searchParams.set("sort", params.sort);
    if (params?.filter) {
      Object.entries(params.filter).forEach(([key, value]) => {
        searchParams.set(`filter[${key}]`, value);
      });
    }

    const query = searchParams.toString();
    return this.request<ApiResponse<TaskHistoric[]>>(`/task-historics${query ? `?${query}` : ""}`);
  }

  async getTaskHistoric(id: string): Promise<ApiResponse<TaskHistoric>> {
    return this.request<ApiResponse<TaskHistoric>>(`/task-historics/${id}`);
  }

  async createTaskHistoric(data: CreateTaskHistoricData): Promise<ApiResponse<TaskHistoric>> {
    return this.request<ApiResponse<TaskHistoric>>("/task-historics", {
      method: "POST",
      body: JSON.stringify({ data }),
    });
  }

  async updateTaskHistoric(id: string, data: UpdateTaskHistoricData): Promise<ApiResponse<TaskHistoric>> {
    return this.request<ApiResponse<TaskHistoric>>(`/task-historics/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ data }),
    });
  }

  async deleteTaskHistoric(id: string): Promise<void> {
    await this.request(`/task-historics/${id}`, {
      method: "DELETE",
    });
  }

  // Método para atualizar relacionamentos de tarefa
  async updateTaskRelationships(id: string, relationships: {
    person?: string | null;
    assignee?: string | null;
    category?: string | null;
  }): Promise<void> {
    const promises = [];
    
    if (relationships.person !== undefined) {
      const relationshipData = relationships.person 
        ? { data: { type: "people", id: relationships.person } }
        : { data: null };
      
      promises.push(
        this.request(`/tasks/${id}/relationships/person`, {
          method: "PATCH",
          body: JSON.stringify(relationshipData),
        })
      );
    }
    
    if (relationships.assignee !== undefined) {
      const relationshipData = relationships.assignee 
        ? { data: { type: "users", id: relationships.assignee } }
        : { data: null };
      
      promises.push(
        this.request(`/tasks/${id}/relationships/assignee`, {
          method: "PATCH",
          body: JSON.stringify(relationshipData),
        })
      );
    }
    
    if (relationships.category !== undefined) {
      const relationshipData = relationships.category 
        ? { data: { type: "task-categories", id: relationships.category } }
        : { data: null };
      
      promises.push(
        this.request(`/tasks/${id}/relationships/category`, {
          method: "PATCH",
          body: JSON.stringify(relationshipData),
        })
      );
    }
    
    if (promises.length > 0) {
      await Promise.all(promises);
    }
  }

  // Cities endpoints
  async getCities(): Promise<ApiResponse<City[]>> {
    return this.request<ApiResponse<City[]>>("/cities");
  }

  async getCity(id: string): Promise<ApiResponse<City>> {
    return this.request<ApiResponse<City>>(`/cities/${id}`);
  }

  // User profile endpoint - Tentativas múltiplas de endpoints
  async getCurrentUser(): Promise<ApiResponse<any>> {
    // Primeiro tentar endpoint de perfil do usuário atual
    try {
      return await this.request<ApiResponse<any>>("/me");
    } catch (error) {
      console.warn('Endpoint /me não disponível, tentando alternativa...');
      throw error;
    }
  }

  // Método alternativo para perfil
  async getUserProfile(): Promise<ApiResponse<any>> {
    // Tentar endpoints alternativos
    const alternativeEndpoints = [
      "/users/current",
      "/user/profile", 
      "/profile",
      "/users/me"
    ];
    
    for (const endpoint of alternativeEndpoints) {
      try {
        return await this.request<ApiResponse<any>>(endpoint);
      } catch (error) {
        console.warn(`Endpoint ${endpoint} não disponível:`, error);
        continue;
      }
    }
    
    throw new Error('Nenhum endpoint de perfil de usuário disponível');
  }

  // Buscar dados do usuário através do token JWT  
  async getUserFromToken(): Promise<any> {
    const userId = this.getCurrentUserIdFromToken();
    if (!userId) {
      throw new Error('Não foi possível obter ID do usuário do token');
    }
    
    try {
      // Tentar buscar como pessoa primeiro
      const response = await this.getPerson(userId);
      return response;
    } catch (error) {
      console.warn('Usuário não encontrado como pessoa, retornando dados do token');
      
      // Fallback: dados extraídos do token
      const payload = this.token?.split('.')[1];
      if (payload) {
        const decodedPayload = JSON.parse(atob(payload));
        return {
          data: {
            id: userId,
            type: "users",
            attributes: {
              name: "Usuário Sistema",
              email: decodedPayload.email || "usuario@sistema.com",
              role: "Usuário",
              "last-login": new Date().toISOString(),
              "created-at": new Date(decodedPayload.iat * 1000).toISOString()
            }
          }
        };
      }
      
      throw error;
    }
  }

  // Método para extrair ID do usuário do token JWT
  getCurrentUserIdFromToken(): string | null {
    if (!this.token) return null;
    
    try {
      // Decodificar o JWT (payload é a segunda parte)
      const payload = this.token.split('.')[1];
      const decodedPayload = JSON.parse(atob(payload));
      
      // O uid está no payload do token
      return decodedPayload.uid || null;
    } catch (error) {
      console.warn('Erro ao decodificar token JWT:', error);
      return null;
    }
  }

  // Método público para fazer requisições específicas de relacionamentos
  async getTaskRelationship(taskId: string, relationshipType: 'person' | 'assignee' | 'category' | 'task-historics'): Promise<any> {
    return this.request(`/tasks/${taskId}/${relationshipType}`);
  }

  // Helper methods para buscar dados relacionados das tarefas - Versão aprimorada
  async getTaskRelatedData(taskId: string) {
    try {
      console.log('Fetching related data for task:', taskId);
      
      const [personResponse, assigneeResponse, categoryResponse] = await Promise.allSettled([
        this.getTaskRelationship(taskId, 'person').catch(() => null),
        this.getTaskRelationship(taskId, 'assignee').catch(() => null), 
        this.getTaskRelationship(taskId, 'category').catch(() => null)
      ]);

      // Função helper para extrair dados dos relacionamentos
      const extractRelationshipData = (response: any) => {
        if (response.status === 'fulfilled' && response.value) {
          const data = response.value.data;
          if (data && typeof data === 'object') {
            return {
              id: data.id,
              attributes: data.attributes || {},
              type: data.type
            };
          }
        }
        return null;
      };

      const personData = extractRelationshipData(personResponse);
      const assigneeData = extractRelationshipData(assigneeResponse);
      const categoryData = extractRelationshipData(categoryResponse);

      console.log('Fetched task relationships:', { 
        taskId, 
        person: personData?.id, 
        assignee: assigneeData?.id, 
        category: categoryData?.id 
      });

      return {
        person: personData,
        assignee: assigneeData,
        category: categoryData
      };
    } catch (error) {
      console.warn('Error fetching task related data:', error);
      return { person: null, assignee: null, category: null };
    }
  }

  // Método otimizado para buscar dados completos das tarefas com relacionamentos
  async getTasksWithRelationships(params?: {
    page?: number;
    size?: number;
    sort?: string;
    filter?: Record<string, string>;
  }) {
    try {
      // Primeiro buscar as tarefas
      const tasksResponse = await this.getTasks(params);
      
      // Depois buscar relacionamentos para cada tarefa em paralelo
      const tasksWithRelationships = await Promise.all(
        tasksResponse.data.map(async (task) => {
          const relationships = await this.getTaskRelatedData(task.id);
          return {
            ...task,
            enrichedRelationships: relationships
          };
        })
      );

      return {
        ...tasksResponse,
        data: tasksWithRelationships
      };
    } catch (error) {
      console.error('Error fetching tasks with relationships:', error);
      throw error;
    }
  }


  // Método para buscar usuários da mesma empresa do usuário logado (apenas usuários do sistema)
  async getCompanyUsers(): Promise<ApiResponse<any[]>> {
    try {
      console.log('Fetching company system users...');
      // De acordo com a documentação: filter[only_users]=true e page[size] máximo 50
      const params = new URLSearchParams();
      params.set("page[size]", "50");
      params.set("sort", "name");
      params.set("filter[only_users]", "true");
      return await this.request<ApiResponse<any[]>>(`/people?${params.toString()}`);
    } catch (error) {
      console.warn('Error fetching company users:', error);
      throw error;
    }
  }
}

export const api = new MondeAPI();