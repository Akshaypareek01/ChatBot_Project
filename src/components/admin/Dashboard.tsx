import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, BarChartIcon, DollarSign, Wallet, AlertTriangle, Database, FileText, Globe, Activity } from 'lucide-react';
import { getAnalytics } from '@/services/api';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

const Dashboard = () => {
  const [analytics, setAnalytics] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const data = await getAnalytics();
        setAnalytics(data);
      } catch (error) {
        console.error("Failed to fetch analytics", error);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  if (loading) {
    return <div className="flex h-96 items-center justify-center"><div className="loading-spinner" /></div>;
  }

  if (!analytics) {
    return <div className="text-center py-12">Failed to load analytics</div>;
  }

  const { overview, alerts, usage } = analytics;

  const stats = [
    {
      title: 'Total Users',
      value: overview.totalUsers || 0,
      icon: Users,
      description: `${overview.activeUsers || 0} active (30 days)`,
      color: 'bg-blue-50 text-blue-600'
    },
    {
      title: 'Tokens in Circulation',
      value: (overview.totalTokens || 0).toLocaleString(),
      icon: Wallet,
      description: 'Total user balances',
      color: 'bg-green-50 text-green-600'
    },
    {
      title: 'Total Revenue',
      value: `₹${(overview.totalRevenue || 0).toLocaleString()}`,
      icon: DollarSign,
      description: 'Lifetime earnings',
      color: 'bg-purple-50 text-purple-600'
    },
    {
      title: 'Data Sources',
      value: overview.totalSources || 0,
      icon: Database,
      description: `${overview.totalVectors || 0} vectors indexed`,
      color: 'bg-orange-50 text-orange-600'
    },
    {
      title: 'Recent Activity',
      value: overview.recentTransactions || 0,
      icon: Activity,
      description: 'Transactions (7 days)',
      color: 'bg-pink-50 text-pink-600'
    }
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold mb-2">Admin Dashboard</h1>
        <p className="text-muted-foreground">Platform overview and analytics</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
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

      {/* Low Token Alerts */}
      {alerts.lowTokenUsers && alerts.lowTokenUsers.length > 0 && (
        <Card className="shadow-soft border-orange-200">
          <CardHeader>
            <CardTitle className="flex items-center text-orange-600">
              <AlertTriangle className="mr-2 h-5 w-5" />
              Low Token Balance Alerts
            </CardTitle>
            <CardDescription>Users with less than 10,000 tokens</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead className="text-right">Token Balance</TableHead>
                  <TableHead className="text-right">Last Active</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {alerts.lowTokenUsers.map((user: any) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">{user.name}</TableCell>
                    <TableCell className="text-muted-foreground">{user.email}</TableCell>
                    <TableCell className="text-right">
                      <Badge variant={user.tokenBalance < 1000 ? 'destructive' : 'secondary'}>
                        {user.tokenBalance.toLocaleString()}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right text-sm text-muted-foreground">
                      {new Date(user.lastActive).toLocaleDateString()}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Usage Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="shadow-soft">
          <CardHeader>
            <CardTitle className="flex items-center">
              <FileText className="mr-2 h-5 w-5 text-blue-500" />
              File Uploads
            </CardTitle>
            <CardDescription>Total files processed</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold text-blue-600">{usage.files || 0}</div>
            <p className="text-sm text-muted-foreground mt-2">Documents uploaded by users</p>
          </CardContent>
        </Card>

        <Card className="shadow-soft">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Globe className="mr-2 h-5 w-5 text-green-500" />
              Website Scrapes
            </CardTitle>
            <CardDescription>Total websites scraped</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold text-green-600">{usage.websites || 0}</div>
            <p className="text-sm text-muted-foreground mt-2">Websites processed by users</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;
