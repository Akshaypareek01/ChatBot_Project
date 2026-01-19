import React from 'react';
import { Link } from 'react-router-dom';

const Footer = () => {
    return (
        <footer className="py-24 border-t border-slate-100 bg-white">
            <div className="max-w-[1440px] mx-auto px-8 lg:px-20 flex flex-col md:flex-row justify-between items-center gap-12 text-center md:text-left">
                <div className="flex items-center gap-2.5">
                    <div className="bg-primary p-1 rounded-lg">
                        <span className="material-symbols-outlined text-white text-lg font-variation-FILL-1">bubble_chart</span>
                    </div>
                    <span className="text-lg font-bold tracking-tight">IndicBot.ai</span>
                </div>

                <nav className="flex flex-wrap justify-center items-center gap-8 text-[10px] font-bold uppercase tracking-widest text-slate-500">
                    <a className="hover:text-primary transition-colors" href="#how-it-works">Process</a>
                    <a className="hover:text-primary transition-colors" href="#benefits">Features</a>
                    <a className="hover:text-primary transition-colors" href="#pricing">Pricing</a>
                    <Link className="hover:text-primary transition-colors" to="/login">Login</Link>
                </nav>

                <div className="flex flex-col md:flex-row items-center gap-8">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">© 2024 NVHO TECH PVT LTD. All rights reserved.</p>
                    <div className="flex gap-6 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                        <a className="hover:text-primary transition-colors" href="#">Privacy Policy</a>
                        <a className="hover:text-primary transition-colors" href="#">Terms of Service</a>
                    </div>
                </div>
            </div>
        </footer>
    );
};

export default Footer;
