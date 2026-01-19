
import axios from 'axios';
import { Base_url } from '@/config/Base_url.jsx';

// Determine API URL based on environment or default to localhost
export const API_URL = Base_url;

// Create axios instance
const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
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

export const registerUser = async (userData: { name: string; email: string; password: string; website: string; brandName?: string }) => {
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

export const updateUserProfile = async (userData: { name: string; website: string; brandName?: string }) => {
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

export const updateUser = async (id: string, userData: { name: string; email: string; website: string; isActive: boolean; isApproved: boolean; tokenBalance?: number }) => {
  try {
    const response = await api.put(`/admin/users/${id}`, userData);
    return response.data;
  } catch (error: any) {
    return handleApiError(error, 'An error occurred while updating user');
  }
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

// --- Wallet & Payment Services ---

export const createPaymentOrder = async (amount: number) => {
  try {
    // Minimum recharge amount logic should be handled by backend, but frontend can also validate
    const response = await api.post('/payments/create-order', { amount });
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

export const scrapeWebsite = async (url: string, userId?: string) => {
  try {
    const payload: any = { url };
    if (userId) {
      payload.userId = userId;
    }
    const response = await api.post('/scrape', payload);
    return response.data;
  } catch (error: any) {
    return handleApiError(error, 'Error scraping website');
  }
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
