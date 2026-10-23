import React, { useState, useEffect, useMemo, useCallback } from 'react';
import Header from './components/Header';
import ProfilePanel from './components/ProfilePanel';
import TelemetryConsole from './components/TelemetryConsole';
import ResultsMatrix from './components/ResultsMatrix';
import EvidenceDrawer from './components/EvidenceDrawer';
import SavedShortlist from './components/SavedShortlist';
import { Sparkles, Terminal, CheckCircle2, AlertCircle, Info, Database } from 'lucide-react';
import { API_BASE_URL } from './config';

const API_BASE = API_BASE_URL;

export default function App() {
  const [activeTab, setActiveTab] = useState('studio');
  const [isStreaming, setIsStreaming] = useState(false);
  const [telemetryEvents, setTelemetryEvents] = useState([]);
  const [opportunities, setOpportunities] = useState([]);
  const [savedList, setSavedList] = useState([]);
  const [selectedOpportunity, setSelectedOpportunity] = useState(null);
  const [toast, setToast] = useState(null);

  const showToast = (message, type = 'info') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  // Set of saved IDs for fast lookups
  const savedIds = useMemo(() => {
    return new Set(savedList.map((item) => String(item.id)));
  }, [savedList]);

  // Load saved opportunities from SQLite backend
  const fetchSavedOpportunities = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/api/saved`);
      if (res.ok) {
        const data = await res.json();
        setSavedList(Array.isArray(data) ? data : []);
      } else {
        const fallbackRes = await fetch('/api/saved');
        if (fallbackRes.ok) {
          const data = await fallbackRes.json();
          setSavedList(Array.isArray(data) ? data : []);
        }
      }
    } catch (err) {
      console.warn('Could not fetch saved opportunities from backend:', err);
    }
  }, []);

  useEffect(() => {
    fetchSavedOpportunities();
  }, [fetchSavedOpportunities]);

  // Save opportunity to SQLite
  const handleSaveOpportunity = async (opp) => {
    if (savedIds.has(opp.id)) {
      showToast(`"${opp.title}" is already in your shortlist.`, 'info');
      return;
    }

    try {
      // Optimistic update
      setSavedList((prev) => [opp, ...prev]);

      const res = await fetch(`${API_BASE}/api/save`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(opp),
      });

      if (!res.ok) {
        // try proxy
        await fetch('/api/save', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(opp),
        });
      }

      showToast(`Saved "${opp.title}" to shortlist!`, 'success');
    } catch (err) {
      console.error('Error saving opportunity:', err);
      showToast('Saved to local session (backend offline)', 'info');
    }
  };

  // Delete saved opportunity from SQLite
  const handleDeleteSaved = async (oppId) => {
    try {
      setSavedList((prev) => prev.filter((item) => String(item.id) !== String(oppId)));

      const res = await fetch(`${API_BASE}/api/saved/${oppId}`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        await fetch(`/api/saved/${oppId}`, { method: 'DELETE' });
      }

      showToast('Opportunity removed from shortlist.', 'info');
    } catch (err) {
      console.error('Error deleting saved opportunity:', err);
      showToast('Removed from current session', 'info');
    }
  };

  // Dispatch TinyFish Research & Stream SSE
  const handleStartResearch = async (studentProfile) => {
    setIsStreaming(true);
    setTelemetryEvents([]);
    setOpportunities([]);
    setSelectedOpportunity(null);

    // Initial local event
    const startEvent = {
      type: 'TELEMETRY',
      phase: 'CLIENT_DISPATCH',
      detail: `Connecting to TinyFish SSE stream for ${studentProfile.name}...`,
      timestamp: new Date().toISOString(),
    };
    setTelemetryEvents([startEvent]);

    try {
      let response;
      try {
        response = await fetch(`${API_BASE}/api/research-stream`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(studentProfile),
        });
      } catch (directErr) {
        // Fallback to Vite proxy
        response = await fetch('/api/research-stream', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(studentProfile),
        });
      }

      if (!response.ok) {
        throw new Error(`HTTP error ${response.status}: ${response.statusText}`);
      }

      if (!response.body) {
        throw new Error('ReadableStream not supported on this response.');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const parts = buffer.split('\n\n');
        buffer = parts.pop() || '';

        for (const part of parts) {
          const trimmed = part.trim();
          if (!trimmed) continue;

          const lines = trimmed.split('\n');
          for (const line of lines) {
            if (line.startsWith('data:')) {
              const jsonStr = line.replace(/^data:\s*/, '').trim();
              try {
                const message = JSON.parse(jsonStr);

                if (message.type === 'TELEMETRY') {
                  setTelemetryEvents((prev) => [...prev, message]);
                } else if (message.type === 'RESULTS') {
                  const records = Array.isArray(message.data) ? message.data : [];
                  setOpportunities(records);
                  setTelemetryEvents((prev) => [
                    ...prev,
                    {
                      type: 'TELEMETRY',
                      phase: 'RESULTS_MOUNTED',
                      detail: `Received ${records.length} audited opportunities from pipeline.`,
                      timestamp: new Date().toISOString(),
                    },
                  ]);
                } else if (message.type === 'COMPLETE') {
                  setTelemetryEvents((prev) => [
                    ...prev,
                    {
                      type: 'TELEMETRY',
                      phase: 'PIPELINE_COMPLETE',
                      detail: message.detail || 'Research & Audit run finished.',
                      timestamp: new Date().toISOString(),
                    },
                  ]);
                }
              } catch (parseErr) {
                console.error('Failed parsing SSE JSON line:', parseErr, jsonStr);
              }
            }
          }
        }
      }

      setIsStreaming(false);
      showToast('TinyFish research crawl & audit completed.', 'success');
    } catch (error) {
      console.error('Research stream error:', error);
      setIsStreaming(false);
      setTelemetryEvents((prev) => [
        ...prev,
        {
          type: 'TELEMETRY',
          phase: 'CONNECTION_ERROR',
          detail: `Stream failed: ${error.message}. Make sure FastAPI is running on ${API_BASE_URL}`,
          timestamp: new Date().toISOString(),
        },
      ]);
      showToast(`Agent stream disconnected: ${error.message}`, 'error');
    }
  };

  return (
    <div className="min-h-screen bg-[#101010] text-[#EDEDED] flex flex-col font-sans selection:bg-[#0061FE] selection:text-white">
      {/* Toast Notification */}
      {toast && (
        <div className="fixed bottom-5 right-5 z-50 animate-in fade-in slide-in-from-bottom-2 duration-200">
          <div
            className={`flex items-center space-x-2 px-4 py-2.5 rounded-lg border text-xs font-medium shadow-dropbox-lg ${
              toast.type === 'success'
                ? 'bg-[#182822] text-[#00F5B4] border-[#00F5B4]/40'
                : toast.type === 'error'
                ? 'bg-[#2B1818] text-[#EF4444] border-[#EF4444]/40'
                : 'bg-[#1E1E1E] text-zinc-200 border-[#3E3E3E]'
            }`}
          >
            {toast.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-[#00F5B4]" />
            ) : toast.type === 'error' ? (
              <AlertCircle className="w-4 h-4 text-[#EF4444]" />
            ) : (
              <Info className="w-4 h-4 text-[#0061FE]" />
            )}
            <span>{toast.message}</span>
          </div>
        </div>
      )}

      {/* Top Header */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        savedCount={savedList.length}
      />

      {/* Main Workspace Body */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {activeTab === 'studio' ? (
          <div className="space-y-6">
            {/* Top Workspace Section: Student Profile Panel & Live Telemetry Stream */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* Profile Config Panel (7 cols on lg) */}
              <div className="lg:col-span-7">
                <ProfilePanel
                  onStartResearch={handleStartResearch}
                  isStreaming={isStreaming}
                />
              </div>

              {/* Live Telemetry Terminal (5 cols on lg) */}
              <div className="lg:col-span-5">
                <TelemetryConsole
                  events={telemetryEvents}
                  isStreaming={isStreaming}
                  onClear={() => setTelemetryEvents([])}
                />
              </div>
            </div>

            {/* Bottom Workspace Section: Ranked Opportunity Matrix */}
            <div className="pt-2">
              <div className="flex items-center justify-between pb-3 border-b border-[#242424] mb-4">
                <div className="flex items-center space-x-2">
                  <Sparkles className="w-4 h-4 text-[#0061FE]" />
                  <h2 className="text-base font-bold text-white tracking-tight">
                    Audited Opportunity Matrix
                  </h2>
                </div>
                <div className="flex items-center space-x-3 text-xs font-mono">
                  {opportunities.length > 0 && (
                    <span className="inline-flex items-center space-x-1.5 px-2 py-0.5 rounded bg-[#059669]/15 text-[#10B981] border border-[#059669]/40 text-[11px]">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#059669]" />
                      <span>
                        {opportunities.filter((o) => o.portal_health_status === 'PORTAL_LIVE_VERIFIED').length} Live Forms Verified
                      </span>
                    </span>
                  )}
                  <span className="text-zinc-400 hidden sm:inline">
                    Deterministic Eligibility & Portal Stress-Tester
                  </span>
                </div>
              </div>

              <ResultsMatrix
                opportunities={opportunities}
                selectedOpportunity={selectedOpportunity}
                onSelectOpportunity={(opp) => setSelectedOpportunity(opp)}
                savedIds={savedIds}
                onSaveOpportunity={handleSaveOpportunity}
                isStreaming={isStreaming}
              />
            </div>
          </div>
        ) : (
          /* Saved Shortlist Tab */
          <SavedShortlist
            savedList={savedList}
            onDeleteSaved={handleDeleteSaved}
            onInspectEvidence={(opp) => setSelectedOpportunity(opp)}
            onNavigateToStudio={() => setActiveTab('studio')}
          />
        )}
      </main>

      {/* Deep-Dive Evidence Split-Panel Drawer */}
      <EvidenceDrawer
        opportunity={selectedOpportunity}
        onClose={() => setSelectedOpportunity(null)}
        isSaved={selectedOpportunity ? savedIds.has(selectedOpportunity.id) : false}
        onSave={handleSaveOpportunity}
      />

      {/* Editorial Footer */}
      <footer className="border-t border-[#222222] bg-[#0E0E0E] py-4 text-xs text-zinc-500 text-center font-mono">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="flex items-center space-x-2">
            <span>Opportunity Agent</span>
            <span>•</span>
            <span className="text-zinc-400">Team The MetaMinds</span>
            <span>•</span>
            <span>TinyFish Hackathon</span>
          </div>
          <div className="text-[11px] text-zinc-600">
            FastAPI Backend: <code className="text-zinc-400">{API_BASE_URL}</code> • SSE Streaming Reader
          </div>
        </div>
      </footer>
    </div>
  );
}
