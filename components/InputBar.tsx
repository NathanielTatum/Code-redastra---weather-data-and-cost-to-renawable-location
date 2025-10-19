
import React, { useState } from 'react';
import { SendIcon } from '../constants';

interface InputBarProps {
  onSendMessage: (text: string) => void;
  isLoading: boolean;
}

const InputBar: React.FC<InputBarProps> = ({ onSendMessage, isLoading }) => {
  const [text, setText] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (text.trim() && !isLoading) {
      onSendMessage(text);
      setText('');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <div className="p-4 bg-slate-900/50 border-t border-slate-700">
      <form onSubmit={handleSubmit} className="flex items-center space-x-4">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask about optimal locations for solar or wind energy..."
          className="flex-grow p-3 bg-slate-700 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:outline-none resize-none disabled:opacity-50"
          disabled={isLoading}
          rows={1}
        />
        <button
          type="submit"
          disabled={isLoading || !text.trim()}
          className="bg-cyan-600 hover:bg-cyan-500 disabled:bg-slate-600 disabled:cursor-not-allowed text-white font-bold p-3 rounded-full transition-colors duration-200"
        >
          <SendIcon className="h-6 w-6" />
        </button>
      </form>
    </div>
  );
};

export default InputBar;
