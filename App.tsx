import React, { useState } from 'react';
import Header from './components/Header';
import LutConverter from './components/LutConverter';
import ImageToLut from './components/ImageToLut';

export type Language = 'zh' | 'en';

function App() {
  const [currentTab, setCurrentTab] = useState<'converter' | 'generator'>('generator');
  const [lang, setLang] = useState<Language>('zh');

  return (
    <div className="min-h-screen bg-cinema-900 text-gray-100 font-sans selection:bg-indigo-500 selection:text-white">
      <Header 
        currentTab={currentTab} 
        setTab={setCurrentTab} 
        lang={lang}
        setLang={setLang}
      />
      
      <main className="container mx-auto px-4 sm:px-6 lg:px-8 pb-12">
        {/* Use display: none to keep components mounted and preserve state */}
        <div style={{ display: currentTab === 'converter' ? 'block' : 'none' }} className="animate-fade-in">
             <LutConverter lang={lang} />
        </div>
        <div style={{ display: currentTab === 'generator' ? 'block' : 'none' }} className="animate-fade-in">
            <ImageToLut lang={lang} />
        </div>
      </main>

      <footer className="border-t border-cinema-800 py-8 mt-8">
        <div className="text-center text-gray-500 text-sm">
          <p>© {new Date().getFullYear()} CineGrade AI. Powered by Gemini 2.5 Flash.</p>
        </div>
      </footer>
    </div>
  );
}

export default App;