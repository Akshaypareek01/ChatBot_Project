
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Check, CreditCard } from 'lucide-react';
import { getPlans, getUserSubscription, subscribeToPlan } from '@/services/api';
import { toast } from 'sonner';

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
  tokensUsed: number;
}

const UserPlans = () => {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [plansData, subscriptionData] = await Promise.all([
          getPlans(),
          getUserSubscription()
        ]);
        
        setPlans(plansData);
        setSubscription(subscriptionData);
      } catch (error) {
        console.error('Error fetching plans data:', error);
        toast.error('Could not load plans');
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  const handleSubscribe = async (planId: string) => {
    try {
      await subscribeToPlan(planId);
      const updatedSubscription = await getUserSubscription();
      setSubscription(updatedSubscription);
      toast.success('Plan subscription updated successfully');
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
                    Active
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
                  Expires: {new Date(subscription.endDate).toLocaleDateString()}
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
                <Button 
                  className="w-full" 
                  disabled={isCurrentPlan}
                  variant={isCurrentPlan ? "outline" : "default"}
                  onClick={() => handleSubscribe(plan._id)}
                >
                  {isCurrentPlan ? "Current Plan" : "Subscribe"}
                </Button>
              </CardFooter>
            </Card>
          );
        })}
      </div>
    </div>
  );
};

export default UserPlans;
