import React, { useState, useEffect } from 'react';
import {
    Plus,
    Search,
    Edit3,
    Trash2,
    Save,
    X,
    MessageSquare,
    FileUp,
    Globe,
    Loader2,
    Database,
    File as FileIcon,
    ExternalLink,
    Wallet,
    FileText,
    RefreshCw,
    Sparkles,
    Filter,
    ArrowRight,
    Check,
    AlertTriangle,
} from 'lucide-react';
import { toast } from 'sonner';
import {
    Dialog,
    DialogContent,
} from '@/components/ui/dialog';
import {
    getCurrentUserQAs,
    createUserQA,
    updateUserQA,
    deleteUserQA,
    getSuggestedQAs,
    addSuggestedQAToQA,
    dismissSuggestedQA,
    uploadFile,
    scrapeWebsite,
    getScrapeStatus,
    addPasteSource,
    updateSource,
    getUserSources,
    getSourcesHealth,
} from '@/services/api';
import { cn } from '@/lib/utils';

interface QA {
    _id: string;
    question: string;
    answer: string;
    category: string;
    frequency: number;
    createdAt: string;
    updatedAt: string;
}

interface Source {
    _id: string;
    type: 'file' | 'website' | 'paste';
    fileName?: string;
    fileSize?: number;
    url?: string;
    pasteTitle?: string;
    scrapeSchedule?: string;
    lastScrapedAt?: string | null;
    pageCount?: number;
    status: string;
    createdAt: string;
    updatedAt: string;
}

interface KBHealth {
    totalChunks: number;
    totalSources: number;
    lastUpdated: string | null;
    byType?: Record<string, number>;
}

interface SuggestedQAItem {
    _id: string;
    question: string;
    source: 'no_context' | 'low_confidence' | 'manual';
    conversationId?: string;
    createdAt: string;
}

const CATEGORIES = ['General', 'Orders', 'Returns', 'Shipping', 'Support', 'Pricing', 'Technical'];

type TabId = 'qa' | 'upload' | 'scrape' | 'paste' | 'sources' | 'suggested';

const TABS: { id: TabId; label: string; icon: React.ElementType }[] = [
    { id: 'qa', label: 'Q&A pairs', icon: MessageSquare },
    { id: 'upload', label: 'Upload file', icon: FileUp },
    { id: 'scrape', label: 'Scrape website', icon: Globe },
    { id: 'paste', label: 'Paste text', icon: FileText },
    { id: 'sources', label: 'Data sources', icon: Database },
    { id: 'suggested', label: 'Suggested', icon: Sparkles },
];

/* -------------------------------------------------------------------------- */
/* Shared primitives                                                           */
/* -------------------------------------------------------------------------- */

const FieldLabel: React.FC<{ htmlFor?: string; children: React.ReactNode }> = ({
    htmlFor,
    children,
}) => (
    <label
        htmlFor={htmlFor}
        className="block text-[10.5px] font-semibold uppercase tracking-[0.14em] text-slate-500 mb-1.5"
    >
        {children}
    </label>
);

const TextInput: React.FC<React.InputHTMLAttributes<HTMLInputElement>> = ({
    className,
    ...rest
}) => (
    <input
        {...rest}
        className={cn(
            'w-full h-9 px-3 rounded-md bg-white border border-slate-900/[0.08] text-[13px] text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500/60 transition-colors',
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
            'w-full px-3 py-2.5 rounded-md bg-white border border-slate-900/[0.08] text-[13px] text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500/60 transition-colors resize-y leading-relaxed',
            className
        )}
    />
);

const PrimaryBtn: React.FC<
    React.ButtonHTMLAttributes<HTMLButtonElement> & { icon?: React.ReactNode }
> = ({ children, icon, className, ...props }) => (
    <button
        {...props}
        className={cn(
            'inline-flex items-center gap-2 h-9 px-3.5 rounded-md bg-slate-950 text-white text-[13px] font-semibold tracking-tight hover:bg-slate-800 transition-colors disabled:opacity-60 disabled:cursor-not-allowed',
            className
        )}
    >
        {icon}
        {children}
    </button>
);

const GhostBtn: React.FC<
    React.ButtonHTMLAttributes<HTMLButtonElement> & { icon?: React.ReactNode }
> = ({ children, icon, className, ...props }) => (
    <button
        {...props}
        className={cn(
            'inline-flex items-center gap-1.5 h-9 px-3 rounded-md bg-white border border-slate-900/[0.08] text-[13px] font-semibold tracking-tight text-slate-700 hover:text-slate-950 hover:border-slate-900/20 transition-colors disabled:opacity-60 disabled:cursor-not-allowed',
            className
        )}
    >
        {icon}
        {children}
    </button>
);

const SectionCard: React.FC<{
    title: string;
    desc?: string;
    icon: React.ElementType;
    children: React.ReactNode;
    className?: string;
}> = ({ title, desc, icon: Icon, children, className }) => (
    <div
        className={cn(
            'rounded-xl border border-slate-900/[0.06] bg-white overflow-hidden',
            className
        )}
    >
        <div className="px-5 py-4 border-b border-slate-900/[0.06] flex items-start gap-2.5">
            <div className="w-7 h-7 rounded-md bg-slate-900/[0.04] text-slate-700 flex items-center justify-center flex-shrink-0 mt-0.5">
                <Icon className="w-[14px] h-[14px]" strokeWidth={1.75} />
            </div>
            <div>
                <h3 className="text-[13.5px] font-semibold tracking-tight text-slate-950">
                    {title}
                </h3>
                {desc && (
                    <p className="text-[12px] text-slate-500 mt-0.5 leading-snug">
                        {desc}
                    </p>
                )}
            </div>
        </div>
        <div className="p-5">{children}</div>
    </div>
);

const sourceStatusPill = (status: string) => {
    const s = status.toLowerCase();
    if (s === 'indexed' || s === 'processed_and_deleted')
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    if (s === 'failed' || s === 'error')
        return 'bg-rose-50 text-rose-700 border-rose-200';
    if (s === 'processing' || s === 'pending' || s === 'indexing')
        return 'bg-amber-50 text-amber-700 border-amber-200';
    return 'bg-slate-100 text-slate-600 border-slate-200';
};

const suggestedSourceLabel = (s: SuggestedQAItem['source']) => {
    switch (s) {
        case 'low_confidence':
            return { label: 'Low confidence', cls: 'bg-amber-50 text-amber-700 border-amber-200' };
        case 'no_context':
            return { label: 'No context', cls: 'bg-rose-50 text-rose-700 border-rose-200' };
        default:
            return { label: 'Manual', cls: 'bg-slate-100 text-slate-600 border-slate-200' };
    }
};

/* -------------------------------------------------------------------------- */
/* Page                                                                        */
/* -------------------------------------------------------------------------- */

const UserKnowledgeBase = () => {
    const [qas, setQAs] = useState<QA[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [categoryFilter, setCategoryFilter] = useState('All');
    const [editing, setEditing] = useState<string | null>(null);
    const [formData, setFormData] = useState<Partial<QA>>({
        question: '',
        answer: '',
        category: 'General',
    });
    const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    // Upload
    const [file, setFile] = useState<File | null>(null);
    const [isUploading, setIsUploading] = useState(false);

    // Scrape
    const [scrapeUrl, setScrapeUrl] = useState('');
    const [scrapeMaxDepth, setScrapeMaxDepth] = useState<number>(1);
    const [isScraping, setIsScraping] = useState(false);
    const [scrapeJobId, setScrapeJobId] = useState<string | null>(null);
    const [scrapeProgress, setScrapeProgress] = useState<string | null>(null);

    // Paste
    const [pasteTitle, setPasteTitle] = useState('');
    const [pasteContent, setPasteContent] = useState('');
    const [isPasting, setIsPasting] = useState(false);

    // Sources & health
    const [sources, setSources] = useState<Source[]>([]);
    const [kbHealth, setKbHealth] = useState<KBHealth | null>(null);
    const [isLoadingSources, setIsLoadingSources] = useState(false);

    const [activeTab, setActiveTab] = useState<TabId>('qa');
    const [suggestedList, setSuggestedList] = useState<SuggestedQAItem[]>([]);
    const [isLoadingSuggested, setIsLoadingSuggested] = useState(false);
    const [addToQAModalId, setAddToQAModalId] = useState<string | null>(null);
    const [addToQAAnswer, setAddToQAAnswer] = useState('');

    useEffect(() => {
        fetchQAs();
    }, []);

    useEffect(() => {
        if (activeTab === 'sources') fetchSources();
    }, [activeTab]);

    useEffect(() => {
        if (activeTab === 'suggested') fetchSuggested();
    }, [activeTab]);

    const fetchSuggested = async () => {
        setIsLoadingSuggested(true);
        try {
            const data = await getSuggestedQAs();
            setSuggestedList(Array.isArray(data) ? data : []);
        } catch {
            setSuggestedList([]);
        } finally {
            setIsLoadingSuggested(false);
        }
    };

    const fetchQAs = async () => {
        setIsLoading(true);
        try {
            const data = await getCurrentUserQAs();
            setQAs(data);
        } catch {
            toast.error('Failed to load your Q&A entries');
        } finally {
            setIsLoading(false);
        }
    };

    const fetchSources = async () => {
        setIsLoadingSources(true);
        try {
            const [sourcesRes, healthRes] = await Promise.all([
                getUserSources(),
                getSourcesHealth().catch(() => null),
            ]);
            setSources(sourcesRes.sources || []);
            setKbHealth(healthRes || null);
        } catch {
            toast.error('Failed to load sources');
        } finally {
            setIsLoadingSources(false);
        }
    };

    const filteredQAs = qas.filter((qa) => {
        const matchesSearch =
            qa.question.toLowerCase().includes(searchTerm.toLowerCase()) ||
            qa.answer.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesCategory =
            categoryFilter === 'All' || qa.category === categoryFilter;
        return matchesSearch && matchesCategory;
    });

    const handleInputChange = (
        e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
    ) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
    };

    const handleAddQA = async () => {
        if (!formData.question || !formData.answer || !formData.category) {
            toast.error('Please fill out all fields');
            return;
        }
        try {
            const newQA = await createUserQA({
                question: formData.question,
                answer: formData.answer,
                category: formData.category,
            });
            setQAs((prev) => [...prev, newQA]);
            setFormData({ question: '', answer: '', category: 'General' });
            setIsAddDialogOpen(false);
            toast.success('Q&A added');
        } catch {
            toast.error('Failed to add Q&A');
        }
    };

    const handleEditQA = (id: string) => {
        const qa = qas.find((q) => q._id === id);
        if (qa) {
            setFormData(qa);
            setEditing(id);
        }
    };

    const handleSaveEdit = async () => {
        if (!formData.question || !formData.answer || !formData.category || !editing) {
            toast.error('Please fill out all fields');
            return;
        }
        try {
            await updateUserQA(editing, {
                question: formData.question,
                answer: formData.answer,
                category: formData.category,
            });
            setQAs((prev) =>
                prev.map((qa) =>
                    qa._id === editing
                        ? {
                              ...qa,
                              question: formData.question || '',
                              answer: formData.answer || '',
                              category: formData.category || 'General',
                              updatedAt: new Date().toISOString(),
                          }
                        : qa
                )
            );
            setEditing(null);
            setFormData({ question: '', answer: '', category: 'General' });
            toast.success('Q&A updated');
        } catch {
            toast.error('Failed to update Q&A');
        }
    };

    const handleCancelEdit = () => {
        setEditing(null);
        setFormData({ question: '', answer: '', category: 'General' });
    };

    const handleDeleteQA = async (id: string) => {
        if (!confirm('Delete this Q&A pair?')) return;
        try {
            await deleteUserQA(id);
            setQAs((prev) => prev.filter((qa) => qa._id !== id));
            toast.success('Q&A deleted');
        } catch {
            toast.error('Failed to delete Q&A');
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) setFile(e.target.files[0]);
    };

    const handleUploadFile = async () => {
        if (!file) {
            toast.error('Please select a file to upload');
            return;
        }
        setIsUploading(true);
        try {
            await uploadFile(file);
            toast.success('File uploaded and processed');
            setFile(null);
            const input = document.getElementById('file-upload') as HTMLInputElement;
            if (input) input.value = '';
            fetchSources();
        } catch (error: any) {
            toast.error(error.message || 'Failed to upload file');
        } finally {
            setIsUploading(false);
        }
    };

    const handleScrapeWebsite = async () => {
        if (!scrapeUrl) {
            toast.error('Please enter a URL');
            return;
        }
        setIsScraping(true);
        setScrapeJobId(null);
        setScrapeProgress(null);
        let jobIdResult: string | null = null;
        try {
            const res = await scrapeWebsite(scrapeUrl, { maxDepth: scrapeMaxDepth });
            if (res.jobId) {
                jobIdResult = res.jobId;
                setScrapeJobId(res.jobId);
                setScrapeProgress('Discovering pages…');
                const poll = async () => {
                    try {
                        const status = await getScrapeStatus(res.jobId);
                        if (status.status === 'done') {
                            setScrapeProgress(null);
                            setScrapeJobId(null);
                            setIsScraping(false);
                            toast.success('Website scraped and processed');
                            setScrapeUrl('');
                            fetchSources();
                            return;
                        }
                        if (status.status === 'failed') {
                            setScrapeProgress(null);
                            setScrapeJobId(null);
                            setIsScraping(false);
                            toast.error(status.error || 'Scraping failed');
                            return;
                        }
                        const msg =
                            status.pagesFound != null
                                ? `Pages: ${status.pagesScraped ?? 0} / ${
                                      status.pagesFound
                                  }${status.status === 'indexing' ? ' (indexing…)' : ''}`
                                : 'Discovering pages…';
                        setScrapeProgress(msg);
                        setTimeout(poll, 2000);
                    } catch {
                        setScrapeProgress(null);
                        setScrapeJobId(null);
                        setIsScraping(false);
                        toast.error('Failed to check scrape status');
                    }
                };
                poll();
            } else {
                toast.success('Website scraped and processed');
                setScrapeUrl('');
                fetchSources();
            }
        } catch (error: any) {
            toast.error(error.message || 'Failed to scrape website');
        } finally {
            if (!jobIdResult) setIsScraping(false);
        }
    };

    const handlePasteSubmit = async () => {
        if (!pasteContent.trim()) {
            toast.error('Please enter some text');
            return;
        }
        setIsPasting(true);
        try {
            await addPasteSource(pasteTitle.trim() || 'Pasted text', pasteContent.trim());
            toast.success('Added to knowledge base');
            setPasteTitle('');
            setPasteContent('');
            fetchSources();
        } catch (error: any) {
            toast.error(error.message || 'Failed to add pasted text');
        } finally {
            setIsPasting(false);
        }
    };

    const handleScrapeScheduleChange = async (sourceId: string, schedule: string) => {
        try {
            await updateSource(sourceId, { scrapeSchedule: schedule });
            setSources((prev) =>
                prev.map((s) =>
                    s._id === sourceId ? { ...s, scrapeSchedule: schedule } : s
                )
            );
            toast.success('Schedule updated');
        } catch (error: any) {
            toast.error(error.message || 'Failed to update schedule');
        }
    };

    return (
        <div className="space-y-7">
            {/* Page header */}
            <div>
                <div className="inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-indigo-600 mb-2">
                    <span className="w-6 h-px bg-indigo-600" /> Knowledge
                </div>
                <h1 className="text-3xl sm:text-[34px] font-semibold tracking-[-0.02em] text-slate-950 leading-[1.05]">
                    Knowledge base
                </h1>
                <p className="mt-2 text-[13.5px] text-slate-600">
                    Train your chatbot with Q&A pairs, files, websites, or pasted text.
                </p>
            </div>

            {/* Token pricing card */}
            <div className="rounded-xl border border-indigo-200/60 bg-indigo-50/30 p-5">
                <div className="flex items-start gap-2.5 mb-4">
                    <div className="w-7 h-7 rounded-md bg-indigo-600/10 text-indigo-600 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <Wallet className="w-[14px] h-[14px]" strokeWidth={2} />
                    </div>
                    <div>
                        <h3 className="text-[13.5px] font-semibold tracking-tight text-slate-950">
                            Credit pricing
                        </h3>
                        <p className="text-[12px] text-slate-600 mt-0.5">
                            Approximate credit costs per training action.
                        </p>
                    </div>
                </div>
                <div className="grid gap-3 grid-cols-1 md:grid-cols-3">
                    {[
                        {
                            icon: MessageSquare,
                            color: 'bg-indigo-500/10 text-indigo-600',
                            label: 'Chat message',
                            value: '~1',
                            unit: 'credit / word',
                        },
                        {
                            icon: FileUp,
                            color: 'bg-violet-500/10 text-violet-600',
                            label: 'File upload',
                            value: '10,000',
                            unit: 'credits / file',
                        },
                        {
                            icon: Globe,
                            color: 'bg-emerald-500/10 text-emerald-600',
                            label: 'Website scrape',
                            value: '5,000',
                            unit: 'credits / URL',
                        },
                    ].map((p) => (
                        <div
                            key={p.label}
                            className="rounded-lg bg-white border border-slate-900/[0.06] px-4 py-3"
                        >
                            <div className="flex items-center gap-2 mb-2">
                                <div
                                    className={cn(
                                        'w-6 h-6 rounded-md flex items-center justify-center',
                                        p.color
                                    )}
                                >
                                    <p.icon className="w-[13px] h-[13px]" strokeWidth={2} />
                                </div>
                                <p className="text-[10.5px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                                    {p.label}
                                </p>
                            </div>
                            <div className="flex items-baseline gap-1.5">
                                <span className="text-[20px] font-semibold tracking-[-0.01em] text-slate-950 leading-none">
                                    {p.value}
                                </span>
                                <span className="text-[11.5px] text-slate-500">{p.unit}</span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Tab nav */}
            <div className="overflow-x-auto -mx-1 px-1">
                <div className="inline-flex items-center gap-0.5 p-0.5 rounded-lg bg-slate-900/[0.04] border border-slate-900/[0.06]">
                    {TABS.map((t) => (
                        <button
                            key={t.id}
                            onClick={() => setActiveTab(t.id)}
                            className={cn(
                                'inline-flex items-center gap-1.5 px-3 h-8 rounded-md text-[12px] font-semibold tracking-tight transition-all whitespace-nowrap',
                                activeTab === t.id
                                    ? 'bg-white text-slate-950 shadow-[0_1px_2px_rgba(15,23,42,0.08)]'
                                    : 'text-slate-600 hover:text-slate-900'
                            )}
                        >
                            <t.icon className="w-3.5 h-3.5" strokeWidth={2} />
                            {t.label}
                            {t.id === 'qa' && qas.length > 0 && (
                                <span className="tabular-nums text-[10.5px] text-slate-500">
                                    {qas.length}
                                </span>
                            )}
                            {t.id === 'suggested' && suggestedList.length > 0 && (
                                <span className="ml-0.5 inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-amber-500/15 text-amber-700 text-[10px] font-bold">
                                    {suggestedList.length}
                                </span>
                            )}
                        </button>
                    ))}
                </div>
            </div>

            {/* Q&A tab */}
            {activeTab === 'qa' && (
                <div className="space-y-4">
                    {/* Toolbar */}
                    <div className="flex flex-wrap items-center gap-2.5">
                        <div className="relative flex-1 min-w-[240px]">
                            <Search
                                className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400"
                                strokeWidth={2}
                            />
                            <input
                                placeholder="Search questions or answers…"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full h-9 pl-8 pr-3 rounded-md bg-white border border-slate-900/[0.08] text-[13px] text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500/60 transition-colors"
                            />
                        </div>
                        <div className="inline-flex items-center gap-1.5 h-9 px-2.5 rounded-md bg-white border border-slate-900/[0.08]">
                            <Filter className="w-3.5 h-3.5 text-slate-400" strokeWidth={2} />
                            <select
                                value={categoryFilter}
                                onChange={(e) => setCategoryFilter(e.target.value)}
                                className="bg-transparent text-[12.5px] font-medium text-slate-700 focus:outline-none"
                            >
                                <option value="All">All categories</option>
                                {CATEGORIES.map((c) => (
                                    <option key={c} value={c}>
                                        {c}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <PrimaryBtn
                            onClick={() => {
                                setFormData({ question: '', answer: '', category: 'General' });
                                setIsAddDialogOpen(true);
                            }}
                            icon={<Plus className="w-3.5 h-3.5" strokeWidth={2.25} />}
                        >
                            Add Q&A
                        </PrimaryBtn>
                    </div>

                    {/* List */}
                    <div className="rounded-xl border border-slate-900/[0.06] bg-white overflow-hidden">
                        {isLoading ? (
                            <div className="py-16 flex items-center justify-center">
                                <div className="w-6 h-6 border-2 border-slate-200 border-t-slate-900 rounded-full animate-spin" />
                            </div>
                        ) : filteredQAs.length === 0 ? (
                            <div className="py-16 text-center">
                                <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-slate-900/[0.04] text-slate-400 mb-3">
                                    <MessageSquare className="w-4 h-4" strokeWidth={1.75} />
                                </div>
                                <p className="text-[13px] text-slate-700 font-medium">
                                    No Q&A pairs yet
                                </p>
                                <p className="text-[12.5px] text-slate-500 mt-0.5">
                                    {searchTerm || categoryFilter !== 'All'
                                        ? 'Try adjusting your search or filter.'
                                        : 'Click “Add Q&A” to create your first entry.'}
                                </p>
                            </div>
                        ) : (
                            <ul className="divide-y divide-slate-900/[0.06]">
                                {filteredQAs.map((qa) =>
                                    editing === qa._id ? (
                                        <li key={qa._id} className="px-5 py-4 bg-[#FAFAFA]">
                                            <div className="space-y-3">
                                                <div>
                                                    <FieldLabel htmlFor="edit-q">
                                                        Question
                                                    </FieldLabel>
                                                    <TextInput
                                                        id="edit-q"
                                                        name="question"
                                                        value={formData.question || ''}
                                                        onChange={handleInputChange}
                                                    />
                                                </div>
                                                <div>
                                                    <FieldLabel htmlFor="edit-a">
                                                        Answer
                                                    </FieldLabel>
                                                    <TextArea
                                                        id="edit-a"
                                                        name="answer"
                                                        rows={3}
                                                        value={formData.answer || ''}
                                                        onChange={handleInputChange}
                                                    />
                                                </div>
                                                <div className="flex flex-wrap items-end gap-2.5">
                                                    <div className="w-44">
                                                        <FieldLabel>Category</FieldLabel>
                                                        <div className="inline-flex items-center h-9 w-full px-3 rounded-md bg-white border border-slate-900/[0.08]">
                                                            <select
                                                                value={
                                                                    formData.category || 'General'
                                                                }
                                                                onChange={(e) =>
                                                                    setFormData((p) => ({
                                                                        ...p,
                                                                        category: e.target.value,
                                                                    }))
                                                                }
                                                                className="bg-transparent text-[13px] text-slate-900 w-full focus:outline-none"
                                                            >
                                                                {CATEGORIES.map((c) => (
                                                                    <option key={c} value={c}>
                                                                        {c}
                                                                    </option>
                                                                ))}
                                                            </select>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-1.5 ml-auto">
                                                        <GhostBtn
                                                            onClick={handleCancelEdit}
                                                            icon={<X className="w-3.5 h-3.5" strokeWidth={2} />}
                                                        >
                                                            Cancel
                                                        </GhostBtn>
                                                        <PrimaryBtn
                                                            onClick={handleSaveEdit}
                                                            icon={<Save className="w-3.5 h-3.5" strokeWidth={2} />}
                                                        >
                                                            Save
                                                        </PrimaryBtn>
                                                    </div>
                                                </div>
                                            </div>
                                        </li>
                                    ) : (
                                        <li
                                            key={qa._id}
                                            className="group px-5 py-3.5 hover:bg-slate-900/[0.02] transition-colors"
                                        >
                                            <div className="flex items-start justify-between gap-4">
                                                <div className="min-w-0 flex-1">
                                                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                                                        <p className="text-[13.5px] font-semibold tracking-tight text-slate-950">
                                                            {qa.question}
                                                        </p>
                                                        <span className="inline-flex items-center px-1.5 h-[18px] rounded-full bg-slate-100 text-slate-600 border border-slate-200 text-[10.5px] font-semibold uppercase tracking-[0.08em] leading-none">
                                                            {qa.category}
                                                        </span>
                                                        {qa.frequency > 0 && (
                                                            <span
                                                                className="inline-flex items-center gap-1 text-[10.5px] text-slate-500 font-semibold"
                                                                title="Times used"
                                                            >
                                                                · {qa.frequency}× used
                                                            </span>
                                                        )}
                                                    </div>
                                                    <p className="text-[12.5px] text-slate-600 leading-relaxed line-clamp-2">
                                                        {qa.answer}
                                                    </p>
                                                </div>
                                                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                                                    <button
                                                        onClick={() => handleEditQA(qa._id)}
                                                        className="w-7 h-7 rounded-md text-slate-400 hover:text-slate-900 hover:bg-slate-900/[0.04] flex items-center justify-center transition-colors"
                                                        aria-label="Edit"
                                                    >
                                                        <Edit3 className="w-3.5 h-3.5" strokeWidth={2} />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDeleteQA(qa._id)}
                                                        className="w-7 h-7 rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50 flex items-center justify-center transition-colors"
                                                        aria-label="Delete"
                                                    >
                                                        <Trash2 className="w-3.5 h-3.5" strokeWidth={2} />
                                                    </button>
                                                </div>
                                            </div>
                                        </li>
                                    )
                                )}
                            </ul>
                        )}
                    </div>

                    {/* Add modal */}
                    <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                        <DialogContent className="max-w-xl p-0 rounded-xl border border-slate-900/[0.08] bg-white shadow-[0_24px_80px_-24px_rgba(15,23,42,0.25)]">
                            <div className="px-6 py-4 border-b border-slate-900/[0.06] flex items-start justify-between gap-4">
                                <div>
                                    <div className="inline-flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-indigo-600 mb-0.5">
                                        <span className="w-3 h-px bg-indigo-600" />
                                        New entry
                                    </div>
                                    <h3 className="text-[16px] font-semibold tracking-[-0.01em] text-slate-950 leading-tight">
                                        Add a Q&A pair
                                    </h3>
                                    <p className="text-[12px] text-slate-500 mt-0.5">
                                        Train your bot with a question and the exact answer it should give.
                                    </p>
                                </div>
                                <button
                                    onClick={() => setIsAddDialogOpen(false)}
                                    className="w-7 h-7 rounded-md text-slate-400 hover:text-slate-900 hover:bg-slate-900/[0.04] flex items-center justify-center transition-colors flex-shrink-0"
                                >
                                    <X className="w-4 h-4" strokeWidth={2} />
                                </button>
                            </div>
                            <div className="px-6 py-5 space-y-4">
                                <div>
                                    <FieldLabel htmlFor="new-q">Question</FieldLabel>
                                    <TextInput
                                        id="new-q"
                                        name="question"
                                        placeholder="What does your bot get asked?"
                                        value={formData.question || ''}
                                        onChange={handleInputChange}
                                    />
                                </div>
                                <div>
                                    <FieldLabel htmlFor="new-a">Answer</FieldLabel>
                                    <TextArea
                                        id="new-a"
                                        name="answer"
                                        rows={5}
                                        placeholder="What should the bot answer?"
                                        value={formData.answer || ''}
                                        onChange={handleInputChange}
                                    />
                                </div>
                                <div>
                                    <FieldLabel htmlFor="new-cat">Category</FieldLabel>
                                    <div className="inline-flex items-center h-9 w-full px-3 rounded-md bg-white border border-slate-900/[0.08]">
                                        <select
                                            id="new-cat"
                                            value={formData.category || 'General'}
                                            onChange={(e) =>
                                                setFormData((p) => ({
                                                    ...p,
                                                    category: e.target.value,
                                                }))
                                            }
                                            className="bg-transparent text-[13px] text-slate-900 w-full focus:outline-none"
                                        >
                                            {CATEGORIES.map((c) => (
                                                <option key={c} value={c}>
                                                    {c}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                            </div>
                            <div className="px-6 py-3 border-t border-slate-900/[0.06] bg-[#FAFAFA] flex items-center justify-end gap-2">
                                <GhostBtn onClick={() => setIsAddDialogOpen(false)}>
                                    Cancel
                                </GhostBtn>
                                <PrimaryBtn onClick={handleAddQA}>Add Q&A</PrimaryBtn>
                            </div>
                        </DialogContent>
                    </Dialog>
                </div>
            )}

            {/* Upload tab */}
            {activeTab === 'upload' && (
                <SectionCard
                    title="Upload a document"
                    desc="PDF, DOCX, TXT, CSV, MD or XLSX. 10 MB max per file."
                    icon={FileUp}
                >
                    <div className="space-y-4 max-w-md">
                        <div>
                            <FieldLabel htmlFor="file-upload">Document</FieldLabel>
                            <label
                                htmlFor="file-upload"
                                className="flex items-center gap-3 px-3 py-3 rounded-md border border-dashed border-slate-300 hover:border-indigo-400 bg-[#FAFAFA] cursor-pointer transition-colors"
                            >
                                <div className="w-8 h-8 rounded-md bg-white border border-slate-900/[0.06] flex items-center justify-center flex-shrink-0">
                                    <FileUp className="w-4 h-4 text-slate-500" strokeWidth={1.75} />
                                </div>
                                <div className="min-w-0">
                                    <p className="text-[13px] font-medium text-slate-900 truncate">
                                        {file ? file.name : 'Click to choose a file'}
                                    </p>
                                    <p className="text-[11.5px] text-slate-500">
                                        {file
                                            ? `${(file.size / 1024).toFixed(1)} KB`
                                            : 'PDF · DOCX · TXT · CSV · MD · XLSX'}
                                    </p>
                                </div>
                                <input
                                    id="file-upload"
                                    type="file"
                                    onChange={handleFileChange}
                                    accept=".pdf,.doc,.docx,.txt,.csv,.md,.xlsx"
                                    className="sr-only"
                                />
                            </label>
                        </div>
                        <PrimaryBtn
                            onClick={handleUploadFile}
                            disabled={!file || isUploading}
                            icon={
                                isUploading ? (
                                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                ) : (
                                    <FileUp className="w-3.5 h-3.5" strokeWidth={2} />
                                )
                            }
                        >
                            {isUploading ? 'Processing…' : 'Upload & train'}
                        </PrimaryBtn>
                    </div>
                </SectionCard>
            )}

            {/* Scrape tab */}
            {activeTab === 'scrape' && (
                <SectionCard
                    title="Scrape a website"
                    desc="Depth 1 = single page · 2–3 = follow same-origin links."
                    icon={Globe}
                >
                    <div className="space-y-4 max-w-md">
                        <div>
                            <FieldLabel htmlFor="scrape-url">Website URL</FieldLabel>
                            <TextInput
                                id="scrape-url"
                                type="url"
                                placeholder="https://example.com/about"
                                value={scrapeUrl}
                                onChange={(e) => setScrapeUrl(e.target.value)}
                            />
                        </div>
                        <div>
                            <FieldLabel>Depth</FieldLabel>
                            <div className="inline-flex items-center gap-0.5 p-0.5 rounded-lg bg-slate-900/[0.04] border border-slate-900/[0.06]">
                                {[
                                    { v: 1, label: '1 page' },
                                    { v: 2, label: '~10 pages' },
                                    { v: 3, label: '~30 pages' },
                                ].map((d) => (
                                    <button
                                        key={d.v}
                                        onClick={() => setScrapeMaxDepth(d.v)}
                                        className={cn(
                                            'px-3 h-7 rounded-md text-[12px] font-semibold tracking-tight transition-all',
                                            scrapeMaxDepth === d.v
                                                ? 'bg-white text-slate-950 shadow-[0_1px_2px_rgba(15,23,42,0.08)]'
                                                : 'text-slate-600 hover:text-slate-900'
                                        )}
                                    >
                                        {d.label}
                                    </button>
                                ))}
                            </div>
                        </div>
                        {scrapeProgress && (
                            <div className="rounded-md border border-indigo-200/60 bg-indigo-50/40 px-3 py-2 flex items-center gap-2 text-[12.5px] text-indigo-900">
                                <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-600" />
                                {scrapeProgress}
                            </div>
                        )}
                        <PrimaryBtn
                            onClick={handleScrapeWebsite}
                            disabled={!scrapeUrl || isScraping}
                            icon={
                                isScraping || scrapeJobId ? (
                                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                ) : (
                                    <Globe className="w-3.5 h-3.5" strokeWidth={2} />
                                )
                            }
                        >
                            {isScraping || scrapeJobId
                                ? scrapeJobId
                                    ? 'Processing…'
                                    : 'Scraping…'
                                : 'Scrape & train'}
                        </PrimaryBtn>
                    </div>
                </SectionCard>
            )}

            {/* Paste tab */}
            {activeTab === 'paste' && (
                <SectionCard
                    title="Paste raw text"
                    desc="Drop in FAQs, policies, or any text. No file upload needed."
                    icon={FileText}
                >
                    <div className="space-y-4">
                        <div className="max-w-md">
                            <FieldLabel htmlFor="paste-title">Title (optional)</FieldLabel>
                            <TextInput
                                id="paste-title"
                                placeholder="e.g. FAQ 2024"
                                value={pasteTitle}
                                onChange={(e) => setPasteTitle(e.target.value)}
                            />
                        </div>
                        <div>
                            <FieldLabel htmlFor="paste-content">Content</FieldLabel>
                            <TextArea
                                id="paste-content"
                                placeholder="Paste or type your content here…"
                                value={pasteContent}
                                onChange={(e) => setPasteContent(e.target.value)}
                                rows={10}
                            />
                        </div>
                        <PrimaryBtn
                            onClick={handlePasteSubmit}
                            disabled={!pasteContent.trim() || isPasting}
                            icon={
                                isPasting ? (
                                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                ) : (
                                    <FileText className="w-3.5 h-3.5" strokeWidth={2} />
                                )
                            }
                        >
                            {isPasting ? 'Adding…' : 'Add to knowledge base'}
                        </PrimaryBtn>
                    </div>
                </SectionCard>
            )}

            {/* Sources tab */}
            {activeTab === 'sources' && (
                <div className="space-y-5">
                    {/* Health stats */}
                    {kbHealth != null && (
                        <div className="grid gap-3 grid-cols-1 sm:grid-cols-3">
                            <div className="rounded-lg bg-white border border-slate-900/[0.06] px-4 py-3.5">
                                <div className="flex items-center justify-between mb-2">
                                    <p className="text-[10.5px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                                        Total chunks
                                    </p>
                                    <div className="w-6 h-6 rounded-md bg-indigo-600/10 text-indigo-600 flex items-center justify-center">
                                        <Database className="w-[13px] h-[13px]" strokeWidth={1.75} />
                                    </div>
                                </div>
                                <p className="text-[20px] font-semibold tracking-[-0.01em] text-slate-950 leading-[1.15]">
                                    {(kbHealth.totalChunks ?? 0).toLocaleString()}
                                </p>
                            </div>
                            <div className="rounded-lg bg-white border border-slate-900/[0.06] px-4 py-3.5">
                                <div className="flex items-center justify-between mb-2">
                                    <p className="text-[10.5px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                                        Total sources
                                    </p>
                                    <div className="w-6 h-6 rounded-md bg-slate-900/[0.04] text-slate-700 flex items-center justify-center">
                                        <FileIcon className="w-[13px] h-[13px]" strokeWidth={1.75} />
                                    </div>
                                </div>
                                <p className="text-[20px] font-semibold tracking-[-0.01em] text-slate-950 leading-[1.15]">
                                    {(kbHealth.totalSources ?? 0).toLocaleString()}
                                </p>
                            </div>
                            <div className="rounded-lg bg-white border border-slate-900/[0.06] px-4 py-3.5">
                                <div className="flex items-center justify-between mb-2">
                                    <p className="text-[10.5px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                                        Last updated
                                    </p>
                                    <div className="w-6 h-6 rounded-md bg-slate-900/[0.04] text-slate-700 flex items-center justify-center">
                                        <RefreshCw className="w-[13px] h-[13px]" strokeWidth={1.75} />
                                    </div>
                                </div>
                                <p className="text-[14px] font-semibold tracking-tight text-slate-950 leading-[1.15]">
                                    {kbHealth.lastUpdated
                                        ? new Date(kbHealth.lastUpdated).toLocaleString('en-IN', {
                                              day: '2-digit',
                                              month: 'short',
                                              hour: '2-digit',
                                              minute: '2-digit',
                                          })
                                        : 'Never'}
                                </p>
                            </div>
                        </div>
                    )}

                    <SectionCard
                        title="Your data sources"
                        desc="Files, websites, and pasted text. Set re-scrape schedule for websites."
                        icon={Database}
                    >
                        {isLoadingSources ? (
                            <div className="flex items-center justify-center py-10">
                                <div className="w-6 h-6 border-2 border-slate-200 border-t-slate-900 rounded-full animate-spin" />
                            </div>
                        ) : sources.length === 0 ? (
                            <div className="py-10 text-center">
                                <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-slate-900/[0.04] text-slate-400 mb-3">
                                    <Database className="w-4 h-4" strokeWidth={1.75} />
                                </div>
                                <p className="text-[13px] text-slate-700 font-medium">
                                    No data sources yet
                                </p>
                                <p className="text-[12.5px] text-slate-500 mt-0.5">
                                    Upload, scrape, or paste — they'll appear here.
                                </p>
                            </div>
                        ) : (
                            <ul className="divide-y divide-slate-900/[0.06] -mx-5">
                                {sources.map((source) => {
                                    const Icon =
                                        source.type === 'file'
                                            ? FileIcon
                                            : source.type === 'paste'
                                            ? FileText
                                            : Globe;
                                    const iconCls =
                                        source.type === 'file'
                                            ? 'bg-violet-500/10 text-violet-600'
                                            : source.type === 'paste'
                                            ? 'bg-amber-500/10 text-amber-600'
                                            : 'bg-emerald-500/10 text-emerald-600';
                                    const title =
                                        source.type === 'file'
                                            ? source.fileName
                                            : source.type === 'paste'
                                            ? source.pasteTitle || 'Pasted text'
                                            : source.url;
                                    return (
                                        <li key={source._id} className="px-5 py-3.5">
                                            <div className="flex items-start gap-3">
                                                <div
                                                    className={cn(
                                                        'w-8 h-8 rounded-md flex items-center justify-center flex-shrink-0 mt-0.5',
                                                        iconCls
                                                    )}
                                                >
                                                    <Icon className="w-4 h-4" strokeWidth={1.75} />
                                                </div>
                                                <div className="min-w-0 flex-1">
                                                    <div className="flex items-center gap-2 flex-wrap">
                                                        <p className="text-[13px] font-semibold tracking-tight text-slate-950 truncate">
                                                            {title}
                                                        </p>
                                                        <span
                                                            className={cn(
                                                                'inline-flex items-center px-1.5 h-[18px] rounded-full border text-[10px] font-semibold uppercase tracking-[0.08em] leading-none',
                                                                sourceStatusPill(source.status)
                                                            )}
                                                        >
                                                            {source.status}
                                                        </span>
                                                    </div>
                                                    <div className="mt-1 flex items-center gap-2 text-[11.5px] text-slate-500 flex-wrap">
                                                        <span className="capitalize">
                                                            {source.type}
                                                        </span>
                                                        {source.fileSize != null && (
                                                            <>
                                                                <span>·</span>
                                                                <span>
                                                                    {(source.fileSize / 1024).toFixed(1)} KB
                                                                </span>
                                                            </>
                                                        )}
                                                        {source.type === 'website' &&
                                                            source.pageCount != null && (
                                                                <>
                                                                    <span>·</span>
                                                                    <span>
                                                                        {source.pageCount}{' '}
                                                                        page(s)
                                                                    </span>
                                                                </>
                                                            )}
                                                        <span>·</span>
                                                        <span>
                                                            {new Date(
                                                                source.createdAt
                                                            ).toLocaleDateString('en-IN', {
                                                                day: '2-digit',
                                                                month: 'short',
                                                            })}
                                                        </span>
                                                    </div>
                                                    {source.type === 'website' && (
                                                        <div className="mt-2 flex items-center gap-2 flex-wrap">
                                                            {source.url && (
                                                                <a
                                                                    href={source.url}
                                                                    target="_blank"
                                                                    rel="noopener noreferrer"
                                                                    className="inline-flex items-center gap-1 text-[11.5px] text-indigo-600 hover:text-indigo-700 font-medium"
                                                                >
                                                                    Visit
                                                                    <ExternalLink className="w-3 h-3" strokeWidth={2} />
                                                                </a>
                                                            )}
                                                            <span className="w-px h-3 bg-slate-900/[0.08]" />
                                                            <span className="text-[10.5px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                                                                Re-scrape
                                                            </span>
                                                            <div className="inline-flex items-center gap-0.5 p-0.5 rounded-md bg-slate-900/[0.04] border border-slate-900/[0.06]">
                                                                {[
                                                                    { v: 'none', label: 'Off' },
                                                                    { v: 'daily', label: 'Daily' },
                                                                    {
                                                                        v: 'weekly',
                                                                        label: 'Weekly',
                                                                    },
                                                                ].map((s) => (
                                                                    <button
                                                                        key={s.v}
                                                                        onClick={() =>
                                                                            handleScrapeScheduleChange(
                                                                                source._id,
                                                                                s.v
                                                                            )
                                                                        }
                                                                        className={cn(
                                                                            'px-2 h-6 rounded text-[11px] font-semibold tracking-tight transition-all',
                                                                            (source.scrapeSchedule ||
                                                                                'none') === s.v
                                                                                ? 'bg-white text-slate-950 shadow-[0_1px_2px_rgba(15,23,42,0.08)]'
                                                                                : 'text-slate-600 hover:text-slate-900'
                                                                        )}
                                                                    >
                                                                        {s.label}
                                                                    </button>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </li>
                                    );
                                })}
                            </ul>
                        )}
                    </SectionCard>
                </div>
            )}

            {/* Suggested tab */}
            {activeTab === 'suggested' && (
                <SectionCard
                    title="Suggested Q&A"
                    desc="Questions visitors asked that the bot couldn't answer well. Add answers to improve."
                    icon={Sparkles}
                >
                    {isLoadingSuggested ? (
                        <div className="flex items-center justify-center py-10">
                            <div className="w-6 h-6 border-2 border-slate-200 border-t-slate-900 rounded-full animate-spin" />
                        </div>
                    ) : suggestedList.length === 0 ? (
                        <div className="py-10 text-center">
                            <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-slate-900/[0.04] text-slate-400 mb-3">
                                <Sparkles className="w-4 h-4" strokeWidth={1.75} />
                            </div>
                            <p className="text-[13px] text-slate-700 font-medium">
                                No suggestions yet
                            </p>
                            <p className="text-[12.5px] text-slate-500 mt-0.5">
                                When the bot can't answer well, those questions land here.
                            </p>
                        </div>
                    ) : (
                        <ul className="divide-y divide-slate-900/[0.06] -mx-5">
                            {suggestedList.map((s) => {
                                const meta = suggestedSourceLabel(s.source);
                                return (
                                    <li
                                        key={s._id}
                                        className="px-5 py-3.5 flex items-start justify-between gap-3"
                                    >
                                        <div className="flex items-start gap-3 min-w-0 flex-1">
                                            <div className="w-8 h-8 rounded-md bg-amber-500/10 text-amber-600 flex items-center justify-center flex-shrink-0 mt-0.5">
                                                <AlertTriangle
                                                    className="w-3.5 h-3.5"
                                                    strokeWidth={2}
                                                />
                                            </div>
                                            <div className="min-w-0">
                                                <div className="flex items-center gap-1.5 mb-1">
                                                    <span
                                                        className={cn(
                                                            'inline-flex items-center px-1.5 h-[18px] rounded-full border text-[10px] font-semibold uppercase tracking-[0.08em] leading-none',
                                                            meta.cls
                                                        )}
                                                    >
                                                        {meta.label}
                                                    </span>
                                                </div>
                                                <p className="text-[13px] text-slate-800 break-words leading-snug">
                                                    {s.question}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-1.5 flex-shrink-0">
                                            <PrimaryBtn
                                                className="h-8 px-3 text-[12px]"
                                                onClick={() => {
                                                    setAddToQAModalId(s._id);
                                                    setAddToQAAnswer('');
                                                }}
                                                icon={
                                                    <Plus className="w-3 h-3" strokeWidth={2.25} />
                                                }
                                            >
                                                Add to Q&A
                                            </PrimaryBtn>
                                            <button
                                                onClick={async () => {
                                                    try {
                                                        await dismissSuggestedQA(s._id);
                                                        setSuggestedList((prev) =>
                                                            prev.filter((x) => x._id !== s._id)
                                                        );
                                                        toast.success('Dismissed');
                                                    } catch {
                                                        toast.error('Failed to dismiss');
                                                    }
                                                }}
                                                className="inline-flex items-center h-8 px-2.5 rounded-md bg-white border border-slate-900/[0.08] text-[12px] font-semibold text-slate-600 hover:text-slate-900 hover:border-slate-900/20 transition-colors"
                                            >
                                                Dismiss
                                            </button>
                                        </div>
                                    </li>
                                );
                            })}
                        </ul>
                    )}

                    {/* Add suggested → Q&A modal */}
                    <Dialog
                        open={!!addToQAModalId}
                        onOpenChange={(open) => !open && setAddToQAModalId(null)}
                    >
                        <DialogContent className="max-w-lg p-0 rounded-xl border border-slate-900/[0.08] bg-white shadow-[0_24px_80px_-24px_rgba(15,23,42,0.25)]">
                            <div className="px-6 py-4 border-b border-slate-900/[0.06] flex items-start justify-between gap-4">
                                <div>
                                    <h3 className="text-[16px] font-semibold tracking-[-0.01em] text-slate-950 leading-tight">
                                        Add to Q&A
                                    </h3>
                                    <p className="text-[12px] text-slate-500 mt-0.5">
                                        Provide an answer. The pair will be added to your Q&A list.
                                    </p>
                                </div>
                                <button
                                    onClick={() => setAddToQAModalId(null)}
                                    className="w-7 h-7 rounded-md text-slate-400 hover:text-slate-900 hover:bg-slate-900/[0.04] flex items-center justify-center transition-colors flex-shrink-0"
                                >
                                    <X className="w-4 h-4" strokeWidth={2} />
                                </button>
                            </div>
                            <div className="px-6 py-5">
                                <FieldLabel htmlFor="suggest-ans">Answer</FieldLabel>
                                <TextArea
                                    id="suggest-ans"
                                    rows={5}
                                    placeholder="Your answer…"
                                    value={addToQAAnswer}
                                    onChange={(e) => setAddToQAAnswer(e.target.value)}
                                />
                            </div>
                            <div className="px-6 py-3 border-t border-slate-900/[0.06] bg-[#FAFAFA] flex items-center justify-end gap-2">
                                <GhostBtn onClick={() => setAddToQAModalId(null)}>
                                    Cancel
                                </GhostBtn>
                                <PrimaryBtn
                                    onClick={async () => {
                                        if (!addToQAModalId) return;
                                        try {
                                            await addSuggestedQAToQA(
                                                addToQAModalId,
                                                addToQAAnswer.trim()
                                            );
                                            setSuggestedList((prev) =>
                                                prev.filter((x) => x._id !== addToQAModalId)
                                            );
                                            setAddToQAModalId(null);
                                            setAddToQAAnswer('');
                                            fetchQAs();
                                            toast.success('Added to Q&A');
                                        } catch {
                                            toast.error('Failed to add');
                                        }
                                    }}
                                    icon={<Check className="w-3.5 h-3.5" strokeWidth={2.25} />}
                                >
                                    Add
                                </PrimaryBtn>
                            </div>
                        </DialogContent>
                    </Dialog>
                </SectionCard>
            )}
        </div>
    );
};

export default UserKnowledgeBase;
