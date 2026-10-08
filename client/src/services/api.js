import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('authToken');

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('authToken');
      window.dispatchEvent(new Event('auth-expired'));
    }

    return Promise.reject(error);
  },
);

function payload(response) {
  return response?.data || {};
}

function unwrap(response) {
  const body = payload(response);
  return body.data ?? body;
}

function toListResult(response) {
  const body = response?.data || {};

  return {
    items: Array.isArray(body.data) ? body.data : [],
    pagination: body.pagination || {},
  };
}

export const authApi = {
  register: (payload) => api.post('/auth/register', payload),
  login: (payload) => api.post('/auth/login', payload),
  me: () => api.get('/auth/me'),
  logout: () => api.post('/auth/logout'),
};

export const dashboardApi = {
  overview: (params = {}) => api.get('/dashboard', { params }),
  highRisk: (params = {}) => api.get('/dashboard/high-risk', { params }),
  summary: (params = {}) => api.get('/dashboard/summary', { params }),
  riskTrends: (params = {}) => api.get('/dashboard/risk-trends', { params }),
  recentTransactions: (params = {}) =>
    api.get('/dashboard/recent-transactions', { params }),
  recentAlerts: (params = {}) => api.get('/dashboard/recent-alerts', { params }),
};

export const transactionApi = {
  list: (params = {}) => api.get('/transactions', { params }),
  get: (id) => api.get(`/transactions/${id}`),
  behavior: (id) => api.get(`/transactions/${id}/behavior`),
  risk: (id) => api.get(`/transactions/${id}/risk`),
  recalculateRisk: (id) =>
    api.post(`/transactions/${id}/recalculate-risk`),
  create: (payload) => api.post('/transactions', payload),
  update: (id, payload) => api.put(`/transactions/${id}`, payload),
  remove: (id) => api.delete(`/transactions/${id}`),
};

export const alertApi = {
  list: (params = {}) => api.get('/alerts', { params }),
  get: (id) => api.get(`/alerts/${id}`),
  updateStatus: (id, status) =>
    api.put(`/alerts/${id}/status`, { status }),
};

export const vendorApi = {
  list: (params = {}) => api.get('/vendors', { params }),
  get: (id) => api.get(`/vendors/${id}`),
  create: (payload) => api.post('/vendors', payload),
  update: (id, payload) => api.put(`/vendors/${id}`, payload),
  remove: (id) => api.delete(`/vendors/${id}`),
};

export const riskApi = {
  list: (params = {}) => api.get('/risk-scores', { params }),
  get: (id) => api.get(`/risk-scores/${id}`),
};

export const userApi = {
  behavior: (userId) => api.get(`/users/${userId}/behavior`),
};

export const investigationApi = {
  chat: (message) => api.post('/investigation/chat', { message }),
};


// Compatibility helpers used by page components.
export async function fetchDashboardOverview(params = {}) {
  return unwrap(await dashboardApi.overview(params));
}

export async function fetchDashboardHighRisk(params = {}) {
  const response = await dashboardApi.highRisk(params);
  const body = response?.data || {};

  return {
    items: Array.isArray(body.data) ? body.data : [],
    pagination: body.pagination || {},
  };
}

export async function fetchDashboardData(params = {}) {
  return fetchDashboardOverview(params);
}

export async function fetchTransactions(params = {}) {
  return toListResult(await transactionApi.list(params));
}

export async function fetchTransactionDetails(id) {
  return unwrap(await transactionApi.get(id));
}

export async function fetchTransactionRisk(id) {
  return unwrap(await transactionApi.risk(id));
}

export async function fetchTransactionBehavior(id) {
  return unwrap(await transactionApi.behavior(id));
}

export async function recalculateTransactionRisk(id) {
  return unwrap(await transactionApi.recalculateRisk(id));
}

export async function fetchAlerts(params = {}) {
  return toListResult(await alertApi.list(params));
}

export async function updateAlertStatus(id, status) {
  return unwrap(await alertApi.updateStatus(id, status));
}

export async function fetchVendors(params = {}) {
  const response = await vendorApi.list(params);
  const body = response?.data || {};

  return Array.isArray(body.data) ? body.data : [];
}

export async function fetchRiskScores(params = {}) {
  return unwrap(await riskApi.list(params));
}

export async function fetchRiskAnalysisData(params = {}) {
  const response = await riskApi.list(params);
  return response?.data || { data: [] };
}

export async function fetchUserBehaviorProfile(userId) {
  return unwrap(await userApi.behavior(userId));
}

export async function sendInvestigationMessage(message) {
  const response = await investigationApi.chat(message);
  return response?.data?.data || response?.data || {};
}

export default api;

