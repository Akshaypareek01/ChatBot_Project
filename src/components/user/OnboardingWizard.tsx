/**
 * Phase 3.2: Step-by-step setup wizard after first login.
 * Steps: 1) Website URL, 2) Scrape preview, 3) Customize, 4) Test, 5) Embed code.
 * Skip option for experienced users.
 */

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Globe, Palette, MessageSquare, Code, CheckCircle, ArrowRight, SkipForward } from 'lucide-react';
import ScriptGenerator from '@/components/chatbot/ScriptGenerator';
import { updateUserProfile } from '@/services/api';
import { toast } from 'sonner';

const STEPS = [
  { id: 1, title: 'Website URL', icon: Globe, path: null },
  { id: 2, title: 'Scrape & preview', icon: MessageSquare, path: '/user/qa' },
  { id: 3, title: 'Customize', icon: Palette, path: '/user/widget' },
  { id: 4, title: 'Test chatbot', icon: MessageSquare, path: '/user' },
  { id: 5, title: 'Embed code', icon: Code, path: null }
];

interface OnboardingWizardProps {
  open: boolean;
  onComplete: () => void;
  user: { _id: string; name?: string; website?: string };
}

const OnboardingWizard: React.FC<OnboardingWizardProps> = ({ open, onComplete, user }) => {
  const [step, setStep] = useState(1);
  const [website, setWebsite] = useState(user?.website || '');
  const [saving, setSaving] = useState(false);
  const navigate = useNavigate();

  const progress = (step / STEPS.length) * 100;

  const handleSkip = async () => {
    setSaving(true);
    try {
      await updateUserProfile({
        name: user?.name || '',
        website: user?.website || '',
        onboardingCompleted: true
      });
      onComplete();
    } catch {
      onComplete();
    } finally {
      setSaving(false);
    }
  };

  const markComplete = async () => {
    setSaving(true);
    try {
      await updateUserProfile({
        name: user?.name || '',
        website: website || user?.website || '',
        brandName: undefined,
        onboardingCompleted: true
      });
      toast.success("You're all set!");
      onComplete();
    } catch (e) {
      toast.error('Could not save. You can complete setup later.');
      onComplete();
    } finally {
      setSaving(false);
    }
  };

  const goToStep = (s: number) => {
    const stepConfig = STEPS[s - 1];
    if (stepConfig?.path && stepConfig.path !== '/user') {
      navigate(stepConfig.path);
      setStep(s);
    } else {
      setStep(s);
    }
  };

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent className="max-w-lg sm:max-w-xl overflow-y-auto max-h-[90vh]" onPointerDownOutside={(e) => e.preventDefault()}>
        <DialogHeader className="flex flex-row items-center justify-between gap-4">
          <div>
            <DialogTitle>Get started</DialogTitle>
            <DialogDescription>Quick setup in a few steps. You can skip and do this later.</DialogDescription>
          </div>
          <Button variant="ghost" size="sm" onClick={handleSkip} disabled={saving} className="text-muted-foreground shrink-0">
            <SkipForward className="h-4 w-4 mr-1" /> Skip
          </Button>
        </DialogHeader>

        <Progress value={progress} className="h-2" />

        <div className="flex gap-2 flex-wrap">
          {STEPS.map((s) => (
            <Button
              key={s.id}
              variant={step === s.id ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => goToStep(s.id)}
              className="text-xs"
            >
              {s.id}. {s.title}
            </Button>
          ))}
        </div>

        <div className="min-h-[200px] py-4">
          {step === 1 && (
            <div className="space-y-4">
              <Label>Your website URL (optional)</Label>
              <Input
                placeholder="https://example.com"
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">We'll use this to suggest scraping your site for the knowledge base.</p>
            </div>
          )}
          {step === 2 && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">Add content to your knowledge base by scraping your website or uploading files.</p>
              <Button onClick={() => { navigate('/user/qa'); setStep(2); }} variant="outline">
                Open Knowledge Base <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          )}
          {step === 3 && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">Customize the widget look and welcome message.</p>
              <Button onClick={() => { navigate('/user/widget'); setStep(3); }} variant="outline">
                Open Widget settings <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          )}
          {step === 4 && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">Your chatbot is live. Open the dashboard to see conversations and usage.</p>
              <Button onClick={() => goToStep(5)}>Next: Get embed code</Button>
            </div>
          )}
          {step === 5 && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">Copy this script and add it to your website before &lt;/body&gt;.</p>
              <ScriptGenerator userId={user?._id} websiteDomain={website || user?.website} />
            </div>
          )}
        </div>

        <DialogFooter>
          {step < 5 ? (
            <Button onClick={() => goToStep(step + 1)}>
              Next <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          ) : (
            <Button onClick={markComplete} disabled={saving}>
              <CheckCircle className="mr-2 h-4 w-4" /> Complete setup
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default OnboardingWizard;
