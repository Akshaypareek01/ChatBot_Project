import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { MessageSquare, Users, BarChart2, AlertTriangle, Wallet, Code, Globe, Zap } from 'lucide-react';
import { getUserProfile, getUserChatbotData } from '@/services/api';
import ScriptGenerator from '../chatbot/ScriptGenerator';
import { useNavigate } from 'react-router-dom';
import { Button } from '../ui/button';
import IntegrationGuide from './IntegrationGuide';

const UserDashboardHome = () => {
  const [userData, setUserData] = useState<any>(null);
  const [chatbotData, setChatbotData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [userProfileData, chatbotDataResponse] = await Promise.all([
          getUserProfile(),
          getUserChatbotData()
        ]);

        setUserData(userProfileData);
        setChatbotData(chatbotDataResponse);
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[400px]">
        <div className="loading-spinner"></div>
      </div>
    );
  }

  return (
    <div className="space-y-10 pb-10">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight mb-1">Dashboard</h1>
          <p className="text-muted-foreground">Welcome back, <span className="text-foreground font-semibold">{userData?.name}</span>. Here's your chatbot's performance.</p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" onClick={() => navigate('/user/profile')}>
            Profile Settings
          </Button>
          <Button onClick={() => navigate('/user/transactions')} className="bg-primary hover:bg-primary/90 shadow-premium group">
            <Wallet className="mr-2 h-4 w-4 transition-transform group-hover:scale-110" /> Add Tokens
          </Button>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card className="border-none bg-gradient-to-br from-primary/10 to-primary/5 shadow-soft border-l-4 border-l-primary">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-bold uppercase tracking-wider text-primary">Tokens Left</CardTitle>
            <Zap className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className={`text-3xl font-black ${userData?.tokenBalance < 20000 ? 'text-destructive animate-pulse' : 'text-foreground'}`}>
              {userData?.tokenBalance?.toLocaleString() || 0}
            </div>
            <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
              {userData?.tokenBalance < 20000 && <AlertTriangle className="h-3 w-3" />}
              Ready for ~{Math.floor((userData?.tokenBalance || 0) / 1000)} messages
            </p>
          </CardContent>
        </Card>

        <Card className="border-none bg-background/50 backdrop-blur-sm shadow-soft">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-bold uppercase tracking-wider text-muted-foreground">QA Base</CardTitle>
            <BarChart2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black">{chatbotData?.qas?.length || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">Knowledge base entries</p>
          </CardContent>
        </Card>

        <Card className="border-none bg-background/50 backdrop-blur-sm shadow-soft">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Conversations</CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black">{userData?.totalChats || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">Total chat sessions</p>
          </CardContent>
        </Card>

        <Card className="border-none bg-background/50 backdrop-blur-sm shadow-soft">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Bot Status</CardTitle>
            <Globe className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black text-green-500">Live</div>
            <p className="text-xs text-muted-foreground mt-1">Connected to {userData?.website || 'your site'}</p>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-12">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-xl text-primary">
            <Code className="h-6 w-6" />
          </div>
          <h2 className="text-2xl font-black tracking-tight">Embed Your Chatbot</h2>
        </div>

        <div className="grid gap-10 grid-cols-1">
          {/* Section 1: Direct Script */}
          <div className="w-full max-w-2xl">
            <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
              <span className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm">1</span>
              Quick Copy Script
            </h3>
            <ScriptGenerator userId={userData?._id} websiteDomain={userData?.website} />
          </div>

          {/* Section 2: Platform Integration */}
          <div className="space-y-6">
            <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
              <span className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm">2</span>
              Platform Specific Installation
            </h3>
            <div className="bg-muted/20 border border-muted-foreground/10 rounded-[2.5rem] p-8 backdrop-blur-sm">
              <p className="text-sm text-muted-foreground mb-8 max-w-xl">
                Select your website platform to see specific integration instructions and optimized code snippets for your tech stack.
              </p>

              <IntegrationGuide userId={userData?._id} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserDashboardHome;


