export type StaffRole = 'OWNER' | 'ADMIN' | 'MASTER' | 'DEVELOPER' | 'SMM';

export type StaffSession = {
  staff: {
    id: string;
    name: string;
    role: StaffRole;
    phoneE164: string;
    email: string | null;
    permissions?: string[];
  };
  tokens: {
    accessToken: string;
    refreshToken: string;
    expiresInSec: number;
  };
};

export type StaffPermissionCatalogItem = {
  code: string;
  title: string;
  description: string;
  group: 'workspace' | 'finance' | 'marketing' | 'content';
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

type AnalyticsOverviewParams = {
  from: string;
  to: string;
  masterId?: string | null;
  positionId?: string | null;
  userId?: string | null;
};

type CreatePromoCodePayload = {
  code?: string;
  generate?: boolean;
  prefix?: string;
  length?: number;
  name?: string;
  description?: string;
  discountType: 'FIXED' | 'PERCENT';
  discountValue: number;
  startsAt?: string;
  endsAt?: string;
  maxUsages?: number;
  perClientUsageLimit?: number;
  isActive?: boolean;
};

type PromoCodeResponse = {
  promo: {
    id: string;
    code: string;
    endsAt: string | null;
  };
};

type SendPromoCodePayload = {
  email?: string;
  phone?: string;
  clientId?: string;
  subject?: string;
  message?: string;
};

type SendPromoCodeResponse = {
  sent: boolean;
  email: string;
  promo: {
    id: string;
    code: string;
    endsAt: string | null;
  };
  preview?: string | null;
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
const SESSION_STORAGE_KEY = 'mari.staff.session.v1';

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
    this.persistSession(session);
  }

  getRefreshToken() {
    return this.refreshToken;
  }

  clearSession() {
    this.accessToken = '';
    this.refreshToken = '';
    this.persistSession(null);
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

  async requestStaffPinReset(email: string) {
    return this.request<{ sent: boolean; resetLink?: string }>(
      '/staff/reset-pin/request',
      {
        method: 'POST',
        body: JSON.stringify({ email }),
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

  async getStaffPermissionsCatalog() {
    const data = await this.get<{ items: StaffPermissionCatalogItem[] }>('/staff/permissions/catalog');
    return data.items;
  }

  async getStaffPermissions(staffId: string) {
    const data = await this.get<{ items: Array<{ code: string }> }>(`/staff/${staffId}/permissions`);
    return data.items.map((item) => item.code);
  }

  async getCurrentStaffProfile() {
    const data = await this.get<{ staff: Record<string, unknown> }>('/staff/me');
    return data.staff;
  }

  async grantStaffPermission(staffId: string, code: string) {
    await this.post(`/staff/${staffId}/permissions`, { code });
  }

  async revokeStaffPermission(staffId: string, code: string) {
    await this.delete(`/staff/${staffId}/permissions/${encodeURIComponent(code)}`);
  }

  async getAnalyticsOverview({
    from,
    to,
    masterId,
    positionId,
    userId,
  }: AnalyticsOverviewParams) {
    const variants = [
      {
        from,
        to,
        ...(masterId ? { masterId } : {}),
        ...(positionId ? { positionId } : {}),
        ...(userId ? { userId } : {}),
      },
      {
        start_date: from,
        end_date: to,
        master_id: masterId || '0',
        position_id: positionId || '0',
        user_id: userId || '0',
      },
      {
        from,
        to,
        master_id: masterId || '0',
        position_id: positionId || '0',
      },
    ];
    let lastError: unknown = null;

    for (const variant of variants) {
      const params = new URLSearchParams();
      Object.entries(variant).forEach(([key, value]) => {
        if (typeof value === 'string' && value.trim().length > 0) {
          params.set(key, value);
        }
      });
      try {
        return await this.get<Record<string, unknown>>(`/reports/overview?${params.toString()}`);
      } catch (error) {
        lastError = error;
      }
    }

    throw lastError instanceof Error ? lastError : new ApiError('Не удалось загрузить аналитику', 500);
  }

  async updateClientPermanentDiscount(clientId: string, percent: number | null) {
    return this.patch<{ client: Record<string, unknown> }>(`/clients/${clientId}/discount`, {
      discount: {
        mode: 'PERMANENT',
        type: percent === null ? 'NONE' : 'PERCENT',
        ...(percent === null ? null : { value: percent }),
      },
    });
  }

  async createPromoCode(payload: CreatePromoCodePayload) {
    return this.post<PromoCodeResponse>('/promocodes', payload);
  }

  async sendPromoCode(promoId: string, payload: SendPromoCodePayload) {
    return this.post<SendPromoCodeResponse>(`/promocodes/${promoId}/send`, payload);
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

  private persistSession(session: StaffSession | null) {
    if (typeof window === 'undefined' || !window.localStorage) {
      return;
    }
    try {
      if (session) {
        window.localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
      } else {
        window.localStorage.removeItem(SESSION_STORAGE_KEY);
      }
    } catch {
      // ignore storage errors (private mode / quota)
    }
  }
}

export const api = new ApiClient(DEFAULT_BASE_URL);
