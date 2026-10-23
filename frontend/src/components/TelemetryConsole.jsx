import React, { useRef, useEffect, useState } from 'react';
import { Terminal, Copy, Check, ArrowDownCircle, Trash2, Cpu, Globe, Zap, Radio } from 'lucide-react';

export default function TelemetryConsole({ events = [], isStreaming = false, onClear }) {
  const terminalEndRef = useRef(null);
  const [autoScroll, setAutoScroll] = useState(true);
  const [copied, setCopied] = useState(false);

  // Auto-scroll to bottom as new events arrive
  useEffect(() => {
    if (autoScroll && terminalEndRef.current) {
      terminalEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [events, autoScroll]);

  const handleCopyLogs = () => {
    const text = events
      .map((e) => {
        const time = e.timestamp ? new Date(e.timestamp).toLocaleTimeString() : '';
        return `[${time || 'EVENT'}] [${e.phase || e.type}] ${e.detail || JSON.stringify(e)}`;
      })
      .join('\n');
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getPhaseTag = (phase, type) => {
    const p = (phase || type || '').toUpperCase();
    if (p.includes('INIT')) return { tag: '[INIT]', color: 'text-zinc-400 bg-zinc-800/80 border-zinc-700' };
    if (p.includes('SEARCH')) return { tag: '[SEARCH]', color: 'text-[#60A5FA] bg-[#0061FE]/15 border-[#0061FE]/40' };
    if (p.includes('FETCH')) return { tag: '[FETCH]', color: 'text-[#00F5B4] bg-[#00F5B4]/10 border-[#00F5B4]/30' };
    if (p.includes('EXTRACT') || p.includes('MARKDOWN')) return { tag: '[EXTRACT]', color: 'text-purple-400 bg-purple-500/10 border-purple-500/30' };
    if (p.includes('AUDIT')) return { tag: '[AUDIT]', color: 'text-amber-400 bg-amber-500/10 border-amber-500/30' };
    if (p.includes('RESULT')) return { tag: '[RESULTS]', color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30' };
    if (p.includes('ERROR')) return { tag: '[ERROR]', color: 'text-red-400 bg-red-500/15 border-red-500/40' };
    return { tag: `[${p.slice(0, 7)}]`, color: 'text-zinc-300 bg-zinc-800 border-zinc-700' };
  };

  // Compute live stats
  const totalEvents = events.length;
  const crawlHops = events.filter((e) => e.phase === 'FETCH_COMPLETE' || e.phase === 'FETCHING_ITEM').length;
  const lastLatency = events.findLast((e) => e.telemetry?.latency_ms)?.telemetry?.latency_ms;

  return (
    <div className="bg-[#0C0C0C] border border-[#2E2E2E] rounded-xl overflow-hidden shadow-dropbox-lg flex flex-col font-mono text-xs">
      {/* Terminal Title Bar */}
      <div className="bg-[#161616] px-4 py-2.5 border-b border-[#2E2E2E] flex items-center justify-between">
        <div className="flex items-center space-x-2">
          {/* Subtle OS glyphs */}
          <div className="flex items-center space-x-1.5 mr-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#EF4444]/70"></span>
            <span className="w-2.5 h-2.5 rounded-full bg-[#F59E0B]/70"></span>
            <span className="w-2.5 h-2.5 rounded-full bg-[#00F5B4]/70"></span>
          </div>

          <div className="flex items-center space-x-2">
            <Terminal className="w-3.5 h-3.5 text-[#0061FE]" />
            <span className="font-semibold text-zinc-200 tracking-tight text-xs">
              TinyFish Telemetry Stream
            </span>
          </div>

          {isStreaming ? (
            <span className="flex items-center space-x-1.5 px-2 py-0.5 rounded bg-[#0061FE]/20 text-[#60A5FA] border border-[#0061FE]/40 text-[10px]">
              <Radio className="w-3 h-3 animate-pulse text-[#0061FE]" />
              <span>LIVE_SSE</span>
            </span>
          ) : events.length > 0 ? (
            <span className="px-2 py-0.5 rounded bg-zinc-800 text-zinc-400 border border-zinc-700 text-[10px]">
              IDLE / BUFFERED
            </span>
          ) : (
            <span className="px-2 py-0.5 rounded bg-zinc-800 text-zinc-500 border border-zinc-700 text-[10px]">
              AWAITING_TRIGGER
            </span>
          )}
        </div>

        {/* Toolbar Controls */}
        <div className="flex items-center space-x-2">
          <button
            type="button"
            onClick={() => setAutoScroll(!autoScroll)}
            className={`px-2 py-1 rounded text-[10px] transition-colors flex items-center space-x-1 border ${
              autoScroll
                ? 'bg-[#0061FE]/20 text-[#0061FE] border-[#0061FE]/40'
                : 'bg-zinc-800 text-zinc-400 border-zinc-700 hover:text-white'
            }`}
            title="Toggle Auto-Scroll"
          >
            <ArrowDownCircle className="w-3 h-3" />
            <span className="hidden sm:inline">Auto-Scroll</span>
          </button>

          <button
            type="button"
            onClick={handleCopyLogs}
            disabled={events.length === 0}
            className="p-1 rounded text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors disabled:opacity-30 disabled:pointer-events-none"
            title="Copy Terminal Logs"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-[#00F5B4]" /> : <Copy className="w-3.5 h-3.5" />}
          </button>

          <button
            type="button"
            onClick={onClear}
            disabled={events.length === 0}
            className="p-1 rounded text-zinc-400 hover:text-red-400 hover:bg-zinc-800 transition-colors disabled:opacity-30 disabled:pointer-events-none"
            title="Clear Terminal"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Metrics Strip */}
      <div className="bg-[#121212] px-4 py-1.5 border-b border-[#222222] flex items-center justify-between text-[11px] text-zinc-400 overflow-x-auto">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-1.5">
            <Cpu className="w-3 h-3 text-zinc-500" />
            <span>Hops:</span>
            <span className="text-zinc-200 font-semibold">{crawlHops}</span>
          </div>

          <div className="flex items-center space-x-1.5">
            <Globe className="w-3 h-3 text-zinc-500" />
            <span>Events:</span>
            <span className="text-zinc-200 font-semibold">{totalEvents}</span>
          </div>

          {lastLatency !== undefined && (
            <div className="flex items-center space-x-1.5">
              <Zap className="w-3 h-3 text-amber-400" />
              <span>Last Latency:</span>
              <span className="text-amber-400 font-semibold">{lastLatency}ms</span>
            </div>
          )}
        </div>

        <div className="text-[10px] text-zinc-500 hidden sm:block">
          Endpoint: <span className="text-zinc-400">POST /api/research-stream</span>
        </div>
      </div>

      {/* Terminal Output Area */}
      <div className="p-3.5 max-h-56 sm:max-h-64 overflow-y-auto space-y-1.5 leading-relaxed selection:bg-[#0061FE]/50">
        {events.length === 0 ? (
          <div className="py-8 text-center text-zinc-600 select-none">
            <p className="text-zinc-500 font-medium">Terminal stream initialized & listening for dispatch.</p>
            <p className="text-[11px] mt-1 text-zinc-600">
              Submit your student profile above to inspect live TinyFish HTTP hops, crawler latency, and deterministic audit events.
            </p>
          </div>
        ) : (
          events.map((event, idx) => {
            const { tag, color } = getPhaseTag(event.phase, event.type);
            const timeStr = event.timestamp
              ? new Date(event.timestamp).toLocaleTimeString()
              : new Date().toLocaleTimeString();

            return (
              <div key={idx} className="flex flex-col space-y-0.5 text-zinc-300 border-b border-zinc-900/60 pb-1 last:border-0">
                <div className="flex items-start space-x-2 flex-wrap sm:flex-nowrap">
                  {/* Timestamp */}
                  <span className="text-zinc-600 text-[10px] select-none shrink-0 pt-0.5">
                    {timeStr}
                  </span>

                  {/* Phase Badge */}
                  <span className={`px-1.5 py-0.2 rounded border text-[10px] font-semibold tracking-wider shrink-0 ${color}`}>
                    {tag}
                  </span>

                  {/* Latency Pill if present */}
                  {event.telemetry?.latency_ms !== undefined && (
                    <span className="px-1.5 py-0.2 rounded bg-amber-500/10 text-amber-400 border border-amber-500/30 text-[10px] shrink-0">
                      ⚡ {event.telemetry.latency_ms}ms
                    </span>
                  )}

                  {/* HTTP Status Code if present */}
                  {event.telemetry?.status_code && (
                    <span className="px-1.5 py-0.2 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-[10px] shrink-0">
                      HTTP {event.telemetry.status_code}
                    </span>
                  )}

                  {/* Message Detail */}
                  <span className="text-zinc-200 text-xs break-all flex-1">
                    {event.detail || JSON.stringify(event)}
                  </span>
                </div>

                {/* Optional Target URL or Query snippet */}
                {event.target_url && (
                  <div className="pl-14 text-[10px] text-zinc-500 truncate flex items-center space-x-1">
                    <span className="text-zinc-600">→ target:</span>
                    <span className="text-[#60A5FA] hover:underline cursor-pointer" onClick={() => window.open(event.target_url, '_blank')}>
                      {event.target_url}
                    </span>
                  </div>
                )}
                {event.query && (
                  <div className="pl-14 text-[10px] text-zinc-500 truncate">
                    <span className="text-zinc-600">→ query:</span> <span className="text-zinc-300">"{event.query}"</span>
                  </div>
                )}
              </div>
            );
          })
        )}
        <div ref={terminalEndRef} />
      </div>
    </div>
  );
}
