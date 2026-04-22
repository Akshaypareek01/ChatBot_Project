import React, { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useForm, Controller } from 'react-hook-form';
import { motion } from 'framer-motion';
import { ArrowLeft, ArrowRight, Check, Eye, EyeOff, Loader2, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { registerUser, verifyOTP, resendVerificationOTP } from '@/services/api';
import { Base_url } from '@/config/Base_url.jsx';

interface RegisterFormData {
    name: string;
    email: string;
    password: string;
    confirmPassword: string;
    website: string;
    brandName: string;
    acceptTos: boolean;
    acceptPrivacy: boolean;
}

/** Shared logo mark (light bg). */
const LogoMark = () => (
    <Link to="/" className="inline-flex items-center gap-2">
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

/** Logo mark on dark brand panel. */
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

const GoogleIcon = () => (
    <svg className="w-4 h-4" viewBox="0 0 24 24" aria-hidden>
        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
    </svg>
);

/** Reusable text input with consistent styling. */
interface FieldProps extends React.InputHTMLAttributes<HTMLInputElement> {
    label: string;
    error?: string;
    rightSlot?: React.ReactNode;
    inputRightIcon?: React.ReactNode;
}
const Field = React.forwardRef<HTMLInputElement, FieldProps>(function Field(
    { label, id, error, rightSlot, inputRightIcon, className = '', ...props },
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
                        `w-full h-10 px-3 rounded-md bg-white border text-[14px] text-slate-900 placeholder:text-slate-400 transition-all ` +
                        `focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500/60 ` +
                        `${error ? 'border-rose-400' : 'border-slate-900/[0.08]'} ` +
                        `${inputRightIcon ? 'pr-10' : ''} ${className}`
                    }
                    {...props}
                />
                {inputRightIcon && (
                    <div className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center">
                        {inputRightIcon}
                    </div>
                )}
            </div>
            {error && <p className="text-[11.5px] text-rose-500">{error}</p>}
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

/** Decorative brand panel on large screens. */
const BrandPanel = ({ referral }: { referral: boolean }) => (
    <div className="hidden lg:flex relative flex-col justify-between overflow-hidden bg-slate-950 text-white p-10 xl:p-14">
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
                <span className="w-6 h-px bg-indigo-400/60" />
                {referral ? 'You were invited' : 'Start free'}
            </div>
            <h2 className="text-3xl xl:text-4xl font-semibold tracking-[-0.02em] leading-[1.1]">
                {referral
                    ? 'Your invite includes bonus credits.'
                    : 'Launch your AI support agent today.'}
            </h2>
            <p className="mt-4 text-[14px] text-slate-300 leading-relaxed">
                {referral
                    ? 'Complete signup to claim your referral credits and start deflecting tickets in minutes.'
                    : 'No credit card. No contracts. Train on your docs and go live in under 10 minutes.'}
            </p>

            <div className="mt-10 space-y-3 text-[13px] text-slate-300">
                <div className="flex items-center gap-2.5">
                    <Check className="w-4 h-4 text-emerald-400 shrink-0" strokeWidth={2.5} />
                    <span>5 free chats to test quality</span>
                </div>
                <div className="flex items-center gap-2.5">
                    <Check className="w-4 h-4 text-emerald-400 shrink-0" strokeWidth={2.5} />
                    <span>Recharge from just ₹99 · credits never expire</span>
                </div>
                <div className="flex items-center gap-2.5">
                    <Check className="w-4 h-4 text-emerald-400 shrink-0" strokeWidth={2.5} />
                    <span>Train on PDFs, URLs & your knowledge base</span>
                </div>
                <div className="flex items-center gap-2.5">
                    <Check className="w-4 h-4 text-emerald-400 shrink-0" strokeWidth={2.5} />
                    <span>Domain whitelist · widget customisation</span>
                </div>
            </div>
        </div>

        <div className="relative z-10 text-[12px] text-slate-400">
            &copy; {new Date().getFullYear()} IndicBot. Built for teams in India.
        </div>
    </div>
);

const Register = () => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const refCode = searchParams.get('ref') || '';
    const [isLoading, setIsLoading] = useState(false);
    const [isVerifying, setIsVerifying] = useState(false);
    const [userEmail, setUserEmail] = useState('');
    const [otp, setOtp] = useState('');
    const [showPassword, setShowPassword] = useState(false);

    const { control, handleSubmit, formState: { errors } } = useForm<RegisterFormData>({
        defaultValues: {
            name: '',
            email: '',
            password: '',
            confirmPassword: '',
            website: '',
            brandName: '',
            acceptTos: false,
            acceptPrivacy: false,
        },
    });

    const onSubmit = async (data: RegisterFormData) => {
        if (data.password !== data.confirmPassword) {
            toast.error('Passwords do not match');
            return;
        }
        if (!data.acceptTos || !data.acceptPrivacy) {
            toast.error('Please accept the Terms of Service and Privacy Policy');
            return;
        }

        setIsLoading(true);
        try {
            const response = await registerUser({
                name: data.name,
                email: data.email,
                password: data.password,
                website: data.website,
                brandName: data.brandName,
                acceptTos: true,
                acceptPrivacy: true,
                ...(refCode ? { referralCode: refCode } : {}),
            });

            if (response.requiresVerification) {
                setIsVerifying(true);
                setUserEmail(data.email);
                toast.info(response.message);
            } else {
                toast.success(response.message || 'Registration successful!');
                navigate('/login');
            }
        } catch (error: any) {
            console.error('Registration error:', error);
            toast.error(error.message || 'Registration failed');
        } finally {
            setIsLoading(false);
        }
    };

    const handleVerifyOTP = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!otp || otp.length < 6) {
            toast.error('Please enter a valid 6-digit OTP');
            return;
        }
        setIsLoading(true);
        try {
            await verifyOTP(userEmail, otp);
            toast.success('Email verified successfully! Please login.');
            navigate('/login');
        } catch (error: any) {
            toast.error(error.message || 'Verification failed');
        } finally {
            setIsLoading(false);
        }
    };

    const handleResendOTP = async () => {
        setIsLoading(true);
        try {
            await resendVerificationOTP(userEmail);
            toast.success('A new OTP has been sent to your email.');
        } catch (error: any) {
            toast.error(error.message || 'Failed to resend OTP');
        } finally {
            setIsLoading(false);
        }
    };

    // ============= OTP VERIFY =============
    if (isVerifying) {
        return (
            <div className="min-h-screen grid lg:grid-cols-2 bg-white font-sans antialiased">
                <BrandPanel referral={!!refCode} />

                <div className="relative flex flex-col min-h-screen">
                    <div className="flex items-center justify-between px-5 sm:px-8 pt-6 lg:hidden">
                        <LogoMark />
                    </div>
                    <div className="hidden lg:flex justify-end px-8 pt-6">
                        <button
                            onClick={() => setIsVerifying(false)}
                            className="inline-flex items-center gap-1.5 text-[12.5px] font-medium text-slate-500 hover:text-slate-900 transition-colors"
                        >
                            <ArrowLeft className="w-3.5 h-3.5" /> Back to registration
                        </button>
                    </div>

                    <div className="flex-1 flex items-center justify-center px-5 sm:px-8 py-12">
                        <motion.div
                            initial={{ opacity: 0, y: 16 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                            className="w-full max-w-sm"
                        >
                            <div className="mb-8">
                                <h1 className="text-2xl font-semibold tracking-[-0.02em] text-slate-950">
                                    Verify your email
                                </h1>
                                <p className="mt-2 text-[13.5px] text-slate-500">
                                    We sent a 6-digit code to{' '}
                                    <span className="font-medium text-slate-900">{userEmail}</span>. Enter it below to finish creating your account.
                                </p>
                            </div>

                            <form onSubmit={handleVerifyOTP} className="space-y-5">
                                <div className="space-y-1.5">
                                    <label htmlFor="otpCode" className="text-[12.5px] font-medium text-slate-700">
                                        Verification code
                                    </label>
                                    <input
                                        id="otpCode"
                                        type="text"
                                        inputMode="numeric"
                                        placeholder="000000"
                                        value={otp}
                                        onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                                        className="w-full h-14 px-3 rounded-md bg-white border border-slate-900/[0.08] text-center text-2xl tracking-[0.5em] font-semibold text-slate-900 placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500/60 transition-all"
                                        maxLength={6}
                                    />
                                </div>

                                <PrimaryButton type="submit" loading={isLoading}>
                                    Verify &amp; continue
                                </PrimaryButton>
                            </form>

                            <div className="mt-6 text-center text-[13px] text-slate-500">
                                Didn't receive the code?{' '}
                                <button
                                    onClick={handleResendOTP}
                                    disabled={isLoading}
                                    className="font-medium text-slate-900 hover:text-indigo-600 transition-colors"
                                >
                                    Resend OTP
                                </button>
                            </div>

                            <button
                                onClick={() => setIsVerifying(false)}
                                className="group lg:hidden mt-6 inline-flex items-center gap-1.5 text-[13px] font-medium text-slate-500 hover:text-slate-900 transition-colors"
                            >
                                <ArrowLeft className="w-3.5 h-3.5 transition-transform group-hover:-translate-x-0.5" />
                                Back to registration
                            </button>
                        </motion.div>
                    </div>
                </div>
            </div>
        );
    }

    // ============= REGISTER =============
    return (
        <div className="min-h-screen grid lg:grid-cols-2 bg-white font-sans antialiased">
            <BrandPanel referral={!!refCode} />

            <div className="relative flex flex-col min-h-screen">
                {/* Mobile header */}
                <div className="flex items-center justify-between px-5 sm:px-8 pt-6 lg:hidden">
                    <LogoMark />
                    <Link
                        to="/"
                        className="inline-flex items-center gap-1.5 text-[12.5px] font-medium text-slate-500 hover:text-slate-900 transition-colors"
                    >
                        <ArrowLeft className="w-3.5 h-3.5" /> Home
                    </Link>
                </div>

                {/* Desktop back link */}
                <div className="hidden lg:flex justify-end px-8 pt-6">
                    <Link
                        to="/"
                        className="inline-flex items-center gap-1.5 text-[12.5px] font-medium text-slate-500 hover:text-slate-900 transition-colors"
                    >
                        <ArrowLeft className="w-3.5 h-3.5" /> Back to home
                    </Link>
                </div>

                <div className="flex-1 flex items-center justify-center px-5 sm:px-8 py-10">
                    <motion.div
                        initial={{ opacity: 0, y: 16 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                        className="w-full max-w-md"
                    >
                        <div className="mb-7">
                            <h1 className="text-2xl font-semibold tracking-[-0.02em] text-slate-950">
                                Create your account
                            </h1>
                            <p className="mt-2 text-[13.5px] text-slate-500">
                                Start with 5 free chats. No credit card required.
                            </p>
                        </div>

                        {refCode && (
                            <div className="mb-6 inline-flex items-center gap-2 text-[12px] font-medium text-indigo-700 bg-indigo-50 border border-indigo-100 px-3 py-2 rounded-md">
                                <Sparkles className="w-3.5 h-3.5" />
                                Referral applied — you'll earn bonus credits on signup.
                            </div>
                        )}

                        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
                            <Controller
                                name="name"
                                control={control}
                                rules={{ required: 'Name is required' }}
                                render={({ field }) => (
                                    <Field
                                        id="name"
                                        label="Full name"
                                        placeholder="Your full name"
                                        autoComplete="name"
                                        error={errors.name?.message}
                                        {...field}
                                    />
                                )}
                            />

                            <div className="grid sm:grid-cols-2 gap-4">
                                <Controller
                                    name="brandName"
                                    control={control}
                                    render={({ field }) => (
                                        <Field
                                            id="brandName"
                                            label="Brand name"
                                            placeholder="Acme Corp"
                                            error={errors.brandName?.message}
                                            {...field}
                                        />
                                    )}
                                />
                                <Controller
                                    name="website"
                                    control={control}
                                    render={({ field }) => (
                                        <Field
                                            id="website"
                                            label="Website"
                                            placeholder="example.com"
                                            error={errors.website?.message}
                                            {...field}
                                        />
                                    )}
                                />
                            </div>

                            <Controller
                                name="email"
                                control={control}
                                rules={{
                                    required: 'Email is required',
                                    pattern: { value: /^\S+@\S+\.\S+$/, message: 'Enter a valid email' },
                                }}
                                render={({ field }) => (
                                    <Field
                                        id="email"
                                        type="email"
                                        label="Work email"
                                        placeholder="name@company.com"
                                        autoComplete="email"
                                        error={errors.email?.message}
                                        {...field}
                                    />
                                )}
                            />

                            <div className="grid sm:grid-cols-2 gap-4">
                                <Controller
                                    name="password"
                                    control={control}
                                    rules={{
                                        required: 'Password is required',
                                        minLength: { value: 8, message: 'Minimum 8 characters' },
                                    }}
                                    render={({ field }) => (
                                        <Field
                                            id="password"
                                            type={showPassword ? 'text' : 'password'}
                                            label="Password"
                                            placeholder="Min 8 characters"
                                            autoComplete="new-password"
                                            error={errors.password?.message}
                                            inputRightIcon={
                                                <button
                                                    type="button"
                                                    onClick={() => setShowPassword((s) => !s)}
                                                    className="text-slate-400 hover:text-slate-700 transition-colors"
                                                    aria-label={showPassword ? 'Hide' : 'Show'}
                                                >
                                                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                                </button>
                                            }
                                            {...field}
                                        />
                                    )}
                                />
                                <Controller
                                    name="confirmPassword"
                                    control={control}
                                    rules={{ required: 'Please confirm password' }}
                                    render={({ field }) => (
                                        <Field
                                            id="confirmPassword"
                                            type={showPassword ? 'text' : 'password'}
                                            label="Confirm"
                                            placeholder="Repeat password"
                                            autoComplete="new-password"
                                            error={errors.confirmPassword?.message}
                                            {...field}
                                        />
                                    )}
                                />
                            </div>

                            {/* Checkboxes */}
                            <div className="space-y-2.5 pt-1">
                                <Controller
                                    name="acceptTos"
                                    control={control}
                                    render={({ field }) => (
                                        <label className="flex items-start gap-2.5 cursor-pointer group">
                                            <input
                                                type="checkbox"
                                                checked={field.value}
                                                onChange={(e) => field.onChange(e.target.checked)}
                                                className="mt-0.5 w-4 h-4 rounded border-slate-300 text-slate-900 focus:ring-2 focus:ring-indigo-500/20 focus:ring-offset-0"
                                            />
                                            <span className="text-[12.5px] text-slate-600 leading-relaxed">
                                                I agree to the{' '}
                                                <Link to="/terms" className="font-medium text-slate-900 hover:text-indigo-600 underline underline-offset-2">
                                                    Terms of Service
                                                </Link>
                                            </span>
                                        </label>
                                    )}
                                />
                                <Controller
                                    name="acceptPrivacy"
                                    control={control}
                                    render={({ field }) => (
                                        <label className="flex items-start gap-2.5 cursor-pointer group">
                                            <input
                                                type="checkbox"
                                                checked={field.value}
                                                onChange={(e) => field.onChange(e.target.checked)}
                                                className="mt-0.5 w-4 h-4 rounded border-slate-300 text-slate-900 focus:ring-2 focus:ring-indigo-500/20 focus:ring-offset-0"
                                            />
                                            <span className="text-[12.5px] text-slate-600 leading-relaxed">
                                                I agree to the{' '}
                                                <Link to="/privacy" className="font-medium text-slate-900 hover:text-indigo-600 underline underline-offset-2">
                                                    Privacy Policy
                                                </Link>
                                            </span>
                                        </label>
                                    )}
                                />
                            </div>

                            <PrimaryButton type="submit" loading={isLoading}>
                                Create account
                            </PrimaryButton>

                            {/* Divider */}
                            <div className="relative my-1">
                                <div className="absolute inset-0 flex items-center">
                                    <span className="w-full border-t border-slate-900/[0.08]" />
                                </div>
                                <div className="relative flex justify-center">
                                    <span className="bg-white px-3 text-[11px] font-medium uppercase tracking-[0.16em] text-slate-400">
                                        or
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
                                Sign up with Google
                            </button>
                        </form>

                        <p className="mt-8 text-center text-[13px] text-slate-500">
                            Already have an account?{' '}
                            <Link
                                to="/login"
                                className="font-medium text-slate-900 hover:text-indigo-600 transition-colors"
                            >
                                Sign in
                            </Link>
                        </p>
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

export default Register;
