import React, { useState, useEffect } from 'react';
import { useLocation, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { ChatProvider } from '@/context/ChatContext';
import UserLayout from '@/components/user/UserLayout';
import UserDashboardHome from '@/components/user/UserDashboardHome';
import UserQAManager from '@/components/user/UserQAManager';
import UserProfile from '@/components/user/UserProfile';
import UserPlans from '@/components/user/UserPlans';
import ChatbotWidget from '@/components/chatbot/ChatbotWidget';
import { getUserProfile, getUserSubscription } from '@/services/api';
import { toast } from 'sonner';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';

const UserDashboard = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [subscription, setSubscription] = useState(null);
  const [isSubscriptionExpired, setIsSubscriptionExpired] = useState(false);
  
  useEffect(() => {
    // Check authentication
    const token = localStorage.getItem('token');
    
    if (!token) {
      toast.error('Please log in to access your dashboard');
      navigate('/login');
      return;
    }
    
    const fetchUserData = async () => {
      try {
        const [userData, subscriptionData] = await Promise.all([
          getUserProfile(),
          getUserSubscription()
        ]);
        
        if (!userData.isActive) {
          toast.error('Your account is pending approval by the administrator');
          localStorage.removeItem('token');
          navigate('/login');
          return;
        }
        
        setUser(userData);
        setSubscription(subscriptionData);
        
        // Check if subscription has expired
        if (subscriptionData && (subscriptionData.isExpired || 
          (new Date() > new Date(subscriptionData.endDate) && subscriptionData.plan.name !== 'Free'))) {
        setIsSubscriptionExpired(true);
      }
      
      setIsAuthenticated(true);
      } catch (error) {
        console.error('Error fetching user data:', error);
        toast.error('Session expired. Please log in again');
        localStorage.removeItem('token');
        navigate('/login');
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchUserData();
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
        {isSubscriptionExpired && (
          <Alert variant="destructive" className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Subscription Expired</AlertTitle>
            <AlertDescription>
              Your subscription has expired. Please upgrade your plan to continue using all features.
              <div className="mt-2">
                <button 
                  onClick={() => navigate('/user/plans')} 
                  className="text-primary underline font-medium"
                >
                  Upgrade Now
                </button>
              </div>
            </AlertDescription>
          </Alert>
        )}
        
        <Routes>
          <Route path="/" element={<UserDashboardHome subscription={subscription} />} />
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