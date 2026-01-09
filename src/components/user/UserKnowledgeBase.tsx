
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Search, Edit, Trash2, Save, X, MessageSquare, Filter, FileUp, Globe, Loader2, Database, File, ExternalLink, Wallet } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { getCurrentUserQAs, createUserQA, updateUserQA, deleteUserQA, uploadFile, scrapeWebsite, getUserSources } from '@/services/api';

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
  type: 'file' | 'website';
  fileName?: string;
  fileSize?: number;
  url?: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

const UserKnowledgeBase = () => {
  const [qas, setQAs] = useState<QA[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [editing, setEditing] = useState<string | null>(null);
  const [formData, setFormData] = useState<Partial<QA>>({
    question: '',
    answer: '',
    category: 'General'
  });
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // File Upload State
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  // Scrape State
  const [scrapeUrl, setScrapeUrl] = useState('');
  const [isScraping, setIsScraping] = useState(false);

  // Sources State
  const [sources, setSources] = useState<Source[]>([]);
  const [isLoadingSources, setIsLoadingSources] = useState(false);
  const [activeTab, setActiveTab] = useState('qa');

  const categories = ['General', 'Orders', 'Returns', 'Shipping', 'Support', 'Pricing', 'Technical'];

  useEffect(() => {
    fetchQAs();
  }, []);

  // Fetch sources when Data Sources tab is selected
  useEffect(() => {
    if (activeTab === 'sources') {
      fetchSources();
    }
  }, [activeTab]);

  const fetchQAs = async () => {
    setIsLoading(true);
    try {
      const data = await getCurrentUserQAs();
      setQAs(data);
    } catch (error) {
      console.error('Error fetching QAs:', error);
      toast.error('Failed to load your Q&A entries');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchSources = async () => {
    setIsLoadingSources(true);
    try {
      const data = await getUserSources();
      setSources(data.sources || []);
    } catch (error) {
      console.error('Error fetching sources:', error);
      toast.error('Failed to load sources');
    } finally {
      setIsLoadingSources(false);
    }
  };

  const filteredQAs = qas.filter(qa => {
    const matchesSearch = qa.question.toLowerCase().includes(searchTerm.toLowerCase()) ||
      qa.answer.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = categoryFilter === 'All' || qa.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSelectChange = (value: string) => {
    setFormData(prev => ({ ...prev, category: value }));
  };

  const handleFilterChange = (value: string) => {
    setCategoryFilter(value);
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
        category: formData.category
      });

      setQAs(prev => [...prev, newQA]);
      setFormData({ question: '', answer: '', category: 'General' });
      setIsAddDialogOpen(false);
      toast.success('Question and answer added successfully');
    } catch (error) {
      console.error('Error adding QA:', error);
      toast.error('Failed to add question and answer');
    }
  };

  const handleEditQA = (id: string) => {
    const qaToEdit = qas.find(qa => qa._id === id);
    if (qaToEdit) {
      setFormData(qaToEdit);
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
        category: formData.category
      });

      setQAs(prev => prev.map(qa =>
        qa._id === editing
          ? {
            ...qa,
            question: formData.question || '',
            answer: formData.answer || '',
            category: formData.category || 'General',
            updatedAt: new Date().toISOString()
          }
          : qa
      ));

      setEditing(null);
      setFormData({ question: '', answer: '', category: 'General' });
      toast.success('Question and answer updated successfully');
    } catch (error) {
      console.error('Error updating QA:', error);
      toast.error('Failed to update question and answer');
    }
  };

  const handleCancelEdit = () => {
    setEditing(null);
    setFormData({ question: '', answer: '', category: 'General' });
  };

  const handleDeleteQA = async (id: string) => {
    try {
      await deleteUserQA(id);
      setQAs(prev => prev.filter(qa => qa._id !== id));
      toast.success('Question and answer deleted successfully');
    } catch (error) {
      console.error('Error deleting QA:', error);
      toast.error('Failed to delete question and answer');
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleUploadFile = async () => {
    if (!file) {
      toast.error('Please select a file to upload');
      return;
    }

    setIsUploading(true);
    try {
      await uploadFile(file);
      toast.success('File uploaded and processed successfully');
      setFile(null);
      // Reset file input
      const fileInput = document.getElementById('file-upload') as HTMLInputElement;
      if (fileInput) fileInput.value = '';
      // Refresh sources list
      fetchSources();
    } catch (error: any) {
      console.error('Error uploading file:', error);
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
    try {
      await scrapeWebsite(scrapeUrl);
      toast.success('Website scraped and processed successfully');
      setScrapeUrl('');
      // Refresh sources list
      fetchSources();
    } catch (error: any) {
      console.error('Error scraping website:', error);
      toast.error(error.message || 'Failed to scrape website');
    } finally {
      setIsScraping(false);
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold mb-2">Knowledge Base</h1>
        <p className="text-muted-foreground">Manage your chatbot's knowledge sources.</p>
      </div>

      {/* Token Pricing Information Card */}
      <Card className="border-primary/20 bg-primary/5">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Wallet className="h-5 w-5 text-primary" />
            Token Pricing
          </CardTitle>
          <CardDescription>
            Understand the token costs for each action
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-start gap-3 p-3 rounded-lg bg-background/50">
              <MessageSquare className="h-5 w-5 text-blue-500 mt-0.5" />
              <div>
                <p className="font-medium text-sm">Chat Message</p>
                <p className="text-2xl font-bold text-primary">~1 Token</p>
                <p className="text-xs text-muted-foreground">per word</p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 rounded-lg bg-background/50">
              <FileUp className="h-5 w-5 text-purple-500 mt-0.5" />
              <div>
                <p className="font-medium text-sm">File Upload</p>
                <p className="text-2xl font-bold text-primary">10,000</p>
                <p className="text-xs text-muted-foreground">Tokens per file</p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 rounded-lg bg-background/50">
              <Globe className="h-5 w-5 text-green-500 mt-0.5" />
              <div>
                <p className="font-medium text-sm">Web Scrape</p>
                <p className="text-2xl font-bold text-primary">5,000</p>
                <p className="text-xs text-muted-foreground">Tokens per URL</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="qa">
            <MessageSquare className="h-4 w-4 mr-2" />
            Q&A Pairs
          </TabsTrigger>
          <TabsTrigger value="upload">
            <FileUp className="h-4 w-4 mr-2" />
            File Upload
          </TabsTrigger>
          <TabsTrigger value="scrape">
            <Globe className="h-4 w-4 mr-2" />
            Website Scraping
          </TabsTrigger>
          <TabsTrigger value="sources">
            <Database className="h-4 w-4 mr-2" />
            Data Sources
          </TabsTrigger>
        </TabsList>

        <TabsContent value="qa" className="mt-6">
          {/* Filters and Search */}
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search questions or answers..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            <div className="flex gap-4">
              <div className="w-48">
                <Select value={categoryFilter} onValueChange={handleFilterChange}>
                  <SelectTrigger>
                    <div className="flex items-center gap-2">
                      <Filter className="h-4 w-4" />
                      <SelectValue placeholder="Category" />
                    </div>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="All">All Categories</SelectItem>
                    {categories.map((category) => (
                      <SelectItem key={category} value={category}>{category}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="whitespace-nowrap">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Question
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[600px]">
                  <DialogHeader>
                    <DialogTitle>Add New Question & Answer</DialogTitle>
                    <DialogDescription>
                      Create a new entry for your chatbot's knowledge base.
                    </DialogDescription>
                  </DialogHeader>

                  <div className="grid gap-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="question">Question</Label>
                      <Input
                        id="question"
                        name="question"
                        value={formData.question}
                        onChange={handleInputChange}
                        placeholder="Enter the question"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="answer">Answer</Label>
                      <Textarea
                        id="answer"
                        name="answer"
                        value={formData.answer}
                        onChange={handleInputChange}
                        placeholder="Enter the answer"
                        rows={5}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="category">Category</Label>
                      <Select
                        value={formData.category}
                        onValueChange={handleSelectChange}
                      >
                        <SelectTrigger id="category">
                          <SelectValue placeholder="Select a category" />
                        </SelectTrigger>
                        <SelectContent>
                          {categories.map((category) => (
                            <SelectItem key={category} value={category}>{category}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <DialogFooter>
                    <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button onClick={handleAddQA}>
                      Add Q&A
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </div>

          {/* QA Table */}
          <Card className="shadow-soft">
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[300px]">Question</TableHead>
                    <TableHead className="w-[300px]">Answer</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead className="text-center">Frequency</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8">
                        <div className="flex flex-col items-center justify-center text-muted-foreground">
                          <div className="loading-spinner mb-2"></div>
                          <p>Loading questions...</p>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : filteredQAs.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8">
                        <div className="flex flex-col items-center justify-center text-muted-foreground">
                          <MessageSquare className="h-8 w-8 mb-2 opacity-50" />
                          <p>No questions found</p>
                          <p className="text-sm">Try adjusting your search or add a new question</p>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredQAs.map((qa) => (
                      <TableRow key={qa._id}>
                        <TableCell className="font-medium align-top">
                          {editing === qa._id ? (
                            <Input
                              name="question"
                              value={formData.question}
                              onChange={handleInputChange}
                              className="mb-2"
                            />
                          ) : (
                            qa.question
                          )}
                        </TableCell>
                        <TableCell className="align-top">
                          {editing === qa._id ? (
                            <Textarea
                              name="answer"
                              value={formData.answer}
                              onChange={handleInputChange}
                              rows={3}
                              className="mb-2"
                            />
                          ) : (
                            <div className="max-h-20 overflow-hidden text-ellipsis">
                              {qa.answer}
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="align-top">
                          {editing === qa._id ? (
                            <Select
                              value={formData.category}
                              onValueChange={handleSelectChange}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Category" />
                              </SelectTrigger>
                              <SelectContent>
                                {categories.map((category) => (
                                  <SelectItem key={category} value={category}>{category}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          ) : (
                            <Badge variant="outline" className="bg-muted/50">
                              {qa.category}
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-center align-top">
                          {qa.frequency}
                        </TableCell>
                        <TableCell className="text-right space-x-2 align-top">
                          {editing === qa._id ? (
                            <>
                              <Button size="icon" variant="ghost" onClick={handleCancelEdit}>
                                <X className="h-4 w-4" />
                              </Button>
                              <Button size="icon" variant="ghost" onClick={handleSaveEdit}>
                                <Save className="h-4 w-4" />
                              </Button>
                            </>
                          ) : (
                            <>
                              <Button size="icon" variant="ghost" onClick={() => handleEditQA(qa._id)}>
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button size="icon" variant="ghost" onClick={() => handleDeleteQA(qa._id)}>
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </>
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="upload" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Data Upload</CardTitle>
              <CardDescription>
                Upload documents (PDF, Docx, TXT) to train your chatbot. Max 10MB per file.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid w-full max-w-sm items-center gap-1.5">
                <Label htmlFor="file-upload">Document</Label>
                <Input id="file-upload" type="file" onChange={handleFileChange} accept=".pdf,.doc,.docx,.txt" />
              </div>
              <Button onClick={handleUploadFile} disabled={!file || isUploading}>
                {isUploading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <FileUp className="mr-2 h-4 w-4" />
                    Upload & Train
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="scrape" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Website Scraping</CardTitle>
              <CardDescription>
                Enter a URL to scrape content from. The chatbot will learn from this page.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid w-full max-w-md items-center gap-1.5">
                <Label htmlFor="url-scrape">Website URL</Label>
                <Input
                  id="url-scrape"
                  type="url"
                  placeholder="https://example.com/about"
                  value={scrapeUrl}
                  onChange={(e) => setScrapeUrl(e.target.value)}
                />
              </div>
              <Button onClick={handleScrapeWebsite} disabled={!scrapeUrl || isScraping}>
                {isScraping ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Scraping...
                  </>
                ) : (
                  <>
                    <Globe className="mr-2 h-4 w-4" />
                    Scrape & Train
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="sources" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Your Data Sources</CardTitle>
              <CardDescription>
                View all files and websites you've added to train your chatbot.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingSources ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : sources.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Database className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p className="text-lg font-medium">No data sources yet</p>
                  <p className="text-sm">Upload files or scrape websites to get started</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {sources.map((source) => (
                    <div
                      key={source._id}
                      className="border rounded-lg p-4 hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-3 flex-1">
                          <div className="mt-1">
                            {source.type === 'file' ? (
                              <File className="h-5 w-5 text-blue-500" />
                            ) : (
                              <Globe className="h-5 w-5 text-green-500" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <h4 className="font-medium truncate">
                                {source.type === 'file' ? source.fileName : source.url}
                              </h4>
                              <Badge variant={
                                source.status === 'indexed' || source.status === 'processed_and_deleted'
                                  ? 'default'
                                  : source.status === 'failed'
                                    ? 'destructive'
                                    : 'secondary'
                              }>
                                {source.status}
                              </Badge>
                            </div>
                            <div className="flex items-center gap-4 text-sm text-muted-foreground">
                              <span className="capitalize">{source.type}</span>
                              {source.fileSize && (
                                <span>{(source.fileSize / 1024).toFixed(2)} KB</span>
                              )}
                              <span>{new Date(source.createdAt).toLocaleDateString()}</span>
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
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default UserKnowledgeBase;
