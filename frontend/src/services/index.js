import api from './api';

export const authService = {
  register: (data) => api.post('/auth/register', data),
  login: (data) => api.post('/auth/login', data),
  loginGoogle: (data) => api.post('/auth/google', data),
  getProfile: () => api.get('/auth/profile'),
  updateProfile: (data) => api.put('/auth/profile', data),
};

export const productService = {
  list: (params = {}) => api.get('/products', { params }),
  getById: (id) => api.get(`/products/${id}`),
  getDetail: (id) => api.get(`/products/${id}`),
};

export const categoryService = {
  list: () => api.get('/categories'),
};

export const orderService = {
  create: (data) => api.post('/orders', data),
  myOrders: () => api.get('/orders/my-orders'),
  getDetail: (id) => api.get(`/orders/${id}`),
  getById: (id) => api.get(`/orders/${id}`),
  uploadPaymentProof: (orderId, formData) =>
    api.post(`/orders/${orderId}/payment-proof`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  getQR: (orderId) => api.get(`/orders/${orderId}/qr`),
};

export const reviewService = {
  create: (data) => api.post('/reviews', data),
  getByProduct: (productId) => api.get(`/reviews/product/${productId}`),
};

export const adminService = {
  dashboard: () => api.get('/admin/dashboard'),
  listProducts: () => api.get('/admin/products'),
  createProduct: (data) => api.post('/admin/products', data),
  updateProduct: (id, data) => api.put(`/admin/products/${id}`, data),
  deleteProduct: (id) => api.delete(`/admin/products/${id}`),
  uploadProductImages: (id, formData) =>
    api.post(`/admin/products/${id}/images`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  deleteProductImage: (productId, imageId) =>
    api.delete(`/admin/products/${productId}/images/${imageId}`),
  setPrimaryImage: (productId, imageId) =>
    api.put(`/admin/products/${productId}/images/${imageId}/primary`),
  listCategories: () => api.get('/admin/categories'),
  createCategory: (data) => api.post('/admin/categories', data),
  updateCategory: (id, data) => api.put(`/admin/categories/${id}`, data),
  toggleCategory: (id) => api.put(`/admin/categories/${id}/toggle`),
  deleteCategory: (id) => api.delete(`/admin/categories/${id}`),
  listOrders: (params = {}) => api.get('/admin/orders', { params }),
  updateOrderStatus: (id, data) => api.put(`/admin/orders/${id}/status`, data),
  listCoupons: () => api.get('/admin/coupons'),
  createCoupon: (data) => api.post('/admin/coupons', data),
  updateCoupon: (id, data) => api.put(`/admin/coupons/${id}`, data),
  deleteCoupon: (id) => api.delete(`/admin/coupons/${id}`),
  toggleCoupon: (id, isActive) => api.put(`/admin/coupons/${id}`, { is_active: isActive }),
  downloadReport: (params = {}) => api.get('/admin/reports/excel', {
    params,
    responseType: 'blob',
  }),
  // Users
  listUsers: () => api.get('/admin/users'),
  updateUserRole: (id, role) => api.put(`/admin/users/${id}/role`, { role }),
  toggleUserActive: (id) => api.put(`/admin/users/${id}/toggle-active`),
};

export const culqiService = {
  getConfig: () => api.get('/culqi/config'),
  payWithCard: (data) => api.post('/culqi/pay', data),
  createToken: (data) => api.post('/culqi/token', data),
  createCharge: (data) => api.post('/culqi/charge', data),
};

export const sellerService = {
  dashboard: () => api.get('/seller/dashboard'),
};

export const inventoryService = {
  myStore: () => api.get('/inventory/my-store'),
  getMyInventory: () => api.get('/inventory/my-store'),
  updateStock: (id, data) => api.put(`/inventory/${id}`, data),
  pickupOrders: () => api.get('/inventory/pickup-orders'),
  markDelivered: (orderId) => api.put(`/inventory/pickup/${orderId}`),
};
