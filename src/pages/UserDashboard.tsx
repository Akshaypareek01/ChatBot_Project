
import React, { useState, useEffect } from 'react';
import { useLocation, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { ChatProvider } from '@/context/ChatContext';
import UserLayout from '@/components/user/UserLayout';
import UserDashboardHome from '@/components/user/UserDashboardHome';
import UserQAManager from '@/components/user/UserQAManager';
import UserProfile from '@/components/user/UserProfile';
import UserPlans from '@/components/user/UserPlans';
import ChatbotWidget from '@/components/chatbot/ChatbotWidget';
import { getUserProfile } from '@/services/api';
import { toast } from 'sonner';

const UserDashboard = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState(null);
  
  useEffect(() => {
    // Check authentication
    const token = localStorage.getItem('token');
    
    if (!token) {
      toast.error('Please log in to access your dashboard');
      navigate('/login');
      return;
    }
    
    const fetchUserProfile = async () => {
      try {
        const userData = await getUserProfile();
        
        if (!userData.isActive) {
          toast.error('Your account is pending approval by the administrator');
          localStorage.removeItem('token');
          navigate('/login');
          return;
        }
        
        setUser(userData);
        setIsAuthenticated(true);
      } catch (error) {
        console.error('Error fetching user profile:', error);
        toast.error('Session expired. Please log in again');
        localStorage.removeItem('token');
        navigate('/login');
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchUserProfile();
  }, [navigate]);
  
  const handleLogout = () => {
    localStorage.removeItem('token');
    navigate('/login');
    toast.success('Logged out successfully');
  };
  
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="loading-spinner"></div>
      </div>
    );
  }
  
  if (!isAuthenticated) {
    return <Navigate to="/login" />;
  }
  
  return (
    <ChatProvider userId={user?._id}>
      <UserLayout user={user} onLogout={handleLogout}>
        <Routes>
          <Route path="/" element={<UserDashboardHome />} />
          <Route path="/qa" element={<UserQAManager />} />
          <Route path="/profile" element={<UserProfile />} />
          <Route path="/plans" element={<UserPlans />} />
          <Route path="*" element={<Navigate to="/user" replace />} />
        </Routes>
      </UserLayout>
      <ChatbotWidget userId={user?._id} />
    </ChatProvider>
  );
};

export default UserDashboard;
