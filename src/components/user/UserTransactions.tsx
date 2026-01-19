import React, { useState, useEffect } from 'react';
import { getUserTransactions, createPaymentOrder, getUsageHistory } from '@/services/api';
import { Base_url } from '@/config/Base_url.jsx';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RefreshCw, Wallet, BarChart3, History } from 'lucide-react';
import { toast } from 'sonner';
import { load } from '@cashfreepayments/cashfree-js';

// Initialize Cashfree
let cashfreeInstance: any = null;

interface Transaction {
  _id: string;
  orderId: string;
  amount: number;
  currency: string;
  status: 'initiated' | 'processing' | 'success' | 'failed' | 'refunded';
  tokens: number;
  createdAt: string;
}

interface UsageRecord {
  _id: string;
  type: 'chat' | 'upload' | 'scrape';
  description: string;
  tokensUsed: number;
  createdAt: string;
}

const AVG_TOKENS_PER_CHAT = 1800;

interface Plan {
  id: string;
  name: string;
  amount: number;
  tokens: number;
  bonus?: string;
  badge?: string;
  chats: number;
}

const PLANS: Plan[] = [
  { id: 'budget', name: 'Budget', amount: 49, tokens: 122500, chats: 68 },
  { id: 'popular', name: 'Popular', amount: 99, tokens: 247500, badge: 'Popular', chats: 137 },
  { id: 'pro', name: 'Professional', amount: 199, tokens: 522375, bonus: '+5% Bonus', badge: 'Best Value', chats: 290 },
  { id: 'growth', name: 'Enterprise', amount: 499, tokens: 1372250, bonus: '+10% Bonus', chats: 762 },
];

const UserTransactions = () => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [usageHistory, setUsageHistory] = useState<UsageRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingUsage, setLoadingUsage] = useState(false);
  const [amount, setAmount] = useState<number>(99);
  const [processing, setProcessing] = useState(false);
  const [isAutoPay, setIsAutoPay] = useState(false);

  // Calculate estimated tokens for custom amount
  const getEstimatedTokens = (amt: number) => {
    const base = amt * 2500;
    if (amt >= 999) return Math.floor(base * 1.15);
    if (amt >= 499) return Math.floor(base * 1.10);
    if (amt >= 199) return Math.floor(base * 1.05);
    return base;
  };

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

  const fetchUsage = async () => {
    try {
      setLoadingUsage(true);
      const data = await getUsageHistory();
      setUsageHistory(data);
    } catch (error) {
      console.error('Error fetching usage:', error);
    } finally {
      setLoadingUsage(false);
    }
  };

  // Group usage by date and calculate totals
  const groupUsageByDate = (usageData: UsageRecord[]) => {
    const grouped = usageData.reduce((acc, usage) => {
      const date = new Date(usage.createdAt).toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      });

      if (!acc[date]) {
        acc[date] = {
          date,
          totalTokens: 0,
          count: 0,
          types: new Set<string>(),
          firstCreatedAt: usage.createdAt
        };
      }

      acc[date].totalTokens += usage.tokensUsed;
      acc[date].count += 1;
      acc[date].types.add(usage.type);

      return acc;
    }, {} as Record<string, { date: string; totalTokens: number; count: number; types: Set<string>; firstCreatedAt: string }>);

    return Object.values(grouped).sort((a, b) =>
      new Date(b.firstCreatedAt).getTime() - new Date(a.firstCreatedAt).getTime()
    );
  };

  useEffect(() => {
    const initCashfree = async () => {
      try {
        const isProduction = Base_url.includes('nvhotech.in') || !Base_url.includes('localhost');
        const mode = isProduction ? "production" : "sandbox";
        cashfreeInstance = await load({ mode: mode as "sandbox" | "production" });
      } catch (e) {
        console.error("Cashfree SDK failed to load", e);
      }
    };
    initCashfree();
    fetchTransactions();
    fetchUsage();
  }, []);

  const handleRecharge = async (rechargeAmount?: number) => {
    const finalAmount = rechargeAmount || amount;
    if (finalAmount < 49) {
      toast.error("Minimum recharge amount is ₹49");
      return;
    }

    try {
      setProcessing(true);
      const data = await createPaymentOrder(finalAmount);

      if (data && data.order && data.order.payment_session_id) {
        const checkoutOptions = {
          paymentSessionId: data.order.payment_session_id,
          redirectTarget: "_self"
        };

        if (cashfreeInstance) {
          cashfreeInstance.checkout(checkoutOptions);
        } else {
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
      case 'success': return 'success';
      case 'failed': return 'destructive';
      case 'initiated': return 'outline';
      case 'processing': return 'secondary';
      case 'refunded': return 'warning';
      default: return 'default';
    }
  };

  const getUsageTypeColor = (type: string) => {
    switch (type) {
      case 'chat': return 'bg-blue-100 text-blue-700';
      case 'upload': return 'bg-purple-100 text-purple-700';
      case 'scrape': return 'bg-orange-100 text-orange-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  return (
    <div className="space-y-8 pb-10">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-semibold mb-2">Wallet & Billing</h1>
          <p className="text-muted-foreground">Manage credits and view your consumption transparency</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => { fetchTransactions(); fetchUsage(); }} variant="outline" size="icon">
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Strategic Plans */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {PLANS.map((plan) => (
          <Card key={plan.id} className={`relative overflow-hidden cursor-pointer transition-all hover:ring-2 hover:ring-primary/50 ${amount === plan.amount ? 'ring-2 ring-primary' : ''}`} onClick={() => setAmount(plan.amount)}>
            {plan.badge && (
              <div className="absolute top-0 right-0">
                <div className="bg-primary text-primary-foreground text-[10px] font-bold px-2 py-1 rounded-bl-lg uppercase tracking-wider">
                  {plan.badge}
                </div>
              </div>
            )}
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">{plan.name}</CardTitle>
              <div className="flex items-baseline gap-1">
                <span className="text-2xl font-bold">₹{plan.amount}</span>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">AI Credits</span>
                  <span className="font-semibold">{plan.tokens.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center text-primary font-medium">
                  <span>Chat Capacity</span>
                  <span>~{plan.chats} Chats</span>
                </div>
                {plan.bonus && (
                  <div className="bg-green-100 text-green-700 text-[10px] font-bold py-1 px-2 rounded-full inline-block">
                    {plan.bonus}
                  </div>
                )}
                <Button
                  className="w-full mt-4"
                  variant={amount === plan.amount ? "default" : "outline"}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRecharge(plan.amount);
                  }}
                  disabled={processing}
                >
                  Get Started
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Custom Recharge & Auto-Pay */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Custom Recharge</CardTitle>
            <CardDescription>Enter any amount (Min ₹49). 1 INR = 2500 Credits.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              <div className="flex flex-col md:flex-row items-start md:items-center gap-4">
                <div className="relative w-full md:max-w-[240px]">
                  <span className="absolute left-3 top-2.5 text-gray-500 font-medium">₹</span>
                  <Input
                    type="number"
                    min="49"
                    value={amount}
                    onChange={(e) => setAmount(Number(e.target.value))}
                    className="pl-7 text-xl font-bold h-12"
                  />
                </div>
                <Button
                  onClick={() => handleRecharge()}
                  disabled={processing}
                  size="lg"
                  className="w-full md:w-auto px-10 h-12 text-lg shadow-lg hover:shadow-xl transition-all"
                >
                  {processing ? (
                    <div className="flex items-center gap-2">
                      <RefreshCw className="h-5 w-5 animate-spin" />
                      Processing...
                    </div>
                  ) : "Recharge Credits"}
                </Button>
              </div>

              <div className="p-4 bg-muted/30 rounded-lg flex flex-wrap gap-6 items-center border">
                <div className="flex flex-col">
                  <span className="text-xs text-muted-foreground uppercase font-bold tracking-tighter">You Get</span>
                  <span className="text-lg font-bold text-primary">{getEstimatedTokens(amount).toLocaleString()} Credits</span>
                </div>
                <div className="flex flex-col border-l pl-6">
                  <span className="text-xs text-muted-foreground uppercase font-bold tracking-tighter">Est. Usage</span>
                  <span className="text-lg font-bold text-green-600">~{Math.floor(getEstimatedTokens(amount) / AVG_TOKENS_PER_CHAT)} Chats</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Auto Pay Feature */}
        <Card className="border-primary/20 bg-primary/5">
          <CardHeader>
            <div className="flex justify-between items-start">
              <CardTitle className="text-lg">Auto-Pay</CardTitle>
              <div className={`w-12 h-6 rounded-full p-1 cursor-pointer transition-colors ${isAutoPay ? 'bg-primary' : 'bg-gray-300'}`} onClick={() => setIsAutoPay(!isAutoPay)}>
                <div className={`w-4 h-4 bg-white rounded-full transition-transform ${isAutoPay ? 'translate-x-6' : ''}`} />
              </div>
            </div>
            <CardDescription>Never let your chatbot go offline.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Automatically recharge <span className="font-bold">₹199</span> when your balance drops below <span className="font-bold">10%</span>.
            </p>
            <div className="bg-white/50 p-2 rounded text-[11px] font-medium border border-primary/10">
              🎁 Extra <span className="text-primary font-bold">10% Loyalty Bonus</span> on every auto-recharge.
            </div>
            <p className="text-[10px] text-muted-foreground italic text-center">
              Powered by Cashfree Subscriptions. Cancel anytime.
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="payments" className="w-full">
        <TabsList className="grid w-full grid-cols-2 mb-4 bg-muted/50 p-1">
          <TabsTrigger value="payments" className="gap-2">
            <Wallet className="h-4 w-4" /> Payment History
          </TabsTrigger>
          <TabsTrigger value="usage" className="gap-2">
            <BarChart3 className="h-4 w-4" /> Usage Breakdown
          </TabsTrigger>
        </TabsList>

        <TabsContent value="payments">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Transaction History</CardTitle>
                <CardDescription>Recent payments and credits</CardDescription>
              </div>
              <Badge variant="outline" className="text-xs font-normal">
                1 Word ≈ 1.3 Tokens
              </Badge>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex justify-center items-center h-32">
                  <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : transactions.length === 0 ? (
                <div className="text-center py-12 border-2 border-dashed rounded-xl">
                  <Wallet className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
                  <p className="text-muted-foreground font-medium">You don't have any transactions yet.</p>
                </div>
              ) : (
                <div className="rounded-xl border overflow-hidden">
                  <Table>
                    <TableHeader className="bg-muted/50">
                      <TableRow>
                        <TableHead className="w-[120px]">Date</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Credits</TableHead>
                        <TableHead className="text-center">Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {transactions.map((transaction) => (
                        <TableRow key={transaction._id} className="hover:bg-muted/30">
                          <TableCell className="font-medium">
                            {new Date(transaction.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col">
                              <span className="text-sm font-medium">Wallet Recharge</span>
                              <span className="text-[10px] font-mono text-muted-foreground">{transaction.orderId}</span>
                            </div>
                          </TableCell>
                          <TableCell className="font-semibold text-foreground">₹{transaction.amount}</TableCell>
                          <TableCell>
                            <span className="font-semibold">{(transaction.tokens || transaction.amount * 2500).toLocaleString()}</span>
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge variant={getStatusBadgeVariant(transaction.status) as any} className="capitalize px-3 py-0.5 font-bold">
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
        </TabsContent>

        <TabsContent value="usage">
          <Card>
            <CardHeader>
              <CardTitle>Usage History</CardTitle>
              <CardDescription>Detailed breakdown of how your credits were used</CardDescription>
            </CardHeader>
            <CardContent>
              {loadingUsage ? (
                <div className="flex justify-center items-center h-32">
                  <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : usageHistory.length === 0 ? (
                <div className="text-center py-12 border-2 border-dashed rounded-xl">
                  <History className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
                  <p className="text-muted-foreground font-medium">No usage records found.</p>
                </div>
              ) : (
                <div className="rounded-xl border overflow-hidden">
                  <Table>
                    <TableHeader className="bg-muted/50">
                      <TableRow>
                        <TableHead className="w-[150px]">Date</TableHead>
                        <TableHead>Activities</TableHead>
                        <TableHead className="text-right">Total Tokens Used</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {groupUsageByDate(usageHistory).map((dailyUsage, index) => (
                        <TableRow key={index} className="hover:bg-muted/30">
                          <TableCell className="font-medium">
                            {dailyUsage.date}
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-wrap gap-1.5">
                              {Array.from(dailyUsage.types).map((type) => (
                                <span key={type} className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase ${getUsageTypeColor(type)}`}>
                                  {type}
                                </span>
                              ))}
                              <span className="text-xs text-muted-foreground ml-2">
                                {dailyUsage.count} {dailyUsage.count === 1 ? 'activity' : 'activities'}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell className="text-right font-bold text-destructive text-lg">
                            -{dailyUsage.totalTokens.toLocaleString()}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default UserTransactions;
