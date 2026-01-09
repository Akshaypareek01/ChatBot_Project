import React, { useEffect, useRef, useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ChatProvider } from '@/context/ChatContext';
import ChatbotWidget from '@/components/chatbot/ChatbotWidget';
import { Card, CardContent } from '@/components/ui/card';
import { ArrowRight, CheckCircle, MessageSquareText, BarChart2, Code, Lock, Wallet, Zap, FileText } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getUserProfile } from '@/services/api';

const Index = () => {
  const navigate = useNavigate();
  const featureRefs = useRef<(HTMLDivElement | null)[]>([]);
  const [visibleFeatures, setVisibleFeatures] = useState<boolean[]>([]);
  const [userData, setUserData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const index = featureRefs.current.findIndex(ref => ref === entry.target);
          if (index !== -1) {
            setVisibleFeatures(prev => {
              const updated = [...prev];
              updated[index] = entry.isIntersecting;
              return updated;
            });
          }
        });
      },
      { threshold: 0.2 }
    );

    featureRefs.current.forEach(ref => {
      if (ref) observer.observe(ref);
    });

    return () => {
      featureRefs.current.forEach(ref => {
        if (ref) observer.unobserve(ref);
      });
    };
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const userProfileData = await getUserProfile();
        setUserData(userProfileData);
      } catch (error) {
        console.error('Error fetching user data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  const features = [
    {
      icon: MessageSquareText,
      title: "Intelligent Q&A",
      description: "Instantly answer customer questions with a pre-defined knowledge base that grows and learns over time.",
      color: "text-blue-500",
      bgColor: "bg-blue-50"
    },
    {
      icon: BarChart2,
      title: "Comprehensive Analytics",
      description: "Gain valuable insights with detailed analytics on user interactions, questions, and engagement patterns.",
      color: "text-purple-500",
      bgColor: "bg-purple-50"
    },
    {
      icon: Code,
      title: "One-Line Integration",
      description: "Embed the chatbot on any website with a single line of code. No technical expertise required.",
      color: "text-green-500",
      bgColor: "bg-green-50"
    },
    {
      icon: Lock,
      title: "Secure & Scalable",
      description: "Built with security and performance in mind, handling thousands of concurrent conversations effortlessly.",
      color: "text-amber-500",
      bgColor: "bg-amber-50"
    }
  ];

  return (
    <ChatProvider>
      <div className="min-h-screen flex flex-col">
        <header className="border-b bg-background/80 backdrop-blur-sm sticky top-0 z-10">
          <div className="container flex h-16 items-center justify-between py-4">
            <div className="flex items-center gap-2">
              <MessageSquareText className="h-6 w-6 text-primary" />
              <span className="font-semibold text-xl">Insight Bot</span>
            </div>

            <nav className="hidden md:flex items-center gap-6">
              <a href="#features" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
                Features
              </a>
              <a href="#pricing" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
                Pricing
              </a>
              <a href="#how-it-works" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
                How It Works
              </a>
            </nav>

            <div className="flex items-center gap-4">
              {userData ? (
                <>
                  <Button variant="outline">
                    Welcome, {userData?.name}!
                  </Button>
                  <Link to="/user">
                    <Button>Dashboard</Button>
                  </Link>
                </>
              ) : (
                <Link to="/login">
                  <Button variant="outline">
                    Sign In
                  </Button>
                </Link>
              )}
            </div>
          </div>
        </header>

        <section className="py-20 md:py-32 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-b from-blue-50/50 to-transparent" />

          <div className="container relative flex flex-col items-center text-center">
            <div className="inline-flex items-center rounded-full bg-muted px-3 py-1 text-sm mb-6 animate-fade-in">
              <span className="text-primary font-medium">Introducing Insight Bot</span>
            </div>

            <h1 className="text-4xl md:text-6xl font-bold leading-tight md:leading-tight max-w-3xl mb-6 animate-fade-in">
              The intelligent chatbot for <span className="text-primary">instant answers</span>
            </h1>

            <p className="text-xl text-muted-foreground max-w-2xl mb-10 animate-fade-in">
              Supercharge your customer service with AI-powered conversations. Provide immediate responses, collect insights, and scale your support effortlessly.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 w-full justify-center animate-fade-in">
              <Link to="/user">
                <Button size="lg" className="w-full sm:w-auto">
                  Try Demo
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
              <a href="#features">
                <Button size="lg" variant="outline" className="w-full sm:w-auto">
                  Learn More
                </Button>
              </a>
            </div>

            <div className="mt-16 relative w-full max-w-4xl">
              <Card className="shadow-premium overflow-hidden">
                <CardContent className="p-0">
                  <div className="relative aspect-video w-full">
                    <div className="absolute inset-0 bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center">
                      <div className="text-center p-8">
                        <MessageSquareText className="h-16 w-16 text-primary/30 mb-4 mx-auto" />
                        <h3 className="text-2xl font-medium mb-2">Interactive Demo</h3>
                        <p className="text-muted-foreground">
                          Try the chatbot on this page to experience it in action!
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 flex gap-3">
                <div className="h-3 w-3 rounded-full bg-primary"></div>
                <div className="h-3 w-3 rounded-full bg-muted"></div>
                <div className="h-3 w-3 rounded-full bg-muted"></div>
              </div>
            </div>
          </div>
        </section>

        <section id="features" className="py-20 bg-muted/20">
          <div className="container">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">Powerful Features</h2>
              <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                Everything you need to deliver exceptional customer support, gather insights, and scale your business.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {features.map((feature, index) => (
                <div
                  key={index}
                  ref={el => featureRefs.current[index] = el}
                  className={cn(
                    "feature-card glass-panel p-8 transition-all duration-700 transform",
                    visibleFeatures[index]
                      ? "opacity-100 translate-y-0"
                      : "opacity-0 translate-y-10"
                  )}
                >
                  <div className={cn("p-3 rounded-xl w-fit mb-4", feature.bgColor)}>
                    <feature.icon className={cn("h-6 w-6", feature.color)} />
                  </div>
                  <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
                  <p className="text-muted-foreground">{feature.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="pricing" className="py-20">
          <div className="container">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">Simple, Transparent Pricing</h2>
              <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                Pay only for what you use. No monthly fees, no hidden charges.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
              <div className="glass-panel p-8 text-center flex flex-col items-center hover:shadow-lg transition-shadow">
                <div className="p-4 bg-blue-50 rounded-full mb-6">
                  <Zap className="h-8 w-8 text-blue-600" />
                </div>
                <h3 className="text-xl font-bold mb-2">Pay As You Go</h3>
                <p className="text-muted-foreground mb-4">Start small and scale as you grow.</p>
                <div className="text-4xl font-bold text-primary mb-2">₹100</div>
                <p className="text-sm text-muted-foreground mb-6">gets you 500,000 Tokens</p>
                <p className="text-sm text-gray-600">Perfect for startups and individuals testing the waters.</p>
              </div>

              <div className="glass-panel p-8 text-center flex flex-col items-center hover:shadow-lg transition-shadow border-2 border-primary relative">
                <div className="absolute top-0 right-0 transform translate-x-2 -translate-y-2">
                  <div className="bg-primary text-primary-foreground text-xs font-medium px-3 py-1 rounded-full">
                    Best Value
                  </div>
                </div>
                <div className="p-4 bg-purple-50 rounded-full mb-6">
                  <Wallet className="h-8 w-8 text-purple-600" />
                </div>
                <h3 className="text-xl font-bold mb-2">Flexible Wallet</h3>
                <p className="text-muted-foreground mb-4">Recharge anytime, tokens never expire.</p>
                <div className="text-4xl font-bold text-primary mb-2">Any Amount</div>
                <p className="text-sm text-muted-foreground mb-6">Minimum recharge ₹100</p>
                <Link to="/user" className="w-full">
                  <Button className="w-full">Start for Free</Button>
                </Link>
              </div>

              <div className="glass-panel p-8 text-center flex flex-col items-center hover:shadow-lg transition-shadow">
                <div className="p-4 bg-green-50 rounded-full mb-6">
                  <FileText className="h-8 w-8 text-green-600" />
                </div>
                <h3 className="text-xl font-bold mb-2">Cost Effective</h3>
                <p className="text-muted-foreground mb-4">Low cost per interaction.</p>
                <div className="text-left w-full space-y-2 text-sm text-gray-600 mt-2">
                  <div className="flex justify-between"><span>Chat Message:</span> <span className="font-medium">~1 Token/word</span></div>
                  <div className="flex justify-between"><span>File Upload:</span> <span className="font-medium">10,000 Tokens</span></div>
                  <div className="flex justify-between"><span>Web Scrape:</span> <span className="font-medium">5,000 Tokens</span></div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="how-it-works" className="py-20 bg-muted/20">
          <div className="container">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">How It Works</h2>
              <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                Get up and running in minutes with our simple three-step process.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {[
                {
                  step: "01",
                  title: "Add Your Knowledge",
                  description: "Input your frequently asked questions and their answers in the admin dashboard."
                },
                {
                  step: "02",
                  title: "Get Your Script",
                  description: "Generate a unique script code for your website with one click."
                },
                {
                  step: "03",
                  title: "Embed & Go Live",
                  description: "Copy the script to your website's code and watch your chatbot come to life instantly."
                }
              ].map((item, index) => (
                <div key={index} className="text-center">
                  <div className="w-16 h-16 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xl mx-auto mb-6">
                    {item.step}
                  </div>
                  <h3 className="text-xl font-semibold mb-3">{item.title}</h3>
                  <p className="text-muted-foreground">{item.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="py-20 bg-primary/5">
          <div className="container">
            <div className="glass-panel p-8 md:p-12 text-center max-w-3xl mx-auto">
              <h2 className="text-3xl font-bold mb-4">Ready to transform your customer service?</h2>
              <p className="text-xl text-muted-foreground mb-8">
                Join thousands of businesses using Insight Bot to deliver exceptional support experiences.
              </p>

              <div className="flex flex-col sm:flex-row justify-center gap-4">
                <Link to="/user">
                  <Button size="lg" className="w-full sm:w-auto">
                    Get Started Free
                  </Button>
                </Link>
              </div>

              <div className="mt-8 flex items-center justify-center text-sm text-muted-foreground">
                <CheckCircle className="h-4 w-4 mr-2 text-primary" />
                No credit card required
              </div>
            </div>
          </div>
        </section>

        <footer className="py-12 border-t">
          <div className="container">
            <div className="flex flex-col md:flex-row justify-between items-center gap-6">
              <div className="flex items-center gap-2">
                <MessageSquareText className="h-5 w-5 text-primary" />
                <span className="font-semibold">Insight Bot</span>
              </div>

              <div className="flex items-center gap-6 text-sm text-muted-foreground">
                <a href="#" className="hover:text-foreground transition-colors">Privacy</a>
                <a href="#" className="hover:text-foreground transition-colors">Terms</a>
                <a href="#" className="hover:text-foreground transition-colors">Contact</a>
              </div>

              <div className="text-sm text-muted-foreground">
                © {new Date().getFullYear()} Insight Bot. All rights reserved.
              </div>
            </div>
          </div>
        </footer>

        <ChatbotWidget />
      </div>
    </ChatProvider>
  );
};

export default Index;