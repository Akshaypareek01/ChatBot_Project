
import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Code, ExternalLink, Copy, Check, Info } from 'lucide-react';
import { toast } from 'sonner';
import { API_URL } from '@/services/api';

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
    description: string;
    steps?: string[];
    code?: string;
    notes?: string[];
    tabs?: TabData[];
}

const getDefaultScriptUrl = () => {
    // Use regex to only replace /api at the end of the string to avoid matching subdomains like 'apis'
    const baseUrl = API_URL.replace(/\/api$/, '');
    return `${baseUrl}/chatbot.js`;
};

const IntegrationGuide = ({ userId }: { userId: string }) => {
    const [copied, setCopied] = useState<string | null>(null);
    const scriptUrl = getDefaultScriptUrl();

    const handleCopy = (code: string, id: string) => {
        const finalCode = code.replace('{{USER_ID}}', userId).replace('https://api.yourdomain.com/chatbot.js', scriptUrl);
        navigator.clipboard.writeText(finalCode);
        setCopied(id);
        toast.success('Code copied to clipboard');
        setTimeout(() => setCopied(null), 2000);
    };

    const integrationData: IntegrationItem[] = [
        {
            id: "html",
            title: "HTML / Static Website",
            description: "Plain HTML, PHP, static hosting",
            steps: [
                "Open your index.html or main layout file",
                "Paste the script just before the closing </body> tag",
                "Save and deploy your website"
            ],
            code: `<script\n  src="https://api.yourdomain.com/chatbot.js"\n  data-user-id="{{USER_ID}}"\n  data-bot-id="default"\n  defer\n></script>`,
            notes: [
                "Works on any static or custom-built website",
                "No framework or plugin required"
            ]
        },
        {
            id: "wordpress",
            title: "WordPress",
            description: "Gutenberg, Elementor, Classic Editor",
            steps: [
                "Login to your WordPress Admin Dashboard",
                "Open any page and add a Custom HTML block",
                "Paste the script and click Save / Update"
            ],
            code: `<script\n  src="https://api.yourdomain.com/chatbot.js"\n  data-user-id="{{USER_ID}}"\n  data-bot-id="default"\n  defer\n></script>`,
            notes: [
                "You can also add this using a Header/Footer plugin",
                "Clear cache if your site uses caching plugins"
            ]
        },
        {
            id: "react",
            title: "React",
            description: "Create React App, Vite, SPA projects",
            steps: [
                "Open the public/index.html file in your React project",
                "Paste the script just before the closing </body> tag",
                "Rebuild and redeploy your React app"
            ],
            code: `<script\n  src="https://api.yourdomain.com/chatbot.js"\n  data-user-id="{{USER_ID}}"\n  data-bot-id="default"\n  defer\n></script>`,
            notes: [
                "Recommended to add in index.html instead of React components",
                "Avoid adding the script multiple times"
            ]
        },
        {
            id: "nextjs",
            title: "Next.js",
            description: "App Router and Pages Router",
            tabs: [
                {
                    tabId: "app-router",
                    tabTitle: "App Router (Next 13+)",
                    steps: [
                        "Open your layout.tsx or layout.jsx file",
                        "Import the Next.js Script component",
                        "Add the chatbot script using strategy='afterInteractive'"
                    ],
                    code: `import Script from "next/script";\n\n<Script\n  src="https://api.yourdomain.com/chatbot.js"\n  data-user-id="{{USER_ID}}"\n  data-bot-id="default"\n  strategy="afterInteractive"\n/>`,
                    notes: [
                        "Ensures the script runs only on the client side",
                        "Prevents server-side rendering issues"
                    ]
                },
                {
                    tabId: "pages-router",
                    tabTitle: "Pages Router",
                    steps: [
                        "Open pages/_document.js",
                        "Add the script before the closing </body> tag",
                        "Save and redeploy your application"
                    ],
                    code: `<script\n  src="https://api.yourdomain.com/chatbot.js"\n  data-user-id="{{USER_ID}}"\n  data-bot-id="default"\n  defer\n></script>`,
                    notes: [
                        "Works for all older Next.js projects",
                        "Do not place inside server-side code"
                    ]
                }
            ]
        },
        {
            id: "shopify",
            title: "Shopify",
            description: "Online store themes",
            steps: [
                "Login to Shopify Admin",
                "Go to Online Store → Themes",
                "Edit theme.liquid file",
                "Paste the script just before the closing </body> tag",
                "Save your changes"
            ],
            code: `<script\n  src="https://api.yourdomain.com/chatbot.js"\n  data-user-id="{{USER_ID}}"\n  data-bot-id="default"\n  defer\n></script>`,
            notes: [
                "This will load the chatbot on all store pages",
                "No app installation required"
            ]
        },
        {
            id: "other",
            title: "Other / Custom Website",
            description: "Any platform not listed above",
            steps: [
                "Locate the main layout or footer file of your website",
                "Paste the chatbot script before </body>",
                "Deploy your website"
            ],
            code: `<script\n  src="https://api.yourdomain.com/chatbot.js"\n  data-user-id="{{USER_ID}}"\n  data-bot-id="default"\n  defer\n></script>`,
            notes: [
                "Works on any platform that supports HTML",
                "If unsure, contact your website developer"
            ]
        }
    ];

    const getPlatformIcon = (id: string) => {
        switch (id) {
            case 'react': return <div className="w-12 h-12 flex items-center justify-center bg-[#61DAFB]/10 rounded-2xl text-[#61DAFB]"><Code className="w-6 h-6" /></div>;
            case 'nextjs': return <div className="w-12 h-12 flex items-center justify-center bg-black/10 dark:bg-white/10 rounded-2xl text-black dark:text-white"><Code className="w-6 h-6" /></div>;
            case 'wordpress': return <div className="w-12 h-12 flex items-center justify-center bg-[#21759b]/10 rounded-2xl text-[#21759b]"><ExternalLink className="w-6 h-6" /></div>;
            case 'shopify': return <div className="w-12 h-12 flex items-center justify-center bg-[#95BF47]/10 rounded-2xl text-[#95BF47]"><ExternalLink className="w-6 h-6" /></div>;
            case 'html': return <div className="w-12 h-12 flex items-center justify-center bg-[#E34F26]/10 rounded-2xl text-[#E34F26]"><Code className="w-6 h-6" /></div>;
            default: return <div className="w-12 h-12 flex items-center justify-center bg-gray-500/10 rounded-2xl text-gray-500"><Code className="w-6 h-6" /></div>;
        }
    };

    return (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {integrationData.map((item) => (
                <Dialog key={item.id}>
                    <DialogTrigger asChild>
                        <div className="group cursor-pointer flex flex-col items-center gap-3 p-4 rounded-[2rem] bg-background border border-muted-foreground/5 shadow-premium hover:shadow-2xl hover:-translate-y-2 transition-all duration-500">
                            <div className="transform group-hover:scale-110 transition-transform duration-300">
                                {getPlatformIcon(item.id)}
                            </div>
                            <div className="text-center">
                                <span className="text-xs font-bold tracking-tight text-foreground/80 uppercase">{item.title === 'Other / Custom Website' ? 'Other' : item.title}</span>
                            </div>
                        </div>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto rounded-[2rem]">
                        <DialogHeader>
                            <DialogTitle className="flex items-center gap-3 text-2xl font-black">
                                {getPlatformIcon(item.id)}
                                {item.title} Guide
                            </DialogTitle>
                            <DialogDescription>
                                Follow these simple steps to add the AI Chatbot to your {item.title} site.
                            </DialogDescription>
                        </DialogHeader>

                        {item.tabs ? (
                            <Tabs defaultValue={item.tabs[0].tabId} className="w-full mt-4">
                                <TabsList className="grid w-full grid-cols-2 mb-6">
                                    {item.tabs.map(tab => (
                                        <TabsTrigger key={tab.tabId} value={tab.tabId}>{tab.tabTitle}</TabsTrigger>
                                    ))}
                                </TabsList>
                                {item.tabs.map(tab => (
                                    <TabsContent key={tab.tabId} value={tab.tabId} className="space-y-6">
                                        <div className="space-y-4">
                                            <h4 className="font-semibold flex items-center gap-2">
                                                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold">1</span>
                                                Steps to Install
                                            </h4>
                                            <ol className="space-y-3 ml-2">
                                                {tab.steps.map((step, idx) => (
                                                    <li key={idx} className="flex gap-3 text-sm text-foreground/80">
                                                        <span className="text-muted-foreground">•</span>
                                                        {step}
                                                    </li>
                                                ))}
                                            </ol>
                                        </div>

                                        <div className="space-y-3">
                                            <div className="flex items-center justify-between">
                                                <h4 className="font-semibold flex items-center gap-2">
                                                    <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold">2</span>
                                                    Copy Script Code
                                                </h4>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => handleCopy(tab.code, `${item.id}-${tab.tabId}`)}
                                                    className="h-8 text-xs font-medium"
                                                >
                                                    {copied === `${item.id}-${tab.tabId}` ? (
                                                        <><Check className="mr-1 w-3 h-3" /> Copied</>
                                                    ) : (
                                                        <><Copy className="mr-1 w-3 h-3" /> Copy Code</>
                                                    )}
                                                </Button>
                                            </div>
                                            <div className="relative group">
                                                <div className="absolute -inset-0.5 bg-gradient-to-r from-primary/20 to-purple-500/20 rounded-lg blur opacity-25 group-hover:opacity-50 transition duration-1000"></div>
                                                <pre className="relative bg-muted/80 backdrop-blur-xs p-4 rounded-lg overflow-x-auto text-xs border border-muted-foreground/10 font-mono leading-relaxed text-foreground/90">
                                                    <code>{tab.code.replace('{{USER_ID}}', userId).replace('https://api.yourdomain.com/chatbot.js', scriptUrl)}</code>
                                                </pre>
                                            </div>
                                        </div>

                                        <div className="bg-blue-500/5 border border-blue-500/10 rounded-lg p-4 space-y-2">
                                            <h5 className="flex items-center gap-2 text-xs font-bold text-blue-600 uppercase tracking-wider">
                                                <Info className="w-3 h-3" /> Implementation Notes
                                            </h5>
                                            <ul className="space-y-1">
                                                {tab.notes.map((note, idx) => (
                                                    <li key={idx} className="text-xs text-blue-800/80">• {note}</li>
                                                ))}
                                            </ul>
                                        </div>
                                    </TabsContent>
                                ))}
                            </Tabs>
                        ) : (
                            <div className="space-y-6 mt-6">
                                <div className="space-y-4">
                                    <h4 className="font-semibold flex items-center gap-2">
                                        <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold">1</span>
                                        Steps to Install
                                    </h4>
                                    <ol className="space-y-3 ml-2">
                                        {item.steps?.map((step, idx) => (
                                            <li key={idx} className="flex gap-3 text-sm text-foreground/80">
                                                <span className="text-muted-foreground">•</span>
                                                {step}
                                            </li>
                                        ))}
                                    </ol>
                                </div>

                                <div className="space-y-3">
                                    <div className="flex items-center justify-between">
                                        <h4 className="font-semibold flex items-center gap-2">
                                            <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold">2</span>
                                            Copy Script Code
                                        </h4>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => handleCopy(item.code!, item.id)}
                                            className="h-8 text-xs font-medium"
                                        >
                                            {copied === item.id ? (
                                                <><Check className="mr-1 w-3 h-3" /> Copied</>
                                            ) : (
                                                <><Copy className="mr-1 w-3 h-3" /> Copy Code</>
                                            )}
                                        </Button>
                                    </div>
                                    <div className="relative group">
                                        <div className="absolute -inset-0.5 bg-gradient-to-r from-primary/20 to-purple-500/20 rounded-lg blur opacity-25 group-hover:opacity-50 transition duration-1000"></div>
                                        <pre className="relative bg-muted/80 backdrop-blur-xs p-4 rounded-lg overflow-x-auto text-xs border border-muted-foreground/10 font-mono leading-relaxed text-foreground/90">
                                            <code>{item.code?.replace('{{USER_ID}}', userId).replace('https://api.yourdomain.com/chatbot.js', scriptUrl)}</code>
                                        </pre>
                                    </div>
                                </div>

                                <div className="bg-blue-500/5 border border-blue-500/10 rounded-lg p-4 space-y-2">
                                    <h5 className="flex items-center gap-2 text-xs font-bold text-blue-600 uppercase tracking-wider">
                                        <Info className="w-3 h-3" /> Implementation Notes
                                    </h5>
                                    <ul className="space-y-1">
                                        {item.notes?.map((note, idx) => (
                                            <li key={idx} className="text-xs text-blue-800/80">• {note}</li>
                                        ))}
                                    </ul>
                                </div>
                            </div>
                        )}
                    </DialogContent>
                </Dialog>
            ))}
        </div>
    );
};

export default IntegrationGuide;
