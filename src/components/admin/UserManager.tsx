import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Search, UserPlus, Link as LinkIcon, ExternalLink, Users2, Edit, Trash2, MessageSquare, Loader2, Wallet, CheckCircle2, Ban, UserCheck, ShieldAlert } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import ScriptGenerator from '../chatbot/ScriptGenerator';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Form, FormField, FormItem, FormLabel, FormControl, FormDescription, FormMessage } from '@/components/ui/form';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { getUsers, createUser, updateUser, deleteUser } from '@/services/api';
import { useNavigate } from 'react-router-dom';

interface UserFormData {
  name: string;
  email: string;
  password?: string;
  website: string;
  tokenBalance: number;
  isActive?: boolean;
  isApproved?: boolean;
}

interface User {
  _id: string;
  id?: string;
  name: string;
  email: string;
  website: string;
  isActive: boolean;
  isApproved: boolean;
  tokenBalance: number;
  createdAt?: string;
  lastActive?: string;
  qaCount?: number;
  totalChats?: number;
}

const UserManager = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const navigate = useNavigate();

  const addUserForm = useForm<UserFormData>({
    defaultValues: {
      name: '',
      email: '',
      password: '',
      website: '',
      tokenBalance: 50000
    }
  });

  const editUserForm = useForm<UserFormData>({
    defaultValues: {
      name: '',
      email: '',
      website: '',
      tokenBalance: 0,
      isActive: true,
      isApproved: true
    }
  });

  useEffect(() => {
    // Debounce search
    const timer = setTimeout(() => {
      setPage(1); // Reset to page 1 when searching
      fetchUsers();
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  useEffect(() => {
    fetchUsers();
  }, [page]);

  const fetchUsers = async () => {
    setIsLoading(true);
    try {
      const data = await getUsers({
        page,
        limit: 10,
        search: searchTerm || undefined
      });
      // Handle paginated response
      if (data.users) {
        setUsers(data.users);
        setTotalPages(data.pagination?.totalPages || 1);
        setTotal(data.pagination?.total || 0);
      } else {
        setUsers(Array.isArray(data) ? data : []);
      }
    } catch (error) {
      console.error('Error fetching users:', error);
      toast.error('Failed to load users');
      setUsers([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddUser = async (data: UserFormData) => {
    try {
      await createUser({
        name: data.name,
        email: data.email,
        password: data.password || 'defaultPassword123',
        website: data.website,
        tokenBalance: data.tokenBalance
      });

      toast.success('User added successfully');
      setIsAddDialogOpen(false);
      addUserForm.reset();
      await fetchUsers();
    } catch (error) {
      console.error('Error adding user:', error);
      toast.error('Failed to add user');
    }
  };

  const handleEditClick = (user: User) => {
    setSelectedUser(user);
    editUserForm.reset({
      name: user.name,
      email: user.email,
      website: user.website,
      tokenBalance: user.tokenBalance,
      isActive: user.isActive,
      isApproved: user.isApproved
    });
    setIsEditDialogOpen(true);
  };

  const handleEditUser = async (data: UserFormData) => {
    if (!selectedUser) return;

    try {
      await updateUser(selectedUser._id, {
        name: data.name,
        email: data.email,
        website: data.website,
        isActive: data.isActive ?? selectedUser.isActive,
        isApproved: data.isApproved ?? selectedUser.isApproved,
        tokenBalance: data.tokenBalance
      });

      toast.success('User updated successfully');
      setIsEditDialogOpen(false);
      await fetchUsers();
    } catch (error) {
      console.error('Error updating user:', error);
      toast.error('Failed to update user');
    }
  };

  const handleDeleteClick = (user: User) => {
    setSelectedUser(user);
    setIsDeleteDialogOpen(true);
  };

  const handleDeleteUser = async () => {
    if (!selectedUser) return;

    try {
      await deleteUser(selectedUser._id);
      toast.success('User deleted successfully');
      setIsDeleteDialogOpen(false);
      await fetchUsers();
    } catch (error) {
      console.error('Error deleting user:', error);
      toast.error('Failed to delete user');
    }
  };

  const formatDate = (dateStr: string) => {
    try {
      return format(new Date(dateStr), 'MMM d, yyyy');
    } catch (error) {
      return 'Unknown';
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold mb-2">User Management</h1>
        <p className="text-muted-foreground">Manage users, websites, and token balances.</p>
      </div>

      {/* Search and Add User */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search users..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>

        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button className="whitespace-nowrap">
              <UserPlus className="h-4 w-4 mr-2" />
              Add User
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Add New User</DialogTitle>
              <DialogDescription>
                Create a new user with initial token balance.
              </DialogDescription>
            </DialogHeader>

            <Form {...addUserForm}>
              <form onSubmit={addUserForm.handleSubmit(handleAddUser)} className="space-y-4 py-4">
                <FormField
                  control={addUserForm.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Name</FormLabel>
                      <FormControl><Input placeholder="John Doe" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={addUserForm.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl><Input type="email" placeholder="john@example.com" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={addUserForm.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Password</FormLabel>
                      <FormControl><Input type="password" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={addUserForm.control}
                  name="website"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Website</FormLabel>
                      <FormControl><Input placeholder="example.com" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={addUserForm.control}
                  name="tokenBalance"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Initial Tokens</FormLabel>
                      <FormControl><Input type="number" {...field} onChange={e => field.onChange(Number(e.target.value))} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setIsAddDialogOpen(false)}>Cancel</Button>
                  <Button type="submit">Add User</Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Users Table */}
      <Card className="shadow-soft">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Website</TableHead>
                <TableHead>Tokens</TableHead>
                <TableHead className="text-center">Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
                  </TableCell>
                </TableRow>
              ) : users.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    No users found
                  </TableCell>
                </TableRow>
              ) : (
                users.map((user) => (
                  <TableRow key={user._id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar>
                          <AvatarFallback className="bg-primary/10 text-primary">
                            {user.name.split(' ').map(n => n[0]).join('')}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="font-medium">{user.name}</div>
                          <div className="text-sm text-muted-foreground">{user.email}</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>{user.website}</TableCell>
                    <TableCell>
                      <div className="flex items-center text-green-600 font-medium">
                        <Wallet className="h-3 w-3 mr-1" />
                        {user.tokenBalance?.toLocaleString()}
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex flex-col items-center gap-1">
                        {!user.isApproved ? (
                          <div className="flex items-center text-amber-500 text-xs font-medium bg-amber-50 px-2 py-0.5 rounded-full border border-amber-100">
                            <ShieldAlert className="h-3 w-3 mr-1" />
                            Pending
                          </div>
                        ) : !user.isActive ? (
                          <div className="flex items-center text-red-500 text-xs font-medium bg-red-50 px-2 py-0.5 rounded-full border border-red-100">
                            <Ban className="h-3 w-3 mr-1" />
                            Inactive
                          </div>
                        ) : (
                          <div className="flex items-center text-green-600 text-xs font-medium bg-green-50 px-2 py-0.5 rounded-full border border-green-100">
                            <CheckCircle2 className="h-3 w-3 mr-1" />
                            Active
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end space-x-1">
                        {!user.isApproved && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-green-600 hover:text-green-700 hover:bg-green-50"
                            onClick={async () => {
                              try {
                                await updateUser(user._id, {
                                  name: user.name,
                                  email: user.email,
                                  website: user.website,
                                  isActive: user.isActive,
                                  isApproved: true,
                                  tokenBalance: user.tokenBalance
                                });
                                toast.success('User approved successfully');
                                fetchUsers();
                              } catch (error) {
                                toast.error('Failed to approve user');
                              }
                            }}
                          >
                            <UserCheck className="h-4 w-4" />
                          </Button>
                        )}
                        <Button variant="ghost" size="sm" onClick={() => handleEditClick(user)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => handleDeleteClick(user)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
        <div className="flex items-center justify-between px-6 py-4 border-t">
          <div className="text-sm text-muted-foreground">
            Showing {users.length} of {total} users
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1 || isLoading}
            >
              Previous
            </Button>
            <div className="text-sm">
              Page {page} of {totalPages || 1}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages || isLoading}
            >
              Next
            </Button>
          </div>
        </div>
      </Card>

      {/* Edit User Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Edit User & Wallet</DialogTitle>
          </DialogHeader>

          <Form {...editUserForm}>
            <form onSubmit={editUserForm.handleSubmit(handleEditUser)} className="space-y-4 py-4">
              <FormField
                control={editUserForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name</FormLabel>
                    <FormControl><Input {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={editUserForm.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl><Input {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={editUserForm.control}
                name="website"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Website</FormLabel>
                    <FormControl><Input {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={editUserForm.control}
                name="tokenBalance"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Token Balance (Wallet)</FormLabel>
                    <FormControl><Input type="number" {...field} onChange={e => field.onChange(Number(e.target.value))} /></FormControl>
                    <FormDescription>Directly credit/debit tokens.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={editUserForm.control}
                  name="isActive"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                      <div className="space-y-0.5">
                        <FormLabel>Active Status</FormLabel>
                        <FormDescription>Enable/Disable account</FormDescription>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <FormField
                  control={editUserForm.control}
                  name="isApproved"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                      <div className="space-y-0.5">
                        <FormLabel>Admin Approval</FormLabel>
                        <FormDescription>Account approved</FormDescription>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsEditDialogOpen(false)}>Cancel</Button>
                <Button type="submit">Update User</Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Delete User Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Delete User</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this user? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDeleteUser}>Delete User</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default UserManager;
