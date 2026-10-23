import React, { useState } from 'react';
import { User, GraduationCap, Code2, Heart, MapPin, Briefcase, Zap, Loader2, Sparkles, SlidersHorizontal } from 'lucide-react';

const PRESETS = [
  {
    name: 'Arjun Sharma',
    education_level: 'Undergraduate',
    course_and_year: 'B.Tech CSE, 3rd Year',
    skills: 'Python, FastAPI, React, PyTorch, SQL',
    interests: 'AI Agents, Web Automation, LLMs, Hackathons',
    location: 'India',
    preferred_work_mode: 'Remote',
    opportunity_type: 'Both',
    label: 'AI & Autonomous Agents',
  },
  {
    name: 'Priya Nair',
    education_level: 'Undergraduate',
    course_and_year: 'B.Tech IT, 4th Year',
    skills: 'TypeScript, React, Node.js, Next.js, Docker, PostgreSQL',
    interests: 'Cloud Systems, Developer Tooling, Open Source',
    location: 'Remote / Global',
    preferred_work_mode: 'Remote',
    opportunity_type: 'Internship',
    label: 'Full-Stack & Cloud',
  },
  {
    name: 'Rohan Varma',
    education_level: "Master's",
    course_and_year: 'M.Tech AI & Robotics, 1st Year',
    skills: 'Python, C++, PyTorch, Scikit-Learn, Algorithms, Linux',
    interests: 'Autonomous Agents, Computer Vision, Hackathons',
    location: 'India / Bengaluru',
    preferred_work_mode: 'Any',
    opportunity_type: 'Competition',
    label: 'Competitive Hacker & ML',
  },
  {
    name: 'Ananya Deshmukh',
    education_level: 'Undergraduate',
    course_and_year: 'B.Tech Data Science, 3rd Year',
    skills: 'Python, Pandas, SQL, Tableau, R, Statistical Modeling',
    interests: 'Data Analytics, Quantitative Modeling, FinTech',
    location: 'Bengaluru / Mumbai',
    preferred_work_mode: 'Hybrid',
    opportunity_type: 'Both',
    label: 'Data Science & FinTech',
  },
];

export default function ProfilePanel({ onStartResearch, isStreaming }) {
  const [profile, setProfile] = useState(PRESETS[0]);
  const [selectedPreset, setSelectedPreset] = useState(0);

  const handlePresetSelect = (index) => {
    setSelectedPreset(index);
    setProfile(PRESETS[index]);
  };

  const handleChange = (field, value) => {
    setProfile((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (isStreaming) return;

    // Convert comma-separated string to list
    const skillsList = profile.skills
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    const interestsList = profile.interests
      .split(',')
      .map((i) => i.trim())
      .filter(Boolean);

    onStartResearch({
      name: profile.name.trim() || 'Student',
      education_level: profile.education_level,
      course_and_year: profile.course_and_year.trim(),
      skills: skillsList.length ? skillsList : ['Python', 'Problem Solving'],
      interests: interestsList.length ? interestsList : ['Hackathons', 'Tech'],
      location: profile.location.trim() || 'India',
      preferred_work_mode: profile.preferred_work_mode,
      opportunity_type: profile.opportunity_type,
    });
  };

  return (
    <div className="bg-[#1E1E1E] border border-[#2E2E2E] rounded-xl p-5 shadow-dropbox-md">
      {/* Header and Preset Pills */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-[#2E2E2E] gap-3">
        <div className="flex items-center space-x-2.5">
          <div className="w-8 h-8 rounded-lg bg-[#2D2D2D] border border-[#3E3E3E] flex items-center justify-center text-zinc-300">
            <SlidersHorizontal className="w-4 h-4 text-[#0061FE]" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-white tracking-tight">Student Profile & Intent</h2>
            <p className="text-xs text-zinc-400">Deterministic criteria for TinyFish crawl & scoring</p>
          </div>
        </div>

        {/* Quick Presets */}
        <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 sm:pb-0">
          <span className="text-[11px] text-zinc-500 uppercase font-mono mr-1">Presets:</span>
          {PRESETS.map((preset, idx) => (
            <button
              key={preset.label}
              type="button"
              onClick={() => handlePresetSelect(idx)}
              className={`px-2.5 py-1 rounded text-[11px] font-medium whitespace-nowrap transition-colors ${
                selectedPreset === idx
                  ? 'bg-[#0061FE]/20 text-[#0061FE] border border-[#0061FE]/50'
                  : 'bg-[#242424] text-zinc-400 hover:text-zinc-200 border border-[#2E2E2E]'
              }`}
            >
              {preset.label}
            </button>
          ))}
        </div>
      </div>

      {/* Profile Form */}
      <form onSubmit={handleSubmit} className="mt-4 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Student Name */}
          <div>
            <label className="block text-xs font-medium text-zinc-300 mb-1 flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-zinc-400" />
              <span>Full Name</span>
            </label>
            <input
              type="text"
              required
              value={profile.name}
              onChange={(e) => handleChange('name', e.target.value)}
              placeholder="e.g. Arjun Sharma"
              className="w-full bg-[#181818] border border-[#2E2E2E] rounded-lg px-3 py-2 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-[#0061FE] focus:ring-1 focus:ring-[#0061FE] transition-colors"
            />
          </div>

          {/* Education Level */}
          <div>
            <label className="block text-xs font-medium text-zinc-300 mb-1 flex items-center gap-1.5">
              <GraduationCap className="w-3.5 h-3.5 text-zinc-400" />
              <span>Academic Level</span>
            </label>
            <select
              value={profile.education_level}
              onChange={(e) => handleChange('education_level', e.target.value)}
              className="w-full bg-[#181818] border border-[#2E2E2E] rounded-lg px-3 py-2 text-xs text-zinc-100 focus:outline-none focus:border-[#0061FE] focus:ring-1 focus:ring-[#0061FE] transition-colors"
            >
              <option value="Undergraduate">Undergraduate (B.Tech / B.E. / B.Sc)</option>
              <option value="Master's">Master's (M.Tech / M.S. / MCA)</option>
              <option value="PhD">PhD / Doctoral</option>
              <option value="High School">High School</option>
            </select>
          </div>
        </div>

        {/* Course and Year */}
        <div>
          <label className="block text-xs font-medium text-zinc-300 mb-1">
            Course & Academic Standing
          </label>
          <input
            type="text"
            required
            value={profile.course_and_year}
            onChange={(e) => handleChange('course_and_year', e.target.value)}
            placeholder="e.g. B.Tech CSE, 3rd Year"
            className="w-full bg-[#181818] border border-[#2E2E2E] rounded-lg px-3 py-2 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-[#0061FE] focus:ring-1 focus:ring-[#0061FE] transition-colors font-mono"
          />
        </div>

        {/* Technical Skills */}
        <div>
          <label className="block text-xs font-medium text-zinc-300 mb-1 flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <Code2 className="w-3.5 h-3.5 text-zinc-400" />
              <span>Technical Skills (Comma separated)</span>
            </span>
            <span className="text-[11px] text-zinc-500 font-mono">Matched deterministically</span>
          </label>
          <input
            type="text"
            required
            value={profile.skills}
            onChange={(e) => handleChange('skills', e.target.value)}
            placeholder="e.g. Python, FastAPI, React, SQL, PyTorch"
            className="w-full bg-[#181818] border border-[#2E2E2E] rounded-lg px-3 py-2 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-[#0061FE] focus:ring-1 focus:ring-[#0061FE] transition-colors font-mono"
          />
        </div>

        {/* Focus Area / Interests */}
        <div>
          <label className="block text-xs font-medium text-zinc-300 mb-1 flex items-center gap-1.5">
            <Heart className="w-3.5 h-3.5 text-zinc-400" />
            <span>Focus Areas & Interests</span>
          </label>
          <input
            type="text"
            required
            value={profile.interests}
            onChange={(e) => handleChange('interests', e.target.value)}
            placeholder="e.g. AI Agents, Web Automation, Hackathons, LLMs"
            className="w-full bg-[#181818] border border-[#2E2E2E] rounded-lg px-3 py-2 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-[#0061FE] focus:ring-1 focus:ring-[#0061FE] transition-colors"
          />
        </div>

        {/* Geographic Location, Work Mode & Opportunity Type */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-medium text-zinc-300 mb-1 flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-zinc-400" />
              <span>Location</span>
            </label>
            <input
              type="text"
              required
              value={profile.location}
              onChange={(e) => handleChange('location', e.target.value)}
              placeholder="e.g. India or Remote"
              className="w-full bg-[#181818] border border-[#2E2E2E] rounded-lg px-3 py-2 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-[#0061FE] focus:ring-1 focus:ring-[#0061FE] transition-colors"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-zinc-300 mb-1 flex items-center gap-1.5">
              <Briefcase className="w-3.5 h-3.5 text-zinc-400" />
              <span>Work Mode</span>
            </label>
            <select
              value={profile.preferred_work_mode}
              onChange={(e) => handleChange('preferred_work_mode', e.target.value)}
              className="w-full bg-[#181818] border border-[#2E2E2E] rounded-lg px-3 py-2 text-xs text-zinc-100 focus:outline-none focus:border-[#0061FE] focus:ring-1 focus:ring-[#0061FE] transition-colors"
            >
              <option value="Any">Any Mode</option>
              <option value="Remote">Remote Only</option>
              <option value="In-Office">In-Office</option>
              <option value="Hybrid">Hybrid</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-zinc-300 mb-1 flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-zinc-400" />
              <span>Category</span>
            </label>
            <select
              value={profile.opportunity_type}
              onChange={(e) => handleChange('opportunity_type', e.target.value)}
              className="w-full bg-[#181818] border border-[#2E2E2E] rounded-lg px-3 py-2 text-xs text-zinc-100 focus:outline-none focus:border-[#0061FE] focus:ring-1 focus:ring-[#0061FE] transition-colors"
            >
              <option value="Both">Both (Hackathons & Internships)</option>
              <option value="Competition">Competitions & Hackathons</option>
              <option value="Internship">Internships Only</option>
            </select>
          </div>
        </div>

        {/* Primary CTA Button */}
        <div className="pt-2">
          <button
            type="submit"
            disabled={isStreaming}
            className={`w-full py-2.5 px-4 rounded-lg text-sm font-semibold text-white tracking-wide transition-all duration-200 flex items-center justify-center space-x-2 ${
              isStreaming
                ? 'bg-[#1E40AF] cursor-not-allowed opacity-90'
                : 'bg-[#0061FE] hover:bg-[#0050D8] active:scale-[0.99] shadow-dropbox-blue ring-1 ring-white/10'
            }`}
          >
            {isStreaming ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-white" />
                <span>TinyFish Crawl & Audit In Progress...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 text-white" />
                <span>Dispatch TinyFish Research Agent</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
