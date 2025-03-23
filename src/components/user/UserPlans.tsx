import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Check, CreditCard, AlertCircle } from 'lucide-react';
import { getPlans, getUserSubscription, subscribeToPlan, createPaymentOrder, simulatePayment } from '@/services/api';
import { toast } from 'sonner';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useNavigate } from 'react-router-dom';
import { load } from "@cashfreepayments/cashfree-js";
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
  cftoken: string;
}

const UserPlans = () => {
  let cashfree:any;
  var initializeSDK = async function () {          
      cashfree = await load({
          mode: "sandbox"
      });
  }
  initializeSDK();
  const navigate = useNavigate();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubscriptionExpired, setIsSubscriptionExpired] = useState(false);
  const [hadPreviousPaidPlan, setHadPreviousPaidPlan] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [paymentOrder, setPaymentOrder] = useState<PaymentOrder | null>(null);
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const [processingPayment, setProcessingPayment] = useState(false);
  const [completedTransaction, setCompletedTransaction] = useState<any>(null);

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
    
    const urlParams = new URLSearchParams(window.location.search);
    const orderId = urlParams.get('orderId');
    const txStatus = urlParams.get('txStatus');
    
    if (orderId && txStatus) {
      if (txStatus === 'SUCCESS') {
        handlePaymentSuccess(orderId);
      } else {
        toast.error('Payment was not successful. Please try again.');
      }
      
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, [navigate]);

  const handlePaymentSuccess = async (orderId: string) => {
    try {
      setProcessingPayment(true);
      
      const updatedSubscription = await getUserSubscription();
      setSubscription(updatedSubscription);
      setIsSubscriptionExpired(false);
      
      setCompletedTransaction({
        orderId,
        date: new Date().toLocaleDateString(),
        status: 'SUCCESS',
        plan: selectedPlan?.name || updatedSubscription.plan.name,
        amount: selectedPlan?.discountPrice || selectedPlan?.price || updatedSubscription.plan.price
      });
      
      setShowSuccessDialog(true);
    } catch (error) {
      console.error('Error processing successful payment:', error);
    } finally {
      setProcessingPayment(false);
      setPaymentOrder(null);
      setSelectedPlan(null);
    }
  };

  const initiatePlanPurchase = async (plan: Plan) => {
    try {
      setSelectedPlan(plan);
      setProcessingPayment(true);
      
      const data = await createPaymentOrder(plan._id);
      
      if (data.success) {
        setPaymentOrder(data.order);
        
        try {
         
          
          const payment_session_id  = data.order.payment_session_id;
       
         console.log('Payment session', payment_session_id);
    
          
          
          console.log("Initializing Cashfree with order data:", {
            paymentSessionId: data.order.cftoken,
            orderId: data.order.orderId,
            orderAmount: data.order.orderAmount,
          });
         
          // Step 3: Open Checkout Page
          await cashfree.checkout({
            paymentSessionId: data.order.payment_session_id,
            redirectTarget: "_self", // Can be "_blank", "_modal" or DOM element
          })
          .then((result: any) => {
            console.log("Payment completion result:", result);
            if (result.order && result.order.status === "PAID") {
              handlePaymentSuccess(data.order.orderId);
            }
          })
          .catch((error: any) => {
            console.error("Payment failed:", error);
            toast.error("Payment failed. Please try again.");
            setProcessingPayment(false);
          });
        } catch (error) {
          console.error('Error initializing Cashfree:', error);
          toast.error('Failed to initialize payment gateway');
          setProcessingPayment(false);
        }
      } else {
        toast.error('Failed to create payment order');
        setProcessingPayment(false);
      }
    } catch (error) {
      console.error('Error initiating payment:', error);
      toast.error(error.message || 'Failed to initiate payment');
      setProcessingPayment(false);
    }
  };



  const handleSubscribe = async (planId: string) => {
    try {
      await subscribeToPlan(planId);
      const updatedSubscription = await getUserSubscription();
      setSubscription(updatedSubscription);
      toast.success('Plan subscription updated successfully');
      setIsSubscriptionExpired(false);
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
                  INR {subscription.plan.discountPrice || subscription.plan.price}
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
                    INR {plan.discountPrice || plan.price}
                  </span>
                  {plan.discountPrice && (
                    <span className="text-muted-foreground line-through ml-2">
                      INR {plan.price}
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
                    {processingPayment ? (
                      <>Processing...</>
                    ) : isCurrentPlan && !isSubscriptionExpired ? (
                      "Current Plan"
                    ) : (
                      <>
                        <CreditCard className="w-4 h-4 mr-2" />
                        Subscribe
                      </>
                    )}
                  </Button>
                }
              </CardFooter>
            </Card>
          );
        })}
      </div>

      <div id="payment-form-container" className="my-8"></div>

      <Dialog open={showSuccessDialog} onOpenChange={setShowSuccessDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-center text-green-600 flex items-center justify-center">
              <svg className="w-6 h-6 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Payment Successful
            </DialogTitle>
          </DialogHeader>
          
          {completedTransaction && (
            <div className="space-y-4">
              <div className="bg-green-50 border border-green-100 rounded-lg p-6">
                <h3 className="font-medium text-lg mb-4">Order Details</h3>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <span className="text-muted-foreground">Plan:</span>
                  <span>{completedTransaction.plan}</span>
                  
                  <span className="text-muted-foreground">Order ID:</span>
                  <span className="font-mono">{completedTransaction.orderId}</span>
                  
                  <span className="text-muted-foreground">Date:</span>
                  <span>{completedTransaction.date}</span>
                  
                  <span className="text-muted-foreground">Amount:</span>
                  <span className="font-medium">INR {completedTransaction.amount}</span>
                  
                  <span className="text-muted-foreground">Status:</span>
                  <span className="text-green-600 font-medium">Successful</span>
                </div>
              </div>
              
              <div className="text-center text-sm text-muted-foreground">
                <p>Your subscription has been activated successfully.</p>
                <p>A confirmation email will be sent to your registered email address.</p>
              </div>
            </div>
          )}
          
          <DialogFooter>
            <Button onClick={() => setShowSuccessDialog(false)} className="w-full">
              Continue
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default UserPlans;
