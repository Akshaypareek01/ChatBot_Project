
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

// User services
export const getUsers = async () => {
  try {
    const response = await api.get('/admin/users');
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: 'An error occurred while fetching users' };
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

// QA services
export const getUserQAs = async (userId: string) => {
  try {
    const response = await api.get(`/qa/${userId}`);
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: 'An error occurred while fetching QAs' };
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

export const updateQA = async (id: string, qaData: { question: string; answer: string; category: string }) => {
  try {
    const response = await api.put(`/admin/qa/${id}`, qaData);
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

// Chatbot services
export const getChatbotData = async (userId: string) => {
  try {
    const response = await api.get(`/chatbot/${userId}`);
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

export default api;
