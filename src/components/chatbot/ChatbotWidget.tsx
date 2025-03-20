
import React, { useState, useRef, useEffect } from 'react';
import { useChat } from '@/context/ChatContext';
import ChatMessage from './ChatMessage';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { MessageCircle, X, Send, ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Textarea } from '@/components/ui/textarea';

interface ChatbotWidgetProps {
  userId?: string;
}

const ChatbotWidget: React.FC<ChatbotWidgetProps> = ({ userId }) => {
  const { messages, isTyping, isChatOpen, sendMessage, toggleChat, setUserId } = useChat();
  const [inputValue, setInputValue] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const [isMinimized, setIsMinimized] = useState(false);

  // Set userId if provided
  useEffect(() => {
    if (userId) {
      setUserId(userId);
    }
  }, [userId, setUserId]);

  // Scroll to bottom whenever messages change
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isTyping]);
  
  // Focus input when chat opens
  useEffect(() => {
    if (isChatOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isChatOpen]);

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputValue(e.target.value);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputValue.trim()) {
      sendMessage(inputValue.trim());
      setInputValue('');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const toggleMinimize = () => {
    setIsMinimized(!isMinimized);
  };

  if (!isChatOpen) {
    return (
      <Button
        onClick={toggleChat}
        className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-premium bg-primary hover:bg-primary/90 text-white p-0 flex items-center justify-center transition-all duration-300 hover:scale-105"
        aria-label="Open chat"
      >
        <MessageCircle size={24} />
      </Button>
    );
  }

  return (
    <div
      className={cn(
        "fixed bottom-6 right-6 w-80 sm:w-96 bg-background rounded-2xl shadow-premium border border-border overflow-hidden transition-all duration-300 ease-out animate-fade-in z-50",
        isMinimized ? "h-16" : "h-[32rem]"
      )}
    >
      {/* Header */}
      <div className="bg-primary text-primary-foreground p-4 flex items-center justify-between">
        <div className="flex items-center">
          <MessageCircle className="mr-2 h-5 w-5" />
          <h3 className="font-medium">Chat Assistant</h3>
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleMinimize}
            className="h-8 w-8 text-primary-foreground hover:text-primary-foreground/80 hover:bg-primary/90"
          >
            {isMinimized ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleChat}
            className="h-8 w-8 text-primary-foreground hover:text-primary-foreground/80 hover:bg-primary/90"
          >
            <X size={18} />
          </Button>
        </div>
      </div>

      {/* Messages */}
      {!isMinimized && (
        <>
          <div className="p-4 h-[calc(100%-8rem)] overflow-y-auto scrollbar-thin">
            {messages.map((message) => (
              <ChatMessage key={message.id} message={message} />
            ))}
            
            {isTyping && (
              <div className="mb-4 max-w-[80%]">
                <div className="typing-indicator chat-bubble-bot inline-block">
                  <span></span>
                  <span></span>
                  <span></span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <form onSubmit={handleSubmit} className="p-4 border-t">
            <div className="flex items-end space-x-2">
              <Textarea
                ref={inputRef}
                value={inputValue}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                placeholder="Type your message..."
                className="min-h-[60px] max-h-[120px] resize-none"
              />
              <Button 
                type="submit" 
                size="icon" 
                disabled={!inputValue.trim()}
                className="h-10 w-10 shrink-0"
              >
                <Send size={18} />
              </Button>
            </div>
          </form>
        </>
      )}
    </div>
  );
};

export default ChatbotWidget;
