import React, { useState, useEffect, useRef } from 'react';
import {
    getWidgetConfig,
    updateWidgetConfig,
    uploadWidgetAvatar,
    generateSuggestedQuestions,
    getMyPlanUsage,
} from '@/services/api';
import { useBot } from '@/context/BotContext';
import { toast } from 'sonner';
import {
    Palette,
    Image as ImageIcon,
    Bot,
    MapPin,
    Maximize2,
    Clock,
    Sparkles,
    MessageSquare,
    UserCircle2,
    Code2,
    Zap,
    Shield,
    Webhook,
    Upload,
    Wand2,
    Save,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface PreChatField {
    key: 'name' | 'email' | 'phone';
    label?: string;
    required?: boolean;
}

interface PreChatForm {
    enabled?: boolean;
    welcomeMessage?: string;
    fields?: PreChatField[];
}

interface WidgetConfig {
    primaryColor?: string;
    accentColor?: string;
    botAvatarUrl?: string;
    position?: 'bottom-left' | 'bottom-right';
    welcomeMessage?: string;
    botName?: string;
    size?: 'compact' | 'standard' | 'large';
    autoOpenDelay?: number;
    customCss?: string;
    showPoweredBy?: boolean;
    allowTalkToHuman?: boolean;
    noAnswerMessage?: string;
    preChatForm?: PreChatForm;
    suggestedQuestions?: string[];
    leadCaptureWebhookUrl?: string;
    preferredAiModel?: string;
}

/* ----------------------------- primitives ----------------------------- */

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
    hint?: string;
}> = ({ children, icon: Icon, hint }) => (
    <div className="flex items-center justify-between mb-1.5">
        <label className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
            {Icon && <Icon className="w-3 h-3" strokeWidth={2} />}
            {children}
        </label>
        {hint && <span className="text-[10.5px] text-slate-400">{hint}</span>}
    </div>
);

const TextInput: React.FC<React.InputHTMLAttributes<HTMLInputElement>> = ({
    className,
    ...rest
}) => (
    <input
        {...rest}
        className={cn(
            'w-full h-9 px-3 rounded-md border border-slate-900/[0.08] bg-white text-[13px] text-slate-900 placeholder:text-slate-400 outline-none focus:border-indigo-500/60 focus:ring-2 focus:ring-indigo-500/10 transition-all',
            className
        )}
    />
);

const TextArea: React.FC<React.TextareaHTMLAttributes<HTMLTextAreaElement>> = ({
    className,
    ...rest
}) => (
    <textarea
        {...rest}
        className={cn(
            'w-full px-3 py-2 rounded-md border border-slate-900/[0.08] bg-white text-[13px] text-slate-900 placeholder:text-slate-400 outline-none focus:border-indigo-500/60 focus:ring-2 focus:ring-indigo-500/10 transition-all resize-y',
            className
        )}
    />
);

const Segmented = <T extends string>({
    value,
    onChange,
    options,
}: {
    value: T;
    onChange: (v: T) => void;
    options: { id: T; label: string }[];
}) => (
    <div className="inline-flex items-center gap-0.5 p-0.5 rounded-lg bg-slate-900/[0.04] border border-slate-900/[0.06]">
        {options.map((o) => (
            <button
                key={o.id}
                type="button"
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

const GhostBtn: React.FC<
    React.ButtonHTMLAttributes<HTMLButtonElement> & { icon?: React.ElementType }
> = ({ icon: Icon, children, className, ...rest }) => (
    <button
        {...rest}
        className={cn(
            'inline-flex items-center gap-1.5 px-3 h-9 rounded-md border border-slate-900/[0.08] bg-white text-slate-700 text-[12.5px] font-semibold tracking-tight hover:bg-slate-50 hover:border-slate-900/[0.12] disabled:opacity-50 disabled:cursor-not-allowed transition-all',
            className
        )}
    >
        {Icon && <Icon className="w-3.5 h-3.5" strokeWidth={2.25} />}
        {children}
    </button>
);

/* ------------------------------ component ------------------------------ */

export default function WidgetCustomization() {
    const { currentBotId } = useBot() || {};
    const [config, setConfig] = useState<WidgetConfig>({});
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [avatarUploading, setAvatarUploading] = useState(false);
    const [whitelabel, setWhitelabel] = useState(false);
    const avatarInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        getWidgetConfig(currentBotId ?? undefined)
            .then(setConfig)
            .catch(() => toast.error('Failed to load widget config'))
            .finally(() => setLoading(false));
    }, [currentBotId]);

    useEffect(() => {
        getMyPlanUsage()
            .then((u) => setWhitelabel(!!u?.plan?.whitelabel))
            .catch(() => {});
    }, []);

    const handleChange = (
        key: keyof WidgetConfig,
        value: string | number | boolean | string[]
    ) => {
        setConfig((c) => ({ ...c, [key]: value }));
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            await updateWidgetConfig(config, currentBotId ?? undefined);
            toast.success('Widget settings saved');
        } catch {
            toast.error('Failed to save');
        } finally {
            setSaving(false);
        }
    };

    const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !file.type.startsWith('image/')) {
            toast.error('Please select an image file');
            return;
        }
        setAvatarUploading(true);
        try {
            const { botAvatarUrl } = await uploadWidgetAvatar(file);
            setConfig((c) => ({ ...c, botAvatarUrl }));
            toast.success('Avatar updated');
        } catch {
            toast.error('Avatar upload failed');
        } finally {
            setAvatarUploading(false);
            e.target.value = '';
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-[60vh]">
                <div className="w-8 h-8 border-2 border-slate-200 border-t-slate-900 rounded-full animate-spin" />
            </div>
        );
    }

    const primaryColor = config.primaryColor ?? '#2563EB';
    const accentColor = config.accentColor ?? '#22D3EE';

    return (
        <div className="space-y-6 pb-12">
            {/* Header */}
            <div className="flex items-start justify-between gap-4 flex-wrap">
                <div>
                    <div className="inline-flex items-center gap-2 text-[10.5px] font-semibold uppercase tracking-[0.16em] text-indigo-600 mb-2">
                        <span className="w-3 h-px bg-indigo-600" />
                        Appearance
                    </div>
                    <h1 className="text-[28px] sm:text-[34px] font-semibold tracking-[-0.02em] text-slate-950 leading-tight">
                        Widget customization
                    </h1>
                    <p className="text-[13px] text-slate-500 mt-1.5 max-w-xl leading-relaxed">
                        Tune how your chat widget looks, sounds, and captures leads on your site.
                    </p>
                </div>
                <PrimaryBtn icon={Save} onClick={handleSave} disabled={saving}>
                    {saving ? 'Saving…' : 'Save changes'}
                </PrimaryBtn>
            </div>

            {/* Branding */}
            <SectionCard
                icon={Palette}
                title="Branding"
                description="Avatar, name, and the colors used by your widget."
            >
                <div className="grid gap-5 sm:grid-cols-2">
                    {/* Avatar */}
                    <div className="sm:col-span-2">
                        <FieldLabel icon={ImageIcon}>Bot avatar</FieldLabel>
                        <div className="flex items-center gap-4">
                            {config.botAvatarUrl ? (
                                <img
                                    src={config.botAvatarUrl}
                                    alt="Bot"
                                    className="h-14 w-14 rounded-full object-cover border border-slate-900/[0.08]"
                                />
                            ) : (
                                <div className="h-14 w-14 rounded-full bg-slate-900/[0.04] border border-slate-900/[0.06] flex items-center justify-center text-slate-400">
                                    <Bot className="w-5 h-5" strokeWidth={1.75} />
                                </div>
                            )}
                            <div className="flex-1">
                                <input
                                    ref={avatarInputRef}
                                    type="file"
                                    accept="image/*"
                                    className="hidden"
                                    onChange={handleAvatarChange}
                                    disabled={avatarUploading}
                                />
                                <GhostBtn
                                    type="button"
                                    icon={Upload}
                                    onClick={() => avatarInputRef.current?.click()}
                                    disabled={avatarUploading}
                                >
                                    {avatarUploading ? 'Uploading…' : 'Upload image'}
                                </GhostBtn>
                                <p className="text-[11px] text-slate-400 mt-1.5">
                                    PNG, JPG or WebP, max 2MB. Or paste a URL below.
                                </p>
                            </div>
                        </div>
                        <div className="mt-3">
                            <TextInput
                                value={config.botAvatarUrl ?? ''}
                                onChange={(e) => handleChange('botAvatarUrl', e.target.value)}
                                placeholder="https://..."
                            />
                        </div>
                    </div>

                    <div>
                        <FieldLabel icon={Bot}>Bot name</FieldLabel>
                        <TextInput
                            value={config.botName ?? ''}
                            onChange={(e) => handleChange('botName', e.target.value)}
                            placeholder="e.g. Support Bot"
                        />
                    </div>

                    <div>
                        <FieldLabel icon={MessageSquare}>Welcome message</FieldLabel>
                        <TextInput
                            value={config.welcomeMessage ?? ''}
                            onChange={(e) => handleChange('welcomeMessage', e.target.value)}
                            placeholder="Hi! How can we help?"
                        />
                    </div>

                    <div>
                        <FieldLabel>Primary color</FieldLabel>
                        <div className="flex gap-2">
                            <label className="relative inline-block">
                                <input
                                    type="color"
                                    value={primaryColor}
                                    onChange={(e) => handleChange('primaryColor', e.target.value)}
                                    className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                                />
                                <span
                                    className="block h-9 w-12 rounded-md border border-slate-900/[0.08]"
                                    style={{ backgroundColor: primaryColor }}
                                />
                            </label>
                            <TextInput
                                value={primaryColor}
                                onChange={(e) => handleChange('primaryColor', e.target.value)}
                                className="font-mono text-[12px] uppercase tracking-tight"
                            />
                        </div>
                    </div>

                    <div>
                        <FieldLabel>Accent color</FieldLabel>
                        <div className="flex gap-2">
                            <label className="relative inline-block">
                                <input
                                    type="color"
                                    value={accentColor}
                                    onChange={(e) => handleChange('accentColor', e.target.value)}
                                    className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                                />
                                <span
                                    className="block h-9 w-12 rounded-md border border-slate-900/[0.08]"
                                    style={{ backgroundColor: accentColor }}
                                />
                            </label>
                            <TextInput
                                value={accentColor}
                                onChange={(e) => handleChange('accentColor', e.target.value)}
                                className="font-mono text-[12px] uppercase tracking-tight"
                            />
                        </div>
                    </div>
                </div>
            </SectionCard>

            {/* Layout & Behavior */}
            <SectionCard
                icon={Maximize2}
                title="Layout & behavior"
                description="Position, size, auto-open delay, and AI model."
            >
                <div className="grid gap-5 sm:grid-cols-2">
                    <div>
                        <FieldLabel icon={MapPin}>Position</FieldLabel>
                        <Segmented
                            value={(config.position ?? 'bottom-right') as 'bottom-right' | 'bottom-left'}
                            onChange={(v) => handleChange('position', v)}
                            options={[
                                { id: 'bottom-right', label: 'Bottom right' },
                                { id: 'bottom-left', label: 'Bottom left' },
                            ]}
                        />
                    </div>

                    <div>
                        <FieldLabel icon={Maximize2}>Size</FieldLabel>
                        <Segmented
                            value={(config.size ?? 'standard') as 'compact' | 'standard' | 'large'}
                            onChange={(v) => handleChange('size', v)}
                            options={[
                                { id: 'compact', label: 'Compact' },
                                { id: 'standard', label: 'Standard' },
                                { id: 'large', label: 'Large' },
                            ]}
                        />
                    </div>

                    <div>
                        <FieldLabel icon={Clock} hint="0 = off">
                            Auto-open delay (seconds)
                        </FieldLabel>
                        <TextInput
                            type="number"
                            min={0}
                            value={config.autoOpenDelay ?? 0}
                            onChange={(e) =>
                                handleChange('autoOpenDelay', parseInt(e.target.value, 10) || 0)
                            }
                        />
                    </div>

                    <div>
                        <FieldLabel icon={Zap}>AI model</FieldLabel>
                        <Segmented
                            value={(config.preferredAiModel ?? 'gpt-4o-mini') as 'gpt-4o-mini' | 'gpt-4o'}
                            onChange={(v) => handleChange('preferredAiModel', v)}
                            options={[
                                { id: 'gpt-4o-mini', label: 'GPT-4o Mini' },
                                { id: 'gpt-4o', label: 'GPT-4o' },
                            ]}
                        />
                        <p className="text-[11px] text-slate-400 mt-1.5">
                            Mini = faster &amp; cheaper. 4o = higher quality.
                        </p>
                    </div>
                </div>
            </SectionCard>

            {/* Suggested questions */}
            <SectionCard
                icon={Sparkles}
                title="Suggested questions"
                description="Up to 5 quick replies shown when chat opens and after each reply."
            >
                <div className="flex gap-2">
                    <TextArea
                        value={(config.suggestedQuestions ?? []).join('\n')}
                        onChange={(e) =>
                            handleChange(
                                'suggestedQuestions',
                                e.target.value
                                    .split('\n')
                                    .map((s) => s.trim())
                                    .filter(Boolean)
                            )
                        }
                        placeholder={'One per line, e.g.\nWhat are your opening hours?\nHow do I contact support?'}
                        rows={4}
                        className="flex-1"
                    />
                    <GhostBtn
                        type="button"
                        icon={Wand2}
                        className="self-start"
                        onClick={async () => {
                            try {
                                const { suggestedQuestions: generated } =
                                    await generateSuggestedQuestions();
                                setConfig((c) => ({
                                    ...c,
                                    suggestedQuestions: generated || [],
                                }));
                                toast.success('Generated from knowledge base');
                            } catch {
                                toast.error('Generate failed');
                            }
                        }}
                    >
                        Generate from KB
                    </GhostBtn>
                </div>
            </SectionCard>

            {/* Pre-chat form */}
            <SectionCard
                icon={UserCircle2}
                title="Pre-chat form"
                description="Capture name, email, or phone before the conversation starts."
            >
                <div className="flex items-center justify-between">
                    <p className="text-[12.5px] text-slate-600">
                        {config.preChatForm?.enabled
                            ? 'Form is shown before chat starts.'
                            : 'Visitors chat directly without a form.'}
                    </p>
                    <Toggle
                        checked={config.preChatForm?.enabled === true}
                        onChange={(v) => {
                            setConfig((c) => ({
                                ...c,
                                preChatForm: {
                                    ...c.preChatForm,
                                    enabled: v,
                                    welcomeMessage:
                                        c.preChatForm?.welcomeMessage ??
                                        'Please share your details to start.',
                                    fields: c.preChatForm?.fields?.length
                                        ? c.preChatForm.fields
                                        : [
                                              { key: 'name', label: 'Name', required: false },
                                              { key: 'email', label: 'Email', required: true },
                                              { key: 'phone', label: 'Phone', required: false },
                                          ],
                                },
                            }));
                        }}
                    />
                </div>

                {config.preChatForm?.enabled && (
                    <div className="mt-5 pt-5 border-t border-slate-900/[0.06] space-y-4">
                        <div>
                            <FieldLabel icon={MessageSquare}>Form welcome message</FieldLabel>
                            <TextInput
                                value={config.preChatForm?.welcomeMessage ?? ''}
                                onChange={(e) =>
                                    setConfig((c) => ({
                                        ...c,
                                        preChatForm: {
                                            ...c.preChatForm!,
                                            welcomeMessage: e.target.value,
                                        },
                                    }))
                                }
                                placeholder="Please share your details to start."
                            />
                        </div>

                        <div>
                            <FieldLabel icon={Webhook}>Webhook URL (on new lead)</FieldLabel>
                            <TextInput
                                value={config.leadCaptureWebhookUrl ?? ''}
                                onChange={(e) =>
                                    handleChange('leadCaptureWebhookUrl', e.target.value)
                                }
                                placeholder="https://your-server.com/webhook"
                            />
                        </div>

                        <div>
                            <FieldLabel>Required fields</FieldLabel>
                            <div className="flex flex-wrap gap-2">
                                {(['name', 'email', 'phone'] as const).map((key) => {
                                    const required =
                                        config.preChatForm?.fields?.some(
                                            (f) => f.key === key && f.required
                                        ) ?? false;
                                    return (
                                        <button
                                            key={key}
                                            type="button"
                                            onClick={() => {
                                                const fields = config.preChatForm?.fields ?? [
                                                    { key: 'name', label: 'Name', required: false },
                                                    { key: 'email', label: 'Email', required: true },
                                                    { key: 'phone', label: 'Phone', required: false },
                                                ];
                                                const next = fields.map((f) =>
                                                    f.key === key
                                                        ? { ...f, required: !required }
                                                        : f
                                                );
                                                setConfig((c) => ({
                                                    ...c,
                                                    preChatForm: {
                                                        ...c.preChatForm!,
                                                        fields: next,
                                                    },
                                                }));
                                            }}
                                            className={cn(
                                                'inline-flex items-center gap-1.5 px-3 h-7 rounded-md text-[12px] font-semibold tracking-tight transition-all border',
                                                required
                                                    ? 'bg-indigo-600 text-white border-indigo-600'
                                                    : 'bg-white text-slate-600 border-slate-900/[0.08] hover:border-slate-900/[0.12]'
                                            )}
                                        >
                                            <span className="capitalize">{key}</span>
                                            <span
                                                className={cn(
                                                    'text-[10px] uppercase tracking-wider',
                                                    required ? 'text-white/80' : 'text-slate-400'
                                                )}
                                            >
                                                {required ? 'required' : 'optional'}
                                            </span>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                )}
            </SectionCard>

            {/* No-answer message */}
            <SectionCard
                icon={MessageSquare}
                title="No-answer fallback"
                description="Shown when the bot can’t find relevant info in your knowledge base."
            >
                <TextArea
                    value={config.noAnswerMessage ?? ''}
                    onChange={(e) => handleChange('noAnswerMessage', e.target.value)}
                    placeholder="e.g. Sorry — I don’t have that info yet. Please contact support."
                    rows={3}
                />
            </SectionCard>

            {/* Toggles */}
            <SectionCard
                icon={Shield}
                title="Footer & escalation"
                description="Branding visibility and live-agent option."
            >
                <div className="space-y-3">
                    <div className="flex items-center justify-between p-3.5 rounded-lg bg-[#FAFAFA] border border-slate-900/[0.06]">
                        <div className="min-w-0">
                            <p className="text-[13px] font-semibold tracking-tight text-slate-900">
                                Show “Powered by” badge
                            </p>
                            <p className="text-[11.5px] text-slate-500 mt-0.5">
                                {whitelabel
                                    ? 'Branding removed (included in your Business/Enterprise plan).'
                                    : 'Display branding in the widget footer.'}
                            </p>
                        </div>
                        {whitelabel ? (
                            <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-emerald-600">
                                Off
                            </span>
                        ) : (
                            <Toggle
                                checked={config.showPoweredBy !== false}
                                onChange={(v) => handleChange('showPoweredBy', v)}
                            />
                        )}
                    </div>

                    <div className="flex items-center justify-between p-3.5 rounded-lg bg-[#FAFAFA] border border-slate-900/[0.06]">
                        <div className="min-w-0">
                            <p className="text-[13px] font-semibold tracking-tight text-slate-900">
                                Allow “Talk to Human”
                            </p>
                            <p className="text-[11.5px] text-slate-500 mt-0.5">
                                Show a button to escalate to a live agent.
                            </p>
                        </div>
                        <Toggle
                            checked={config.allowTalkToHuman === true}
                            onChange={(v) => handleChange('allowTalkToHuman', v)}
                        />
                    </div>
                </div>
            </SectionCard>

            {/* Custom CSS */}
            <SectionCard
                icon={Code2}
                title="Custom CSS"
                description="Optional — use selector #chatbot-widget-container to style the widget."
            >
                <TextArea
                    value={config.customCss ?? ''}
                    onChange={(e) => handleChange('customCss', e.target.value)}
                    placeholder="#chatbot-widget-container { ... }"
                    rows={5}
                    className="font-mono text-[12px]"
                />
            </SectionCard>

            {/* Save bar */}
            <div className="flex justify-end">
                <PrimaryBtn icon={Save} onClick={handleSave} disabled={saving}>
                    {saving ? 'Saving…' : 'Save changes'}
                </PrimaryBtn>
            </div>
        </div>
    );
}
