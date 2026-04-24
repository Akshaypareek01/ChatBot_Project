
import axios from 'axios';
import { Base_url } from '@/config/Base_url.jsx';

// Determine API URL based on environment or default to localhost
export const API_URL = Base_url;

// Create axios instance
const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
    'X-Requested-With': 'XMLHttpRequest',
  },
});

// Add token to requests
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// On 401, try refresh token and retry once
let refreshing = false;
let failedQueue: Array<{ resolve: (v: any) => void; reject: (e: any) => void }> = [];

const processQueue = (err: any, newToken: string | null = null) => {
  failedQueue.forEach((p) => (newToken ? p.resolve(newToken) : p.reject(err)));
  failedQueue = [];
};

api.interceptors.response.use(
  (res) => res,
  async (err) => {
    const original = err.config;

    // Graceful 429 handling — normalise the error so toast messages render
    // the backend-provided friendly text instead of a generic axios error.
    if (err.response?.status === 429) {
      const retryAfter =
        err.response.data?.retryAfter ||
        parseInt(err.response.headers?.['retry-after'] || '0', 10) ||
        60;
      const message =
        err.response.data?.message ||
        `Too many requests. Please try again in ${Math.ceil(retryAfter / 60)} minute(s).`;
      err.response.data = { ...(err.response.data || {}), message, retryAfter };
      return Promise.reject(err);
    }

    if (err.response?.status !== 401 || original._retry) {
      return Promise.reject(err);
    }
    const refresh = localStorage.getItem('refreshToken');
    if (!refresh) return Promise.reject(err);

    if (refreshing) {
      return new Promise((resolve, reject) => {
        failedQueue.push({ resolve: (t) => { original.headers.Authorization = `Bearer ${t}`; api(original).then(resolve).catch(reject); }, reject });
      });
    }
    original._retry = true;
    refreshing = true;
    try {
      const { data } = await api.post('/users/refresh-token', { refreshToken: refresh });
      const newToken = data.token;
      localStorage.setItem('token', newToken);
      if (data.refreshToken) localStorage.setItem('refreshToken', data.refreshToken);
      processQueue(null, newToken);
      original.headers.Authorization = `Bearer ${newToken}`;
      return api(original);
    } catch (e) {
      processQueue(e, null);
      localStorage.removeItem('token');
      localStorage.removeItem('refreshToken');
      return Promise.reject(e);
    } finally {
      refreshing = false;
    }
  }
);

// --- Error Handler ---
const handleApiError = (error: any, defaultMessage: string) => {
  const status = error.response?.status;
  let message = defaultMessage;
  let data = {};

  if (typeof error.response?.data === 'string') {
    message = error.response.data;
  } else if (error.response?.data?.message) {
    message = error.response.data.message;
    data = error.response.data;
  }

  throw { ...data, message, status };
};

// --- Auth Services ---

export const login = async (email: string, password: string) => {
  try {
    const response = await api.post('/users/login', { email, password });
    return response.data;
  } catch (error: any) {
    return handleApiError(error, 'An error occurred during login');
  }
};

export const adminLogin = async (email: string, password: string) => {
  try {
    const response = await api.post('/admin/login', { email, password });
    return response.data;
  } catch (error: any) {
    return handleApiError(error, 'An error occurred during admin login');
  }
};

export const registerUser = async (userData: { name: string; email: string; password: string; website: string; brandName?: string; acceptTos?: boolean; acceptPrivacy?: boolean; referralCode?: string }) => {
  try {
    const response = await api.post('/users/register', userData);
    return response.data;
  } catch (error: any) {
    return handleApiError(error, 'An error occurred during registration');
  }
};

export const verifyOTP = async (email: string, otp: string) => {
  try {
    const response = await api.post('/users/verify-otp', { email, otp });
    return response.data;
  } catch (error: any) {
    return handleApiError(error, 'Invalid or expired OTP');
  }
};

export const resendVerificationOTP = async (email: string) => {
  try {
    const response = await api.post('/users/resend-otp', { email });
    return response.data;
  } catch (error: any) {
    return handleApiError(error, 'Failed to resend OTP');
  }
};

export const forgotPassword = async (email: string) => {
  try {
    const response = await api.post('/users/forgot-password', { email });
    return response.data;
  } catch (error: any) {
    return handleApiError(error, 'Error sending reset OTP');
  }
};

export const resetPassword = async (resetData: { email: string; otp: string; newPassword: any }) => {
  try {
    const response = await api.post('/users/reset-password', resetData);
    return response.data;
  } catch (error: any) {
    return handleApiError(error, 'Failed to reset password');
  }
};

// --- User Services ---

export const getUserProfile = async () => {
  try {
    const response = await api.get('/users/profile');
    return response.data;
  } catch (error: any) {
    return handleApiError(error, 'An error occurred while fetching user profile');
  }
};

export const updateUserProfile = async (userData: {
  name: string;
  website: string;
  brandName?: string;
  onboardingCompleted?: boolean;
  gstin?: string | null;
  customDashboardDomain?: string | null;
  customEmailFromName?: string | null;
  customEmailReplyTo?: string | null;
}) => {
  try {
    const response = await api.put('/users/profile', userData);
    return response.data;
  } catch (error: any) {
    return handleApiError(error, 'An error occurred while updating profile');
  }
};

export const updateUserPassword = async (passwordData: { currentPassword: string; newPassword: string }) => {
  try {
    const response = await api.put('/users/password', passwordData);
    return response.data;
  } catch (error: any) {
    return handleApiError(error, 'An error occurred while updating password');
  }
};

export const updateAllowedDomains = async (allowedDomains: string[]) => {
  try {
    const response = await api.put('/users/domains', { allowedDomains });
    return response.data;
  } catch (error: any) {
    return handleApiError(error, 'An error occurred while updating domains');
  }
};

export const getUsageHistory = async () => {
  try {
    const response = await api.get('/users/usage');
    return response.data;
  } catch (error: any) {
    return handleApiError(error, 'Error fetching usage history');
  }
};

// --- Admin Services ---

export const getUsers = async (params?: { page?: number; limit?: number; search?: string; isActive?: boolean; isApproved?: boolean; lowTokens?: boolean }) => {
  try {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.search) queryParams.append('search', params.search);
    if (params?.isActive !== undefined) queryParams.append('isActive', params.isActive.toString());
    if (params?.isApproved !== undefined) queryParams.append('isApproved', params.isApproved.toString());
    if (params?.lowTokens) queryParams.append('lowTokens', 'true');

    const response = await api.get(`/admin/users?${queryParams.toString()}`);
    return response.data;
  } catch (error: any) {
    return handleApiError(error, 'An error occurred while fetching users');
  }
};

export const createUser = async (userData: { name: string; email: string; password: string; website: string; tokenBalance?: number }) => {
  try {
    const response = await api.post('/admin/users', userData);
    return response.data;
  } catch (error: any) {
    return handleApiError(error, 'An error occurred while creating user');
  }
};

export const updateUser = async (
  id: string,
  userData: {
    name: string;
    email: string;
    website: string;
    isActive: boolean;
    isApproved: boolean;
    tokenBalance?: number;
    role?: 'user' | 'admin' | 'reseller';
    resellerId?: string | null;
  }
) => {
  try {
    const response = await api.put(`/admin/users/${id}`, userData);
    return response.data;
  } catch (error: any) {
    return handleApiError(error, 'An error occurred while updating user');
  }
};

export const getResellers = async () => {
  const response = await api.get('/admin/resellers');
  return response.data;
};

export const deleteUser = async (id: string) => {
  try {
    const response = await api.delete(`/admin/users/${id}`);
    return response.data;
  } catch (error: any) {
    return handleApiError(error, 'An error occurred while deleting user');
  }
};

export const getAnalytics = async () => {
  try {
    const response = await api.get('/admin/analytics');
    return response.data;
  } catch (error: any) {
    return handleApiError(error, 'An error occurred while fetching analytics');
  }
};

// --- QA Services ---

export const getUserQAs = async (userId: string) => {
  try {
    const response = await api.get(`/qa/${userId}`);
    return response.data;
  } catch (error: any) {
    return handleApiError(error, 'An error occurred while fetching QAs');
  }
};

export const getCurrentUserQAs = async () => {
  try {
    const response = await api.get('/users/qa');
    return response.data;
  } catch (error: any) {
    return handleApiError(error, 'Error fetching your QAs');
  }
};

export const createQA = async (qaData: { userId: string; question: string; answer: string; category: string }) => {
  try {
    const response = await api.post('/admin/qa', qaData);
    return response.data;
  } catch (error: any) {
    return handleApiError(error, 'Error creating QA');
  }
};

export const createUserQA = async (qaData: { question: string; answer: string; category: string }) => {
  try {
    const response = await api.post('/users/qa', qaData);
    return response.data;
  } catch (error: any) {
    return handleApiError(error, 'Error creating QA');
  }
};

export const updateQA = async (id: string, qaData: { question: string; answer: string; category: string }) => {
  try {
    const response = await api.put(`/admin/qa/${id}`, qaData);
    return response.data;
  } catch (error: any) {
    return handleApiError(error, 'Error updating QA');
  }
};

export const updateUserQA = async (id: string, qaData: { question: string; answer: string; category: string }) => {
  try {
    const response = await api.put(`/users/qa/${id}`, qaData);
    return response.data;
  } catch (error: any) {
    return handleApiError(error, 'Error updating QA');
  }
};

export const deleteQA = async (id: string) => {
  try {
    const response = await api.delete(`/admin/qa/${id}`);
    return response.data;
  } catch (error: any) {
    return handleApiError(error, 'Error deleting QA');
  }
};

export const deleteUserQA = async (id: string) => {
  try {
    const response = await api.delete(`/users/qa/${id}`);
    return response.data;
  } catch (error: any) {
    return handleApiError(error, 'Error deleting QA');
  }
};

// --- Suggested Q&A (Phase 5.4 auto-learning) ---
export const getSuggestedQAs = async () => {
  try {
    const response = await api.get('/users/suggested-qa');
    return response.data;
  } catch (error: any) {
    return handleApiError(error, 'Error fetching suggested Q&As');
  }
};

export const addSuggestedQAToQA = async (id: string, answer: string) => {
  try {
    const response = await api.post(`/users/suggested-qa/${id}/add-to-qa`, { answer: answer || 'No answer provided yet.' });
    return response.data;
  } catch (error: any) {
    return handleApiError(error, 'Error adding to Q&A');
  }
};

export const dismissSuggestedQA = async (id: string) => {
  try {
    const response = await api.delete(`/users/suggested-qa/${id}`);
    return response.data;
  } catch (error: any) {
    return handleApiError(error, 'Error dismissing suggestion');
  }
};

// --- Chat flows (Phase 5.6) ---
export const getFlowTemplates = async () => {
  const response = await api.get('/users/flows/templates');
  return response.data;
};

export const listFlows = async (botId?: string | null) => {
  const response = await api.get('/users/flows', { params: botId ? { botId } : undefined });
  return response.data;
};

export const getFlow = async (id: string) => {
  const response = await api.get(`/users/flows/${id}`);
  return response.data;
};

export const createFlow = async (payload: any) => {
  const response = await api.post('/users/flows', payload);
  return response.data;
};

export const updateFlow = async (id: string, payload: any) => {
  const response = await api.put(`/users/flows/${id}`, payload);
  return response.data;
};

export const deleteFlow = async (id: string) => {
  const response = await api.delete(`/users/flows/${id}`);
  return response.data;
};

// --- Wallet & Payment Services ---

export const validateCoupon = async (code: string, amount: number) => {
  const response = await api.post('/payments/validate-coupon', { code, amount });
  return response.data;
};

export const createPaymentOrder = async (amount: number, couponCode?: string) => {
  try {
    const response = await api.post('/payments/create-order', { amount, couponCode: couponCode || undefined });
    return response.data;
  } catch (error: any) {
    return handleApiError(error, 'Error creating payment order');
  }
};

export const getUserTransactions = async () => {
  try {
    const response = await api.get('/payments/transactions');
    return response.data;
  } catch (error: any) {
    return handleApiError(error, 'Error fetching transactions');
  }
};

/** Phase 4.2: Download invoice PDF for a successful transaction. */
export const downloadInvoice = async (orderId: string) => {
  const token = localStorage.getItem('token');
  const response = await fetch(`${API_URL}/payments/invoice/${orderId}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!response.ok) throw new Error(response.status === 404 ? 'Invoice not found' : 'Failed to download invoice');
  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `invoice-${orderId}.pdf`;
  a.click();
  URL.revokeObjectURL(url);
};

/** Phase 5.2: Webhooks */
export const getWebhookEvents = async () => {
  const response = await api.get('/webhooks/events');
  return response.data;
};
export const getWebhooks = async () => {
  const response = await api.get('/webhooks');
  return response.data;
};
export const createWebhook = async (data: { url: string; events: string[]; secret?: string }) => {
  const response = await api.post('/webhooks', data);
  return response.data;
};
export const updateWebhook = async (id: string, data: { url?: string; events?: string[]; secret?: string; isActive?: boolean }) => {
  const response = await api.patch(`/webhooks/${id}`, data);
  return response.data;
};
export const deleteWebhook = async (id: string) => {
  const response = await api.delete(`/webhooks/${id}`);
  return response.data;
};
export const getWebhookLogs = async (id: string, limit?: number) => {
  const response = await api.get(`/webhooks/${id}/logs`, { params: { limit } });
  return response.data;
};

export const getAdminTransactions = async (params?: { page?: number; limit?: number; status?: string; search?: string }) => {
  try {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.status) queryParams.append('status', params.status);
    if (params?.search) queryParams.append('search', params.search);

    const response = await api.get(`/admin/transactions?${queryParams.toString()}`);
    return response.data;
  } catch (error: any) {
    return handleApiError(error, 'Error fetching transactions');
  }
};

export const getTransactionDetails = async (orderId: string) => {
  try {
    const response = await api.get(`/transactions/${orderId}`);
    return response.data;
  } catch (error: any) {
    return handleApiError(error, "Failed to fetch transaction details");
  }
};

// --- Chatbot Data Services ---

export const getChatbotData = async (userId: string) => {
  try {
    const response = await api.get(`/chatbot/${userId}`);
    return response.data;
  } catch (error: any) {
    return handleApiError(error, 'Error fetching chatbot data');
  }
};

export const getUserChatbotData = async () => {
  try {
    const response = await api.get('/users/chatbot');
    return response.data;
  } catch (error: any) {
    return handleApiError(error, 'Error fetching chatbot data');
  }
};

export const getWidgetConfig = async (botId?: string | null) => {
  const response = await api.get('/users/chatbot/config', botId ? { params: { botId } } : undefined);
  return response.data;
};

export const updateWidgetConfig = async (config: Record<string, unknown>, botId?: string | null) => {
  const response = await api.put('/users/chatbot/config', { ...config, ...(botId ? { botId } : {}) });
  return response.data;
};

export const uploadWidgetAvatar = async (file: File) => {
  const formData = new FormData();
  formData.append('avatar', file);
  const response = await api.post('/users/chatbot/avatar', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return response.data;
};

export const generateSuggestedQuestions = async () => {
  const response = await api.get('/users/chatbot/suggested-questions/generate');
  return response.data;
};

export const getConversations = async (params?: {
  page?: number;
  limit?: number;
  status?: string;
  keyword?: string;
  dateFrom?: string;
  dateTo?: string;
  feedback?: string;
  botId?: string | null;
}) => {
  const response = await api.get('/users/conversations', { params });
  return response.data;
};

export const updateConversation = async (id: string, data: { status?: string; rating?: number }) => {
  const response = await api.patch(`/users/conversations/${id}`, data);
  return response.data;
};

export const getConversationById = async (id: string) => {
  const response = await api.get(`/users/conversations/${id}`);
  return response.data;
};

export const exportConversationsCsv = async () => {
  const response = await api.get('/users/conversations/export', { responseType: 'blob' });
  return response.data;
};

export const exportLeadsCsv = async () => {
  const response = await api.get('/users/conversations/leads/export', { responseType: 'blob' });
  return response.data;
};

export const getResellerClients = async () => {
  const response = await api.get('/users/clients');
  return response.data;
};

export const getFeedbackStats = async () => {
  const response = await api.get('/users/feedback-stats');
  return response.data;
};

/** User analytics dashboard (Phase 3.1): volume, totals, token breakdown, peak hours, satisfaction */
export const getUserAnalytics = async (period: '7d' | '30d' | '90d' = '30d', botId?: string | null) => {
  const response = await api.get('/users/analytics', { params: { period, ...(botId ? { botId } : {}) } });
  return response.data;
};

/** Phase 3.4: In-app notifications */
export const getNotifications = async (params?: { limit?: number; before?: string }) => {
  const response = await api.get('/users/notifications', { params });
  return response.data;
};

export const markNotificationRead = async (id: string) => {
  const response = await api.patch(`/users/notifications/${id}/read`);
  return response.data;
};

export const getNotificationPrefs = async () => {
  const response = await api.get('/users/notification-prefs');
  return response.data;
};

export const updateNotificationPrefs = async (prefs: { emailOnNewLead?: boolean; emailOnLowBalance?: boolean; emailSummary?: 'none' | 'daily' | 'weekly' }) => {
  const response = await api.put('/users/notification-prefs', prefs);
  return response.data;
};

/** Phase 3.5: Multi-bot */
export const getBots = async () => {
  const response = await api.get('/users/bots');
  return response.data;
};

export const createBot = async (data: { name: string; slug?: string }) => {
  const response = await api.post('/users/bots', data);
  return response.data;
};

export const updateBot = async (id: string, data: { name?: string; slug?: string }) => {
  const response = await api.patch(`/users/bots/${id}`, data);
  return response.data;
};

/** Phase 4: Plans & usage */
export const getPlans = async () => {
  const response = await api.get('/plans');
  return response.data;
};

export const getMyPlanUsage = async () => {
  const response = await api.get('/users/plan/usage');
  return response.data;
};

export const changePlan = async (planId: string) => {
  const response = await api.patch('/users/plan', { planId });
  return response.data;
};

export const logUnansweredQuestion = async (userId: string, question: string) => {
  try {
    const response = await api.post('/chatbot/log', { userId, question });
    return response.data;
  } catch (error: any) {
    return handleApiError(error, 'Error logging question');
  }
};

export const uploadFile = async (file: File, userId?: string) => {
  try {
    const formData = new FormData();
    formData.append('file', file);
    if (userId) {
      formData.append('userId', userId);
    }
    const response = await api.post('/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  } catch (error: any) {
    return handleApiError(error, 'Error uploading file');
  }
};

export const scrapeWebsite = async (url: string, options?: { userId?: string; maxDepth?: number }) => {
  try {
    const payload: { url: string; userId?: string; maxDepth?: number } = { url };
    if (options?.userId) payload.userId = options.userId;
    if (options?.maxDepth) payload.maxDepth = options.maxDepth;
    const response = await api.post('/scrape', payload);
    return response.data;
  } catch (error: any) {
    return handleApiError(error, 'Error scraping website');
  }
};

export const getScrapeStatus = async (jobId: string) => {
  const response = await api.get(`/scrape/status/${jobId}`);
  return response.data;
};

export const addPasteSource = async (title: string, content: string) => {
  const response = await api.post('/sources/paste', { title, content });
  return response.data;
};

export const updateSource = async (id: string, data: { scrapeSchedule?: string }) => {
  const response = await api.patch(`/sources/${id}`, data);
  return response.data;
};

export const getSourcesHealth = async () => {
  const response = await api.get('/users/sources/health');
  return response.data;
};

export const getUserSources = async () => {
  try {
    const response = await api.get('/sources');
    return response.data;
  } catch (error: any) {
    return handleApiError(error, 'Error fetching sources');
  }
};

// --- Support Ticket Services ---

export const createTicket = async (ticketData: { title: string; description: string }) => {
  try {
    const response = await api.post('/ticket', ticketData);
    return response.data;
  } catch (error: any) {
    return handleApiError(error, 'Error creating ticket');
  }
};

export const getUserTickets = async () => {
  try {
    const response = await api.get('/my-tickets');
    return response.data;
  } catch (error: any) {
    return handleApiError(error, 'Error fetching tickets');
  }
};

export const getTicketDetails = async (ticketId: string) => {
  try {
    const response = await api.get(`/ticket/${ticketId}`);
    return response.data;
  } catch (error: any) {
    return handleApiError(error, 'Error fetching ticket details');
  }
};

export const getAdminTickets = async () => {
  try {
    const response = await api.get('/all-tickets');
    return response.data;
  } catch (error: any) {
    return handleApiError(error, 'Error fetching admin tickets');
  }
};

export const addTicketMessage = async (ticketId: string, message: string) => {
  try {
    const response = await api.post(`/ticket/${ticketId}/message`, { message });
    return response.data;
  } catch (error: any) {
    return handleApiError(error, 'Error sending message');
  }
};

export const updateTicketStatus = async (ticketId: string, status: string) => {
  try {
    const response = await api.patch(`/ticket/${ticketId}/status`, { status });
    return response.data;
  } catch (error: any) {
    return handleApiError(error, 'Error updating ticket status');
  }
};

export default api;
