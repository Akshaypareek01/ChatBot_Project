
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { MessageSquare, Users, BarChart2, AlertTriangle, Clock } from 'lucide-react';
import { getUserProfile, getUserChatbotData, getUserSubscription } from '@/services/api';
import ScriptGenerator from '../chatbot/ScriptGenerator';
import { calculateTimeRemaining, formatTimeRemaining } from '@/utils/dateUtils';
import { useNavigate } from 'react-router-dom';
import { Button } from '../ui/button';

const UserDashboardHome = ({ subscription }) => {
  const [userData, setUserData] = useState<any>(null);
  const [chatbotData, setChatbotData] = useState<any>(null);
  // const [subscription, setSubscription] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();
  const [timeRemaining, setTimeRemaining] = useState<string | null>(null);
  const [isExpired, setIsExpired] = useState(false);

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

  useEffect(() => {
    if (subscription && subscription.endDate) {
      // Calculate time remaining
      const remaining = calculateTimeRemaining(subscription.endDate);
      
      // Check if subscription has expired
      if (!remaining && subscription.plan.name !== 'Free') {
        setIsExpired(true);
      } else if (remaining) {
        setTimeRemaining(formatTimeRemaining(remaining));
      }
      
      // Update time remaining every minute
      const interval = setInterval(() => {
        const updatedRemaining = calculateTimeRemaining(subscription.endDate);
        if (!updatedRemaining && subscription.plan.name !== 'Free') {
          setIsExpired(true);
          setTimeRemaining(null);
          clearInterval(interval);
        } else if (updatedRemaining) {
          setTimeRemaining(formatTimeRemaining(updatedRemaining));
        }
      }, 60000); // Update every minute
      
      return () => clearInterval(interval);
    }
  }, [subscription]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[400px]">
        <div className="loading-spinner"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold mb-2">Dashboard</h1>
        <p className="text-muted-foreground">Welcome back, {userData?.name}</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Chats</CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{userData?.totalChats || 0}</div>
            <p className="text-xs text-muted-foreground">conversations with your customers</p>
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
            <CardTitle className="text-sm font-medium">Current Plan</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{subscription?.plan?.name || 'Free'}</div>
            <p className="text-xs text-muted-foreground">{subscription?.plan?.tokens || 0} tokens available</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Token Usage</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{subscription?.tokensUsed || 0} / {subscription?.plan?.tokens || 0}</div>
            <p className="text-xs text-muted-foreground">tokens used this month</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="col-span-1">
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>Your chatbot's recent interactions</CardDescription>
          </CardHeader>
          <CardContent>
            {userData?.lastActive ? (
              <div className="text-sm">Last active: {new Date(userData.lastActive).toLocaleString()}</div>
            ) : (
              <div className="text-sm text-muted-foreground">No recent activity</div>
            )}
          </CardContent>
        </Card>

        <Card className="col-span-1">
          <CardHeader>
            <CardTitle>Subscription Status</CardTitle>
            <CardDescription>Your current subscription information</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Plan:</span>
                <span className="font-medium">{subscription?.plan?.name || 'Free'}</span>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Status:</span>
                {isExpired ? (
                  <span className="text-destructive font-medium">Expired</span>
                ) : (
                  <span className="text-green-500 font-medium">Active</span>
                )}
              </div>
              
              {subscription?.plan?.name !== 'Free' && (
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Expires:</span>
                  <span className="font-medium">
                    {new Date(subscription?.endDate).toLocaleDateString()}
                  </span>
                </div>
              )}
              
              {timeRemaining && subscription?.plan?.name !== 'Free' && (
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Time remaining:</span>
                  <span className="font-medium flex items-center">
                    <Clock className="h-4 w-4 mr-1 text-primary" />
                    {timeRemaining}
                  </span>
                </div>
              )}
            </div>
          </CardContent>
          {isExpired && (
            <CardFooter>
              <Button className="w-full" onClick={() => navigate('/user/plans')}>
                Upgrade Now
              </Button>
            </CardFooter>
          )}
        </Card>

        <Card className="col-span-2">
<CardHeader>
<CardTitle>Hey,</CardTitle>
</CardHeader>
<CardContent> 
<div >
  <div className="bg-muted p-4 rounded-lg mb-4">
    <h3 className="text-sm font-medium mb-2">Your Embed Script</h3>
    <ScriptGenerator userId={userData?._id} websiteDomain={userData?.website} />
  </div>
</div>
</CardContent>

</Card>
      </div>
    </div>
  );
};

export default UserDashboardHome;


