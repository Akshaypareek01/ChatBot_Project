import React, { useEffect, useState } from 'react';
import { ChatProvider } from '@/context/ChatContext';
import { getUserProfile } from '@/services/api';
import {
  Header,
  Hero,
  Process,
  Capabilities,
  Pricing,
  Industries,
  Compliance,
  CTASection,
  Footer
} from '@/components/landing';
import { ScrollProgress } from "@/components/ui/scroll-progress";
import LazyLoadSection from '@/components/landing/LazyLoadSection';

const Index = () => {
  const [userData, setUserData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

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

  return (
    <ChatProvider>
      <div className="min-h-screen bg-[#F9FAFB] text-slate-900 font-sans selection:bg-primary/10 selection:text-primary">
        <style dangerouslySetInnerHTML={{
          __html: `
          @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&display=swap');
          
          .font-sans { font-family: 'Plus Jakarta Sans', sans-serif !important; }
          .tracking-premium { letter-spacing: 0.025em; }
          .tracking-button { letter-spacing: 0.05em; }
          
          .glass-card {
            background: rgba(255, 255, 255, 0.4);
            backdrop-filter: blur(12px);
            border: 1px solid rgba(255, 255, 255, 0.7);
          }
          
          .inner-glow {
            box-shadow: inset 0 1px 1px rgba(255, 255, 255, 0.3), 0 4px 6px -1px rgba(79, 70, 229, 0.1);
          }
          
          .aura-animation {
            background: radial-gradient(circle, rgba(79, 70, 229, 0.15) 0%, rgba(255, 255, 255, 0) 70%);
            filter: blur(60px);
          }

          .shadow-premium {
            box-shadow: 0 20px 40px -15px rgba(0,0,0,0.05);
          }

          @keyframes pulse-slow {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.5; }
          }
          .animate-pulse-slow {
            animation: pulse-slow 3s cubic-bezier(0.4, 0, 0.6, 1) infinite;
          }
        `}} />

        <Header userData={userData} />
        <ScrollProgress className="top-[80px]" />
        <main>
          <Hero />

          <LazyLoadSection>
            <Process />
          </LazyLoadSection>

          <LazyLoadSection>
            <Capabilities />
          </LazyLoadSection>

          <LazyLoadSection>
            <Pricing />
          </LazyLoadSection>

          <LazyLoadSection>
            <Industries />
          </LazyLoadSection>

          <LazyLoadSection>
            <Compliance />
          </LazyLoadSection>

          <LazyLoadSection>
            <CTASection />
          </LazyLoadSection>
        </main>
        <Footer />
      </div>
    </ChatProvider>
  );
};

export default Index;