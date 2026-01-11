import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { MessageSquareText, LogIn, Mail, Lock, ArrowLeft, Key } from 'lucide-react';
import { toast } from 'sonner';
import { login, forgotPassword, resetPassword } from '@/services/api';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  // Forgot Password States
  const [isForgotMode, setIsForgotMode] = useState(false);
  const [resetStep, setResetStep] = useState(1); // 1: Email, 2: OTP & New Pass
  const [resetEmail, setResetEmail] = useState('');
  const [resetOtp, setResetOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email || !password) {
      toast.error('Please enter both email and password');
      return;
    }

    setIsLoading(true);

    try {
      const data = await login(email, password);
      localStorage.setItem('token', data.token);
      localStorage.setItem('isAdmin', data.isAdmin ? 'true' : 'false');
      toast.success('Login successful');

      if (data.isAdmin) {
        navigate('/admin');
      } else {
        navigate('/user');
      }
    } catch (error: any) {
      console.error('Login error:', error);

      if (error.requiresVerification) {
        toast.info(error.message);
        // We can't easily redirect to Register with state to open OTP modal without complex state management
        // For now, let's just show a clear message.
      } else {
        toast.error(error.message || 'Login failed');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetEmail) {
      toast.error('Please enter your email address');
      return;
    }

    setIsLoading(true);
    try {
      await forgotPassword(resetEmail);
      toast.success('Check your email for the password reset OTP');
      setResetStep(2);
    } catch (error: any) {
      toast.error(error.message || 'Failed to send reset OTP');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmNewPassword) {
      toast.error('Passwords do not match');
      return;
    }
    if (resetOtp.length < 6) {
      toast.error('Please enter a valid 6-digit OTP');
      return;
    }

    setIsLoading(true);
    try {
      await resetPassword({
        email: resetEmail,
        otp: resetOtp,
        newPassword: newPassword
      });
      toast.success('Password updated successfully! You can now login.');
      setIsForgotMode(false);
      setResetStep(1);
    } catch (error: any) {
      toast.error(error.message || 'Reset failed');
    } finally {
      setIsLoading(false);
    }
  };

  // FORGOT PASSWORD UI
  if (isForgotMode) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30 px-4">
        <div className="w-full max-w-md">
          <div className="mb-8 text-center">
            <div className="flex items-center justify-center">
              <Key className="h-10 w-10 text-primary mb-2" />
            </div>
            <h1 className="text-2xl font-bold">Forgot Password?</h1>
            <p className="text-muted-foreground mt-2">
              {resetStep === 1
                ? "Enter your email to receive a password reset code"
                : "Reset your password with the code sent to your email"}
            </p>
          </div>

          <Card className="shadow-premium border-t-4 border-t-primary">
            <CardHeader>
              <CardTitle>{resetStep === 1 ? 'Recover Account' : 'Set New Password'}</CardTitle>
            </CardHeader>
            <CardContent>
              {resetStep === 1 ? (
                <form onSubmit={handleForgotPassword} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="resetEmail">Email Address</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="resetEmail"
                        type="email"
                        placeholder="your@email.com"
                        className="pl-10"
                        value={resetEmail}
                        onChange={(e) => setResetEmail(e.target.value)}
                        required
                      />
                    </div>
                  </div>
                  <Button type="submit" className="w-full h-11" disabled={isLoading}>
                    {isLoading ? 'Sending...' : 'Send Reset Code'}
                  </Button>
                </form>
              ) : (
                <form onSubmit={handleResetPassword} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="resetOtp">Enter Code</Label>
                    <Input
                      id="resetOtp"
                      type="text"
                      placeholder="6-digit OTP"
                      className="text-center text-xl tracking-widest font-bold h-11"
                      value={resetOtp}
                      onChange={(e) => setResetOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="newPass">New Password</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="newPass"
                        type="password"
                        placeholder="••••••••"
                        className="pl-10"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        required
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="confPass">Confirm New Password</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="confPass"
                        type="password"
                        placeholder="••••••••"
                        className="pl-10"
                        value={confirmNewPassword}
                        onChange={(e) => setConfirmNewPassword(e.target.value)}
                        required
                      />
                    </div>
                  </div>
                  <Button type="submit" className="w-full h-11" disabled={isLoading}>
                    {isLoading ? 'Resetting...' : 'Update Password'}
                  </Button>
                </form>
              )}
            </CardContent>
            <CardFooter>
              <Button
                variant="ghost"
                className="w-full group"
                onClick={() => {
                  if (resetStep === 2) setResetStep(1);
                  else setIsForgotMode(false);
                }}
              >
                <ArrowLeft className="mr-2 h-4 w-4 group-hover:-translate-x-1 transition-transform" />
                Back to Sign In
              </Button>
            </CardFooter>
          </Card>
        </div>
      </div>
    );
  }

  // LOGIN UI
  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 px-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <div className="flex items-center justify-center">
            <MessageSquareText className="h-10 w-10 text-primary mb-2" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight">Welcome Back</h1>
          <p className="text-muted-foreground mt-2">
            Sign in to manage your AI Agents
          </p>
        </div>

        <Card className="shadow-premium border-t-4 border-t-primary">
          <CardHeader>
            <CardTitle>Sign In</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="name@example.com"
                    className="pl-10 h-11"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    autoComplete="email"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">Password</Label>
                  <button
                    type="button"
                    onClick={() => setIsForgotMode(true)}
                    className="text-sm font-medium text-primary hover:underline hover:text-primary/80 transition-colors"
                  >
                    Forgot password?
                  </button>
                </div>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    className="pl-10 h-11"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="current-password"
                  />
                </div>
              </div>

              <Button type="submit" className="w-full h-11 text-lg" disabled={isLoading}>
                {isLoading ? (
                  <div className="flex items-center space-x-2">
                    <span className="animate-pulse">Signing in...</span>
                  </div>
                ) : (
                  <>
                    <LogIn className="mr-2 h-5 w-5" />
                    Sign In
                  </>
                )}
              </Button>
            </form>
          </CardContent>
          <CardFooter className="flex flex-col space-y-4 border-t pt-6 bg-muted/10">
            <div className="text-center text-sm">
              <span className="text-muted-foreground">New to our platform?</span>{' '}
              <Link to="/register" className="text-primary font-bold hover:underline ml-1">
                Create an account
              </Link>
            </div>
          </CardFooter>
        </Card>

        <div className="mt-8 text-center text-sm text-muted-foreground group">
          <Link to="/" className="inline-flex items-center hover:text-primary transition-colors">
            <ArrowLeft className="mr-2 h-4 w-4 group-hover:-translate-x-1 transition-transform" />
            Back to landing page
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Login;
