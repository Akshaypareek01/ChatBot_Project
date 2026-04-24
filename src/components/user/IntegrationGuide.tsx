import React, { useState } from 'react';
import {
    Dialog,
    DialogContent,
    DialogTrigger,
} from '@/components/ui/dialog';
import {
    Code2,
    Copy,
    Check,
    Info,
    X,
    ArrowRight,
    ChevronRight,
} from 'lucide-react';
import { toast } from 'sonner';
import { API_URL } from '@/services/api';
import { cn } from '@/lib/utils';

interface TabData {
    tabId: string;
    tabTitle: string;
    steps: string[];
    code: string;
    notes: string[];
}

interface IntegrationItem {
    id: string;
    title: string;
    shortTitle?: string;
    description: string;
    steps?: string[];
    code?: string;
    notes?: string[];
    tabs?: TabData[];
}

const getDefaultScriptUrl = () => {
    const baseUrl = API_URL.replace(/\/api$/, '');
    return `${baseUrl}/chatbot.js`;
};

/** Platform tile — small, monochrome initial badge with accent color. */
const PlatformBadge: React.FC<{ id: string; className?: string }> = ({
    id,
    className,
}) => {
    const map: Record<string, { label: string; bg: string; fg: string }> = {
        html: { label: '< >', bg: 'bg-orange-500/10', fg: 'text-orange-600' },
        wordpress: { label: 'W', bg: 'bg-sky-500/10', fg: 'text-sky-600' },
        react: { label: 'R', bg: 'bg-cyan-500/10', fg: 'text-cyan-600' },
        nextjs: { label: 'N', bg: 'bg-slate-900/[0.06]', fg: 'text-slate-900' },
        shopify: { label: 'S', bg: 'bg-emerald-500/10', fg: 'text-emerald-600' },
        wix: { label: 'W', bg: 'bg-blue-500/10', fg: 'text-blue-600' },
        squarespace: {
            label: 'Sq',
            bg: 'bg-slate-900/[0.06]',
            fg: 'text-slate-900',
        },
        other: { label: '••', bg: 'bg-slate-900/[0.04]', fg: 'text-slate-500' },
    };
    const entry = map[id] ?? map.other;
    return (
        <div
            className={cn(
                'inline-flex items-center justify-center w-9 h-9 rounded-lg text-[13px] font-bold tracking-tight',
                entry.bg,
                entry.fg,
                className
            )}
        >
            {entry.label}
        </div>
    );
};

/** Syntax-highlighted script code block, matching ScriptGenerator. */
const CodeBlock: React.FC<{
    code: string;
    filename?: string;
    onCopy: () => void;
    copied: boolean;
}> = ({ code, filename, onCopy, copied }) => (
    <div className="rounded-lg border border-slate-900/[0.08] bg-white overflow-hidden">
        <div className="flex items-center justify-between px-3.5 h-9 border-b border-slate-900/[0.06] bg-[#FAFAFA]">
            <div className="flex items-center gap-2 text-[11px] font-medium text-slate-500 font-mono">
                {filename || 'snippet.html'}
            </div>
            <button
                onClick={onCopy}
                className={cn(
                    'inline-flex items-center gap-1.5 h-6 px-2 rounded text-[11px] font-semibold tracking-tight transition-colors',
                    copied
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : 'bg-white text-slate-600 border border-slate-900/[0.08] hover:text-slate-950 hover:border-slate-900/20'
                )}
            >
                {copied ? (
                    <>
                        <Check className="w-3 h-3" strokeWidth={2.25} />
                        Copied
                    </>
                ) : (
                    <>
                        <Copy className="w-3 h-3" strokeWidth={2} />
                        Copy
                    </>
                )}
            </button>
        </div>
        <pre className="px-3.5 py-3 text-[12px] font-mono leading-relaxed text-slate-800 whitespace-pre-wrap break-all overflow-x-auto">
            <code>{code}</code>
        </pre>
    </div>
);

const IntegrationGuide = ({ userId }: { userId: string }) => {
    const [copied, setCopied] = useState<string | null>(null);
    const [openId, setOpenId] = useState<string | null>(null);
    const scriptUrl = getDefaultScriptUrl();

    const applyVars = (code: string) =>
        code
            .replace('{{USER_ID}}', userId)
            .replace('https://api.yourdomain.com/chatbot.js', scriptUrl);

    const handleCopy = (code: string, id: string) => {
        navigator.clipboard.writeText(applyVars(code));
        setCopied(id);
        toast.success('Code copied to clipboard');
        setTimeout(() => setCopied(null), 2000);
    };

    const integrationData: IntegrationItem[] = [
        {
            id: 'html',
            title: 'HTML / Static',
            shortTitle: 'HTML',
            description: 'Plain HTML, PHP, or static hosting',
            steps: [
                'Open your index.html or main layout file',
                'Paste the script just before the closing </body> tag',
                'Save and deploy your website',
            ],
            code: `<script\n  src="https://api.yourdomain.com/chatbot.js"\n  data-user-id="{{USER_ID}}"\n  data-bot-id="default"\n  defer\n></script>`,
            notes: [
                'Works on any static or custom-built website',
                'No framework or plugin required',
            ],
        },
        {
            id: 'wordpress',
            title: 'WordPress',
            description: 'Gutenberg, Elementor, Classic Editor',
            steps: [
                'Login to your WordPress Admin Dashboard',
                'Open any page and add a Custom HTML block',
                'Paste the script and click Save / Update',
            ],
            code: `<script\n  src="https://api.yourdomain.com/chatbot.js"\n  data-user-id="{{USER_ID}}"\n  data-bot-id="default"\n  defer\n></script>`,
            notes: [
                'You can also add this using a Header/Footer plugin',
                'Clear cache if your site uses caching plugins',
            ],
        },
        {
            id: 'react',
            title: 'React',
            description: 'CRA, Vite, SPA projects',
            steps: [
                'Open the public/index.html file in your React project',
                'Paste the script just before the closing </body> tag',
                'Rebuild and redeploy your React app',
            ],
            code: `<script\n  src="https://api.yourdomain.com/chatbot.js"\n  data-user-id="{{USER_ID}}"\n  data-bot-id="default"\n  defer\n></script>`,
            notes: [
                'Recommended to add in index.html instead of React components',
                'Avoid adding the script multiple times',
            ],
        },
        {
            id: 'nextjs',
            title: 'Next.js',
            description: 'App Router and Pages Router',
            tabs: [
                {
                    tabId: 'app-router',
                    tabTitle: 'App Router (13+)',
                    steps: [
                        'Open your layout.tsx or layout.jsx file',
                        'Import the Next.js Script component',
                        "Add the chatbot script using strategy='afterInteractive'",
                    ],
                    code: `import Script from "next/script";\n\n<Script\n  src="https://api.yourdomain.com/chatbot.js"\n  data-user-id="{{USER_ID}}"\n  data-bot-id="default"\n  strategy="afterInteractive"\n/>`,
                    notes: [
                        'Ensures the script runs only on the client side',
                        'Prevents server-side rendering issues',
                    ],
                },
                {
                    tabId: 'pages-router',
                    tabTitle: 'Pages Router',
                    steps: [
                        'Open pages/_document.js',
                        'Add the script before the closing </body> tag',
                        'Save and redeploy your application',
                    ],
                    code: `<script\n  src="https://api.yourdomain.com/chatbot.js"\n  data-user-id="{{USER_ID}}"\n  data-bot-id="default"\n  defer\n></script>`,
                    notes: [
                        'Works for all older Next.js projects',
                        'Do not place inside server-side code',
                    ],
                },
            ],
        },
        {
            id: 'shopify',
            title: 'Shopify',
            description: 'Online store themes',
            steps: [
                'Login to Shopify Admin',
                'Go to Online Store → Themes',
                'Edit theme.liquid file',
                'Paste the script just before the closing </body> tag',
                'Save your changes',
            ],
            code: `<script\n  src="https://api.yourdomain.com/chatbot.js"\n  data-user-id="{{USER_ID}}"\n  data-bot-id="default"\n  defer\n></script>`,
            notes: [
                'This will load the chatbot on all store pages',
                'No app installation required',
            ],
        },
        {
            id: 'wix',
            title: 'Wix',
            description: 'Wix website builder',
            steps: [
                'In Wix Editor, go to Settings → Custom Code',
                'Add a new code snippet (Body - end)',
                'Paste the script and apply to all pages',
                'Publish your site',
            ],
            code: `<script\n  src="https://api.yourdomain.com/chatbot.js"\n  data-user-id="{{USER_ID}}"\n  data-bot-id="default"\n  defer\n></script>`,
            notes: [
                "Use 'Body - end' so the script loads after page content",
                'Clear Wix cache after adding the code',
            ],
        },
        {
            id: 'squarespace',
            title: 'Squarespace',
            description: 'Squarespace 7 and 7.1',
            steps: [
                'Go to Settings → Advanced → Code Injection',
                'Paste the script in the Footer section',
                'Save and refresh your site',
            ],
            code: `<script\n  src="https://api.yourdomain.com/chatbot.js"\n  data-user-id="{{USER_ID}}"\n  data-bot-id="default"\n  defer\n></script>`,
            notes: [
                'Footer code runs on every page',
                'For Squarespace 7.1, use Code Injection site-wide settings',
            ],
        },
        {
            id: 'other',
            title: 'Custom',
            description: 'Any platform not listed above',
            steps: [
                'Locate the main layout or footer file of your website',
                'Paste the chatbot script before </body>',
                'Deploy your website',
            ],
            code: `<script\n  src="https://api.yourdomain.com/chatbot.js"\n  data-user-id="{{USER_ID}}"\n  data-bot-id="default"\n  defer\n></script>`,
            notes: [
                'Works on any platform that supports HTML',
                'If unsure, contact your website developer',
            ],
        },
    ];

    /** Sub-component: body of the modal for a given item. */
    const IntegrationBody: React.FC<{ item: IntegrationItem }> = ({ item }) => {
        const [activeTab, setActiveTab] = useState<string>(
            item.tabs ? item.tabs[0].tabId : ''
        );

        const renderSection = (d: {
            steps: string[];
            code: string;
            notes: string[];
            copyKey: string;
        }) => (
            <div className="space-y-5">
                {/* Steps */}
                <div>
                    <p className="text-[10.5px] font-semibold uppercase tracking-[0.14em] text-slate-500 mb-2.5">
                        Steps
                    </p>
                    <ol className="space-y-2">
                        {d.steps.map((step, idx) => (
                            <li
                                key={idx}
                                className="flex items-start gap-2.5 text-[13px] text-slate-700 leading-relaxed"
                            >
                                <span className="mt-[3px] w-4 h-4 rounded-full bg-slate-900 text-white text-[10px] font-semibold flex items-center justify-center flex-shrink-0">
                                    {idx + 1}
                                </span>
                                <span>{step}</span>
                            </li>
                        ))}
                    </ol>
                </div>

                {/* Code */}
                <div>
                    <p className="text-[10.5px] font-semibold uppercase tracking-[0.14em] text-slate-500 mb-2.5">
                        Script
                    </p>
                    <CodeBlock
                        code={applyVars(d.code)}
                        filename={`${item.id}.snippet`}
                        onCopy={() => handleCopy(d.code, d.copyKey)}
                        copied={copied === d.copyKey}
                    />
                </div>

                {/* Notes */}
                {d.notes.length > 0 && (
                    <div className="rounded-lg border border-indigo-200/60 bg-indigo-50/40 px-3.5 py-3">
                        <div className="flex items-center gap-1.5 mb-1.5">
                            <Info
                                className="w-3.5 h-3.5 text-indigo-600"
                                strokeWidth={2}
                            />
                            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-indigo-700">
                                Implementation notes
                            </p>
                        </div>
                        <ul className="space-y-1">
                            {d.notes.map((n, idx) => (
                                <li
                                    key={idx}
                                    className="text-[12.5px] text-indigo-900/80 leading-relaxed pl-0.5"
                                >
                                    · {n}
                                </li>
                            ))}
                        </ul>
                    </div>
                )}
            </div>
        );

        if (item.tabs) {
            const activeData =
                item.tabs.find((t) => t.tabId === activeTab) ?? item.tabs[0];
            return (
                <div className="space-y-5">
                    {/* Segmented pill toggle */}
                    <div className="inline-flex items-center gap-0.5 p-0.5 rounded-lg bg-slate-900/[0.04] border border-slate-900/[0.06]">
                        {item.tabs.map((t) => (
                            <button
                                key={t.tabId}
                                onClick={() => setActiveTab(t.tabId)}
                                className={cn(
                                    'px-3 h-7 rounded-md text-[12px] font-semibold tracking-tight transition-all',
                                    activeTab === t.tabId
                                        ? 'bg-white text-slate-950 shadow-[0_1px_2px_rgba(15,23,42,0.08)]'
                                        : 'text-slate-600 hover:text-slate-900'
                                )}
                            >
                                {t.tabTitle}
                            </button>
                        ))}
                    </div>
                    {renderSection({
                        steps: activeData.steps,
                        code: activeData.code,
                        notes: activeData.notes,
                        copyKey: `${item.id}-${activeData.tabId}`,
                    })}
                </div>
            );
        }

        return renderSection({
            steps: item.steps || [],
            code: item.code || '',
            notes: item.notes || [],
            copyKey: item.id,
        });
    };

    return (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5">
            {integrationData.map((item) => (
                <Dialog
                    key={item.id}
                    open={openId === item.id}
                    onOpenChange={(o) => setOpenId(o ? item.id : null)}
                >
                    <DialogTrigger asChild>
                        <button
                            type="button"
                            className="group text-left rounded-lg bg-white border border-slate-900/[0.06] hover:border-slate-900/[0.12] hover:shadow-[0_8px_24px_-12px_rgba(15,23,42,0.12)] transition-all p-3.5"
                        >
                            <div className="flex items-start justify-between mb-2.5">
                                <PlatformBadge id={item.id} />
                                <ChevronRight
                                    className="w-3.5 h-3.5 text-slate-300 group-hover:text-indigo-600 group-hover:translate-x-0.5 transition-all mt-1.5"
                                    strokeWidth={2}
                                />
                            </div>
                            <p className="text-[13px] font-semibold tracking-tight text-slate-950 leading-tight">
                                {item.shortTitle ?? item.title}
                            </p>
                            <p className="mt-0.5 text-[11.5px] text-slate-500 leading-snug line-clamp-2">
                                {item.description}
                            </p>
                        </button>
                    </DialogTrigger>

                    <DialogContent
                        className="max-w-2xl max-h-[90vh] overflow-y-auto p-0 rounded-xl border border-slate-900/[0.08] bg-white shadow-[0_24px_80px_-24px_rgba(15,23,42,0.25)]"
                        onInteractOutside={() => setOpenId(null)}
                    >
                        {/* Header */}
                        <div className="px-6 py-4 border-b border-slate-900/[0.06] flex items-start justify-between gap-4">
                            <div className="flex items-center gap-3">
                                <PlatformBadge id={item.id} />
                                <div>
                                    <div className="inline-flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-indigo-600 mb-0.5">
                                        <span className="w-3 h-px bg-indigo-600" />
                                        Install guide
                                    </div>
                                    <h3 className="text-[16px] font-semibold tracking-[-0.01em] text-slate-950 leading-tight">
                                        {item.title}
                                    </h3>
                                    <p className="text-[12px] text-slate-500 mt-0.5">
                                        {item.description}
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={() => setOpenId(null)}
                                className="w-7 h-7 rounded-md text-slate-400 hover:text-slate-900 hover:bg-slate-900/[0.04] flex items-center justify-center transition-colors flex-shrink-0"
                                aria-label="Close"
                            >
                                <X className="w-4 h-4" strokeWidth={2} />
                            </button>
                        </div>

                        {/* Body */}
                        <div className="px-6 py-5">
                            <IntegrationBody item={item} />
                        </div>

                        {/* Footer */}
                        <div className="px-6 py-3 border-t border-slate-900/[0.06] bg-[#FAFAFA] flex items-center justify-between">
                            <p className="inline-flex items-center gap-1.5 text-[11.5px] text-slate-500">
                                <Code2 className="w-3 h-3" strokeWidth={2} />
                                Your unique script is pre-filled — just copy & paste.
                            </p>
                            <button
                                onClick={() => setOpenId(null)}
                                className="inline-flex items-center gap-1 h-7 px-3 rounded-md bg-slate-950 text-white text-[12px] font-semibold hover:bg-slate-800 transition-colors"
                            >
                                Done
                                <ArrowRight className="w-3 h-3" strokeWidth={2} />
                            </button>
                        </div>
                    </DialogContent>
                </Dialog>
            ))}
        </div>
    );
};

export default IntegrationGuide;
