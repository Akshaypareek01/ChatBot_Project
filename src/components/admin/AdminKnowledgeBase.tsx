import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { MessageSquare, FileUp, Globe, Database, Users, Loader2, File, ExternalLink } from 'lucide-react';
import { getUsers, getUserQAs } from '@/services/api';
import { toast } from 'sonner';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import api from '@/services/api';

const AdminKnowledgeBase = () => {
    const [users, setUsers] = useState<any[]>([]);
    const [selectedUserId, setSelectedUserId] = useState('');
    const [selectedUser, setSelectedUser] = useState<any>(null);
    const [loading, setLoading] = useState(false);

    // Knowledge base data
    const [qas, setQas] = useState<any[]>([]);
    const [sources, setSources] = useState<any[]>([]);
    const [loadingQAs, setLoadingQAs] = useState(false);
    const [loadingSources, setLoadingSources] = useState(false);

    useEffect(() => {
        fetchUsers();
    }, []);

    useEffect(() => {
        if (selectedUserId) {
            fetchUserKnowledgeBase();
        }
    }, [selectedUserId]);

    const fetchUsers = async () => {
        try {
            const data = await getUsers({ limit: 100 });
            setUsers(data.users || []);
        } catch (error) {
            console.error('Error fetching users:', error);
            toast.error('Failed to load users');
        }
    };

    const fetchUserKnowledgeBase = async () => {
        if (!selectedUserId) return;

        // Fetch Q&As
        setLoadingQAs(true);
        try {
            const qaData = await getUserQAs(selectedUserId);
            setQas(qaData || []);
        } catch (error) {
            console.error('Error fetching Q&As:', error);
            toast.error('Failed to load Q&As');
            setQas([]);
        } finally {
            setLoadingQAs(false);
        }

        // Fetch Sources (files and websites)
        setLoadingSources(true);
        try {
            const response = await api.get(`/sources?userId=${selectedUserId}`);
            setSources(response.data.sources || []);
        } catch (error) {
            console.error('Error fetching sources:', error);
            // Don't show error toast as this might be a new endpoint
            setSources([]);
        } finally {
            setLoadingSources(false);
        }
    };

    const handleUserSelect = (userId: string) => {
        setSelectedUserId(userId);
        const user = users.find(u => u._id === userId);
        setSelectedUser(user);
    };

    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-2xl font-semibold mb-2">Knowledge Base Management</h1>
                <p className="text-muted-foreground">Manage Q&A, files, and websites for users</p>
            </div>

            {/* User Selection */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center">
                        <Users className="mr-2 h-5 w-5" />
                        Select User
                    </CardTitle>
                    <CardDescription>Choose a user to manage their knowledge base</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="flex items-center gap-4">
                        <Label htmlFor="user-select" className="min-w-[100px]">User:</Label>
                        <Select value={selectedUserId} onValueChange={handleUserSelect}>
                            <SelectTrigger id="user-select" className="max-w-md">
                                <SelectValue placeholder="Select a user..." />
                            </SelectTrigger>
                            <SelectContent>
                                {users.map((user) => (
                                    <SelectItem key={user._id} value={user._id}>
                                        {user.name} ({user.email})
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {selectedUser && (
                        <div className="mt-4 p-4 bg-muted rounded-lg">
                            <div className="grid grid-cols-2 gap-4 text-sm">
                                <div>
                                    <span className="font-medium">Name:</span> {selectedUser.name}
                                </div>
                                <div>
                                    <span className="font-medium">Email:</span> {selectedUser.email}
                                </div>
                                <div>
                                    <span className="font-medium">Website:</span> {selectedUser.website}
                                </div>
                                <div>
                                    <span className="font-medium">Token Balance:</span> {selectedUser.tokenBalance?.toLocaleString()}
                                </div>
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Knowledge Base Tabs - Only show when user is selected */}
            {selectedUserId ? (
                <Card>
                    <CardHeader>
                        <CardTitle>Knowledge Base for {selectedUser?.name}</CardTitle>
                        <CardDescription>View Q&A pairs, uploaded files, and scraped websites</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Tabs defaultValue="qa">
                            <TabsList className="grid w-full grid-cols-4">
                                <TabsTrigger value="qa">
                                    <MessageSquare className="h-4 w-4 mr-2" />
                                    Q&A Pairs ({qas.length})
                                </TabsTrigger>
                                <TabsTrigger value="files">
                                    <FileUp className="h-4 w-4 mr-2" />
                                    Files ({sources.filter(s => s.type === 'file').length})
                                </TabsTrigger>
                                <TabsTrigger value="websites">
                                    <Globe className="h-4 w-4 mr-2" />
                                    Websites ({sources.filter(s => s.type === 'website').length})
                                </TabsTrigger>
                                <TabsTrigger value="sources">
                                    <Database className="h-4 w-4 mr-2" />
                                    Data Sources ({sources.length})
                                </TabsTrigger>
                            </TabsList>

                            <TabsContent value="qa" className="mt-6">
                                {loadingQAs ? (
                                    <div className="flex items-center justify-center py-12">
                                        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                                    </div>
                                ) : qas.length === 0 ? (
                                    <div className="text-center py-12 text-muted-foreground">
                                        <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
                                        <p className="text-lg font-medium">No Q&A Pairs</p>
                                        <p className="text-sm">This user hasn't added any Q&A pairs yet</p>
                                    </div>
                                ) : (
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Question</TableHead>
                                                <TableHead>Answer</TableHead>
                                                <TableHead>Category</TableHead>
                                                <TableHead className="text-center">Frequency</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {qas.map((qa) => (
                                                <TableRow key={qa._id}>
                                                    <TableCell className="font-medium">{qa.question}</TableCell>
                                                    <TableCell className="max-w-md truncate">{qa.answer}</TableCell>
                                                    <TableCell>
                                                        <Badge variant="outline">{qa.category}</Badge>
                                                    </TableCell>
                                                    <TableCell className="text-center">{qa.frequency || 0}</TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                )}
                            </TabsContent>

                            <TabsContent value="files" className="mt-6">
                                <div className="mb-6 p-4 border rounded-lg bg-muted/50">
                                    <h3 className="font-medium mb-3">Upload File for User</h3>
                                    <div className="flex gap-3">
                                        <input
                                            type="file"
                                            id="admin-file-upload"
                                            className="flex-1"
                                            accept=".pdf,.doc,.docx,.txt"
                                            onChange={async (e) => {
                                                const file = e.target.files?.[0];
                                                if (!file) return;

                                                try {
                                                    setLoadingSources(true);
                                                    const { uploadFile } = await import('@/services/api');
                                                    await uploadFile(file, selectedUserId);
                                                    toast.success('File uploaded successfully');
                                                    fetchUserKnowledgeBase();
                                                    e.target.value = '';
                                                } catch (error: any) {
                                                    toast.error(error.message || 'Failed to upload file');
                                                } finally {
                                                    setLoadingSources(false);
                                                }
                                            }}
                                        />
                                    </div>
                                    <p className="text-xs text-muted-foreground mt-2">
                                        Supported formats: PDF, DOC, DOCX, TXT (Max 10MB)
                                    </p>
                                </div>

                                {loadingSources ? (
                                    <div className="flex items-center justify-center py-12">
                                        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                                    </div>
                                ) : sources.filter(s => s.type === 'file').length === 0 ? (
                                    <div className="text-center py-12 text-muted-foreground">
                                        <FileUp className="h-12 w-12 mx-auto mb-4 opacity-50" />
                                        <p className="text-lg font-medium">No Files Uploaded</p>
                                        <p className="text-sm">Upload a file above to add to this user's knowledge base</p>
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        {sources.filter(s => s.type === 'file').map((source) => (
                                            <div key={source._id} className="border rounded-lg p-4 flex items-start gap-3">
                                                <File className="h-5 w-5 text-blue-500 mt-1" />
                                                <div className="flex-1">
                                                    <div className="font-medium">{source.fileName}</div>
                                                    <div className="text-sm text-muted-foreground mt-1">
                                                        {source.fileSize && `${(source.fileSize / 1024).toFixed(2)} KB`} •
                                                        {new Date(source.createdAt).toLocaleDateString()} •
                                                        <Badge variant={source.status === 'indexed' ? 'default' : 'secondary'} className="ml-2">
                                                            {source.status}
                                                        </Badge>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </TabsContent>

                            <TabsContent value="websites" className="mt-6">
                                <div className="mb-6 p-4 border rounded-lg bg-muted/50">
                                    <h3 className="font-medium mb-3">Scrape Website for User</h3>
                                    <div className="flex gap-3">
                                        <input
                                            type="url"
                                            id="admin-scrape-url"
                                            placeholder="https://example.com"
                                            className="flex-1 px-3 py-2 border rounded-md"
                                            onKeyDown={async (e) => {
                                                if (e.key === 'Enter') {
                                                    const input = e.target as HTMLInputElement;
                                                    const url = input.value.trim();
                                                    if (!url) return;

                                                    try {
                                                        setLoadingSources(true);
                                                        const { scrapeWebsite } = await import('@/services/api');
                                                        await scrapeWebsite(url, selectedUserId);
                                                        toast.success('Website scraped successfully');
                                                        fetchUserKnowledgeBase();
                                                        input.value = '';
                                                    } catch (error: any) {
                                                        toast.error(error.message || 'Failed to scrape website');
                                                    } finally {
                                                        setLoadingSources(false);
                                                    }
                                                }
                                            }}
                                        />
                                        <Button
                                            onClick={async () => {
                                                const input = document.getElementById('admin-scrape-url') as HTMLInputElement;
                                                const url = input?.value.trim();
                                                if (!url) return;

                                                try {
                                                    setLoadingSources(true);
                                                    const { scrapeWebsite } = await import('@/services/api');
                                                    await scrapeWebsite(url, selectedUserId);
                                                    toast.success('Website scraped successfully');
                                                    fetchUserKnowledgeBase();
                                                    input.value = '';
                                                } catch (error: any) {
                                                    toast.error(error.message || 'Failed to scrape website');
                                                } finally {
                                                    setLoadingSources(false);
                                                }
                                            }}
                                        >
                                            Scrape
                                        </Button>
                                    </div>
                                    <p className="text-xs text-muted-foreground mt-2">
                                        Enter a website URL and press Enter or click Scrape
                                    </p>
                                </div>

                                {loadingSources ? (
                                    <div className="flex items-center justify-center py-12">
                                        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                                    </div>
                                ) : sources.filter(s => s.type === 'file').length === 0 ? (
                                    <div className="text-center py-12 text-muted-foreground">
                                        <FileUp className="h-12 w-12 mx-auto mb-4 opacity-50" />
                                        <p className="text-lg font-medium">No Files Uploaded</p>
                                        <p className="text-sm">This user hasn't uploaded any files yet</p>
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        {sources.filter(s => s.type === 'file').map((source) => (
                                            <div key={source._id} className="border rounded-lg p-4 flex items-start gap-3">
                                                <File className="h-5 w-5 text-blue-500 mt-1" />
                                                <div className="flex-1">
                                                    <div className="font-medium">{source.fileName}</div>
                                                    <div className="text-sm text-muted-foreground mt-1">
                                                        {source.fileSize && `${(source.fileSize / 1024).toFixed(2)} KB`} •
                                                        {new Date(source.createdAt).toLocaleDateString()} •
                                                        <Badge variant={source.status === 'indexed' ? 'default' : 'secondary'} className="ml-2">
                                                            {source.status}
                                                        </Badge>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </TabsContent>

                            <TabsContent value="websites" className="mt-6">
                                {loadingSources ? (
                                    <div className="flex items-center justify-center py-12">
                                        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                                    </div>
                                ) : sources.filter(s => s.type === 'website').length === 0 ? (
                                    <div className="text-center py-12 text-muted-foreground">
                                        <Globe className="h-12 w-12 mx-auto mb-4 opacity-50" />
                                        <p className="text-lg font-medium">No Websites Scraped</p>
                                        <p className="text-sm">This user hasn't scraped any websites yet</p>
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        {sources.filter(s => s.type === 'website').map((source) => (
                                            <div key={source._id} className="border rounded-lg p-4 flex items-start gap-3">
                                                <Globe className="h-5 w-5 text-green-500 mt-1" />
                                                <div className="flex-1">
                                                    <div className="font-medium">{source.url}</div>
                                                    <div className="text-sm text-muted-foreground mt-1">
                                                        {new Date(source.createdAt).toLocaleDateString()} •
                                                        <Badge variant={source.status === 'indexed' ? 'default' : 'secondary'} className="ml-2">
                                                            {source.status}
                                                        </Badge>
                                                    </div>
                                                    {source.url && (
                                                        <a
                                                            href={source.url}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="text-sm text-primary hover:underline flex items-center gap-1 mt-2"
                                                        >
                                                            Visit website
                                                            <ExternalLink className="h-3 w-3" />
                                                        </a>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </TabsContent>

                            <TabsContent value="sources" className="mt-6">
                                {loadingSources ? (
                                    <div className="flex items-center justify-center py-12">
                                        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                                    </div>
                                ) : sources.length === 0 ? (
                                    <div className="text-center py-12 text-muted-foreground">
                                        <Database className="h-12 w-12 mx-auto mb-4 opacity-50" />
                                        <p className="text-lg font-medium">No Data Sources</p>
                                        <p className="text-sm">This user hasn't uploaded any files or scraped any websites yet</p>
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        {sources.map((source) => (
                                            <div key={source._id} className="border rounded-lg p-4 flex items-start gap-3">
                                                {source.type === 'file' ? (
                                                    <File className="h-5 w-5 text-blue-500 mt-1" />
                                                ) : (
                                                    <Globe className="h-5 w-5 text-green-500 mt-1" />
                                                )}
                                                <div className="flex-1">
                                                    <div className="flex items-center gap-2">
                                                        <div className="font-medium">
                                                            {source.type === 'file' ? source.fileName : source.url}
                                                        </div>
                                                        <Badge variant="outline" className="text-xs">
                                                            {source.type}
                                                        </Badge>
                                                    </div>
                                                    <div className="text-sm text-muted-foreground mt-1">
                                                        {source.type === 'file' && source.fileSize && `${(source.fileSize / 1024).toFixed(2)} KB • `}
                                                        {new Date(source.createdAt).toLocaleDateString()} •
                                                        <Badge variant={source.status === 'indexed' ? 'default' : 'secondary'} className="ml-2">
                                                            {source.status}
                                                        </Badge>
                                                    </div>
                                                    {source.type === 'website' && source.url && (
                                                        <a
                                                            href={source.url}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="text-sm text-primary hover:underline flex items-center gap-1 mt-2"
                                                        >
                                                            Visit website
                                                            <ExternalLink className="h-3 w-3" />
                                                        </a>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </TabsContent>
                        </Tabs>
                    </CardContent>
                </Card>
            ) : (
                <Card>
                    <CardContent className="py-12">
                        <div className="text-center text-muted-foreground">
                            <Database className="h-16 w-16 mx-auto mb-4 opacity-50" />
                            <p className="text-lg font-medium">No User Selected</p>
                            <p className="text-sm">Please select a user above to view their knowledge base</p>
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    );
};

export default AdminKnowledgeBase;
