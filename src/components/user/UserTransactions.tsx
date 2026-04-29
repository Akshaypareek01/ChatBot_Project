import React, { useState, useEffect } from 'react';
import {
    getUserTransactions,
    createPaymentOrder,
    getUsageHistory,
    downloadInvoice,
    validateCoupon,
    getMyPlanUsage,
} from '@/services/api';
import { Base_url } from '@/config/Base_url.jsx';
import { toast } from 'sonner';
import { load } from '@cashfreepayments/cashfree-js';
import {
    RefreshCw,
    Wallet,
    BarChart3,
    FileDown,
    Sparkles,
    AlertTriangle,
    MessageSquare,
    FileText,
    Tag,
    Check,
    Receipt,
    Zap,
    TrendingUp,
    Gift,
    Loader2,
    Layers,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import UserPlansGrid from './UserPlansGrid';

let cashfreeInstance: any = null;

interface Transaction {
    _id: string;
    orderId: string;
    amount: number;
    currency: string;
    status: 'initiated' | 'processing' | 'success' | 'failed' | 'refunded';
    tokens: number;
    createdAt: string;
    invoiceGenerated?: boolean;
}

interface UsageRecord {
    _id: string;
    type: 'chat' | 'upload' | 'scrape';
    description: string;
    tokensUsed: number;
    createdAt: string;
}

interface PlanUsage {
    plan: { _id?: string; name: string; slug: string };
    chatCountThisMonth: number;
    chatLimit: number | null;
    sourcesCount: number;
    sourcesLimit: number;
    isOverChatLimit: boolean;
    isOverSourcesLimit: boolean;
    tokenBalance?: number;
}

const CREDITS_PER_CHAT = 100;
const MIN_RECHARGE_INR = 99;

interface Pack {
    id: string;
    name: string;
    amount: number;
    tokens: number;
    chats: number;
    badge?: string;
    bonus?: string;
}

const PACKS: Pack[] = [
    { id: 'starter', name: 'Starter', amount: 99, tokens: 2_500, chats: 25 },
    { id: 'growth', name: 'Growth', amount: 299, tokens: 9_000, chats: 90, badge: 'Popular' },
    { id: 'scale', name: 'Scale', amount: 799, tokens: 28_000, chats: 280, badge: 'Best value', bonus: 'Save 28%' },
    { id: 'business', name: 'Business', amount: 1_999, tokens: 80_000, chats: 800, bonus: 'Save 37%' },
];

const formatINR = (n: number) => `₹${n.toLocaleString('en-IN')}`;
const formatNum = (n: number) => n.toLocaleString('en-IN');

/* ----- primitives ----- */

const PrimaryBtn: React.FC<
    React.ButtonHTMLAttributes<HTMLButtonElement> & { icon?: React.ElementType }
> = ({ icon: Icon, children, className, ...rest }) => (
    <button
        {...rest}
        className={cn(
            'inline-flex items-center justify-center gap-1.5 px-3.5 h-9 rounded-md bg-slate-950 text-white text-[12.5px] font-semibold tracking-tight hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors',
            className
        )}
    >
        {Icon && <Icon className="w-3.5 h-3.5" strokeWidth={2.25} />}
        {children}
    </button>
);

const GhostBtn: React.FC<
    React.ButtonHTMLAttributes<HTMLButtonElement> & { icon?: React.ElementType }
> = ({ icon: Icon, children, className, ...rest }) => (
    <button
        {...rest}
        className={cn(
            'inline-flex items-center justify-center gap-1.5 px-3 h-9 rounded-md border border-slate-900/[0.08] bg-white text-slate-700 text-[12.5px] font-semibold tracking-tight hover:bg-slate-50 hover:border-slate-900/[0.12] disabled:opacity-50 disabled:cursor-not-allowed transition-all',
            className
        )}
    >
        {Icon && <Icon className="w-3.5 h-3.5" strokeWidth={2.25} />}
        {children}
    </button>
);

const Toggle: React.FC<{ checked: boolean; onChange: (v: boolean) => void }> = ({
    checked,
    onChange,
}) => (
    <button
        type="button"
        onClick={() => onChange(!checked)}
        className={cn(
            'relative inline-flex h-5 w-9 flex-shrink-0 rounded-full transition-colors',
            checked ? 'bg-indigo-600' : 'bg-slate-300'
        )}
    >
        <span
            className={cn(
                'inline-block h-4 w-4 rounded-full bg-white shadow transition-transform mt-0.5',
                checked ? 'translate-x-[18px]' : 'translate-x-0.5'
            )}
        />
    </button>
);

const Segmented = <T extends string>({
    value,
    onChange,
    options,
}: {
    value: T;
    onChange: (v: T) => void;
    options: { id: T; label: string; icon?: React.ElementType }[];
}) => (
    <div className="inline-flex items-center gap-0.5 p-0.5 rounded-lg bg-slate-900/[0.04] border border-slate-900/[0.06]">
        {options.map((o) => {
            const Icon = o.icon;
            return (
                <button
                    key={o.id}
                    type="button"
                    onClick={() => onChange(o.id)}
                    className={cn(
                        'inline-flex items-center gap-1.5 px-3 h-7 rounded-md text-[12px] font-semibold tracking-tight transition-all',
                        value === o.id
                            ? 'bg-white text-slate-950 shadow-[0_1px_2px_rgba(15,23,42,0.08)]'
                            : 'text-slate-600 hover:text-slate-900'
                    )}
                >
                    {Icon && <Icon className="w-3 h-3" strokeWidth={2.25} />}
                    {o.label}
                </button>
            );
        })}
    </div>
);

const usageTypeStyle = (t: string) => {
    if (t === 'chat') return 'bg-indigo-500/10 text-indigo-700';
    if (t === 'upload') return 'bg-violet-500/10 text-violet-700';
    if (t === 'scrape') return 'bg-amber-500/10 text-amber-700';
    return 'bg-slate-500/10 text-slate-700';
};

const statusPill = (s: string) => {
    if (s === 'success') return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    if (s === 'failed') return 'bg-rose-50 text-rose-700 border-rose-200';
    if (s === 'refunded') return 'bg-amber-50 text-amber-700 border-amber-200';
    if (s === 'processing') return 'bg-indigo-50 text-indigo-700 border-indigo-200';
    return 'bg-slate-100 text-slate-600 border-slate-200';
};

/* ----- component ----- */

const UserTransactions = () => {
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [usageHistory, setUsageHistory] = useState<UsageRecord[]>([]);
    const [planUsage, setPlanUsage] = useState<PlanUsage | null>(null);
    const [loading, setLoading] = useState(true);
    const [loadingUsage, setLoadingUsage] = useState(false);
    const [amount, setAmount] = useState<number>(MIN_RECHARGE_INR);
    const [processing, setProcessing] = useState(false);
    const [isAutoPay, setIsAutoPay] = useState(false);
    const [couponCode, setCouponCode] = useState('');
    const [couponDiscount, setCouponDiscount] = useState<number | null>(null);
    const [couponError, setCouponError] = useState<string | null>(null);
    const [tab, setTab] = useState<'payments' | 'usage' | 'plans'>('payments');

    const getEstimatedTokens = (amt: number) => {
        if (!amt || amt < MIN_RECHARGE_INR) return 0;
        const exact = PACKS.find((p) => p.amount === amt);
        if (exact) return exact.tokens;
        const baseRatio = PACKS[0].tokens / PACKS[0].amount;
        let credits = Math.floor(amt * baseRatio);
        if (amt >= 1500) credits = Math.floor(credits * 1.1);
        else if (amt >= 500) credits = Math.floor(credits * 1.05);
        return credits;
    };

    const fetchAll = async () => {
        try {
            setLoading(true);
            const [tx, usage, plan] = await Promise.all([
                getUserTransactions(),
                getUsageHistory(),
                getMyPlanUsage().catch(() => null),
            ]);
            setTransactions(tx);
            setUsageHistory(usage);
            setPlanUsage(plan);
        } catch (e) {
            toast.error('Failed to load data');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        const initCashfree = async () => {
            try {
                const isProduction =
                    Base_url.includes('nvhotech.in') || !Base_url.includes('localhost');
                const mode = isProduction ? 'production' : 'sandbox';
                cashfreeInstance = await load({
                    mode: mode as 'sandbox' | 'production',
                });
            } catch (e) {
                console.error('Cashfree SDK failed to load', e);
            }
        };
        initCashfree();
        fetchAll();
    }, []);

    const groupUsageByDate = (data: UsageRecord[]) => {
        const grouped = data.reduce(
            (acc, u) => {
                const date = new Date(u.createdAt).toLocaleDateString('en-IN', {
                    day: '2-digit',
                    month: 'short',
                    year: 'numeric',
                });
                if (!acc[date]) {
                    acc[date] = {
                        date,
                        totalTokens: 0,
                        count: 0,
                        types: new Set<string>(),
                        firstCreatedAt: u.createdAt,
                    };
                }
                acc[date].totalTokens += u.tokensUsed;
                acc[date].count += 1;
                acc[date].types.add(u.type);
                return acc;
            },
            {} as Record<
                string,
                {
                    date: string;
                    totalTokens: number;
                    count: number;
                    types: Set<string>;
                    firstCreatedAt: string;
                }
            >
        );
        return Object.values(grouped).sort(
            (a, b) =>
                new Date(b.firstCreatedAt).getTime() - new Date(a.firstCreatedAt).getTime()
        );
    };

    const handleRecharge = async (rechargeAmount?: number) => {
        const finalAmount = rechargeAmount || amount;
        if (finalAmount < MIN_RECHARGE_INR) {
            toast.error(`Minimum recharge amount is ₹${MIN_RECHARGE_INR}`);
            return;
        }
        try {
            setProcessing(true);
            const data = await createPaymentOrder(
                finalAmount,
                couponCode.trim() || undefined
            );
            if (data?.order?.payment_session_id) {
                setCouponCode('');
                setCouponDiscount(null);
                setCouponError(null);
                if (cashfreeInstance) {
                    cashfreeInstance.checkout({
                        paymentSessionId: data.order.payment_session_id,
                        redirectTarget: '_self',
                    });
                } else {
                    toast.error('Payment SDK not loaded. Please refresh.');
                }
            } else {
                toast.error('Failed to initiate payment');
            }
        } catch (error: any) {
            toast.error(error.message || 'Payment initiation failed');
        } finally {
            setProcessing(false);
        }
    };

    const formatTime = (d?: string) =>
        d
            ? new Date(d).toLocaleString('en-IN', {
                  day: '2-digit',
                  month: 'short',
                  year: 'numeric',
              })
            : '—';

    const chatLimit = planUsage?.chatLimit ?? 0;
    const chatPct =
        chatLimit > 0
            ? Math.min(100, ((planUsage?.chatCountThisMonth ?? 0) / chatLimit) * 100)
            : 0;
    const sourcesPct = planUsage?.sourcesLimit
        ? Math.min(100, ((planUsage?.sourcesCount ?? 0) / planUsage.sourcesLimit) * 100)
        : 0;

    const effectiveAmount = Math.max(MIN_RECHARGE_INR, amount - (couponDiscount || 0));
    const estTokens = getEstimatedTokens(effectiveAmount);
    const estChats = Math.floor(estTokens / CREDITS_PER_CHAT);

    if (loading) {
        return (
            <div className="flex items-center justify-center h-[60vh]">
                <div className="w-8 h-8 border-2 border-slate-200 border-t-slate-900 rounded-full animate-spin" />
            </div>
        );
    }

    return (
        <div className="space-y-6 pb-12">
            {/* Header */}
            <div className="flex items-start justify-between gap-4 flex-wrap">
                <div>
                    <div className="inline-flex items-center gap-2 text-[10.5px] font-semibold uppercase tracking-[0.16em] text-indigo-600 mb-2">
                        <span className="w-3 h-px bg-indigo-600" />
                        Billing
                    </div>
                    <h1 className="text-[28px] sm:text-[34px] font-semibold tracking-[-0.02em] text-slate-950 leading-tight">
                        Wallet &amp; usage
                    </h1>
                    <p className="text-[13px] text-slate-500 mt-1.5">
                        Recharge credits, track consumption, and download invoices.
                    </p>
                </div>
                <GhostBtn icon={RefreshCw} onClick={fetchAll}>
                    Refresh
                </GhostBtn>
            </div>

            {/* Usage strip */}
            <div className="rounded-xl border border-slate-900/[0.06] bg-white overflow-hidden">
                <div className="px-5 py-4 border-b border-slate-900/[0.06] flex items-center justify-between gap-3 flex-wrap">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-md bg-indigo-600/10 text-indigo-600 flex items-center justify-center">
                            <Zap className="w-4 h-4" strokeWidth={2} />
                        </div>
                        <div>
                            <h3 className="text-[14px] font-semibold tracking-tight text-slate-950 leading-none">
                                This month
                            </h3>
                            <p className="text-[11.5px] text-slate-500 mt-1">
                                Plan ·{' '}
                                <span className="font-semibold text-slate-700">
                                    {planUsage?.plan?.name ?? 'Free'}
                                </span>
                            </p>
                        </div>
                    </div>
                    {(planUsage?.isOverChatLimit || planUsage?.isOverSourcesLimit) && (
                        <span className="inline-flex items-center gap-1.5 px-2.5 h-7 rounded-md bg-amber-50 border border-amber-200 text-amber-700 text-[11.5px] font-semibold">
                            <AlertTriangle className="w-3.5 h-3.5" strokeWidth={2.25} />
                            Limit reached — recharge to continue
                        </span>
                    )}
                </div>
                <div className="grid sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x divide-slate-900/[0.06]">
                    {/* Chats */}
                    <div className="p-5">
                        <div className="flex items-center justify-between mb-2.5">
                            <div className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                                <MessageSquare className="w-3 h-3" strokeWidth={2} />
                                Chats this month
                            </div>
                            <span
                                className={cn(
                                    'text-[12.5px] font-semibold tabular-nums tracking-tight',
                                    planUsage?.isOverChatLimit
                                        ? 'text-rose-600'
                                        : 'text-slate-900'
                                )}
                            >
                                {formatNum(planUsage?.chatCountThisMonth ?? 0)} /{' '}
                                {chatLimit === 0 ? '∞' : formatNum(chatLimit)}
                            </span>
                        </div>
                        <div className="h-1.5 rounded-full bg-slate-900/[0.06] overflow-hidden">
                            <div
                                className={cn(
                                    'h-full rounded-full transition-all',
                                    planUsage?.isOverChatLimit
                                        ? 'bg-rose-500'
                                        : chatPct > 80
                                          ? 'bg-amber-500'
                                          : 'bg-indigo-600'
                                )}
                                style={{ width: `${chatLimit > 0 ? chatPct : 0}%` }}
                            />
                        </div>
                    </div>
                    {/* Sources */}
                    <div className="p-5">
                        <div className="flex items-center justify-between mb-2.5">
                            <div className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                                <FileText className="w-3 h-3" strokeWidth={2} />
                                Knowledge sources
                            </div>
                            <span
                                className={cn(
                                    'text-[12.5px] font-semibold tabular-nums tracking-tight',
                                    planUsage?.isOverSourcesLimit
                                        ? 'text-rose-600'
                                        : 'text-slate-900'
                                )}
                            >
                                {formatNum(planUsage?.sourcesCount ?? 0)} /{' '}
                                {formatNum(planUsage?.sourcesLimit ?? 0)}
                            </span>
                        </div>
                        <div className="h-1.5 rounded-full bg-slate-900/[0.06] overflow-hidden">
                            <div
                                className={cn(
                                    'h-full rounded-full transition-all',
                                    planUsage?.isOverSourcesLimit
                                        ? 'bg-rose-500'
                                        : sourcesPct > 80
                                          ? 'bg-amber-500'
                                          : 'bg-violet-600'
                                )}
                                style={{ width: `${sourcesPct}%` }}
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* Credit packs */}
            <div>
                <div className="flex items-end justify-between mb-3">
                    <div>
                        <h2 className="text-[18px] font-semibold tracking-[-0.01em] text-slate-950">
                            Recharge credits
                        </h2>
                        <p className="text-[12px] text-slate-500 mt-0.5">
                            One-time prepaid packs · 1 chat = {CREDITS_PER_CHAT} credits
                        </p>
                    </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                    {PACKS.map((pack) => {
                        const selected = amount === pack.amount;
                        return (
                            <div
                                key={pack.id}
                                onClick={() => setAmount(pack.amount)}
                                className={cn(
                                    'relative rounded-xl border bg-white p-5 cursor-pointer transition-all overflow-hidden',
                                    selected
                                        ? 'border-indigo-500/40 shadow-[0_0_0_3px_rgba(99,102,241,0.08)]'
                                        : 'border-slate-900/[0.06] hover:border-slate-900/[0.12]'
                                )}
                            >
                                {pack.badge && (
                                    <div className="absolute top-0 right-0 px-2 py-0.5 bg-indigo-600 text-white text-[9.5px] font-semibold uppercase tracking-[0.14em] rounded-bl-md">
                                        {pack.badge}
                                    </div>
                                )}
                                <div className="flex items-center gap-2 mb-2.5">
                                    <h3 className="text-[13px] font-semibold tracking-tight text-slate-900">
                                        {pack.name}
                                    </h3>
                                    {pack.bonus && (
                                        <span className="inline-flex items-center px-1.5 h-4 rounded-sm bg-emerald-500/10 text-emerald-700 text-[9.5px] font-semibold uppercase tracking-[0.12em]">
                                            {pack.bonus}
                                        </span>
                                    )}
                                </div>
                                <div className="flex items-baseline gap-1 mb-3">
                                    <span className="text-[26px] font-semibold tracking-[-0.02em] text-slate-950 tabular-nums">
                                        {formatINR(pack.amount)}
                                    </span>
                                </div>
                                <div className="space-y-1.5 mb-4">
                                    <div className="flex items-center justify-between text-[12px]">
                                        <span className="text-slate-500">AI credits</span>
                                        <span className="font-semibold tabular-nums text-slate-900">
                                            {formatNum(pack.tokens)}
                                        </span>
                                    </div>
                                    <div className="flex items-center justify-between text-[12px]">
                                        <span className="text-slate-500">Chat capacity</span>
                                        <span className="font-semibold tabular-nums text-indigo-600">
                                            ~{pack.chats} chats
                                        </span>
                                    </div>
                                </div>
                                <button
                                    type="button"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleRecharge(pack.amount);
                                    }}
                                    disabled={processing}
                                    className={cn(
                                        'w-full inline-flex items-center justify-center gap-1.5 h-9 rounded-md text-[12.5px] font-semibold tracking-tight transition-all',
                                        selected
                                            ? 'bg-slate-950 text-white hover:bg-slate-800'
                                            : 'border border-slate-900/[0.08] bg-white text-slate-700 hover:bg-slate-50 hover:border-slate-900/[0.12]'
                                    )}
                                >
                                    {selected ? 'Get started' : 'Select'}
                                </button>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Custom recharge + Auto-pay */}
            <div className="grid lg:grid-cols-3 gap-3">
                {/* Custom recharge */}
                <div className="lg:col-span-2 rounded-xl border border-slate-900/[0.06] bg-white overflow-hidden">
                    <div className="px-5 py-4 border-b border-slate-900/[0.06] flex items-start gap-3">
                        <div className="w-7 h-7 rounded-md bg-slate-900/[0.04] text-slate-700 flex items-center justify-center flex-shrink-0">
                            <Wallet className="w-3.5 h-3.5" strokeWidth={2} />
                        </div>
                        <div className="min-w-0">
                            <h3 className="text-[14px] font-semibold tracking-tight text-slate-950 leading-none">
                                Custom recharge
                            </h3>
                            <p className="text-[12px] text-slate-500 mt-1">
                                Any amount above {formatINR(MIN_RECHARGE_INR)}. Loyalty bonus on ₹500+ and ₹1,500+.
                            </p>
                        </div>
                    </div>
                    <div className="p-5 space-y-5">
                        <div className="flex flex-col sm:flex-row gap-2">
                            <div className="relative flex-1 max-w-full sm:max-w-[260px]">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 font-semibold">
                                    ₹
                                </span>
                                <input
                                    type="number"
                                    min={MIN_RECHARGE_INR}
                                    value={amount}
                                    onChange={(e) => setAmount(Number(e.target.value))}
                                    className="w-full h-11 pl-7 pr-3 rounded-md border border-slate-900/[0.08] bg-white text-[18px] font-semibold tabular-nums text-slate-950 outline-none focus:border-indigo-500/60 focus:ring-2 focus:ring-indigo-500/10 transition-all"
                                />
                            </div>
                            <PrimaryBtn
                                onClick={() => handleRecharge()}
                                disabled={processing}
                                icon={processing ? undefined : Sparkles}
                                className="h-11 px-5 text-[13px]"
                            >
                                {processing ? (
                                    <>
                                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                        Processing…
                                    </>
                                ) : (
                                    'Recharge credits'
                                )}
                            </PrimaryBtn>
                        </div>

                        {/* Promo */}
                        <div>
                            <label className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500 mb-1.5">
                                <Tag className="w-3 h-3" strokeWidth={2} />
                                Promo code
                            </label>
                            <div className="flex gap-2">
                                <input
                                    placeholder="Enter code"
                                    value={couponCode}
                                    onChange={(e) => {
                                        setCouponCode(e.target.value);
                                        setCouponError(null);
                                        setCouponDiscount(null);
                                    }}
                                    className="flex-1 h-9 px-3 rounded-md border border-slate-900/[0.08] bg-white text-[13px] uppercase tracking-tight text-slate-900 placeholder:text-slate-400 outline-none focus:border-indigo-500/60 focus:ring-2 focus:ring-indigo-500/10 transition-all"
                                />
                                <GhostBtn
                                    type="button"
                                    onClick={async () => {
                                        if (!couponCode.trim()) return;
                                        try {
                                            const res = await validateCoupon(
                                                couponCode.trim(),
                                                amount
                                            );
                                            setCouponDiscount(res.discountAmount);
                                            setCouponError(null);
                                            toast.success(res.message);
                                        } catch (e: any) {
                                            setCouponDiscount(null);
                                            setCouponError(e?.message || 'Invalid code');
                                        }
                                    }}
                                >
                                    Apply
                                </GhostBtn>
                            </div>
                            {couponError && (
                                <p className="text-[11px] text-rose-600 mt-1.5">
                                    {couponError}
                                </p>
                            )}
                            {couponDiscount != null && couponDiscount > 0 && (
                                <p className="inline-flex items-center gap-1 text-[11px] text-emerald-700 font-semibold mt-1.5">
                                    <Check className="w-3 h-3" strokeWidth={2.5} />
                                    You save {formatINR(couponDiscount)}
                                </p>
                            )}
                        </div>

                        {/* Summary */}
                        <div className="grid grid-cols-3 gap-3 p-4 rounded-lg bg-[#FAFAFA] border border-slate-900/[0.06]">
                            <div>
                                <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500 mb-1">
                                    You pay
                                </div>
                                <div className="text-[16px] font-semibold tabular-nums text-slate-950">
                                    {formatINR(effectiveAmount)}
                                </div>
                            </div>
                            <div>
                                <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500 mb-1">
                                    You get
                                </div>
                                <div className="text-[16px] font-semibold tabular-nums text-indigo-600">
                                    {formatNum(estTokens)}
                                </div>
                                <div className="text-[10.5px] text-slate-400 mt-0.5">credits</div>
                            </div>
                            <div>
                                <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500 mb-1">
                                    Est. usage
                                </div>
                                <div className="text-[16px] font-semibold tabular-nums text-emerald-600">
                                    ~{estChats}
                                </div>
                                <div className="text-[10.5px] text-slate-400 mt-0.5">chats</div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Auto-pay */}
                <div className="rounded-xl border border-indigo-200/60 bg-gradient-to-br from-indigo-50 to-white overflow-hidden">
                    <div className="p-5 space-y-4">
                        <div className="flex items-start justify-between">
                            <div className="flex items-center gap-2.5">
                                <div className="w-7 h-7 rounded-md bg-indigo-600/10 text-indigo-600 flex items-center justify-center">
                                    <TrendingUp className="w-3.5 h-3.5" strokeWidth={2} />
                                </div>
                                <h3 className="text-[14px] font-semibold tracking-tight text-slate-950 leading-none">
                                    Auto-pay
                                </h3>
                            </div>
                            <Toggle checked={isAutoPay} onChange={setIsAutoPay} />
                        </div>
                        <p className="text-[12.5px] text-slate-600 leading-relaxed">
                            Automatically recharge{' '}
                            <span className="font-semibold text-slate-900">₹199</span> when
                            your balance drops below{' '}
                            <span className="font-semibold text-slate-900">10%</span>. Bot stays online.
                        </p>
                        <div className="flex items-center gap-2 px-3 py-2 rounded-md bg-white border border-indigo-200/40">
                            <Gift className="w-3.5 h-3.5 text-indigo-600" strokeWidth={2.25} />
                            <span className="text-[11.5px] text-slate-700">
                                <span className="font-semibold text-indigo-700">+10% loyalty bonus</span>{' '}
                                on every auto-recharge
                            </span>
                        </div>
                        <p className="text-[10.5px] text-slate-400 italic text-center">
                            Powered by Cashfree Subscriptions · Cancel anytime
                        </p>
                    </div>
                </div>
            </div>

            {/* History tabs */}
            <div className="rounded-xl border border-slate-900/[0.06] bg-white overflow-hidden">
                <div className="px-5 py-4 border-b border-slate-900/[0.06] flex items-center justify-between gap-3 flex-wrap">
                    <Segmented
                        value={tab}
                        onChange={setTab}
                        options={[
                            { id: 'payments', label: 'Payments', icon: Receipt },
                            { id: 'usage', label: 'Usage', icon: BarChart3 },
                            { id: 'plans', label: 'Plans', icon: Layers },
                        ]}
                    />
                    {tab === 'payments' && (
                        <span className="text-[10.5px] font-semibold uppercase tracking-[0.14em] text-slate-400">
                            {transactions.length} transaction{transactions.length === 1 ? '' : 's'}
                        </span>
                    )}
                </div>

                {/* Payments */}
                {tab === 'payments' && (
                    <div>
                        {transactions.length === 0 ? (
                            <div className="p-12 text-center">
                                <div className="w-10 h-10 mx-auto rounded-full bg-slate-900/[0.04] flex items-center justify-center mb-3">
                                    <Wallet className="w-4 h-4 text-slate-400" strokeWidth={1.75} />
                                </div>
                                <p className="text-[12.5px] font-semibold text-slate-700">
                                    No transactions yet
                                </p>
                                <p className="text-[11.5px] text-slate-500 mt-0.5">
                                    Pick a credit pack above to get started.
                                </p>
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-left">
                                    <thead>
                                        <tr className="bg-[#FAFAFA] border-b border-slate-900/[0.06]">
                                            <th className="px-5 py-2.5 text-[10.5px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                                                Date
                                            </th>
                                            <th className="px-5 py-2.5 text-[10.5px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                                                Order
                                            </th>
                                            <th className="px-5 py-2.5 text-[10.5px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                                                Amount
                                            </th>
                                            <th className="px-5 py-2.5 text-[10.5px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                                                Credits
                                            </th>
                                            <th className="px-5 py-2.5 text-[10.5px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                                                Status
                                            </th>
                                            <th className="px-5 py-2.5 text-[10.5px] font-semibold uppercase tracking-[0.14em] text-slate-500 text-right">
                                                Invoice
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {transactions.map((t) => (
                                            <tr
                                                key={t._id}
                                                className="border-b border-slate-900/[0.04] last:border-0 hover:bg-[#FAFAFA] transition-colors"
                                            >
                                                <td className="px-5 py-3 text-[12.5px] text-slate-700 tabular-nums whitespace-nowrap">
                                                    {formatTime(t.createdAt)}
                                                </td>
                                                <td className="px-5 py-3">
                                                    <div className="flex flex-col">
                                                        <span className="text-[12.5px] font-medium text-slate-900">
                                                            Wallet recharge
                                                        </span>
                                                        <span className="text-[10.5px] font-mono text-slate-400 tracking-tight">
                                                            {t.orderId}
                                                        </span>
                                                    </div>
                                                </td>
                                                <td className="px-5 py-3 text-[13px] font-semibold tabular-nums text-slate-900">
                                                    {formatINR(t.amount)}
                                                </td>
                                                <td className="px-5 py-3 text-[12.5px] tabular-nums text-slate-700">
                                                    {formatNum(
                                                        t.tokens || getEstimatedTokens(t.amount)
                                                    )}
                                                </td>
                                                <td className="px-5 py-3">
                                                    <span
                                                        className={cn(
                                                            'inline-flex items-center px-2 h-5 rounded-md border text-[10.5px] font-semibold capitalize',
                                                            statusPill(t.status)
                                                        )}
                                                    >
                                                        {t.status}
                                                    </span>
                                                </td>
                                                <td className="px-5 py-3 text-right">
                                                    {t.status === 'success' ? (
                                                        <button
                                                            type="button"
                                                            onClick={() =>
                                                                downloadInvoice(t.orderId).catch(
                                                                    () =>
                                                                        toast.error(
                                                                            'Invoice not available'
                                                                        )
                                                                )
                                                            }
                                                            className="inline-flex items-center gap-1 text-[12px] font-semibold text-indigo-600 hover:text-indigo-700"
                                                        >
                                                            <FileDown
                                                                className="w-3.5 h-3.5"
                                                                strokeWidth={2}
                                                            />
                                                            PDF
                                                        </button>
                                                    ) : (
                                                        <span className="text-[11px] text-slate-400">
                                                            —
                                                        </span>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                )}

                {/* Usage */}
                {tab === 'usage' && (
                    <div>
                        {usageHistory.length === 0 ? (
                            <div className="p-12 text-center">
                                <div className="w-10 h-10 mx-auto rounded-full bg-slate-900/[0.04] flex items-center justify-center mb-3">
                                    <BarChart3
                                        className="w-4 h-4 text-slate-400"
                                        strokeWidth={1.75}
                                    />
                                </div>
                                <p className="text-[12.5px] font-semibold text-slate-700">
                                    No usage records yet
                                </p>
                                <p className="text-[11.5px] text-slate-500 mt-0.5">
                                    Activity will appear here as your bot answers chats.
                                </p>
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-left">
                                    <thead>
                                        <tr className="bg-[#FAFAFA] border-b border-slate-900/[0.06]">
                                            <th className="px-5 py-2.5 text-[10.5px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                                                Date
                                            </th>
                                            <th className="px-5 py-2.5 text-[10.5px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                                                Activities
                                            </th>
                                            <th className="px-5 py-2.5 text-[10.5px] font-semibold uppercase tracking-[0.14em] text-slate-500 text-right">
                                                Credits used
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {groupUsageByDate(usageHistory).map((d, i) => (
                                            <tr
                                                key={i}
                                                className="border-b border-slate-900/[0.04] last:border-0 hover:bg-[#FAFAFA] transition-colors"
                                            >
                                                <td className="px-5 py-3 text-[12.5px] text-slate-700 tabular-nums whitespace-nowrap">
                                                    {d.date}
                                                </td>
                                                <td className="px-5 py-3">
                                                    <div className="flex flex-wrap items-center gap-1.5">
                                                        {Array.from(d.types).map((type) => (
                                                            <span
                                                                key={type}
                                                                className={cn(
                                                                    'inline-flex items-center px-1.5 h-5 rounded-sm text-[10px] font-semibold uppercase tracking-[0.12em]',
                                                                    usageTypeStyle(type)
                                                                )}
                                                            >
                                                                {type}
                                                            </span>
                                                        ))}
                                                        <span className="text-[11px] text-slate-400 ml-1">
                                                            {d.count}{' '}
                                                            {d.count === 1
                                                                ? 'activity'
                                                                : 'activities'}
                                                        </span>
                                                    </div>
                                                </td>
                                                <td className="px-5 py-3 text-right text-[13px] font-semibold tabular-nums text-rose-600">
                                                    −{formatNum(d.totalTokens)}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                )}

                {/* Plans */}
                {tab === 'plans' && (
                    <UserPlansGrid
                        currentPlanId={planUsage?.plan?._id}
                        onPlanChanged={fetchAll}
                    />
                )}
            </div>
        </div>
    );
};

export default UserTransactions;
