import React, { useState, useMemo } from 'react';
import { 
  Building2, 
  Calendar, 
  MapPin, 
  Briefcase, 
  CheckCircle2, 
  AlertTriangle, 
  XCircle, 
  ExternalLink, 
  Bookmark, 
  BookmarkCheck, 
  ArrowRight, 
  Filter, 
  Check, 
  Globe2, 
  Sparkles, 
  Search,
  Zap
} from 'lucide-react';

// Tactile badges for destination portal health inspection
export const getPortalHealthBadge = (status) => {
  switch (status) {
    case 'PORTAL_LIVE_VERIFIED':
      return {
        label: 'Live Form Verified',
        dot: 'bg-[#059669]',
        badge: 'bg-[#059669]/15 text-[#10B981] border-[#059669]/40',
      };
    case 'PORTAL_CLOSED_OR_EXPIRED':
      return {
        label: 'Application Closed',
        dot: 'bg-[#EF4444]',
        badge: 'bg-[#EF4444]/15 text-[#EF4444] border-[#EF4444]/40',
      };
    case 'AUTH_WALL_REQUIRED':
      return {
        label: 'Sign-In Required',
        dot: 'bg-[#F59E0B]',
        badge: 'bg-[#F59E0B]/15 text-[#F59E0B] border-[#F59E0B]/40',
      };
    case 'PORTAL_UNVERIFIED':
    default:
      return {
        label: 'Unverified Portal',
        dot: 'bg-zinc-400',
        badge: 'bg-zinc-800 text-zinc-400 border-zinc-700',
      };
  }
};

export default function ResultsMatrix({
  opportunities = [],
  selectedOpportunity,
  onSelectOpportunity,
  savedIds = new Set(),
  onSaveOpportunity,
  isStreaming = false
}) {
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [sortBy, setSortBy] = useState('SCORE_DESC');
  const [searchQuery, setSearchQuery] = useState('');

  // Extract distinct categories
  const categories = useMemo(() => {
    const set = new Set();
    opportunities.forEach((o) => {
      if (o.category) set.add(o.category);
    });
    return Array.from(set);
  }, [opportunities]);

  // Filter and sort opportunities
  const filtered = useMemo(() => {
    return opportunities
      .filter((opp) => {
        if (statusFilter !== 'ALL' && opp.eligibility_status !== statusFilter) return false;
        if (categoryFilter !== 'ALL' && opp.category !== categoryFilter) return false;
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const matchTitle = opp.title?.toLowerCase().includes(q);
          const matchOrg = opp.organization?.toLowerCase().includes(q);
          const matchSummary = opp.summary?.toLowerCase().includes(q);
          return matchTitle || matchOrg || matchSummary;
        }
        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'SCORE_DESC') return b.ranking_score - a.ranking_score;
        if (sortBy === 'SCORE_ASC') return a.ranking_score - b.ranking_score;
        if (sortBy === 'TITLE_ASC') return a.title.localeCompare(b.title);
        return 0;
      });
  }, [opportunities, statusFilter, categoryFilter, sortBy, searchQuery]);

  // Color tokens for eligibility
  const getEligibilityBadge = (status) => {
    switch (status) {
      case 'Likely Match':
        return {
          bg: 'bg-[#00F5B4]/10 text-[#00F5B4] border-[#00F5B4]/30',
          icon: <CheckCircle2 className="w-3.5 h-3.5 text-[#00F5B4]" />,
          bar: 'bg-[#00F5B4]',
        };
      case 'Needs Verification':
        return {
          bg: 'bg-[#F59E0B]/10 text-[#F59E0B] border-[#F59E0B]/30',
          icon: <AlertTriangle className="w-3.5 h-3.5 text-[#F59E0B]" />,
          bar: 'bg-[#F59E0B]',
        };
      case 'Does Not Match':
      default:
        return {
          bg: 'bg-[#EF4444]/10 text-[#EF4444] border-[#EF4444]/30',
          icon: <XCircle className="w-3.5 h-3.5 text-[#EF4444]" />,
          bar: 'bg-[#EF4444]',
        };
    }
  };

  return (
    <div className="space-y-4">
      {/* Matrix Controls & Filter Bar */}
      <div className="bg-[#1E1E1E] border border-[#2E2E2E] rounded-xl p-3.5 shadow-dropbox-sm flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Left Search input */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search verified opportunities by keyword, sponsor, or role..."
            className="w-full bg-[#161616] border border-[#2E2E2E] rounded-lg pl-9 pr-3 py-1.5 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-[#0061FE] focus:ring-1 focus:ring-[#0061FE]"
          />
        </div>

        {/* Filter Pills */}
        <div className="flex items-center space-x-2 flex-wrap gap-y-2">
          {/* Status selector */}
          <div className="flex items-center space-x-1 bg-[#161616] p-1 rounded-lg border border-[#2E2E2E]">
            {['ALL', 'Likely Match', 'Needs Verification', 'Does Not Match'].map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-2 py-1 rounded text-[11px] font-medium transition-colors ${
                  statusFilter === st
                    ? 'bg-[#0061FE] text-white shadow-sm'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                {st === 'ALL' ? 'All Status' : st}
              </button>
            ))}
          </div>

          {/* Sorter */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="bg-[#161616] border border-[#2E2E2E] rounded-lg px-2.5 py-1.5 text-[11px] text-zinc-300 focus:outline-none focus:border-[#0061FE]"
          >
            <option value="SCORE_DESC">Rank: Highest Score</option>
            <option value="SCORE_ASC">Rank: Lowest Score</option>
            <option value="TITLE_ASC">Title: A to Z</option>
          </select>
        </div>
      </div>

      {/* Results Header Count */}
      <div className="flex items-center justify-between px-1 text-xs text-zinc-400">
        <div className="flex items-center space-x-2">
          <span className="font-semibold text-zinc-200 font-mono">{filtered.length}</span>
          <span>
            {filtered.length === 1 ? 'Opportunity evaluated' : 'Opportunities evaluated'}
          </span>
          {opportunities.length > 0 && (
            <span className="text-[11px] text-zinc-500 font-mono">
              ({opportunities.filter((o) => o.eligibility_status === 'Likely Match').length} Likely Matches)
            </span>
          )}
        </div>
        <span className="text-[11px] text-zinc-500 font-mono">Sorted by deterministic eligibility</span>
      </div>

      {/* Grid of Opportunity Cards */}
      {filtered.length === 0 ? (
        <div className="bg-[#1E1E1E] border border-[#2E2E2E] border-dashed rounded-xl p-10 text-center space-y-3">
          <div className="w-12 h-12 rounded-xl bg-[#242424] border border-[#3E3E3E] mx-auto flex items-center justify-center text-zinc-500">
            <Globe2 className="w-6 h-6 text-zinc-400" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-zinc-200">
              {isStreaming ? 'TinyFish Web Agent is crawling...' : 'No opportunities match your filter'}
            </h3>
            <p className="text-xs text-zinc-400 max-w-sm mx-auto mt-1">
              {isStreaming
                ? 'Parsing live web content and evaluating deterministic student eligibility criteria.'
                : 'Adjust your search keywords, clear status filters, or dispatch another TinyFish research query.'}
            </p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3.5">
          {filtered.map((opp) => {
            const isSelected = selectedOpportunity?.id === opp.id;
            const isSaved = savedIds.has(opp.id);
            const badge = getEligibilityBadge(opp.eligibility_status);
            const portalBadge = getPortalHealthBadge(opp.portal_health_status);
            const kd = opp.keyword_delta;

            return (
              <div
                key={opp.id}
                onClick={() => onSelectOpportunity(opp)}
                className={`group bg-[#1E1E1E] border rounded-xl p-4 transition-all duration-150 cursor-pointer relative overflow-hidden shadow-dropbox-sm hover:shadow-dropbox-md ${
                  isSelected
                    ? 'border-[#0061FE] bg-[#222226] ring-1 ring-[#0061FE]'
                    : 'border-[#2E2E2E] hover:border-[#3E3E3E] hover:bg-[#202020]'
                }`}
              >
                {/* Visual score indicator bar on top edge */}
                <div
                  className={`absolute top-0 left-0 right-0 h-1 transition-all ${badge.bar}`}
                  style={{ width: `${Math.max(opp.ranking_score, 8)}%` }}
                />

                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 pt-1">
                  {/* Left Column: Org, Title, Summary, Tags */}
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                      {/* Organization tag */}
                      <span className="flex items-center space-x-1 text-xs font-semibold text-zinc-300">
                        <Building2 className="w-3.5 h-3.5 text-zinc-400" />
                        <span>{opp.organization}</span>
                      </span>

                      {/* Category Pill */}
                      <span className="text-[11px] font-medium px-2 py-0.5 rounded bg-[#272727] text-zinc-300 border border-[#383838]">
                        {opp.category}
                      </span>

                      {/* Live Data Badge */}
                      {opp.is_live_data && (
                        <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-[#0061FE]/10 text-[#60A5FA] border border-[#0061FE]/30 flex items-center space-x-1">
                          <Sparkles className="w-2.5 h-2.5 text-[#0061FE]" />
                          <span>TinyFish Crawled</span>
                        </span>
                      )}

                      {/* Destination Portal Health Status Badge */}
                      <span
                        className={`text-[10px] font-mono px-2 py-0.5 rounded border flex items-center space-x-1.5 ${portalBadge.badge}`}
                        title={opp.portal_health_detail || portalBadge.label}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${portalBadge.dot}`} />
                        <span>{portalBadge.label}</span>
                      </span>

                      {/* Feature 2: Keyword Delta Pill */}
                      {kd && (
                        <span
                          className="text-[10px] font-mono px-2 py-0.5 rounded border flex items-center space-x-1 bg-[#1C1F2E] text-[#60A5FA] border-[#0061FE]/30"
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

                    {/* Title */}
                    <h3 className="text-base font-bold text-white tracking-tight group-hover:text-[#60A5FA] transition-colors">
                      {opp.title}
                    </h3>

                    {/* Summary */}
                    <p className="text-xs text-zinc-300 leading-relaxed line-clamp-2">
                      {opp.summary}
                    </p>

                    {/* Meta Info: Deadline, Location, Work Mode */}
                    <div className="flex items-center space-x-4 text-[11px] text-zinc-400 pt-1 flex-wrap gap-y-1">
                      <div className="flex items-center space-x-1">
                        <Calendar className="w-3.5 h-3.5 text-zinc-500" />
                        <span>Deadline:</span>
                        <span className="text-zinc-200 font-medium">{opp.deadline}</span>
                      </div>

                      <div className="flex items-center space-x-1">
                        <Briefcase className="w-3.5 h-3.5 text-zinc-500" />
                        <span>Mode:</span>
                        <span className="text-zinc-200 font-medium">{opp.work_mode || 'Unspecified'}</span>
                      </div>

                      <div className="flex items-center space-x-1">
                        <MapPin className="w-3.5 h-3.5 text-zinc-500" />
                        <span>Location:</span>
                        <span className="text-zinc-200 font-medium">{opp.location || 'Global'}</span>
                      </div>
                    </div>

                    {/* Source Link with Tactile Portal Health Badge */}
                    {opp.source_url && (
                      <div className="flex items-center space-x-2 pt-1 flex-wrap gap-y-1">
                        <a
                          href={opp.source_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="inline-flex items-center space-x-1 text-[11px] text-[#60A5FA] hover:text-[#93C5FD] hover:underline"
                          title="Open official destination link"
                        >
                          <ExternalLink className="w-3 h-3 shrink-0" />
                          <span className="truncate max-w-[200px]">
                            {opp.source_url.replace(/^https?:\/\/(www\.)?/, '')}
                          </span>
                        </a>

                        <span
                          className={`inline-flex items-center space-x-1.5 px-2 py-0.5 rounded text-[10px] font-mono border ${portalBadge.badge}`}
                          title={opp.portal_health_detail || portalBadge.label}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${portalBadge.dot}`} />
                          <span>{portalBadge.label}</span>
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Right Column: Score Badge & Actions */}
                  <div className="flex sm:flex-col items-center sm:items-end justify-between gap-2 shrink-0 border-t sm:border-t-0 border-[#2E2E2E] pt-2 sm:pt-0">
                    {/* Score and Status Pill */}
                    <div className="flex items-center sm:flex-col sm:items-end gap-2">
                      <div className="flex items-baseline space-x-1 bg-[#161616] px-2.5 py-1 rounded-lg border border-[#2E2E2E]">
                        <span className="text-lg font-extrabold font-mono text-white">
                          {opp.ranking_score}
                        </span>
                        <span className="text-[10px] font-mono text-zinc-500">/100</span>
                      </div>

                      <span
                        className={`inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${badge.bg}`}
                      >
                        {badge.icon}
                        <span>{opp.eligibility_status}</span>
                      </span>
                    </div>

                    {/* Action buttons */}
                    <div className="flex items-center space-x-2 pt-1">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onSaveOpportunity(opp);
                        }}
                        className={`p-2 rounded-lg text-xs font-medium transition-colors border ${
                          isSaved
                            ? 'bg-[#00F5B4]/15 text-[#00F5B4] border-[#00F5B4]/40 hover:bg-[#00F5B4]/25'
                            : 'bg-[#242424] text-zinc-300 border-[#2E2E2E] hover:text-white hover:bg-[#2A2A2A]'
                        }`}
                        title={isSaved ? 'Saved in Shortlist' : 'Save to Shortlist'}
                      >
                        {isSaved ? (
                          <span className="flex items-center space-x-1">
                            <BookmarkCheck className="w-3.5 h-3.5 text-[#00F5B4]" />
                            <span className="text-[11px] font-mono">Saved</span>
                          </span>
                        ) : (
                          <span className="flex items-center space-x-1">
                            <Bookmark className="w-3.5 h-3.5" />
                            <span className="text-[11px] font-mono">Save</span>
                          </span>
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={() => onSelectOpportunity(opp)}
                        className="flex items-center space-x-1 px-2.5 py-2 rounded-lg bg-[#0061FE]/10 text-[#60A5FA] border border-[#0061FE]/30 hover:bg-[#0061FE] hover:text-white transition-colors text-xs font-medium"
                      >
                        <span>Evidence</span>
                        <ArrowRight className="w-3 h-3" />
                      </button>
                    </div>
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
