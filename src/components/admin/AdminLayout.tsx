
import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, MessageSquareText, Users, LogOut, Settings, CreditCard, DollarSign  } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';

interface AdminLayoutProps {
  children: React.ReactNode;
  onLogout: () => void;
}

const AdminLayout: React.FC<AdminLayoutProps> = ({ children, onLogout }) => {
  const location = useLocation();
  
  const navItems = [
    { icon: LayoutDashboard, label: 'Dashboard', path: '/admin' },
    { icon: MessageSquareText, label: 'Q&A Management', path: '/admin/qa' },
    { icon: Users, label: 'User Management', path: '/admin/users' },
    { icon: CreditCard, label: 'Plans', path: '/admin/plans' },
    { icon: DollarSign, label: 'Transaction Management', path: '/admin/transactions' },
    { icon: Settings, label: 'Settings', path: '/admin/settings' },
  ];

  return (
    <div className="min-h-screen bg-muted/30 flex">
      {/* Sidebar */}
      <aside className="w-64 bg-background border-r border-border hidden md:block">
        <div className="h-full flex flex-col">
          <div className="p-6">
            <div className="flex items-center space-x-2">
              <MessageSquareText className="h-6 w-6 text-primary" />
              <h1 className="font-semibold text-xl">ChatBot Admin</h1>
            </div>
          </div>
          
          <Separator />
          
          <nav className="flex-1 p-4">
            <ul className="space-y-1">
              {navItems.map((item) => (
                <li key={item.path}>
                  <Link to={item.path}>
                    <Button 
                      variant={location.pathname === item.path ? "secondary" : "ghost"}
                      className={cn(
                        "w-full justify-start",
                        location.pathname === item.path 
                          ? "bg-secondary text-secondary-foreground font-medium" 
                          : "text-muted-foreground hover:text-foreground"
                      )}
                    >
                      <item.icon className="mr-2 h-5 w-5" />
                      {item.label}
                    </Button>
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
          
          <div className="p-4 mt-auto">
            <Button 
              onClick={onLogout}
              variant="outline" 
              className="w-full justify-start text-muted-foreground"
            >
              <LogOut className="mr-2 h-5 w-5" />
              Sign Out
            </Button>
          </div>
        </div>
      </aside>
      
      {/* Mobile top navigation */}
      <div className="md:hidden fixed top-0 left-0 right-0 bg-background border-b z-10 p-4">
        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <MessageSquareText className="h-5 w-5 text-primary" />
            <h1 className="font-semibold">ChatBot Admin</h1>
          </div>
          
          {/* Mobile menu - simplified for this version */}
          <div className="flex space-x-1">
            {navItems.map((item) => (
              <Link key={item.path} to={item.path}>
                <Button 
                  variant="ghost" 
                  size="icon"
                  className={location.pathname === item.path ? "text-primary" : "text-muted-foreground"}
                >
                  <item.icon className="h-5 w-5" />
                </Button>
              </Link>
            ))}
          </div>
        </div>
      </div>
      
      {/* Main content */}
      <main className="flex-1 overflow-auto pt-4 md:pt-0">
        <div className="p-4 md:p-8 max-w-7xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
};

export default AdminLayout;