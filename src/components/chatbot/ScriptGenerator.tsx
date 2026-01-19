
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Code, ClipboardCopy, Check } from 'lucide-react';
import { toast } from 'sonner';
import { API_URL } from '@/services/api';

interface ScriptGeneratorProps {
  userId: string;
  scriptUrl?: string;
  websiteDomain?: string;
}

// Derive the chatbot script URL from API_URL
// API_URL is like 'http://localhost:5001/api', we need 'http://localhost:5001/chatbot.js'
const getDefaultScriptUrl = () => {
  // Use regex to only replace /api at the end of the string to avoid matching subdomains like 'apis'
  const baseUrl = API_URL.replace(/\/api$/, '');
  return `${baseUrl}/chatbot.js`;
};

const ScriptGenerator: React.FC<ScriptGeneratorProps> = ({
  userId,
  scriptUrl = getDefaultScriptUrl(),
  websiteDomain
}) => {
  const [copied, setCopied] = useState(false);

  const scriptCode = `<script src="${scriptUrl}" data-user-id="${userId}" defer></script>`;

  const handleCopy = () => {
    navigator.clipboard.writeText(scriptCode);
    setCopied(true);
    toast.success('Script code copied to clipboard');

    setTimeout(() => {
      setCopied(false);
    }, 2000);
  };

  return (
    <Card className="w-full shadow-premium overflow-hidden border-none bg-background/50 backdrop-blur-sm rounded-[2rem]">
      <CardHeader className="bg-primary/5 pb-4">
        <CardTitle className="flex items-center text-lg">
          <Code className="mr-2 h-5 w-5 text-primary" />
          General Installation {websiteDomain && <span className="ml-2 text-xs font-normal text-muted-foreground">({websiteDomain})</span>}
        </CardTitle>
        <CardDescription className="text-xs">
          Copy and paste this script into your website to embed the bot
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-6">
        <div className="bg-muted p-4 rounded-2xl border border-muted-foreground/10">
          <pre className="text-xs whitespace-pre-wrap break-all font-mono leading-relaxed">
            <code>{scriptCode}</code>
          </pre>
        </div>
      </CardContent>
      <CardFooter className="flex justify-between border-t bg-muted/30 py-4 px-6">
        <div className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest">
          Add before &lt;/body&gt;
        </div>
        <Button variant="default" size="sm" className="rounded-full px-5 h-8 text-xs font-bold shadow-soft" onClick={handleCopy}>
          {copied ? (
            <>
              <Check className="mr-2 h-3 w-3" />
              Copied
            </>
          ) : (
            <>
              <ClipboardCopy className="mr-2 h-3 w-3" />
              Copy Script
            </>
          )}
        </Button>
      </CardFooter>
    </Card>
  );
};

export default ScriptGenerator;
