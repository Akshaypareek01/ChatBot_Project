import React from 'react';
import { Link } from 'react-router-dom';
import { RainbowButton } from '@/components/ui/rainbow-button';
import { RippleButton } from '@/components/ui/ripple-button';

interface HeaderProps {
    userData: any;
}

const Header = ({ userData }: HeaderProps) => {
    return (
        <header className="fixed top-0 z-50 w-full border-b border-white/20 bg-white/60 backdrop-blur-xl">
            <div className="max-w-[1440px] mx-auto px-8 lg:px-20 h-20 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                    <div className="bg-primary p-1.5 rounded-lg flex items-center justify-center shadow-lg shadow-primary/20">
                        <span className="material-symbols-outlined text-white text-xl">bubble_chart</span>
                    </div>
                    <span className="text-xl font-bold tracking-tight text-slate-900">IndicBot.ai</span>
                </div>

                <nav className="hidden md:flex items-center gap-12">
                    <a className="text-[10px] font-bold uppercase tracking-button text-slate-500 hover:text-primary transition-colors" href="#how-it-works">How it Works</a>
                    <a className="text-[10px] font-bold uppercase tracking-button text-slate-500 hover:text-primary transition-colors" href="#benefits">Benefits</a>
                    <a className="text-[10px] font-bold uppercase tracking-button text-slate-500 hover:text-primary transition-colors" href="#pricing">Pricing</a>
                </nav>

                <div className="flex items-center gap-3 md:gap-6">
                    {userData ? (
                        <Link to="/user">
                            <button className="bg-primary text-white px-4 md:px-7 py-2 md:py-2.5 rounded-full text-[10px] md:text-xs font-bold uppercase tracking-button inner-glow hover:bg-indigo-700 transition-all hover:shadow-xl hover:shadow-primary/20">
                                Dashboard
                            </button>
                        </Link>
                    ) : (
                        <>
                            <Link to="/login">
                                <RippleButton rippleColor="#4F46E5" className="text-[10px] md:text-xs font-bold uppercase tracking-button text-slate-600 hover:text-primary transition-colors">
                                    Login
                                </RippleButton>
                            </Link>
                            <Link to="/register">
                                <RainbowButton className="px-4 md:px-7 py-2 md:py-2.5 text-[10px] md:text-xs font-bold uppercase tracking-button whitespace-nowrap">
                                    Get Started
                                </RainbowButton>
                            </Link>
                        </>
                    )}
                </div>
            </div>
        </header>
    );
};

export default Header;
