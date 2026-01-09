import React, { useState, useEffect } from 'react';
import { getUserTransactions, createPaymentOrder } from '@/services/api';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription
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
import { Input } from '@/components/ui/input';
import { RefreshCw, Wallet } from 'lucide-react';
import { toast } from 'sonner';
import { load } from '@cashfreepayments/cashfree-js';

// Initialize Cashfree
let cashfree: any;
try {
  cashfree = await load({
    mode: "sandbox" // or "production"
  });
} catch (e) {
  console.error("Cashfree SDK failed to load", e);
}

interface Transaction {
  _id: string;
  orderId: string;
  amount: number;
  currency: string;
  status: 'initiated' | 'processing' | 'success' | 'failed' | 'refunded';
  createdAt: string;
}

const UserTransactions = () => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [amount, setAmount] = useState<number>(100);
  const [processing, setProcessing] = useState(false);

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

  const handleRecharge = async () => {
    if (amount < 100) {
      toast.error("Minimum recharge amount is ₹100");
      return;
    }

    try {
      setProcessing(true);
      const data = await createPaymentOrder(amount);

      // Handle Cashfree Payment
      if (data && data.order && data.order.payment_session_id) {
        const checkoutOptions = {
          paymentSessionId: data.order.payment_session_id,
          redirectTarget: "_self"
        };

        if (cashfree) {
          cashfree.checkout(checkoutOptions);
        } else {
          // Fallback for missing SDK, maybe redirect if url provided (rare in session flow)
          toast.error("Payment SDK not loaded. Please refresh.");
        }
      } else {
        toast.error("Failed to initiate payment");
      }
    } catch (error: any) {
      toast.error(error.message || "Payment initiation failed");
    } finally {
      setProcessing(false);
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

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-semibold mb-2">Wallet & Transactions</h1>
          <p className="text-muted-foreground">Recharge your wallet and view history</p>
        </div>
        <Button onClick={fetchTransactions} variant="outline" size="icon">
          <RefreshCw className="h-4 w-4" />
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Add Money to Wallet</CardTitle>
          <CardDescription>Minimum recharge amount is ₹100. (1 INR = 5000 Tokens)</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-4 max-w-md">
            <div className="relative flex-1">
              <span className="absolute left-3 top-2.5 text-gray-500">₹</span>
              <Input
                type="number"
                min="100"
                value={amount}
                onChange={(e) => setAmount(Number(e.target.value))}
                className="pl-7"
              />
            </div>
            <Button onClick={handleRecharge} disabled={processing}>
              {processing ? "Processing..." : "Recharge Now"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Transaction History</CardTitle>
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
                    <TableHead>Description</TableHead>
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
                      <TableCell>Wallet Recharge</TableCell>
                      <TableCell>INR {transaction.amount}</TableCell>
                      <TableCell className="font-mono text-xs">
                        {transaction.orderId}
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
