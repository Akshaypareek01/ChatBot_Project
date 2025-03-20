
import React, { useEffect, useRef, useState } from 'react';
import { ChatMessage as ChatMessageType } from '@/utils/mockData';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

interface ChatMessageProps {
  message: ChatMessageType;
}

const ChatMessage: React.FC<ChatMessageProps> = ({ message }) => {
  const messageRef = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);
  
  useEffect(() => {
    setIsVisible(true);
    if (messageRef.current) {
      messageRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [message]);

  const isUser = message.sender === 'user';
  
  return (
    <div 
      ref={messageRef}
      className={cn(
        "mb-4 max-w-[80%] transition-all duration-300 ease-out",
        isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4",
        isUser ? "ml-auto" : "mr-auto"
      )}
    >
      <div className="flex flex-col">
        <div 
          className={cn(
            "break-words rounded-2xl px-4 py-2 shadow-sm",
            isUser ? "chat-bubble-user ml-auto" : "chat-bubble-bot"
          )}
        >
          {message.content}
        </div>
        <span className={cn(
          "text-xs text-muted-foreground mt-1", 
          isUser ? "text-right" : "text-left"
        )}>
          {format(message.timestamp, 'h:mm a')}
        </span>
      </div>
    </div>
  );
};

export default ChatMessage;
