import { User, Category, Budget, Expense, MonthlyDashboardData } from '../types';

let authToken: string | null = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;

export function setToken(token: string | null) {
  authToken = token;
  if (token) {
    localStorage.setItem('auth_token', token);
  } else {
    localStorage.removeItem('auth_token');
  }
}

export function getToken(): string | null {
  return authToken;
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers || {});
  
  if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  if (authToken) {
    headers.set('Authorization', `Bearer ${authToken}`);
  }

  const response = await fetch(endpoint, {
    ...options,
    headers,
    credentials: 'include',
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.error || data.message || `Request failed with status ${response.status}`);
  }

  return data as T;
}

export const api = {
  // Auth
  register: (body: { username: string; email: string; password: string; confirmPassword: string }) =>
    request<{ user: User; token: string; message: string }>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  login: (body: { identifier: string; password: string }) =>
    request<{ user: User; token: string; message: string }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  logout: () =>
    request<{ success: boolean }>('/api/auth/logout', {
      method: 'POST',
    }),

  getMe: () => request<{ user: User }>('/api/auth/me'),

  // Categories
  getCategories: () => request<{ categories: Category[] }>('/api/categories'),

  createCategory: (body: { name: string; description?: string }) =>
    request<{ category: Category; message: string }>('/api/categories', {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  updateCategory: (id: string, body: { name: string; description?: string }) =>
    request<{ category: Category; message: string }>(`/api/categories/${id}`, {
      method: 'PUT',
      body: JSON.stringify(body),
    }),

  deleteCategory: (id: string) =>
    request<{ success: boolean; message: string }>(`/api/categories/${id}`, {
      method: 'DELETE',
    }),

  // Budgets
  getBudgets: (month?: string) =>
    request<{ budgets: Budget[] }>(`/api/budgets${month ? `?month=${month}` : ''}`),

  saveBudget: (body: { category_id: string; month_year: string; monthly_limit: number }) =>
    request<{ budget: Budget; message: string }>('/api/budgets', {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  updateBudget: (id: string, body: { monthly_limit: number; category_id?: string; month_year?: string }) =>
    request<{ budget: Budget; message: string }>(`/api/budgets/${id}`, {
      method: 'PUT',
      body: JSON.stringify(body),
    }),

  deleteBudget: (id: string) =>
    request<{ success: boolean; message: string }>(`/api/budgets/${id}`, {
      method: 'DELETE',
    }),

  // Expenses
  getExpenses: (month?: string, categoryId?: string) => {
    const params = new URLSearchParams();
    if (month) params.append('month', month);
    if (categoryId) params.append('category_id', categoryId);
    const qs = params.toString();
    return request<{ expenses: Expense[] }>(`/api/expenses${qs ? `?${qs}` : ''}`);
  },

  createExpense: (body: { category_id: string; amount: number; date: string; notes?: string }) =>
    request<{ expense: Expense; message: string }>('/api/expenses', {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  updateExpense: (id: string, body: { category_id: string; amount: number; date: string; notes?: string }) =>
    request<{ expense: Expense; message: string }>(`/api/expenses/${id}`, {
      method: 'PUT',
      body: JSON.stringify(body),
    }),

  deleteExpense: (id: string) =>
    request<{ success: boolean; message: string }>(`/api/expenses/${id}`, {
      method: 'DELETE',
    }),

  // Dashboard
  getDashboard: (month: string) =>
    request<MonthlyDashboardData>(`/api/dashboard?month=${month}`),

  // Seed Demo Data
  seedDemo: () => request<{ message: string }>('/api/seed-demo', { method: 'POST' }),

  // Run Automated Tests
  runAutomatedTests: () =>
    request<{
      allPassed: boolean;
      testResults: {
        id: string;
        title: string;
        passed: boolean;
        expected: string;
        actual: string;
      }[];
    }>('/api/run-automated-tests'),
};
