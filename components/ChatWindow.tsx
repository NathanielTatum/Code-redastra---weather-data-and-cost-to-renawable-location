
import React, { useState, useEffect, useRef } from 'react';
import type { Message } from '../types';
import MessageItem from './Message';
import InputBar from './InputBar';
import LoadingSpinner from './LoadingSpinner';
import { getBotResponse } from '../services/geminiService';

const ChatWindow: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);
  
  useEffect(() => {
    const fetchInitialMessage = async () => {
        try {
            const initialBotMessage = await getBotResponse("Introduce yourself");
            setMessages([
              {
                id: crypto.randomUUID(),
                text: initialBotMessage,
                author: 'bot',
              },
            ]);
        } catch (error) {
            console.error("Failed to get initial bot message:", error);
            setMessages([
              {
                id: crypto.randomUUID(),
                text: "Sorry, I'm having trouble connecting right now. Please try again later.",
                author: 'bot',
              },
            ]);
        } finally {
            setIsLoading(false);
        }
    };
    
    fetchInitialMessage();
     // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSendMessage = async (text: string) => {
    const userMessage: Message = {
      id: crypto.randomUUID(),
      text,
      author: 'user',
    };
    setMessages((prev) => [...prev, userMessage]);
    setIsLoading(true);

    try {
        const botResponseText = await getBotResponse(text);
        const botMessage: Message = {
          id: crypto.randomUUID(),
          text: botResponseText,
          author: 'bot',
        };
        setMessages((prev) => [...prev, botMessage]);
    } catch (error) {
        console.error("Failed to get bot response:", error);
        const errorMessage: Message = {
          id: crypto.randomUUID(),
          text: "I encountered an error. Please check your connection or try again.",
          author: 'bot',
        };
        setMessages((prev) => [...prev, errorMessage]);
    } finally {
        setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-4xl h-[80vh] bg-slate-800 rounded-lg shadow-2xl flex flex-col border border-slate-700">
      <div className="flex-grow p-6 overflow-y-auto space-y-6">
        {messages.map((msg) => (
          <MessageItem key={msg.id} message={msg} />
        ))}
        {isLoading && (
            <div className="flex justify-start items-center space-x-4">
                 <div className="flex items-center justify-center h-10 w-10 rounded-full bg-cyan-500 flex-shrink-0">
                    <LoadingSpinner />
                 </div>
                 <div className="animate-pulse text-slate-400">TerraWatt is thinking...</div>
            </div>
        )}
        <div ref={messagesEndRef} />
      </div>
      <InputBar onSendMessage={handleSendMessage} isLoading={isLoading} />
    </div>
  );
};

export default ChatWindow;
