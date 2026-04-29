import React, { useEffect, useState } from 'react';
import { Loader2, Check, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getPlans, changePlan } from '@/services/api';
import { toast } from 'sonner';

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

interface UserPlansGridProps {
    /** Currently active plan id (used to mark "Current"). */
    currentPlanId?: string;
    /** Called after a successful plan switch so the parent can refresh usage. */
    onPlanChanged?: () => void;
}

/**
 * Available subscription plans grid. Lets the user switch plan inline.
 *
 * Extracted from the legacy UserPlan page so the same grid can be reused
 * inside the unified Billing page without duplicating fetch/switch logic.
 */
const UserPlansGrid: React.FC<UserPlansGridProps> = ({ currentPlanId, onPlanChanged }) => {
    const [plans, setPlans] = useState<Plan[]>([]);
    const [loading, setLoading] = useState(true);
    const [changingPlanId, setChangingPlanId] = useState<string | null>(null);

    useEffect(() => {
        const fetchPlans = async () => {
            try {
                const res = await getPlans();
                setPlans(res?.plans ?? []);
            } catch (e) {
                console.error('Failed to load plans', e);
                toast.error('Failed to load plans');
            } finally {
                setLoading(false);
            }
        };
        fetchPlans();
    }, []);

    /**
     * Switch the current user to the selected plan. No payment flow yet —
     * server-side `changePlan` flips the subscription record directly.
     */
    const handleChangePlan = async (planId: string) => {
        if (changingPlanId) return;
        setChangingPlanId(planId);
        try {
            await changePlan(planId);
            toast.success('Plan updated');
            onPlanChanged?.();
        } catch (e: any) {
            console.error(e);
            toast.error(e?.message || 'Could not change plan');
        } finally {
            setChangingPlanId(null);
        }
    };

    if (loading) {
        return (
            <div className="p-12 flex items-center justify-center">
                <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
            </div>
        );
    }

    if (plans.length === 0) {
        return (
            <div className="p-12 text-center">
                <div className="w-10 h-10 mx-auto rounded-full bg-slate-900/[0.04] flex items-center justify-center mb-3">
                    <Zap className="w-4 h-4 text-slate-400" strokeWidth={1.75} />
                </div>
                <p className="text-[12.5px] font-semibold text-slate-700">No plans available</p>
                <p className="text-[11.5px] text-slate-500 mt-0.5">
                    Plans will appear here once configured by the admin.
                </p>
            </div>
        );
    }

    return (
        <div className="p-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {plans.map((plan) => {
                const isCurrent = plan._id === currentPlanId;
                const isChanging = changingPlanId === plan._id;
                return (
                    <div
                        key={plan._id}
                        className={cn(
                            'rounded-xl border bg-white p-5 flex flex-col transition-all',
                            isCurrent
                                ? 'border-indigo-500/40 shadow-[0_0_0_3px_rgba(99,102,241,0.08)]'
                                : 'border-slate-900/[0.06] hover:border-slate-900/[0.12]'
                        )}
                    >
                        <h3 className="text-[14px] font-semibold tracking-tight text-slate-900">
                            {plan.name}
                        </h3>
                        <div className="mt-2 flex items-baseline gap-1">
                            <span className="text-[24px] font-semibold tracking-[-0.02em] text-slate-950 tabular-nums">
                                {plan.priceMonthly === 0
                                    ? 'Free'
                                    : `₹${plan.priceMonthly.toLocaleString('en-IN')}`}
                            </span>
                            {plan.priceMonthly > 0 && (
                                <span className="text-[11.5px] text-slate-500">/mo</span>
                            )}
                        </div>
                        {plan.priceYearly > 0 && (
                            <p className="text-[11px] text-slate-400 mt-0.5">
                                ₹{plan.priceYearly.toLocaleString('en-IN')}/yr · 2 months free
                            </p>
                        )}
                        <ul className="mt-4 space-y-1.5 text-[12px] text-slate-600 flex-1">
                            <li className="flex items-center gap-1.5">
                                <Check
                                    className="w-3 h-3 text-emerald-600 flex-shrink-0"
                                    strokeWidth={2.5}
                                />
                                {plan.chatLimitPerMonth === 0
                                    ? 'Unlimited chats'
                                    : `${plan.chatLimitPerMonth.toLocaleString('en-IN')} chats / mo`}
                            </li>
                            <li className="flex items-center gap-1.5">
                                <Check
                                    className="w-3 h-3 text-emerald-600 flex-shrink-0"
                                    strokeWidth={2.5}
                                />
                                {plan.sourcesLimit} knowledge sources
                            </li>
                            {(plan.features ?? []).slice(0, 3).map((f) => (
                                <li key={f} className="flex items-center gap-1.5">
                                    <Check
                                        className="w-3 h-3 text-emerald-600 flex-shrink-0"
                                        strokeWidth={2.5}
                                    />
                                    {f}
                                </li>
                            ))}
                        </ul>
                        <button
                            type="button"
                            disabled={isCurrent || isChanging}
                            onClick={() => handleChangePlan(plan._id)}
                            aria-label={
                                isCurrent ? `${plan.name} is current plan` : `Switch to ${plan.name}`
                            }
                            className={cn(
                                'mt-4 inline-flex items-center justify-center gap-1.5 h-9 rounded-md text-[12.5px] font-semibold tracking-tight transition-all',
                                isCurrent
                                    ? 'bg-slate-100 text-slate-500 cursor-not-allowed'
                                    : 'bg-slate-950 text-white hover:bg-slate-800',
                                isChanging && 'opacity-70'
                            )}
                        >
                            {isChanging ? (
                                <>
                                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                    Switching…
                                </>
                            ) : isCurrent ? (
                                <>
                                    <Check className="w-3.5 h-3.5" strokeWidth={2.5} />
                                    Current plan
                                </>
                            ) : (
                                'Select plan'
                            )}
                        </button>
                    </div>
                );
            })}
        </div>
    );
};

export default UserPlansGrid;
