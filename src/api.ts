export type StaffRole = 'OWNER' | 'ADMIN' | 'MASTER';

export type StaffSession = {
  staff: {
    id: string;
    name: string;
    role: StaffRole;
    phoneE164: string;
    email: string | null;
  };
  tokens: {
    accessToken: string;
    refreshToken: string;
    expiresInSec: number;
  };
};

type ApiErrorPayload = {
  code?: string;
  message?: string;
  details?: unknown;
};

type ApiEnvelope<T> = {
  ok: boolean;
  data: T;
  error?: ApiErrorPayload;
  meta?: unknown;
};

type RequestOptions = {
  auth?: boolean;
  allowRefresh?: boolean;
};

export class ApiError extends Error {
  readonly code?: string;
  readonly status: number;
  readonly details?: unknown;

  constructor(message: string, status: number, code?: string, details?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

const DEFAULT_BASE_URL =
  process.env.REACT_APP_API_BASE_URL || 'https://api.maribeauty.ru';

class ApiClient {
  private baseUrl: string;
  private accessToken = '';
  private refreshToken = '';

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl.replace(/\/+$/, '');
  }

  setSession(session: StaffSession | null) {
    this.accessToken = session?.tokens.accessToken ?? '';
    this.refreshToken = session?.tokens.refreshToken ?? '';
  }

  getRefreshToken() {
    return this.refreshToken;
  }

  clearSession() {
    this.accessToken = '';
    this.refreshToken = '';
  }

  async login(phone: string, pin: string) {
    const data = await this.request<StaffSession>(
      '/auth/staff/login',
      {
        method: 'POST',
        body: JSON.stringify({ phone, pin }),
      },
      { auth: false, allowRefresh: false },
    );
    this.setSession(data);
    return data;
  }

  async setStaffPin(token: string, pin: string) {
    const data = await this.request<StaffSession>(
      '/staff/set-pin',
      {
        method: 'POST',
        body: JSON.stringify({ token, pin }),
      },
      { auth: false, allowRefresh: false },
    );
    this.setSession(data);
    return data;
  }

  async requestStaffPinReset(phone: string) {
    return this.request<{ sent: boolean; resetLink?: string }>(
      '/staff/reset-pin/request',
      {
        method: 'POST',
        body: JSON.stringify({ phone }),
      },
      { auth: false, allowRefresh: false },
    );
  }

  async confirmStaffPinReset(token: string, newPin: string) {
    const data = await this.request<StaffSession>(
      '/staff/reset-pin/confirm',
      {
        method: 'POST',
        body: JSON.stringify({ token, newPin }),
      },
      { auth: false, allowRefresh: false },
    );
    this.setSession(data);
    return data;
  }

  async refresh() {
    if (!this.refreshToken) {
      throw new ApiError('Нет refresh token', 401, 'AUTH_REQUIRED');
    }
    const data = await this.request<StaffSession>(
      '/auth/staff/refresh',
      {
        method: 'POST',
        body: JSON.stringify({ refreshToken: this.refreshToken }),
      },
      { auth: false, allowRefresh: false },
    );
    this.setSession(data);
    return data;
  }

  async logout() {
    if (!this.refreshToken) {
      return;
    }
    try {
      await this.request<{ revoked: boolean }>(
        '/auth/staff/logout',
        {
          method: 'POST',
          body: JSON.stringify({ refreshToken: this.refreshToken }),
        },
        { auth: false, allowRefresh: false },
      );
    } finally {
      this.clearSession();
    }
  }

  async get<T>(path: string, options?: RequestOptions) {
    return this.request<T>(path, { method: 'GET' }, options);
  }

  async post<T>(path: string, body: unknown, options?: RequestOptions) {
    return this.request<T>(
      path,
      {
        method: 'POST',
        body: JSON.stringify(body),
      },
      options,
    );
  }

  async postForm<T>(path: string, body: FormData, options?: RequestOptions) {
    return this.request<T>(
      path,
      {
        method: 'POST',
        body,
      },
      options,
    );
  }

  async patch<T>(path: string, body: unknown, options?: RequestOptions) {
    return this.request<T>(
      path,
      {
        method: 'PATCH',
        body: JSON.stringify(body),
      },
      options,
    );
  }

  async put<T>(path: string, body: unknown, options?: RequestOptions) {
    return this.request<T>(
      path,
      {
        method: 'PUT',
        body: JSON.stringify(body),
      },
      options,
    );
  }

  async delete<T>(path: string, body?: unknown, options?: RequestOptions) {
    return this.request<T>(
      path,
      {
        method: 'DELETE',
        ...(body === undefined ? null : { body: JSON.stringify(body) }),
      },
      options,
    );
  }

  private async request<T>(path: string, init: RequestInit, options?: RequestOptions): Promise<T> {
    const auth = options?.auth ?? true;
    const allowRefresh = options?.allowRefresh ?? true;
    const isFormDataBody =
      typeof FormData !== 'undefined' && init.body instanceof FormData;
    const headers: Record<string, string> = {};
    if (!isFormDataBody) {
      headers['Content-Type'] = 'application/json';
    }
    if (init.headers && typeof init.headers === 'object' && !Array.isArray(init.headers)) {
      Object.entries(init.headers as Record<string, string>).forEach(([key, value]) => {
        headers[key] = value;
      });
    }

    if (auth && this.accessToken) {
      headers.Authorization = `Bearer ${this.accessToken}`;
    }

    const response = await fetch(`${this.baseUrl}${path}`, {
      ...init,
      headers,
    });

    const parsed = await response.json().catch(() => null);
    const envelope = parsed as ApiEnvelope<T> | null;
    if (response.status === 401 && allowRefresh && this.refreshToken && auth) {
      await this.refresh();
      return this.request<T>(path, init, { ...options, allowRefresh: false });
    }

    if (!response.ok) {
      const error = envelope?.error;
      throw new ApiError(error?.message || `HTTP ${response.status}`, response.status, error?.code, error?.details);
    }

    if (
      envelope &&
      typeof envelope === 'object' &&
      'ok' in envelope &&
      'data' in envelope
    ) {
      if (!envelope.ok) {
        const error = envelope.error;
        throw new ApiError(
          error?.message || `HTTP ${response.status}`,
          response.status,
          error?.code,
          error?.details,
        );
      }
      return envelope.data;
    }

    return parsed as T;
  }
}

export const api = new ApiClient(DEFAULT_BASE_URL);
