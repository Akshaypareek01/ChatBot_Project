import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { MessageSquare, Users, BarChart2, AlertTriangle, Wallet } from 'lucide-react';
import { getUserProfile, getUserChatbotData } from '@/services/api';
import ScriptGenerator from '../chatbot/ScriptGenerator';
import { useNavigate } from 'react-router-dom';
import { Button } from '../ui/button';

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
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-semibold mb-2">Dashboard</h1>
          <p className="text-muted-foreground">Welcome back, {userData?.name}</p>
        </div>
        <Button onClick={() => navigate('/user/transactions')} className="bg-primary">
          <Wallet className="mr-2 h-4 w-4" /> Add Money
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Wallet Balance</CardTitle>
            <Wallet className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${userData?.tokenBalance < 10000 ? 'text-red-500' : 'text-green-600'}`}>
              {userData?.tokenBalance?.toLocaleString() || 0}
            </div>
            <p className="text-xs text-muted-foreground">tokens available</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">QA Entries</CardTitle>
            <BarChart2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{chatbotData?.qas?.length || 0}</div>
            <p className="text-xs text-muted-foreground">knowledge base entries</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Est. Messages</CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">~{Math.floor((userData?.tokenBalance || 0) / 1000)}</div>
            <p className="text-xs text-muted-foreground">based on avg usage</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Status</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-500">Active</div>
            <p className="text-xs text-muted-foreground">Pay As You Go</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-1">
        <Card className="col-span-1">
          <CardHeader>
            <CardTitle>Embed Your Chatbot</CardTitle>
            <CardDescription>Copy this code to your website</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="bg-muted p-4 rounded-lg">
              <ScriptGenerator userId={userData?._id} websiteDomain={userData?.website} />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default UserDashboardHome;


