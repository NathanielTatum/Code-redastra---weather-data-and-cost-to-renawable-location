
import React from 'react';
import Header from './components/Header';
import ChatWindow from './components/ChatWindow';

const App: React.FC = () => {
  return (
    <div className="min-h-screen bg-slate-900 text-white flex flex-col font-sans">
      <Header />
      <main className="flex-grow flex items-center justify-center p-4">
        <ChatWindow />
      </main>
    </div>
  );
};

export default App;
