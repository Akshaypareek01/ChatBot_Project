
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Code, ClipboardCopy, Check } from 'lucide-react';
import { toast } from 'sonner';

interface ScriptGeneratorProps {
  userId: string;
  scriptUrl?: string;
  websiteDomain?: string;
}

const ScriptGenerator: React.FC<ScriptGeneratorProps> = ({ 
  userId, 
  scriptUrl = 'http://localhost:5000/chatbot.js',
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
    <Card className="w-full shadow-soft overflow-hidden">
      <CardHeader className="bg-muted/50">
        <CardTitle className="flex items-center">
          <Code className="mr-2 h-5 w-5" />
          Embed Script {websiteDomain && <span className="ml-2 text-sm text-muted-foreground">for {websiteDomain}</span>}
        </CardTitle>
        <CardDescription>
          Copy and paste this script into your website to embed the chatbot
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-6">
        <div className="bg-muted p-4 rounded-md overflow-x-auto">
          <pre className="text-sm whitespace-pre-wrap break-all">
            <code>{scriptCode}</code>
          </pre>
        </div>
      </CardContent>
      <CardFooter className="flex justify-between border-t bg-muted/30 py-3">
        <div className="text-sm text-muted-foreground">
          Add this before the closing <code className="text-xs bg-muted p-1 rounded">&lt;/body&gt;</code> tag
        </div>
        <Button variant="outline" size="sm" className="ml-auto" onClick={handleCopy}>
          {copied ? (
            <>
              <Check className="mr-2 h-4 w-4" />
              Copied
            </>
          ) : (
            <>
              <ClipboardCopy className="mr-2 h-4 w-4" />
              Copy
            </>
          )}
        </Button>
      </CardFooter>
    </Card>
  );
};

export default ScriptGenerator;
