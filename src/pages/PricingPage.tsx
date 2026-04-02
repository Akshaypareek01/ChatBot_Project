/**
 * Phase 4.4: Public pricing page — plan comparison from API, FAQ, Contact Sales.
 */

import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getPlans } from '@/services/api';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Check, Loader2, MessageSquare, FileText, HelpCircle, Shield, Lock, Award } from 'lucide-react';

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

const FAQ = [
  { q: 'What counts as a chat?', a: 'Each conversation session with the chatbot counts as one chat. Messages within the same session do not add extra count.' },
  { q: 'Can I change plans later?', a: 'Yes. You can upgrade or downgrade from your dashboard. Upgrades apply immediately; downgrades apply at the next billing cycle.' },
  { q: 'Is there an annual discount?', a: 'Yes. Pay yearly and get 2 months free on paid plans.' },
  { q: 'Need a custom plan?', a: 'Contact us for Enterprise or custom limits, SLA, and dedicated support.' }
];

const PricingPage = () => {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getPlans()
      .then((res) => setPlans(res?.plans ?? []))
      .catch(() => setPlans([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen bg-muted/30">
      <header className="border-b bg-background">
        <div className="container flex h-14 items-center justify-between">
          <Link to="/" className="font-semibold">Chatbot</Link>
          <div className="flex gap-2">
            <Link to="/login"><Button variant="ghost">Log in</Button></Link>
            <Link to="/register"><Button>Get started</Button></Link>
          </div>
        </div>
      </header>

      <main className="container py-12 md:py-16 max-w-6xl mx-auto px-4">
        <div className="text-center mb-12">
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight">Simple, transparent pricing</h1>
          <p className="text-muted-foreground mt-2">Choose a plan that fits your usage. Save 2 months with annual billing.</p>
          {/* Trust badges & social proof */}
          <div className="flex flex-wrap justify-center gap-6 mt-8 text-sm text-muted-foreground">
            <span className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-primary" /> Secure payments
            </span>
            <span className="flex items-center gap-2">
              <Lock className="h-4 w-4 text-primary" /> Cancel anytime
            </span>
            <span className="flex items-center gap-2">
              <Award className="h-4 w-4 text-primary" /> Trusted by 500+ businesses
            </span>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <>
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-16">
              {plans.map((plan, i) => (
                <Card key={plan._id} className={plan.slug === 'growth' ? 'ring-2 ring-primary shadow-lg' : ''}>
                  <CardHeader className="pb-2">
                    {plan.slug === 'growth' && (
                      <span className="text-xs font-bold uppercase tracking-wider text-primary">Best value</span>
                    )}
                    <h2 className="text-xl font-semibold">{plan.name}</h2>
                    <div className="flex items-baseline gap-1">
                      <span className="text-3xl font-bold">
                        {plan.priceMonthly === 0 ? 'Free' : `₹${plan.priceMonthly}`}
                      </span>
                      {plan.priceMonthly > 0 && <span className="text-muted-foreground text-sm">/mo</span>}
                    </div>
                    {plan.priceYearly > 0 && (
                      <p className="text-xs text-muted-foreground">₹{plan.priceYearly}/yr (2 mo free)</p>
                    )}
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <p className="text-sm flex items-center gap-1">
                      <MessageSquare className="h-4 w-4" />
                      {plan.chatLimitPerMonth === 0 ? 'Unlimited' : plan.chatLimitPerMonth.toLocaleString()} chats/mo
                    </p>
                    <p className="text-sm flex items-center gap-1">
                      <FileText className="h-4 w-4" />
                      {plan.sourcesLimit} knowledge source{plan.sourcesLimit !== 1 ? 's' : ''}
                    </p>
                    {Array.isArray(plan.features) && plan.features.length > 0 && (
                      <ul className="space-y-1.5 text-sm text-muted-foreground">
                        {plan.features.slice(0, 4).map((f, j) => (
                          <li key={j} className="flex items-center gap-2">
                            <Check className="h-4 w-4 text-primary shrink-0" /> {f}
                          </li>
                        ))}
                      </ul>
                    )}
                    <Link to="/register" className="block pt-2">
                      <Button variant={plan.slug === 'growth' ? 'default' : 'outline'} className="w-full">
                        {plan.priceMonthly === 0 ? 'Get started' : 'Choose plan'}
                      </Button>
                    </Link>
                  </CardContent>
                </Card>
              ))}
            </div>

            <section className="mb-16">
              <h2 className="text-xl font-semibold mb-6 flex items-center gap-2">
                <HelpCircle className="h-5 w-5" /> FAQ
              </h2>
              <div className="space-y-4">
                {FAQ.map((item, i) => (
                  <Card key={i}>
                    <CardContent className="pt-4">
                      <p className="font-medium">{item.q}</p>
                      <p className="text-sm text-muted-foreground mt-1">{item.a}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </section>

            <Card className="bg-primary/5 border-primary/20">
              <CardContent className="py-8 text-center">
                <h3 className="text-lg font-semibold mb-2">Need a custom or enterprise plan?</h3>
                <p className="text-muted-foreground text-sm mb-4">Higher limits, SLA, dedicated support.</p>
                <Link to="/user/support"><Button>Contact sales</Button></Link>
              </CardContent>
            </Card>

            {/* Social proof */}
            <p className="text-center text-sm text-muted-foreground mt-12">
              Join thousands of teams using our chatbot to support customers 24/7.
            </p>
          </>
        )}
      </main>
    </div>
  );
};

export default PricingPage;
