/**
 * Phase 4: Plan & usage — current plan, usage bars, upgrade CTA, plan switcher (no payment flow).
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { getPlans, getMyPlanUsage, changePlan } from '@/services/api';
import { useNavigate } from 'react-router-dom';
import { Zap, MessageSquare, FileText, AlertTriangle, Loader2, Check } from 'lucide-react';
import { Progress } from '@/components/ui/progress';

interface Plan {
  _id: string;
  name: string;
  slug: string;
  priceMonthly: number;
  priceYearly: number;
  chatLimitPerMonth: number;
  sourcesLimit: number;
  features?: string[];
}

interface Usage {
  plan: { _id?: string; name: string; slug: string };
  chatCountThisMonth: number;
  chatLimit: number | null;
  sourcesCount: number;
  sourcesLimit: number;
  isOverChatLimit: boolean;
  isOverSourcesLimit: boolean;
}

const UserPlan = () => {
  const navigate = useNavigate();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [usage, setUsage] = useState<Usage | null>(null);
  const [loading, setLoading] = useState(true);
  const [changingPlanId, setChangingPlanId] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [plansRes, usageRes] = await Promise.all([
          getPlans(),
          getMyPlanUsage()
        ]);
        setPlans(plansRes?.plans ?? []);
        setUsage(usageRes ?? null);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const handleChangePlan = async (planId: string) => {
    if (changingPlanId) return;
    setChangingPlanId(planId);
    try {
      await changePlan(planId);
      const usageRes = await getMyPlanUsage();
      setUsage(usageRes ?? null);
    } catch (e) {
      console.error(e);
    } finally {
      setChangingPlanId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const currentPlanId = usage?.plan?._id;
  const chatLimit = usage?.chatLimit ?? 100;
  const chatPct = chatLimit > 0 ? Math.min(100, ((usage?.chatCountThisMonth ?? 0) / chatLimit) * 100) : 0;
  const sourcesPct = Math.min(100, ((usage?.sourcesCount ?? 0) / (usage?.sourcesLimit ?? 1)) * 100);

  return (
    <div className="space-y-8 pb-10">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Plan & usage</h1>
        <p className="text-muted-foreground mt-1">Current plan limits and upgrade options.</p>
      </div>

      {/* Usage summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-primary" />
            Current plan: {usage?.plan?.name ?? 'Free'}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <div className="flex justify-between text-sm mb-1">
              <span className="flex items-center gap-1">
                <MessageSquare className="h-4 w-4" />
                Chats this month
              </span>
              <span className={usage?.isOverChatLimit ? 'text-destructive font-medium' : ''}>
                {usage?.chatCountThisMonth} / {chatLimit === 0 ? '∞' : chatLimit}
              </span>
            </div>
            <Progress value={chatLimit > 0 ? chatPct : 0} className="h-2" />
          </div>
          <div>
            <div className="flex justify-between text-sm mb-1">
              <span className="flex items-center gap-1">
                <FileText className="h-4 w-4" />
                Knowledge sources
              </span>
              <span className={usage?.isOverSourcesLimit ? 'text-destructive font-medium' : ''}>
                {usage?.sourcesCount} / {usage?.sourcesLimit ?? 1}
              </span>
            </div>
            <Progress value={sourcesPct} className="h-2" />
          </div>
          {(usage?.isOverChatLimit || usage?.isOverSourcesLimit) && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-amber-50 dark:bg-amber-950/30 text-amber-800 dark:text-amber-200 text-sm">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              You&apos;ve reached a limit. Upgrade to continue using the chatbot or adding sources.
            </div>
          )}
          <Button variant="outline" onClick={() => navigate('/pricing')}>
            View all plans & pricing
          </Button>
        </CardContent>
      </Card>

      {/* Plan cards (switch without payment for now) */}
      <div>
        <h2 className="text-xl font-semibold mb-4">Available plans</h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {plans.map((plan) => {
            const isCurrent = plan._id === currentPlanId;
            return (
              <Card key={plan._id} className={isCurrent ? 'ring-2 ring-primary' : ''}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">{plan.name}</CardTitle>
                  <p className="text-2xl font-bold">
                    {plan.priceMonthly === 0 ? 'Free' : `₹${plan.priceMonthly}/mo`}
                  </p>
                  {plan.priceYearly > 0 && (
                    <p className="text-xs text-muted-foreground">
                      ₹{plan.priceYearly}/yr (2 months free)
                    </p>
                  )}
                </CardHeader>
                <CardContent className="space-y-2">
                  <p className="text-sm text-muted-foreground">
                    {plan.chatLimitPerMonth === 0 ? 'Unlimited' : plan.chatLimitPerMonth} chats/mo · {plan.sourcesLimit} sources
                  </p>
                  <Button
                    size="sm"
                    variant={isCurrent ? 'secondary' : 'default'}
                    disabled={isCurrent || changingPlanId === plan._id}
                    onClick={() => handleChangePlan(plan._id)}
                  >
                    {changingPlanId === plan._id ? <Loader2 className="h-4 w-4 animate-spin" /> : isCurrent ? <><Check className="h-4 w-4 mr-1" /> Current</> : 'Select'}
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default UserPlan;
