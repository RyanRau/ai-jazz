export interface ApiUser {
  id: string;
  email: string;
}

export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

export interface ApiClientOptions {
  baseUrl: string;
  /** localStorage key for the refresh token */
  storageKey?: string;
}

export interface ApiClient {
  /** Restore the session from a stored refresh token. Resolves to the user or null. */
  restore(): Promise<ApiUser | null>;
  login(email: string, password: string): Promise<ApiUser>;
  logout(): Promise<void>;
  getUser(): ApiUser | null;
  isAuthenticated(): boolean;
  /** Notify on auth-state changes. Returns an unsubscribe function. */
  subscribe(cb: (user: ApiUser | null) => void): () => void;
  /** Authenticated fetch: attaches the access token and retries once after a refresh on 401. */
  request(path: string, init?: RequestInit): Promise<Response>;
  /** request() + JSON parsing; throws ApiError with the server's error message on non-2xx. */
  requestJson<T>(path: string, init?: RequestInit): Promise<T>;
}

interface TokenResponse {
  accessToken: string;
  refreshToken: string;
  user: ApiUser;
}

export function createApiClient(options: ApiClientOptions): ApiClient {
  const baseUrl = options.baseUrl.replace(/\/$/, "");
  const storageKey = options.storageKey ?? "api.refreshToken";
  const storage = typeof localStorage === "undefined" ? null : localStorage;

  let accessToken: string | null = null;
  let user: ApiUser | null = null;
  let refreshPromise: Promise<boolean> | null = null;
  const listeners = new Set<(user: ApiUser | null) => void>();

  function notify() {
    for (const cb of listeners) cb(user);
  }

  function setSession(tokens: TokenResponse) {
    accessToken = tokens.accessToken;
    user = tokens.user;
    storage?.setItem(storageKey, tokens.refreshToken);
    notify();
  }

  function clearSession() {
    accessToken = null;
    user = null;
    storage?.removeItem(storageKey);
    notify();
  }

  async function parseJson<T>(res: Response): Promise<T> {
    const body = await res.json().catch(() => null);
    if (!res.ok) {
      const message =
        body && typeof body.error === "string" ? body.error : `Request failed (${res.status})`;
      throw new ApiError(message, res.status);
    }
    return body as T;
  }

  /** Single-flight refresh; resolves true if a new session was obtained. */
  function refresh(): Promise<boolean> {
    refreshPromise ??= (async () => {
      const refreshToken = storage?.getItem(storageKey);
      if (!refreshToken) return false;
      try {
        const res = await fetch(`${baseUrl}/auth/refresh`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ refreshToken }),
        });
        if (!res.ok) {
          clearSession();
          return false;
        }
        setSession(await parseJson<TokenResponse>(res));
        return true;
      } catch {
        return false;
      } finally {
        refreshPromise = null;
      }
    })();
    return refreshPromise;
  }

  async function request(path: string, init: RequestInit = {}): Promise<Response> {
    const doFetch = () =>
      fetch(`${baseUrl}${path}`, {
        ...init,
        headers: {
          ...(init.headers ?? {}),
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        },
      });

    let res = await doFetch();
    if (res.status === 401 && (await refresh())) {
      res = await doFetch();
    }
    return res;
  }

  return {
    async restore() {
      await refresh();
      return user;
    },

    async login(email, password) {
      const res = await fetch(`${baseUrl}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const tokens = await parseJson<TokenResponse>(res);
      setSession(tokens);
      return tokens.user;
    },

    async logout() {
      const refreshToken = storage?.getItem(storageKey);
      if (refreshToken) {
        await fetch(`${baseUrl}/auth/logout`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ refreshToken }),
        }).catch(() => {});
      }
      clearSession();
    },

    getUser: () => user,
    isAuthenticated: () => user !== null,

    subscribe(cb) {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },

    request,

    async requestJson<T>(path: string, init?: RequestInit) {
      const res = await request(path, {
        ...init,
        headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
      });
      if (res.status === 401) {
        clearSession();
      }
      return parseJson<T>(res);
    },
  };
}
