import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Shield, Plus, Trash2, AlertCircle } from 'lucide-react';
import { getUserProfile, updateAllowedDomains } from '@/services/api';
import { toast } from 'sonner';

const DomainSecurityPage = () => {
    const [user, setUser] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [newDomain, setNewDomain] = useState('');
    const [isUpdating, setIsUpdating] = useState(false);

    useEffect(() => {
        const fetchProfile = async () => {
            try {
                const userData = await getUserProfile();
                setUser(userData);
            } catch (error) {
                console.error('Error fetching profile:', error);
                toast.error('Could not load security settings');
            } finally {
                setIsLoading(false);
            }
        };

        fetchProfile();
    }, []);

    const handleAddDomain = async () => {
        if (!newDomain) return;
        const cleanDomain = newDomain.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/$/, '');
        if (!cleanDomain) return;

        const updatedDomains = [...(user.allowedDomains || []), cleanDomain];
        setIsUpdating(true);
        try {
            await updateAllowedDomains(updatedDomains);
            setUser({ ...user, allowedDomains: updatedDomains });
            setNewDomain('');
            toast.success('Domain added successfully');
        } catch (error: any) {
            toast.error(error.message || 'Failed to add domain');
        } finally {
            setIsUpdating(false);
        }
    };

    const handleRemoveDomain = async (domain: string) => {
        const updatedDomains = user.allowedDomains.filter((d: string) => d !== domain);
        setIsUpdating(true);
        try {
            await updateAllowedDomains(updatedDomains);
            setUser({ ...user, allowedDomains: updatedDomains });
            toast.success('Domain removed');
        } catch (error: any) {
            toast.error('Failed to remove domain');
        } finally {
            setIsUpdating(false);
        }
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-[400px]">
                <div className="loading-spinner"></div>
            </div>
        );
    }

    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-2xl font-semibold mb-2 flex items-center gap-2">
                    <Shield className="h-6 w-6 text-primary" />
                    Domain Security
                </h1>
                <p className="text-muted-foreground">Protect your chatbot script and credits from unauthorized use</p>
            </div>

            <div className="grid gap-6">
                <Card className="border-primary/20 bg-primary/5">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            Allowed Domains <Badge variant="outline" className="text-[10px] uppercase font-bold bg-primary/10">Premium</Badge>
                        </CardTitle>
                        <CardDescription>
                            The chatbot will ONLY load and work on the domains listed below. This prevents others from stealing your script and using your tokens on their own websites.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="flex gap-2">
                            <Input
                                placeholder="e.g. example.com or *.example.com"
                                value={newDomain}
                                onChange={(e) => setNewDomain(e.target.value)}
                                disabled={isUpdating}
                                className="bg-background focus-visible:ring-primary"
                            />
                            <Button onClick={handleAddDomain} disabled={isUpdating || !newDomain} className="gap-2">
                                <Plus className="h-4 w-4" /> Add Domain
                            </Button>
                        </div>

                        <div className="space-y-3">
                            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Active Authorized Domains</h3>
                            {user?.allowedDomains?.length > 0 ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    {user.allowedDomains.map((domain: string) => (
                                        <div key={domain} className="flex items-center justify-between p-3 bg-background border rounded-xl shadow-sm hover:shadow-md transition-shadow">
                                            <span className="text-sm font-medium">{domain}</span>
                                            <Button variant="ghost" size="sm" className="h-8 text-destructive hover:bg-destructive/10 hover:text-destructive" onClick={() => handleRemoveDomain(domain)} disabled={isUpdating}>
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-10 border-2 border-dashed rounded-2xl bg-background/50">
                                    <Shield className="h-10 w-10 text-muted-foreground/20 mx-auto mb-3" />
                                    <p className="text-sm text-muted-foreground font-medium">No domains restricted.</p>
                                    <p className="text-[11px] text-muted-foreground/60 mt-1">Your chatbot is currently public and can be used on any website.</p>
                                </div>
                            )}
                        </div>
                    </CardContent>
                    <CardFooter className="bg-primary/5 border-t border-primary/10 py-4">
                        <div className="flex items-start gap-2 text-[11px] text-muted-foreground">
                            <AlertCircle className="h-3.5 w-3.5 mt-0.5 text-primary" />
                            <div>
                                <p className="font-semibold text-primary mb-0.5">Configuration Tips:</p>
                                <ul className="list-disc list-inside space-y-0.5">
                                    <li>Enter your main domain (e.g., <code>mysite.com</code>) to allow all traffic from there.</li>
                                    <li>Use <code>*.mysite.com</code> to automatically allow all subdomains.</li>
                                    <li>Leave the list empty if you want your chatbot to work on any domain.</li>
                                </ul>
                            </div>
                        </div>
                    </CardFooter>
                </Card>

                <Card className="border-dashed">
                    <CardHeader>
                        <CardTitle className="text-sm">Why is this important?</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-xs text-muted-foreground leading-relaxed">
                            Web scraping and script theft are common issues. Without domain security, anyone could copy your
                            unique script source from your public website and embed your chatbot on their own site,
                            consuming your paid AI credits. Domain authorization ensures your investment is strictly for your business.
                        </p>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
};

export default DomainSecurityPage;
