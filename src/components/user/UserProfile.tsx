import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import {
    getUserProfile,
    updateUserProfile,
    updateUserPassword,
    getNotificationPrefs,
    updateNotificationPrefs,
} from '@/services/api';
import { toast } from 'sonner';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import {
    Copy,
    Gift,
    User as UserIcon,
    Mail,
    Globe,
    Building2,
    FileText,
    Lock,
    Bell,
    Calendar,
    Sparkles,
    Save,
    Check,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const profileSchema = z.object({
    name: z.string().min(2, { message: 'Name must be at least 2 characters' }),
    email: z.string().email({ message: 'Please enter a valid email' }),
    website: z.string().optional(),
    brandName: z.string().optional(),
    gstin: z.string().optional(),
    customDashboardDomain: z.string().optional(),
    customEmailFromName: z.string().optional(),
    customEmailReplyTo: z.string().optional(),
});

const passwordSchema = z
    .object({
        currentPassword: z.string().min(6, { message: 'Password must be at least 6 characters' }),
        newPassword: z.string().min(6, { message: 'Password must be at least 6 characters' }),
        confirmPassword: z.string().min(6, { message: 'Password must be at least 6 characters' }),
    })
    .refine((data) => data.newPassword === data.confirmPassword, {
        message: "Passwords don't match",
        path: ['confirmPassword'],
    });

type ProfileFormValues = z.infer<typeof profileSchema>;
type PasswordFormValues = z.infer<typeof passwordSchema>;

/* --------------------------- primitives --------------------------- */

const SectionCard: React.FC<{
    title: string;
    description?: string;
    icon?: React.ElementType;
    children: React.ReactNode;
    className?: string;
}> = ({ title, description, icon: Icon, children, className }) => (
    <div
        className={cn(
            'rounded-xl border border-slate-900/[0.06] bg-white overflow-hidden',
            className
        )}
    >
        <div className="px-5 py-4 border-b border-slate-900/[0.06] flex items-start gap-3">
            {Icon && (
                <div className="w-7 h-7 rounded-md bg-slate-900/[0.04] text-slate-700 flex items-center justify-center flex-shrink-0">
                    <Icon className="w-3.5 h-3.5" strokeWidth={2} />
                </div>
            )}
            <div className="min-w-0">
                <h3 className="text-[14px] font-semibold tracking-tight text-slate-950 leading-none">
                    {title}
                </h3>
                {description && (
                    <p className="text-[12px] text-slate-500 mt-1 leading-relaxed">
                        {description}
                    </p>
                )}
            </div>
        </div>
        <div className="p-5">{children}</div>
    </div>
);

const FieldLabel: React.FC<{
    children: React.ReactNode;
    icon?: React.ElementType;
    optional?: boolean;
}> = ({ children, icon: Icon, optional }) => (
    <label className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500 mb-1.5">
        {Icon && <Icon className="w-3 h-3" strokeWidth={2} />}
        {children}
        {optional && (
            <span className="ml-1 text-[10px] font-medium normal-case tracking-normal text-slate-400">
                · optional
            </span>
        )}
    </label>
);

const TextInput = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
    ({ className, disabled, ...rest }, ref) => (
        <input
            ref={ref}
            disabled={disabled}
            {...rest}
            className={cn(
                'w-full h-9 px-3 rounded-md border border-slate-900/[0.08] bg-white text-[13px] text-slate-900 placeholder:text-slate-400 outline-none focus:border-indigo-500/60 focus:ring-2 focus:ring-indigo-500/10 transition-all',
                disabled && 'bg-slate-50 text-slate-500 cursor-not-allowed',
                className
            )}
        />
    )
);
TextInput.displayName = 'TextInput';

const FieldHint: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <p className="text-[11px] text-slate-400 mt-1.5">{children}</p>
);

const FieldError: React.FC<{ children?: React.ReactNode }> = ({ children }) =>
    children ? (
        <p className="text-[11px] text-rose-600 mt-1.5">{children}</p>
    ) : null;

const PrimaryBtn: React.FC<
    React.ButtonHTMLAttributes<HTMLButtonElement> & { icon?: React.ElementType }
> = ({ icon: Icon, children, className, ...rest }) => (
    <button
        {...rest}
        className={cn(
            'inline-flex items-center gap-1.5 px-3.5 h-9 rounded-md bg-slate-950 text-white text-[12.5px] font-semibold tracking-tight hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors',
            className
        )}
    >
        {Icon && <Icon className="w-3.5 h-3.5" strokeWidth={2.25} />}
        {children}
    </button>
);

const Toggle: React.FC<{
    checked: boolean;
    onChange: (v: boolean) => void;
    disabled?: boolean;
}> = ({ checked, onChange, disabled }) => (
    <button
        type="button"
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={cn(
            'relative inline-flex h-5 w-9 flex-shrink-0 rounded-full transition-colors',
            checked ? 'bg-indigo-600' : 'bg-slate-300',
            disabled && 'opacity-50 cursor-not-allowed'
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
    disabled,
}: {
    value: T;
    onChange: (v: T) => void;
    options: { id: T; label: string }[];
    disabled?: boolean;
}) => (
    <div
        className={cn(
            'inline-flex items-center gap-0.5 p-0.5 rounded-lg bg-slate-900/[0.04] border border-slate-900/[0.06]',
            disabled && 'opacity-60'
        )}
    >
        {options.map((o) => (
            <button
                key={o.id}
                type="button"
                disabled={disabled}
                onClick={() => onChange(o.id)}
                className={cn(
                    'px-3 h-7 rounded-md text-[12px] font-semibold tracking-tight transition-all',
                    value === o.id
                        ? 'bg-white text-slate-950 shadow-[0_1px_2px_rgba(15,23,42,0.08)]'
                        : 'text-slate-600 hover:text-slate-900'
                )}
            >
                {o.label}
            </button>
        ))}
    </div>
);

/* --------------------------- component --------------------------- */

const UserProfile = () => {
    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isPasswordSubmitting, setIsPasswordSubmitting] = useState(false);
    const [user, setUser] = useState<any>(null);
    const [notifPrefs, setNotifPrefs] = useState<{
        emailOnNewLead: boolean;
        emailOnLowBalance: boolean;
        emailSummary: string;
    } | null>(null);
    const [notifSaving, setNotifSaving] = useState(false);
    const [refCopied, setRefCopied] = useState(false);

    const profileForm = useForm<ProfileFormValues>({
        resolver: zodResolver(profileSchema),
        defaultValues: {
            name: '',
            email: '',
            website: '',
            brandName: '',
            gstin: '',
            customDashboardDomain: '',
            customEmailFromName: '',
            customEmailReplyTo: '',
        },
    });

    const passwordForm = useForm<PasswordFormValues>({
        resolver: zodResolver(passwordSchema),
        defaultValues: {
            currentPassword: '',
            newPassword: '',
            confirmPassword: '',
        },
    });

    useEffect(() => {
        const fetchProfile = async () => {
            try {
                const userData = await getUserProfile();
                setUser(userData);

                profileForm.reset({
                    name: userData.name,
                    email: userData.email,
                    website: userData.website || '',
                    brandName: userData.brandName || '',
                    gstin: userData.gstin || '',
                    customDashboardDomain: userData.customDashboardDomain || '',
                    customEmailFromName: userData.customEmailFromName || '',
                    customEmailReplyTo: userData.customEmailReplyTo || '',
                });
            } catch (error) {
                console.error('Error fetching profile:', error);
                toast.error('Could not load profile data');
            } finally {
                setIsLoading(false);
            }
        };

        fetchProfile();
        getNotificationPrefs()
            .then(setNotifPrefs)
            .catch(() => setNotifPrefs(null));
    }, [profileForm]);

    const onSubmitProfile = async (data: ProfileFormValues) => {
        setIsSubmitting(true);
        try {
            await updateUserProfile({
                name: data.name,
                website: data.website || '',
                brandName: data.brandName || '',
                gstin: data.gstin || undefined,
                customDashboardDomain: data.customDashboardDomain || undefined,
                customEmailFromName: data.customEmailFromName || undefined,
                customEmailReplyTo: data.customEmailReplyTo || undefined,
            });

            setUser({
                ...user,
                name: data.name,
                website: data.website,
                brandName: data.brandName,
                gstin: data.gstin || null,
                customDashboardDomain: data.customDashboardDomain || null,
                customEmailFromName: data.customEmailFromName || null,
                customEmailReplyTo: data.customEmailReplyTo || null,
            });

            toast.success('Profile updated successfully');
        } catch (error: any) {
            console.error('Profile update error:', error);
            toast.error(error.message || 'Failed to update profile');
        } finally {
            setIsSubmitting(false);
        }
    };

    const onSubmitPassword = async (data: PasswordFormValues) => {
        setIsPasswordSubmitting(true);
        try {
            if (data.newPassword !== data.confirmPassword) {
                toast.error('New passwords do not match');
                return;
            }

            await updateUserPassword({
                currentPassword: data.currentPassword,
                newPassword: data.newPassword,
            });

            passwordForm.reset({
                currentPassword: '',
                newPassword: '',
                confirmPassword: '',
            });

            toast.success('Password updated successfully');
        } catch (error: any) {
            console.error('Password update error:', error);
            toast.error(error.message || 'Failed to update password');
        } finally {
            setIsPasswordSubmitting(false);
        }
    };

    const getInitials = (name: string) =>
        (name || 'U')
            .split(' ')
            .map((n) => n[0])
            .filter(Boolean)
            .slice(0, 2)
            .join('')
            .toUpperCase();

    const formatDate = (d?: string) =>
        d
            ? new Date(d).toLocaleDateString('en-IN', {
                  day: '2-digit',
                  month: 'short',
                  year: 'numeric',
              })
            : 'Unknown';

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-[60vh]">
                <div className="w-8 h-8 border-2 border-slate-200 border-t-slate-900 rounded-full animate-spin" />
            </div>
        );
    }

    const referralUrl =
        typeof window !== 'undefined' && user?.referralCode
            ? `${window.location.origin}/register?ref=${user.referralCode}`
            : '';

    return (
        <div className="space-y-6 pb-12">
            {/* Header */}
            <div>
                <div className="inline-flex items-center gap-2 text-[10.5px] font-semibold uppercase tracking-[0.16em] text-indigo-600 mb-2">
                    <span className="w-3 h-px bg-indigo-600" />
                    Account
                </div>
                <h1 className="text-[28px] sm:text-[34px] font-semibold tracking-[-0.02em] text-slate-950 leading-tight">
                    Profile
                </h1>
                <p className="text-[13px] text-slate-500 mt-1.5">
                    Manage your personal info, security, and notifications.
                </p>
            </div>

            {/* Identity card */}
            <div className="rounded-xl border border-slate-900/[0.06] bg-white p-5 flex items-center gap-4">
                <div className="w-14 h-14 rounded-full bg-indigo-600/10 text-indigo-600 flex items-center justify-center text-[18px] font-semibold tracking-tight flex-shrink-0">
                    {getInitials(user?.name)}
                </div>
                <div className="min-w-0 flex-1">
                    <h2 className="text-[16px] font-semibold tracking-tight text-slate-950 truncate">
                        {user?.name}
                    </h2>
                    <p className="text-[12.5px] text-slate-500 mt-0.5 truncate">
                        {user?.email}
                    </p>
                    <div className="inline-flex items-center gap-1.5 text-[11px] text-slate-400 mt-1.5">
                        <Calendar className="w-3 h-3" strokeWidth={2} />
                        Member since {formatDate(user?.createdAt)}
                    </div>
                </div>
                {user?.whitelabel && (
                    <span className="inline-flex items-center gap-1 px-2 h-5 rounded-sm bg-violet-500/10 text-violet-700 text-[10px] font-semibold uppercase tracking-[0.14em] flex-shrink-0">
                        <Sparkles className="w-2.5 h-2.5" strokeWidth={2.5} />
                        Whitelabel
                    </span>
                )}
            </div>

            {/* Account info */}
            <SectionCard
                icon={UserIcon}
                title="Account information"
                description="Update your personal and business details."
            >
                <form onSubmit={profileForm.handleSubmit(onSubmitProfile)} className="space-y-5">
                    <div className="grid gap-5 sm:grid-cols-2">
                        <div>
                            <FieldLabel icon={UserIcon}>Name</FieldLabel>
                            <TextInput {...profileForm.register('name')} />
                            <FieldError>
                                {profileForm.formState.errors.name?.message}
                            </FieldError>
                        </div>

                        <div>
                            <FieldLabel icon={Mail}>Email</FieldLabel>
                            <TextInput
                                {...profileForm.register('email')}
                                type="email"
                                disabled
                            />
                            <FieldHint>Email can’t be changed.</FieldHint>
                        </div>

                        <div>
                            <FieldLabel icon={Building2} optional>
                                Brand name
                            </FieldLabel>
                            <TextInput
                                {...profileForm.register('brandName')}
                                placeholder="e.g. Acme Corp"
                            />
                            <FieldHint>Shown to users chatting with your bot.</FieldHint>
                        </div>

                        <div>
                            <FieldLabel icon={Globe} optional>
                                Website
                            </FieldLabel>
                            <TextInput
                                {...profileForm.register('website')}
                                placeholder="example.com"
                            />
                            <FieldHint>No https:// or www.</FieldHint>
                        </div>

                        <div className="sm:col-span-2">
                            <FieldLabel icon={FileText} optional>
                                GSTIN
                            </FieldLabel>
                            <TextInput
                                {...profileForm.register('gstin')}
                                placeholder="e.g. 27AABCU9603R1ZM"
                            />
                            <FieldHint>For Indian businesses. Shown on tax invoices.</FieldHint>
                        </div>
                    </div>

                    {user?.whitelabel && (
                        <div className="pt-5 border-t border-slate-900/[0.06] space-y-5">
                            <div className="flex items-center gap-2">
                                <Sparkles
                                    className="w-3.5 h-3.5 text-violet-600"
                                    strokeWidth={2}
                                />
                                <span className="text-[10.5px] font-semibold uppercase tracking-[0.18em] text-violet-700">
                                    Whitelabel settings
                                </span>
                            </div>

                            <div className="grid gap-5 sm:grid-cols-2">
                                <div className="sm:col-span-2">
                                    <FieldLabel icon={Globe} optional>
                                        Custom dashboard domain
                                    </FieldLabel>
                                    <TextInput
                                        {...profileForm.register('customDashboardDomain')}
                                        placeholder="app.yourcompany.com"
                                    />
                                    <FieldHint>
                                        CNAME your domain to our app. Email links will use this.
                                    </FieldHint>
                                </div>

                                <div>
                                    <FieldLabel icon={Mail} optional>
                                        Email “From” name
                                    </FieldLabel>
                                    <TextInput
                                        {...profileForm.register('customEmailFromName')}
                                        placeholder="Your Company Support"
                                    />
                                </div>

                                <div>
                                    <FieldLabel icon={Mail} optional>
                                        Email reply-to
                                    </FieldLabel>
                                    <TextInput
                                        {...profileForm.register('customEmailReplyTo')}
                                        type="email"
                                        placeholder="support@yourcompany.com"
                                    />
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="flex justify-end pt-2">
                        <PrimaryBtn type="submit" icon={Save} disabled={isSubmitting}>
                            {isSubmitting ? 'Updating…' : 'Update profile'}
                        </PrimaryBtn>
                    </div>
                </form>
            </SectionCard>

            {/* Password */}
            <SectionCard
                icon={Lock}
                title="Change password"
                description="Use a strong password — at least 6 characters."
            >
                <form onSubmit={passwordForm.handleSubmit(onSubmitPassword)} className="space-y-5">
                    <div className="grid gap-5 sm:grid-cols-3">
                        <div>
                            <FieldLabel>Current password</FieldLabel>
                            <TextInput
                                {...passwordForm.register('currentPassword')}
                                type="password"
                                autoComplete="current-password"
                            />
                            <FieldError>
                                {passwordForm.formState.errors.currentPassword?.message}
                            </FieldError>
                        </div>
                        <div>
                            <FieldLabel>New password</FieldLabel>
                            <TextInput
                                {...passwordForm.register('newPassword')}
                                type="password"
                                autoComplete="new-password"
                            />
                            <FieldError>
                                {passwordForm.formState.errors.newPassword?.message}
                            </FieldError>
                        </div>
                        <div>
                            <FieldLabel>Confirm password</FieldLabel>
                            <TextInput
                                {...passwordForm.register('confirmPassword')}
                                type="password"
                                autoComplete="new-password"
                            />
                            <FieldError>
                                {passwordForm.formState.errors.confirmPassword?.message}
                            </FieldError>
                        </div>
                    </div>
                    <div className="flex justify-end pt-2">
                        <PrimaryBtn
                            type="submit"
                            icon={Lock}
                            disabled={isPasswordSubmitting}
                        >
                            {isPasswordSubmitting ? 'Updating…' : 'Change password'}
                        </PrimaryBtn>
                    </div>
                </form>
            </SectionCard>

            {/* Referral */}
            {user?.referralCode && (
                <div className="rounded-xl border border-indigo-200/60 bg-gradient-to-br from-indigo-50 to-white p-5">
                    <div className="flex items-start gap-3 mb-4">
                        <div className="w-7 h-7 rounded-md bg-indigo-600/10 text-indigo-600 flex items-center justify-center flex-shrink-0">
                            <Gift className="w-3.5 h-3.5" strokeWidth={2} />
                        </div>
                        <div className="min-w-0 flex-1">
                            <h3 className="text-[14px] font-semibold tracking-tight text-slate-950 leading-none">
                                Referral program
                            </h3>
                            <p className="text-[12px] text-slate-600 mt-1 leading-relaxed">
                                Share your link. You get{' '}
                                <span className="font-semibold text-slate-900">5,000 credits</span>{' '}
                                when a friend signs up and makes their first payment.
                            </p>
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <input
                            readOnly
                            value={referralUrl}
                            className="flex-1 h-9 px-3 rounded-md border border-slate-900/[0.08] bg-white text-[12.5px] text-slate-700 font-mono outline-none"
                        />
                        <button
                            type="button"
                            onClick={() => {
                                navigator.clipboard.writeText(referralUrl).then(() => {
                                    setRefCopied(true);
                                    toast.success('Link copied');
                                    setTimeout(() => setRefCopied(false), 1500);
                                });
                            }}
                            className={cn(
                                'inline-flex items-center gap-1.5 px-3 h-9 rounded-md text-[12.5px] font-semibold tracking-tight transition-all border',
                                refCopied
                                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                    : 'bg-white text-slate-700 border-slate-900/[0.08] hover:bg-slate-50 hover:border-slate-900/[0.12]'
                            )}
                        >
                            {refCopied ? (
                                <>
                                    <Check className="w-3.5 h-3.5" strokeWidth={2.5} />
                                    Copied
                                </>
                            ) : (
                                <>
                                    <Copy className="w-3.5 h-3.5" strokeWidth={2.25} />
                                    Copy
                                </>
                            )}
                        </button>
                    </div>
                </div>
            )}

            {/* Notifications */}
            <SectionCard
                icon={Bell}
                title="Notification preferences"
                description="Choose when to get email alerts and summaries."
            >
                {notifPrefs && (
                    <div className="space-y-3">
                        <div className="flex items-center justify-between p-3.5 rounded-lg bg-[#FAFAFA] border border-slate-900/[0.06]">
                            <div className="min-w-0">
                                <p className="text-[13px] font-semibold tracking-tight text-slate-900">
                                    New lead captured
                                </p>
                                <p className="text-[11.5px] text-slate-500 mt-0.5">
                                    Get an email when a visitor submits the pre-chat form.
                                </p>
                            </div>
                            <Toggle
                                checked={notifPrefs.emailOnNewLead}
                                disabled={notifSaving}
                                onChange={async (v) => {
                                    setNotifPrefs((p) =>
                                        p ? { ...p, emailOnNewLead: v } : null
                                    );
                                    setNotifSaving(true);
                                    try {
                                        await updateNotificationPrefs({ emailOnNewLead: v });
                                    } finally {
                                        setNotifSaving(false);
                                    }
                                }}
                            />
                        </div>

                        <div className="flex items-center justify-between p-3.5 rounded-lg bg-[#FAFAFA] border border-slate-900/[0.06]">
                            <div className="min-w-0">
                                <p className="text-[13px] font-semibold tracking-tight text-slate-900">
                                    Low balance alert
                                </p>
                                <p className="text-[11.5px] text-slate-500 mt-0.5">
                                    Email when token balance drops below threshold.
                                </p>
                            </div>
                            <Toggle
                                checked={notifPrefs.emailOnLowBalance}
                                disabled={notifSaving}
                                onChange={async (v) => {
                                    setNotifPrefs((p) =>
                                        p ? { ...p, emailOnLowBalance: v } : null
                                    );
                                    setNotifSaving(true);
                                    try {
                                        await updateNotificationPrefs({ emailOnLowBalance: v });
                                    } finally {
                                        setNotifSaving(false);
                                    }
                                }}
                            />
                        </div>

                        <div className="flex items-center justify-between p-3.5 rounded-lg bg-[#FAFAFA] border border-slate-900/[0.06]">
                            <div className="min-w-0">
                                <p className="text-[13px] font-semibold tracking-tight text-slate-900">
                                    Summary email
                                </p>
                                <p className="text-[11.5px] text-slate-500 mt-0.5">
                                    Chat stats and leads digest, sent to your inbox.
                                </p>
                            </div>
                            <Segmented
                                value={notifPrefs.emailSummary as 'none' | 'daily' | 'weekly'}
                                disabled={notifSaving}
                                onChange={async (v) => {
                                    setNotifPrefs((p) =>
                                        p ? { ...p, emailSummary: v } : null
                                    );
                                    setNotifSaving(true);
                                    try {
                                        await updateNotificationPrefs({ emailSummary: v });
                                    } finally {
                                        setNotifSaving(false);
                                    }
                                }}
                                options={[
                                    { id: 'none', label: 'Off' },
                                    { id: 'daily', label: 'Daily' },
                                    { id: 'weekly', label: 'Weekly' },
                                ]}
                            />
                        </div>

                        {notifSaving && (
                            <p className="text-[11px] text-slate-400">Saving…</p>
                        )}
                    </div>
                )}
            </SectionCard>
        </div>
    );
};

export default UserProfile;
