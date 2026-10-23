import React, { useEffect, useState } from 'react';
import { 
  X, 
  CheckCircle2, 
  AlertTriangle, 
  XCircle, 
  ExternalLink, 
  Bookmark, 
  BookmarkCheck, 
  Building2, 
  Calendar, 
  MapPin, 
  Briefcase, 
  CheckSquare, 
  Square, 
  FileText, 
  Compass, 
  Sparkles,
  Link2
} from 'lucide-react';

export default function EvidenceDrawer({
  opportunity,
  onClose,
  isSaved = false,
  onSave
}) {
  const [completedActions, setCompletedActions] = useState({});

  // Reset checked actions when opportunity changes
  useEffect(() => {
    setCompletedActions({});
  }, [opportunity?.id]);

  // Handle ESC key to close drawer
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  if (!opportunity) return null;

  const toggleAction = (idx) => {
    setCompletedActions((prev) => ({
      ...prev,
      [idx]: !prev[idx],
    }));
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'MET':
        return {
          icon: <CheckCircle2 className="w-4 h-4 text-[#00F5B4]" />,
          text: 'text-[#00F5B4]',
          bg: 'bg-[#00F5B4]/10 border-[#00F5B4]/30',
        };
      case 'UNCERTAIN':
        return {
          icon: <AlertTriangle className="w-4 h-4 text-[#F59E0B]" />,
          text: 'text-[#F59E0B]',
          bg: 'bg-[#F59E0B]/10 border-[#F59E0B]/30',
        };
      case 'UNMET':
      default:
        return {
          icon: <XCircle className="w-4 h-4 text-[#EF4444]" />,
          text: 'text-[#EF4444]',
          bg: 'bg-[#EF4444]/10 border-[#EF4444]/30',
        };
    }
  };

  const badgeColor =
    opportunity.eligibility_status === 'Likely Match'
      ? 'bg-[#00F5B4]/10 text-[#00F5B4] border-[#00F5B4]/30'
      : opportunity.eligibility_status === 'Needs Verification'
      ? 'bg-[#F59E0B]/10 text-[#F59E0B] border-[#F59E0B]/30'
      : 'bg-[#EF4444]/10 text-[#EF4444] border-[#EF4444]/30';

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Evidence and Audit for ${opportunity.title}`}
      className="fixed inset-0 z-50 flex justify-end bg-black/70 backdrop-blur-sm transition-opacity duration-200"
      onClick={(e) => {
        // Light dismiss on backdrop click
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div 
        className="w-full max-w-2xl bg-[#161616] border-l border-[#2E2E2E] h-full overflow-y-auto flex flex-col shadow-2xl animate-in slide-in-from-right duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drawer Header */}
        <div className="sticky top-0 z-20 bg-[#1A1A1A]/95 backdrop-blur-md px-6 py-4 border-b border-[#2E2E2E] flex items-start justify-between gap-4">
          <div className="space-y-1 flex-1">
            <div className="flex items-center space-x-2 flex-wrap gap-y-1">
              <span className="flex items-center space-x-1 text-xs font-semibold text-zinc-300">
                <Building2 className="w-3.5 h-3.5 text-zinc-400" />
                <span>{opportunity.organization}</span>
              </span>

              <span className="text-[11px] font-medium px-2 py-0.5 rounded bg-[#242424] text-zinc-300 border border-[#3E3E3E]">
                {opportunity.category}
              </span>

              <span className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full border ${badgeColor}`}>
                {opportunity.eligibility_status}
              </span>
            </div>

            <h2 className="text-lg font-bold text-white tracking-tight leading-snug">
              {opportunity.title}
            </h2>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-[#282828] transition-colors border border-transparent hover:border-[#3E3E3E]"
              aria-label="Close Evidence Drawer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Drawer Content Body */}
        <div className="p-6 space-y-6 flex-1">
          {/* Quick Metrics & Score Banner */}
          <div className="bg-[#1E1E1E] border border-[#2E2E2E] rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center space-x-4">
              <div className="bg-[#141414] border border-[#2E2E2E] px-4 py-2 rounded-xl text-center">
                <div className="text-2xl font-extrabold font-mono text-white">
                  {opportunity.ranking_score}
                </div>
                <div className="text-[10px] uppercase font-mono text-zinc-500">
                  Match Score
                </div>
              </div>

              <div className="space-y-1 text-xs text-zinc-300">
                <div className="flex items-center space-x-2">
                  <Calendar className="w-3.5 h-3.5 text-zinc-500" />
                  <span className="text-zinc-400">Deadline:</span>
                  <span className="font-semibold text-white">{opportunity.deadline}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Briefcase className="w-3.5 h-3.5 text-zinc-500" />
                  <span className="text-zinc-400">Mode:</span>
                  <span className="font-semibold text-white">{opportunity.work_mode || 'Unspecified'}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <MapPin className="w-3.5 h-3.5 text-zinc-500" />
                  <span className="text-zinc-400">Location:</span>
                  <span className="font-semibold text-white">{opportunity.location || 'Global'}</span>
                </div>
              </div>
            </div>

            {/* Save CTA */}
            <button
              type="button"
              onClick={() => onSave(opportunity)}
              className={`px-4 py-2.5 rounded-lg text-xs font-semibold transition-all flex items-center justify-center space-x-2 border shadow-sm ${
                isSaved
                  ? 'bg-[#00F5B4]/15 text-[#00F5B4] border-[#00F5B4]/40 hover:bg-[#00F5B4]/25'
                  : 'bg-[#0061FE] hover:bg-[#0050D8] text-white border-transparent shadow-dropbox-blue'
              }`}
            >
              {isSaved ? (
                <>
                  <BookmarkCheck className="w-4 h-4 text-[#00F5B4]" />
                  <span>Saved in Shortlist</span>
                </>
              ) : (
                <>
                  <Bookmark className="w-4 h-4" />
                  <span>Save to Shortlist</span>
                </>
              )}
            </button>
          </div>

          {/* Match Explanation */}
          <div className="space-y-2">
            <h3 className="text-xs uppercase font-mono tracking-wider text-zinc-400 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-[#0061FE]" />
              <span>Deterministic Match Rationale</span>
            </h3>
            <div className="bg-[#1C1C1C] border border-[#2E2E2E] rounded-xl p-3.5 text-xs text-zinc-200 leading-relaxed font-sans">
              {opportunity.match_explanation}
            </div>
          </div>

          {/* Section 1: Deterministic Requirement Breakdown */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs uppercase font-mono tracking-wider text-zinc-400 flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-[#0061FE]" />
                <span>Deterministic Requirement Audit</span>
              </h3>
              <span className="text-[11px] font-mono text-zinc-500">
                {opportunity.requirements_breakdown?.length || 0} Criteria Analyzed
              </span>
            </div>

            <div className="space-y-2">
              {opportunity.requirements_breakdown?.map((item, idx) => {
                const badge = getStatusIcon(item.status);
                return (
                  <div
                    key={idx}
                    className="bg-[#1A1A1A] border border-[#2E2E2E] rounded-lg p-3 space-y-1.5"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-white">
                        {item.requirement}
                      </span>
                      <span
                        className={`flex items-center space-x-1 px-2 py-0.5 rounded text-[10px] font-mono font-semibold border ${badge.bg}`}
                      >
                        {badge.icon}
                        <span className={badge.text}>{item.status}</span>
                      </span>
                    </div>
                    <p className="text-xs text-zinc-400 leading-relaxed">
                      {item.evidence_or_reason}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Section 2: Traceable Verbatim Excerpt */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="text-xs uppercase font-mono tracking-wider text-zinc-400 flex items-center gap-1.5">
                <Compass className="w-3.5 h-3.5 text-[#0061FE]" />
                <span>Traceable Source Excerpt</span>
              </h3>
              <span className="text-[10px] font-mono text-zinc-500">
                Crawled: {new Date(opportunity.retrieved_at).toLocaleString()}
              </span>
            </div>

            <div className="bg-[#121212] border border-[#2E2E2E] rounded-xl p-4 font-mono text-xs text-zinc-300 leading-relaxed border-l-4 border-l-[#0061FE] relative overflow-hidden">
              <p className="italic selection:bg-[#0061FE]/40">
                "{opportunity.evidence_snippet}"
              </p>
              <div className="mt-3 pt-2 border-t border-[#262626] flex items-center justify-between text-[11px] text-zinc-500">
                <span className="truncate max-w-sm">Source: {opportunity.source_url}</span>
                <a
                  href={opportunity.source_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[#60A5FA] hover:underline flex items-center space-x-1 shrink-0"
                >
                  <span>Verify at Source</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>
          </div>

          {/* Section 3: Action Checklist */}
          {opportunity.next_actions?.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs uppercase font-mono tracking-wider text-zinc-400 flex items-center gap-1.5">
                  <CheckSquare className="w-3.5 h-3.5 text-[#0061FE]" />
                  <span>Action Checklist For Application</span>
                </h3>
                <span className="text-[11px] font-mono text-zinc-500">
                  {Object.values(completedActions).filter(Boolean).length}/
                  {opportunity.next_actions.length} Completed
                </span>
              </div>

              <div className="space-y-2">
                {opportunity.next_actions.map((action, idx) => {
                  const done = completedActions[idx];
                  return (
                    <div
                      key={idx}
                      onClick={() => toggleAction(idx)}
                      className={`flex items-start space-x-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                        done
                          ? 'bg-[#181818] border-[#2E2E2E] text-zinc-500 line-through'
                          : 'bg-[#1E1E1E] border-[#2E2E2E] hover:border-[#3E3E3E] text-zinc-200'
                      }`}
                    >
                      <button
                        type="button"
                        className="pt-0.5 text-[#0061FE] shrink-0"
                      >
                        {done ? (
                          <CheckSquare className="w-4 h-4 text-[#00F5B4]" />
                        ) : (
                          <Square className="w-4 h-4 text-zinc-500" />
                        )}
                      </button>
                      <div className="text-xs leading-relaxed flex-1">
                        <span className="font-mono text-zinc-500 mr-2">{idx + 1}.</span>
                        <span>{action}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Drawer Footer Actions */}
        <div className="sticky bottom-0 bg-[#1A1A1A]/95 backdrop-blur-md px-6 py-4 border-t border-[#2E2E2E] flex items-center justify-between gap-3">
          <div className="flex items-center space-x-2">
            <a
              href={opportunity.source_url}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-2 rounded-lg bg-[#242424] hover:bg-[#2C2C2C] text-zinc-300 hover:text-white border border-[#2E2E2E] text-xs font-medium flex items-center space-x-1.5 transition-colors"
            >
              <span>Official Source</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>

            {opportunity.official_application_url && (
              <a
                href={opportunity.official_application_url}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3.5 py-2 rounded-lg bg-[#0061FE] hover:bg-[#0050D8] text-white text-xs font-semibold flex items-center space-x-1.5 transition-colors shadow-dropbox-blue"
              >
                <Link2 className="w-3.5 h-3.5" />
                <span>Direct Apply Portal</span>
              </a>
            )}
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-medium transition-colors"
          >
            Close Panel
          </button>
        </div>
      </div>
    </div>
  );
}
