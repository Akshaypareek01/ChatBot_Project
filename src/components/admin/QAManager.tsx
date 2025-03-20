
import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { QA, mockQAs } from '@/utils/mockData';
import { Plus, Search, Edit, Trash2, Save, X, MessageSquare, Filter } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useLocation } from 'react-router-dom';
import { getUserQAs, createQA, updateQA, deleteQA } from '@/services/api';

const QAManager = () => {
  const location = useLocation();
  const [userId, setUserId] = useState('');
  const [qas, setQAs] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [editing, setEditing] = useState<string | null>(null);
  const [formData, setFormData] = useState<Partial<QA>>({
    question: '',
    answer: '',
    category: 'General'
  });
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const categories = ['General', 'Orders', 'Returns', 'Shipping', 'Support', 'Pricing', 'Technical'];

  // const filteredQAs = qas.filter(qa => {
  //   const matchesSearch = qa.question.toLowerCase().includes(searchTerm.toLowerCase()) || 
  //                         qa.answer.toLowerCase().includes(searchTerm.toLowerCase());
  //   const matchesCategory = categoryFilter === 'All' || qa.category === categoryFilter;
  //   return matchesSearch && matchesCategory;
  // });
  const fetchQAs = async (userId) => {
    setLoading(true);
    try {
      const data = await getUserQAs(userId);
      setQAs(data);
    } catch (error) {
      toast.error(error.message || 'Failed to load QAs');
    } finally {
      setLoading(false);
    }
  };


  useEffect(() => {
   const queryParams = new URLSearchParams(location.search);
    const id = queryParams.get('userId');
    if (id) {
      setUserId(id);
      fetchQAs(id);
    }

    // fetchQAs();
  }, [userId]);

  const filteredQAs = qas.filter(qa => {
    const matchesSearch = qa.question.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          qa.answer.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = categoryFilter === 'All' || qa.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const handleInputChange = (e:any) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSelectChange = (value:any) => {
    setFormData((prev) => ({ ...prev, category: value }));
  };

  const handleFilterChange = (value:any) => {
    setCategoryFilter(value);
  };

  const handleAddQA = async () => {
    if (!formData.question || !formData.answer || !formData.category) {
      toast.error('Please fill out all fields');
      return;
    }

    try {
      const newQA = await createQA({
        userId,
        question: formData.question,
        answer: formData.answer,
        category: formData.category
      });

      setQAs((prev) => [...prev, newQA]);
      setFormData({ question: '', answer: '', category: 'General' });
      setIsAddDialogOpen(false);
      toast.success('QA added successfully');
    } catch (error) {
      toast.error(error.message || 'Failed to add QA');
    }
  };

  const handleEditQA = (id:any) => {
    const qaToEdit = qas.find((qa) => qa._id === id);
    if (qaToEdit) {
      setFormData({
        question: qaToEdit.question,
        answer: qaToEdit.answer,
        category: qaToEdit.category
      });
      setEditing(id);
    }
  };

  const handleSaveEdit = async () => {
    if (!formData.question || !formData.answer || !formData.category || !editing) {
      toast.error('Please fill out all fields');
      return;
    }

    try {
      const updatedQA = await updateQA(editing, {
        question: formData.question,
        answer: formData.answer,
        category: formData.category
      });

      setQAs((prev) =>
        prev.map((qa) => (qa._id === editing ? { ...qa, ...updatedQA } : qa))
      );

      setEditing(null);
      setFormData({ question: '', answer: '', category: 'General' });
      toast.success('QA updated successfully');
    } catch (error) {
      toast.error(error.message || 'Failed to update QA');
    }
  };

  const handleCancelEdit = () => {
    setEditing(null);
    setFormData({ question: '', answer: '', category: 'General' });
  };

  const handleDeleteQA = async (id:any) => {
    try {
      await deleteQA(id);
      setQAs((prev) => prev.filter((qa) => qa._id !== id));
      toast.success('QA deleted successfully');
    } catch (error) {
      toast.error(error.message || 'Failed to delete QA');
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold mb-2">Q&A Management</h1>
        <p className="text-muted-foreground">Add, edit, and manage your chatbot's knowledge base</p>
      </div>
      
      {/* Filters and Search */}
      <div className="flex flex-col sm:flex-row gap-4">
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
              {filteredQAs.length === 0 ? (
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
    </div>
  );
};

export default QAManager;
