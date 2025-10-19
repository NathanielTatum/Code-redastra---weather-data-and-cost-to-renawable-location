import { GoogleGenAI, Chat } from "@google/genai";
import { SYSTEM_INSTRUCTION } from '../constants';

let chat: Chat | null = null;

const initializeChat = () => {
  // Use Vite's import.meta.env for environment variables
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("VITE_GEMINI_API_KEY environment variable not set");
  }
  const ai = new GoogleGenAI({ apiKey });
  chat = ai.chats.create({
    model: 'gemini-2.5-pro',
    config: {
      systemInstruction: SYSTEM_INSTRUCTION,
    },
  });
};

export const getBotResponse = async (message: string): Promise<string> => {
  if (!chat) {
    initializeChat();
  }

  try {
    if (chat) {
        const response = await chat.sendMessage({ message });
        return response.text;
    }
    throw new Error("Chat not initialized");
  } catch (error) {
    console.error("Gemini API error:", error);
    // Invalidate chat session on error
    chat = null;
    return "An error occurred while communicating with the AI. Please try again.";
  }
};
