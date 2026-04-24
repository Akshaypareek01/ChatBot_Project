import React, { useState } from 'react';
import { ClipboardCopy, Check, Terminal } from 'lucide-react';
import { toast } from 'sonner';
import { API_URL } from '@/services/api';
import { cn } from '@/lib/utils';

interface ScriptGeneratorProps {
    userId: string;
    scriptUrl?: string;
    websiteDomain?: string;
    /** Phase 3.5: bot slug for multi-bot (data-bot-id attribute) */
    botSlug?: string | null;
}

// Derive the chatbot script URL from API_URL
// API_URL is like 'http://localhost:5001/api', we need 'http://localhost:5001/chatbot.js'
const getDefaultScriptUrl = () => {
    // Use regex to only replace /api at the end to avoid matching subdomains like 'apis'
    const baseUrl = API_URL.replace(/\/api$/, '');
    return `${baseUrl}/chatbot.js`;
};

const ScriptGenerator: React.FC<ScriptGeneratorProps> = ({
    userId,
    scriptUrl = getDefaultScriptUrl(),
    websiteDomain,
    botSlug,
}) => {
    const [copied, setCopied] = useState(false);

    const botAttr = botSlug ? ` data-bot-id="${botSlug}"` : '';
    const scriptCode = `<script src="${scriptUrl}" data-user-id="${userId}"${botAttr} defer></script>`;

    const handleCopy = () => {
        navigator.clipboard.writeText(scriptCode);
        setCopied(true);
        toast.success('Script copied to clipboard');
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="rounded-lg border border-slate-900/[0.08] bg-white overflow-hidden">
            {/* Top bar — filename/breadcrumb style */}
            <div className="flex items-center justify-between px-4 h-10 border-b border-slate-900/[0.06] bg-[#FAFAFA]">
                <div className="flex items-center gap-2 text-[11.5px] font-medium text-slate-600">
                    <Terminal className="w-3.5 h-3.5 text-slate-400" strokeWidth={2} />
                    <span className="font-mono text-slate-500">index.html</span>
                    {websiteDomain && (
                        <>
                            <span className="text-slate-300">·</span>
                            <span className="truncate max-w-[180px]">{websiteDomain}</span>
                        </>
                    )}
                </div>
                <button
                    onClick={handleCopy}
                    className={cn(
                        'inline-flex items-center gap-1.5 h-7 px-2.5 rounded-md text-[11.5px] font-semibold tracking-tight transition-all',
                        copied
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-white text-slate-700 border border-slate-900/[0.08] hover:text-slate-950 hover:border-slate-900/20'
                    )}
                >
                    {copied ? (
                        <>
                            <Check className="w-3 h-3" strokeWidth={2.25} />
                            Copied
                        </>
                    ) : (
                        <>
                            <ClipboardCopy className="w-3 h-3" strokeWidth={2} />
                            Copy
                        </>
                    )}
                </button>
            </div>

            {/* Code block */}
            <div className="px-4 py-3.5 bg-white">
                <pre className="text-[12.5px] font-mono leading-relaxed text-slate-800 whitespace-pre-wrap break-all">
                    <code>
                        <span className="text-slate-400">{'<'}</span>
                        <span className="text-rose-600">script</span>{' '}
                        <span className="text-violet-600">src</span>
                        <span className="text-slate-400">=</span>
                        <span className="text-emerald-700">"{scriptUrl}"</span>{' '}
                        <span className="text-violet-600">data-user-id</span>
                        <span className="text-slate-400">=</span>
                        <span className="text-emerald-700">"{userId}"</span>
                        {botSlug && (
                            <>
                                {' '}
                                <span className="text-violet-600">data-bot-id</span>
                                <span className="text-slate-400">=</span>
                                <span className="text-emerald-700">"{botSlug}"</span>
                            </>
                        )}{' '}
                        <span className="text-violet-600">defer</span>
                        <span className="text-slate-400">{'></'}</span>
                        <span className="text-rose-600">script</span>
                        <span className="text-slate-400">{'>'}</span>
                    </code>
                </pre>
            </div>

            {/* Footer hint */}
            <div className="px-4 py-2.5 border-t border-slate-900/[0.06] bg-[#FAFAFA] flex items-center justify-between">
                <p className="text-[11px] text-slate-500">
                    Paste this just before the closing{' '}
                    <code className="font-mono text-slate-700 bg-white px-1 py-0.5 rounded border border-slate-900/[0.06]">
                        &lt;/body&gt;
                    </code>{' '}
                    tag.
                </p>
            </div>
        </div>
    );
};

export default ScriptGenerator;
