import React from 'react';
import { Language } from '../App';

interface HeaderProps {
  currentTab: 'converter' | 'generator';
  setTab: (tab: 'converter' | 'generator') => void;
  lang: Language;
  setLang: (lang: Language) => void;
}

const Header: React.FC<HeaderProps> = ({ currentTab, setTab, lang, setLang }) => {
  
  const t = {
    zh: {
      converter: 'LUT 转换器',
      generator: 'AI 风格生成'
    },
    en: {
      converter: 'LUT Converter',
      generator: 'AI Style Generator'
    }
  };

  return (
    <header className="sticky top-0 z-50 bg-cinema-900/90 backdrop-blur-md border-b border-cinema-700">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold">
              AI
            </div>
            <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400">
              CineGrade
            </span>
          </div>
          
          <div className="flex items-center gap-4">
            <nav className="flex gap-2 bg-cinema-800 p-1 rounded-lg">
              <button
                onClick={() => setTab('converter')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
                  currentTab === 'converter'
                    ? 'bg-cinema-700 text-white shadow-sm'
                    : 'text-gray-400 hover:text-white hover:bg-cinema-700/50'
                }`}
              >
                {t[lang].converter}
              </button>
              <button
                onClick={() => setTab('generator')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
                  currentTab === 'generator'
                    ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg shadow-indigo-500/20'
                    : 'text-gray-400 hover:text-white hover:bg-cinema-700/50'
                }`}
              >
                {t[lang].generator}
              </button>
            </nav>

            <button
              onClick={() => setLang(lang === 'zh' ? 'en' : 'zh')}
              className="text-xs font-medium text-gray-400 hover:text-white border border-cinema-700 rounded px-2 py-1 transition-colors"
            >
              {lang === 'zh' ? 'EN' : '中'}
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;