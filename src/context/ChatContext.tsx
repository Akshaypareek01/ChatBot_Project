
import React, { createContext, useContext, useReducer, useEffect, useState, useCallback } from 'react';
import { ChatMessage, findAnswer, findUserAnswer, getFallbackResponse, initialMessages } from '@/utils/mockData';
import { getChatbotData, logUnansweredQuestion } from '@/services/api'; 
import { toast } from "sonner";

type ChatContextType = {
  messages: ChatMessage[];
  isTyping: boolean;
  isChatOpen: boolean;
  userId?: string;
  sendMessage: (content: string) => void;
  toggleChat: () => void;
  resetChat: () => void;
  setUserId: (id: string) => void;
};

const ChatContext = createContext<ChatContextType | undefined>(undefined);

type ChatAction = 
  | { type: 'ADD_MESSAGE'; payload: ChatMessage }
  | { type: 'SET_TYPING'; payload: boolean }
  | { type: 'TOGGLE_CHAT' }
  | { type: 'RESET_CHAT' }
  | { type: 'SET_USER_ID'; payload: string };

function chatReducer(
  state: { 
    messages: ChatMessage[]; 
    isTyping: boolean; 
    isChatOpen: boolean;
    userId?: string;
  }, 
  action: ChatAction
) {
  switch (action.type) {
    case 'ADD_MESSAGE':
      return {
        ...state,
        messages: [...state.messages, action.payload]
      };
    case 'SET_TYPING':
      return {
        ...state,
        isTyping: action.payload
      };
    case 'TOGGLE_CHAT':
      return {
        ...state,
        isChatOpen: !state.isChatOpen
      };
    case 'RESET_CHAT':
      return {
        ...state,
        messages: initialMessages
      };
    case 'SET_USER_ID':
      return {
        ...state,
        userId: action.payload
      };
    default:
      return state;
  }
}

export const ChatProvider: React.FC<{ children: React.ReactNode; userId?: string }> = ({ 
  children, 
  userId: initialUserId 
}) => {
  const [state, dispatch] = useReducer(chatReducer, {
    messages: initialMessages,
    isTyping: false,
    isChatOpen: false,
    userId: initialUserId
  });

  const sendMessage = async (content: string) => {
    // Add user message
    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      content,
      sender: 'user',
      timestamp: new Date()
    };
    
    dispatch({ type: 'ADD_MESSAGE', payload: userMessage });
    
    // Simulate bot typing
    dispatch({ type: 'SET_TYPING', payload: true });
    
    // Process the response
    setTimeout(async () => {
      let answer = null;
      
      try {
        // If connected to backend, try to get answer from there
        if (state.userId) {
          try {
            // Try to get chatbot data from backend
            const data = await getChatbotData(state.userId);
            const matchedQA = data.qas.find((qa: any) => 
              qa.question.toLowerCase().includes(content.toLowerCase()) || 
              content.toLowerCase().includes(qa.question.toLowerCase())
            );
            
            if (matchedQA) {
              answer = matchedQA.answer;
            }
          } catch (error) {
            console.log('Backend connection failed, using fallback:', error);
            
            // Fallback to mock data if backend is not available
            answer = findUserAnswer(state.userId, content);
          }
        }
        
        // If no user-specific answer, fall back to general answers
        if (!answer) {
          // Try backend first
          try {
            // Placeholder for general QA endpoint
            // In a real app, you would have an endpoint for general QAs
          } catch (error) {
            console.log('Backend connection failed, using fallback:', error);
          }
          
          // Fallback to mock data
          answer = findAnswer(content);
        }
        
        const botResponse = answer || getFallbackResponse();
        
        if (!answer) {
          // Log unanswered question
          if (state.userId) {
            try {
              await logUnansweredQuestion(state.userId, content);
            } catch (error) {
              console.log('Failed to log question to backend:', error);
            }
          }
          
          console.log('Unanswered question:', content, 'for user:', state.userId || 'general');
          toast.info("Question logged for admin review", {
            duration: 3000,
          });
        }
        
        const botMessage: ChatMessage = {
          id: (Date.now() + 1).toString(),
          content: botResponse,
          sender: 'bot',
          timestamp: new Date()
        };
        
        dispatch({ type: 'SET_TYPING', payload: false });
        dispatch({ type: 'ADD_MESSAGE', payload: botMessage });
      } catch (error) {
        console.error('Error processing message:', error);
        
        const errorMessage: ChatMessage = {
          id: (Date.now() + 1).toString(),
          content: "I'm sorry, I encountered an error. Please try again later.",
          sender: 'bot',
          timestamp: new Date()
        };
        
        dispatch({ type: 'SET_TYPING', payload: false });
        dispatch({ type: 'ADD_MESSAGE', payload: errorMessage });
      }
    }, 1000 + Math.random() * 2000); // Random delay between 1-3 seconds
  };

  const toggleChat = () => {
    dispatch({ type: 'TOGGLE_CHAT' });
  };

  const resetChat = () => {
    dispatch({ type: 'RESET_CHAT' });
  };

  const setUserId = useCallback((id: string) => {
    dispatch({ type: 'SET_USER_ID', payload: id });
  }, [dispatch]);  // ✅ Memoize the function

  return (
    <ChatContext.Provider value={{ 
      messages: state.messages, 
      isTyping: state.isTyping,
      isChatOpen: state.isChatOpen,
      userId: state.userId,
      sendMessage, 
      toggleChat,
      resetChat,
      setUserId
    }}>
      {children}
    </ChatContext.Provider>
  );
};

export const useChat = (): ChatContextType => {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error('useChat must be used within a ChatProvider');
  }
  return context;
};
