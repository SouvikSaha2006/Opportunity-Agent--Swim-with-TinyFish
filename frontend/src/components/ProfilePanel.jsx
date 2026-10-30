import React, { useState, useRef } from 'react';
import { 
  User, 
  GraduationCap, 
  Code2, 
  Heart, 
  MapPin, 
  Briefcase, 
  Zap, 
  Loader2, 
  Sparkles, 
  SlidersHorizontal,
  FileText,
  UploadCloud,
  CheckCircle2,
  AlertCircle,
  X,
  FileCheck,
  Cpu
} from 'lucide-react';
import { API_BASE_URL } from '../config';

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
  const [inputMode, setInputMode] = useState('resume'); // 'resume' | 'presets'

  // Resume Upload State
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [parsedResumeMeta, setParsedResumeMeta] = useState(null);
  const fileInputRef = useRef(null);

  const handlePresetSelect = (index) => {
    setSelectedPreset(index);
    setProfile(PRESETS[index]);
    setParsedResumeMeta(null);
    setUploadError(null);
  };

  const handleChange = (field, value) => {
    setProfile((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const executeResearchWithProfile = (profileData) => {
    const skillsList = typeof profileData.skills === 'string'
      ? profileData.skills.split(',').map((s) => s.trim()).filter(Boolean)
      : Array.isArray(profileData.skills) ? profileData.skills : [];

    const interestsList = typeof profileData.interests === 'string'
      ? profileData.interests.split(',').map((i) => i.trim()).filter(Boolean)
      : Array.isArray(profileData.interests) ? profileData.interests : [];

    onStartResearch({
      name: (profileData.name || 'Student').trim(),
      education_level: profileData.education_level || 'Undergraduate',
      course_and_year: (profileData.course_and_year || 'B.Tech Computer Science, 3rd Year').trim(),
      skills: skillsList.length ? skillsList : ['Python', 'Problem Solving'],
      interests: interestsList.length ? interestsList : ['Hackathons', 'Tech'],
      location: (profileData.location || 'India').trim(),
      preferred_work_mode: profileData.preferred_work_mode || 'Remote',
      opportunity_type: profileData.opportunity_type || 'Both',
    });
  };

  const handleSubmit = (e) => {
    if (e) e.preventDefault();
    if (isStreaming) return;
    executeResearchWithProfile(profile);
  };

  const handleFileUpload = async (file) => {
    if (!file) return;

    if (!file.name.toLowerCase().endsWith('.pdf') && file.type !== 'application/pdf') {
      setUploadError('Please select a valid PDF resume file (.pdf).');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setUploadError('File size exceeds the 10MB limit.');
      return;
    }

    setUploadError(null);
    setIsUploading(true);

    const formData = new FormData();
    formData.append('file', file);

    try {
      let res;
      try {
        res = await fetch(`${API_BASE_URL}/api/resume/parse`, {
          method: 'POST',
          body: formData,
        });
      } catch (directErr) {
        // Fallback to Vite proxy
        res = await fetch('/api/resume/parse', {
          method: 'POST',
          body: formData,
        });
      }

      if (!res.ok) {
        const errorJson = await res.json().catch(() => ({}));
        throw new Error(errorJson.detail || `Server returned error HTTP ${res.status}`);
      }

      const data = await res.json();
      if (!data.success) {
        throw new Error(data.message || 'Failed to parse candidate profile.');
      }

      const p = data.profile;
      const updatedProfile = {
        name: p.name || 'Candidate',
        education_level: p.education_level || 'Undergraduate',
        course_and_year: p.course_and_year || 'B.Tech Computer Science, 3rd Year',
        skills: Array.isArray(p.skills) ? p.skills.join(', ') : '',
        interests: Array.isArray(p.interests) ? p.interests.join(', ') : '',
        location: p.location || 'India',
        preferred_work_mode: p.preferred_work_mode || 'Remote',
        opportunity_type: p.opportunity_type || 'Both',
      };

      setProfile(updatedProfile);
      setParsedResumeMeta({
        filename: file.name,
        fileSize: (file.size / 1024).toFixed(1) + ' KB',
        experience_level: data.experience_level || 'Student / Entry Level',
        skillsCount: data.detected_skills_count || (p.skills ? p.skills.length : 0),
        skills: data.detected_skills || p.skills || [],
        domains: data.detected_domains || p.interests || [],
        email: data.email,
        snippet: data.raw_text_snippet,
      });

      setIsUploading(false);
    } catch (err) {
      console.error('Error parsing resume:', err);
      setUploadError(err.message || 'Could not parse resume. Ensure file contains extractable text.');
      setIsUploading(false);
    }
  };

  // Load packaged sample PDF resumes for 1-click test evaluations
  const handleLoadSampleResume = async (samplePath, filename) => {
    try {
      setIsUploading(true);
      setUploadError(null);
      const resp = await fetch(samplePath);
      if (!resp.ok) throw new Error('Sample resume file not found');
      const blob = await resp.blob();
      const file = new File([blob], filename, { type: 'application/pdf' });
      await handleFileUpload(file);
    } catch (err) {
      console.error('Failed loading sample resume:', err);
      setUploadError('Failed to load sample PDF: ' + err.message);
      setIsUploading(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleClearResume = () => {
    setParsedResumeMeta(null);
    setUploadError(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
    setProfile(PRESETS[0]);
  };

  return (
    <div className="bg-[#1E1E1E] border border-[#2E2E2E] rounded-xl p-5 shadow-dropbox-md space-y-5">
      {/* Top Header & Tab Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-[#2E2E2E] gap-3">
        <div className="flex items-center space-x-2.5">
          <div className="w-8 h-8 rounded-lg bg-[#2D2D2D] border border-[#3E3E3E] flex items-center justify-center text-zinc-300">
            <SlidersHorizontal className="w-4 h-4 text-[#0061FE]" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-white tracking-tight">Candidate Profile & Opportunity Intent</h2>
            <p className="text-xs text-zinc-400">Extract from Resume PDF or select a verified student profile</p>
          </div>
        </div>

        {/* Input Mode Selector */}
        <div className="flex items-center bg-[#161616] p-1 rounded-lg border border-[#2E2E2E]">
          <button
            type="button"
            onClick={() => setInputMode('resume')}
            className={`flex items-center space-x-1.5 px-3 py-1 rounded text-xs font-medium transition-colors ${
              inputMode === 'resume'
                ? 'bg-[#0061FE] text-white shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Resume / CV Reader</span>
          </button>
          <button
            type="button"
            onClick={() => setInputMode('presets')}
            className={`flex items-center space-x-1.5 px-3 py-1 rounded text-xs font-medium transition-colors ${
              inputMode === 'presets'
                ? 'bg-[#0061FE] text-white shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Zap className="w-3.5 h-3.5" />
            <span>Demo Presets</span>
          </button>
        </div>
      </div>

      {/* Mode A: Resume / CV Reader Dropzone & Extractor */}
      {inputMode === 'resume' && (
        <div className="space-y-3">
          <input
            type="file"
            ref={fileInputRef}
            onChange={(e) => e.target.files && handleFileUpload(e.target.files[0])}
            accept=".pdf,application/pdf"
            className="hidden"
          />

          {!parsedResumeMeta ? (
            /* Dropzone Area */
            <div
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onClick={() => !isUploading && fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-5 text-center cursor-pointer transition-all duration-200 ${
                isDragOver
                  ? 'border-[#0061FE] bg-[#0061FE]/10 ring-2 ring-[#0061FE]/20'
                  : 'border-[#333333] hover:border-[#0061FE]/70 bg-[#161616]/60 hover:bg-[#1A1A1A]'
              }`}
            >
              {isUploading ? (
                <div className="py-3 flex flex-col items-center space-y-2">
                  <Loader2 className="w-7 h-7 text-[#0061FE] animate-spin" />
                  <div className="text-xs font-medium text-white">Extracting Candidate Profile with PyPDF...</div>
                  <div className="text-[11px] text-zinc-400 font-mono">Parsing tech stack, domains, and experience level</div>
                </div>
              ) : (
                <div className="py-2 flex flex-col items-center space-y-2">
                  <div className="w-10 h-10 rounded-xl bg-[#242424] border border-[#3E3E3E] flex items-center justify-center text-[#0061FE] shadow-sm">
                    <UploadCloud className="w-5 h-5 text-[#0061FE]" />
                  </div>
                  <div>
                    <span className="text-xs font-semibold text-zinc-100">
                      Drop candidate resume (PDF) here or{' '}
                      <span className="text-[#0061FE] hover:underline">browse files</span>
                    </span>
                    <p className="text-[11px] text-zinc-400 mt-0.5">
                      Lightweight PyPDF extraction • Automatic skill extraction, domain tagging & seniority detection
                    </p>
                  </div>
                  <div className="flex items-center space-x-2 pt-1 text-[11px] text-zinc-500 font-mono">
                    <span className="px-2 py-0.5 rounded bg-[#202020] border border-[#2E2E2E]">Max 10MB</span>
                    <span>•</span>
                    <span className="px-2 py-0.5 rounded bg-[#202020] border border-[#2E2E2E]">PDF only</span>
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* Parsed Resume Status Banner */
            <div className="bg-[#18231E] border border-[#00F5B4]/30 rounded-xl p-4 shadow-dropbox-sm space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start space-x-3">
                  <div className="w-9 h-9 rounded-lg bg-[#00F5B4]/15 border border-[#00F5B4]/40 flex items-center justify-center shrink-0">
                    <FileCheck className="w-5 h-5 text-[#00F5B4]" />
                  </div>
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="text-xs font-bold text-white tracking-tight">{profile.name}</span>
                      <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-[#00F5B4]/15 text-[#00F5B4] border border-[#00F5B4]/30">
                        <CheckCircle2 className="w-3 h-3 text-[#00F5B4]" />
                        <span>Resume Analyzed</span>
                      </span>
                    </div>
                    <p className="text-[11px] text-zinc-400 mt-0.5">
                      {parsedResumeMeta.filename} ({parsedResumeMeta.fileSize}) • {parsedResumeMeta.experience_level}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleClearResume}
                  title="Upload different resume"
                  className="p-1.5 rounded-md text-zinc-400 hover:text-white hover:bg-[#25352C] transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Detected Skills Pills */}
              {parsedResumeMeta.skills && parsedResumeMeta.skills.length > 0 && (
                <div className="pt-1">
                  <div className="flex items-center justify-between text-[11px] text-zinc-400 mb-1.5">
                    <span className="font-mono text-zinc-300">
                      {parsedResumeMeta.skillsCount} Technical Skills Identified:
                    </span>
                    <span className="text-[10px] text-zinc-500 font-mono">Matched against TinyFish Catalog</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5 max-h-20 overflow-y-auto pr-1">
                    {parsedResumeMeta.skills.map((skill) => (
                      <span
                        key={skill}
                        className="px-2 py-0.5 rounded text-[11px] font-mono bg-[#1E2E26] text-[#00F5B4] border border-[#00F5B4]/20"
                      >
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Instant 1-Click Match CTA */}
              <div className="pt-1 flex items-center justify-between">
                <span className="text-[11px] text-zinc-400">
                  Profile form pre-filled below. You can review or match immediately.
                </span>
                <button
                  type="button"
                  onClick={() => executeResearchWithProfile(profile)}
                  disabled={isStreaming}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#0061FE] hover:bg-[#0050D8] text-white flex items-center space-x-1.5 shadow-dropbox-blue transition-colors disabled:opacity-50"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>1-Click Auto-Match</span>
                </button>
              </div>
            </div>
          )}

          {/* Quick Sample Resume Pickers for Evaluators */}
          <div className="flex items-center space-x-2 pt-0.5 overflow-x-auto text-xs">
            <span className="text-[11px] text-zinc-500 font-mono uppercase whitespace-nowrap">Load Sample CV:</span>
            <button
              type="button"
              onClick={() => handleLoadSampleResume('/sample_resume_arjun_sharma.pdf', 'Arjun_Sharma_Resume.pdf')}
              disabled={isUploading || isStreaming}
              className="px-2.5 py-1 rounded text-[11px] font-medium whitespace-nowrap bg-[#242424] hover:bg-[#2A2A2A] text-zinc-300 hover:text-white border border-[#2E2E2E] transition-colors flex items-center space-x-1"
            >
              <Cpu className="w-3 h-3 text-[#0061FE]" />
              <span>Arjun Sharma (AI Agents / 3rd Yr)</span>
            </button>
            <button
              type="button"
              onClick={() => handleLoadSampleResume('/sample_resume_priya_nair.pdf', 'Priya_Nair_Resume.pdf')}
              disabled={isUploading || isStreaming}
              className="px-2.5 py-1 rounded text-[11px] font-medium whitespace-nowrap bg-[#242424] hover:bg-[#2A2A2A] text-zinc-300 hover:text-white border border-[#2E2E2E] transition-colors flex items-center space-x-1"
            >
              <FileText className="w-3 h-3 text-[#10B981]" />
              <span>Priya Nair (Cloud / GSoC)</span>
            </button>
          </div>

          {/* Upload Error Alert */}
          {uploadError && (
            <div className="flex items-center space-x-2 p-3 rounded-lg bg-[#2B1818] border border-[#EF4444]/40 text-xs text-[#EF4444]">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{uploadError}</span>
            </div>
          )}
        </div>
      )}

      {/* Mode B: Presets Selector */}
      {inputMode === 'presets' && (
        <div className="space-y-2">
          <div className="text-xs text-zinc-400">Select a pre-configured student profile:</div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {PRESETS.map((preset, idx) => (
              <button
                key={preset.label}
                type="button"
                onClick={() => handlePresetSelect(idx)}
                className={`p-2.5 rounded-lg text-left transition-all border ${
                  selectedPreset === idx
                    ? 'bg-[#0061FE]/15 border-[#0061FE] text-white shadow-sm ring-1 ring-[#0061FE]'
                    : 'bg-[#181818] text-zinc-400 hover:text-zinc-200 border-[#2E2E2E] hover:border-[#3E3E3E]'
                }`}
              >
                <div className="text-xs font-semibold truncate text-zinc-100">{preset.name}</div>
                <div className="text-[11px] text-zinc-400 truncate mt-0.5">{preset.label}</div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Detailed Form (Pre-populated from PDF or Preset) */}
      <form onSubmit={handleSubmit} className="space-y-4 pt-1 border-t border-[#2A2A2A]">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Student Name */}
          <div>
            <label className="block text-xs font-medium text-zinc-300 mb-1 flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-zinc-400" />
              <span>Candidate Name</span>
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
              <span>Technical Skills (Extracted / Comma-separated)</span>
            </span>
            <span className="text-[11px] text-zinc-500 font-mono">Matched deterministically</span>
          </label>
          <input
            type="text"
            required
            value={profile.skills}
            onChange={(e) => handleChange('skills', e.target.value)}
            placeholder="e.g. Python, FastAPI, React, SQL, PyTorch, Docker"
            className="w-full bg-[#181818] border border-[#2E2E2E] rounded-lg px-3 py-2 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-[#0061FE] focus:ring-1 focus:ring-[#0061FE] transition-colors font-mono"
          />
        </div>

        {/* Focus Area / Interests */}
        <div>
          <label className="block text-xs font-medium text-zinc-300 mb-1 flex items-center gap-1.5">
            <Heart className="w-3.5 h-3.5 text-zinc-400" />
            <span>Target Domains & Focus Areas</span>
          </label>
          <input
            type="text"
            required
            value={profile.interests}
            onChange={(e) => handleChange('interests', e.target.value)}
            placeholder="e.g. AI Agents, Web Automation, Hackathons, Fellowships, Grants"
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
              <span>Category Focus</span>
            </label>
            <select
              value={profile.opportunity_type}
              onChange={(e) => handleChange('opportunity_type', e.target.value)}
              className="w-full bg-[#181818] border border-[#2E2E2E] rounded-lg px-3 py-2 text-xs text-zinc-100 focus:outline-none focus:border-[#0061FE] focus:ring-1 focus:ring-[#0061FE] transition-colors"
            >
              <option value="Both">All (Hackathons, Fellowships, Grants, Jobs)</option>
              <option value="Competition">Competitions & Hackathons</option>
              <option value="Internship">Internships, Fellowships & Jobs</option>
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
                <span>TinyFish Crawl & Eligibility Audit In Progress...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 text-white" />
                <span>Dispatch TinyFish Opportunity Engine</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
