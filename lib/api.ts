// ============ API Client for Evidentia Backend ============

const getBaseUrl = (): string => {
  if (typeof window !== 'undefined') {
    return '/api/proxy';
  }
  return process.env.BACKEND_API_URL ?? '';
};

class ApiClient {
  private getToken(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('evidentia_token');
  }

  private getHeaders(contentType?: string): Record<string, string> {
    const headers: Record<string, string> = {};
    if (contentType) headers['Content-Type'] = contentType;
    const token = this.getToken();
    if (token) headers['Authorization'] = `Bearer ${token}`;
    return headers;
  }

  async request<T>(path: string, options: RequestInit = {}): Promise<T> {
    const base = getBaseUrl();
    const url = `${base}${path}`;
    const res = await fetch(url, {
      ...options,
      headers: {
        ...(this.getHeaders(options.body instanceof FormData ? undefined : 'application/json')),
        ...((options.headers as Record<string, string>) ?? {}),
      },
    });
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({ message: res.statusText }));
      throw new ApiError(errorData?.message ?? res.statusText, res.status, errorData);
    }
    const text = await res.text();
    if (!text) return {} as T;
    try { return JSON.parse(text); } catch { return text as unknown as T; }
  }

  get<T>(path: string) { return this.request<T>(path, { method: 'GET' }); }

  post<T>(path: string, body?: unknown) {
    return this.request<T>(path, {
      method: 'POST',
      body: body instanceof FormData ? body : JSON.stringify(body ?? {}),
    });
  }

  put<T>(path: string, body?: unknown) {
    return this.request<T>(path, { method: 'PUT', body: JSON.stringify(body ?? {}) });
  }

  delete<T>(path: string) { return this.request<T>(path, { method: 'DELETE' }); }

  async upload<T>(path: string, file: File, additionalFields?: Record<string, string>): Promise<T> {
    const formData = new FormData();
    formData.append('file', file);
    if (additionalFields) {
      Object.entries(additionalFields).forEach(([k, v]) => formData.append(k, v));
    }
    return this.request<T>(path, { method: 'POST', body: formData });
  }
}

export class ApiError extends Error {
  status: number;
  data: unknown;
  constructor(message: string, status: number, data?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
}

export const api = new ApiClient();

// ============ Auth API ============
// Auth API uses direct routes (not proxied)
export const authApi = {
  login: async (email: string, password: string) => {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new ApiError(error.error || 'Login failed', response.status);
    }
    return response.json() as Promise<{ token: string; user: import('./types').User }>;
  },
  register: async (data: { email: string; password: string; firstName: string; lastName: string }) => {
    const response = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new ApiError(error.error || 'Registration failed', response.status);
    }
    return response.json() as Promise<{ token: string; user: import('./types').User }>;
  },
};

// Helper to get token from localStorage
const getAuthToken = () => typeof window !== 'undefined' ? localStorage.getItem('evidentia_token') : null;

// ============ Matters API (direct routes) ============
export const mattersApi = {
  list: async () => {
    const token = getAuthToken();
    const response = await fetch('/api/matters', {
      headers: token ? { 'Authorization': `Bearer ${token}` } : {},
    });
    if (!response.ok) {
      const error = await response.json();
      throw new ApiError(error.error || 'Failed to fetch matters', response.status);
    }
    return response.json() as Promise<import('./types').Matter[]>;
  },
  get: async (id: string) => {
    const token = getAuthToken();
    const response = await fetch(`/api/matters/${id}`, {
      headers: token ? { 'Authorization': `Bearer ${token}` } : {},
    });
    if (!response.ok) {
      const error = await response.json();
      throw new ApiError(error.error || 'Failed to fetch matter', response.status);
    }
    return response.json() as Promise<import('./types').Matter>;
  },
  create: async (data: Partial<import('./types').Matter>) => {
    const token = getAuthToken();
    const response = await fetch('/api/matters', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new ApiError(error.error || 'Failed to create matter', response.status);
    }
    return response.json() as Promise<import('./types').Matter>;
  },
  update: async (id: string, data: Partial<import('./types').Matter>) => {
    const token = getAuthToken();
    const response = await fetch(`/api/matters/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new ApiError(error.error || 'Failed to update matter', response.status);
    }
    return response.json() as Promise<import('./types').Matter>;
  },
  delete: async (id: string) => {
    const token = getAuthToken();
    const response = await fetch(`/api/matters/${id}`, {
      method: 'DELETE',
      headers: token ? { 'Authorization': `Bearer ${token}` } : {},
    });
    if (!response.ok) {
      const error = await response.json();
      throw new ApiError(error.error || 'Failed to delete matter', response.status);
    }
    return response.json();
  },
};

// ============ Documents API (direct routes) ============
export const documentsApi = {
  list: async (matterId?: string) => {
    const token = getAuthToken();
    const url = matterId ? `/api/documents?matterId=${matterId}` : '/api/documents';
    const response = await fetch(url, {
      headers: token ? { 'Authorization': `Bearer ${token}` } : {},
    });
    if (!response.ok) {
      const error = await response.json();
      throw new ApiError(error.error || 'Failed to fetch documents', response.status);
    }
    return response.json() as Promise<import('./types').Document[]>;
  },
  get: async (id: string) => {
    const token = getAuthToken();
    const response = await fetch(`/api/documents/${id}`, {
      headers: token ? { 'Authorization': `Bearer ${token}` } : {},
    });
    if (!response.ok) {
      const error = await response.json();
      throw new ApiError(error.error || 'Failed to fetch document', response.status);
    }
    return response.json() as Promise<import('./types').Document>;
  },
  upload: async (file: File, matterId: string) => {
    const token = getAuthToken();
    const formData = new FormData();
    formData.append('file', file);
    formData.append('matterId', matterId);
    const response = await fetch('/api/documents', {
      method: 'POST',
      headers: token ? { 'Authorization': `Bearer ${token}` } : {},
      body: formData,
    });
    if (!response.ok) {
      const error = await response.json();
      throw new ApiError(error.error || 'Failed to upload document', response.status);
    }
    return response.json() as Promise<import('./types').Document>;
  },
  delete: async (id: string) => {
    const token = getAuthToken();
    const response = await fetch(`/api/documents/${id}`, {
      method: 'DELETE',
      headers: token ? { 'Authorization': `Bearer ${token}` } : {},
    });
    if (!response.ok) {
      const error = await response.json();
      throw new ApiError(error.error || 'Failed to delete document', response.status);
    }
    return response.json();
  },
};

// ============ Tasks API (direct routes) ============
export const tasksApi = {
  list: async () => {
    const token = getAuthToken();
    const response = await fetch('/api/tasks', {
      headers: token ? { 'Authorization': `Bearer ${token}` } : {},
    });
    if (!response.ok) {
      const error = await response.json();
      throw new ApiError(error.error || 'Failed to fetch tasks', response.status);
    }
    return response.json() as Promise<import('./types').AITask[]>;
  },
  get: async (id: string) => {
    const token = getAuthToken();
    const response = await fetch(`/api/tasks/${id}`, {
      headers: token ? { 'Authorization': `Bearer ${token}` } : {},
    });
    if (!response.ok) {
      const error = await response.json();
      throw new ApiError(error.error || 'Failed to fetch task', response.status);
    }
    return response.json() as Promise<import('./types').AITask>;
  },
  create: async (data: { type?: string; taskType?: string; matterId: string; documentIds?: string[]; instructions?: string }) => {
    const token = getAuthToken();
    const response = await fetch('/api/tasks', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new ApiError(error.error || 'Failed to create task', response.status);
    }
    return response.json() as Promise<import('./types').AITask>;
  },
  execute: async (id: string) => {
    const token = getAuthToken();
    const response = await fetch(`/api/tasks/${id}/execute`, {
      method: 'POST',
      headers: token ? { 'Authorization': `Bearer ${token}` } : {},
    });
    if (!response.ok) {
      const error = await response.json();
      throw new ApiError(error.error || 'Failed to execute task', response.status);
    }
    return response.json() as Promise<import('./types').AITask>;
  },
};

// ============ Outputs API (direct routes) ============
export const outputsApi = {
  list: async () => {
    const token = getAuthToken();
    const response = await fetch('/api/outputs', {
      headers: token ? { 'Authorization': `Bearer ${token}` } : {},
    });
    if (!response.ok) {
      const error = await response.json();
      throw new ApiError(error.error || 'Failed to fetch outputs', response.status);
    }
    return response.json() as Promise<import('./types').AIOutput[]>;
  },
  get: async (id: string) => {
    const token = getAuthToken();
    const response = await fetch(`/api/outputs/${id}`, {
      headers: token ? { 'Authorization': `Bearer ${token}` } : {},
    });
    if (!response.ok) {
      const error = await response.json();
      throw new ApiError(error.error || 'Failed to fetch output', response.status);
    }
    return response.json() as Promise<import('./types').AIOutput>;
  },
  export: async (id: string, format: 'pdf' | 'docx') => {
    const token = getAuthToken();
    const response = await fetch(`/api/outputs/${id}/export`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ format }),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new ApiError(error.error || 'Failed to export output', response.status);
    }
    return response.json() as Promise<{ url: string }>;
  },
};

// ============ Intakes API (direct routes) ============
export const intakesApi = {
  list: async () => {
    const token = getAuthToken();
    const response = await fetch('/api/intakes', {
      headers: token ? { 'Authorization': `Bearer ${token}` } : {},
    });
    if (!response.ok) {
      const error = await response.json();
      throw new ApiError(error.error || 'Failed to fetch intakes', response.status);
    }
    return response.json() as Promise<import('./types').IntakeForm[]>;
  },
  get: async (id: string) => {
    const token = getAuthToken();
    const response = await fetch(`/api/intakes/${id}`, {
      headers: token ? { 'Authorization': `Bearer ${token}` } : {},
    });
    if (!response.ok) {
      const error = await response.json();
      throw new ApiError(error.error || 'Failed to fetch intake', response.status);
    }
    return response.json() as Promise<import('./types').IntakeForm>;
  },
  create: async (data: Partial<import('./types').IntakeForm>) => {
    const token = getAuthToken();
    const response = await fetch('/api/intakes', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new ApiError(error.error || 'Failed to create intake', response.status);
    }
    return response.json() as Promise<import('./types').IntakeForm>;
  },
  lock: async (id: string) => {
    const token = getAuthToken();
    const response = await fetch(`/api/intakes/${id}/lock`, {
      method: 'POST',
      headers: token ? { 'Authorization': `Bearer ${token}` } : {},
    });
    if (!response.ok) {
      const error = await response.json();
      throw new ApiError(error.error || 'Failed to lock intake', response.status);
    }
    return response.json() as Promise<import('./types').IntakeForm>;
  },
  unlock: async (id: string) => {
    const token = getAuthToken();
    const response = await fetch(`/api/intakes/${id}`, {
      method: 'PATCH',
      headers: token ? { 'Authorization': `Bearer ${token}` } : {},
    });
    if (!response.ok) {
      const error = await response.json();
      throw new ApiError(error.error || 'Failed to unlock intake', response.status);
    }
    return response.json() as Promise<import('./types').IntakeForm>;
  },
};

// ============ Users API (direct routes) ============
export const usersApi = {
  list: async () => {
    const token = getAuthToken();
    const response = await fetch('/api/users', {
      headers: token ? { 'Authorization': `Bearer ${token}` } : {},
    });
    if (!response.ok) {
      const error = await response.json();
      throw new ApiError(error.error || 'Failed to fetch users', response.status);
    }
    return response.json() as Promise<import('./types').User[]>;
  },
  get: async (id: string) => {
    const token = getAuthToken();
    const response = await fetch(`/api/users/${id}`, {
      headers: token ? { 'Authorization': `Bearer ${token}` } : {},
    });
    if (!response.ok) {
      const error = await response.json();
      throw new ApiError(error.error || 'Failed to fetch user', response.status);
    }
    return response.json() as Promise<import('./types').User>;
  },
  update: async (id: string, data: Partial<import('./types').User>) => {
    const token = getAuthToken();
    const response = await fetch(`/api/users/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new ApiError(error.error || 'Failed to update user', response.status);
    }
    return response.json() as Promise<import('./types').User>;
  },
};

export const knowledgeUnitsApi = {
  listByMatter: async (matterId: string) => {
    const token = getAuthToken();
    const response = await fetch(`/api/knowledge-units?matterId=${encodeURIComponent(matterId)}`, {
      headers: token ? { 'Authorization': `Bearer ${token}` } : {},
    });
    if (!response.ok) {
      const error = await response.json();
      throw new ApiError(error.error || 'Failed to fetch knowledge units', response.status);
    }
    return response.json() as Promise<import('./types').KnowledgeUnit[]>;
  },
};
