
import React, { useState, useEffect } from 'react';
import { getAdminTransactions } from '@/services/api';
import { toast } from 'sonner';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import {
  Badge
} from '@/components/ui/badge';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger
} from '@/components/ui/tabs';
import {
  MoreVertical,
  RefreshCw,
  Search
} from 'lucide-react';

interface User {
  _id: string;
  name: string;
  email: string;
}

interface Plan {
  _id: string;
  name: string;
  price: number;
}

interface Transaction {
  _id: string;
  userId: User;
  planId?: Plan; // Make plan optional or handle wallet recharge
  description?: string; // Add description for wallet recharge
  orderId: string;
  amount: number;
  currency: string;
  status: 'initiated' | 'processing' | 'success' | 'failed' | 'refunded';
  createdAt: string;
  updatedAt: string;
}

const TransactionManager = () => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    fetchTransactions();
  }, [page, activeTab]);

  const fetchTransactions = async () => {
    try {
      setLoading(true);
      const data = await getAdminTransactions({ page, limit: 10 });
      // Handle paginated response
      if (data.transactions) {
        setTransactions(data.transactions);
        setTotalPages(data.pagination?.totalPages || 1);
        setTotal(data.pagination?.total || 0);
      } else {
        setTransactions(Array.isArray(data) ? data : []);
      }
    } catch (error) {
      console.error('Failed to fetch transactions:', error);
      toast.error('Failed to load transactions');
      setTransactions([]);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'success':
        return 'success';
      case 'failed':
        return 'destructive';
      case 'initiated':
        return 'outline';
      case 'processing':
        return 'secondary';
      case 'refunded':
        return 'warning';
      default:
        return 'default';
    }
  };

  const getStatusBadge = (status: string) => {
    return (
      <Badge variant={getStatusBadgeVariant(status) as any} className="capitalize">
        {status}
      </Badge>
    );
  };

  const filterTransactions = () => {
    if (activeTab === 'all') {
      return transactions;
    }
    return transactions.filter(t => t.status === activeTab);
  };

  const filteredTransactions = filterTransactions();

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-semibold mb-2">Transactions</h1>
          <p className="text-muted-foreground">Manage user payment transactions.</p>
        </div>
        <Button onClick={fetchTransactions} variant="outline" size="icon">
          <RefreshCw className="h-4 w-4" />
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid grid-cols-5 w-full max-w-xl">
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="success">Successful</TabsTrigger>
          <TabsTrigger value="initiated">Initiated</TabsTrigger>
          <TabsTrigger value="processing">Processing</TabsTrigger>
          <TabsTrigger value="failed">Failed</TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>
                Transaction List
                {activeTab !== 'all' && ` - ${activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}`}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex justify-center items-center h-64">
                  <div className="loading-spinner"></div>
                </div>
              ) : filteredTransactions.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-muted-foreground">No transactions found.</p>
                </div>
              ) : (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Order ID</TableHead>
                        <TableHead>Customer</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead className="text-center">Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredTransactions.map((transaction) => (
                        <TableRow key={transaction._id}>
                          <TableCell className="font-medium">
                            {new Date(transaction.createdAt).toLocaleDateString()}
                          </TableCell>
                          <TableCell className="font-mono text-xs">
                            {transaction.orderId.substring(0, 12)}...
                          </TableCell>
                          <TableCell>
                            {transaction.userId?.name || 'Unknown'}
                            <div className="text-xs text-muted-foreground">{transaction.userId?.email}</div>
                          </TableCell>
                          <TableCell>
                            {transaction.planId ? transaction.planId.name : (transaction.description || 'Wallet Recharge')}
                          </TableCell>
                          <TableCell>INR {transaction.amount}</TableCell>
                          <TableCell className="text-center">
                            {getStatusBadge(transaction.status)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-6 py-4 border-t">
                <div className="text-sm text-muted-foreground">
                  Showing {transactions.length} of {total} transactions
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1}
                  >
                    Previous
                  </Button>
                  <div className="text-sm">
                    Page {page} of {totalPages}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default TransactionManager;
