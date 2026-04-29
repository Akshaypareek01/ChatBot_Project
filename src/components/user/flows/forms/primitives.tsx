/**
 * Tiny styled inputs reused across every per-type form. Kept here so the
 * per-type forms stay focused on schema bindings and don\u2019t each redefine
 * the same `<input>` markup.
 */

import React from 'react';
import { cn } from '@/lib/utils';

export const Field: React.FC<{
    label: React.ReactNode;
    hint?: React.ReactNode;
    children: React.ReactNode;
    className?: string;
    htmlFor?: string;
}> = ({ label, hint, children, className, htmlFor }) => (
    <div className={cn('space-y-1.5', className)}>
        <label
            htmlFor={htmlFor}
            className="text-[10.5px] font-semibold uppercase tracking-[0.14em] text-slate-500"
        >
            {label}
        </label>
        {children}
        {hint ? (
            <p className="text-[11px] text-slate-500 leading-relaxed">{hint}</p>
        ) : null}
    </div>
);

export const TextInput = React.forwardRef<
    HTMLInputElement,
    React.InputHTMLAttributes<HTMLInputElement>
>(({ className, ...props }, ref) => (
    <input
        ref={ref}
        {...props}
        className={cn(
            'w-full h-9 px-2.5 rounded-md bg-white border border-slate-900/[0.08] text-[13px] text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/25 focus:border-indigo-500/60 transition-colors',
            className
        )}
    />
));
TextInput.displayName = 'TextInput';

export const TextArea = React.forwardRef<
    HTMLTextAreaElement,
    React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(({ className, ...props }, ref) => (
    <textarea
        ref={ref}
        {...props}
        className={cn(
            'w-full px-2.5 py-2 rounded-md bg-white border border-slate-900/[0.08] text-[13px] leading-relaxed text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/25 focus:border-indigo-500/60 transition-colors resize-y',
            className
        )}
    />
));
TextArea.displayName = 'TextArea';

export const Select: React.FC<
    React.SelectHTMLAttributes<HTMLSelectElement>
> = ({ className, children, ...props }) => (
    <select
        {...props}
        className={cn(
            'w-full h-9 px-2.5 rounded-md bg-white border border-slate-900/[0.08] text-[13px] text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/25 focus:border-indigo-500/60 transition-colors',
            className
        )}
    >
        {children}
    </select>
);

export const InlineRow: React.FC<{
    children: React.ReactNode;
    className?: string;
}> = ({ children, className }) => (
    <div className={cn('flex items-center gap-2', className)}>{children}</div>
);

export const Divider: React.FC<{ children?: React.ReactNode }> = ({ children }) => (
    <div className="flex items-center gap-2 my-2">
        <div className="flex-1 h-px bg-slate-900/[0.06]" />
        {children ? (
            <span className="text-[10.5px] font-semibold uppercase tracking-[0.14em] text-slate-400">
                {children}
            </span>
        ) : null}
        <div className="flex-1 h-px bg-slate-900/[0.06]" />
    </div>
);

export const Pill: React.FC<{
    children: React.ReactNode;
    tone?: 'neutral' | 'indigo' | 'rose' | 'emerald';
    className?: string;
}> = ({ children, tone = 'neutral', className }) => {
    const tones: Record<string, string> = {
        neutral: 'bg-slate-900/[0.04] text-slate-700',
        indigo: 'bg-indigo-500/10 text-indigo-700',
        rose: 'bg-rose-500/10 text-rose-700',
        emerald: 'bg-emerald-500/10 text-emerald-700',
    };
    return (
        <span
            className={cn(
                'inline-flex items-center h-5 px-2 rounded-full text-[10.5px] font-semibold uppercase tracking-[0.1em]',
                tones[tone],
                className
            )}
        >
            {children}
        </span>
    );
};

export const SmallButton: React.FC<
    React.ButtonHTMLAttributes<HTMLButtonElement> & {
        tone?: 'default' | 'danger';
    }
> = ({ className, tone = 'default', ...props }) => (
    <button
        type="button"
        {...props}
        className={cn(
            'inline-flex items-center gap-1 h-7 px-2.5 rounded-md border text-[11.5px] font-medium transition-colors',
            tone === 'danger'
                ? 'border-rose-200/70 text-rose-700 hover:bg-rose-50'
                : 'border-slate-900/[0.08] text-slate-700 hover:bg-slate-900/[0.03] hover:text-slate-950',
            className
        )}
    />
);
