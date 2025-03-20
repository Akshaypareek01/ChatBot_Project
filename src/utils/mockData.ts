import { faker } from '@faker-js/faker';

export interface ChatMessage {
  id: string;
  content: string;
  sender: 'user' | 'bot';
  timestamp: Date;
}

export interface QA {
  id: string;
  question: string;
  answer: string;
  category: string;
  createdAt: string;
  updatedAt: string;
  frequency: number;
}

export interface User {
  id: string;
  name: string;
  email: string;
  website: string;
  activeSince: string;
  lastActive: string;
  totalChats: number;
  scriptUrl: string;
  qaAssigned?: number;
}

export const initialMessages: ChatMessage[] = [
  {
    id: '1',
    content: "Hi there! I'm your friendly chatbot. How can I help you today?",
    sender: 'bot',
    timestamp: new Date()
  }
];

export const mockQAs: QA[] = [
  {
    id: "1",
    question: "What are your business hours?",
    answer: "We are open Monday through Friday from 9am to 5pm, and Saturdays from 10am to 2pm.",
    category: "General",
    createdAt: "2023-01-20",
    updatedAt: "2023-01-20",
    frequency: 48
  },
  {
    id: "2",
    question: "Do you offer shipping internationally?",
    answer: "Yes, we ship to most countries worldwide. International shipping typically takes 7-14 business days.",
    category: "Shipping",
    createdAt: "2023-01-21",
    updatedAt: "2023-01-21",
    frequency: 35
  },
  {
    id: "3",
    question: "What payment methods do you accept?",
    answer: "We accept Visa, MasterCard, American Express, and PayPal.",
    category: "Orders",
    createdAt: "2023-02-05",
    updatedAt: "2023-02-05",
    frequency: 62
  },
  {
    id: "4",
    question: "How do I track my order?",
    answer: "You can track your order by visiting the \"Track Order\" page and entering your order number and email address.",
    category: "Orders",
    createdAt: "2023-02-12",
    updatedAt: "2023-02-12",
    frequency: 55
  },
  {
    id: "5",
    question: "What is your return policy?",
    answer: "We offer a 30-day return policy for most items. Please see our \"Returns\" page for details.",
    category: "Returns",
    createdAt: "2023-03-01",
    updatedAt: "2023-03-01",
    frequency: 40
  },
  {
    id: "6",
    question: "How do I initiate a return?",
    answer: "To initiate a return, please visit our \"Returns\" page and follow the instructions.",
    category: "Returns",
    createdAt: "2023-03-08",
    updatedAt: "2023-03-08",
    frequency: 38
  },
  {
    id: "7",
    question: "What are your shipping rates?",
    answer: "Shipping rates vary depending on the destination and the weight of the package. You can see the shipping costs during checkout.",
    category: "Shipping",
    createdAt: "2023-04-01",
    updatedAt: "2023-04-01",
    frequency: 45
  },
  {
    id: "8",
    question: "Do you offer free shipping?",
    answer: "Yes, we offer free shipping on orders over $50.",
    category: "Shipping",
    createdAt: "2023-04-08",
    updatedAt: "2023-04-08",
    frequency: 50
  },
  {
    id: "9",
    question: "How can I contact customer support?",
    answer: "You can contact customer support by visiting our \"Contact Us\" page or by calling us at 555-123-4567.",
    category: "Support",
    createdAt: "2023-05-01",
    updatedAt: "2023-05-01",
    frequency: 60
  },
  {
    id: "10",
    question: "What is your warranty policy?",
    answer: "We offer a one-year warranty on most of our products. Please see our \"Warranty\" page for details.",
    category: "Support",
    createdAt: "2023-05-08",
    updatedAt: "2023-05-08",
    frequency: 52
  },
  {
    id: "11",
    question: "What is the price of your premium plan?",
    answer: "Our premium plan is $29 per month.",
    category: "Pricing",
    createdAt: "2023-06-01",
    updatedAt: "2023-06-01",
    frequency: 47
  },
  {
    id: "12",
    question: "Do you offer a free trial?",
    answer: "Yes, we offer a 14-day free trial for our premium plan.",
    category: "Pricing",
    createdAt: "2023-06-08",
    updatedAt: "2023-06-08",
    frequency: 58
  },
  {
    id: "13",
    question: "How do I reset my password?",
    answer: "To reset your password, go to the login page and click on \"Forgot Password\".",
    category: "Technical",
    createdAt: "2023-07-01",
    updatedAt: "2023-07-01",
    frequency: 43
  },
  {
    id: "14",
    question: "What browsers are supported?",
    answer: "We support the latest versions of Chrome, Firefox, Safari, and Edge.",
    category: "Technical",
    createdAt: "2023-07-08",
    updatedAt: "2023-07-08",
    frequency: 49
  }
];

export const findAnswer = (question: string): string | null => {
  const matchedQA = mockQAs.find(qa => 
    qa.question.toLowerCase().includes(question.toLowerCase()) || 
    question.toLowerCase().includes(qa.question.toLowerCase())
  );
  
  return matchedQA ? matchedQA.answer : null;
};

export const getFallbackResponse = (): string => {
  const responses = [
    "I'm not sure, but I'll get back to you with an answer soon!",
    "That's a great question! Let me find the answer for you.",
    "I don't have the answer right now, but I'm looking into it.",
    "I'm sorry, I can't answer that question at the moment. Please try again later.",
    "I'm not equipped to handle that question, but I'll make sure someone gets back to you."
  ];
  return responses[Math.floor(Math.random() * responses.length)];
};

export const mockAnalytics = {
  totalUsers: 5682,
  activeUsers: 2347,
  totalChats: 12985,
  activeChats: 452,
  averageSessionTime: '3m 28s',
  topQuestions: [
    { question: 'How do I reset my password?', count: 452 },
    { question: 'What payment methods do you accept?', count: 389 },
    { question: 'What is your return policy?', count: 321 },
    { question: 'How do I track my order?', count: 298 },
    { question: 'Do you offer free shipping?', count: 276 },
    { question: 'What are your business hours?', count: 254 },
  ],
  chatTrend: [
    { date: '2024-01-01', count: 120 },
    { date: '2024-01-08', count: 150 },
    { date: '2024-01-15', count: 130 },
    { date: '2024-01-22', count: 160 },
    { date: '2024-01-29', count: 140 },
    { date: '2024-02-05', count: 170 },
    { date: '2024-02-12', count: 150 },
  ]
};

export const mockUsers: User[] = [
  {
    id: "user_1",
    name: "John Smith",
    email: "john@example.com",
    website: "example.com",
    activeSince: "Jan 15, 2023",
    lastActive: "Today",
    totalChats: 1243,
    scriptUrl: "https://chatbot-cdn.example.com/embed.js",
    qaAssigned: 15
  },
  {
    id: "user_2",
    name: "Emily Johnson",
    email: "emily@techstore.com",
    website: "techstore.com",
    activeSince: "Mar 3, 2023",
    lastActive: "Yesterday",
    totalChats: 857,
    scriptUrl: "https://chatbot-cdn.example.com/embed.js",
    qaAssigned: 8
  },
  {
    id: "user_3",
    name: "Michael Williams",
    email: "michael@fooddelivery.net",
    website: "fooddelivery.net",
    activeSince: "Apr 22, 2023",
    lastActive: "3 days ago",
    totalChats: 512,
    scriptUrl: "https://chatbot-cdn.example.com/embed.js",
    qaAssigned: 12
  },
  {
    id: "user_4",
    name: "Sarah Brown",
    email: "sarah@fashionboutique.org",
    website: "fashionboutique.org",
    activeSince: "Jun 10, 2023",
    lastActive: "1 week ago",
    totalChats: 329,
    scriptUrl: "https://chatbot-cdn.example.com/embed.js",
    qaAssigned: 5
  },
  {
    id: "user_5",
    name: "David Miller",
    email: "david@travelagency.io",
    website: "travelagency.io",
    activeSince: "Aug 5, 2023",
    lastActive: "2 weeks ago",
    totalChats: 143,
    scriptUrl: "https://chatbot-cdn.example.com/embed.js",
    qaAssigned: 10
  }
];

export interface UserQA extends QA {
  userId: string;
}

export const mockUserQAs: UserQA[] = [
  {
    id: "1",
    userId: "user_1",
    question: "What are your business hours?",
    answer: "We are open Monday through Friday from 9am to 5pm, and Saturdays from 10am to 2pm.",
    category: "General",
    createdAt: "2023-01-20",
    updatedAt: "2023-01-20",
    frequency: 48
  },
  {
    id: "2",
    userId: "user_1",
    question: "Do you offer shipping internationally?",
    answer: "Yes, we ship to most countries worldwide. International shipping typically takes 7-14 business days.",
    category: "Shipping",
    createdAt: "2023-01-21",
    updatedAt: "2023-01-21",
    frequency: 35
  },
  {
    id: "3",
    userId: "user_2",
    question: "Do you offer repairs for tech products?",
    answer: "Yes, we provide repair services for most electronic devices. Please bring your device to our store, and our technicians will assess it.",
    category: "Support",
    createdAt: "2023-03-10",
    updatedAt: "2023-03-10",
    frequency: 27
  },
  {
    id: "4",
    userId: "user_3",
    question: "What is your delivery radius?",
    answer: "We currently deliver within a 15-mile radius of our restaurant. For larger orders, we may accommodate delivery to slightly further locations.",
    category: "Shipping",
    createdAt: "2023-04-30",
    updatedAt: "2023-04-30",
    frequency: 42
  }
];

export const getUserQAs = (userId: string): UserQA[] => {
  return mockUserQAs.filter(qa => qa.userId === userId);
};

export const findUserAnswer = (userId: string, question: string): string | null => {
  const userQAs = getUserQAs(userId);
  const matchedQA = userQAs.find(qa => 
    qa.question.toLowerCase().includes(question.toLowerCase()) || 
    question.toLowerCase().includes(qa.question.toLowerCase())
  );
  
  return matchedQA ? matchedQA.answer : null;
};
