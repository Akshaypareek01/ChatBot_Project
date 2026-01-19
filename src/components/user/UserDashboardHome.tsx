import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { MessageSquare, Users, BarChart2, AlertTriangle, Wallet, Code, Globe, Zap, History, ArrowRight, Shield } from 'lucide-react';
import { getUserProfile, getUserChatbotData, getUsageHistory } from '@/services/api';
import ScriptGenerator from '../chatbot/ScriptGenerator';
import { useNavigate } from 'react-router-dom';
import { Button } from '../ui/button';
import IntegrationGuide from './IntegrationGuide';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

interface UsageRecord {
  _id: string;
  type: 'chat' | 'upload' | 'scrape';
  description: string;
  tokensUsed: number;
  createdAt: string;
}

const UserDashboardHome = () => {
  const [userData, setUserData] = useState<any>(null);
  const [chatbotData, setChatbotData] = useState<any>(null);
  const [usageHistory, setUsageHistory] = useState<UsageRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [userProfileData, chatbotDataResponse, usageData] = await Promise.all([
          getUserProfile(),
          getUserChatbotData(),
          getUsageHistory()
        ]);

        setUserData(userProfileData);
        setChatbotData(chatbotDataResponse);
        setUsageHistory(usageData.slice(0, 5)); // Only show last 5
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  const getUsageTypeColor = (type: string) => {
    switch (type) {
      case 'chat': return 'bg-blue-100 text-blue-700';
      case 'upload': return 'bg-purple-100 text-purple-700';
      case 'scrape': return 'bg-orange-100 text-orange-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[400px]">
        <div className="loading-spinner"></div>
      </div>
    );
  }

  return (
    <div className="space-y-10 pb-10">
      {(!userData?.allowedDomains || userData.allowedDomains.length === 0) && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-center justify-between shadow-sm animate-in fade-in slide-in-from-top-4 duration-500">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-100 rounded-full text-amber-600">
              <Shield className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-bold text-amber-900 leading-none">Security Warning</p>
              <p className="text-xs text-amber-700 mt-1">Your chatbot is public. <span className="font-bold">Update Domain Security</span> to prevent unauthorized use of your credits.</p>
            </div>
          </div>
          <Button size="sm" variant="outline" onClick={() => navigate('/user/security')} className="bg-white border-amber-200 text-amber-900 hover:bg-amber-100 h-8 text-[10px] font-bold">
            Fix Now
          </Button>
        </div>
      )}

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
        <Card className="border-none bg-gradient-to-br from-primary/10 to-primary/5 shadow-soft border-l-4 border-l-primary cursor-pointer hover:shadow-lg transition-shadow" onClick={() => navigate('/user/transactions')}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-bold uppercase tracking-wider text-primary">AI Credits</CardTitle>
            <Wallet className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className={`text-3xl font-black ${userData?.tokenBalance < 25000 ? 'text-destructive animate-pulse' : 'text-foreground'}`}>
              {userData?.tokenBalance?.toLocaleString() || 0}
            </div>
            <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1 font-medium">
              {userData?.tokenBalance < 25000 && <AlertTriangle className="h-3 w-3" />}
              Approx. <span className="text-primary font-bold">{Math.floor((userData?.tokenBalance || 0) / 1800)} Chats</span> Remaining
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
            <p className="text-xs text-muted-foreground mt-1">Your chatbot is ready</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-8 grid-cols-1 lg:grid-cols-3">
        {/* Main Content Areas */}
        <div className="lg:col-span-2 space-y-10">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-xl text-primary">
              <Code className="h-6 w-6" />
            </div>
            <h2 className="text-2xl font-black tracking-tight">Embed Your Chatbot</h2>
          </div>

          <div className="grid gap-10 grid-cols-1">
            <div className="w-full">
              <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                <span className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm">1</span>
                Quick Copy Script
              </h3>
              <ScriptGenerator userId={userData?._id} websiteDomain={userData?.website} />
            </div>

            <div className="space-y-6">
              <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                <span className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm">2</span>
                Platform Specific Installation
              </h3>
              <div className="bg-muted/20 border border-muted-foreground/10 rounded-[2.5rem] p-8 backdrop-blur-sm">
                <IntegrationGuide userId={userData?._id} />
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar Activity */}
        {usageHistory.length > 0 && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <History className="h-5 w-5 text-primary" />
                <h2 className="text-xl font-bold tracking-tight">Recent Usage</h2>
              </div>
              <Button variant="ghost" size="sm" onClick={() => navigate('/user/transactions')} className="text-primary hover:text-primary hover:bg-primary/10 gap-1 text-xs">
                View More <ArrowRight className="h-3 w-3" />
              </Button>
            </div>

            <Card className="border-none shadow-soft overflow-hidden">
              <CardContent className="p-0">
                <Table>
                  <TableBody>
                    {usageHistory.map((usage) => (
                      <TableRow key={usage._id} className="hover:bg-muted/30 border-b last:border-0">
                        <TableCell className="py-4 pl-4">
                          <div className="flex flex-col gap-1">
                            <span className={`w-fit px-1.5 py-0.5 rounded text-[9px] font-bold uppercase ${getUsageTypeColor(usage.type)}`}>
                              {usage.type}
                            </span>
                            <span className="text-[11px] font-medium max-w-[140px] truncate">
                              {usage.description}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="py-4 text-right pr-4">
                          <div className="flex flex-col items-end gap-1">
                            <span className="text-[12px] font-bold text-destructive">
                              -{usage.tokensUsed.toLocaleString()}
                            </span>
                            <span className="text-[9px] text-muted-foreground">
                              {new Date(usage.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                            </span>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
};

export default UserDashboardHome;
