import React, { useState } from 'react';
import { 
  Building2, 
  Calendar, 
  MapPin, 
  Briefcase, 
  ExternalLink, 
  Trash2, 
  Search, 
  CheckCircle2, 
  AlertTriangle, 
  XCircle, 
  ArrowRight, 
  Sparkles, 
  Link2, 
  FolderOpen,
  Zap
} from 'lucide-react';
import { getPortalHealthBadge } from './ResultsMatrix';

export default function SavedShortlist({
  savedList = [],
  onDeleteSaved,
  onInspectEvidence,
  onNavigateToStudio
}) {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredList = savedList.filter((opp) => {
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();
    return (
      opp.title?.toLowerCase().includes(term) ||
      opp.organization?.toLowerCase().includes(term) ||
      opp.summary?.toLowerCase().includes(term)
    );
  });

  const getStatusBadge = (status) => {
    switch (status) {
      case 'Likely Match':
        return {
          bg: 'bg-[#00F5B4]/10 text-[#00F5B4] border-[#00F5B4]/30',
          icon: <CheckCircle2 className="w-3.5 h-3.5 text-[#00F5B4]" />,
        };
      case 'Needs Verification':
        return {
          bg: 'bg-[#F59E0B]/10 text-[#F59E0B] border-[#F59E0B]/30',
          icon: <AlertTriangle className="w-3.5 h-3.5 text-[#F59E0B]" />,
        };
      case 'Does Not Match':
      default:
        return {
          bg: 'bg-[#EF4444]/10 text-[#EF4444] border-[#EF4444]/30',
          icon: <XCircle className="w-3.5 h-3.5 text-[#EF4444]" />,
        };
    }
  };

  return (
    <div className="space-y-5">
      {/* Shortlist Header Bar */}
      <div className="bg-[#1E1E1E] border border-[#2E2E2E] rounded-xl p-5 shadow-dropbox-md flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <h2 className="text-base font-bold text-white tracking-tight">Persisted Opportunity Shortlist</h2>
            <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-[#0061FE]/20 text-[#60A5FA] border border-[#0061FE]/40">
              {savedList.length} Saved
            </span>
          </div>
          <p className="text-xs text-zinc-400 mt-1">
            Persisted in SQLite database at <code className="font-mono text-zinc-300">/api/saved</code>
          </p>
        </div>

        {/* Search in Saved */}
        {savedList.length > 0 && (
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search in saved..."
              className="w-full bg-[#161616] border border-[#2E2E2E] rounded-lg pl-9 pr-3 py-1.5 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-[#0061FE] focus:ring-1 focus:ring-[#0061FE]"
            />
          </div>
        )}
      </div>

      {/* List or Empty State */}
      {savedList.length === 0 ? (
        <div className="bg-[#1E1E1E] border border-[#2E2E2E] border-dashed rounded-xl p-12 text-center space-y-4 shadow-dropbox-sm">
          <div className="w-14 h-14 rounded-2xl bg-[#242424] border border-[#3E3E3E] mx-auto flex items-center justify-center text-zinc-500">
            <FolderOpen className="w-7 h-7 text-zinc-400" />
          </div>
          <div className="space-y-1">
            <h3 className="text-sm font-semibold text-white">Your shortlist is currently empty</h3>
            <p className="text-xs text-zinc-400 max-w-md mx-auto">
              Run a TinyFish research crawl in the Research Studio to discover verified hackathons and internships, then bookmark your top picks here.
            </p>
          </div>
          <button
            type="button"
            onClick={onNavigateToStudio}
            className="inline-flex items-center space-x-2 px-4 py-2 rounded-lg bg-[#0061FE] hover:bg-[#0050D8] text-white text-xs font-semibold shadow-dropbox-blue transition-colors"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Go to Research Studio</span>
          </button>
        </div>
      ) : filteredList.length === 0 ? (
        <div className="bg-[#1E1E1E] border border-[#2E2E2E] rounded-xl p-8 text-center text-zinc-400 text-xs">
          No saved opportunities match "{searchTerm}".
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredList.map((opp) => {
            const badge = getStatusBadge(opp.eligibility_status);
            const kd = opp.keyword_delta;

            return (
              <div
                key={opp.id}
                className="bg-[#1E1E1E] border border-[#2E2E2E] hover:border-[#3E3E3E] rounded-xl p-4 flex flex-col justify-between space-y-3 shadow-dropbox-sm transition-all"
              >
                {/* Card Top: Org, Status Badge, Score */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="flex items-center space-x-1.5 text-xs font-semibold text-zinc-300 truncate">
                      <Building2 className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                      <span className="truncate">{opp.organization}</span>
                    </span>

                    <div className="flex items-center space-x-2 shrink-0">
                      <span className="font-mono text-xs font-bold bg-[#141414] px-2 py-0.5 rounded border border-[#2E2E2E] text-white">
                        {opp.ranking_score}/100
                      </span>
                      <span className={`inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[10px] font-semibold border ${badge.bg}`}>
                        {badge.icon}
                        <span>{opp.eligibility_status}</span>
                      </span>
                    </div>
                  </div>

                  {/* Title */}
                  <h3 className="text-sm font-bold text-white tracking-tight leading-snug line-clamp-2">
                    {opp.title}
                  </h3>

                  {/* Summary */}
                  <p className="text-xs text-zinc-400 line-clamp-2 leading-relaxed">
                    {opp.summary}
                  </p>

                  {/* Metadata Chips */}
                  <div className="flex items-center space-x-3 text-[11px] text-zinc-400 pt-1 flex-wrap gap-y-1">
                    <span className="flex items-center space-x-1">
                      <Calendar className="w-3.5 h-3.5 text-zinc-500" />
                      <span>{opp.deadline}</span>
                    </span>
                    <span className="flex items-center space-x-1">
                      <Briefcase className="w-3.5 h-3.5 text-zinc-500" />
                      <span>{opp.work_mode || 'Unspecified'}</span>
                    </span>
                    <span className="flex items-center space-x-1">
                      <MapPin className="w-3.5 h-3.5 text-zinc-500" />
                      <span>{opp.location || 'Global'}</span>
                    </span>
                  </div>

                  {/* Portal Health Tactile Badge, Keyword Delta & Source Link */}
                  {(() => {
                    const portalBadge = getPortalHealthBadge(opp.portal_health_status);
                    return (
                      <div className="flex items-center space-x-2 pt-1 flex-wrap gap-y-1">
                        {opp.source_url && (
                          <a
                            href={opp.source_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center space-x-1 text-[11px] text-[#60A5FA] hover:underline"
                            title="Open Source Link"
                          >
                            <ExternalLink className="w-3 h-3" />
                            <span className="truncate max-w-[180px]">
                              {opp.source_url.replace(/^https?:\/\/(www\.)?/, '')}
                            </span>
                          </a>
                        )}
                        <span
                          className={`inline-flex items-center space-x-1.5 px-2 py-0.5 rounded text-[10px] font-mono border ${portalBadge.badge}`}
                          title={opp.portal_health_detail || portalBadge.label}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${portalBadge.dot}`} />
                          <span>{portalBadge.label}</span>
                        </span>

                        {kd && (
                          <span
                            className="inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[10px] font-mono border bg-[#1C1F2E] text-[#60A5FA] border-[#0061FE]/30"
                            title={`Matched: ${kd.matched_keywords?.join(', ') || 'None'} | Missing: ${kd.missing_prerequisites?.join(', ') || 'None'}`}
                          >
                            <Zap className="w-2.5 h-2.5 text-[#0061FE]" />
                            <span>
                              {kd.missing_prerequisites?.length > 0
                                ? `${kd.missing_prerequisites.length} Skill Gap`
                                : 'All Skills Matched'}
                            </span>
                          </span>
                        )}
                      </div>
                    );
                  })()}
                </div>

                {/* Card Bottom: Action Buttons */}
                <div className="pt-3 border-t border-[#2A2A2A] flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => onInspectEvidence(opp)}
                    className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-[#0061FE]/10 text-[#60A5FA] border border-[#0061FE]/30 hover:bg-[#0061FE] hover:text-white text-xs font-medium transition-colors"
                  >
                    <span>View Evidence</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>

                  <div className="flex items-center space-x-2">
                    <a
                      href={opp.source_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-[#2A2A2A] transition-colors border border-transparent hover:border-[#3E3E3E]"
                      title="Open Original Source URL"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </a>

                    {opp.official_application_url && (
                      <a
                        href={opp.official_application_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-1.5 rounded-lg text-[#00F5B4] hover:bg-[#00F5B4]/10 transition-colors border border-transparent hover:border-[#00F5B4]/30"
                        title="Direct Application URL"
                      >
                        <Link2 className="w-4 h-4" />
                      </a>
                    )}

                    <button
                      type="button"
                      onClick={() => onDeleteSaved(opp.id)}
                      className="p-1.5 rounded-lg text-zinc-400 hover:text-red-400 hover:bg-red-500/10 transition-colors border border-transparent hover:border-red-500/30"
                      title="Remove from Shortlist"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
