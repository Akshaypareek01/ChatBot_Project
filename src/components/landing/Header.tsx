import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';

interface HeaderProps {
    userData: unknown;
}

const navLinks = [
    { label: 'Product', href: '#benefits' },
    { label: 'How it works', href: '#how-it-works' },
    { label: 'Pricing', href: '#pricing' },
    { label: 'Customers', href: '#industries' },
];

const Header = ({ userData }: HeaderProps) => {
    const [scrolled, setScrolled] = useState(false);

    useEffect(() => {
        const onScroll = () => setScrolled(window.scrollY > 8);
        window.addEventListener('scroll', onScroll, { passive: true });
        return () => window.removeEventListener('scroll', onScroll);
    }, []);

    return (
        <header
            className={cn(
                'fixed top-0 z-50 w-full transition-all duration-300',
                scrolled
                    ? 'border-b border-slate-900/5 bg-white/80 backdrop-blur-xl shadow-[0_1px_0_rgba(15,23,42,0.04)]'
                    : 'border-b border-transparent bg-transparent'
            )}
        >
            <div className="max-w-[1280px] mx-auto px-5 sm:px-8 h-16 flex items-center justify-between">
                {/* Logo */}
                <Link to="/" className="flex items-center gap-2 group">
                    <div className="w-7 h-7 rounded-md bg-slate-900 flex items-center justify-center shadow-sm">
                        <svg viewBox="0 0 24 24" className="w-4 h-4 text-white" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M12 2L2 7l10 5 10-5-10-5z" />
                            <path d="M2 17l10 5 10-5" />
                            <path d="M2 12l10 5 10-5" />
                        </svg>
                    </div>
                    <span className="text-[15px] font-semibold tracking-tight text-slate-900">IndicBot</span>
                </Link>

                {/* Nav */}
                <nav className="hidden md:flex items-center gap-8">
                    {navLinks.map((link) => (
                        <a
                            key={link.href}
                            href={link.href}
                            className="text-[13px] font-medium text-slate-600 hover:text-slate-900 transition-colors"
                        >
                            {link.label}
                        </a>
                    ))}
                </nav>

                {/* CTA */}
                <div className="flex items-center gap-2 sm:gap-3">
                    {userData ? (
                        <Link to="/user">
                            <button className="inline-flex items-center h-9 px-4 rounded-md bg-slate-900 text-white text-[13px] font-medium tracking-tight hover:bg-slate-800 transition-colors">
                                Dashboard
                            </button>
                        </Link>
                    ) : (
                        <>
                            <Link
                                to="/login"
                                className="hidden sm:inline-flex items-center h-9 px-3 text-[13px] font-medium text-slate-600 hover:text-slate-900 transition-colors"
                            >
                                Sign in
                            </Link>
                            <Link to="/register">
                                <button className="inline-flex items-center h-9 px-4 rounded-md bg-slate-900 text-white text-[13px] font-medium tracking-tight hover:bg-slate-800 transition-colors shadow-sm">
                                    Get started
                                    <svg className="ml-1.5 w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14" /><path d="m12 5 7 7-7 7" /></svg>
                                </button>
                            </Link>
                        </>
                    )}
                </div>
            </div>
        </header>
    );
};

export default Header;
