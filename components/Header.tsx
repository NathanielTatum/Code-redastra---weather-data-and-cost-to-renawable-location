
import React from 'react';

const Header: React.FC = () => {
  return (
    <header className="bg-slate-800/50 backdrop-blur-sm p-4 text-center border-b border-slate-700 shadow-lg">
      <h1 className="text-2xl font-bold text-cyan-400">Renewable Energy Site Selector</h1>
      <p className="text-sm text-slate-400">Powered by Gemini & NASA POWER Data</p>
    </header>
  );
};

export default Header;
