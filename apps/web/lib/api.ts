import type {
  AuthResponse,
  AuthUser,
  Project,
  Task,
  TaskPriority,
  TaskStatus,
} from '@devtrack/shared';

import { clearAccessToken, getAccessToken } from './auth-storage';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

type RequestOptions = {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  body?: unknown;
  auth?: boolean;
};

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const headers: Record<string, string> = {
    Accept: 'application/json',
  };

  if (options.body !== undefined) {
    headers['Content-Type'] = 'application/json';
  }

  if (options.auth !== false) {
    const token = getAccessToken();
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }
  }

  const response = await fetch(`${API_BASE}/api/v1${path}`, {
    method: options.method ?? 'GET',
    headers,
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
  });

  if (response.status === 204) {
    return undefined as T;
  }

  const payload = (await response.json().catch(() => null)) as {
    message?: string | string[];
  } | null;

  if (!response.ok) {
    if (response.status === 401 && options.auth !== false) {
      clearAccessToken();
    }

    const message = Array.isArray(payload?.message)
      ? payload.message.join(', ')
      : (payload?.message ?? `Request failed (${response.status})`);

    throw new ApiError(message, response.status);
  }

  return payload as T;
}

export type RegisterInput = {
  email: string;
  password: string;
  name: string;
};

export type LoginInput = {
  email: string;
  password: string;
};

export type CreateProjectInput = {
  name: string;
  description?: string;
};

export type UpdateProjectInput = {
  name?: string;
  description?: string | null;
};

export type CreateTaskInput = {
  title: string;
  description?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  dueDate?: string;
};

export type UpdateTaskInput = {
  title?: string;
  description?: string | null;
  status?: TaskStatus;
  priority?: TaskPriority;
  dueDate?: string | null;
};

export const api = {
  register: (input: RegisterInput) =>
    request<AuthResponse>('/auth/register', { method: 'POST', body: input, auth: false }),
  login: (input: LoginInput) =>
    request<AuthResponse>('/auth/login', { method: 'POST', body: input, auth: false }),
  me: () => request<AuthUser>('/auth/me'),
  listProjects: () => request<Project[]>('/projects'),
  getProject: (id: string) => request<Project>(`/projects/${id}`),
  createProject: (input: CreateProjectInput) =>
    request<Project>('/projects', { method: 'POST', body: input }),
  updateProject: (id: string, input: UpdateProjectInput) =>
    request<Project>(`/projects/${id}`, { method: 'PATCH', body: input }),
  deleteProject: (id: string) => request<void>(`/projects/${id}`, { method: 'DELETE' }),
  listTasks: (projectId: string) => request<Task[]>(`/projects/${projectId}/tasks`),
  createTask: (projectId: string, input: CreateTaskInput) =>
    request<Task>(`/projects/${projectId}/tasks`, { method: 'POST', body: input }),
  updateTask: (projectId: string, taskId: string, input: UpdateTaskInput) =>
    request<Task>(`/projects/${projectId}/tasks/${taskId}`, { method: 'PATCH', body: input }),
  deleteTask: (projectId: string, taskId: string) =>
    request<void>(`/projects/${projectId}/tasks/${taskId}`, { method: 'DELETE' }),
};
