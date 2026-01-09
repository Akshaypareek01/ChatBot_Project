import React, { useState, useEffect } from 'react';
import { useLocation, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { ChatProvider } from '@/context/ChatContext';
import AdminLayout from '@/components/admin/AdminLayout';
import Dashboard from '@/components/admin/Dashboard';
import AdminKnowledgeBase from '@/components/admin/AdminKnowledgeBase';
import UserManager from '@/components/admin/UserManager';
// import PlanManager from '@/components/admin/PlanManager'; // Removed
import { toast } from 'sonner';
import TransactionManager from '@/components/admin/TransactionManager';

const Settings = () => (
  <div className="space-y-8">
    <div>
      <h1 className="text-2xl font-semibold mb-2">Settings</h1>
      <p className="text-muted-foreground">Manage your chatbot preferences and account settings</p>
    </div>
    <div className="glass-panel p-8">
      <p className="text-muted-foreground">Settings content will go here.</p>
    </div>
  </div>
);

const Admin = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Demo admin user ID for testing the chatbot as an admin
  const adminUserId = "admin_user";

  useEffect(() => {
    // Check authentication
    const token = localStorage.getItem('token');
    const isAdmin = localStorage.getItem('isAdmin') === 'true';

    if (!token || !isAdmin) {
      toast.error('Please log in to access the admin panel');
      navigate('/admin/login');
    } else {
      setIsAuthenticated(true);
    }

    setIsLoading(false);
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('isAdmin');
    navigate('/admin/login');
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
    <ChatProvider userId={adminUserId}>
      <AdminLayout onLogout={handleLogout}>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/qa" element={<AdminKnowledgeBase />} />
          <Route path="/users" element={<UserManager />} />
          <Route path="/transactions" element={<TransactionManager />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AdminLayout>
    </ChatProvider>
  );
};

export default Admin;