
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Check, CreditCard, AlertCircle } from 'lucide-react';
import { getPlans, getUserSubscription, subscribeToPlan, createPaymentOrder, simulatePayment } from '@/services/api';
import { toast } from 'sonner';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useNavigate } from 'react-router-dom';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle 
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface Plan {
  _id: string;
  name: string;
  description: string;
  price: number;
  discountPrice?: number;
  tokens: number;
  features: string[];
  isPopular: boolean;
}

interface Subscription {
  _id: string;
  userId: string;
  planId: string;
  plan: Plan;
  startDate: string;
  endDate: string;
  isActive: boolean;
  isExpired: boolean;
  tokensUsed: number;
  hadBasicPlan?: boolean;
}

interface PaymentOrder {
  orderId: string;
  orderAmount: number;
  orderCurrency: string;
  orderStatus: string;
  paymentLink: string;
}

const UserPlans = () => {
  const navigate = useNavigate();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubscriptionExpired, setIsSubscriptionExpired] = useState(false);
  const [hadPreviousPaidPlan, setHadPreviousPaidPlan] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [paymentOrder, setPaymentOrder] = useState<PaymentOrder | null>(null);
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [showPaymentSimulator, setShowPaymentSimulator] = useState(false);
  const [processingPayment, setProcessingPayment] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [plansData, subscriptionData] = await Promise.all([
          getPlans(),
          getUserSubscription()
        ]);
        
        setPlans(plansData);
        setSubscription(subscriptionData);
        if (subscriptionData && (subscriptionData.isExpired || 
          (new Date() > new Date(subscriptionData.endDate)))) {
          setIsSubscriptionExpired(true);
        }
      } catch (error) {
        console.error('Error fetching plans data:', error);
        toast.error('Could not load plans');
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [navigate]);

  const initiatePlanPurchase = async (plan: Plan) => {
    try {
      setSelectedPlan(plan);
      setProcessingPayment(true);
      
      const data = await createPaymentOrder(plan._id);
      
      if (data.success) {
        setPaymentOrder(data.order);
        setShowPaymentDialog(true);
      } else {
        toast.error('Failed to create payment order');
      }
    } catch (error) {
      console.error('Error initiating payment:', error);
      toast.error(error.message || 'Failed to initiate payment');
    } finally {
      setProcessingPayment(false);
    }
  };

  const handleSimulatePayment = async (status: 'success' | 'failed') => {
    if (!paymentOrder) return;
    
    try {
      setProcessingPayment(true);
      const data = await simulatePayment(paymentOrder.orderId, status);
      
      setShowPaymentDialog(false);
      setShowPaymentSimulator(false);
      
      if (data.success) {
        toast.success('Payment successful! Your plan has been activated.');
        
        // Fetch updated subscription
        const updatedSubscription = await getUserSubscription();
        setSubscription(updatedSubscription);
        setIsSubscriptionExpired(false);
      } else {
        toast.error('Payment failed. Please try again.');
      }
    } catch (error) {
      console.error('Error simulating payment:', error);
      toast.error('Payment simulation failed');
    } finally {
      setProcessingPayment(false);
      setPaymentOrder(null);
      setSelectedPlan(null);
    }
  };

  const handleSubscribe = async (planId: string) => {
    try {
      await subscribeToPlan(planId);
      const updatedSubscription = await getUserSubscription();
      setSubscription(updatedSubscription);
      toast.success('Plan subscription updated successfully');
      // Reset subscription expired state since they've now subscribed
      setIsSubscriptionExpired(false);
      // Reset the had previous paid plan flag since they've now subscribed
      setHadPreviousPaidPlan(false);
    } catch (error) {
      console.error('Error subscribing to plan:', error);
      toast.error('Failed to subscribe to the plan');
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
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold mb-2">Plans</h1>
        <p className="text-muted-foreground">Choose a plan that works for you</p>
      </div>

      {hadPreviousPaidPlan && (
        <Alert variant="destructive" className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Your paid subscription has expired. You need to upgrade to a paid plan to continue using all features.
          </AlertDescription>
        </Alert>
      )}

      {subscription && (
        <Card className="bg-primary/5 border-primary/20">
          <CardHeader>
            <CardTitle>Current Subscription</CardTitle>
            <CardDescription>Your active plan details</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col md:flex-row justify-between">
              <div>
                <h3 className="text-lg font-semibold">{subscription.plan.name}</h3>
                <p className="text-sm text-muted-foreground">{subscription.plan.description}</p>
                <div className="mt-2">
                  <Badge variant="outline" className="bg-primary/10 text-primary">
                    {
                      isSubscriptionExpired? (
                        <span className="text-sm text-red-500">Expired</span>
                      ) : <span className="text-sm text-green-500">Active</span>
                    }
                  </Badge>
                </div>
              </div>
              <div className="mt-4 md:mt-0 text-right">
                <div className="text-lg font-semibold">
                  ${subscription.plan.discountPrice || subscription.plan.price}
                  <span className="text-sm text-muted-foreground">/month</span>
                </div>
                <div className="text-sm text-muted-foreground mt-1">
                  {subscription.tokensUsed} / {subscription.plan.tokens} tokens used
                </div>
                <div className="text-sm text-muted-foreground mt-1">
                  {subscription.plan.name !== 'Free' && `Expires: ${new Date(subscription.endDate).toLocaleDateString()}`}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {plans.map((plan) => {
          const isCurrentPlan = subscription?.plan._id === plan._id;
          
          return (
            <Card key={plan._id} className={`flex flex-col ${plan.isPopular ? 'border-primary' : ''}`}>
              <CardHeader>
                {plan.isPopular && (
                  <Badge className="w-fit mb-2">Most Popular</Badge>
                )}
                <CardTitle>{plan.name}</CardTitle>
                <CardDescription>{plan.description}</CardDescription>
              </CardHeader>
              <CardContent className="flex-1">
                <div className="mb-4">
                  <span className="text-3xl font-bold">
                    ${plan.discountPrice || plan.price}
                  </span>
                  {plan.discountPrice && (
                    <span className="text-muted-foreground line-through ml-2">
                      ${plan.price}
                    </span>
                  )}
                  <span className="text-muted-foreground">/month</span>
                </div>
                
                <div className="space-y-2">
                  {plan.features.map((feature, index) => (
                    <div key={index} className="flex items-center">
                      <Check className="mr-2 h-4 w-4 text-primary" />
                      <span className="text-sm">{feature}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
              <CardFooter>
                {plan.name !== "Basic Plan" && 
                  <Button 
                    className="w-full" 
                    disabled={(isCurrentPlan && !isSubscriptionExpired) || processingPayment}
                    variant={isCurrentPlan && !isSubscriptionExpired ? "outline" : "default"}
                    onClick={() => initiatePlanPurchase(plan)}
                  >
                    {isCurrentPlan && !isSubscriptionExpired ? "Current Plan" : "Subscribe"}
                  </Button>
                }
              </CardFooter>
            </Card>
          );
        })}
      </div>

      {/* Payment Dialog */}
      <Dialog open={showPaymentDialog} onOpenChange={setShowPaymentDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Complete Your Purchase</DialogTitle>
            <DialogDescription>
              {selectedPlan && `You are subscribing to the ${selectedPlan.name} plan.`}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            {paymentOrder && (
              <div className="border rounded-md p-4 bg-muted/30">
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <span className="text-muted-foreground">Order ID:</span>
                  <span className="font-medium">{paymentOrder.orderId}</span>
                  
                  <span className="text-muted-foreground">Amount:</span>
                  <span className="font-medium">{paymentOrder.orderAmount} {paymentOrder.orderCurrency}</span>
                </div>
              </div>
            )}
            
            <p className="text-sm text-muted-foreground">
              In a production environment, you would be redirected to the Cashfree payment gateway.
              For demonstration purposes, you can simulate a payment outcome below.
            </p>
          </div>
          
          <DialogFooter className="flex flex-col sm:flex-row gap-2 sm:justify-between sm:gap-0">
            <Button 
              variant="outline"
              onClick={() => setShowPaymentDialog(false)}
              disabled={processingPayment}
            >
              Cancel
            </Button>
            <div className="flex gap-2">
              <Button 
                variant="destructive"
                onClick={() => handleSimulatePayment('failed')}
                disabled={processingPayment}
              >
                Simulate Failed Payment
              </Button>
              <Button 
                variant="default"
                onClick={() => handleSimulatePayment('success')}
                disabled={processingPayment}
              >
                {processingPayment ? (
                  <>
                    <span className="loading-spinner-sm mr-2"></span>
                    Processing...
                  </>
                ) : (
                  'Simulate Successful Payment'
                )}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default UserPlans;
