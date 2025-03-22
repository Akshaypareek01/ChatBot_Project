
import React, { useState, useEffect } from 'react';
import { getAdminTransactions, generateInvoice, getInvoice } from '@/services/api';
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
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle 
} from '@/components/ui/dialog';
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
  Download,
  FileText, 
  MoreVertical, 
  Receipt, 
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
  discountPrice?: number;
}

interface Transaction {
  _id: string;
  userId: User;
  planId: Plan;
  orderId: string;
  transactionId?: string;
  amount: number;
  currency: string;
  status: 'initiated' | 'processing' | 'success' | 'failed' | 'refunded';
  paymentMethod?: string;
  invoiceNumber?: string;
  invoiceGenerated: boolean;
  createdAt: string;
  updatedAt: string;
}

interface Invoice {
  invoiceNumber: string;
  date: string;
  customerName: string;
  customerEmail: string;
  customerWebsite?: string;
  planName: string;
  amount: number;
  currency: string;
  transactionId: string;
  orderId: string;
  status: string;
}

const TransactionManager = () => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [invoiceData, setInvoiceData] = useState<Invoice | null>(null);
  const [showInvoiceDialog, setShowInvoiceDialog] = useState(false);
  const [processingInvoice, setProcessingInvoice] = useState(false);
  const [activeTab, setActiveTab] = useState('all');

  useEffect(() => {
    fetchTransactions();
  }, []);

  const fetchTransactions = async () => {
    try {
      setLoading(true);
      const data = await getAdminTransactions();
      setTransactions(data);
    } catch (error) {
      console.error('Error fetching transactions:', error);
      toast.error('Failed to fetch transactions');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateInvoice = async (transaction: Transaction) => {
    try {
      setSelectedTransaction(transaction);
      setProcessingInvoice(true);
      
      const result = await generateInvoice(transaction._id);
      
      if (result.transaction) {
        // Update the transaction in the list
        setTransactions(transactions.map(t => 
          t._id === transaction._id ? result.transaction : t
        ));
        
        toast.success('Invoice generated successfully');
        
        // Fetch the invoice details
        const invoiceDetails = await getInvoice(transaction._id);
        setInvoiceData(invoiceDetails);
        setShowInvoiceDialog(true);
      } else {
        toast.error('Failed to generate invoice');
      }
    } catch (error) {
      console.error('Error generating invoice:', error);
      toast.error(error.message || 'Failed to generate invoice');
    } finally {
      setProcessingInvoice(false);
    }
  };

  const handleViewInvoice = async (transaction: Transaction) => {
    try {
      setSelectedTransaction(transaction);
      setProcessingInvoice(true);
      
      const invoiceDetails = await getInvoice(transaction._id);
      setInvoiceData(invoiceDetails);
      setShowInvoiceDialog(true);
    } catch (error) {
      console.error('Error fetching invoice:', error);
      toast.error(error.message || 'Failed to fetch invoice');
    } finally {
      setProcessingInvoice(false);
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
          <p className="text-muted-foreground">Manage user payment transactions and invoices</p>
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
                        <TableHead>Plan</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead className="text-center">Status</TableHead>
                        <TableHead className="text-center">Invoice</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
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
                            {transaction.userId.name}
                            <div className="text-xs text-muted-foreground">{transaction.userId.email}</div>
                          </TableCell>
                          <TableCell>{transaction.planId.name}</TableCell>
                          <TableCell>${transaction.amount}</TableCell>
                          <TableCell className="text-center">
                            {getStatusBadge(transaction.status)}
                          </TableCell>
                          <TableCell className="text-center">
                            {transaction.invoiceGenerated ? (
                              <Badge variant="outline" className="bg-green-50 text-green-600 hover:bg-green-100">
                                {transaction.invoiceNumber?.substring(0, 8)}...
                              </Badge>
                            ) : (
                              transaction.status === 'success' ? (
                                <Badge variant="outline">Not Generated</Badge>
                              ) : (
                                <Badge variant="outline" className="bg-muted/30">N/A</Badge>
                              )
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon">
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                {transaction.status === 'success' && !transaction.invoiceGenerated && (
                                  <DropdownMenuItem onClick={() => handleGenerateInvoice(transaction)}>
                                    <Receipt className="h-4 w-4 mr-2" />
                                    Generate Invoice
                                  </DropdownMenuItem>
                                )}
                                {transaction.invoiceGenerated && (
                                  <DropdownMenuItem onClick={() => handleViewInvoice(transaction)}>
                                    <FileText className="h-4 w-4 mr-2" />
                                    View Invoice
                                  </DropdownMenuItem>
                                )}
                              </DropdownMenuContent>
                            </DropdownMenu>
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

      {/* Invoice Dialog */}
      <Dialog open={showInvoiceDialog} onOpenChange={setShowInvoiceDialog}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Invoice {invoiceData?.invoiceNumber}</DialogTitle>
            <DialogDescription>
              Transaction details and invoice information.
            </DialogDescription>
          </DialogHeader>
          
          {invoiceData && (
            <div className="space-y-6">
              <div className="bg-muted/30 rounded-lg p-6 border">
                <div className="flex justify-between items-start mb-8">
                  <div>
                    <h3 className="text-xl font-bold">Invoice</h3>
                    <p className="text-sm text-muted-foreground">
                      #{invoiceData.invoiceNumber}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">Date: {new Date(invoiceData.date).toLocaleDateString()}</p>
                    <p className="text-sm text-muted-foreground">
                      Order ID: {invoiceData.orderId}
                    </p>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-8 mb-8">
                  <div>
                    <h4 className="font-medium mb-2">Bill To:</h4>
                    <p>{invoiceData.customerName}</p>
                    <p>{invoiceData.customerEmail}</p>
                    {invoiceData.customerWebsite && <p>{invoiceData.customerWebsite}</p>}
                  </div>
                  <div>
                    <h4 className="font-medium mb-2">Payment Info:</h4>
                    <p>Status: <span className="capitalize">{invoiceData.status}</span></p>
                    <p>Transaction ID: {invoiceData.transactionId}</p>
                  </div>
                </div>
                
                <div className="border-t border-b py-4 mb-6">
                  <div className="grid grid-cols-12 font-medium">
                    <div className="col-span-6">Item</div>
                    <div className="col-span-2">Quantity</div>
                    <div className="col-span-2 text-right">Unit Price</div>
                    <div className="col-span-2 text-right">Total</div>
                  </div>
                </div>
                
                <div className="grid grid-cols-12 mb-4">
                  <div className="col-span-6">{invoiceData.planName} Subscription</div>
                  <div className="col-span-2">1</div>
                  <div className="col-span-2 text-right">${invoiceData.amount}</div>
                  <div className="col-span-2 text-right">${invoiceData.amount}</div>
                </div>
                
                <div className="border-t pt-4">
                  <div className="flex justify-end">
                    <div className="w-60">
                      <div className="flex justify-between mb-1">
                        <span>Subtotal:</span>
                        <span>${invoiceData.amount}</span>
                      </div>
                      <div className="flex justify-between mb-1">
                        <span>Tax:</span>
                        <span>$0.00</span>
                      </div>
                      <div className="flex justify-between font-bold text-lg mt-2">
                        <span>Total:</span>
                        <span>${invoiceData.amount}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="flex justify-end">
                <Button variant="outline" size="sm" className="mr-2" onClick={() => setShowInvoiceDialog(false)}>
                  Close
                </Button>
                <Button size="sm">
                  <Download className="h-4 w-4 mr-2" />
                  Download PDF
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TransactionManager;
