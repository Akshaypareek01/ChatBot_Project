
import axios from 'axios';

const API_URL = 'http://localhost:5000/api';

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

// Auth services
export const login = async (email: string, password: string) => {
  try {
    const response = await api.post('/users/login', { email, password });
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: 'An error occurred during login' };
  }
};

export const adminLogin = async (email: string, password: string) => {
  try {
    const response = await api.post('/admin/login', { email, password });
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: 'An error occurred during admin login' };
  }
};

export const registerUser = async (userData: { name: string; email: string; password: string; website: string }) => {
  try {
    const response = await api.post('/users/register', userData);
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: 'An error occurred during registration' };
  }
};

// User services
export const getUsers = async () => {
  try {
    const response = await api.get('/admin/users');
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: 'An error occurred while fetching users' };
  }
};

export const getUserProfile = async () => {
  try {
    const response = await api.get('/users/profile');
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: 'An error occurred while fetching user profile' };
  }
};

export const createUser = async (userData: { name: string; email: string; password: string; website: string }) => {
  try {
    const response = await api.post('/admin/users', userData);
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: 'An error occurred while creating user' };
  }
};

export const updateUser = async (id: string, userData: { name: string; email: string; website: string; isActive: boolean }) => {
  try {
    const response = await api.put(`/admin/users/${id}`, userData);
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: 'An error occurred while updating user' };
  }
};

export const deleteUser = async (id: string) => {
  try {
    const response = await api.delete(`/admin/users/${id}`);
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: 'An error occurred while deleting user' };
  }
};

export const updateUserProfile = async (userData: { name: string; website: string }) => {
  try {
    const response = await api.put('/users/profile', userData);
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: 'An error occurred while updating profile' };
  }
};

export const updateUserPassword = async (passwordData: { currentPassword: string; newPassword: string }) => {
  try {
    const response = await api.put('/users/password', passwordData);
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: 'An error occurred while updating password' };
  }
};

// QA services
export const getUserQAs = async (userId: string) => {
  try {
    const response = await api.get(`/qa/${userId}`);
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: 'An error occurred while fetching QAs' };
  }
};

export const getCurrentUserQAs = async () => {
  try {
    const response = await api.get('/users/qa');
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: 'An error occurred while fetching your QAs' };
  }
};

export const createQA = async (qaData: { userId: string; question: string; answer: string; category: string }) => {
  try {
    const response = await api.post('/admin/qa', qaData);
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: 'An error occurred while creating QA' };
  }
};

export const createUserQA = async (qaData: { question: string; answer: string; category: string }) => {
  try {
    const response = await api.post('/users/qa', qaData);
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: 'An error occurred while creating QA' };
  }
};

export const updateQA = async (id: string, qaData: { question: string; answer: string; category: string }) => {
  try {
    const response = await api.put(`/admin/qa/${id}`, qaData);
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: 'An error occurred while updating QA' };
  }
};

export const updateUserQA = async (id: string, qaData: { question: string; answer: string; category: string }) => {
  try {
    const response = await api.put(`/users/qa/${id}`, qaData);
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: 'An error occurred while updating QA' };
  }
};

export const deleteQA = async (id: string) => {
  try {
    const response = await api.delete(`/admin/qa/${id}`);
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: 'An error occurred while deleting QA' };
  }
};

export const deleteUserQA = async (id: string) => {
  try {
    const response = await api.delete(`/users/qa/${id}`);
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: 'An error occurred while deleting QA' };
  }
};


// Plans services
export const getPlans = async () => {
  try {
    const response = await api.get('/plans');
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: 'An error occurred while fetching plans' };
  }
};

// export const getUserSubscription = async () => {
//   try {
//     const response = await api.get('/users/subscription');
//     return response.data;
//   } catch (error) {
//     throw error.response?.data || { message: 'An error occurred while fetching subscription' };
//   }
// };

export const subscribeToPlan = async (planId: string) => {
  try {
    const response = await api.post('/users/subscribe', { planId });
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: 'An error occurred while subscribing to plan' };
  }
};

export const createPlan = async (planData: { 
  name: string; 
  description: string; 
  price: number; 
  discountPrice?: number; 
  tokens: number; 
  features: string[]; 
  isPopular: boolean 
}) => {
  try {
    const response = await api.post('/admin/plans', planData);
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: 'An error occurred while creating plan' };
  }
};

export const updatePlan = async (id: string, planData: { 
  name: string; 
  description: string; 
  price: number; 
  discountPrice?: number; 
  tokens: number; 
  features: string[]; 
  isPopular: boolean 
}) => {
  try {
    const response = await api.put(`/admin/plans/${id}`, planData);
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: 'An error occurred while updating plan' };
  }
};

export const deletePlan = async (id: string) => {
  try {
    const response = await api.delete(`/admin/plans/${id}`);
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: 'An error occurred while deleting plan' };
  }
};

export const updateUserSubscription = async (userId: string, subscriptionData: { 
  endDate?: string; 
  isActive?: boolean;
  isExpired?: boolean;
}) => {
  try {
    const response = await api.put(`/admin/users/${userId}/subscription`, subscriptionData);
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: 'An error occurred while updating user subscription' };
  }
};

// ... keep existing code (profile update, QA services, plans services)

// Updated getUserSubscription to handle isExpired field
export const getUserSubscription = async () => {
  try {
    const response = await api.get('/users/subscription');
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: 'An error occurred while fetching subscription' };
  }
};


// Chatbot services

// Chatbot services
export const getChatbotData = async (userId: string) => {
  try {
    const response = await api.get(`/chatbot/${userId}`);
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: 'An error occurred while fetching chatbot data' };
  }
};

export const getUserChatbotData = async () => {
  try {
    const response = await api.get('/users/chatbot');
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: 'An error occurred while fetching chatbot data' };
  }
};

export const logUnansweredQuestion = async (userId: string, question: string) => {
  try {
    const response = await api.post('/chatbot/log', { userId, question });
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: 'An error occurred while logging question' };
  }
};

export const createPaymentOrder = async (planId: string) => {
  try {
    const response = await api.post('/payments/create-order', { planId });
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: 'An error occurred while creating payment order' };
  }
};

export const simulatePayment = async (orderId: string, status: 'success' | 'failed' = 'success') => {
  try {
    const response = await api.get(`/payments/simulate/${orderId}?status=${status}`);
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: 'An error occurred while simulating payment' };
  }
};

export const getUserTransactions = async () => {
  try {
    const response = await api.get('/users/transactions');
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: 'An error occurred while fetching transactions' };
  }
};

export const getAdminTransactions = async () => {
  try {
    const response = await api.get('/admin/transactions');
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: 'An error occurred while fetching transactions' };
  }
};

export const generateInvoice = async (transactionId: string) => {
  try {
    const response = await api.post(`/admin/transactions/${transactionId}/generate-invoice`);
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: 'An error occurred while generating invoice' };
  }
};

export const getInvoice = async (transactionId: string) => {
  try {
    const response = await api.get(`/admin/transactions/${transactionId}/invoice`);
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: 'An error occurred while fetching invoice' };
  }
};

export const getTransactionDetails = async (orderId: string) => {
  try {
    const response = await api.get(`/transactions/${orderId}`);
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: "Failed to fetch transaction details" };
  }
};

export default api;
