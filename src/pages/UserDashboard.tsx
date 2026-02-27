import React, { useState, useEffect } from 'react';
import { useLocation, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { ChatProvider } from '@/context/ChatContext';
import { BotProvider } from '@/context/BotContext';
import UserLayout from '@/components/user/UserLayout';
import UserDashboardHome from '@/components/user/UserDashboardHome';
import UserKnowledgeBase from '@/components/user/UserKnowledgeBase';
import UserProfile from '@/components/user/UserProfile';
import { getUserProfile } from '@/services/api';
import { toast } from 'sonner';
import UserTransactions from '@/components/user/UserTransactions';
import SupportSystem from '@/components/user/SupportSystem';
import DomainSecurityPage from '@/components/user/DomainSecurityPage';
import WidgetCustomization from '@/components/user/WidgetCustomization';
import ConversationsList from '@/components/user/ConversationsList';
import ConversationDetail from '@/components/user/ConversationDetail';
import UserAnalytics from '@/components/user/UserAnalytics';
import OnboardingWizard from '@/components/user/OnboardingWizard';

const UserDashboard = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [onboardingDismissed, setOnboardingDismissed] = useState(false);

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

  const showOnboarding = user && !user.onboardingCompletedAt && !onboardingDismissed;

  return (
    <BotProvider>
    <ChatProvider userId={user?._id}>
      {showOnboarding && (
        <OnboardingWizard
          open={true}
          onComplete={() => {
            setOnboardingDismissed(true);
            getUserProfile().then(setUser).catch(() => {});
          }}
          user={user}
        />
      )}
      <UserLayout user={user} onLogout={handleLogout}>
        <Routes>
          <Route path="/" element={<UserDashboardHome />} />
          <Route path="/qa" element={<UserKnowledgeBase />} />
          <Route path="/profile" element={<UserProfile />} />
          <Route path="/transactions" element={<UserTransactions />} />
          <Route path="/security" element={<DomainSecurityPage />} />
          <Route path="/widget" element={<WidgetCustomization />} />
          <Route path="/analytics" element={<UserAnalytics />} />
          <Route path="/conversations" element={<ConversationsList />} />
          <Route path="/conversations/:id" element={<ConversationDetail />} />
          <Route path="/support" element={<SupportSystem />} />
          <Route path="*" element={<Navigate to="/user" replace />} />
        </Routes>
</UserLayout>
      </ChatProvider>
    </BotProvider>
    );
  };

export default UserDashboard;