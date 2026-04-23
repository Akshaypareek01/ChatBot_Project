import React, { useState, useEffect } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, ArrowRight, Check, Eye, EyeOff, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { login, forgotPassword, resetPassword } from '@/services/api';
import { Base_url } from '@/config/Base_url.jsx';

/** Small shared logo mark — matches landing Header. */
const LogoMark = () => (
    <Link to="/" className="inline-flex items-center gap-2 group">
        <div className="w-7 h-7 rounded-md bg-slate-900 flex items-center justify-center shadow-sm">
            <svg viewBox="0 0 24 24" className="w-4 h-4 text-white" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2L2 7l10 5 10-5-10-5z" />
                <path d="M2 17l10 5 10-5" />
                <path d="M2 12l10 5 10-5" />
            </svg>
        </div>
        <span className="text-[15px] font-semibold tracking-tight text-slate-900">IndicBot</span>
    </Link>
);

/** Google icon. */
const GoogleIcon = () => (
    <svg className="w-4 h-4" viewBox="0 0 24 24" aria-hidden>
        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
    </svg>
);

/** Decorative panel shown on large screens (brand messaging + trust). */
const BrandPanel = ({ title, subtitle }: { title: string; subtitle: string }) => (
    <div className="hidden lg:flex relative flex-col justify-between overflow-hidden bg-slate-950 text-white p-10 xl:p-14">
        {/* Grid + radial glow */}
        <div
            aria-hidden
            className="absolute inset-0 opacity-[0.15]"
            style={{
                backgroundImage:
                    'linear-gradient(rgba(255,255,255,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.08) 1px, transparent 1px)',
                backgroundSize: '32px 32px',
                maskImage: 'radial-gradient(ellipse at 30% 40%, black 40%, transparent 75%)',
            }}
        />
        <div
            aria-hidden
            className="absolute -top-32 -left-32 w-[480px] h-[480px] rounded-full"
            style={{ background: 'radial-gradient(circle, rgba(99,102,241,0.35) 0%, transparent 60%)' }}
        />

        <div className="relative z-10">
            <LogoMarkDark />
        </div>

        <div className="relative z-10 max-w-md">
            <div className="inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-indigo-300 mb-5">
                <span className="w-6 h-px bg-indigo-400/60" /> Enterprise AI support
            </div>
            <h2 className="text-3xl xl:text-4xl font-semibold tracking-[-0.02em] leading-[1.1]">
                {title}
            </h2>
            <p className="mt-4 text-[14px] text-slate-300 leading-relaxed">{subtitle}</p>

            <div className="mt-10 space-y-3 text-[13px] text-slate-300">
                <div className="flex items-center gap-2.5">
                    <Check className="w-4 h-4 text-emerald-400 shrink-0" strokeWidth={2.5} />
                    <span>5 free chats to evaluate — no card required</span>
                </div>
                <div className="flex items-center gap-2.5">
                    <Check className="w-4 h-4 text-emerald-400 shrink-0" strokeWidth={2.5} />
                    <span>Credits from ₹99 · never expire</span>
                </div>
                <div className="flex items-center gap-2.5">
                    <Check className="w-4 h-4 text-emerald-400 shrink-0" strokeWidth={2.5} />
                    <span>Encrypted · private · your data never trained on</span>
                </div>
            </div>
        </div>

        <div className="relative z-10 text-[12px] text-slate-400">
            &copy; {new Date().getFullYear()} IndicBot. Built for teams in India.
        </div>
    </div>
);

/** Dark-variant logo for brand panel. */
const LogoMarkDark = () => (
    <Link to="/" className="inline-flex items-center gap-2">
        <div className="w-7 h-7 rounded-md bg-white flex items-center justify-center">
            <svg viewBox="0 0 24 24" className="w-4 h-4 text-slate-900" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2L2 7l10 5 10-5-10-5z" />
                <path d="M2 17l10 5 10-5" />
                <path d="M2 12l10 5 10-5" />
            </svg>
        </div>
        <span className="text-[15px] font-semibold tracking-tight text-white">IndicBot</span>
    </Link>
);

/** Reusable text input with consistent styling. */
interface FieldProps extends React.InputHTMLAttributes<HTMLInputElement> {
    label: string;
    rightSlot?: React.ReactNode;      // shown next to the label
    inputRightIcon?: React.ReactNode; // shown INSIDE the input on the right
}
const Field = React.forwardRef<HTMLInputElement, FieldProps>(function Field(
    { label, id, rightSlot, inputRightIcon, className = '', ...props },
    ref
) {
    return (
        <div className="space-y-1.5">
            <div className="flex items-center justify-between">
                <label htmlFor={id} className="text-[12.5px] font-medium text-slate-700">
                    {label}
                </label>
                {rightSlot}
            </div>
            <div className="relative">
                <input
                    id={id}
                    ref={ref}
                    className={
                        `w-full h-10 px-3 rounded-md bg-white border border-slate-900/[0.08] ` +
                        `text-[14px] text-slate-900 placeholder:text-slate-400 ` +
                        `focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500/60 ` +
                        `transition-all ${inputRightIcon ? 'pr-10' : ''} ${className}`
                    }
                    {...props}
                />
                {inputRightIcon && (
                    <div className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center">
                        {inputRightIcon}
                    </div>
                )}
            </div>
        </div>
    );
});

const PrimaryButton = ({
    children,
    loading,
    ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { loading?: boolean }) => (
    <button
        {...rest}
        disabled={rest.disabled || loading}
        className="group inline-flex w-full items-center justify-center gap-2 h-10 px-4 rounded-md bg-slate-900 text-white text-[13px] font-medium hover:bg-slate-800 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
    >
        {loading ? (
            <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Please wait...</span>
            </>
        ) : (
            <>
                <span>{children}</span>
                <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
            </>
        )}
    </button>
);

const Login = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();

    useEffect(() => {
        const error = searchParams.get('error');
        if (error === 'access_denied') toast.error('Google sign-in was cancelled.');
        else if (error === 'no_code') toast.error('Google did not return a code. Try again.');
        else if (error === 'no_email') toast.error('Google did not provide an email.');
        else if (error === 'account_deactivated') toast.error('Account is deactivated.');
        else if (error === 'account_pending') toast.error('Account is pending approval.');
        else if (error === 'server_error') toast.error('Sign-in failed. Try again.');
    }, [searchParams]);

    // Forgot Password States
    const [isForgotMode, setIsForgotMode] = useState(false);
    const [resetStep, setResetStep] = useState(1); // 1: Email, 2: OTP & New Pass
    const [resetEmail, setResetEmail] = useState('');
    const [resetOtp, setResetOtp] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmNewPassword, setConfirmNewPassword] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!email || !password) {
            toast.error('Please enter both email and password');
            return;
        }
        setIsLoading(true);
        try {
            const data = await login(email, password);
            localStorage.setItem('token', data.token);
            if (data.refreshToken) localStorage.setItem('refreshToken', data.refreshToken);
            localStorage.setItem('isAdmin', data.user?.role === 'admin' ? 'true' : 'false');
            toast.success('Login successful');
            if (data.user?.role === 'admin') navigate('/admin');
            else navigate('/user');
        } catch (error: any) {
            console.error('Login error:', error);
            if (error.requiresVerification) toast.info(error.message);
            else toast.error(error.message || 'Login failed');
        } finally {
            setIsLoading(false);
        }
    };

    const handleForgotPassword = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!resetEmail) {
            toast.error('Please enter your email address');
            return;
        }
        setIsLoading(true);
        try {
            await forgotPassword(resetEmail);
            toast.success('Check your email for the password reset OTP');
            setResetStep(2);
        } catch (error: any) {
            toast.error(error.message || 'Failed to send reset OTP');
        } finally {
            setIsLoading(false);
        }
    };

    const handleResetPassword = async (e: React.FormEvent) => {
        e.preventDefault();
        if (newPassword !== confirmNewPassword) {
            toast.error('Passwords do not match');
            return;
        }
        if (resetOtp.length < 6) {
            toast.error('Please enter a valid 6-digit OTP');
            return;
        }
        setIsLoading(true);
        try {
            await resetPassword({ email: resetEmail, otp: resetOtp, newPassword });
            toast.success('Password updated successfully! You can now login.');
            setIsForgotMode(false);
            setResetStep(1);
        } catch (error: any) {
            toast.error(error.message || 'Reset failed');
        } finally {
            setIsLoading(false);
        }
    };

    // ============= SHELL =============
    return (
        <div className="min-h-screen grid lg:grid-cols-2 bg-white font-sans antialiased">
            <BrandPanel
                title={
                    isForgotMode
                        ? 'Secure account recovery in seconds.'
                        : 'The enterprise AI support layer your customers will trust.'
                }
                subtitle={
                    isForgotMode
                        ? "We'll email you a one-time code to safely reset your password."
                        : 'Deflect tickets, train on your docs, and scale support without scaling headcount.'
                }
            />

            {/* Right: form column */}
            <div className="relative flex flex-col min-h-screen">
                {/* Mobile logo + back link */}
                <div className="flex items-center justify-between px-5 sm:px-8 pt-6 lg:hidden">
                    <LogoMark />
                    <Link
                        to="/"
                        className="inline-flex items-center gap-1.5 text-[12.5px] font-medium text-slate-500 hover:text-slate-900 transition-colors"
                    >
                        <ArrowLeft className="w-3.5 h-3.5" /> Home
                    </Link>
                </div>

                {/* Desktop back link (top-right) */}
                <div className="hidden lg:flex justify-end px-8 pt-6">
                    <Link
                        to="/"
                        className="inline-flex items-center gap-1.5 text-[12.5px] font-medium text-slate-500 hover:text-slate-900 transition-colors"
                    >
                        <ArrowLeft className="w-3.5 h-3.5" /> Back to home
                    </Link>
                </div>

                <div className="flex-1 flex items-center justify-center px-5 sm:px-8 py-12">
                    <motion.div
                        initial={{ opacity: 0, y: 16 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                        className="w-full max-w-sm"
                    >
                        {isForgotMode ? (
                            // ============= FORGOT PASSWORD =============
                            <>
                                <div className="mb-8">
                                    <h1 className="text-2xl font-semibold tracking-[-0.02em] text-slate-950">
                                        {resetStep === 1 ? 'Reset your password' : 'Set a new password'}
                                    </h1>
                                    <p className="mt-2 text-[13.5px] text-slate-500">
                                        {resetStep === 1
                                            ? "Enter your email and we'll send you a 6-digit code."
                                            : `We sent a code to ${resetEmail}. Enter it below to continue.`}
                                    </p>
                                </div>

                                {resetStep === 1 ? (
                                    <form onSubmit={handleForgotPassword} className="space-y-5">
                                        <Field
                                            id="resetEmail"
                                            label="Email address"
                                            type="email"
                                            placeholder="name@company.com"
                                            value={resetEmail}
                                            onChange={(e) => setResetEmail(e.target.value)}
                                            autoComplete="email"
                                            required
                                        />
                                        <PrimaryButton type="submit" loading={isLoading}>
                                            Send reset code
                                        </PrimaryButton>
                                    </form>
                                ) : (
                                    <form onSubmit={handleResetPassword} className="space-y-5">
                                        <div className="space-y-1.5">
                                            <label htmlFor="resetOtp" className="text-[12.5px] font-medium text-slate-700">
                                                6-digit code
                                            </label>
                                            <input
                                                id="resetOtp"
                                                type="text"
                                                inputMode="numeric"
                                                placeholder="000000"
                                                className="w-full h-12 px-3 rounded-md bg-white border border-slate-900/[0.08] text-center text-xl tracking-[0.5em] font-semibold text-slate-900 placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500/60 transition-all"
                                                value={resetOtp}
                                                onChange={(e) => setResetOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                                                required
                                            />
                                        </div>
                                        <Field
                                            id="newPass"
                                            label="New password"
                                            type="password"
                                            placeholder="At least 8 characters"
                                            value={newPassword}
                                            onChange={(e) => setNewPassword(e.target.value)}
                                            autoComplete="new-password"
                                            required
                                        />
                                        <Field
                                            id="confPass"
                                            label="Confirm new password"
                                            type="password"
                                            placeholder="Repeat password"
                                            value={confirmNewPassword}
                                            onChange={(e) => setConfirmNewPassword(e.target.value)}
                                            autoComplete="new-password"
                                            required
                                        />
                                        <PrimaryButton type="submit" loading={isLoading}>
                                            Update password
                                        </PrimaryButton>
                                    </form>
                                )}

                                <button
                                    onClick={() => {
                                        if (resetStep === 2) setResetStep(1);
                                        else setIsForgotMode(false);
                                    }}
                                    className="group mt-6 inline-flex items-center gap-1.5 text-[13px] font-medium text-slate-500 hover:text-slate-900 transition-colors"
                                >
                                    <ArrowLeft className="w-3.5 h-3.5 transition-transform group-hover:-translate-x-0.5" />
                                    {resetStep === 2 ? 'Change email' : 'Back to sign in'}
                                </button>
                            </>
                        ) : (
                            // ============= SIGN IN =============
                            <>
                                <div className="mb-8">
                                    <h1 className="text-2xl font-semibold tracking-[-0.02em] text-slate-950">
                                        Welcome back
                                    </h1>
                                    <p className="mt-2 text-[13.5px] text-slate-500">
                                        Sign in to manage your AI agents and monitor conversations.
                                    </p>
                                </div>

                                <form onSubmit={handleSubmit} className="space-y-5">
                                    <Field
                                        id="email"
                                        label="Email address"
                                        type="email"
                                        placeholder="name@company.com"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        autoComplete="email"
                                    />

                                    <Field
                                        id="password"
                                        label="Password"
                                        type={showPassword ? 'text' : 'password'}
                                        placeholder="••••••••"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        autoComplete="current-password"
                                        rightSlot={
                                            <button
                                                type="button"
                                                onClick={() => setIsForgotMode(true)}
                                                className="text-[12px] font-medium text-indigo-600 hover:text-indigo-700 transition-colors"
                                            >
                                                Forgot?
                                            </button>
                                        }
                                        inputRightIcon={
                                            <button
                                                type="button"
                                                onClick={() => setShowPassword((s) => !s)}
                                                className="text-slate-400 hover:text-slate-700 transition-colors"
                                                aria-label={showPassword ? 'Hide password' : 'Show password'}
                                            >
                                                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                            </button>
                                        }
                                    />

                                    <PrimaryButton type="submit" loading={isLoading}>
                                        Sign in
                                    </PrimaryButton>
                                </form>

                                {/* Divider */}
                                <div className="relative my-6">
                                    <div className="absolute inset-0 flex items-center">
                                        <span className="w-full border-t border-slate-900/[0.08]" />
                                    </div>
                                    <div className="relative flex justify-center">
                                        <span className="bg-white px-3 text-[11px] font-medium uppercase tracking-[0.16em] text-slate-400">
                                            or continue with
                                        </span>
                                    </div>
                                </div>

                                <button
                                    type="button"
                                    onClick={() => {
                                        window.location.href = `${Base_url}/users/auth/google`;
                                    }}
                                    className="w-full inline-flex items-center justify-center gap-2 h-10 px-4 rounded-md bg-white border border-slate-900/[0.08] text-[13px] font-medium text-slate-900 hover:bg-slate-50 hover:border-slate-900/20 transition-all"
                                >
                                    <GoogleIcon />
                                    Continue with Google
                                </button>

                                <p className="mt-8 text-center text-[13px] text-slate-500">
                                    New to IndicBot?{' '}
                                    <Link
                                        to="/register"
                                        className="font-medium text-slate-900 hover:text-indigo-600 transition-colors"
                                    >
                                        Create an account
                                    </Link>
                                </p>
                            </>
                        )}
                    </motion.div>
                </div>

                <div className="px-5 sm:px-8 pb-6 text-center lg:hidden">
                    <p className="text-[11px] text-slate-400">
                        &copy; {new Date().getFullYear()} IndicBot. Built for teams in India.
                    </p>
                </div>
            </div>
        </div>
    );
};

export default Login;
