const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8787';

interface ApiResponse<T = unknown> {
  ok: boolean;
  data?: T;
  error?: string;
}

async function request<T>(
  path: string,
  options: RequestInit = {},
  userId?: string | null
): Promise<ApiResponse<T>> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (userId) {
    headers['X-User-Id'] = userId;
  } else if (typeof window !== 'undefined') {
    const stored = localStorage.getItem('userId');
    if (stored) headers['X-User-Id'] = stored;
  }

  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  });

  const json = await res.json();
  return json as ApiResponse<T>;
}

export const api = {
  // ── Auth ────────────────────────────────────
  register: (body: { name: string; email: string; password: string; role?: string; phone?: string }) =>
    request('/api/users/register', { method: 'POST', body: JSON.stringify(body) }),

  login: (email: string, password: string) =>
    request<{ id: string; name: string; email: string; role: string }>(
      '/api/users/login',
      { method: 'POST', body: JSON.stringify({ email, password }) }
    ),

  me: () => request('/api/users/me'),

  // ── Users ───────────────────────────────────
  listUsers: (role?: string) => request(`/api/users${role ? `?role=${role}` : ''}`),
  toggleUser: (id: string) => request(`/api/users/${id}/toggle`, { method: 'PATCH' }),

  // ── Zones ───────────────────────────────────
  listZones: () => request('/api/zones'),
  createZone: (body: { name: string; description?: string }) =>
    request('/api/zones', { method: 'POST', body: JSON.stringify(body) }),
  updateZone: (id: string, body: { name?: string; description?: string }) =>
    request(`/api/zones/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  deleteZone: (id: string) => request(`/api/zones/${id}`, { method: 'DELETE' }),

  // ── Areas ───────────────────────────────────
  listAreas: (zoneId: string) => request(`/api/zones/${zoneId}/areas`),
  createArea: (zoneId: string, body: { name: string; pincode: string }) =>
    request(`/api/zones/${zoneId}/areas`, { method: 'POST', body: JSON.stringify(body) }),
  deleteArea: (areaId: string) =>
    request(`/api/zones/areas/${areaId}`, { method: 'DELETE' }),
  lookupPincode: (pincode: string) => request(`/api/zones/lookup/pincode/${pincode}`),

  // ── Rate Cards ──────────────────────────────
  listRates: (zoneId: string) => request(`/api/zones/${zoneId}/rates`),
  createRate: (zoneId: string, body: Record<string, unknown>) =>
    request(`/api/zones/${zoneId}/rates`, { method: 'POST', body: JSON.stringify(body) }),
  updateRate: (zoneId: string, rateId: string, body: Record<string, unknown>) =>
    request(`/api/zones/${zoneId}/rates/${rateId}`, { method: 'PUT', body: JSON.stringify(body) }),

  // ── Orders ──────────────────────────────────
  createOrder: (body: Record<string, unknown>) =>
    request('/api/orders', { method: 'POST', body: JSON.stringify(body) }),
  listOrders: (status?: string) => request(`/api/orders${status ? `?status=${status}` : ''}`),
  getOrder: (id: string) => request(`/api/orders/${id}`),
  getOrderHistory: (id: string) => request(`/api/orders/${id}/history`),
  assignOrder: (id: string, agentId: string) =>
    request(`/api/orders/${id}/assign`, { method: 'PATCH', body: JSON.stringify({ agent_id: agentId }) }),
  cancelOrder: (id: string) =>
    request(`/api/orders/${id}/cancel`, { method: 'PATCH' }),
  calculateRate: (body: Record<string, unknown>) =>
    request('/api/orders/calculate-rate', { method: 'POST', body: JSON.stringify(body) }),

  // ── Agents ──────────────────────────────────
  listAgents: () => request('/api/agents'),
  agentProfile: () => request('/api/agents/profile'),
  createAgentProfile: (body: { user_id?: string; zone_id: string; max_orders?: number }) =>
    request('/api/agents/profile', { method: 'POST', body: JSON.stringify(body) }),
  updateAvailability: (isAvailable: boolean) =>
    request('/api/agents/availability', { method: 'PATCH', body: JSON.stringify({ is_available: isAvailable }) }),
  updateLocation: (lat: number, lng: number) =>
    request('/api/agents/location', { method: 'PATCH', body: JSON.stringify({ lat, lng }) }),
  updateOrderStatus: (orderId: string, status: string, note?: string) =>
    request(`/api/agents/orders/${orderId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status, note }),
    }),
  failOrder: (orderId: string, reason: string, rescheduleDate?: string) =>
    request(`/api/agents/orders/${orderId}/fail`, {
      method: 'POST',
      body: JSON.stringify({ reason, reschedule_date: rescheduleDate }),
    }),
  listFailures: (orderId: string) => request(`/api/agents/orders/${orderId}/failures`),
};

// ── Auth helpers ─────────────────────────────────────────
export function saveAuth(id: string, name: string, email: string, role: string) {
  localStorage.setItem('userId', id);
  localStorage.setItem('userName', name);
  localStorage.setItem('userEmail', email);
  localStorage.setItem('userRole', role);
}

export function getAuth() {
  if (typeof window === 'undefined') return null;
  const id = localStorage.getItem('userId');
  if (!id) return null;
  return {
    id,
    name: localStorage.getItem('userName') || '',
    email: localStorage.getItem('userEmail') || '',
    role: localStorage.getItem('userRole') || '',
  };
}

export function clearAuth() {
  localStorage.removeItem('userId');
  localStorage.removeItem('userName');
  localStorage.removeItem('userEmail');
  localStorage.removeItem('userRole');
}
