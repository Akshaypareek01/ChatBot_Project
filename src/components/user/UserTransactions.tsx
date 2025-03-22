
import React, { useState, useEffect } from 'react';
import { getUserTransactions } from '@/services/api';
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
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { RefreshCw } from 'lucide-react';
import { toast } from 'sonner';

interface Transaction {
  _id: string;
  orderId: string;
  transactionId?: string;
  planId: {
    _id: string;
    name: string;
    price: number;
    discountPrice?: number;
  };
  amount: number;
  currency: string;
  status: 'initiated' | 'processing' | 'success' | 'failed' | 'refunded';
  paymentMethod?: string;
  invoiceNumber?: string;
  createdAt: string;
}

const UserTransactions = () => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTransactions = async () => {
    try {
      setLoading(true);
      const data = await getUserTransactions();
      setTransactions(data);
    } catch (error) {
      console.error('Error fetching transactions:', error);
      toast.error('Failed to fetch transaction history');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTransactions();
  }, []);

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

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-semibold mb-2">Transaction History</h1>
          <p className="text-muted-foreground">View your past payments and subscriptions</p>
        </div>
        <Button onClick={fetchTransactions} variant="outline" size="icon">
          <RefreshCw className="h-4 w-4" />
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Your Transactions</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center items-center h-32">
              <div className="loading-spinner"></div>
            </div>
          ) : transactions.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">You don't have any transactions yet.</p>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Plan</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Order ID</TableHead>
                    <TableHead className="text-center">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transactions.map((transaction) => (
                    <TableRow key={transaction._id}>
                      <TableCell className="font-medium">
                        {new Date(transaction.createdAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell>{transaction.planId.name}</TableCell>
                      <TableCell>${transaction.amount}</TableCell>
                      <TableCell className="font-mono text-xs">
                        {transaction.orderId.substring(0, 12)}...
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant={getStatusBadgeVariant(transaction.status) as any} className="capitalize">
                          {transaction.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default UserTransactions;
