import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';

const api = axios.create({
  baseURL: `${API_BASE_URL}/api`,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle errors
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  login: (credentials) => api.post('users/login', credentials),
  register: (userData) => api.post('users/register', userData),
  getProfile: () => api.get('users/profile'),
  updateProfile: (userData) => api.put('users/profile', userData),
  changePassword: (passwordData) => api.put('users/password', passwordData),
};

// Products API
export const productsAPI = {
  getAll: (filters = {}) => api.get('products', { params: filters }),
  getById: (id) => api.get(`products/${id}`),
  getDemandMetrics: (id) => api.get(`products/${id}/demand`),
  getPricingHistory: (id, limit = 10) => api.get(`products/${id}/pricing-history`, { params: { limit } }),
  create: (productData) => api.post('products', productData),
  update: (id, productData) => api.put(`products/${id}`, productData),
};

// Orders API
export const ordersAPI = {
  create: (orderData) => api.post('orders', orderData),
  getById: (id) => api.get(`orders/${id}`),
  getByUserId: (userId, filters = {}) => api.get(`orders/user/${userId}`, { params: filters }),
  updateStatus: (id, status) => api.patch(`orders/${id}/status`, { status }),
  getAnalytics: (timeframe = '7d') => api.get('analytics/orders', { params: { timeframe } }),
};

// Analytics API
export const analyticsAPI = {
  getPricing: (timeframe = '7d') => api.get('analytics/pricing', { params: { timeframe } }),
  getDemand: (productId) => api.get(`analytics/demand/${productId}`),
  getCompetitorPrices: () => api.get('analytics/competitor-prices'),
  getDashboard: (userId) => api.get('analytics/dashboard', { params: userId ? { userId } : {} }),
  getOrders: (timeframe = '7d', userId) =>
    api.get('analytics/orders', { params: userId ? { timeframe, userId } : { timeframe } }),
};

export default api;
