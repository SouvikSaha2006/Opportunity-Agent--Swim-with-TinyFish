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
  Link2, 
  ShieldCheck, 
  Activity,
  Zap,
  Target,
  Copy,
  Check,
  Clock,
  ArrowUpRight,
  Flame,
  Award,
  AlertOctagon,
  Share2,
  History,
  Globe
} from 'lucide-react';


export default function EvidenceDrawer({
  opportunity,
  onClose,
  isSaved = false,
  onSave
}) {
  const [completedActions, setCompletedActions] = useState({});
  const [completedSprintSteps, setCompletedSprintSteps] = useState({});
  const [copiedFixIndex, setCopiedFixIndex] = useState(null);

  // Reset checked states when opportunity changes
  useEffect(() => {
    setCompletedActions({});
    setCompletedSprintSteps({});
    setCopiedFixIndex(null);
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

  const toggleSprintStep = (idx) => {
    setCompletedSprintSteps((prev) => ({
      ...prev,
      [idx]: !prev[idx],
    }));
  };

  const handleCopyFix = (text, idx) => {
    navigator.clipboard.writeText(text);
    setCopiedFixIndex(idx);
    setTimeout(() => setCopiedFixIndex(null), 2000);
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

  const getPortalHealthBadge = (status) => {
    switch (status) {
      case 'PORTAL_LIVE_VERIFIED':
        return {
          label: 'Live Form Verified',
          dot: 'bg-[#059669]',
          badge: 'bg-[#059669]/15 text-[#10B981] border-[#059669]/40',
          border: 'border-l-4 border-l-[#059669]',
          icon: <CheckCircle2 className="w-4 h-4 text-[#10B981]" />,
        };
      case 'PORTAL_CLOSED_OR_EXPIRED':
        return {
          label: 'Application Closed',
          dot: 'bg-[#EF4444]',
          badge: 'bg-[#EF4444]/15 text-[#EF4444] border-[#EF4444]/40',
          border: 'border-l-4 border-l-[#EF4444]',
          icon: <XCircle className="w-4 h-4 text-[#EF4444]" />,
        };
      case 'AUTH_WALL_REQUIRED':
        return {
          label: 'Sign-In Required',
          dot: 'bg-[#F59E0B]',
          badge: 'bg-[#F59E0B]/15 text-[#F59E0B] border-[#F59E0B]/40',
          border: 'border-l-4 border-l-[#F59E0B]',
          icon: <AlertTriangle className="w-4 h-4 text-[#F59E0B]" />,
        };
      case 'PORTAL_UNVERIFIED':
      default:
        return {
          label: 'Unverified Portal',
          dot: 'bg-zinc-400',
          badge: 'bg-zinc-800 text-zinc-400 border-zinc-700',
          border: 'border-l-4 border-l-zinc-600',
          icon: <AlertTriangle className="w-4 h-4 text-zinc-400" />,
        };
    }
  };

  const portalHealth = getPortalHealthBadge(opportunity.portal_health_status);
  const keywordDelta = opportunity.keyword_delta;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Evidence and Audit for ${opportunity.title}`}
      className="fixed inset-0 z-50 flex justify-end bg-black/70 backdrop-blur-sm transition-opacity duration-200"
      onClick={(e) => {
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

              <span className={`inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[10px] font-mono border ${portalHealth.badge}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${portalHealth.dot}`} />
                <span>{portalHealth.label}</span>
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

          {/* FEATURE 2: Skill & Keyword Delta Matrix */}
          {keywordDelta && (
            <div className="space-y-4 bg-[#181818] border border-[#2E2E2E] rounded-xl p-4 relative overflow-hidden">
              <div className="flex items-center justify-between pb-3 border-b border-[#2A2A2A]">
                <div className="flex items-center space-x-2">
                  <div className="w-6 h-6 rounded-md bg-[#0061FE]/20 text-[#0061FE] flex items-center justify-center">
                    <Target className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-white">
                      Skill & Keyword Delta Matrix
                    </h3>
                    <p className="text-[11px] text-zinc-400">
                      Career Acceleration • CV Alignment & 48-Hour Micro-Sprint
                    </p>
                  </div>
                </div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#0061FE]/10 text-[#60A5FA] border border-[#0061FE]/30">
                  Feature 2
                </span>
              </div>

              {/* Keyword Comparison Strip */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Matched Keywords */}
                <div className="bg-[#1C1C1C] border border-[#2E2E2E] rounded-lg p-3 space-y-2">
                  <div className="flex items-center justify-between text-xs font-medium text-zinc-300">
                    <span className="flex items-center gap-1.5 text-[#00F5B4]">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Matched Profile Skills</span>
                    </span>
                    <span className="font-mono text-[11px] text-zinc-500">
                      {keywordDelta.matched_keywords?.length || 0}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {keywordDelta.matched_keywords?.length > 0 ? (
                      keywordDelta.matched_keywords.map((kw, i) => (
                        <span
                          key={i}
                          className="px-2 py-0.5 rounded text-[11px] font-mono font-medium bg-[#00F5B4]/10 text-[#00F5B4] border border-[#00F5B4]/30"
                        >
                          ✓ {kw}
                        </span>
                      ))
                    ) : (
                      <span className="text-xs text-zinc-500 italic">No exact keyword matches found</span>
                    )}
                  </div>
                </div>

                {/* Missing Prerequisites */}
                <div className="bg-[#1C1C1C] border border-[#2E2E2E] rounded-lg p-3 space-y-2">
                  <div className="flex items-center justify-between text-xs font-medium text-zinc-300">
                    <span className="flex items-center gap-1.5 text-[#F59E0B]">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      <span>Missing Prerequisites</span>
                    </span>
                    <span className="font-mono text-[11px] text-zinc-500">
                      {keywordDelta.missing_prerequisites?.length || 0}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {keywordDelta.missing_prerequisites?.length > 0 ? (
                      keywordDelta.missing_prerequisites.map((kw, i) => (
                        <span
                          key={i}
                          className="px-2 py-0.5 rounded text-[11px] font-mono font-medium bg-[#F59E0B]/10 text-[#F59E0B] border border-[#F59E0B]/30"
                        >
                          + {kw}
                        </span>
                      ))
                    ) : (
                      <span className="text-xs text-[#00F5B4] italic">All primary stack requirements met!</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Resume Keyword Fixes */}
              {keywordDelta.resume_keyword_fixes?.length > 0 && (
                <div className="space-y-2 pt-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-zinc-200 flex items-center gap-1.5">
                      <FileText className="w-3.5 h-3.5 text-[#60A5FA]" />
                      <span>ATS Resume Keyword Optimizations</span>
                    </span>
                    <span className="text-[10px] font-mono text-zinc-500">
                      Click to copy recommendation
                    </span>
                  </div>

                  <div className="space-y-1.5">
                    {keywordDelta.resume_keyword_fixes.map((fix, idx) => {
                      const isCopied = copiedFixIndex === idx;
                      return (
                        <div
                          key={idx}
                          onClick={() => handleCopyFix(fix, idx)}
                          className="bg-[#141414] border border-[#2A2A2A] hover:border-[#0061FE]/50 rounded-lg p-2.5 flex items-start justify-between gap-3 cursor-pointer group transition-all"
                        >
                          <div className="flex items-start space-x-2 text-xs text-zinc-300 leading-relaxed">
                            <span className="text-[#0061FE] font-bold font-mono">#{idx + 1}</span>
                            <span className="group-hover:text-white transition-colors">{fix}</span>
                          </div>
                          <button
                            type="button"
                            className="p-1 rounded text-zinc-500 group-hover:text-[#60A5FA] transition-colors shrink-0 pt-0.5"
                            title="Copy recommendation"
                          >
                            {isCopied ? (
                              <span className="flex items-center space-x-1 text-[#00F5B4] text-[10px] font-mono">
                                <Check className="w-3 h-3" />
                                <span>Copied</span>
                              </span>
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* ⚡ 48-Hour Micro-Sprint Challenge */}
              <div className="mt-3 bg-gradient-to-br from-[#1C2333] to-[#161616] border border-[#0061FE]/40 rounded-xl p-4 space-y-3 relative overflow-hidden shadow-dropbox-sm">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span className="p-1 rounded-md bg-[#0061FE] text-white">
                      <Zap className="w-3.5 h-3.5 fill-current" />
                    </span>
                    <div>
                      <span className="text-xs font-bold text-white tracking-tight">
                        {keywordDelta.micro_sprint?.title || '48-Hour Micro-Sprint Challenge'}
                      </span>
                      <div className="text-[10px] text-zinc-400 flex items-center gap-1 font-mono">
                        <Clock className="w-3 h-3 text-[#60A5FA]" />
                        <span>Timeline: 48 Hours • Tangible Proof-of-Work</span>
                      </div>
                    </div>
                  </div>

                  <span className="px-2 py-0.5 rounded text-[10px] font-mono uppercase bg-[#0061FE]/20 text-[#60A5FA] border border-[#0061FE]/40">
                    Bridge Gap Fast
                  </span>
                </div>

                {/* Micro-Sprint Task Statement */}
                <p className="text-xs text-zinc-200 leading-relaxed bg-[#101522]/80 p-3 rounded-lg border border-[#0061FE]/20 font-sans">
                  {keywordDelta.micro_sprint_task}
                </p>

                {/* Tangible Deliverable */}
                {keywordDelta.micro_sprint?.deliverable && (
                  <div className="text-xs text-zinc-400 flex items-start gap-1.5 pt-0.5">
                    <Award className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                    <span>
                      <strong className="text-zinc-200">Target Deliverable:</strong> {keywordDelta.micro_sprint.deliverable}
                    </span>
                  </div>
                )}

                {/* 4-Phase Sprint Milestones */}
                {keywordDelta.micro_sprint?.steps?.length > 0 && (
                  <div className="space-y-1.5 pt-1">
                    <span className="text-[11px] font-mono text-zinc-400 uppercase tracking-wider block">
                      Sprint Execution Milestones:
                    </span>
                    <div className="space-y-1.5">
                      {keywordDelta.micro_sprint.steps.map((step, sIdx) => {
                        const stepDone = completedSprintSteps[sIdx];
                        return (
                          <div
                            key={sIdx}
                            onClick={() => toggleSprintStep(sIdx)}
                            className={`flex items-start space-x-2.5 p-2 rounded-lg border cursor-pointer transition-colors ${
                              stepDone
                                ? 'bg-[#121822] border-[#2E2E2E] text-zinc-500 line-through'
                                : 'bg-[#141A28] border-[#2A344C] hover:border-[#0061FE] text-zinc-200'
                            }`}
                          >
                            <button
                              type="button"
                              className="pt-0.5 text-[#0061FE] shrink-0"
                            >
                              {stepDone ? (
                                <CheckSquare className="w-3.5 h-3.5 text-[#00F5B4]" />
                              ) : (
                                <Square className="w-3.5 h-3.5 text-zinc-400" />
                              )}
                            </button>
                            <span className="text-xs leading-relaxed">{step}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Dedicated Section: Destination Form Audit */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="text-xs uppercase font-mono tracking-wider text-zinc-400 flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-[#0061FE]" />
                <span>Destination Form Audit</span>
              </h3>
              <span className="text-[10px] font-mono text-zinc-500">
                Autonomous Deep Inspection
              </span>
            </div>

            <div className={`bg-[#191919] border border-[#2E2E2E] rounded-xl p-4 space-y-2.5 ${portalHealth.border}`}>
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center space-x-2">
                  {portalHealth.icon}
                  <span className="text-xs font-semibold text-white">
                    Target Portal Responsiveness
                  </span>
                </div>
                <span className={`inline-flex items-center space-x-1.5 px-2.5 py-0.5 rounded text-[11px] font-mono border ${portalHealth.badge}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${portalHealth.dot}`} />
                  <span>{portalHealth.label}</span>
                </span>
              </div>

              <p className="text-xs text-zinc-300 leading-relaxed font-sans">
                {opportunity.portal_health_detail || 'Destination could not be reached or confirmed.'}
              </p>

              {(opportunity.official_application_url || opportunity.source_url) && (
                <div className="pt-2 border-t border-[#262626] flex items-center justify-between text-[11px] text-zinc-500 flex-wrap gap-1">
                  <span className="truncate max-w-sm">
                    Target: {opportunity.official_application_url || opportunity.source_url}
                  </span>
                  <a
                    href={opportunity.official_application_url || opportunity.source_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[#60A5FA] hover:underline flex items-center space-x-1 shrink-0"
                  >
                    <span>Inspect Target Form</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              )}
            </div>
          </div>

          {/* FEATURE 3: Trust & Temporal Audit (Staleness & Fake-Opportunity Radar) */}
          {(() => {
            const audit = opportunity.authenticity_audit;
            if (!audit) return null;

            // Credibility flag visual style helper
            const getCredibilityConfig = (flag) => {
              switch (flag) {
                case 'VERIFIED_CANONICAL':
                  return {
                    label: 'Verified Canonical Source',
                    pill: 'bg-[#00F5B4]/15 text-[#00F5B4] border-[#00F5B4]/40',
                    icon: <ShieldCheck className="w-3.5 h-3.5 text-[#00F5B4]" />,
                    border: 'border-[#00F5B4]/30',
                    bg: 'bg-[#00F5B4]/5'
                  };
                case 'SUSPECTED_EXPIRED':
                  return {
                    label: 'Suspected Expired / Stale Repost',
                    pill: 'bg-[#EF4444]/15 text-[#EF4444] border-[#EF4444]/40 animate-pulse',
                    icon: <AlertOctagon className="w-3.5 h-3.5 text-[#EF4444]" />,
                    border: 'border-[#EF4444]/30',
                    bg: 'bg-[#EF4444]/5'
                  };
                case 'THIRD_PARTY_REPOST':
                default:
                  return {
                    label: 'Third-Party Aggregator Repost',
                    pill: 'bg-[#3E3E3E]/50 text-zinc-300 border-[#505050]',
                    icon: <Share2 className="w-3.5 h-3.5 text-zinc-400" />,
                    border: 'border-[#3E3E3E]',
                    bg: 'bg-[#1E1E1E]'
                  };
              }
            };

            const credConfig = getCredibilityConfig(audit.credibility_flag);

            let hostDomain = '';
            try {
              if (opportunity.source_url) {
                hostDomain = new URL(opportunity.source_url).hostname.replace(/^www\./, '');
              }
            } catch (e) {
              hostDomain = opportunity.source_url || '';
            }

            return (
              <div className="space-y-3 bg-[#181818] border border-[#2E2E2E] rounded-xl p-4 relative overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between pb-3 border-b border-[#2A2A2A]">
                  <div className="flex items-center space-x-2">
                    <div className="w-6 h-6 rounded-md bg-[#1E40AF]/20 text-[#60A5FA] flex items-center justify-center">
                      <ShieldCheck className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <h3 className="text-xs font-bold uppercase tracking-wider text-white">
                        Trust & Temporal Audit
                      </h3>
                      <p className="text-[11px] text-zinc-400">
                        Staleness & Fake-Opportunity Radar • Canonical Domain Verification
                      </p>
                    </div>
                  </div>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#1E40AF]/20 text-[#60A5FA] border border-[#1E40AF]/40">
                    Feature 3
                  </span>
                </div>

                {/* Credibility Status & Domain Attribution Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Credibility Status */}
                  <div className={`border rounded-lg p-3 space-y-1.5 ${credConfig.bg} ${credConfig.border}`}>
                    <span className="text-[11px] font-mono uppercase tracking-wider text-zinc-400 block">
                      Credibility Classification
                    </span>
                    <div className="flex items-center space-x-2 pt-0.5">
                      <span className={`inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-md text-xs font-semibold font-mono border ${credConfig.pill}`}>
                        {credConfig.icon}
                        <span>{credConfig.label}</span>
                      </span>
                    </div>
                  </div>

                  {/* Domain Attribution */}
                  <div className="bg-[#1C1C1C] border border-[#2E2E2E] rounded-lg p-3 space-y-1.5">
                    <span className="text-[11px] font-mono uppercase tracking-wider text-zinc-400 block">
                      Domain Authority Attribution
                    </span>
                    <div className="flex items-center space-x-2 pt-0.5">
                      {audit.domain_authority_type === 'CANONICAL_HOST' ? (
                        <span className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-md text-xs font-semibold font-mono bg-[#1E40AF]/20 text-[#60A5FA] border border-[#1E40AF]/40">
                          <ShieldCheck className="w-3.5 h-3.5 text-[#60A5FA]" />
                          <span>Primary Publisher (Canonical Host)</span>
                        </span>
                      ) : audit.domain_authority_type === 'AGGREGATOR_REPOST' ? (
                        <span className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-md text-xs font-semibold font-mono bg-[#3E3E3E]/50 text-zinc-300 border border-[#4E4E4E]">
                          <Share2 className="w-3.5 h-3.5 text-zinc-400" />
                          <span>Aggregator Syndication</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-md text-xs font-semibold font-mono bg-[#2A2A2A] text-zinc-400 border border-[#3A3A3A]">
                          <Globe className="w-3.5 h-3.5 text-zinc-400" />
                          <span>Unknown Domain Origin</span>
                        </span>
                      )}
                    </div>
                    {hostDomain && (
                      <p className="text-[11px] font-mono text-zinc-400 truncate pt-0.5">
                        Domain: {hostDomain}
                      </p>
                    )}
                  </div>
                </div>

                {/* Year Anomaly Analysis */}
                <div className="bg-[#1C1C1C] border border-[#2E2E2E] rounded-lg p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-zinc-200 flex items-center gap-1.5">
                      <History className="w-3.5 h-3.5 text-[#60A5FA]" />
                      <span>Year Anomaly Analysis</span>
                    </span>
                    <span className="text-[10px] font-mono text-zinc-400">
                      Operational Baseline: 2026
                    </span>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap pt-0.5">
                    {audit.detected_years && audit.detected_years.length > 0 ? (
                      audit.detected_years.map((year) => {
                        const isActiveTarget = year === 2026;
                        const isLegacy = year <= 2024;
                        return (
                          <span
                            key={year}
                            className={`inline-flex items-center space-x-1 px-2.5 py-1 rounded text-xs font-mono font-medium border ${
                              isActiveTarget
                                ? 'bg-[#00F5B4]/15 text-[#00F5B4] border-[#00F5B4]/40 font-bold'
                                : isLegacy
                                ? 'bg-[#EF4444]/15 text-[#EF4444] border-[#EF4444]/40'
                                : 'bg-[#2A2A2A] text-zinc-300 border-[#3A3A3A]'
                            }`}
                          >
                            {isActiveTarget ? (
                              <CheckCircle2 className="w-3.5 h-3.5 text-[#00F5B4]" />
                            ) : isLegacy ? (
                              <AlertOctagon className="w-3.5 h-3.5 text-[#EF4444]" />
                            ) : (
                              <Calendar className="w-3.5 h-3.5 text-zinc-400" />
                            )}
                            <span>
                              {year} {isActiveTarget ? '(Active 2026 Target)' : isLegacy ? '(Legacy Timestamp)' : ''}
                            </span>
                          </span>
                        );
                      })
                    ) : (
                      <span className="text-xs text-zinc-500 italic">
                        No calendar year references detected in opportunity corpus.
                      </span>
                    )}
                  </div>
                </div>

                {/* Temporal Warning Box */}
                {audit.temporal_warning && (
                  <div className="bg-[#2D1515] border border-[#EF4444]/50 rounded-lg p-3 space-y-1.5 text-xs text-[#FCA5A5] leading-relaxed">
                    <div className="flex items-center space-x-2 font-bold text-[#EF4444] uppercase font-mono text-[11px] tracking-wider">
                      <AlertOctagon className="w-4 h-4 shrink-0" />
                      <span>Temporal Warning • High Stale Repost Risk</span>
                    </div>
                    <p className="font-sans pl-6">{audit.temporal_warning}</p>
                    <p className="text-[11px] text-zinc-400 pl-6 italic">
                      Advisory: This opportunity contains legacy or expired temporal signals with no verified 2026 renewal. Please inspect host archives before submitting applications.
                    </p>
                  </div>
                )}
              </div>
            );
          })()}

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
