import React from 'react';

// A simple regex to find **bold** text and capture the content
const boldRegex = /\*\*(.*?)\*\*/g;

// This function takes a string and returns an array of React nodes,
// with bolded text wrapped in <strong> tags.
const parseBold = (text: string): React.ReactNode[] => {
  const parts = text.split(boldRegex);
  return parts.map((part, index) => {
    // Every odd-indexed part is a match from the capturing group
    if (index % 2 === 1) {
      return <strong key={index} className="font-semibold text-slate-100">{part}</strong>;
    }
    return part;
  });
};

interface MarkdownRendererProps {
    content: string;
}

const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ content }) => {
  const lines = content.split('\n');
  const elements: React.ReactNode[] = [];
  let listItems: string[] = [];

  // Helper function to render collected list items into a <ul> element
  const flushList = () => {
    if (listItems.length > 0) {
      elements.push(
        <ul key={`ul-${elements.length}`} className="list-disc list-inside space-y-2 my-3 pl-4">
          {listItems.map((item, index) => (
            <li key={index}>{parseBold(item)}</li>
          ))}
        </ul>
      );
      listItems = [];
    }
  };

  lines.forEach((line, index) => {
    const trimmedLine = line.trim();

    if (trimmedLine.startsWith('### ')) {
      flushList();
      elements.push(<h3 key={index} className="text-xl font-bold text-cyan-400 mt-4 mb-2">{parseBold(trimmedLine.substring(4))}</h3>);
    } else if (trimmedLine.startsWith('#### ')) {
      flushList();
      elements.push(<h4 key={index} className="text-lg font-semibold text-slate-100 mt-3 mb-1">{parseBold(trimmedLine.substring(5))}</h4>);
    } else if (trimmedLine.startsWith('* ')) {
      listItems.push(trimmedLine.substring(2));
    } else if (trimmedLine.match(/^---*$/)) {
      flushList();
      elements.push(<hr key={index} className="my-6 border-slate-600" />);
    } else if (trimmedLine.length > 0) {
      flushList();
      elements.push(<p key={index}>{parseBold(line)}</p>);
    }
  });
  
  flushList(); // Render any remaining list items at the end

  return <div>{elements}</div>;
};

export default MarkdownRenderer;
