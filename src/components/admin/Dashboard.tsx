
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { mockAnalytics } from '@/utils/mockData';
import { Users, MessageCircle, Clock, BarChartIcon, UserCheck, Zap } from 'lucide-react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const Dashboard = () => {
  const { 
    totalUsers, 
    activeUsers, 
    totalChats, 
    activeChats, 
    averageSessionTime,
    topQuestions,
    chatTrend
  } = mockAnalytics;

  const stats = [
    { 
      title: 'Total Users', 
      value: totalUsers, 
      icon: Users, 
      description: 'Total registered users', 
      color: 'bg-blue-50 text-blue-600'
    },
    { 
      title: 'Active Users', 
      value: activeUsers, 
      icon: UserCheck, 
      description: 'Active in last 30 days', 
      color: 'bg-green-50 text-green-600'
    },
    { 
      title: 'Total Chats', 
      value: totalChats, 
      icon: MessageCircle, 
      description: 'Total conversations', 
      color: 'bg-purple-50 text-purple-600'
    },
    { 
      title: 'Active Chats', 
      value: activeChats, 
      icon: Zap, 
      description: 'Live conversations', 
      color: 'bg-amber-50 text-amber-600'
    },
    { 
      title: 'Avg. Session', 
      value: averageSessionTime, 
      icon: Clock, 
      description: 'Average chat duration', 
      color: 'bg-indigo-50 text-indigo-600'
    }
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold mb-2">Dashboard</h1>
        <p className="text-muted-foreground">Analytics and key metrics overview</p>
      </div>
      
      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {stats.map((stat, index) => (
          <Card key={index} className="shadow-soft hover:shadow-premium transition-shadow">
            <CardContent className="p-6">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-1">{stat.title}</p>
                  <p className="text-2xl font-bold">{stat.value}</p>
                  <p className="text-xs text-muted-foreground mt-1">{stat.description}</p>
                </div>
                <div className={`p-2 rounded-full ${stat.color}`}>
                  <stat.icon className="h-5 w-5" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      
      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Chat Trend */}
        <Card className="shadow-soft">
          <CardHeader>
            <CardTitle className="flex items-center">
              <BarChartIcon className="mr-2 h-5 w-5 text-muted-foreground" />
              Chat Activity
            </CardTitle>
            <CardDescription>Weekly chat volume</CardDescription>
          </CardHeader>
          <CardContent className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chatTrend}>
                <defs>
                  <linearGradient id="colorUv" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis 
                  dataKey="date" 
                  tick={{ fontSize: 12 }} 
                  tickFormatter={(value) => {
                    const date = new Date(value);
                    return `${date.getMonth() + 1}/${date.getDate()}`;
                  }}
                />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'white', 
                    borderRadius: '0.375rem',
                    border: '1px solid #f0f0f0',
                    boxShadow: '0 10px 30px rgba(0, 0, 0, 0.03), 0 1px 4px rgba(0, 0, 0, 0.02)'
                  }}
                />
                <Area type="monotone" dataKey="count" stroke="#3b82f6" fillOpacity={1} fill="url(#colorUv)" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        
        {/* Top Questions */}
        <Card className="shadow-soft">
          <CardHeader>
            <CardTitle className="flex items-center">
              <MessageCircle className="mr-2 h-5 w-5 text-muted-foreground" />
              Top Questions
            </CardTitle>
            <CardDescription>Most frequently asked questions</CardDescription>
          </CardHeader>
          <CardContent className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart 
                data={topQuestions}
                layout="vertical"
                margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 12 }} />
                <YAxis 
                  type="category" 
                  dataKey="question" 
                  tick={{ fontSize: 12 }} 
                  width={180}
                  tickFormatter={(value) => value.length > 25 ? `${value.substring(0, 25)}...` : value}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'white', 
                    borderRadius: '0.375rem',
                    border: '1px solid #f0f0f0',
                    boxShadow: '0 10px 30px rgba(0, 0, 0, 0.03), 0 1px 4px rgba(0, 0, 0, 0.02)'
                  }}
                />
                <Bar dataKey="count" fill="#8884d8" barSize={20} radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;
