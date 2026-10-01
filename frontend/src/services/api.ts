const API_BASE_URL = (import.meta.env.VITE_API_URL ? `${import.meta.env.VITE_API_URL.replace(/\/+$/, '')}/api` : 'http://127.0.0.1:8000/api');

export const getAuthToken = (): string | null => {
  return localStorage.getItem('pathly_token');
};

export const setAuthToken = (token: string) => {
  localStorage.setItem('pathly_token', token);
};

export const removeAuthToken = () => {
  localStorage.removeItem('pathly_token');
  localStorage.removeItem('pathly_refresh_token');
};

export async function apiRequest<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = getAuthToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {}),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (response.status === 401) {
    removeAuthToken();
    if (window.location.pathname !== '/login') {
      window.location.href = '/login';
    }
    throw new Error('Unauthorized');
  }

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const message = errorData.detail || errorData.error || response.statusText || 'API Request Failed';
    const err = new Error(message);
    (err as any).response = { status: response.status, data: errorData };
    throw err;
  }

  if (response.status === 204) {
    return {} as T;
  }

  return response.json();
}

export const api = {
  get: async <T = any>(endpoint: string, config?: { params?: Record<string, any> }) => {
    let url = endpoint;
    if (config?.params) {
      const searchParams = new URLSearchParams();
      Object.entries(config.params).forEach(([k, v]) => {
        if (v !== undefined && v !== null) searchParams.append(k, String(v));
      });
      const queryString = searchParams.toString();
      if (queryString) url += `?${queryString}`;
    }
    const data = await apiRequest<T>(url, { method: 'GET' });
    return { data };
  },

  post: async <T = any>(endpoint: string, bodyData?: any) => {
    const data = await apiRequest<T>(endpoint, {
      method: 'POST',
      body: JSON.stringify(bodyData),
    });
    return { data };
  },

  patch: async <T = any>(endpoint: string, bodyData?: any) => {
    const data = await apiRequest<T>(endpoint, {
      method: 'PATCH',
      body: JSON.stringify(bodyData),
    });
    return { data };
  },

  delete: async <T = any>(endpoint: string, config?: { params?: Record<string, any>; data?: any }) => {
    let url = endpoint;
    if (config?.params) {
      const searchParams = new URLSearchParams();
      Object.entries(config.params).forEach(([k, v]) => {
        if (v !== undefined && v !== null) searchParams.append(k, String(v));
      });
      const queryString = searchParams.toString();
      if (queryString) url += `?${queryString}`;
    }
    const data = await apiRequest<T>(url, {
      method: 'DELETE',
      body: config?.data ? JSON.stringify(config.data) : undefined,
    });
    return { data };
  },
};
