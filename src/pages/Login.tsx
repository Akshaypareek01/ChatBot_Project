
import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { MessageSquareText, LogIn } from 'lucide-react';
import { toast } from 'sonner';
import { adminLogin, login } from '@/services/api';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  // Check if already logged in
  useEffect(() => {
    const token = localStorage.getItem('token');
  }, [navigate]);

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

      // Navigate based on user role
      if (data.isAdmin) {
        navigate('/admin');
      } else {
        navigate('/user');
      }
    } catch (error: any) {
      console.error('Login error:', error);

      // Handle different error types
      if (error.response?.status === 429) {
        toast.error('Too many login attempts. Please try again in a few minutes.', {
          duration: 5000,
        });
      } else if (error.response?.status === 401) {
        toast.error('Invalid email or password');
      } else if (error.response?.status === 404) {
        toast.error('Account not found. Please register first.');
      } else if (error.message) {
        toast.error(error.message);
      } else {
        toast.error('Login failed. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 px-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <div className="flex items-center justify-center">
            <MessageSquareText className="h-8 w-8 text-primary mb-2" />
          </div>
          <h1 className="text-2xl font-bold">Sign in to your custom Admin Panel</h1>
          <p className="text-muted-foreground mt-2">
            Enter your credentials to access the admin dashboard
          </p>
        </div>

        <Card className="shadow-premium">
          <CardHeader>
            <CardTitle>Sign In</CardTitle>
            {/* <CardDescription>
              Use email: admin@gmail.com and password: admin1234 for demo access
            </CardDescription> */}
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="example@gmail.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">Password</Label>
                  <Link to="#" className="text-sm text-primary hover:underline">
                    Forgot password?
                  </Link>
                </div>
                <Input
                  id="password"
                  type="password"
                  placeholder="example1234"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                />
              </div>

              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? (
                  <div className="flex items-center space-x-2">
                    <div className="loading-dot"></div>
                    <div className="loading-dot"></div>
                    <div className="loading-dot"></div>
                  </div>
                ) : (
                  <>
                    <LogIn className="mr-2 h-4 w-4" />
                    Sign In
                  </>
                )}
              </Button>
            </form>
          </CardContent>
          <CardFooter className="flex flex-col space-y-4">
            <div className="text-center text-sm text-muted-foreground">
              Don't have an account?{' '}
              <Link to="/register" className="text-primary hover:underline">
                Register now
              </Link>
            </div>
          </CardFooter>
        </Card>

        <div className="mt-8 text-center text-sm text-muted-foreground">
          <Link to="/" className="text-primary hover:underline">
            Go back to home page
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Login;
