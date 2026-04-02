import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Form, FormField, FormItem, FormLabel, FormControl, FormDescription, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { getUserProfile, updateUserProfile, updateUserPassword, getNotificationPrefs, updateNotificationPrefs } from '@/services/api';
import { toast } from 'sonner';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Copy, Gift } from 'lucide-react';

const profileSchema = z.object({
  name: z.string().min(2, { message: 'Name must be at least 2 characters' }),
  email: z.string().email({ message: 'Please enter a valid email' }),
  website: z.string().optional(),
  brandName: z.string().optional(),
  gstin: z.string().optional(),
  customDashboardDomain: z.string().optional(),
  customEmailFromName: z.string().optional(),
  customEmailReplyTo: z.string().optional(),
});

const passwordSchema = z.object({
  currentPassword: z.string().min(6, { message: 'Password must be at least 6 characters' }),
  newPassword: z.string().min(6, { message: 'Password must be at least 6 characters' }),
  confirmPassword: z.string().min(6, { message: 'Password must be at least 6 characters' }),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type ProfileFormValues = z.infer<typeof profileSchema>;
type PasswordFormValues = z.infer<typeof passwordSchema>;

const UserProfile = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isPasswordSubmitting, setIsPasswordSubmitting] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [notifPrefs, setNotifPrefs] = useState<{ emailOnNewLead: boolean; emailOnLowBalance: boolean; emailSummary: string } | null>(null);
  const [notifSaving, setNotifSaving] = useState(false);

  const profileForm = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: '',
      email: '',
      website: '',
      brandName: '',
      gstin: '',
      customDashboardDomain: '',
      customEmailFromName: '',
      customEmailReplyTo: '',
    }
  });

  const passwordForm = useForm<PasswordFormValues>({
    resolver: zodResolver(passwordSchema),
    defaultValues: {
      currentPassword: '',
      newPassword: '',
      confirmPassword: ''
    }
  });

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const userData = await getUserProfile();
        setUser(userData);

        profileForm.reset({
          name: userData.name,
          email: userData.email,
          website: userData.website || '',
          brandName: userData.brandName || '',
          gstin: userData.gstin || '',
          customDashboardDomain: userData.customDashboardDomain || '',
          customEmailFromName: userData.customEmailFromName || '',
          customEmailReplyTo: userData.customEmailReplyTo || '',
        });
      } catch (error) {
        console.error('Error fetching profile:', error);
        toast.error('Could not load profile data');
      } finally {
        setIsLoading(false);
      }
    };

    fetchProfile();
    getNotificationPrefs().then(setNotifPrefs).catch(() => setNotifPrefs(null));
  }, [profileForm]);

  const onSubmitProfile = async (data: ProfileFormValues) => {
    setIsSubmitting(true);
    try {
      await updateUserProfile({
        name: data.name,
        website: data.website || '',
        brandName: data.brandName || '',
        gstin: data.gstin || undefined,
        customDashboardDomain: data.customDashboardDomain || undefined,
        customEmailFromName: data.customEmailFromName || undefined,
        customEmailReplyTo: data.customEmailReplyTo || undefined,
      });

      setUser({
        ...user,
        name: data.name,
        website: data.website,
        brandName: data.brandName,
        gstin: data.gstin || null,
        customDashboardDomain: data.customDashboardDomain || null,
        customEmailFromName: data.customEmailFromName || null,
        customEmailReplyTo: data.customEmailReplyTo || null,
      });

      toast.success('Profile updated successfully');
    } catch (error: any) {
      console.error('Profile update error:', error);
      toast.error(error.message || 'Failed to update profile');
    } finally {
      setIsSubmitting(false);
    }
  };

  const onSubmitPassword = async (data: PasswordFormValues) => {
    setIsPasswordSubmitting(true);
    try {
      if (data.newPassword !== data.confirmPassword) {
        toast.error('New passwords do not match');
        return;
      }

      await updateUserPassword({
        currentPassword: data.currentPassword,
        newPassword: data.newPassword,
      });

      passwordForm.reset({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });

      toast.success('Password updated successfully');
    } catch (error: any) {
      console.error('Password update error:', error);
      toast.error(error.message || 'Failed to update password');
    } finally {
      setIsPasswordSubmitting(false);
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('');
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
        <h1 className="text-2xl font-semibold mb-2">Profile</h1>
        <p className="text-muted-foreground">Manage your account settings</p>
      </div>

      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Account Information</CardTitle>
            <CardDescription>Update your personal information</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-4 mb-6">
              <Avatar className="h-16 w-16">
                <AvatarFallback className="text-lg bg-primary/10 text-primary">
                  {user ? getInitials(user.name) : 'U'}
                </AvatarFallback>
              </Avatar>
              <div>
                <h3 className="font-medium">{user?.name}</h3>
                <p className="text-sm text-muted-foreground">{user?.email}</p>
                <div className="text-sm text-muted-foreground mt-1">
                  Member since {user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'Unknown'}
                </div>
              </div>
            </div>

            <Form {...profileForm}>
              <form onSubmit={profileForm.handleSubmit(onSubmitProfile)} className="space-y-6">
                <FormField
                  control={profileForm.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Name</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={profileForm.control}
                  name="brandName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Brand Name (Displayed in Chatbot)</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="e.g. Acme Corp" />
                      </FormControl>
                      <FormDescription>
                        This name will be shown to users chatting with your bot.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={profileForm.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input {...field} type="email" disabled />
                      </FormControl>
                      <FormDescription>
                        You cannot change your email address
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={profileForm.control}
                  name="website"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Website</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormDescription>
                        Enter your website domain without https:// or www.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={profileForm.control}
                  name="gstin"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>GSTIN (optional)</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="e.g. 27AABCU9603R1ZM" />
                      </FormControl>
                      <FormDescription>
                        For Indian businesses. Shown on tax invoices.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {user?.whitelabel && (
                  <>
                    <FormField
                      control={profileForm.control}
                      name="customDashboardDomain"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Custom dashboard domain (optional)</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="e.g. app.yourcompany.com" />
                          </FormControl>
                          <FormDescription>
                            CNAME your domain to our app. Links in emails will use this.
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={profileForm.control}
                      name="customEmailFromName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email &quot;From&quot; name (optional)</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="e.g. Your Company Support" />
                          </FormControl>
                          <FormDescription>
                            Name shown as sender in transactional emails.
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={profileForm.control}
                      name="customEmailReplyTo"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email Reply-To (optional)</FormLabel>
                          <FormControl>
                            <Input {...field} type="email" placeholder="support@yourcompany.com" />
                          </FormControl>
                          <FormDescription>
                            Replies from users will go to this address.
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </>
                )}

                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? 'Updating...' : 'Update Profile'}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Change Password</CardTitle>
            <CardDescription>Update your password</CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...passwordForm}>
              <form onSubmit={passwordForm.handleSubmit(onSubmitPassword)} className="space-y-6">
                <FormField
                  control={passwordForm.control}
                  name="currentPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Current Password</FormLabel>
                      <FormControl>
                        <Input {...field} type="password" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={passwordForm.control}
                  name="newPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>New Password</FormLabel>
                      <FormControl>
                        <Input {...field} type="password" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={passwordForm.control}
                  name="confirmPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Confirm Password</FormLabel>
                      <FormControl>
                        <Input {...field} type="password" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button type="submit" disabled={isPasswordSubmitting}>
                  {isPasswordSubmitting ? 'Updating...' : 'Change Password'}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>

        {user?.referralCode && (
        <Card className="border-primary/20 bg-primary/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Gift className="h-5 w-5 text-primary" /> Referral program
            </CardTitle>
            <CardDescription>Share your link. You get 5,000 credits when a friend signs up and makes their first payment.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2">
              <Input
                readOnly
                value={typeof window !== 'undefined' ? `${window.location.origin}/register?ref=${user.referralCode}` : ''}
                className="font-mono text-sm"
              />
              <Button
                variant="outline"
                size="icon"
                onClick={() => {
                  const url = `${window.location.origin}/register?ref=${user.referralCode}`;
                  navigator.clipboard.writeText(url).then(() => toast.success('Link copied'));
                }}
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

        <Card>
          <CardHeader>
            <CardTitle>Notification preferences</CardTitle>
            <CardDescription>Choose when to get email and in-app notifications</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {notifPrefs && (
              <>
                <div className="flex items-center justify-between">
                  <Label htmlFor="email-new-lead">Email when new lead is captured</Label>
                  <Switch
                    id="email-new-lead"
                    checked={notifPrefs.emailOnNewLead}
                    onCheckedChange={async (v) => {
                      setNotifPrefs((p) => (p ? { ...p, emailOnNewLead: v } : null));
                      setNotifSaving(true);
                      try {
                        await updateNotificationPrefs({ emailOnNewLead: v });
                      } finally {
                        setNotifSaving(false);
                      }
                    }}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="email-low-balance">Email on low balance</Label>
                  <Switch
                    id="email-low-balance"
                    checked={notifPrefs.emailOnLowBalance}
                    onCheckedChange={async (v) => {
                      setNotifPrefs((p) => (p ? { ...p, emailOnLowBalance: v } : null));
                      setNotifSaving(true);
                      try {
                        await updateNotificationPrefs({ emailOnLowBalance: v });
                      } finally {
                        setNotifSaving(false);
                      }
                    }}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Summary email</Label>
                  <Select
                    value={notifPrefs.emailSummary}
                    onValueChange={async (v: 'none' | 'daily' | 'weekly') => {
                      setNotifPrefs((p) => (p ? { ...p, emailSummary: v } : null));
                      setNotifSaving(true);
                      try {
                        await updateNotificationPrefs({ emailSummary: v });
                      } finally {
                        setNotifSaving(false);
                      }
                    }}
                  >
                    <SelectTrigger className="w-[180px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      <SelectItem value="daily">Daily</SelectItem>
                      <SelectItem value="weekly">Weekly</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">Chat stats and leads summary (when enabled)</p>
                </div>
                {notifSaving && <p className="text-xs text-muted-foreground">Saving…</p>}
              </>
            )}
          </CardContent>
        </Card>

      </div>
    </div>
  );
};

export default UserProfile;
