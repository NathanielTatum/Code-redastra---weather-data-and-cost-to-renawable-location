import React from 'react';
import type { Message } from '../types';
import { BotIcon, UserIcon } from '../constants';
import MarkdownRenderer from './MarkdownRenderer';

interface MessageProps {
  message: Message;
}

const MessageItem: React.FC<MessageProps> = ({ message }) => {
  const isBot = message.author === 'bot';

  const wrapperClasses = isBot
    ? 'flex justify-start items-start space-x-4'
    : 'flex justify-end items-start space-x-4';
    
  const bubbleClasses = isBot
    ? 'bg-slate-700 text-slate-300 rounded-r-lg rounded-bl-lg'
    : 'bg-indigo-600 text-white rounded-l-lg rounded-br-lg';

  const icon = isBot 
    ? <BotIcon className="h-10 w-10 p-2 rounded-full bg-cyan-500 text-white flex-shrink-0" /> 
    : <UserIcon className="h-10 w-10 p-2 rounded-full bg-slate-600 text-slate-300 flex-shrink-0" />;

  // Conditionally render the message content
  const messageContent = isBot 
    ? <MarkdownRenderer content={message.text} />
    : <p className="whitespace-pre-wrap">{message.text}</p>;

  return (
    <div className={wrapperClasses}>
      {isBot && icon}
      <div className={`p-4 max-w-lg md:max-w-xl lg:max-w-2xl shadow-md ${bubbleClasses}`}>
        {messageContent}
      </div>
      {!isBot && icon}
    </div>
  );
};

export default MessageItem;
