const API_BASE = "/api";

function getToken(): string | null {
  return localStorage.getItem("cvx_access_token");
}

export function setTokens(access: string, refresh: string) {
  localStorage.setItem("cvx_access_token", access);
  localStorage.setItem("cvx_refresh_token", refresh);
}

export function clearTokens() {
  localStorage.removeItem("cvx_access_token");
  localStorage.removeItem("cvx_refresh_token");
}

export function getAuthHeaders(): Record<string, string> {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function apiFetch(
  path: string,
  options: RequestInit = {}
): Promise<Response> {
  const headers: Record<string, string> = {
    ...getAuthHeaders(),
    ...(options.headers as Record<string, string> || {}),
  };

  // Add Content-Type for JSON bodies
  if (options.body && typeof options.body === "string") {
    headers["Content-Type"] = "application/json";
  }

  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  });

  // Auto-refresh token on 401
  if (res.status === 401 && getToken()) {
    const refreshed = await tryRefreshToken();
    if (refreshed) {
      headers.Authorization = `Bearer ${getToken()}`;
      return fetch(`${API_BASE}${path}`, { ...options, headers });
    }
  }

  return res;
}

async function tryRefreshToken(): Promise<boolean> {
  const refresh = localStorage.getItem("cvx_refresh_token");
  if (!refresh) return false;

  try {
    const res = await fetch(`${API_BASE}/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh_token: refresh }),
    });
    if (res.ok) {
      const data = await res.json();
      localStorage.setItem("cvx_access_token", data.access_token);
      return true;
    }
  } catch { /* ignore */ }

  clearTokens();
  return false;
}
