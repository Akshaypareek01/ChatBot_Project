import React from 'react';
import { Link } from 'react-router-dom';

const Footer = () => {
    const year = new Date().getFullYear();

    const cols = [
        {
            title: 'Product',
            links: [
                { label: 'Overview', href: '#benefits' },
                { label: 'How it works', href: '#how-it-works' },
                { label: 'Pricing', href: '#pricing' },
                { label: 'Industries', href: '#industries' },
            ],
        },
        {
            title: 'Company',
            links: [
                { label: 'About', href: 'https://nvhotech.com/', external: true },
                { label: 'Contact sales', href: 'https://nvhotech.com/book-appointment', external: true },
                { label: 'Book a demo', href: 'https://nvhotech.com/book-appointment', external: true },
            ],
        },
        {
            title: 'Resources',
            links: [
                { label: 'Get started guide', href: '/register' },
                { label: 'Support', href: '/user/support' },
                { label: 'Security', href: '#security' },
            ],
        },
        {
            title: 'Legal',
            links: [
                { label: 'Privacy Policy', href: '/privacy' },
                { label: 'Terms of Service', href: '/terms' },
            ],
        },
    ];

    return (
        <footer className="border-t border-slate-900/[0.06] bg-white">
            <div className="max-w-[1200px] mx-auto px-5 sm:px-8 py-16">
                <div className="grid grid-cols-2 md:grid-cols-5 gap-10 lg:gap-16">
                    {/* Brand */}
                    <div className="col-span-2 md:col-span-1">
                        <Link to="/" className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-md bg-slate-900 flex items-center justify-center">
                                <svg viewBox="0 0 24 24" className="w-4 h-4 text-white" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M12 2L2 7l10 5 10-5-10-5z" />
                                    <path d="M2 17l10 5 10-5" />
                                    <path d="M2 12l10 5 10-5" />
                                </svg>
                            </div>
                            <span className="text-[15px] font-semibold tracking-tight text-slate-900">IndicBot</span>
                        </Link>
                        <p className="mt-4 text-[13px] text-slate-500 leading-relaxed max-w-xs">
                            Enterprise AI agents, engineered for global teams.
                        </p>
                    </div>

                    {cols.map((col) => (
                        <div key={col.title}>
                            <h4 className="text-[12px] font-semibold uppercase tracking-[0.14em] text-slate-900 mb-4">
                                {col.title}
                            </h4>
                            <ul className="space-y-3">
                                {col.links.map((link) => (
                                    <li key={link.label}>
                                        <a
                                            href={link.href}
                                            target={link.external ? '_blank' : undefined}
                                            rel={link.external ? 'noreferrer' : undefined}
                                            className="text-[13px] text-slate-500 hover:text-slate-900 transition-colors"
                                        >
                                            {link.label}
                                        </a>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    ))}
                </div>

                <div className="mt-14 pt-8 border-t border-slate-900/[0.06] flex flex-col sm:flex-row justify-between items-center gap-4">
                    <p className="text-[12px] text-slate-500">
                        © {year} NVHO TECH PVT LTD. All rights reserved.
                    </p>
                    <div className="flex items-center gap-4">
                        <span className="inline-flex items-center gap-1.5 text-[12px] text-slate-500">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            All systems operational
                        </span>
                    </div>
                </div>
            </div>
        </footer>
    );
};

export default Footer;
