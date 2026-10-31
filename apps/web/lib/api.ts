import type {
  AuthResponse,
  AuthUser,
  LearningGoal,
  LearningGoalStatus,
  Project,
  Task,
  TaskPriority,
  TaskStatus,
} from '@devtrack/shared';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? (process.env.NODE_ENV === 'production' ? '' : 'http://localhost:3001');

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
  retry?: boolean;
};

let refreshPromise: Promise<boolean> | null = null;

async function tryRefresh(): Promise<boolean> {
  try {
    const response = await fetch(`${API_BASE}/api/v1/auth/refresh`, {
      method: 'POST',
      headers: { Accept: 'application/json' },
      credentials: 'include',
    });

    return response.ok;
  } catch {
    return false;
  }
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const headers: Record<string, string> = {
    Accept: 'application/json',
  };

  if (options.body !== undefined) {
    headers['Content-Type'] = 'application/json';
  }

  const response = await fetch(`${API_BASE}/api/v1${path}`, {
    method: options.method ?? 'GET',
    headers,
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
    credentials: 'include',
  });

  if (
    response.status === 401 &&
    options.auth !== false &&
    options.retry !== false &&
    path !== '/auth/refresh'
  ) {
    refreshPromise ??= tryRefresh().finally(() => {
      refreshPromise = null;
    });
    const refreshed = await refreshPromise;
    if (refreshed) {
      return request<T>(path, { ...options, retry: false });
    }
  }

  if (response.status === 204) {
    return undefined as T;
  }

  const payload = (await response.json().catch(() => null)) as {
    message?: string | string[];
  } | null;

  if (!response.ok) {
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

export type CreateGoalInput = {
  title: string;
  description?: string;
  status?: LearningGoalStatus;
  targetDate?: string;
  projectId?: string | null;
};

export type UpdateGoalInput = {
  title?: string;
  description?: string | null;
  status?: LearningGoalStatus;
  targetDate?: string | null;
  projectId?: string | null;
};

export const api = {
  register: (input: RegisterInput) =>
    request<AuthResponse>('/auth/register', { method: 'POST', body: input, auth: false }),
  login: (input: LoginInput) =>
    request<AuthResponse>('/auth/login', { method: 'POST', body: input, auth: false }),
  refresh: () => request<{ ok: true }>('/auth/refresh', { method: 'POST', auth: false }),
  logout: () => request<void>('/auth/logout', { method: 'POST', auth: false }),
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
  listGoals: () => request<LearningGoal[]>('/goals'),
  createGoal: (input: CreateGoalInput) =>
    request<LearningGoal>('/goals', { method: 'POST', body: input }),
  updateGoal: (id: string, input: UpdateGoalInput) =>
    request<LearningGoal>(`/goals/${id}`, { method: 'PATCH', body: input }),
  deleteGoal: (id: string) => request<void>(`/goals/${id}`, { method: 'DELETE' }),
};
