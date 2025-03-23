import React, { useState, useEffect } from 'react';
import { 
  getPlans, 
  createPlan, 
  updatePlan, 
  deletePlan 
} from '@/services/api';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { 
  Card, 
  CardContent, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { 
  Form, 
  FormControl, 
  FormDescription, 
  FormField, 
  FormItem, 
  FormLabel, 
  FormMessage 
} from '@/components/ui/form';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from '@/components/ui/dialog';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { 
  Plus, 
  MoreVertical, 
  Pencil, 
  Trash2, 
  Star, 
  Loader2 
} from 'lucide-react';

// Define the form schema
const planFormSchema = z.object({
  name: z.string().min(1, { message: "Name is required" }),
  description: z.string().min(1, { message: "Description is required" }),
  price: z.coerce.number().nonnegative({ message: "Price must be positive" }),
  discountPrice: z.coerce.number().nonnegative({ message: "Discount price must be non-negative" }).optional(),
  tokens: z.coerce.number().nonnegative({ message: "Tokens must be positive" }),
  // features: z.array(z.string()).min(1, { message: "At least one feature is required" }),
  isPopular: z.boolean().default(false)
});

type PlanFormValues = z.infer<typeof planFormSchema>;

interface Plan {
  _id: string;
  name: string;
  description: string;
  price: number;
  discountPrice?: number;
  tokens: number;
  features: string[];
  isPopular: boolean;
  createdAt: string;
  updatedAt: string;
}

const PlanManager = () => {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [open, setOpen] = useState<boolean>(false);
  const [editingPlan, setEditingPlan] = useState<Plan | null>(null);
  const [deletingPlan, setDeletingPlan] = useState<Plan | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<boolean>(false);
  const [features, setFeatures] = useState<string[]>([]);
  const [newFeature, setNewFeature] = useState<string>('');

  const form = useForm<PlanFormValues>({
    resolver: zodResolver(planFormSchema),
    defaultValues: {
      name: '',
      description: '',
      price: 0,
      tokens: 0,
      features: [],
      isPopular: false
    }
  });

  const fetchPlans = async () => {
    try {
      setLoading(true);
      const data = await getPlans();
      setPlans(data);
    } catch (error) {
      toast.error('Failed to fetch plans');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPlans();
  }, []);

  useEffect(() => {
    if (editingPlan) {
      form.reset({
        name: editingPlan.name,
        description: editingPlan.description,
        price: editingPlan.price,
        discountPrice: editingPlan.discountPrice,
        tokens: editingPlan.tokens,
        features: editingPlan.features,
        isPopular: editingPlan.isPopular
      });
      setFeatures(editingPlan.features);
    } else {
      form.reset({
        name: '',
        description: '',
        price: 0,
        discountPrice: undefined,
        tokens: 0,
        features: [],
        isPopular: false
      });
      setFeatures([]);
    }
  }, [editingPlan, form]);

  const handleSubmit = async (values: PlanFormValues) => {
    try {
      // Include all required properties with their correct types
      // This ensures the object matches the API function parameter type
      const formData = {
        name: values.name,
        description: values.description,
        price: values.price,
        discountPrice: values.discountPrice,
        tokens: values.tokens,
        features: features,
        isPopular: values.isPopular
      };
     console.log("Form data on submit ==>",formData)
      if (editingPlan) {
        await updatePlan(editingPlan._id, formData);
        toast.success('Plan updated successfully');
      } else {
        await createPlan(formData);
        toast.success('Plan created successfully');
      }
      setOpen(false);
      setEditingPlan(null);
      fetchPlans();
    } catch (error) {
      toast.error(editingPlan ? 'Failed to update plan' : 'Failed to create plan');
      console.error(error);
    }
  };

  const handleDelete = async () => {
    if (!deletingPlan) return;
    
    try {
      await deletePlan(deletingPlan._id);
      toast.success('Plan deleted successfully');
      setConfirmDelete(false);
      setDeletingPlan(null);
      fetchPlans();
    } catch (error) {
      toast.error('Failed to delete plan');
      console.error(error);
    }
  };

  const addFeature = () => {
    if (newFeature.trim() === '') return;
    console.log('Adding feature',newFeature)
    setFeatures([...features, newFeature.trim()]);
    setNewFeature('');
  };

  const removeFeature = (index: number) => {
    setFeatures(features.filter((_, i) => i !== index));
  };

  const openCreateDialog = () => {
    setEditingPlan(null);
    setOpen(true);
  };

  const openEditDialog = (plan: Plan) => {
    setEditingPlan(plan);
    setOpen(true);
  };

  const openDeleteDialog = (plan: Plan) => {
    setDeletingPlan(plan);
    setConfirmDelete(true);
  };

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-semibold mb-2">Plans Management</h1>
          <p className="text-muted-foreground">Create and manage plans for your chatbot service</p>
        </div>
        <Button onClick={openCreateDialog}>
          <Plus className="h-4 w-4 mr-2" />
          Add Plan
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Plans</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center items-center h-64">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : plans.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground mb-4">No plans found. Create your first plan to get started.</p>
              <Button onClick={openCreateDialog}>
                <Plus className="h-4 w-4 mr-2" />
                Add Plan
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead>Tokens</TableHead>
                  <TableHead>Features</TableHead>
                  <TableHead className="text-center">Popular</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {plans.map((plan) => (
                  <TableRow key={plan._id}>
                    <TableCell className="font-medium">{plan.name}</TableCell>
                    <TableCell>
                      {plan.discountPrice ? (
                        <div>
                          <span className="text-muted-foreground line-through">INR {plan.price}</span>
                          <span className="ml-2 text-green-500 font-medium">INR {plan.discountPrice}</span>
                        </div>
                      ) : (
                        <span>INR {plan.price}</span>
                      )}
                    </TableCell>
                    <TableCell>{plan.tokens.toLocaleString()}</TableCell>
                    <TableCell>
                      <div className="max-w-md truncate">
                        {plan.features.slice(0, 2).join(", ")}
                        {plan.features.length > 2 && "..."}
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      {plan.isPopular && <Star className="h-4 w-4 text-yellow-500 inline" />}
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => openEditDialog(plan)}>
                            <Pencil className="h-4 w-4 mr-2" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={() => openDeleteDialog(plan)}
                            className="text-destructive focus:text-destructive"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Create/Edit Plan Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingPlan ? 'Edit Plan' : 'Create New Plan'}</DialogTitle>
            <DialogDescription>
              {editingPlan 
                ? 'Make changes to the existing plan' 
                : 'Add a new pricing plan to your chatbot service'}
            </DialogDescription>
          </DialogHeader>
          
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Basic Plan" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="isPopular"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-end space-x-2">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <FormLabel>Mark as Popular</FormLabel>
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="A brief description of the plan" 
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="price"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Price (INR)</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          placeholder="29.99" 
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="discountPrice"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Discount Price (INR)</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          placeholder="19.99" 
                          {...field}
                          value={field.value || ''}
                        />
                      </FormControl>
                      <FormDescription>Optional</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="tokens"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tokens</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          placeholder="1000" 
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div>
                <FormLabel>Features</FormLabel>
                <div className="space-y-4 mt-2">
                  <div className="flex gap-2">
                    <Input
                      value={newFeature}
                      onChange={(e) => setNewFeature(e.target.value)}
                      placeholder="Add a feature..."
                      className="flex-1"
                    />
                    <Button 
                      type="button" 
                      onClick={addFeature}
                    >
                      Add
                    </Button>
                  </div>
                  
                  {features.length === 0 && (
                    <p className="text-sm text-muted-foreground">
                      No features added. Add at least one feature.
                    </p>
                  )}
                  
                  <ul className="space-y-2">
                    {features.map((feature, index) => (
                      <li key={index} className="flex items-center justify-between rounded-md border p-2">
                        <span>{feature}</span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => removeFeature(index)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </li>
                    ))}
                  </ul>
                </div>
                {form.formState.errors.features && (
                  <p className="text-sm font-medium text-destructive mt-2">
                    {form.formState.errors.features.message}
                  </p>
                )}
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit">
                  {editingPlan ? 'Update Plan' : 'Create Plan'}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Deletion</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete the plan "{deletingPlan?.name}"? 
              This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDelete(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PlanManager;
