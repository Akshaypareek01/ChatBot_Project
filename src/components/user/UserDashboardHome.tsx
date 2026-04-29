import React, { useState, useEffect } from 'react';
import {
    MessageSquare,
    BarChart3,
    AlertTriangle,
    Wallet,
    Zap,
    ArrowRight,
    Shield,
    Code2,
    BookOpen,
    Sparkles,
} from 'lucide-react';
import { getUserProfile, getUserChatbotData, getUsageHistory, getMyPlanUsage } from '@/services/api';
import ScriptGenerator from '../chatbot/ScriptGenerator';
import { useBot } from '@/context/BotContext';
import { useNavigate } from 'react-router-dom';
import IntegrationGuide from './IntegrationGuide';
import { cn } from '@/lib/utils';

interface UsageRecord {
    _id: string;
    type: 'chat' | 'upload' | 'scrape';
    description: string;
    tokensUsed: number;
    createdAt: string;
}

/** Linear-style primary button (solid slate-950). */
const PrimaryButton: React.FC<
    React.ButtonHTMLAttributes<HTMLButtonElement> & { icon?: React.ReactNode }
> = ({ children, icon, className, ...props }) => (
    <button
        {...props}
        className={cn(
            'inline-flex items-center gap-2 h-9 px-3.5 rounded-md bg-slate-950 text-white text-[13px] font-semibold tracking-tight hover:bg-slate-800 transition-colors disabled:opacity-60 disabled:cursor-not-allowed',
            className
        )}
    >
        {icon}
        {children}
    </button>
);

/** Linear-style secondary button (hairline border, white bg). */
const SecondaryButton: React.FC<React.ButtonHTMLAttributes<HTMLButtonElement>> = ({
    children,
    className,
    ...props
}) => (
    <button
        {...props}
        className={cn(
            'inline-flex items-center gap-2 h-9 px-3.5 rounded-md bg-white border border-slate-900/[0.08] text-[13px] font-semibold tracking-tight text-slate-700 hover:text-slate-950 hover:border-slate-900/20 transition-colors',
            className
        )}
    >
        {children}
    </button>
);

/** Stat card — hairline border, white bg, optional accent icon tile. */
const StatCard: React.FC<{
    label: string;
    value: React.ReactNode;
    hint?: React.ReactNode;
    icon: React.ElementType;
    accent?: boolean;
    warn?: boolean;
    onClick?: () => void;
}> = ({ label, value, hint, icon: Icon, accent = false, warn = false, onClick }) => {
    const clickable = !!onClick;
    return (
        <div
            onClick={onClick}
            className={cn(
                'group relative px-4 py-3.5 rounded-lg bg-white border transition-all',
                warn
                    ? 'border-amber-300/60 bg-amber-50/40'
                    : 'border-slate-900/[0.06] hover:border-slate-900/[0.12]',
                clickable && 'cursor-pointer hover:shadow-[0_8px_24px_-14px_rgba(15,23,42,0.15)]'
            )}
        >
            <div className="flex items-center justify-between mb-2">
                <p className="text-[10.5px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                    {label}
                </p>
                <div
                    className={cn(
                        'inline-flex items-center justify-center w-6 h-6 rounded-md transition-colors',
                        accent
                            ? 'bg-indigo-600/10 text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white'
                            : warn
                            ? 'bg-amber-500/10 text-amber-600'
                            : 'bg-slate-900/[0.04] text-slate-700'
                    )}
                >
                    <Icon className="w-[13px] h-[13px]" strokeWidth={1.75} />
                </div>
            </div>
            <div className="text-[20px] leading-[1.15] font-semibold tracking-[-0.01em] text-slate-950">
                {value}
            </div>
            {hint && <div className="mt-1 text-[11.5px] text-slate-500 leading-snug">{hint}</div>}
        </div>
    );
};

const usageTypeLabel = (type: string) => {
    switch (type) {
        case 'chat':
            return { label: 'Chat', dot: 'bg-indigo-500' };
        case 'upload':
            return { label: 'Upload', dot: 'bg-violet-500' };
        case 'scrape':
            return { label: 'Scrape', dot: 'bg-amber-500' };
        default:
            return { label: type, dot: 'bg-slate-400' };
    }
};

const UserDashboardHome = () => {
    const { currentBot } = useBot() || {};
    const [userData, setUserData] = useState<any>(null);
    const [chatbotData, setChatbotData] = useState<any>(null);
    const [usageHistory, setUsageHistory] = useState<UsageRecord[]>([]);
    const [planUsage, setPlanUsage] = useState<{
        plan?: { name: string; slug: string };
        chatCountThisMonth: number;
        chatLimit: number | null;
        sourcesCount: number;
        sourcesLimit: number;
        isOverChatLimit?: boolean;
        isOverSourcesLimit?: boolean;
    } | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [userProfileData, chatbotDataResponse, usageData, planUsageData] =
                    await Promise.all([
                        getUserProfile(),
                        getUserChatbotData(),
                        getUsageHistory(),
                        getMyPlanUsage().catch(() => null),
                    ]);

                setUserData(userProfileData);
                setChatbotData(chatbotDataResponse);
                setUsageHistory(usageData);
                setPlanUsage(planUsageData);
            } catch (error) {
                console.error('Error fetching dashboard data:', error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchData();
    }, []);

    const groupUsageByDate = (usageData: UsageRecord[]) => {
        const grouped = usageData.reduce((acc, usage) => {
            const date = new Date(usage.createdAt).toLocaleDateString('en-IN', {
                day: '2-digit',
                month: 'short',
            });

            if (!acc[date]) {
                acc[date] = {
                    date,
                    totalTokens: 0,
                    count: 0,
                    types: new Set<string>(),
                    firstCreatedAt: usage.createdAt,
                };
            }

            acc[date].totalTokens += usage.tokensUsed;
            acc[date].count += 1;
            acc[date].types.add(usage.type);

            return acc;
        }, {} as Record<string, { date: string; totalTokens: number; count: number; types: Set<string>; firstCreatedAt: string }>);

        return Object.values(grouped)
            .sort(
                (a, b) => new Date(b.firstCreatedAt).getTime() - new Date(a.firstCreatedAt).getTime()
            )
            .slice(0, 5);
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-[60vh]">
                <div className="w-8 h-8 border-2 border-slate-200 border-t-slate-900 rounded-full animate-spin" />
            </div>
        );
    }

    const credits = userData?.tokenBalance ?? 0;
    const chatsRemaining = Math.floor(credits / 100);
    const lowCredits = credits < 500;

    const installVerified =
        userData?.lastWidgetPingAt &&
        Date.now() - new Date(userData.lastWidgetPingAt).getTime() < 24 * 60 * 60 * 1000;

    const dailyUsage = groupUsageByDate(usageHistory);

    return (
        <div className="space-y-8">
            {/* Security warning banner */}
            {(!userData?.allowedDomains || userData.allowedDomains.length === 0) && (
                <div className="rounded-xl border border-amber-300/60 bg-amber-50/60 p-4 flex items-start sm:items-center justify-between gap-4 flex-col sm:flex-row">
                    <div className="flex items-start gap-3">
                        <div className="mt-0.5 w-8 h-8 rounded-lg bg-amber-500/15 text-amber-600 flex items-center justify-center flex-shrink-0">
                            <Shield className="w-4 h-4" strokeWidth={2} />
                        </div>
                        <div>
                            <p className="text-[13px] font-semibold text-amber-900 tracking-tight">
                                Your chatbot is currently public
                            </p>
                            <p className="text-[12.5px] text-amber-800/80 mt-0.5">
                                Add domain whitelisting to prevent credit abuse from unauthorised sites.
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={() => navigate('/user/security')}
                        className="self-stretch sm:self-auto inline-flex items-center justify-center gap-1.5 h-8 px-3 rounded-md bg-white border border-amber-300 text-[12.5px] font-semibold text-amber-900 hover:bg-amber-100 transition-colors"
                    >
                        Fix now <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                </div>
            )}

            {/* Page header */}
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
                <div>
                    <div className="inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-indigo-600 mb-2">
                        <span className="w-6 h-px bg-indigo-600" /> Overview
                    </div>
                    <h1 className="text-3xl sm:text-4xl font-semibold tracking-[-0.02em] text-slate-950 leading-[1.05]">
                        Welcome back, {userData?.name?.split(' ')[0] || 'there'}.
                    </h1>
                    <p className="mt-2 text-[14px] text-slate-600">
                        Here's how your chatbot is performing.
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <SecondaryButton onClick={() => navigate('/user/profile')}>
                        Profile
                    </SecondaryButton>
                    <PrimaryButton
                        onClick={() => navigate('/user/billing')}
                        icon={<Wallet className="w-4 h-4" strokeWidth={2} />}
                    >
                        Add credits
                    </PrimaryButton>
                </div>
            </div>

            {/* Stat cards */}
            <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
                <StatCard
                    label="AI credits"
                    value={
                        <span className={lowCredits ? 'text-rose-600' : undefined}>
                            {credits.toLocaleString()}
                        </span>
                    }
                    hint={
                        <span className="inline-flex items-center gap-1">
                            {lowCredits && <AlertTriangle className="w-3 h-3 text-rose-500" />}
                            Approx. <span className="font-semibold text-slate-700">{chatsRemaining} chats</span> remaining
                        </span>
                    }
                    icon={Wallet}
                    accent
                    warn={lowCredits}
                    onClick={() => navigate('/user/billing')}
                />
                <StatCard
                    label="Knowledge base"
                    value={(chatbotData?.qas?.length || 0).toLocaleString()}
                    hint="Manual Q&A entries"
                    icon={BookOpen}
                    onClick={() => navigate('/user/qa')}
                />
                <StatCard
                    label="Conversations"
                    value={(userData?.totalChats || 0).toLocaleString()}
                    hint="Total chat sessions"
                    icon={MessageSquare}
                    onClick={() => navigate('/user/conversations')}
                />
                <StatCard
                    label="Current plan"
                    value={planUsage?.plan?.name ?? 'Free'}
                    hint={
                        <>
                            Chats: {planUsage?.chatCountThisMonth ?? 0} /{' '}
                            {planUsage?.chatLimit == null ? '∞' : planUsage?.chatLimit}
                            {(planUsage?.isOverChatLimit || planUsage?.isOverSourcesLimit) && (
                                <span className="ml-2 inline-flex items-center gap-1 text-amber-700 font-medium">
                                    <AlertTriangle className="w-3 h-3" /> Limit reached
                                </span>
                            )}
                        </>
                    }
                    icon={Zap}
                    warn={planUsage?.isOverChatLimit || planUsage?.isOverSourcesLimit}
                    onClick={() => navigate('/user/billing')}
                />
            </div>

            {/* Main grid */}
            <div className="grid gap-6 lg:grid-cols-3">
                {/* Embed your chatbot */}
                <div className="lg:col-span-2 rounded-xl border border-slate-900/[0.06] bg-white overflow-hidden">
                    <div className="px-6 py-5 border-b border-slate-900/[0.06] flex items-start justify-between gap-4">
                        <div className="flex items-start gap-3">
                            <div className="w-9 h-9 rounded-lg bg-slate-900/[0.04] text-slate-900 flex items-center justify-center flex-shrink-0">
                                <Code2 className="w-[17px] h-[17px]" strokeWidth={1.75} />
                            </div>
                            <div>
                                <h2 className="text-[15px] font-semibold tracking-tight text-slate-950">
                                    Embed your chatbot
                                </h2>
                                <p className="text-[12.5px] text-slate-500 mt-0.5">
                                    Paste this script into your site. Installation is verified automatically.
                                </p>
                            </div>
                        </div>
                        {installVerified && (
                            <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full bg-emerald-50 text-emerald-700 text-[11px] font-semibold flex-shrink-0">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                Live
                            </span>
                        )}
                    </div>

                    <div className="p-6 space-y-8">
                        {/* Step 1 */}
                        <div>
                            <div className="flex items-center gap-2 mb-3">
                                <span className="w-5 h-5 rounded-full bg-slate-900 text-white text-[11px] font-semibold flex items-center justify-center">
                                    1
                                </span>
                                <h3 className="text-[13.5px] font-semibold tracking-tight text-slate-950">
                                    Copy your install script
                                </h3>
                            </div>
                            <ScriptGenerator
                                userId={userData?._id}
                                websiteDomain={userData?.website}
                                botSlug={currentBot?.slug}
                            />
                        </div>

                        {/* Step 2 */}
                        <div>
                            <div className="flex items-center gap-2 mb-3">
                                <span className="w-5 h-5 rounded-full bg-slate-900 text-white text-[11px] font-semibold flex items-center justify-center">
                                    2
                                </span>
                                <h3 className="text-[13.5px] font-semibold tracking-tight text-slate-950">
                                    Platform-specific installation
                                </h3>
                            </div>
                            <div className="rounded-lg border border-slate-900/[0.06] bg-[#FAFAFA] p-5">
                                <IntegrationGuide userId={userData?._id} />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right column: Recent usage + quick actions */}
                <div className="space-y-6">
                    <div className="rounded-xl border border-slate-900/[0.06] bg-white overflow-hidden">
                        <div className="px-5 py-4 border-b border-slate-900/[0.06] flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <BarChart3
                                    className="w-[15px] h-[15px] text-slate-500"
                                    strokeWidth={1.75}
                                />
                                <h3 className="text-[13px] font-semibold tracking-tight text-slate-950">
                                    Recent usage
                                </h3>
                            </div>
                            <button
                                onClick={() => navigate('/user/billing')}
                                className="inline-flex items-center gap-1 text-[11.5px] font-semibold text-slate-500 hover:text-slate-900 transition-colors"
                            >
                                View all <ArrowRight className="w-3 h-3" />
                            </button>
                        </div>

                        {dailyUsage.length === 0 ? (
                            <div className="px-5 py-10 text-center">
                                <p className="text-[13px] text-slate-500">
                                    No activity yet.
                                </p>
                                <p className="text-[12px] text-slate-400 mt-1">
                                    Your chat traffic will show up here.
                                </p>
                            </div>
                        ) : (
                            <ul className="divide-y divide-slate-900/[0.06]">
                                {dailyUsage.map((d, idx) => (
                                    <li
                                        key={idx}
                                        className="px-5 py-3.5 flex items-center justify-between gap-3"
                                    >
                                        <div className="min-w-0">
                                            <div className="flex items-center flex-wrap gap-1.5 mb-1">
                                                {Array.from(d.types).map((type) => {
                                                    const t = usageTypeLabel(type);
                                                    return (
                                                        <span
                                                            key={type}
                                                            className="inline-flex items-center gap-1 text-[11px] text-slate-600 font-medium"
                                                        >
                                                            <span
                                                                className={cn(
                                                                    'w-1.5 h-1.5 rounded-full',
                                                                    t.dot
                                                                )}
                                                            />
                                                            {t.label}
                                                        </span>
                                                    );
                                                })}
                                            </div>
                                            <p className="text-[11.5px] text-slate-400">
                                                {d.date} · {d.count}{' '}
                                                {d.count === 1 ? 'activity' : 'activities'}
                                            </p>
                                        </div>
                                        <span className="text-[12.5px] font-semibold tabular-nums text-slate-900">
                                            −{d.totalTokens.toLocaleString()}
                                        </span>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>

                    {/* Quick actions */}
                    <div className="rounded-xl border border-slate-900/[0.06] bg-white overflow-hidden">
                        <div className="px-5 py-4 border-b border-slate-900/[0.06] flex items-center gap-2">
                            <Sparkles
                                className="w-[15px] h-[15px] text-indigo-600"
                                strokeWidth={1.75}
                            />
                            <h3 className="text-[13px] font-semibold tracking-tight text-slate-950">
                                Quick actions
                            </h3>
                        </div>
                        <div className="divide-y divide-slate-900/[0.06]">
                            {[
                                {
                                    label: 'Train from your website',
                                    desc: 'Crawl URLs into the knowledge base.',
                                    path: '/user/qa',
                                },
                                {
                                    label: 'Customise the widget',
                                    desc: 'Colours, position, welcome message.',
                                    path: '/user/widget',
                                },
                                {
                                    label: 'Review conversations',
                                    desc: 'See what your users are asking.',
                                    path: '/user/conversations',
                                },
                            ].map((a) => (
                                <button
                                    key={a.path}
                                    onClick={() => navigate(a.path)}
                                    className="w-full text-left px-5 py-3.5 flex items-center justify-between gap-3 hover:bg-slate-900/[0.02] transition-colors group"
                                >
                                    <div>
                                        <p className="text-[13px] font-medium tracking-tight text-slate-950 group-hover:text-indigo-600 transition-colors">
                                            {a.label}
                                        </p>
                                        <p className="text-[12px] text-slate-500 mt-0.5">
                                            {a.desc}
                                        </p>
                                    </div>
                                    <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-indigo-600 group-hover:translate-x-0.5 transition-all" />
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default UserDashboardHome;
