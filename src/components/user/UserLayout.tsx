import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
    LayoutDashboard,
    MessageSquareText,
    User,
    LogOut,
    CreditCard,
    LifeBuoy,
    Shield,
    Palette,
    MessagesSquare,
    BarChart3,
    Zap,
    Webhook,
    MessageCircle,
    Users,
    Workflow,
    Menu,
    X,
    ChevronRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import NotificationBell from './NotificationBell';
import BotSwitcher from './BotSwitcher';

interface UserLayoutProps {
    children: React.ReactNode;
    onLogout: () => void;
    user: any;
}

type NavItem = { icon: typeof LayoutDashboard; label: string; path: string };
type NavGroup = { title: string; items: NavItem[] };

/**
 * Logo mark — matches the landing page header.
 * Small indigo-600 rounded square with a simple stacked-layers glyph.
 */
const LogoMark = () => (
    <div className="w-7 h-7 rounded-md bg-slate-900 flex items-center justify-center">
        <svg
            viewBox="0 0 24 24"
            className="w-4 h-4 text-white"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <path d="M12 2L2 7l10 5 10-5-10-5z" />
            <path d="M2 17l10 5 10-5" />
            <path d="M2 12l10 5 10-5" />
        </svg>
    </div>
);

const UserLayout: React.FC<UserLayoutProps> = ({ children, onLogout, user }) => {
    const location = useLocation();
    const [mobileOpen, setMobileOpen] = useState(false);

    // Close drawer on route change
    useEffect(() => {
        setMobileOpen(false);
    }, [location.pathname]);

    // Lock scroll when drawer open
    useEffect(() => {
        if (mobileOpen) {
            document.body.style.overflow = 'hidden';
            return () => {
                document.body.style.overflow = '';
            };
        }
    }, [mobileOpen]);

    const brandName = user?.whitelabel ? user?.brandName || 'Dashboard' : 'IndicBot';

    const navGroups: NavGroup[] = [
        {
            title: 'Overview',
            items: [
                { icon: LayoutDashboard, label: 'Dashboard', path: '/user' },
                { icon: BarChart3, label: 'Analytics', path: '/user/analytics' },
            ],
        },
        {
            title: 'Engagement',
            items: [
                { icon: MessagesSquare, label: 'Conversations', path: '/user/conversations' },
                { icon: MessageCircle, label: 'Live Chat', path: '/user/live-chat' },
                { icon: Workflow, label: 'Flows', path: '/user/flows' },
            ],
        },
        {
            title: 'Configure',
            items: [
                { icon: MessageSquareText, label: 'Knowledge base', path: '/user/qa' },
                { icon: Palette, label: 'Widget', path: '/user/widget' },
                { icon: Shield, label: 'Domain security', path: '/user/security' },
                { icon: Webhook, label: 'Webhooks', path: '/user/webhooks' },
            ],
        },
        {
            title: 'Account',
            items: [
                { icon: User, label: 'Profile', path: '/user/profile' },
                { icon: CreditCard, label: 'Transactions', path: '/user/transactions' },
                { icon: Zap, label: 'Plan', path: '/user/plan' },
                { icon: LifeBuoy, label: 'Support', path: '/user/support' },
                ...(user?.role === 'reseller'
                    ? [{ icon: Users, label: 'Clients', path: '/user/clients' }]
                    : []),
            ],
        },
    ];

    const isActive = (path: string) =>
        path === '/user' ? location.pathname === '/user' : location.pathname.startsWith(path);

    const renderNavItem = (item: NavItem) => {
        const active = isActive(item.path);
        return (
            <Link
                key={item.path}
                to={item.path}
                className={cn(
                    'group relative flex items-center gap-2.5 h-9 px-2.5 rounded-md text-[13px] transition-colors',
                    active
                        ? 'bg-slate-900/[0.04] text-slate-950 font-medium'
                        : 'text-slate-500 hover:text-slate-950 hover:bg-slate-900/[0.03]'
                )}
            >
                {active && (
                    <span className="absolute left-0 top-1.5 bottom-1.5 w-[2px] rounded-full bg-indigo-600" />
                )}
                <item.icon
                    className={cn(
                        'w-[15px] h-[15px] transition-colors',
                        active ? 'text-indigo-600' : 'text-slate-400 group-hover:text-slate-700'
                    )}
                    strokeWidth={1.75}
                />
                <span className="tracking-tight">{item.label}</span>
            </Link>
        );
    };

    const sidebarInner = (
        <>
            {/* Brand */}
            <div className="h-16 px-5 flex items-center justify-between border-b border-slate-900/[0.06]">
                <Link to="/user" className="flex items-center gap-2">
                    <LogoMark />
                    <span className="text-[14px] font-semibold tracking-tight text-slate-950">
                        {brandName}
                    </span>
                </Link>
                <div className="flex items-center gap-1">
                    <NotificationBell />
                    <button
                        className="md:hidden w-8 h-8 flex items-center justify-center rounded-md text-slate-500 hover:text-slate-900 hover:bg-slate-900/[0.04]"
                        onClick={() => setMobileOpen(false)}
                        aria-label="Close menu"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>
            </div>

            {/* Bot switcher */}
            <div className="px-3 py-3 border-b border-slate-900/[0.06]">
                <BotSwitcher />
            </div>

            {/* Nav */}
            <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-5">
                {navGroups.map((group) => (
                    <div key={group.title}>
                        <p className="px-2.5 mb-1.5 text-[10.5px] font-semibold uppercase tracking-[0.14em] text-slate-400">
                            {group.title}
                        </p>
                        <div className="space-y-0.5">{group.items.map(renderNavItem)}</div>
                    </div>
                ))}
            </nav>

            {/* User + logout */}
            <div className="p-3 border-t border-slate-900/[0.06]">
                <Link
                    to="/user/profile"
                    className="flex items-center gap-2.5 px-2 py-2 rounded-md hover:bg-slate-900/[0.03] transition-colors"
                >
                    <div className="w-8 h-8 rounded-full bg-slate-900 text-white text-[11px] font-semibold flex items-center justify-center uppercase">
                        {(user?.name || 'U').slice(0, 1)}
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-[12.5px] font-medium text-slate-950 truncate leading-tight">
                            {user?.name || 'Account'}
                        </p>
                        <p className="text-[11px] text-slate-500 truncate leading-tight mt-0.5">
                            {user?.email}
                        </p>
                    </div>
                    <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                </Link>
                <button
                    onClick={onLogout}
                    className="mt-1 w-full flex items-center gap-2.5 h-9 px-2.5 rounded-md text-[13px] text-slate-500 hover:text-slate-950 hover:bg-slate-900/[0.03] transition-colors"
                >
                    <LogOut className="w-[15px] h-[15px]" strokeWidth={1.75} />
                    <span className="tracking-tight">Sign out</span>
                </button>
            </div>
        </>
    );

    return (
        <div className="min-h-screen bg-[#FAFAFA] flex">
            {/* Desktop sidebar */}
            <aside className="hidden md:flex w-[248px] bg-white border-r border-slate-900/[0.06] flex-col sticky top-0 h-screen">
                {sidebarInner}
            </aside>

            {/* Mobile top bar */}
            <div className="md:hidden fixed top-0 inset-x-0 z-30 h-14 bg-white/85 backdrop-blur border-b border-slate-900/[0.06] flex items-center justify-between px-4">
                <Link to="/user" className="flex items-center gap-2">
                    <LogoMark />
                    <span className="text-[14px] font-semibold tracking-tight text-slate-950">
                        {brandName}
                    </span>
                </Link>
                <div className="flex items-center gap-1">
                    <NotificationBell />
                    <button
                        className="w-9 h-9 flex items-center justify-center rounded-md text-slate-700 hover:bg-slate-900/[0.04]"
                        onClick={() => setMobileOpen(true)}
                        aria-label="Open menu"
                    >
                        <Menu className="w-5 h-5" />
                    </button>
                </div>
            </div>

            {/* Mobile drawer */}
            {mobileOpen && (
                <div className="md:hidden fixed inset-0 z-40">
                    <div
                        className="absolute inset-0 bg-slate-950/40 backdrop-blur-sm"
                        onClick={() => setMobileOpen(false)}
                        aria-hidden
                    />
                    <aside className="absolute top-0 left-0 h-full w-[280px] bg-white border-r border-slate-900/[0.06] flex flex-col shadow-xl animate-in slide-in-from-left duration-200">
                        {sidebarInner}
                    </aside>
                </div>
            )}

            {/* Main content */}
            <main className="flex-1 min-w-0 pt-14 md:pt-0">
                <div className="px-5 sm:px-8 py-8 md:py-10 max-w-[1200px] mx-auto w-full">
                    {children}
                </div>
            </main>
        </div>
    );
};

export default UserLayout;
