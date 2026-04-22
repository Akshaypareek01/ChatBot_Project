import React, { useEffect, useState } from 'react';
import { ChatProvider } from '@/context/ChatContext';
import { getUserProfile } from '@/services/api';
import ChatbotWidget from '@/components/chatbot/ChatbotWidget';
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
  const [userData, setUserData] = useState<unknown | null>(null);
  const [, setIsLoading] = useState(true);

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
      <div className="min-h-screen bg-white text-slate-950 font-sans antialiased selection:bg-indigo-600/15 selection:text-indigo-700">
        <style dangerouslySetInnerHTML={{
          __html: `
          @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');

          html, body { font-family: 'Inter', 'Plus Jakarta Sans', ui-sans-serif, system-ui, -apple-system, sans-serif; }
          .font-sans { font-family: 'Inter', 'Plus Jakarta Sans', ui-sans-serif, system-ui, -apple-system, sans-serif !important; }

          html { scroll-behavior: smooth; }

          /* Subtle scrollbar */
          ::-webkit-scrollbar { width: 10px; height: 10px; }
          ::-webkit-scrollbar-thumb { background: rgba(15,23,42,0.12); border-radius: 8px; }
          ::-webkit-scrollbar-thumb:hover { background: rgba(15,23,42,0.22); }

          /* Premium focus ring */
          :focus-visible { outline: 2px solid rgba(79,70,229,0.5); outline-offset: 2px; }
        `}} />

        <Header userData={userData} />
        <ScrollProgress className="top-[64px] h-[2px]" />
        <main>
          <Hero />

          <LazyLoadSection>
            <Compliance />
          </LazyLoadSection>

          <LazyLoadSection>
            <Process />
          </LazyLoadSection>

          <LazyLoadSection>
            <Capabilities />
          </LazyLoadSection>

          <LazyLoadSection>
            <Industries />
          </LazyLoadSection>

          <LazyLoadSection>
            <Pricing />
          </LazyLoadSection>

          <LazyLoadSection>
            <CTASection />
          </LazyLoadSection>
        </main>
        <Footer />
        <ChatbotWidget hideLauncher />
      </div>
    </ChatProvider>
  );
};

export default Index;
