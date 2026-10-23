import React, { useState, useEffect } from 'react';
import { Bookmark, Sparkles, Activity, ShieldCheck, AlertCircle, RefreshCw, Layers } from 'lucide-react';

export default function Header({ activeTab, setActiveTab, savedCount = 0 }) {
  const [health, setHealth] = useState({
    online: false,
    checking: true,
    data: null,
  });

  const checkHealth = async () => {
    try {
      const res = await fetch('http://localhost:8000/api/health', {
        headers: { Accept: 'application/json' },
      });
      if (res.ok) {
        const json = await res.json();
        setHealth({ online: true, checking: false, data: json });
      } else {
        setHealth({ online: false, checking: false, data: null });
      }
    } catch (err) {
      // Fallback check against relative proxy if localhost direct had network block
      try {
        const fallbackRes = await fetch('/api/health');
        if (fallbackRes.ok) {
          const json = await fallbackRes.json();
          setHealth({ online: true, checking: false, data: json });
          return;
        }
      } catch (e) {
        // ignore
      }
      setHealth({ online: false, checking: false, data: null });
    }
  };

  useEffect(() => {
    checkHealth();
    const interval = setInterval(checkHealth, 10000);
    return () => clearInterval(interval);
  }, []);

  return (
    <header className="sticky top-0 z-40 w-full border-b border-[#2E2E2E] bg-[#101010]/95 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Left Brand & Team */}
          <div className="flex items-center space-x-3.5">
            {/* Dropbox-styled Brand Glyph */}
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-[#0061FE] to-[#1E40AF] flex items-center justify-center shadow-dropbox-blue ring-1 ring-white/10">
              <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="currentColor">
                <path d="M6 2L0 6l6 4 6-4-6-4zm12 0l-6 4 6 4 6-4-6-4zM0 14l6 4 6-4-6-4-6 4zm18-4l-6 4 6 4 6-4-6-4zM6 15.5L0 19.5 6 23.5l6-4-6-4zm12 0l-6 4 6 4 6-4-6-4z"/>
              </svg>
            </div>

            <div>
              <div className="flex items-center space-x-2">
                <span className="text-base font-bold tracking-tight text-white">
                  Opportunity Agent
                </span>
                <span className="text-[11px] font-mono tracking-tight uppercase px-2 py-0.5 rounded bg-[#1E1E1E] border border-[#3E3E3E] text-zinc-300">
                  The MetaMinds
                </span>
              </div>
              <p className="text-[11px] text-zinc-400 hidden sm:block tracking-wide">
                From Intent to Opportunity • TinyFish Autonomous Web Agents
              </p>
            </div>
          </div>

          {/* Center Tab Switcher */}
          <nav className="flex items-center bg-[#181818] p-1 rounded-lg border border-[#2E2E2E]">
            <button
              onClick={() => setActiveTab('studio')}
              className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-md text-xs font-medium transition-all ${
                activeTab === 'studio'
                  ? 'bg-[#0061FE] text-white shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-[#242424]'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Research Studio</span>
            </button>

            <button
              onClick={() => setActiveTab('saved')}
              className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-md text-xs font-medium transition-all ${
                activeTab === 'saved'
                  ? 'bg-[#0061FE] text-white shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-[#242424]'
              }`}
            >
              <Bookmark className="w-3.5 h-3.5" />
              <span>Saved Shortlist</span>
              <span
                className={`ml-1 text-[10px] font-mono px-1.5 py-0.2 rounded-full ${
                  activeTab === 'saved'
                    ? 'bg-white/20 text-white'
                    : 'bg-[#2D2D2D] text-zinc-300'
                }`}
              >
                {savedCount}
              </span>
            </button>
          </nav>

          {/* Right Status Indicator */}
          <div className="flex items-center space-x-3">
            <div
              className={`flex items-center space-x-2 px-2.5 py-1 rounded-full border text-xs font-mono transition-colors ${
                health.online
                  ? 'bg-[#059669]/10 border-[#059669]/30 text-[#00F5B4]'
                  : 'bg-zinc-800/60 border-[#2E2E2E] text-zinc-400'
              }`}
              title={
                health.online
                  ? `Backend active | TinyFish: ${health.data?.tinyfish_api_key_configured ? 'API Key Active' : 'Fallback Crawler'} | ${health.data?.database}`
                  : 'FastAPI Backend offline at http://localhost:8000'
              }
            >
              <span className="relative flex h-2 w-2">
                {health.online && (
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#00F5B4] opacity-75"></span>
                )}
                <span
                  className={`relative inline-flex rounded-full h-2 w-2 ${
                    health.online ? 'bg-[#00F5B4]' : 'bg-amber-400'
                  }`}
                ></span>
              </span>
              <span className="hidden md:inline">
                {health.online ? 'TinyFish Agent Online' : 'Connecting to Agent...'}
              </span>
              <span className="md:hidden">
                {health.online ? 'Online' : 'Offline'}
              </span>
            </div>

            <button
              onClick={checkHealth}
              title="Refresh Agent Connectivity"
              className="p-1.5 rounded-md text-zinc-400 hover:text-white hover:bg-[#242424] transition-colors border border-transparent hover:border-[#2E2E2E]"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${health.checking ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
