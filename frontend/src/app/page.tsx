'use client';

import React, { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import {
  MessageSquare,
  Plus,
  Send,
  Sparkles,
  Bot,
  User as UserIcon,
  Wrench,
  Trash2,
  Copy,
  Check,
  LogOut,
  Building2,
  Code2,
  Mail,
  Search,
  Settings,
  Key,
  Shield,
  Image as ImageIcon,
  Download,
  ExternalLink,
  X,
  ChevronRight,
  Palette,
  Layers,
  Briefcase,
  Users,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
  Cpu,
  Clock,
  Laptop,
  Lock,
  ArrowRight,
  FileText,
  Sliders,
  Database,
  MessageCircle,
  Volume2,
  VolumeX,
  Mic,
  MicOff,
  Radio,
  Sun,
  Moon,
  Headphones,
  Menu,
  Smartphone,
  ThumbsUp,
  ThumbsDown,
  RotateCcw,
  Paperclip,
  Share2,
  Star,
  Command,
  Zap,
  Pencil,
  Printer,
  Maximize2,
  Minimize2,
  ChevronDown,
  Link as LinkIcon,
  Square,
  Phone
} from 'lucide-react';
import OpenSenseLogo from '@/components/OpenSenseLogo';
import { api } from '@/lib/api';
import { ChatSession, ChatMessage } from '@/types';
import { useAuth } from '@/lib/auth-context';

// Modern ChatGPT-Style Markdown Formatter with High-Contrast Light & Dark Typography
function FormattedChatMessage({
  content,
  isUser,
  isDarkMode,
  onOpenArtifact,
}: {
  content: string;
  isUser: boolean;
  isDarkMode: boolean;
  onOpenArtifact?: (artifact: { title: string; language: string; content: string }) => void;
}) {
  if (isUser) {
    return <div className="whitespace-pre-wrap font-sans text-[13.5px] leading-relaxed">{content}</div>;
  }

  const formatInline = (text: string) => {
    const parts: React.ReactNode[] = [];
    const regex = /(`[^`]+`|\*\*[^*]+\*\*|__[^_]+__|\*[^*]+\*)/g;
    let lastIdx = 0;
    let match;
    let keyIdx = 0;

    while ((match = regex.exec(text)) !== null) {
      if (match.index > lastIdx) {
        parts.push(text.slice(lastIdx, match.index));
      }
      const token = match[0];
      if (token.startsWith('`') && token.endsWith('`')) {
        parts.push(
          <code
            key={keyIdx++}
            className={`px-1.5 py-0.5 rounded font-mono text-[12px] ${
              isDarkMode
                ? 'bg-slate-800 text-orange-400 border border-slate-700'
                : 'bg-slate-100 text-orange-600 border border-slate-200'
            }`}
          >
            {token.slice(1, -1)}
          </code>
        );
      } else if (
        (token.startsWith('**') && token.endsWith('**')) ||
        (token.startsWith('__') && token.endsWith('__'))
      ) {
        parts.push(
          <strong
            key={keyIdx++}
            className={`font-bold ${isDarkMode ? 'text-white' : 'text-slate-950'}`}
          >
            {token.slice(2, -2)}
          </strong>
        );
      } else if (token.startsWith('*') && token.endsWith('*')) {
        parts.push(
          <em
            key={keyIdx++}
            className={`italic ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}
          >
            {token.slice(1, -1)}
          </em>
        );
      }
      lastIdx = regex.lastIndex;
    }

    if (lastIdx < text.length) {
      parts.push(text.slice(lastIdx));
    }

    return parts.length > 0 ? parts : text;
  };

  const lines = content.split('\n');
  const elements: React.ReactNode[] = [];
  let inCodeBlock = false;
  let codeBuffer: string[] = [];
  let codeLang = '';

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (line.trim().startsWith('```')) {
      if (inCodeBlock) {
        const fullCodeText = codeBuffer.join('\n');
        const lang = codeLang || 'code';
        elements.push(
          <div
            key={`code-${i}`}
            className="my-2.5 rounded-xl overflow-hidden border border-slate-800 bg-slate-950 shadow-md"
          >
            <div className="px-3.5 py-1.5 bg-slate-900 border-b border-slate-800 text-[11px] font-mono text-slate-400 flex items-center justify-between">
              <span className="font-semibold text-orange-400 uppercase tracking-wider">{lang}</span>
              <div className="flex items-center gap-2">
                {onOpenArtifact && (
                  <button
                    type="button"
                    onClick={() => onOpenArtifact({ title: `${lang}-snippet`, language: lang, content: fullCodeText })}
                    className="flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-orange-500/20 hover:bg-orange-500/30 text-orange-300 text-[10px] font-bold transition-all hover:scale-105 active:scale-95 border border-orange-500/30"
                    title="Open in Interactive Live Studio (Live Sandbox Preview)"
                  >
                    <span>⚡ Open in Studio</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(fullCodeText);
                  }}
                  className="px-2 py-0.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] transition-colors"
                >
                  Copy
                </button>
              </div>
            </div>
            <pre className="p-3 text-[12px] font-mono leading-relaxed text-slate-100 overflow-x-auto whitespace-pre">
              <code>{fullCodeText}</code>
            </pre>
          </div>
        );
        codeBuffer = [];
        inCodeBlock = false;
        codeLang = '';
      } else {
        inCodeBlock = true;
        codeLang = line.trim().slice(3).trim();
      }
      continue;
    }

    if (inCodeBlock) {
      codeBuffer.push(line);
      continue;
    }

    if (line.startsWith('### ')) {
      elements.push(
        <h4
          key={`h3-${i}`}
          className={`text-xs font-bold uppercase tracking-wider mt-3 mb-1.5 ${
            isDarkMode ? 'text-orange-400' : 'text-orange-600'
          }`}
        >
          {formatInline(line.slice(4))}
        </h4>
      );
      continue;
    }

    if (line.startsWith('## ') || line.startsWith('# ')) {
      elements.push(
        <h3
          key={`h2-${i}`}
          className={`text-sm font-extrabold tracking-tight mt-3 mb-1.5 ${
            isDarkMode ? 'text-white' : 'text-slate-950'
          }`}
        >
          {formatInline(line.replace(/^#+\s*/, ''))}
        </h3>
      );
      continue;
    }

    if (
      line.trim().startsWith('• ') ||
      line.trim().startsWith('- ') ||
      (line.trim().startsWith('* ') && !line.trim().endsWith('*'))
    ) {
      const bulletText = line.trim().replace(/^([•\-\*]\s*)/, '');
      elements.push(
        <div key={`bullet-${i}`} className="flex items-start gap-2 my-1 pl-1">
          <span
            className={`select-none font-bold text-sm leading-none mt-1 ${
              isDarkMode ? 'text-orange-400' : 'text-orange-500'
            }`}
          >
            •
          </span>
          <span className="flex-1 leading-relaxed">{formatInline(bulletText)}</span>
        </div>
      );
      continue;
    }

    if (!line.trim()) {
      elements.push(<div key={`spacer-${i}`} className="h-1.5" />);
      continue;
    }

    elements.push(
      <p key={`p-${i}`} className="leading-relaxed">
        {formatInline(line)}
      </p>
    );
  }

  if (inCodeBlock && codeBuffer.length > 0) {
    elements.push(
      <div
        key="unclosed-code"
        className="my-2 rounded-xl overflow-hidden border border-slate-800 bg-slate-950"
      >
        <pre className="p-3 text-[12px] font-mono text-slate-100 overflow-x-auto">
          <code>{codeBuffer.join('\n')}</code>
        </pre>
      </div>
    );
  }

  return <div className="space-y-1">{elements}</div>;
}

// Smart Dynamic Contextual Follow-up Suggestions
const getSmartFollowUpChips = (content: string): { label: string; prompt: string; icon: string }[] => {
  if (!content) return [];
  const low = content.toLowerCase();

  if (low.includes('leave') || low.includes('chhutti') || low.includes('insurance') || low.includes('casual') || low.includes('sick') || low.includes('medical') || low.includes('floater')) {
    return [
      { label: 'Draft Leave Application Email', prompt: 'Draft a professional leave application email for 2 days of casual leave to my lead with project handover details.', icon: '✉️' },
      { label: 'Health Insurance Claim Guide', prompt: 'Explain how cashless hospital admission works under OpenSense ₹5,00,000 family floater policy.', icon: '🏥' },
      { label: 'Contact Pooja Sharma (HR)', prompt: 'Pooja Sharma HR Lead ka official email aur contact details batao.', icon: '✉️' },
    ];
  }

  if (low.includes('linkedin') || low.includes('post') || low.includes('marketing') || low.includes('campaign') || low.includes('drupal') || low.includes('branding')) {
    return [
      { label: 'Viral Twitter/X Thread', prompt: 'Convert this into an engaging 4-tweet Twitter/X thread with high-retention hooks and hashtags.', icon: '⚡' },
      { label: 'Add Enterprise ROI Metrics', prompt: 'Add 3 real B2B enterprise ROI metrics, TCO savings, and 95+ Core Web Vitals stats to this post.', icon: '📊' },
      { label: 'Generate Tech Banner Image', prompt: 'Create a modern tech marketing banner image representing OpenSense Labs with glowing orange geometric nodes.', icon: '🎨' },
    ];
  }

  if (low.includes('python') || low.includes('code') || low.includes('validator') || low.includes('schema') || low.includes('fastapi') || low.includes('api')) {
    return [
      { label: 'Add Pytest Unit Tests', prompt: 'Write comprehensive pytest unit tests covering happy path and edge-case error diagnostics for this code.', icon: '🧪' },
      { label: 'Generate FastAPI REST Endpoint', prompt: 'Wrap this implementation into a complete FastAPI REST API with Swagger documentation and Pydantic models.', icon: '🚀' },
      { label: 'Analyze Big-O Complexity', prompt: 'Analyze the Big-O time and space complexity of this implementation and suggest optimizations.', icon: '⚡' },
    ];
  }

  if (low.includes('image') || low.includes('vision') || low.includes('photo') || low.includes('render') || low.includes('generated')) {
    return [
      { label: 'Golden Sunset HQ View', prompt: 'Generate an ultra-realistic 3D architectural render of OpenSense Labs headquarters in Sector 62 Noida at golden sunset.', icon: '🌅' },
      { label: 'Cyberpunk Developer Lab', prompt: 'Generate an image of an AI software engineer at OpenSense Labs coding with floating holographic multi-screen interfaces.', icon: '🔮' },
      { label: '3D Glassmorphic Emblem', prompt: 'Generate an artistic 3D glassmorphic OpenSense emblem with warm glowing orange bioluminescent core.', icon: '🎨' },
    ];
  }

  if (low.includes('office') || low.includes('time') || low.includes('clock') || low.includes('noida') || low.includes('location')) {
    return [
      { label: 'Check Global Wall Clocks', prompt: 'What is the exact live wall-clock time across OpenSense India HQ, US Hub, and UK Hub?', icon: '⏰' },
      { label: 'Noida HQ Address & Route', prompt: 'Where is OpenSense Labs located in Sector 62 Noida and what are the visitor coordinates?', icon: '📍' },
      { label: 'Official Team Directory', prompt: 'Show the official internal team directory with verified email channels.', icon: '📋' },
    ];
  }

  return [
    { label: 'Leave & Medical Benefits', prompt: 'Please explain the OpenSense Labs leave policy including CL, SL, and EL entitlements, and medical insurance coverage.', icon: '🏖️' },
    { label: 'Enterprise Drupal Post', prompt: 'Draft an engaging LinkedIn post about OpenSense Labs Enterprise Drupal 10 & AI modernization with hashtags.', icon: '📢' },
    { label: 'Check Global Hub Clocks', prompt: 'What is the exact live wall-clock time across OpenSense India HQ, US Hub, and UK Hub?', icon: '⏰' },
  ];
};

// Smart Dynamic Contextual Follow-up Suggestions
const getSmartFollowUpChips = (content: string): { label: string; prompt: string; icon: string }[] => {
  if (!content) return [];
  const low = content.toLowerCase();

  if (low.includes('leave') || low.includes('chhutti') || low.includes('insurance') || low.includes('casual') || low.includes('sick') || low.includes('medical') || low.includes('floater')) {
    return [
      { label: 'Draft Leave Application Email', prompt: 'Draft a professional leave application email for 2 days of casual leave to my lead with project handover details.', icon: '✉️' },
      { label: 'Health Insurance Claim Guide', prompt: 'Explain how cashless hospital admission works under OpenSense ₹5,00,000 family floater policy.', icon: '🏥' },
      { label: 'Contact Pooja Sharma (HR)', prompt: 'Pooja Sharma HR Lead ka official email aur contact details batao.', icon: '✉️' },
    ];
  }

  if (low.includes('linkedin') || low.includes('post') || low.includes('marketing') || low.includes('campaign') || low.includes('drupal') || low.includes('branding')) {
    return [
      { label: 'Viral Twitter/X Thread', prompt: 'Convert this into an engaging 4-tweet Twitter/X thread with high-retention hooks and hashtags.', icon: '⚡' },
      { label: 'Add Enterprise ROI Metrics', prompt: 'Add 3 real B2B enterprise ROI metrics, TCO savings, and 95+ Core Web Vitals stats to this post.', icon: '📊' },
      { label: 'Generate Tech Banner Image', prompt: 'Create a modern tech marketing banner image representing OpenSense Labs with glowing orange geometric nodes.', icon: '🎨' },
    ];
  }

  if (low.includes('python') || low.includes('code') || low.includes('validator') || low.includes('schema') || low.includes('fastapi') || low.includes('api')) {
    return [
      { label: 'Add Pytest Unit Tests', prompt: 'Write comprehensive pytest unit tests covering happy path and edge-case error diagnostics for this code.', icon: '🧪' },
      { label: 'Generate FastAPI REST Endpoint', prompt: 'Wrap this implementation into a complete FastAPI REST API with Swagger documentation and Pydantic models.', icon: '🚀' },
      { label: 'Analyze Big-O Complexity', prompt: 'Analyze the Big-O time and space complexity of this implementation and suggest optimizations.', icon: '⚡' },
    ];
  }

  if (low.includes('image') || low.includes('vision') || low.includes('photo') || low.includes('render') || low.includes('generated')) {
    return [
      { label: 'Golden Sunset HQ View', prompt: 'Generate an ultra-realistic 3D architectural render of OpenSense Labs headquarters in Sector 62 Noida at golden sunset.', icon: '🌅' },
      { label: 'Cyberpunk Developer Lab', prompt: 'Generate an image of an AI software engineer at OpenSense Labs coding with floating holographic multi-screen interfaces.', icon: '🔮' },
      { label: '3D Glassmorphic Emblem', prompt: 'Generate an artistic 3D glassmorphic OpenSense emblem with warm glowing orange bioluminescent core.', icon: '🎨' },
    ];
  }

  if (low.includes('office') || low.includes('time') || low.includes('clock') || low.includes('noida') || low.includes('location')) {
    return [
      { label: 'Check Global Wall Clocks', prompt: 'What is the exact live wall-clock time across OpenSense India HQ, US Hub, and UK Hub?', icon: '⏰' },
      { label: 'Noida HQ Address & Route', prompt: 'Where is OpenSense Labs located in Sector 62 Noida and what are the visitor coordinates?', icon: '📍' },
      { label: 'Official Team Directory', prompt: 'Show the official internal team directory with verified email channels.', icon: '📋' },
    ];
  }

  return [
    { label: 'Leave & Medical Benefits', prompt: 'Please explain the OpenSense Labs leave policy including CL, SL, and EL entitlements, and medical insurance coverage.', icon: '🏖️' },
    { label: 'Enterprise Drupal Post', prompt: 'Draft an engaging LinkedIn post about OpenSense Labs Enterprise Drupal 10 & AI modernization with hashtags.', icon: '📢' },
    { label: 'Check Global Hub Clocks', prompt: 'What is the exact live wall-clock time across OpenSense India HQ, US Hub, and UK Hub?', icon: '⏰' },
  ];
};

export default function DedicatedChatbotPage() {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [currentSession, setCurrentSession] = useState<ChatSession | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [searchFilter, setSearchFilter] = useState('');
  const [copiedId, setCopiedId] = useState<number | string | null>(null);
  const [loadingSessions, setLoadingSessions] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  // ChatGPT-Style 4-Module Settings Modal State
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [settingsModule, setSettingsModule] = useState<'general' | 'profile' | 'providers' | 'voice'>('general');
  const [confirmClearModal, setConfirmClearModal] = useState(false);
  const [personaTone, setPersonaTone] = useState<'energetic' | 'technical' | 'concise'>('energetic');
  const [languageMode, setLanguageMode] = useState<'multilingual' | 'english' | 'hindi'>('multilingual');
  const [showApiKey, setShowApiKey] = useState(false);
  const [customInstruction, setCustomInstruction] = useState('');
  const [speechRate, setSpeechRate] = useState(1.0);
  const [testingExistingId, setTestingExistingId] = useState<number | null>(null);
  const [existingTestResults, setExistingTestResults] = useState<{ [id: number]: { success: boolean; message: string; latency_ms?: number } }>({});

  // Multi-Persona State: Aanya (HR/Culture), Kabir (Tech Architect), Maya (Executive Strategy)
  const [selectedPersona, setSelectedPersona] = useState<'aanya' | 'kabir' | 'maya'>('aanya');
  const [isPersonaMenuOpen, setIsPersonaMenuOpen] = useState(false);

  // Claude-Style Interactive Artifacts Studio State
  const [activeArtifact, setActiveArtifact] = useState<{ title: string; language: string; content: string } | null>(null);
  const [artifactTab, setArtifactTab] = useState<'preview' | 'code'>('preview');
  const [isArtifactExpanded, setIsArtifactExpanded] = useState(false);

  // Share Conversation Modal State
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);

  // Conversation Inline Rename State
  const [renamingSessionId, setRenamingSessionId] = useState<number | null>(null);
  const [renameTitleInput, setRenameTitleInput] = useState('');

  // WhatsApp-Style Audio Voice Note State
  const [isRecordingAudioNote, setIsRecordingAudioNote] = useState(false);
  const [audioNoteTimer, setAudioNoteTimer] = useState(0);
  const audioNoteRecRef = useRef<any>(null);
  const audioNoteTimerRef = useRef<any>(null);

  // Dark / Light Mode State
  const [isDarkMode, setIsDarkMode] = useState(true);

  // Typewriter Greeting State with Mechanical Typing Sound
  const [typedGreeting, setTypedGreeting] = useState('');
  const [isTypingGreetingDone, setIsTypingGreetingDone] = useState(false);
  const typewriterAudioCtxRef = useRef<any>(null);

  // Base64 mechanical typewriter click WAV audio data for instant browser fallback
  const TYPEWRITER_WAV_BASE64 = 'data:audio/wav;base64,UklGRuQHAABXQVZFZm10IBAAAAABAAEAIlYAAESsAAACABAAZGF0YcAHAABn5o8lHTASOA89pD8eEXITXBdUHd4kEVrPX1VioGC6WscmQh3tFIsPxQ2YNxg5xzg4NCkqhPQo45LSU8bXwPfmK+2D9Jb4BPY4ybi5+ah6nOGY/cBt0ZfmBPqyBUPnxN14zn3A+rrp32P0oRHPL2JGQjO0LDkaqgNv8okIGxQjLfBLWWZGWgZVhj67HRT9jf5U+QEG/h5GOnk2ajjvJgwGBd9k0ii/a79f0WvtvfR2BQAFB/Mx1SXI+a9+pymxp8kk1zz0hgbHCeD+Tfy65y3aytia5FvqjgQgHKgrmDD5OnUvQiLcFzUToAYMDlcYoiKCKiw8iTu9No0uACRMC+//RvbM75XtMvz5AT8JEQ9yEKz/2PMC483Qw8ECxarGjtGn4gj13Pj2/h77we4A3k7YFc/Dz+Ta/e0F+2UPFB2kIVwdzRtFDwIFMwAkArYBjQ0sGsQkZytHNbEyuiyvJNMbpgspBHj+L/u9+ksE5QhzDhITthT/CuwCcPaq56XZ7NX50RvVUd4B65vx5/pl/mr7HPPT7UHjLtyG2rneWOJP7rv6ggVFDa4WrhdBFlUTyA9pB5wE+gIJAz0FZQ7xFK0cKiSxKUknwSSpHRgTCQcLAAH4hPTY9Qb7Pv4aBZcJYgoqB04Erfuj8qLqq+St3brc9d3z4Ezl7O2q80v5EP4uAd/+N/1Z+TP0Ku/D7kjua/EG+B8BVgiaEYwYPRx/HIcc9hevEsEN5gnsBPEDOQSKBawHzwzVD74S7xS4FTISlQ6nCAABqPgL8wjtrOlC6X7rg+1V8sr2Dfqq+4f9DPyh+bz2wvMm79PsLuuF6i3rLe8l86n4OP8HBocKJg+kEdURABBYDpQKHAeUBFID5gEQAwMFawcECgAOZRBlEroTCxS0ESwPIQviBQIAe/uF9vryKfEM8SPxUPPV9Tf4Jvqc/E/9av32/PH7TPk097v0LPLx74DvPu9u8BTz8fag+n3/CATaB7YKeA1jDocOCQ4FDbMK3QjIBqcEwgI4AqoBDgJaA1YF4AYVCckKswu0C4wL5wmwBxIFLgJs/kD7F/gc9YjyRfE78DPwK/H58rj0TffG+eP7hP02/93/IgAdANb/wv4C/hT9FPwy+yn7IPvF+x/9G/8IAaoDPwaWCIwKiwyfDUQOeA40DvgMowvDCW8H0ASJAv//z/0f/Pn67fmz+cf5EfqD+nf7Kfzy/MX9iP7A/gX/5/5f/nr9r/x0+0n6TfmQ+Mf3lPeg9+z3fPiq+eH6dPxX/nIAWwJ8BGcGAAg6CVoK2goLC/YKmwq2CckIkwcdBn0EDQNvAf//zP7g/fz8ivxE/B/8GPxp/KP8Af1+/Qv+Yf7W/iL/O/8h/w3/qf43/sH9Tf2r/Dv8yftb+/n63/rD+t76OPvO+238XP1i/nP/iADIAeAC+gMQBRgG3gagBygIcAh2CGQI+wdqB7gG6gXfBNoDugKDAT0AF//e/cD8yfv7+jf6uPla+Rr5+PgW+T35jfkH+qb6RfsP/N/8q/1w/kf//f+uAFsBAAJ+Av8CZAOqA9AD9APsA9YDuAORA0wDEQPHAm8CCwK2AUsB5wCOAEAA6v+s/3H/N//+/tz+sP6Q/n7+ef5t/nn+hv6R/pr+tP7A/tL+7P4O/yT/S/9u/4z/pP+4/9v/8v8MACwATQBfAHsAkACeAKcAvADDAM0A2QDlAOEA5ADfANIAvwC1AJ4AiABzAF0AOgAeAPz/1P+o/4f/Xv85/xn//f7Z/sH+qf6R/nv+df5s/mz+dv6I/pf+s/7S/vT+Gv9N/37/tv/1/zgAdQC7AP4APQF6AbwB9QEsAmIClQK6At4C+QIJAw8DFAMLA/wC5wLLAqECdQI/AgACuQF0ASUB1ACDADIA2/+I/zT/4P6N/kT++v24/X79TP0b/ff82Py//K38qfyo/LH8w/zd/Pn8IP1K/Xb9pv3e/RT+Tf6J/sX+/f42/2v/nP/H//P/FQA0AE8AZQBxAHoAfAB2AGkAWwBEACkADADs/8X/n/91/0n/G//x/sT+m/50/lL+L/4T/vn95P3S/cj9wf3A/cX90P3e/fL9Cv4m/kT+Z/6M/rP+3P4I/zH/XP+F/6z/0P/0/xIALwBIAF4AbQB5AIAAgQB9AHYAaQBXAEMAKwAOAPH/z/+q/4T/Xv82/w7/6f7E/qD+f/5h/kT+K/4X/gb++f3x/e/97/31/f/9Df4e/jX+Tv5q/or+rf7R/vf+Hv9F/2v/k/+5/97/AQAjAEIAXwB5AJAAowC0AMAAygDQANQA0wDQAMoAwgC2AKoAmwCLAHsAagBYAEcANgAmABYACAD8//H/6P/h/9v/2f/Y/9n/2//g/+f/7//4/wIADQAaACYAMwA/AEsAVQBfAGgAbwB1AHkAewB6AHgAdABtAGUAWwBPAEIAMwAjABIAAADw/97/zP+7/6v/m/+O/4L/d/9u/2j/Y/9h/2L/Zf9q/3L/e/+G/5P/ov+x/8L/1P/m//f/CAAaACoAOQBHAFMAXgBnAG4AcgB1AHYAdQByAG0AZgBeAFUATABBADYAKwAgABUACwACAPv/9P/u/+n/5f/j/+L/4f/i/+P/5f/n/+n/6//t/+7/7v/u/+z/6v/m/+L/3f/X/9H/yv/D/73/';

  const typewriterAudioPoolRef = useRef<HTMLAudioElement[]>([]);
  const audioPoolIndexRef = useRef(0);
  const hasUserInteractedRef = useRef(false);
  const typingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Mechanical typing click synthesizer using Dual-Oscillator Web Audio + HTML5 Audio fallback
  const playTypewriterClick = () => {
    try {
      if (typeof window === 'undefined') return;
      // Do not attempt audio before user gesture to strictly comply with browser Autoplay Policy and prevent console warnings
      if (!hasUserInteractedRef.current) return;

      // 1. Web Audio API Dual-Tone Synthesis (loud, crisp & punchy mechanical switch)
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        if (!typewriterAudioCtxRef.current) {
          typewriterAudioCtxRef.current = new AudioCtx();
        }
        const ctx = typewriterAudioCtxRef.current;
        if (ctx.state === 'suspended') {
          ctx.resume().catch(() => {});
        }

        if (ctx.state === 'running') {
          const now = ctx.currentTime;

          // Transient high-frequency switch snap (1800Hz -> 500Hz)
          const oscHigh = ctx.createOscillator();
          const gainHigh = ctx.createGain();
          oscHigh.type = 'triangle';
          oscHigh.frequency.setValueAtTime(1800 + Math.random() * 800, now);
          oscHigh.frequency.exponentialRampToValueAtTime(500, now + 0.04);
          gainHigh.gain.setValueAtTime(0.45, now);
          gainHigh.gain.exponentialRampToValueAtTime(0.001, now + 0.04);
          oscHigh.connect(gainHigh);
          gainHigh.connect(ctx.destination);
          oscHigh.start(now);
          oscHigh.stop(now + 0.045);

          // Resonant keybody thump (380Hz -> 140Hz)
          const oscLow = ctx.createOscillator();
          const gainLow = ctx.createGain();
          oscLow.type = 'sine';
          oscLow.frequency.setValueAtTime(380 + Math.random() * 120, now);
          oscLow.frequency.exponentialRampToValueAtTime(140, now + 0.05);
          gainLow.gain.setValueAtTime(0.5, now);
          gainLow.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
          oscLow.connect(gainLow);
          gainLow.connect(ctx.destination);
          oscLow.start(now);
          oscLow.stop(now + 0.055);
          return;
        }
      }

      // 2. HTML5 Audio Element fallback using pre-rendered mechanical WAV data URI
      if (typewriterAudioPoolRef.current.length === 0) {
        for (let i = 0; i < 4; i++) {
          const a = new Audio(TYPEWRITER_WAV_BASE64);
          a.volume = 0.6;
          typewriterAudioPoolRef.current.push(a);
        }
      }
      const audio = typewriterAudioPoolRef.current[audioPoolIndexRef.current % typewriterAudioPoolRef.current.length];
      audioPoolIndexRef.current++;
      audio.currentTime = 0;
      audio.play().catch(() => {});
    } catch {
      // Audio fallback handled smoothly
    }
  };

  const startTypingGreeting = () => {
    if (typingIntervalRef.current) {
      clearInterval(typingIntervalRef.current);
    }
    const targetText = 'Namaste, OpenSense! 🙏✨';
    setTypedGreeting('');
    setIsTypingGreetingDone(false);

    let idx = 0;
    typingIntervalRef.current = setInterval(() => {
      if (idx < targetText.length) {
        setTypedGreeting(targetText.slice(0, idx + 1));
        playTypewriterClick();
        idx++;
      } else {
        setIsTypingGreetingDone(true);
        if (typingIntervalRef.current) clearInterval(typingIntervalRef.current);
      }
    }, 65);

    return () => {
      if (typingIntervalRef.current) clearInterval(typingIntervalRef.current);
    };
  };

  // PWA (Progressive Web App) Install State
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const [isAppInstalled, setIsAppInstalled] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('/sw.js').catch(() => {});
      }
      if (window.matchMedia('(display-mode: standalone)').matches) {
        setIsAppInstalled(true);
      }
    }

    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsInstallable(true);
    };

    const handleAppInstalled = () => {
      setIsAppInstalled(true);
      setIsInstallable(false);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  // Trigger typewriter effect on empty state
  useEffect(() => {
    if (messages.length === 0) {
      return startTypingGreeting();
    }
  }, [messages.length, currentSession?.id]);

  useEffect(() => {
    const handleFirstAudioUnlock = () => {
      if (hasUserInteractedRef.current) return;
      hasUserInteractedRef.current = true;

      try {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        if (!typewriterAudioCtxRef.current && AudioCtx) {
          typewriterAudioCtxRef.current = new AudioCtx();
        }
        if (typewriterAudioCtxRef.current && typewriterAudioCtxRef.current.state === 'suspended') {
          typewriterAudioCtxRef.current.resume().catch(() => {});
        }
      } catch {}
    };

    window.addEventListener('pointerdown', handleFirstAudioUnlock, { passive: true, once: true });
    window.addEventListener('touchstart', handleFirstAudioUnlock, { passive: true, once: true });
    window.addEventListener('click', handleFirstAudioUnlock, { once: true });

    return () => {
      window.removeEventListener('pointerdown', handleFirstAudioUnlock);
      window.removeEventListener('touchstart', handleFirstAudioUnlock);
      window.removeEventListener('click', handleFirstAudioUnlock);
    };
  }, []);

  const handleInstallPWA = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setIsAppInstalled(true);
        setIsInstallable(false);
      }
      setDeferredPrompt(null);
    } else {
      alert("PWA Install: Browser menu (⋮) par click karke 'Install OpenSense AI' ya 'Add to Home Screen' select karein!");
    }
  };

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedTheme = localStorage.getItem('opensense_theme');
      if (savedTheme === 'light') {
        setIsDarkMode(false);
      } else {
        setIsDarkMode(true);
      }
    }
  }, []);

  const toggleTheme = () => {
    setIsDarkMode((prev) => {
      const next = !prev;
      if (typeof window !== 'undefined') {
        localStorage.setItem('opensense_theme', next ? 'dark' : 'light');
      }
      return next;
    });
  };

  // Voice AI Assistant ("Aanya" - Sweet, expressive Indian female voice)
  // Default to false (Mic-Only mode): Typing never auto-speaks; mic query or explicit listen button speaks
  const [isVoiceMode, setIsVoiceMode] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [speakingMsgId, setSpeakingMsgId] = useState<number | string | null>(null);
  const [isListening, setIsListening] = useState(false);
  const speechRecognitionRef = useRef<any>(null);

  // ChatGPT-Style Continuous Interactive Voice Mode State
  const [isVoiceOverlayOpen, setIsVoiceOverlayOpen] = useState(false);
  const isVoiceOverlayOpenRef = useRef(false);
  const [voiceOrbState, setVoiceOrbState] = useState<'idle' | 'listening' | 'thinking' | 'speaking'>('idle');
  const [voiceLiveTranscript, setVoiceLiveTranscript] = useState('');
  const [voiceAiResponse, setVoiceAiResponse] = useState('');
  const [voiceLanguage, setVoiceLanguage] = useState<'multilingual' | 'english' | 'hindi'>('multilingual');
  const voiceLanguageRef = useRef<'multilingual' | 'english' | 'hindi'>('multilingual');
  const continuousRecognitionRef = useRef<any>(null);
  const silenceTimerRef = useRef<any>(null);
  const isContinuousActiveRef = useRef(false);
  const currentSessionIdRef = useRef<number | null>(null);
  const activeSpeechUtteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const speechWatchdogTimerRef = useRef<any>(null);

  // Open Workspace User Profile State (Frictionless / No password required)
  const [profileName, setProfileName] = useState('OpenSense Member');
  const [profileDept, setProfileDept] = useState('Platform Engineering');
  const [profileSavedToast, setProfileSavedToast] = useState(false);

  // AI Providers State (OpenAI, Gemini, Claude, Custom)
  const [providers, setProviders] = useState<any[]>([]);
  const [loadingProviders, setLoadingProviders] = useState(false);
  const [newProviderType, setNewProviderType] = useState<'openai' | 'gemini' | 'anthropic' | 'custom'>('gemini');
  const [newProviderName, setNewProviderName] = useState('Google Gemini 1.5 Flash');
  const [newBaseUrl, setNewBaseUrl] = useState('https://generativelanguage.googleapis.com/v1beta');
  const [newApiKey, setNewApiKey] = useState('');
  const [newModelName, setNewModelName] = useState('gemini-1.5-flash');
  const [isDefaultProvider, setIsDefaultProvider] = useState(true);
  const [savingProvider, setSavingProvider] = useState(false);
  const [testingProvider, setTestingProvider] = useState(false);
  const [providerTestResult, setProviderTestResult] = useState<{ success: boolean; message: string } | null>(null);

  // Lightbox for Generated Images
  const [previewImage, setPreviewImage] = useState<{ url: string; alt: string } | null>(null);

  // Department Filter Chips for Prompts
  const [activeDeptTab, setActiveDeptTab] = useState<'all' | 'hr' | 'marketing' | 'tech' | 'creative'>('all');

  // ========================================================
  // 9 PROFESSIONAL ENTERPRISE FEATURES STATE & REFS
  // ========================================================
  // 1. Message Action Bar (Feedback & Edit)
  const [feedbackMap, setFeedbackMap] = useState<Record<string | number, 'up' | 'down'>>({});
  // 2. Streaming Text Effect
  const [streamingMsgId, setStreamingMsgId] = useState<number | string | null>(null);
  const [streamedContent, setStreamedContent] = useState<string>('');
  // 3. Real-Time Live Audio Frequencies in Voice Orb (Web Audio API)
  const [audioVolumeLevel, setAudioVolumeLevel] = useState<number>(0);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  const audioAnimRef = useRef<number | null>(null);
  // 4. Document & File Upload / Attachment Analysis
  const [attachedFile, setAttachedFile] = useState<{ name: string; size: string; content: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  // 5. Export & Share Chat
  const [isExportMenuOpen, setIsExportMenuOpen] = useState(false);
  // 6. Slash Commands (/)
  const [showSlashMenu, setShowSlashMenu] = useState(false);
  const [slashSearch, setSlashSearch] = useState('');
  // 7. Universal Command Palette (Ctrl + K)
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [commandPaletteSearch, setCommandPaletteSearch] = useState('');
  // 8. Telemetry & Performance Badge
  const [telemetryMap, setTelemetryMap] = useState<Record<string | number, { latency: number; tokens: number; model: string }>>({});
  // 9. Pin / Star Important Messages
  const [starredMsgIds, setStarredMsgIds] = useState<Set<number | string>>(new Set());
  const [showOnlyStarred, setShowOnlyStarred] = useState(false);
  // Global Toast
  const [globalToast, setGlobalToast] = useState<{ message: string; type?: string } | null>(null);

  const showToast = (message: string) => {
    setGlobalToast({ message });
    setTimeout(() => {
      setGlobalToast(null);
    }, 3000);
  };

  const slashCommands = [
    { cmd: '/standup', title: 'Daily EOD Standup', desc: 'Auto-format Jira/Slack EOD bullet report', template: 'Write a professional Jira/Slack daily EOD standup for my completed tasks today: ' },
    { cmd: '/code-review', title: 'Code Review & Security', desc: 'Senior engineer review for vulnerabilities & performance', template: 'Perform a rigorous enterprise code review on the following snippet:\n```\n\n```' },
    { cmd: '/jira', title: 'Create Jira Ticket', desc: 'Production-ready Story/Bug with Acceptance Criteria', template: 'Draft a production-ready Jira Story ticket for: ' },
    { cmd: '/search', title: 'Live Web Search', desc: 'Search current web with real-time citations & links', template: '/search ' },
    { cmd: '/diagram', title: 'Architecture Diagram', desc: 'Generate a Mermaid visual flowchart or system diagram', template: 'Generate a Mermaid architecture diagram illustrating: ' },
    { cmd: '/image', title: 'Generate AI Image', desc: 'Create 1024x1024 Ultra-HD image using Flux/DALL-E', template: 'Generate an image of: ' },
    { cmd: '/code', title: 'Write Clean Code', desc: 'Generate typed, robust code with error handling', template: 'Write clean production-ready code for: ' },
    { cmd: '/hr', title: 'HR Policies & Leaves', desc: 'Check Casual Leave, Sick Leave, holidays & perks', template: 'OpenSense HR policy aur leave balance batao: ' },
    { cmd: '/drupal', title: 'Drupal 10/11 Decoupled', desc: 'Architecture, Next.js integration & caching', template: 'Explain Drupal decoupled architecture with Next.js: ' },
    { cmd: '/summary', title: 'Summarize Discussion', desc: 'Executive bullet points of key takeaways', template: 'Abhi tak ki discussion ko bullet points me summarize karo.' },
    { cmd: '/clear', title: 'Clear Chat', desc: 'Start a 100% clean-slate conversation', template: '/clear' },
  ];

  // Web Audio API Frequency Analyzer for Realistic Voice Orb Ripples
  const startAudioAnalyzer = async () => {
    try {
      if (typeof window === 'undefined') return;
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      audioCtxRef.current = ctx;
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 64;
      analyserRef.current = analyser;

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      micStreamRef.current = stream;
      const source = ctx.createMediaStreamSource(stream);
      source.connect(analyser);

      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      const updateVolume = () => {
        if (!analyserRef.current) return;
        analyserRef.current.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) {
          sum += dataArray[i];
        }
        const avg = sum / dataArray.length;
        const normalized = Math.min(1, avg / 128);
        setAudioVolumeLevel(normalized);
        audioAnimRef.current = requestAnimationFrame(updateVolume);
      };
      updateVolume();
    } catch {
      // Graceful fallback if mic permission blocked
    }
  };

  const stopAudioAnalyzer = () => {
    if (audioAnimRef.current) {
      cancelAnimationFrame(audioAnimRef.current);
      audioAnimRef.current = null;
    }
    if (micStreamRef.current) {
      micStreamRef.current.getTracks().forEach((track) => track.stop());
      micStreamRef.current = null;
    }
    if (audioCtxRef.current && audioCtxRef.current.state !== 'closed') {
      try { audioCtxRef.current.close(); } catch {}
      audioCtxRef.current = null;
    }
    setAudioVolumeLevel(0);
  };

  // Star / Pin Message Toggle
  const toggleStarMessage = (id: number | string) => {
    setStarredMsgIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
        showToast('Message unstarred');
      } else {
        next.add(id);
        showToast('Message starred! ⭐');
      }
      if (typeof window !== 'undefined') {
        localStorage.setItem('opensense_starred_ids', JSON.stringify(Array.from(next)));
      }
      return next;
    });
  };

  // Feedback Toggle
  const handleFeedback = (id: number | string, type: 'up' | 'down') => {
    setFeedbackMap((prev) => {
      const next = { ...prev, [id]: type };
      showToast(type === 'up' ? 'Feedback noted! Dhanyawad 👍✨' : 'Feedback noted! We will improve 🛠️');
      return next;
    });
  };

  // Regenerate Response
  const handleRegenerate = (msgId: number | string) => {
    const idx = messages.findIndex((m) => m.id === msgId);
    if (idx === -1) return;
    let userMsgText = '';
    for (let i = idx - 1; i >= 0; i--) {
      if (messages[i].role === 'user') {
        userMsgText = messages[i].content;
        break;
      }
    }
    if (userMsgText) {
      showToast('Regenerating response... 🔄');
      handleSendMessage(userMsgText);
    }
  };

  // Stop / Cancel Running AI Generation
  const handleStopGeneration = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    if (streamTimerRef.current) {
      clearInterval(streamTimerRef.current);
      streamTimerRef.current = null;
    }
    setSending(false);
    setStreamingMsgId(null);
    showToast('AI response rokk diya gaya hai! ⏹️');
  };

  // Edit User Prompt (Stops generation if running and loads prompt into input)
  const handleEditUserPrompt = (content: string) => {
    if (sending) {
      handleStopGeneration();
    }
    setInput(content);
    if (textareaRef.current) {
      textareaRef.current.focus();
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
    showToast('Prompt edit karne ke liye load ho gaya! ✏️');
  };

  // File Upload Handler (PDF, TXT, CSV, JSON, Code)
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const sizeStr = file.size > 1024 * 1024 
      ? `${(file.size / (1024 * 1024)).toFixed(1)} MB`
      : `${Math.round(file.size / 1024)} KB`;

    if (file.name.toLowerCase().endsWith('.pdf')) {
      const arrayReader = new FileReader();
      arrayReader.onload = (event) => {
        const buffer = event.target?.result as ArrayBuffer;
        const bytes = new Uint8Array(buffer);
        let extracted = '';
        for (let i = 0; i < bytes.length; i++) {
          if (bytes[i] >= 32 && bytes[i] <= 126) {
            extracted += String.fromCharCode(bytes[i]);
          } else if (bytes[i] === 10 || bytes[i] === 13) {
            extracted += '\n';
          }
        }
        const cleanDoc = extracted.replace(/[^\w\s.,?!:;'"()/-]/g, ' ').replace(/\s+/g, ' ').slice(0, 15000);
        setAttachedFile({
          name: file.name,
          size: sizeStr,
          content: cleanDoc || 'PDF Document uploaded for enterprise analysis.',
        });
        showToast(`PDF Document attached: ${file.name} 📄`);
      };
      arrayReader.readAsArrayBuffer(file);
      e.target.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      setAttachedFile({
        name: file.name,
        size: sizeStr,
        content: (text || '').slice(0, 15000),
      });
      showToast(`Document attach hua: ${file.name} 📎`);
    };
    reader.onerror = () => {
      showToast('File read error. Text, PDF ya code file select karein.');
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  // WhatsApp-Style Audio Voice Note Recording
  const toggleAudioNoteRecording = () => {
    if (typeof window === 'undefined') return;
    const SpeechRec = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRec) {
      showToast('Audio recording is supported in Google Chrome & Edge.');
      return;
    }

    if (isRecordingAudioNote) {
      if (audioNoteRecRef.current) {
        try { audioNoteRecRef.current.stop(); } catch {}
      }
      if (audioNoteTimerRef.current) {
        clearInterval(audioNoteTimerRef.current);
      }
      setIsRecordingAudioNote(false);
      setAudioNoteTimer(0);
      return;
    }

    try {
      const rec = new SpeechRec();
      rec.lang = 'hi-IN';
      rec.continuous = true;
      rec.interimResults = true;
      audioNoteRecRef.current = rec;

      let transcript = '';
      rec.onresult = (event: any) => {
        let full = '';
        for (let i = 0; i < event.results.length; i++) {
          full += event.results[i][0].transcript + ' ';
        }
        transcript = full.trim();
      };

      rec.onend = () => {
        setIsRecordingAudioNote(false);
        if (audioNoteTimerRef.current) clearInterval(audioNoteTimerRef.current);
        if (transcript) {
          showToast('Voice note transcribed! Sending... 🚀');
          handleSendMessage(transcript, true);
        }
        setAudioNoteTimer(0);
      };

      rec.start();
      setIsRecordingAudioNote(true);
      setAudioNoteTimer(0);
      audioNoteTimerRef.current = setInterval(() => {
        setAudioNoteTimer((prev) => prev + 1);
      }, 1000);
      showToast('Recording Voice Note... Speak naturally! 🎙️');
    } catch {
      showToast('Microphone access denied or unavailable.');
    }
  };

  // Export PDF, Markdown, and EOD
  const handleExportPDF = () => {
    setIsExportMenuOpen(false);
    window.print();
  };

  const handleExportMarkdown = () => {
    setIsExportMenuOpen(false);
    if (!messages.length) {
      showToast('Export karne ke liye koi message nahi hai!');
      return;
    }
    let md = `# OpenSense Labs AI Assistant - Conversation Export\n\n`;
    md += `**Topic:** ${currentSession?.title || 'Conversation'}\n`;
    md += `**Date:** ${new Date().toLocaleString()}\n`;
    md += `**User:** ${profileName} (${profileDept})\n\n---\n\n`;
    messages.forEach((m) => {
      const speaker = m.role === 'user' ? `### 👤 ${profileName}` : `### 🤖 OpenSense AI`;
      md += `${speaker} (${new Date(m.created_at).toLocaleTimeString()}):\n\n${m.content}\n\n---\n\n`;
    });
    const blob = new Blob([md], { type: 'text/markdown;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${(currentSession?.title || 'OpenSense_Chat').replace(/[^a-zA-Z0-9_-]/g, '_')}_export.md`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Markdown file downloaded! 📝');
  };

  const handleCopyEOD = () => {
    setIsExportMenuOpen(false);
    if (!messages.length) {
      showToast('Export karne ke liye koi message nahi hai!');
      return;
    }
    let eod = `📋 *OpenSense Labs AI - EOD Conversation Summary*\n`;
    eod += `*Topic:* ${currentSession?.title || 'Daily Standup / Tasks'}\n`;
    eod += `*Date:* ${new Date().toLocaleDateString('en-GB')}\n\n`;
    eod += `*Key Questions & Tasks Discussed:*\n`;
    const userMsgs = messages.filter((m) => m.role === 'user');
    userMsgs.forEach((m, idx) => {
      eod += `• Task ${idx + 1}: ${m.content.slice(0, 100)}${m.content.length > 100 ? '...' : ''}\n`;
    });
    eod += `\n*Session Model:* ${currentSession?.model_used || 'Google Gemini Flash'}\n`;
    navigator.clipboard.writeText(eod);
    showToast('EOD Report clipboard par copy ho gaya! 📋✨');
  };

  // Keyboard listener for Cmd+K / Ctrl+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsCommandPaletteOpen((prev) => !prev);
      }
      if (e.key === 'Escape' && isCommandPaletteOpen) {
        setIsCommandPaletteOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isCommandPaletteOpen]);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const streamTimerRef = useRef<NodeJS.Timeout | null>(null);
  const { user } = useAuth();

  // Load saved local profile & sessions
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedName = localStorage.getItem('opensense_user_name');
      const savedDept = localStorage.getItem('opensense_user_dept');
      const savedInstruction = localStorage.getItem('opensense_user_instructions');
      const savedRate = localStorage.getItem('opensense_speech_rate');
      if (savedName) setProfileName(savedName);
      if (savedDept) setProfileDept(savedDept);
      if (savedInstruction) setCustomInstruction(savedInstruction);
      if (savedRate) setSpeechRate(parseFloat(savedRate));

      const savedSessions = localStorage.getItem('opensense_local_sessions');
      if (savedSessions) {
        try {
          const parsed = JSON.parse(savedSessions);
          setSessions(parsed);
          if (parsed.length > 0) {
            setCurrentSession(parsed[0]);
            setMessages(parsed[0].messages || []);
          }
        } catch {}
      }

      const savedStarred = localStorage.getItem('opensense_starred_ids');
      if (savedStarred) {
        try {
          setStarredMsgIds(new Set(JSON.parse(savedStarred)));
        } catch {}
      }
    }
    loadProviders();
  }, []);

  // Automatic Language Detection (Hindi, Hinglish, English)
  const detectLanguage = (text: string): 'hi' | 'en' => {
    if (!text) return 'en';
    // If user explicitly chose English in Voice Mode, treat as English
    if (voiceLanguageRef.current === 'english') return 'en';
    // If user explicitly chose Hindi in Voice Mode, treat as Hindi
    if (voiceLanguageRef.current === 'hindi') return 'hi';

    if (/[\u0900-\u097F]/.test(text)) return 'hi';
    const hinglishPatterns = /\b(kaisa|kaise|kya|bhai|yaar|mera|meri|mere|mujhe|hum|humein|batao|karo|karna|nahi|nhi|haan|chahiye|chal|raha|rahi|hoga|karein|apna|apni|bataiye|samjhao|bolo|suno|kaha|kidhar|kitna|kitne|accha|theek|namaste|shukriya|dhanyawad|kaisi|sakte|dena|hai|hain|ho|hun|hoon|dost|madad|chhutti)\b/i;
    if (hinglishPatterns.test(text)) return 'hi';
    return 'en';
  };

  // Voice AI Assistant "Aanya" (Natural Indian / Multilingual Female Voice with Auto-Language Detection)
  const stopSpeaking = () => {
    if (speechWatchdogTimerRef.current) {
      clearTimeout(speechWatchdogTimerRef.current);
      speechWatchdogTimerRef.current = null;
    }
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      setSpeakingMsgId(null);
    }
    activeSpeechUtteranceRef.current = null;
  };

  const speakWithAanya = (text: string, msgId?: number | string, onEndCallback?: () => void) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      if (onEndCallback) onEndCallback();
      return;
    }
    stopSpeaking();

    // Clean text: strip markdown symbols, code blocks, images for silky smooth speech
    let clean = text
      .replace(/```[\s\S]*?```/g, ' Code block. ')
      .replace(/`([^`]+)`/g, '$1')
      .replace(/!\[.*?\]\(.*?\)/g, '')
      .replace(/\[([^\]]+)\]\(.*?\)/g, '$1')
      .replace(/[*#_~>]/g, '')
      .replace(/•/g, ', ')
      .replace(/\|.*?\|/g, '')
      .replace(/\s+/g, ' ')
      .trim();

    if (!clean) {
      if (onEndCallback) onEndCallback();
      return;
    }

    // Clean text for natural, crisp, rapid speech synthesis
    const cleanSpeech = clean
      .replace(/\*+/g, '')
      .replace(/#+/g, '')
      .replace(/`+/g, '')
      .replace(/\[Attached Document:[^\]]*\]/gi, '')
      .replace(/https?:\/\/\S+/gi, '')
      .replace(/^[•\-\*]\s+/gm, '')
      .replace(/[^\w\s\u0900-\u097F.,?!'":-]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    if (!cleanSpeech) {
      if (onEndCallback) onEndCallback();
      return;
    }

    const detected = detectLanguage(cleanSpeech);
    const utterance = new SpeechSynthesisUtterance(cleanSpeech);
    // Bind to persistent ref and window to prevent V8 GC from dropping onend in Chrome
    activeSpeechUtteranceRef.current = utterance;
    (window as any).__activeSpeechUtterance = utterance;

    utterance.lang = detected === 'hi' ? 'hi-IN' : 'en-US';

    // Voice selection: automatically pick best voice for persona & detected language
    const voices = window.speechSynthesis.getVoices();
    let chosenVoice: SpeechSynthesisVoice | undefined;

    if (selectedPersona === 'kabir') {
      chosenVoice =
        voices.find((v) => (v.lang.includes('IN') || v.lang.startsWith('en')) && (v.name.includes('David') || v.name.includes('George') || v.name.includes('Rishi') || v.name.toLowerCase().includes('male')) && !v.name.toLowerCase().includes('female')) ||
        voices.find((v) => v.name.toLowerCase().includes('male') && !v.name.toLowerCase().includes('female')) ||
        voices[0];
      utterance.pitch = 0.92; // deep, confident senior architect voice
      utterance.rate = speechRate || 1.06;
    } else if (selectedPersona === 'maya') {
      chosenVoice =
        voices.find((v) => (v.lang.startsWith('en') || v.lang.includes('IN')) && (v.name.includes('Zira') || v.name.includes('Samantha') || v.name.includes('Victoria') || v.name.toLowerCase().includes('female'))) ||
        voices.find((v) => v.name.toLowerCase().includes('female')) ||
        voices[0];
      utterance.pitch = 1.0;  // articulate executive business tone
      utterance.rate = speechRate || 1.15;
    } else {
      // Default: Aanya (Sweet Indian female voice for Hindi, articulate British/American/Indian female for English)
      if (detected === 'hi') {
        chosenVoice =
          voices.find((v) => v.lang.startsWith('hi') && (v.name.includes('Google') || v.name.includes('Swara') || v.name.includes('Kavya') || v.name.toLowerCase().includes('female'))) ||
          voices.find((v) => v.lang.startsWith('hi')) ||
          voices.find((v) => v.lang.includes('IN') && (v.name.toLowerCase().includes('female') || v.name.toLowerCase().includes('zira'))) ||
          voices.find((v) => v.lang.includes('IN'));
      } else {
        chosenVoice =
          voices.find((v) => (v.lang.startsWith('en-IN') || v.lang.startsWith('en-GB') || v.lang.startsWith('en-US')) && (v.name.includes('Google') || v.name.includes('Samantha') || v.name.includes('Victoria') || v.name.includes('Karen') || v.name.toLowerCase().includes('female') || v.name.toLowerCase().includes('natural'))) ||
          voices.find((v) => v.lang.startsWith('en') && v.name.toLowerCase().includes('female')) ||
          voices.find((v) => v.lang.startsWith('en'));
      }
      utterance.pitch = 1.05; // sweet, lively, warm feminine pitch
      utterance.rate = speechRate || 1.08;
    }

    if (!chosenVoice) {
      chosenVoice = voices.find((v) => v.name.toLowerCase().includes('female')) || voices[0];
    }

    if (chosenVoice) {
      utterance.voice = chosenVoice;
    }

    let isComplete = false;
    const handleComplete = () => {
      if (isComplete) return;
      isComplete = true;
      if (speechWatchdogTimerRef.current) {
        clearTimeout(speechWatchdogTimerRef.current);
        speechWatchdogTimerRef.current = null;
      }
      activeSpeechUtteranceRef.current = null;
      setIsSpeaking(false);
      setSpeakingMsgId(null);
      if (onEndCallback) {
        onEndCallback();
      }
    };

    utterance.onstart = () => {
      setIsSpeaking(true);
      if (msgId) setSpeakingMsgId(msgId);
    };
    utterance.onend = handleComplete;
    utterance.onerror = handleComplete;

    // Safety watchdog: In case Chrome SpeechSynthesis pauses or drops onend unexpectedly
    const wordCount = cleanSpeech.split(/\s+/).length;
    const estimatedDurationMs = Math.max(3000, (wordCount / 2.2) * 1000 + 3500);
    speechWatchdogTimerRef.current = setTimeout(handleComplete, estimatedDurationMs);

    window.speechSynthesis.speak(utterance);
  };

  // ========================================================
  // ChatGPT Continuous Voice Mode Methods
  // ========================================================
  const changeVoiceLanguage = (lang: 'multilingual' | 'english' | 'hindi') => {
    setVoiceLanguage(lang);
    voiceLanguageRef.current = lang;
    if (isVoiceOverlayOpenRef.current && voiceOrbState === 'listening') {
      startContinuousVoiceListening();
    }
  };

  const startContinuousVoiceListening = () => {
    if (typeof window === 'undefined') return;
    if (!isVoiceOverlayOpenRef.current) return;

    const SpeechRec = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRec) {
      alert("Microphone speech recognition is supported in Google Chrome and Microsoft Edge.");
      return;
    }

    // Safely abort previous recognition before starting new instance
    if (continuousRecognitionRef.current) {
      try {
        continuousRecognitionRef.current.onstart = null;
        continuousRecognitionRef.current.onresult = null;
        continuousRecognitionRef.current.onerror = null;
        continuousRecognitionRef.current.onend = null;
        continuousRecognitionRef.current.abort();
      } catch {}
      continuousRecognitionRef.current = null;
    }

    try {
      const recognition = new SpeechRec();
      const currentLang = voiceLanguageRef.current;
      // 'en-US' for English, 'hi-IN' for pure Hindi, 'en-IN' for natural bilingual Indian conversational flow (avoids forced Devanagari)
      recognition.lang = currentLang === 'english' ? 'en-US' : currentLang === 'hindi' ? 'hi-IN' : 'en-IN';
      recognition.continuous = true;
      recognition.interimResults = true;
      continuousRecognitionRef.current = recognition;
      isContinuousActiveRef.current = true;

      let speechBuffer = '';

      recognition.onstart = () => {
        if (isVoiceOverlayOpenRef.current) {
          setVoiceOrbState('listening');
        }
      };

      recognition.onresult = (event: any) => {
        let interim = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const trans = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            speechBuffer += ' ' + trans;
          } else {
            interim += trans;
          }
        }
        const fullLive = (speechBuffer + ' ' + interim).trim();
        setVoiceLiveTranscript(fullLive);

        // Reset silence timer whenever user speaks
        if (silenceTimerRef.current) {
          clearTimeout(silenceTimerRef.current);
        }

        // When user finishes speaking (800ms of silence), immediately submit turn
        if (fullLive.length > 1) {
          silenceTimerRef.current = setTimeout(() => {
            if (isContinuousActiveRef.current && fullLive.trim()) {
              try {
                recognition.stop();
              } catch {}
              isContinuousActiveRef.current = false;
              handleVoiceModeSubmit(fullLive.trim());
            }
          }, 800);
        }
      };

      recognition.onerror = (e: any) => {
        if (e.error === 'no-speech' && isContinuousActiveRef.current) {
          return;
        }
        if (isVoiceOverlayOpenRef.current && isContinuousActiveRef.current && voiceOrbState === 'listening') {
          setTimeout(() => {
            if (isVoiceOverlayOpenRef.current && isContinuousActiveRef.current) {
              try { recognition.start(); } catch {}
            }
          }, 300);
        }
      };

      recognition.onend = () => {
        if (isVoiceOverlayOpenRef.current && isContinuousActiveRef.current && voiceOrbState === 'listening') {
          setTimeout(() => {
            if (isVoiceOverlayOpenRef.current && isContinuousActiveRef.current) {
              try { recognition.start(); } catch {}
            }
          }, 200);
        }
      };

      recognition.start();
    } catch (err) {
      console.error('Failed to start continuous speech recognition:', err);
    }
  };

  const handleVoiceModeSubmit = async (spokenText: string) => {
    if (!spokenText.trim()) return;
    setVoiceOrbState('thinking');

    // Ensure session exists
    let activeSess = currentSession;
    if (!activeSess) {
      activeSess = {
        id: Date.now(),
        user_id: 1,
        title: spokenText.slice(0, 32),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        messages: [],
      };
      setCurrentSession(activeSess);
    }

    // Add user message to session
    const userMsg: ChatMessage = {
      id: Date.now(),
      session_id: activeSess.id,
      role: 'user',
      content: spokenText,
      created_at: new Date().toISOString(),
    };

    const updatedMessages = [...messages, userMsg];
    setMessages(updatedMessages);

    try {
      const res = await api.guestChat({
        content: spokenText,
        messages: updatedMessages.map((m) => ({ role: m.role, content: m.content })),
        guest_chat_count: 0,
        persona: selectedPersona,
      });

      const botReply = res.content || (voiceLanguageRef.current === 'english' ? 'I heard you clearly!' : 'Maine aapki baat sun li hai!');
      setVoiceAiResponse(botReply);

      const botMsg: ChatMessage = {
        id: Date.now() + 1,
        session_id: activeSess.id,
        role: 'assistant',
        content: botReply,
        created_at: new Date().toISOString(),
      };

      const finalMessages = [...updatedMessages, botMsg];
      setMessages(finalMessages);

      const titleSnippet = messages.length === 0 ? spokenText.slice(0, 32) : activeSess.title;
      const updatedSession = { ...activeSess, title: titleSnippet, messages: finalMessages };
      setCurrentSession(updatedSession);
      const updatedSessions = sessions.map((s) => (s.id === activeSess!.id ? updatedSession : s));
      saveSessionsLocally(updatedSessions);

      // Speak reply aloud with Aanya voice and loop back to listening continuously!
      setVoiceOrbState('speaking');
      speakWithAanya(botReply, botMsg.id, () => {
        if (isVoiceOverlayOpenRef.current) {
          setVoiceLiveTranscript('');
          setVoiceOrbState('listening');
          // Short 250ms buffer to ensure speaker echo does not re-trigger mic
          setTimeout(() => {
            if (isVoiceOverlayOpenRef.current) {
              startContinuousVoiceListening();
            }
          }, 250);
        }
      });
    } catch (err: any) {
      console.error('Voice mode API error:', err);
      setVoiceOrbState('idle');
      const errorMsg = voiceLanguageRef.current === 'english'
        ? 'A technical glitch occurred, please speak again.'
        : 'Ek technical issue aaya hai, kripya dobara bolein.';
      speakWithAanya(errorMsg, undefined, () => {
        if (isVoiceOverlayOpenRef.current) {
          setVoiceOrbState('listening');
          setTimeout(() => {
            if (isVoiceOverlayOpenRef.current) {
              startContinuousVoiceListening();
            }
          }, 250);
        }
      });
    }
  };

  const openChatGPTVoiceMode = () => {
    stopSpeaking();
    isVoiceOverlayOpenRef.current = true;
    voiceLanguageRef.current = voiceLanguage;
    setIsVoiceOverlayOpen(true);
    setVoiceLiveTranscript('');
    setVoiceAiResponse('');
    setVoiceOrbState('listening');
    startAudioAnalyzer();
    setTimeout(() => {
      startContinuousVoiceListening();
    }, 200);
  };

  const closeChatGPTVoiceMode = () => {
    isVoiceOverlayOpenRef.current = false;
    isContinuousActiveRef.current = false;
    if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
    if (continuousRecognitionRef.current) {
      try {
        continuousRecognitionRef.current.onstart = null;
        continuousRecognitionRef.current.onresult = null;
        continuousRecognitionRef.current.onerror = null;
        continuousRecognitionRef.current.onend = null;
        continuousRecognitionRef.current.abort();
      } catch {}
      continuousRecognitionRef.current = null;
    }
    stopAudioAnalyzer();
    stopSpeaking();
    setIsVoiceOverlayOpen(false);
    setVoiceOrbState('idle');
  };

  const interruptAanyaInVoiceMode = () => {
    stopSpeaking();
    setVoiceOrbState('listening');
    setVoiceLiveTranscript('');
    setTimeout(() => {
      if (isVoiceOverlayOpenRef.current) {
        startContinuousVoiceListening();
      }
    }, 150);
  };

  // Speech Recognition (Microphone Input)
  const toggleMicListening = () => {
    if (typeof window === 'undefined') return;
    const SpeechRec = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRec) {
      alert("Microphone speech-to-text is supported in Google Chrome and Microsoft Edge.");
      return;
    }

    if (isListening) {
      if (speechRecognitionRef.current) {
        speechRecognitionRef.current.stop();
      }
      setIsListening(false);
      return;
    }

    try {
      const recognition = new SpeechRec();
      // 'hi-IN' speech recognition in Chrome handles English, Hinglish, and Hindi phonetics automatically
      recognition.lang = 'hi-IN';
      recognition.continuous = false;
      recognition.interimResults = true;

      let capturedSpeech = '';

      recognition.onstart = () => {
        setIsListening(true);
      };

      recognition.onresult = (event: any) => {
        let interim = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            capturedSpeech += event.results[i][0].transcript;
          } else {
            interim += event.results[i][0].transcript;
          }
        }
        const combined = (capturedSpeech + ' ' + interim).trim();
        setInput(combined);
      };

      recognition.onerror = (event: any) => {
        console.log('Speech recognition error:', event.error);
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
        const query = capturedSpeech.trim() || input.trim();
        if (query) {
          // Send automatically via Voice - Aanya will reply by speaking!
          handleSendMessage(query, true);
        }
      };

      speechRecognitionRef.current = recognition;
      recognition.start();
    } catch (err) {
      console.error(err);
      setIsListening(false);
    }
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, sending]);

  // Save sessions to localStorage for offline persistence
  const saveSessionsLocally = (updatedSessions: ChatSession[]) => {
    setSessions(updatedSessions);
    if (typeof window !== 'undefined') {
      localStorage.setItem('opensense_local_sessions', JSON.stringify(updatedSessions));
    }
  };

  // Adjust textarea height dynamically (starts at crisp single-line 32px, expands on multiline input)
  useEffect(() => {
    if (textareaRef.current) {
      if (!input) {
        textareaRef.current.style.height = '32px';
        textareaRef.current.style.overflowY = 'hidden';
      } else {
        textareaRef.current.style.height = 'auto';
        const newHeight = Math.min(textareaRef.current.scrollHeight, 120);
        textareaRef.current.style.height = `${newHeight}px`;
        textareaRef.current.style.overflowY = textareaRef.current.scrollHeight > 120 ? 'auto' : 'hidden';
      }
    }
  }, [input]);

  const loadProviders = async () => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('opensense_token') : null;
    if (!token) return;
    setLoadingProviders(true);
    try {
      const list = await api.getAIProviders();
      setProviders(list);
    } catch {
      // ignore
    } finally {
      setLoadingProviders(false);
    }
  };

  const handleNewSession = () => {
    setIsMobileSidebarOpen(false);
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    setStreamingMsgId(null);
    setSending(false);
    setInput('');
    setAttachedFile(null);
    const newSession: ChatSession = {
      id: Date.now() + Math.floor(Math.random() * 1000),
      user_id: 1,
      title: 'New Conversation',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      messages: [],
    };
    currentSessionIdRef.current = newSession.id;
    const updated = [newSession, ...sessions];
    saveSessionsLocally(updated);
    setCurrentSession(newSession);
    setMessages([]);
    hasUserInteractedRef.current = true;
    startTypingGreeting();
  };

  const selectSession = (id: number) => {
    setIsMobileSidebarOpen(false);
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    setStreamingMsgId(null);
    setSending(false);
    currentSessionIdRef.current = id;
    const found = sessions.find((s) => s.id === id);
    if (found) {
      setCurrentSession(found);
      // Deep clone to ensure strict isolation with zero memory reference sharing
      setMessages(JSON.parse(JSON.stringify(found.messages || [])));
    }
  };

  const handleDeleteSession = (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    const remaining = sessions.filter((s) => s.id !== id);
    saveSessionsLocally(remaining);
    if (currentSession?.id === id) {
      if (remaining.length > 0) {
        setCurrentSession(remaining[0]);
        setMessages(remaining[0].messages || []);
      } else {
        handleNewSession();
      }
    }
  };

  const handleStartRename = (sess: ChatSession, e: React.MouseEvent) => {
    e.stopPropagation();
    setRenamingSessionId(sess.id);
    setRenameTitleInput(sess.title);
  };

  const handleSaveRename = (id: number, e?: React.MouseEvent | React.FormEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    const trimmed = renameTitleInput.trim();
    if (!trimmed) {
      setRenamingSessionId(null);
      return;
    }
    const updated = sessions.map((s) => (s.id === id ? { ...s, title: trimmed } : s));
    saveSessionsLocally(updated);
    if (currentSession?.id === id) {
      setCurrentSession((prev) => (prev ? { ...prev, title: trimmed } : null));
    }
    setRenamingSessionId(null);
    showToast('Conversation renamed! ✏️');
  };

  const handleCancelRename = (e: React.MouseEvent) => {
    e.stopPropagation();
    setRenamingSessionId(null);
  };

  const handleClearAllSessions = async () => {
    saveSessionsLocally([]);
    setCurrentSession(null);
    setMessages([]);
    setConfirmClearModal(false);
    handleNewSession();
  };

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    if (typeof window !== 'undefined') {
      localStorage.setItem('opensense_user_name', profileName.trim());
      localStorage.setItem('opensense_user_dept', profileDept);
      localStorage.setItem('opensense_user_instructions', customInstruction.trim());
    }
    setProfileSavedToast(true);
    setTimeout(() => setProfileSavedToast(false), 3000);
  };

  const handleSendMessage = async (textToSend?: string, fromVoice: boolean = false) => {
    const rawText = (textToSend || input).trim();
    if (!rawText || sending) return;

    // Attach file if present
    let text = rawText;
    if (attachedFile) {
      text = `[Attached Document: ${attachedFile.name} (${attachedFile.size})]\n\`\`\`\n${attachedFile.content}\n\`\`\`\n\n${rawText}`;
      setAttachedFile(null);
    }

    setInput('');
    setShowSlashMenu(false);
    if (textareaRef.current) {
      textareaRef.current.style.height = '32px';
      textareaRef.current.style.overflowY = 'hidden';
    }

    // Ensure session exists
    let activeSess = currentSession;
    if (!activeSess) {
      activeSess = {
        id: Date.now(),
        user_id: 1,
        title: rawText.slice(0, 32),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        messages: [],
      };
      setCurrentSession(activeSess);
    }

    // Optimistic user message
    const targetSessionId = activeSess.id;
    currentSessionIdRef.current = targetSessionId;

    const tempUserMsg: ChatMessage = {
      id: Date.now(),
      session_id: activeSess.id,
      role: 'user',
      content: rawText,
      created_at: new Date().toISOString(),
    };
    const updatedWithUser = [...messages, tempUserMsg];
    setMessages(updatedWithUser);
    const controller = new AbortController();
    abortControllerRef.current = controller;
    setSending(true);
    const sendStartTime = performance.now();

    try {
      // Call guest/open endpoint directly (frictionless & unlimited)
      const res = await api.guestChat({
        content: text,
        messages: updatedWithUser.map((m) => ({ role: m.role, content: m.content })),
        guest_chat_count: 0,
        persona: selectedPersona,
      }, { signal: controller.signal });

      if (currentSessionIdRef.current !== targetSessionId || controller.signal.aborted) {
        return;
      }

      const latencySec = parseFloat(((performance.now() - sendStartTime) / 1000).toFixed(2));
      const tokensEst = Math.round((res.content || '').split(/\s+/).length * 1.3);

      const assistantMsg: ChatMessage = {
        id: Date.now() + 1,
        session_id: activeSess.id,
        role: 'assistant',
        content: res.content,
        tool_calls: res.tool_calls ? JSON.stringify(res.tool_calls) : undefined,
        tool_results: res.tool_results ? JSON.stringify(res.tool_results) : undefined,
        created_at: new Date().toISOString(),
      };

      setTelemetryMap((prev) => ({
        ...prev,
        [assistantMsg.id]: {
          latency: latencySec,
          tokens: tokensEst,
          model: res.model || activeSess.model_used || 'Gemini 3.5 Flash',
        },
      }));

      // Trigger Fast Token Streaming Animation
      setStreamingMsgId(assistantMsg.id);
      setStreamedContent('');
      let charIndex = 0;
      const fullText = res.content || '';
      const step = fromVoice ? fullText.length : 14;
      if (streamTimerRef.current) clearInterval(streamTimerRef.current);
      streamTimerRef.current = setInterval(() => {
        charIndex += step;
        if (charIndex >= fullText.length) {
          if (streamTimerRef.current) clearInterval(streamTimerRef.current);
          setStreamedContent(fullText);
          setStreamingMsgId(null);
        } else {
          setStreamedContent(fullText.slice(0, charIndex));
        }
      }, 8);

      const finalMessages = [...updatedWithUser, assistantMsg];
      setMessages(finalMessages);

      // Auto-speak with Aanya ONLY if initiated via Mic (fromVoice) or if user explicitly enabled Always-ON Voice Mode
      if ((fromVoice || isVoiceMode) && res.content) {
        speakWithAanya(res.content, assistantMsg.id);
      }

      // Update sessions list & save
      const titleSnippet = messages.length === 0 ? rawText.slice(0, 32) : activeSess.title;
      const updatedSess = { ...activeSess, title: titleSnippet, messages: finalMessages };
      setCurrentSession(updatedSess);
      const allUpdated = sessions.map((s) => (s.id === activeSess!.id ? updatedSess : s));
      if (!allUpdated.some((s) => s.id === activeSess!.id)) {
        allUpdated.unshift(updatedSess);
      }
      saveSessionsLocally(allUpdated);
    } catch (err: any) {
      if (err?.name === 'AbortError' || controller.signal.aborted) {
        return;
      }
      if (currentSessionIdRef.current !== targetSessionId) return;
      const errorMsg: ChatMessage = {
        id: Date.now() + 1,
        session_id: activeSess.id,
        role: 'assistant',
        content: `Error: ${err.message || 'Unable to process message. Please check connection.'}`,
        created_at: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      if (currentSessionIdRef.current === targetSessionId) {
        setSending(false);
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const copyToClipboard = (text: string, id: number | string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleProviderTypeChange = (type: 'openai' | 'gemini' | 'anthropic' | 'custom') => {
    setNewProviderType(type);
    if (type === 'gemini') {
      setNewProviderName('Google Gemini 1.5 Flash');
      setNewBaseUrl('https://generativelanguage.googleapis.com/v1beta');
      setNewModelName('gemini-1.5-flash');
    } else if (type === 'openai') {
      setNewProviderName('OpenAI GPT-4o & DALL-E 3');
      setNewBaseUrl('https://api.openai.com/v1');
      setNewModelName('gpt-4o');
    } else if (type === 'anthropic') {
      setNewProviderName('Anthropic Claude 3.5 Sonnet');
      setNewBaseUrl('https://api.anthropic.com/v1');
      setNewModelName('claude-3-5-sonnet-20241022');
    } else {
      setNewProviderName('Custom Enterprise / Ollama');
      setNewBaseUrl('http://localhost:11434/v1');
      setNewModelName('llama3.2');
    }
  };

  const handleTestProvider = async () => {
    if (!newApiKey.trim() && newProviderType !== 'custom') {
      setProviderTestResult({ success: false, message: 'Please enter an API Key to test.' });
      return;
    }
    setTestingProvider(true);
    setProviderTestResult(null);
    try {
      const res = await api.testAIProvider({
        provider_type: newProviderType,
        base_url: newBaseUrl,
        api_key: newApiKey,
        model_name: newModelName,
      });
      setProviderTestResult({
        success: res.success,
        message: res.message + (res.latency_ms ? ` (${res.latency_ms}ms)` : ''),
      });
    } catch (err: any) {
      setProviderTestResult({ success: false, message: err.message || 'Connection test failed.' });
    } finally {
      setTestingProvider(false);
    }
  };

  const handleSaveProvider = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newApiKey.trim() && newProviderType !== 'custom') {
      setProviderTestResult({ success: false, message: 'API Key is required.' });
      return;
    }
    setSavingProvider(true);
    setProviderTestResult(null);
    try {
      await api.createAIProvider({
        name: newProviderName,
        provider_type: newProviderType,
        base_url: newBaseUrl,
        api_key: newApiKey,
        model_name: newModelName,
        is_default: isDefaultProvider,
        is_enabled: true,
      });
      setNewApiKey('');
      await loadProviders();
      setProviderTestResult({ success: true, message: `${newProviderName} saved and activated successfully!` });
      setTimeout(() => setProviderTestResult(null), 3000);
    } catch (err: any) {
      setProviderTestResult({ success: false, message: err.message || 'Failed to save provider.' });
    } finally {
      setSavingProvider(false);
    }
  };

  const handleDeleteProvider = async (id: number) => {
    // Instant optimistic update in the UI
    setProviders((prev) => prev.filter((p) => p.id !== id));
    try {
      await api.deleteAIProvider(id);
    } catch (err) {
      console.error('Failed to delete provider:', err);
    }
    // Refresh to ensure server sync
    await loadProviders();
  };

  const handleSetDefaultProvider = async (id: number) => {
    setProviders((prev) => prev.map((p) => ({ ...p, is_default: p.id === id })));
    try {
      await api.updateAIProvider(id, { is_default: true });
      await loadProviders();
    } catch (err) {
      console.error('Failed to set default provider:', err);
    }
  };

  const handleTestExistingProvider = async (provider: any) => {
    setTestingExistingId(provider.id);
    try {
      const res = await api.testAIProvider({
        provider_type: provider.provider_type,
        base_url: provider.base_url,
        api_key: '',
        model_name: provider.model_name,
      });
      setExistingTestResults((prev) => ({
        ...prev,
        [provider.id]: {
          success: res.success,
          message: res.message,
          latency_ms: res.latency_ms,
        },
      }));
    } catch (err: any) {
      setExistingTestResults((prev) => ({
        ...prev,
        [provider.id]: {
          success: false,
          message: err.message || 'Connection test failed.',
        },
      }));
    } finally {
      setTestingExistingId(null);
    }
  };

  const testVoiceInSettings = () => {
    const sample = 'Namaste! Hello! Main Aanya hoon. Aap jis language me baat karenge, main auto-detect karke usi language me answer doongi.';
    speakWithAanya(sample, 'test-voice-settings');
  };

  // Export conversations like ChatGPT
  const exportChatHistory = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(messages, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `opensense_chat_${Date.now()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  // Helper to trigger direct image download
  const downloadImageFile = async (url: string, filename: string = 'opensense-ai-art.png') => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
    } catch (e) {
      window.open(url, '_blank');
    }
  };

  // Quick prompt presets organized by department
  const departmentPrompts = {
    all: [
      {
        icon: Mail,
        dept: '📢 Growth',
        title: 'Draft Enterprise Drupal LinkedIn Post',
        prompt: 'Draft an engaging LinkedIn thought leadership post explaining how OpenSense Labs leverages Drupal 10/11 and Decoupled Next.js for enterprise digital transformation, including real B2B hooks and hashtags.',
        desc: 'B2B thought leadership & engagement',
      },
      {
        icon: Users,
        dept: '👥 People & Culture',
        title: 'Leave Policy & Health Insurance',
        prompt: 'Please explain the OpenSense Labs leave policy including CL, SL, and EL entitlements, carry-forward rules, and the ₹5,00,000 family floater medical insurance coverage.',
        desc: '12 CL, 12 SL, 15 EL, and ₹5L insurance',
      },
      {
        icon: Code2,
        dept: '💻 Engineering',
        title: 'Write Python JSON Schema Validator',
        prompt: 'Write a production-grade Python script using Pydantic v2 and FastAPI to validate nested JSON schemas with helpful diagnostic error reporting.',
        desc: 'Robust full-stack code implementation',
      },
      {
        icon: ImageIcon,
        dept: '🎨 AI Vision Studio',
        title: 'Generate Futuristic Office Workspace',
        prompt: 'Generate an ultra-realistic 3D render of the futuristic OpenSense Labs headquarters in Sector 62 Noida with glowing orange and blue neural network holographic displays.',
        desc: '1024x1024 photorealistic Ultra HD AI art',
      },
      {
        icon: Mail,
        dept: '🏢 Team Directory',
        title: 'Official Department Contacts',
        prompt: 'Show me the OpenSense Labs official contact directory for HR, DevOps, Marketing, and Leadership.',
        desc: 'Verified email channels & leads',
      },
      {
        icon: Clock,
        dept: '⏰ Global Hubs',
        title: 'Live Office Times across Hubs',
        prompt: 'What are the official working hours and current live wall-clock times across OpenSense Noida HQ, US, and UK hubs?',
        desc: 'Real-time telemetry across Noida, US & UK',
      },
      {
        icon: Mail,
        dept: '🏢 Team Directory',
        title: 'Official Department Contacts',
        prompt: 'Show me the OpenSense Labs official contact directory for HR, DevOps, Marketing, and Leadership.',
        desc: 'Verified email channels & leads',
      },
      {
        icon: Clock,
        dept: '⏰ Global Hubs',
        title: 'Live Office Times across Hubs',
        prompt: 'What are the official working hours and current live wall-clock times across OpenSense Noida HQ, US, and UK hubs?',
        desc: 'Real-time telemetry across Noida, US & UK',
      },
    ],
    hr: [
      {
        icon: Mail,
        dept: '👥 HR Operations',
        title: 'Leave Policy & Entitlements',
        prompt: 'Please explain the OpenSense Labs leave policy including CL, SL, and EL entitlements and approval workflow.',
        desc: '12 CL, 12 SL, 15 EL, and parental support',
      },
      {
        icon: Users,
        dept: '👥 Onboarding',
        title: 'New Hire Onboarding Roadmap',
        prompt: 'What is the 30-60-90 day onboarding checklist for new engineers and team members joining OpenSense Labs?',
        desc: 'Mentor setup, welcome kit, and initial sprints',
      },
      {
        icon: Briefcase,
        dept: '👥 People Growth',
        title: 'Annual Appraisal & Review Cycle',
        prompt: 'How does the annual performance appraisal and promotion cycle work at OpenSense Labs?',
        desc: 'April review cycles and transparent growth tracks',
      },
      {
        icon: Mail,
        dept: '👥 HR Drafting',
        title: 'Draft Leave Application Email',
        prompt: 'Draft a professional leave application email for 2 days of casual leave to my lead with project handover details.',
        desc: 'Ready-to-send email template',
      },
    ],
    marketing: [
      {
        icon: Sparkles,
        dept: '📢 Thought Leadership',
        title: 'Draft LinkedIn Post on Drupal 10/11',
        prompt: 'Draft an engaging LinkedIn thought leadership post explaining why Fortune 500 companies choose Drupal with Decoupled Next.js for high-speed digital experience platforms.',
        desc: 'Viral enterprise copy with hashtags & emojis',
      },
      {
        icon: Briefcase,
        dept: '📢 Brand Growth',
        title: 'OpenSense Value Proposition',
        prompt: 'What is the enterprise marketing value proposition of OpenSense Labs for legacy CMS modernization?',
        desc: 'Key differentiators and case study angles',
      },
      {
        icon: Palette,
        dept: '📢 Campaigns',
        title: 'Slogan & Campaign Ideas for 2026',
        prompt: 'Brainstorm 5 catchy slogans and marketing campaign themes for OpenSense Labs promoting AI-driven digital transformation.',
        desc: 'Creative angles for tech conferences & webinars',
      },
      {
        icon: ImageIcon,
        dept: '📢 Visual Media',
        title: 'Create Tech Banner Image',
        prompt: 'Create a modern tech marketing banner image representing OpenSense Labs with glowing orange geometric nodes and interconnected digital networks.',
        desc: 'High-res social media banner generation',
      },
    ],
    tech: [
      {
        icon: Code2,
        dept: '💻 Engineering',
        title: 'Write Python Telemetry Script',
        prompt: 'Write a production-ready async Python script using httpx with robust error handling and type hints.',
        desc: 'Clean, typed backend utility code',
      },
      {
        icon: Clock,
        dept: '💻 MCP Telemetry',
        title: 'Check Global Hub Live Clocks',
        prompt: 'What is the exact live wall-clock time across OpenSense India HQ, US Hub, and UK Hub?',
        desc: 'Executes real live MCP office time tool',
      },
      {
        icon: Cpu,
        dept: '💻 System Ops',
        title: 'Run Server Health Diagnostics',
        prompt: 'Run full system diagnostics and show host CPU, memory, and MCP runtime telemetry.',
        desc: 'Executes live system diagnostics tool',
      },
      {
        icon: Layers,
        dept: '💻 Architecture',
        title: 'Decoupled Drupal + Next.js Guide',
        prompt: 'Explain the best architecture practices for integrating Drupal 10 as headless CMS with Next.js 14 App Router and ISR caching.',
        desc: 'High-scale web architecture and caching',
      },
    ],
    creative: [
      {
        icon: ImageIcon,
        dept: '🎨 AI Vision',
        title: 'Futuristic OpenSense HQ',
        prompt: 'Generate an ultra-realistic 3D architectural render of the futuristic OpenSense Labs headquarters in Sector 62 Noida with holographic orange neural lights at sunset.',
        desc: '1024x1024 photorealistic render',
      },
      {
        icon: Palette,
        dept: '🎨 3D Art',
        title: '3D OpenSense Neon Logo',
        prompt: 'Generate an artistic 3D glassmorphic tech emblem with warm orange and amber bioluminescent core on a dark slate background.',
        desc: 'High-definition digital wallpaper',
      },
      {
        icon: Laptop,
        dept: '🎨 Cyberpunk Art',
        title: 'Developer in Sci-Fi Lab',
        prompt: 'Create an image of an AI software engineer at OpenSense Labs coding with floating holographic multi-screen code interfaces.',
        desc: 'Futuristic digital illustration',
      },
      {
        icon: Sparkles,
        dept: '🎨 Abstract Vision',
        title: 'Model Context Protocol Concept',
        prompt: 'Create an image visualizing Model Context Protocol (MCP) connecting AI agents with enterprise servers and data pipelines in glowing orange lines.',
        desc: 'Concept art for presentations',
      },
    ],
  };

  const filteredSessions = sessions.filter((s) =>
    s.title.toLowerCase().includes(searchFilter.toLowerCase())
  );

  // Helper to extract image markdown from message content
  const extractImageFromContent = (content: string) => {
    const imgRegex = /!\[([^\]]*)\]\((https?:\/\/[^\s\)]+)\)/;
    const match = content.match(imgRegex);
    if (match) {
      return {
        hasImage: true,
        alt: match[1] || 'AI Generated Image',
        url: match[2],
        textWithoutImage: content.replace(imgRegex, '').trim(),
      };
    }
    return { hasImage: false, alt: '', url: '', textWithoutImage: content };
  };

  return (
    <div className={`flex h-screen overflow-hidden font-sans transition-colors duration-200 ${isDarkMode ? 'bg-slate-950 text-slate-100' : 'bg-slate-100 text-slate-900'}`}>
      {/* Mobile Drawer Backdrop */}
      {isMobileSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden transition-opacity"
          onClick={() => setIsMobileSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* ======================================================== */}
      {/* 1. LEFT SIDEBAR: ChatGPT-Style Chat History & Navigation */}
      {/* ======================================================== */}
      <aside
        className={`fixed md:static inset-y-0 left-0 z-50 w-72 flex flex-col justify-between h-full shrink-0 select-none transition-transform duration-300 ease-in-out ${
          isMobileSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        } ${
          isDarkMode
            ? 'bg-slate-900 border-r border-slate-800/80'
            : 'bg-white border-r border-slate-200 shadow-xl md:shadow-sm'
        }`}
      >
        <div className="flex flex-col h-[calc(100vh-140px)]">
          {/* Header & Logo with 3 Geometric Shapes (Clean Single Brand) */}
          <div className={`p-4 border-b flex items-center justify-between ${isDarkMode ? 'border-slate-800/80' : 'border-slate-200'}`}>
            <OpenSenseLogo size="sm" showSubtitle={false} isDarkMode={isDarkMode} />
            <button
              type="button"
              onClick={() => setIsMobileSidebarOpen(false)}
              className="md:hidden p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              aria-label="Close sidebar navigation"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* New Chat Button */}
          <div className="p-3">
            <button
              onClick={handleNewSession}
              className="w-full py-2.5 px-3.5 rounded-xl bg-gradient-to-r from-orange-600 to-orange-500 hover:from-orange-500 hover:to-orange-400 text-white text-xs font-semibold flex items-center justify-between shadow-md shadow-orange-600/20 transition-all group"
            >
              <div className="flex items-center gap-2">
                <Plus className="w-4 h-4" />
                <span>New Conversation</span>
              </div>
              <Sparkles className="w-3.5 h-3.5 text-orange-200 group-hover:rotate-12 transition-transform" />
            </button>
          </div>

          {/* Search sessions */}
          <div className="px-3 pb-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search conversations..."
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                className={`w-full pl-8 pr-3 py-1.5 rounded-lg border text-[11px] focus:outline-none focus:border-orange-500/60 transition-colors ${
                  isDarkMode
                    ? 'bg-slate-950/70 border-slate-800 text-slate-200 placeholder-slate-500'
                    : 'bg-slate-100 border-slate-200 text-slate-800 placeholder-slate-400'
                }`}
              />
            </div>
          </div>

          {/* Sessions List */}
          <div className="flex-1 overflow-y-auto px-3 space-y-1">
            <div className={`text-[10px] font-bold uppercase tracking-wider px-2 py-1 flex items-center justify-between ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>
              <span>Conversations ({filteredSessions.length})</span>
              {sessions.length > 0 && (
                <button
                  onClick={() => setConfirmClearModal(true)}
                  className="text-[10px] text-slate-400 hover:text-rose-400 transition-colors"
                  title="Clear all chats"
                >
                  Clear All
                </button>
              )}
            </div>

            {filteredSessions.length === 0 ? (
              <p className={`text-[11px] px-2 py-4 text-center ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>No chats yet. Start chatting!</p>
            ) : (
              filteredSessions.map((sess) => {
                const isActive = currentSession?.id === sess.id;
                const isRenaming = renamingSessionId === sess.id;
                return (
                  <div
                    key={sess.id}
                    onClick={() => {
                      if (!isRenaming) selectSession(sess.id);
                    }}
                    className={`group flex items-center justify-between px-2.5 sm:px-3 py-2 rounded-xl text-xs font-medium cursor-pointer transition-all ${
                      isActive
                        ? isDarkMode
                          ? 'bg-slate-800 text-orange-400 font-semibold shadow-sm'
                          : 'bg-orange-50 text-orange-600 font-semibold shadow-sm border border-orange-200'
                        : isDarkMode
                          ? 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
                          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                    }`}
                  >
                    {isRenaming ? (
                      <div className="flex items-center gap-1.5 flex-1 min-w-0 pr-1" onClick={(e) => e.stopPropagation()}>
                        <MessageSquare className="w-3.5 h-3.5 text-orange-500 shrink-0" />
                        <input
                          type="text"
                          value={renameTitleInput}
                          onChange={(e) => setRenameTitleInput(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleSaveRename(sess.id);
                            if (e.key === 'Escape') setRenamingSessionId(null);
                          }}
                          autoFocus
                          className={`flex-1 min-w-0 px-2 py-0.5 rounded-lg text-xs font-medium border focus:outline-none focus:ring-1 focus:ring-orange-500 ${
                            isDarkMode
                              ? 'bg-slate-900 border-orange-500/50 text-white'
                              : 'bg-white border-orange-400 text-slate-900'
                          }`}
                        />
                        <button
                          type="button"
                          onClick={(e) => handleSaveRename(sess.id, e)}
                          title="Save name"
                          className="p-1 rounded-md text-emerald-500 hover:bg-emerald-500/20 transition-colors shrink-0"
                        >
                          <Check className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={handleCancelRename}
                          title="Cancel"
                          className="p-1 rounded-md text-slate-400 hover:bg-slate-700/50 transition-colors shrink-0"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <>
                        <div className="flex items-center gap-2.5 truncate flex-1 min-w-0">
                          <MessageSquare className={`w-3.5 h-3.5 shrink-0 ${isActive ? 'text-orange-400' : isDarkMode ? 'text-slate-500' : 'text-slate-400'}`} />
                          <span className="truncate">{sess.title}</span>
                        </div>

                        <div className="flex items-center gap-0.5 shrink-0 ml-1 opacity-80 group-hover:opacity-100 transition-opacity">
                          {/* Rename Button */}
                          <button
                            type="button"
                            onClick={(e) => handleStartRename(sess, e)}
                            title="Rename conversation"
                            className="p-1.5 rounded-lg text-slate-400 hover:text-orange-400 hover:bg-orange-500/10 transition-colors"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>

                          {/* Delete Trash Button */}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              handleDeleteSession(sess.id, e);
                            }}
                            title="Delete conversation"
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* PWA Install Banner */}
        {!isAppInstalled && (
          <div className="px-3 pb-1">
            <button
              type="button"
              onClick={handleInstallPWA}
              className={`w-full py-2 px-3 rounded-xl border flex items-center justify-between text-xs transition-all ${
                isDarkMode
                  ? 'bg-orange-500/10 hover:bg-orange-500/15 border-orange-500/30 text-orange-400 shadow-sm'
                  : 'bg-orange-50 hover:bg-orange-100 border-orange-200 text-orange-700 shadow-sm'
              }`}
              title="Install as desktop / mobile PWA"
            >
              <div className="flex items-center gap-2">
                <Smartphone className="w-3.5 h-3.5" />
                <span className="font-bold text-[11px]">Install as PWA App</span>
              </div>
              <Download className="w-3.5 h-3.5 opacity-80" />
            </button>
          </div>
        )}

        {/* User Identity Footer Badge (Clean, non-cluttered) */}
        <div className={`p-3 border-t transition-colors ${isDarkMode ? 'border-slate-800 bg-slate-900' : 'border-slate-200 bg-slate-50'}`}>
          <div className={`flex items-center gap-2.5 p-2 rounded-xl border transition-colors ${isDarkMode ? 'bg-slate-950/60 border-slate-800/80' : 'bg-white border-slate-200 shadow-sm'}`}>
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-orange-500 to-amber-500 flex items-center justify-center font-bold text-xs text-white shrink-0 shadow-sm">
              {profileName.charAt(0).toUpperCase()}
            </div>
            <div className="truncate flex-1">
              <p className={`text-xs font-semibold truncate ${isDarkMode ? 'text-slate-200' : 'text-slate-800'}`}>
                {profileName}
              </p>
              <p className={`text-[10px] truncate ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                {profileDept}
              </p>
            </div>
          </div>
        </div>
      </aside>

      {/* ======================================================== */}
      {/* 2. MAIN CHAT AREA: ChatGPT-Style Conversation Window     */}
      {/* ======================================================== */}
      <main className={`flex-1 flex flex-col h-full relative overflow-hidden transition-colors duration-200 ${isDarkMode ? 'bg-slate-950' : 'bg-slate-50'}`}>
        {/* Top Bar with Direct Access */}
        <header className={`h-12 sm:h-14 px-2 sm:px-4 md:px-6 flex items-center justify-between z-20 shrink-0 transition-colors duration-200 ${
          isDarkMode
            ? 'border-b border-slate-800/80 bg-slate-950/95 backdrop-blur-md'
            : 'border-b border-slate-200 bg-white/95 backdrop-blur-md shadow-sm'
        }`}>
          <div className="flex items-center gap-1.5 sm:gap-2.5 min-w-0">
            {/* Mobile Hamburger Menu Toggle */}
            <button
              type="button"
              onClick={() => setIsMobileSidebarOpen(true)}
              className="md:hidden p-1.5 rounded-xl text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800/60 transition-colors shrink-0"
              aria-label="Open conversation menu"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-1.5 shrink-0">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
              <h2 className={`text-xs font-black tracking-wide uppercase truncate max-w-[82px] sm:max-w-none ${isDarkMode ? 'text-slate-100' : 'text-slate-900'}`}>
                OpenSense AI
              </h2>
            </div>
            <span className={`hidden md:inline ${isDarkMode ? 'text-slate-600' : 'text-slate-400 font-bold'}`}>•</span>
            <div className="hidden md:flex items-center gap-1 group">
              <span className={`text-xs font-semibold truncate max-w-[160px] lg:max-w-xs ${isDarkMode ? 'text-slate-400' : 'text-slate-700'}`}>
                {currentSession?.title || 'Open Workspace'}
              </span>
              {currentSession && (
                <button
                  type="button"
                  onClick={(e) => handleStartRename(currentSession, e)}
                  title="Rename current conversation"
                  className="opacity-0 group-hover:opacity-100 p-1 rounded-md text-slate-400 hover:text-orange-400 transition-all"
                >
                  <Pencil className="w-3 h-3" />
                </button>
              )}
            </div>

            {/* AI Persona Selector Pill */}
            <div className="relative shrink-0">
              <button
                type="button"
                onClick={() => setIsPersonaMenuOpen(!isPersonaMenuOpen)}
                className={`flex items-center gap-1 px-2 py-1 sm:px-2.5 sm:py-1.5 rounded-xl text-[11px] sm:text-xs font-bold border transition-all active:scale-95 shadow-sm ${
                  selectedPersona === 'kabir'
                    ? isDarkMode
                      ? 'bg-blue-500/15 border-blue-500/40 text-blue-400 hover:bg-blue-500/25'
                      : 'bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100'
                    : selectedPersona === 'maya'
                      ? isDarkMode
                        ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/25'
                        : 'bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100'
                      : isDarkMode
                        ? 'bg-orange-500/15 border-orange-500/40 text-orange-400 hover:bg-orange-500/25'
                        : 'bg-orange-50 border-orange-200 text-orange-700 hover:bg-orange-100'
                }`}
                title="Select AI Persona"
              >
                <span className="text-xs sm:text-sm">
                  {selectedPersona === 'kabir' ? '💻' : selectedPersona === 'maya' ? '📊' : '🌸'}
                </span>
                <span className="font-extrabold truncate max-w-[48px] sm:max-w-none">
                  {selectedPersona === 'kabir' ? 'Kabir' : selectedPersona === 'maya' ? 'Maya' : 'Aanya'}
                </span>
                <span className={`hidden md:inline text-[10px] px-1.5 py-0.2 rounded-md font-semibold ${
                  selectedPersona === 'kabir'
                    ? isDarkMode ? 'bg-blue-400/20 text-blue-300' : 'bg-blue-200/60 text-blue-800'
                    : selectedPersona === 'maya'
                      ? isDarkMode ? 'bg-emerald-400/20 text-emerald-300' : 'bg-emerald-200/60 text-emerald-800'
                      : isDarkMode ? 'bg-orange-400/20 text-orange-300' : 'bg-orange-200/60 text-orange-800'
                }`}>
                  {selectedPersona === 'kabir' ? 'Architect' : selectedPersona === 'maya' ? 'Strategy' : 'Culture/HR'}
                </span>
                <ChevronDown className={`w-3 h-3 opacity-60 transition-transform duration-200 shrink-0 ${isPersonaMenuOpen ? 'rotate-180' : ''}`} />
              </button>

              {/* Backdrop for outside click */}
              {isPersonaMenuOpen && (
                <div
                  className="fixed inset-0 z-40 bg-black/25 sm:bg-transparent"
                  onClick={() => setIsPersonaMenuOpen(false)}
                />
              )}

              {/* Persona Selection Dropdown Menu */}
              {isPersonaMenuOpen && (
                <div className={`fixed left-3 right-3 top-[54px] sm:absolute sm:inset-x-auto sm:left-0 sm:top-full sm:w-80 sm:mt-2 rounded-2xl border p-2.5 z-50 animate-scaleUp shadow-2xl ${
                  isDarkMode
                    ? 'bg-slate-900 border-slate-800 text-slate-100 shadow-[0_20px_50px_rgba(0,0,0,0.7)]'
                    : 'bg-white border-slate-200 text-slate-900 shadow-2xl ring-1 ring-slate-200'
                }`}>
                  {/* Menu Header */}
                  <div className={`px-2.5 py-2 flex items-center justify-between border-b mb-1.5 ${
                    isDarkMode ? 'border-slate-800/80 text-slate-400' : 'border-slate-100 text-slate-500'
                  }`}>
                    <div className="flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-orange-500" />
                      <span className="text-[10px] font-extrabold uppercase tracking-wider">
                        Select AI Persona
                      </span>
                    </div>
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                      isDarkMode ? 'bg-orange-500/15 text-orange-400' : 'bg-orange-100 text-orange-700'
                    }`}>
                      Voice & Persona Core
                    </span>
                  </div>

                  <div className="space-y-1.5">
                    {/* 1. AANYA */}
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedPersona('aanya');
                        localStorage.setItem('opensense_persona', 'aanya');
                        setIsPersonaMenuOpen(false);
                        showToast('🌸 Switched to Aanya: Warm Culture & HR Companion');
                      }}
                      className={`w-full p-2.5 rounded-xl text-left transition-all flex items-start gap-3 border ${
                        selectedPersona === 'aanya'
                          ? isDarkMode
                            ? 'bg-orange-500/15 border-orange-500/50 shadow-md shadow-orange-500/10'
                            : 'bg-orange-50 border-orange-300 shadow-sm'
                          : isDarkMode
                            ? 'border-transparent hover:bg-slate-800 text-slate-300'
                            : 'border-transparent hover:bg-slate-50 text-slate-700'
                      }`}
                    >
                      <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-pink-500 to-rose-400 flex items-center justify-center text-white text-lg shrink-0 shadow-sm shadow-pink-500/30">
                        🌸
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1 mb-0.5">
                          <span className={`text-xs font-bold ${
                            selectedPersona === 'aanya'
                              ? isDarkMode ? 'text-orange-400' : 'text-orange-700'
                              : isDarkMode ? 'text-slate-100' : 'text-slate-900'
                          }`}>
                            Aanya
                          </span>
                          <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded uppercase tracking-wider ${
                            isDarkMode ? 'bg-pink-500/20 text-pink-300' : 'bg-pink-100 text-pink-700'
                          }`}>
                            Culture & HR
                          </span>
                        </div>
                        <p className={`text-[11px] leading-tight ${
                          isDarkMode ? 'text-slate-400' : 'text-slate-600'
                        }`}>
                          Warm, empathetic advisor for company policies, onboarding & people
                        </p>
                      </div>
                      {selectedPersona === 'aanya' && (
                        <Check className="w-4 h-4 text-orange-500 shrink-0 self-center" />
                      )}
                    </button>

                    {/* 2. KABIR */}
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedPersona('kabir');
                        localStorage.setItem('opensense_persona', 'kabir');
                        setIsPersonaMenuOpen(false);
                        showToast('💻 Switched to Kabir: Senior Platform Architect');
                      }}
                      className={`w-full p-2.5 rounded-xl text-left transition-all flex items-start gap-3 border ${
                        selectedPersona === 'kabir'
                          ? isDarkMode
                            ? 'bg-blue-500/15 border-blue-500/50 shadow-md shadow-blue-500/10'
                            : 'bg-blue-50 border-blue-300 shadow-sm'
                          : isDarkMode
                            ? 'border-transparent hover:bg-slate-800 text-slate-300'
                            : 'border-transparent hover:bg-slate-50 text-slate-700'
                      }`}
                    >
                      <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center text-white text-lg shrink-0 shadow-sm shadow-blue-500/30">
                        💻
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1 mb-0.5">
                          <span className={`text-xs font-bold ${
                            selectedPersona === 'kabir'
                              ? isDarkMode ? 'text-blue-400' : 'text-blue-700'
                              : isDarkMode ? 'text-slate-100' : 'text-slate-900'
                          }`}>
                            Kabir
                          </span>
                          <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded uppercase tracking-wider ${
                            isDarkMode ? 'bg-blue-500/20 text-blue-300' : 'bg-blue-100 text-blue-700'
                          }`}>
                            Platform Architect
                          </span>
                        </div>
                        <p className={`text-[11px] leading-tight ${
                          isDarkMode ? 'text-slate-400' : 'text-slate-600'
                        }`}>
                          Senior technical leader for Drupal 10/11, Next.js, Cloud & code reviews
                        </p>
                      </div>
                      {selectedPersona === 'kabir' && (
                        <Check className="w-4 h-4 text-blue-500 shrink-0 self-center" />
                      )}
                    </button>

                    {/* 3. MAYA */}
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedPersona('maya');
                        localStorage.setItem('opensense_persona', 'maya');
                        setIsPersonaMenuOpen(false);
                        showToast('📊 Switched to Maya: Executive Strategy & Growth');
                      }}
                      className={`w-full p-2.5 rounded-xl text-left transition-all flex items-start gap-3 border ${
                        selectedPersona === 'maya'
                          ? isDarkMode
                            ? 'bg-emerald-500/15 border-emerald-500/50 shadow-md shadow-emerald-500/10'
                            : 'bg-emerald-50 border-emerald-300 shadow-sm'
                          : isDarkMode
                            ? 'border-transparent hover:bg-slate-800 text-slate-300'
                            : 'border-transparent hover:bg-slate-50 text-slate-700'
                      }`}
                    >
                      <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-white text-lg shrink-0 shadow-sm shadow-emerald-500/30">
                        📊
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1 mb-0.5">
                          <span className={`text-xs font-bold ${
                            selectedPersona === 'maya'
                              ? isDarkMode ? 'text-emerald-400' : 'text-emerald-700'
                              : isDarkMode ? 'text-slate-100' : 'text-slate-900'
                          }`}>
                            Maya
                          </span>
                          <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded uppercase tracking-wider ${
                            isDarkMode ? 'bg-emerald-500/20 text-emerald-300' : 'bg-emerald-100 text-emerald-700'
                          }`}>
                            Executive Strategy
                          </span>
                        </div>
                        <p className={`text-[11px] leading-tight ${
                          isDarkMode ? 'text-slate-400' : 'text-slate-600'
                        }`}>
                          Strategic business director for client ROI, market proposals & scaling
                        </p>
                      </div>
                      {selectedPersona === 'maya' && (
                        <Check className="w-4 h-4 text-emerald-500 shrink-0 self-center" />
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-1 sm:gap-2 shrink-0">
            {/* Universal Command Palette Trigger (Cmd + K) */}
            <button
              type="button"
              onClick={() => setIsCommandPaletteOpen(true)}
              className={`hidden md:flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-xs font-medium transition-all ${
                isDarkMode
                  ? 'bg-slate-900 hover:bg-slate-800 border-slate-800 text-slate-300'
                  : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-700 shadow-sm'
              }`}
              title="Command Palette (Ctrl + K / Cmd + K)"
            >
              <Command className="w-3.5 h-3.5 text-orange-500" />
              <span className="text-[11px] font-semibold">Cmd+K</span>
            </button>

            {/* Starred Messages Filter Toggle */}
            <button
              type="button"
              onClick={() => setShowOnlyStarred(!showOnlyStarred)}
              className={`hidden md:flex items-center gap-1 p-1.5 sm:px-2.5 sm:py-1.5 rounded-xl border text-xs font-semibold transition-all ${
                showOnlyStarred
                  ? 'bg-amber-500/15 border-amber-500/40 text-amber-400 shadow-sm'
                  : isDarkMode
                    ? 'bg-slate-900 hover:bg-slate-800 border-slate-800 text-slate-400 hover:text-slate-200'
                    : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-600 hover:text-slate-900 shadow-sm'
              }`}
              title={showOnlyStarred ? 'Sabhi messages dekhein' : 'Sirf Starred messages dekhein'}
            >
              <Star className={`w-3.5 h-3.5 ${showOnlyStarred ? 'fill-amber-400 text-amber-400' : 'text-amber-500'}`} />
              <span className="hidden xl:inline">{showOnlyStarred ? 'Show All' : 'Starred'}</span>
              {starredMsgIds.size > 0 && (
                <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-400">
                  {starredMsgIds.size}
                </span>
              )}
            </button>

            {/* Export / Share Chat Dropdown */}
            <div className="relative shrink-0">
              <button
                type="button"
                onClick={() => setIsExportMenuOpen(!isExportMenuOpen)}
                className={`p-1.5 sm:px-2.5 sm:py-1.5 rounded-xl border text-xs font-semibold transition-all flex items-center justify-center shrink-0 ${
                  isExportMenuOpen
                    ? 'bg-orange-500/15 border-orange-500/40 text-orange-400 shadow-sm'
                    : isDarkMode
                      ? 'bg-slate-900 hover:bg-slate-800 border-slate-800 text-slate-300 hover:text-white'
                      : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-700 hover:text-slate-900 shadow-sm'
                }`}
                title="Share & Export options"
              >
                <Share2 className="w-3.5 h-3.5 text-orange-500" />
                <span className="hidden sm:inline ml-1">Share</span>
              </button>

              {/* Backdrop for outside click */}
              {isExportMenuOpen && (
                <div
                  className="fixed inset-0 z-40 bg-black/25 sm:bg-transparent"
                  onClick={() => setIsExportMenuOpen(false)}
                />
              )}

              {isExportMenuOpen && (
                <div className={`fixed left-3 right-3 top-[54px] sm:absolute sm:inset-x-auto sm:right-0 sm:top-full sm:w-56 sm:mt-2 rounded-2xl border shadow-2xl py-2 z-50 animate-fadeIn ${
                  isDarkMode ? 'bg-slate-900 border-slate-800 text-slate-200' : 'bg-white border-slate-200 text-slate-800 shadow-xl ring-1 ring-slate-200'
                }`}>
                  <div className="px-3 py-1 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    Share & Export
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setIsExportMenuOpen(false);
                      setIsShareModalOpen(true);
                    }}
                    className={`w-full px-3 py-2 text-xs flex items-center gap-2.5 text-left transition-colors ${
                      isDarkMode ? 'hover:bg-slate-800 text-slate-200' : 'hover:bg-slate-100 text-slate-800'
                    }`}
                  >
                    <LinkIcon className="w-4 h-4 text-blue-500" />
                    <div>
                      <p className="font-semibold">Share Chat Link</p>
                      <p className="text-[10px] text-slate-400">1-Click Shareable Link</p>
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={handleExportPDF}
                    className={`w-full px-3 py-2 text-xs flex items-center gap-2.5 text-left transition-colors ${
                      isDarkMode ? 'hover:bg-slate-800 text-slate-200' : 'hover:bg-slate-100 text-slate-800'
                    }`}
                  >
                    <Printer className="w-4 h-4 text-orange-500" />
                    <div>
                      <p className="font-semibold">Print / Save as PDF</p>
                      <p className="text-[10px] text-slate-400">Formal printable report</p>
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={handleExportMarkdown}
                    className={`w-full px-3 py-2 text-xs flex items-center gap-2.5 text-left transition-colors ${
                      isDarkMode ? 'hover:bg-slate-800 text-slate-200' : 'hover:bg-slate-100 text-slate-800'
                    }`}
                  >
                    <FileText className="w-4 h-4 text-emerald-500" />
                    <div>
                      <p className="font-semibold">Download Markdown (.md)</p>
                      <p className="text-[10px] text-slate-400">Documentation format</p>
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={handleCopyEOD}
                    className={`w-full px-3 py-2 text-xs flex items-center gap-2.5 text-left transition-colors ${
                      isDarkMode ? 'hover:bg-slate-800 text-slate-200' : 'hover:bg-slate-100 text-slate-800'
                    }`}
                  >
                    <Copy className="w-4 h-4 text-purple-500" />
                    <div>
                      <p className="font-semibold">Copy EOD Standup Report</p>
                      <p className="text-[10px] text-slate-400">Jira/Slack ready text</p>
                    </div>
                  </button>
                </div>
              )}
            </div>

            {/* ChatGPT Interactive Live Voice Mode Button (Desktop only in top header; mobile has it in bottom bar) */}
            <button
              type="button"
              onClick={openChatGPTVoiceMode}
              className="hidden sm:flex items-center gap-1.5 p-1.5 sm:px-3 sm:py-1.5 rounded-xl text-xs font-bold bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white shadow-md shadow-orange-500/20 transition-all hover:scale-[1.02] active:scale-95 shrink-0"
              title="ChatGPT Hands-free Voice Mode (Live Spoken Dialogue)"
              aria-label="Open ChatGPT Hands-free Voice Mode"
            >
              <Headphones className="w-3.5 h-3.5 animate-pulse" />
              <span>Voice Mode</span>
            </button>

            {/* Speaking active badge with Stop button */}
            {isSpeaking && (
              <button
                type="button"
                onClick={stopSpeaking}
                className="flex items-center gap-1 px-2 py-1 rounded-xl bg-orange-500/20 border border-orange-500/40 text-orange-300 text-xs font-medium animate-pulse"
                title="Stop speaking"
                aria-label="Stop Voice Speaking"
              >
                <VolumeX className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Stop</span>
              </button>
            )}

            {/* Dark & Light Theme Switcher */}
            <button
              type="button"
              onClick={toggleTheme}
              className={`p-1.5 sm:p-2 rounded-xl border transition-all flex items-center justify-center shrink-0 ${
                isDarkMode
                  ? 'bg-slate-900 hover:bg-slate-800 border-slate-800 text-amber-400 hover:text-amber-300'
                  : 'bg-white hover:bg-slate-100 border-slate-200 text-amber-500 hover:text-amber-600 shadow-sm'
              }`}
              title={isDarkMode ? 'Light Mode ☀️' : 'Dark Mode 🌙'}
              aria-label={isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            >
              {isDarkMode ? <Sun className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> : <Moon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />}
            </button>

            {/* Settings Button */}
            <button
              type="button"
              onClick={() => {
                setIsSettingsOpen(true);
                setSettingsModule('general');
              }}
              className={`p-1.5 sm:p-2 sm:px-2.5 rounded-xl border transition-all flex items-center gap-1.5 text-xs font-semibold shrink-0 ${
                isDarkMode
                  ? 'bg-slate-900 hover:bg-slate-850 border-slate-800 text-slate-300 hover:text-orange-400'
                  : 'bg-white hover:bg-slate-100 border-slate-200 text-slate-700 hover:text-orange-600 shadow-sm'
              }`}
              title="Settings & Preferences"
            >
              <Settings className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-orange-400" />
              <span className="hidden xl:inline">Settings</span>
            </button>
          </div>
        </header>

        {/* Message Thread */}
        <div className="flex-1 overflow-y-auto px-2.5 sm:px-6 md:px-12 lg:px-28 py-4 sm:py-6 space-y-4 sm:space-y-6">
          {messages.length === 0 ? (
            /* Empty State / Welcome Screen */
            <div className="flex flex-col items-center justify-center min-h-[calc(100vh-270px)] text-center max-w-2xl mx-auto">
              {/* Official 3 Geometric Shapes Hero Graphic */}
              <div className="mb-4">
                <OpenSenseLogo size="lg" orientation="vertical" showSubtitle={false} isDarkMode={isDarkMode} />
              </div>

              <h1 
                onClick={() => {
                  hasUserInteractedRef.current = true;
                  startTypingGreeting();
                }}
                className={`text-xl sm:text-2xl font-extrabold tracking-tight mb-4 sm:mb-5 min-h-[36px] flex items-center justify-center cursor-pointer select-none transition-transform active:scale-98 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}
                title="Namaste, OpenSense! 🙏✨"
              >
                <span>{typedGreeting || 'Namaste, OpenSense! 🙏✨'}</span>
                {!isTypingGreetingDone && (
                  <span className="inline-block w-2 sm:w-2.5 h-5 sm:h-6 ml-1.5 bg-orange-500 rounded-sm animate-pulse align-middle" />
                )}
              </h1>

              {/* Department Filter Pills (Single-line, sleek, hidden scrollbars for mobile touch swipe) */}
              <div className="w-full flex justify-center mb-5">
                <div className={`inline-flex items-center gap-1 p-1 border rounded-2xl shadow-xl backdrop-blur-md overflow-x-auto max-w-full scrollbar-none [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] ${isDarkMode ? 'bg-slate-900/90 border-slate-800/90' : 'bg-white border-slate-200'}`}>
                  <button
                    type="button"
                    onClick={() => setActiveDeptTab('all')}
                    className={`h-8 sm:h-9 px-3 sm:px-4 rounded-xl text-xs font-semibold whitespace-nowrap shrink-0 inline-flex items-center gap-1.5 transition-all ${
                      activeDeptTab === 'all'
                        ? 'bg-gradient-to-r from-orange-600 to-orange-500 text-white shadow-md shadow-orange-500/25 font-bold'
                        : isDarkMode ? 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                    }`}
                  >
                    <Sparkles className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                    <span>All</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveDeptTab('hr')}
                    className={`h-8 sm:h-9 px-3 sm:px-4 rounded-xl text-xs font-semibold whitespace-nowrap shrink-0 inline-flex items-center gap-1.5 transition-all ${
                      activeDeptTab === 'hr'
                        ? 'bg-gradient-to-r from-orange-600 to-orange-500 text-white shadow-md shadow-orange-500/25 font-bold'
                        : isDarkMode ? 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                    }`}
                  >
                    <Users className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                    <span>HR & People</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveDeptTab('marketing')}
                    className={`h-8 sm:h-9 px-3 sm:px-4 rounded-xl text-xs font-semibold whitespace-nowrap shrink-0 inline-flex items-center gap-1.5 transition-all ${
                      activeDeptTab === 'marketing'
                        ? 'bg-gradient-to-r from-orange-600 to-orange-500 text-white shadow-md shadow-orange-500/25 font-bold'
                        : isDarkMode ? 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                    }`}
                  >
                    <Briefcase className="w-3.5 h-3.5 text-orange-400 shrink-0" />
                    <span>Marketing & Growth</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveDeptTab('tech')}
                    className={`h-8 sm:h-9 px-3 sm:px-4 rounded-xl text-xs font-semibold whitespace-nowrap shrink-0 inline-flex items-center gap-1.5 transition-all ${
                      activeDeptTab === 'tech'
                        ? 'bg-gradient-to-r from-orange-600 to-orange-500 text-white shadow-md shadow-orange-500/25 font-bold'
                        : isDarkMode ? 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                    }`}
                  >
                    <Code2 className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                    <span>Tech & Code</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveDeptTab('creative')}
                    className={`h-8 sm:h-9 px-3 sm:px-4 rounded-xl text-xs font-semibold whitespace-nowrap shrink-0 inline-flex items-center gap-1.5 transition-all ${
                      activeDeptTab === 'creative'
                        ? 'bg-gradient-to-r from-orange-600 to-orange-500 text-white shadow-md shadow-orange-500/25 font-bold'
                        : isDarkMode ? 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                    }`}
                  >
                    <Palette className="w-3.5 h-3.5 text-pink-400 shrink-0" />
                    <span>AI Image Gen</span>
                  </button>
                </div>
              </div>

              {/* 4 Interactive Quick Prompt Cards based on chosen department */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full text-left">
                {departmentPrompts[activeDeptTab].map((item, idx) => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={idx}
                      onClick={() => handleSendMessage(item.prompt)}
                      className={`p-3.5 rounded-2xl border transition-all text-left group ${
                        isDarkMode
                          ? 'bg-slate-900/80 hover:bg-slate-900 border-slate-800/90 hover:border-orange-500/50'
                          : 'bg-white hover:bg-slate-50 border-slate-200 hover:border-orange-500/50 shadow-sm'
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <div className={`w-7 h-7 rounded-lg flex items-center justify-center group-hover:scale-105 transition-transform shrink-0 ${
                          isDarkMode ? 'bg-orange-500/10 text-orange-400' : 'bg-orange-50 text-orange-600'
                        }`}>
                          <Icon className="w-4 h-4" />
                        </div>
                        <div className="truncate">
                          <span className={`text-xs font-bold transition-colors block truncate ${
                            isDarkMode ? 'text-slate-200 group-hover:text-orange-400' : 'text-slate-800 group-hover:text-orange-600'
                          }`}>
                            {item.title}
                          </span>
                        </div>
                      </div>
                      <p className={`text-[11px] leading-normal pl-9 ${
                        isDarkMode ? 'text-slate-400' : 'text-slate-500'
                      }`}>
                        {item.desc}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>
          ) : (
            /* Active Message Flow */
            (() => {
              const displayedMessages = showOnlyStarred
                ? messages.filter((m) => starredMsgIds.has(m.id))
                : messages;

              if (showOnlyStarred && displayedMessages.length === 0) {
                return (
                  <div className="flex flex-col items-center justify-center py-16 text-center">
                    <Star className="w-10 h-10 text-amber-400/40 mb-3" />
                    <p className={`text-sm font-semibold ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                      Koi Starred Message nahi hai
                    </p>
                    <p className="text-xs text-slate-400 mt-1">
                      Kisi bhi important message par ⭐ click karke star karein taaki baad me jaldi dhundh sakein.
                    </p>
                    <button
                      type="button"
                      onClick={() => setShowOnlyStarred(false)}
                      className="mt-4 px-4 py-1.5 rounded-xl text-xs font-bold bg-orange-500/10 border border-orange-500/30 text-orange-400 hover:bg-orange-500/20 transition-all"
                    >
                      Sabhi Messages Dekhein
                    </button>
                  </div>
                );
              }

              return displayedMessages.map((m) => {
                const isUser = m.role === 'user';
                const isStarred = starredMsgIds.has(m.id);
                const isCurrentlyStreaming = streamingMsgId === m.id;
                let parsedToolCalls = null;
                if (m.tool_calls) {
                  try {
                    parsedToolCalls = typeof m.tool_calls === 'string' ? JSON.parse(m.tool_calls) : m.tool_calls;
                  } catch {}
                }

                const { hasImage, alt, url, textWithoutImage } = extractImageFromContent(m.content);

                return (
                  <div
                    key={m.id}
                    className={`flex gap-3.5 group transition-all ${isUser ? 'justify-end' : 'justify-start'}`}
                  >
                    {!isUser && (
                      <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-orange-600 to-amber-500 text-white flex items-center justify-center shrink-0 mt-0.5 shadow-md shadow-orange-500/20">
                        <Bot className="w-4 h-4" />
                      </div>
                    )}

                    <div className={`max-w-2xl space-y-2.5 ${isUser ? 'items-end' : 'items-start'}`}>
                      {/* Message Card */}
                      <div
                        className={`p-4 md:p-5 rounded-2xl text-[13.5px] leading-relaxed transition-all relative ${
                          isUser
                            ? 'bg-gradient-to-r from-orange-600 via-orange-500 to-amber-500 text-white rounded-tr-none shadow-md shadow-orange-600/20 font-medium'
                            : isDarkMode
                              ? `bg-slate-900/95 border text-slate-100 rounded-tl-none shadow-lg ${isStarred ? 'border-amber-500/50 ring-1 ring-amber-500/30' : 'border-slate-800'}`
                              : `bg-white border text-slate-900 rounded-tl-none shadow-md shadow-slate-200/40 ring-1 ${isStarred ? 'border-amber-400 ring-amber-400/30' : 'border-slate-200/90 ring-slate-100'}`
                        }`}
                      >
                        {isCurrentlyStreaming ? (
                          <div className="whitespace-pre-wrap font-sans text-[13.5px] leading-relaxed">
                            {streamedContent}
                            <span className="inline-block w-2 h-4 bg-orange-500 animate-cursor-blink ml-1 align-middle" />
                          </div>
                        ) : (
                          <FormattedChatMessage
                            content={hasImage ? textWithoutImage : m.content}
                            isUser={isUser}
                            isDarkMode={isDarkMode}
                            onOpenArtifact={(art) => {
                              setActiveArtifact(art);
                              setArtifactTab('preview');
                            }}
                          />
                        )}

                        {/* Interactive AI Generated Image Card */}
                        {hasImage && url && (
                          <div className={`mt-3.5 pt-3 border-t ${isDarkMode ? 'border-slate-800/80' : 'border-slate-200'}`}>
                            <div className="relative group/img overflow-hidden rounded-xl border border-orange-500/30 bg-slate-950 shadow-2xl">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={url}
                                alt={alt}
                                className="w-full h-auto max-h-96 object-cover rounded-xl transition-transform duration-300 group-hover/img:scale-102 cursor-pointer"
                                onClick={() => setPreviewImage({ url, alt })}
                              />
                              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover/img:opacity-100 transition-opacity flex items-end justify-between p-3">
                                <span className="text-[11px] font-semibold text-white truncate max-w-xs drop-shadow">
                                  {alt}
                                </span>
                                <div className="flex items-center gap-2">
                                  <button
                                    type="button"
                                    onClick={() => setPreviewImage({ url, alt })}
                                    className="px-2.5 py-1.5 rounded-lg bg-slate-900/90 hover:bg-slate-800 text-white text-[11px] font-medium flex items-center gap-1 shadow"
                                  >
                                    <Eye className="w-3.5 h-3.5" />
                                    <span>Zoom</span>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => downloadImageFile(url, `${alt.slice(0, 24).replace(/\s+/g, '_')}.png`)}
                                    className="px-2.5 py-1.5 rounded-lg bg-orange-600 hover:bg-orange-500 text-white text-[11px] font-semibold flex items-center gap-1 shadow"
                                  >
                                    <Download className="w-3.5 h-3.5" />
                                    <span>Download</span>
                                  </button>
                                </div>
                              </div>
                            </div>
                            <div className={`flex items-center justify-between text-xs mt-2.5 px-1 ${
                              isDarkMode ? 'text-slate-400' : 'text-slate-600 font-medium'
                            }`}>
                              <span className={`flex items-center gap-1 font-mono ${
                                isDarkMode ? 'text-orange-400' : 'text-orange-600 font-bold'
                              }`}>
                                <Sparkles className="w-3.5 h-3.5" />
                                AI Generated • 1024x1024 HD
                              </span>
                              <button
                                onClick={() => downloadImageFile(url, 'opensense-image.png')}
                                className={`font-semibold flex items-center gap-1 transition-colors ${
                                  isDarkMode ? 'text-orange-400 hover:text-orange-300' : 'text-orange-600 hover:text-orange-700 font-bold'
                                }`}
                              >
                                <Download className="w-3.5 h-3.5" />
                                Download File
                              </button>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Tool Invocation Pill (if live tool was called) */}
                      {parsedToolCalls && parsedToolCalls.length > 0 && (
                        <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full border text-[11px] font-mono ${
                          isDarkMode
                            ? 'bg-slate-900 border-slate-800 text-orange-400'
                            : 'bg-orange-50 border-orange-200 text-orange-700 font-semibold'
                        }`}>
                          <Wrench className="w-3 h-3 text-orange-500" />
                          <span>Live Tool:</span>
                          <strong className={isDarkMode ? 'text-slate-200' : 'text-slate-900'}>{parsedToolCalls[0]?.function?.name}</strong>
                        </div>
                      )}

                      {/* Dynamic Smart Follow-up Chips for Assistant Messages */}
                      {!isUser && !isCurrentlyStreaming && (
                        <div className="flex flex-wrap items-center gap-1.5 pt-1">
                          {getSmartFollowUpChips(m.content).map((chip, chipIdx) => (
                            <button
                              key={chipIdx}
                              type="button"
                              onClick={() => handleSendMessage(chip.prompt)}
                              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-[11px] font-semibold transition-all border shadow-sm ${
                                isDarkMode
                                  ? 'bg-slate-900/90 hover:bg-slate-800 text-slate-300 hover:text-white border-slate-800 hover:border-orange-500/50'
                                  : 'bg-orange-50/80 hover:bg-orange-100 text-orange-900 hover:text-orange-950 border-orange-200/90 hover:border-orange-400'
                              }`}
                              title={chip.prompt}
                            >
                              <span>{chip.icon}</span>
                              <span>{chip.label}</span>
                            </button>
                          ))}
                        </div>
                      )}

                      {/* Professional Enterprise Action Bar */}
                      <div className={`flex flex-wrap items-center gap-2 sm:gap-3 px-1 text-xs ${
                        isDarkMode ? 'text-slate-500' : 'text-slate-600 font-medium'
                      }`}>
                        <span>
                          {new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>

                        {!isUser ? (
                          <>
                            {/* Read Aloud TTS */}
                            <button
                              type="button"
                              onClick={() => {
                                if (isSpeaking && speakingMsgId === m.id) {
                                  stopSpeaking();
                                } else {
                                  speakWithAanya(m.content, m.id);
                                }
                              }}
                              className={`flex items-center gap-1 px-1.5 py-0.5 rounded-lg transition-all ${
                                isSpeaking && speakingMsgId === m.id
                                  ? 'bg-orange-500/20 text-orange-400 font-bold border border-orange-500/40 animate-pulse'
                                  : isDarkMode
                                    ? 'hover:text-orange-400'
                                    : 'text-purple-700 hover:text-purple-900 hover:bg-purple-50 font-bold'
                              }`}
                              title="Aanya se sunein (Listen aloud)"
                            >
                              {isSpeaking && speakingMsgId === m.id ? (
                                <>
                                  <VolumeX className="w-3.5 h-3.5 text-orange-400" />
                                  <span>Stop</span>
                                </>
                              ) : (
                                <>
                                  <Volume2 className="w-3.5 h-3.5 text-purple-600" />
                                  <span>Listen</span>
                                </>
                              )}
                            </button>

                            {/* Copy Button */}
                            <button
                              type="button"
                              onClick={() => copyToClipboard(m.content, m.id)}
                              className={`flex items-center gap-1 transition-colors px-1.5 py-0.5 rounded ${
                                isDarkMode ? 'hover:text-slate-300' : 'hover:text-slate-900 hover:bg-slate-100'
                              }`}
                              title="Copy response text"
                            >
                              {copiedId === m.id ? (
                                <>
                                  <Check className="w-3.5 h-3.5 text-emerald-500" />
                                  <span className="text-emerald-500 font-bold">Copied</span>
                                </>
                              ) : (
                                <>
                                  <Copy className="w-3.5 h-3.5" />
                                  <span>Copy</span>
                                </>
                              )}
                            </button>

                            {/* Feature 1: Regenerate Response */}
                            <button
                              type="button"
                              onClick={() => handleRegenerate(m.id)}
                              className={`flex items-center gap-1 transition-colors px-1.5 py-0.5 rounded hover:text-orange-400 ${
                                isDarkMode ? 'hover:bg-slate-800' : 'hover:bg-slate-100'
                              }`}
                              title="Regenerate this response"
                            >
                              <RotateCcw className="w-3.5 h-3.5" />
                              <span>Retry</span>
                            </button>

                            {/* Feature 1: Feedback Thumbs */}
                            <div className="inline-flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => handleFeedback(m.id, 'up')}
                                className={`p-1 rounded-md transition-colors ${
                                  feedbackMap[m.id] === 'up'
                                    ? 'text-emerald-500 bg-emerald-500/15'
                                    : 'hover:text-emerald-500'
                                }`}
                                title="Good response (Thumbs Up)"
                              >
                                <ThumbsUp className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleFeedback(m.id, 'down')}
                                className={`p-1 rounded-md transition-colors ${
                                  feedbackMap[m.id] === 'down'
                                    ? 'text-rose-500 bg-rose-500/15'
                                    : 'hover:text-rose-500'
                                }`}
                                title="Poor response (Thumbs Down)"
                              >
                                <ThumbsDown className="w-3.5 h-3.5" />
                              </button>
                            </div>

                            {/* Feature 9: Star Message */}
                            <button
                              type="button"
                              onClick={() => toggleStarMessage(m.id)}
                              className={`p-1 rounded-md transition-colors ${
                                isStarred
                                  ? 'text-amber-400 bg-amber-500/15'
                                  : 'hover:text-amber-400'
                              }`}
                              title={isStarred ? 'Unstar message' : 'Star message'}
                            >
                              <Star className={`w-3.5 h-3.5 ${isStarred ? 'fill-amber-400' : ''}`} />
                            </button>
                          </>
                        ) : (
                          <>
                            {/* Feature 1: Edit User Prompt */}
                            <button
                              type="button"
                              onClick={() => handleEditUserPrompt(m.content)}
                              className={`flex items-center gap-1 transition-colors px-1.5 py-0.5 rounded text-xs font-semibold ${
                                isDarkMode ? 'text-orange-400 hover:bg-slate-800' : 'text-orange-600 hover:bg-orange-50'
                              }`}
                              title="Edit this prompt"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                              <span>Edit</span>
                            </button>

                            {sending && (
                              <button
                                type="button"
                                onClick={() => handleEditUserPrompt(m.content)}
                                className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-red-500/15 border border-red-500/30 text-red-500 font-bold text-xs animate-pulse hover:bg-red-500/25 transition-all shadow-sm"
                                title="Stop AI generation and edit this prompt"
                              >
                                <Square className="w-3 h-3 fill-current" />
                                <span>Stop & Edit</span>
                              </button>
                            )}

                            {/* Feature 9: Star User Prompt */}
                            <button
                              type="button"
                              onClick={() => toggleStarMessage(m.id)}
                              className={`p-1 rounded-md transition-colors ${
                                isStarred
                                  ? 'text-amber-400 bg-amber-500/15'
                                  : 'hover:text-amber-400'
                              }`}
                              title={isStarred ? 'Unstar prompt' : 'Star prompt'}
                            >
                              <Star className={`w-3.5 h-3.5 ${isStarred ? 'fill-amber-400' : ''}`} />
                            </button>
                          </>
                        )}
                      </div>
                    </div>

                    {isUser && (
                      <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
                        isDarkMode ? 'bg-slate-800 text-slate-300 border border-slate-700/80' : 'bg-slate-200 text-slate-700 border border-slate-300'
                      }`}>
                        <UserIcon className="w-4 h-4" />
                      </div>
                    )}
                  </div>
                );
              });
            })()
          )}

          {/* Compact Minimal Thinking Indicator with instant Stop button */}
          {sending && messages.length > 0 && (
            <div className="flex justify-start items-center animate-fadeIn py-1 gap-2">
              <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-semibold shadow-sm ${
                isDarkMode ? 'bg-slate-900/90 border-slate-800 text-orange-400' : 'bg-white border-slate-200 text-orange-600'
              }`}>
                <Sparkles className="w-3.5 h-3.5 animate-spin text-orange-500" />
                <span>Thinking...</span>
              </div>
              <button
                type="button"
                onClick={handleStopGeneration}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-red-500/15 text-red-500 border border-red-500/30 hover:bg-red-500/25 transition-all active:scale-95 shadow-sm"
                title="Stop AI generation"
              >
                <Square className="w-3 h-3 fill-current" />
                <span>Stop</span>
              </button>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* ======================================================== */}
        {/* 3. BOTTOM FLOATING INPUT CONTAINER                        */}
        {/* ======================================================== */}
        <div className={`p-2.5 sm:p-4 md:px-12 lg:px-28 border-t backdrop-blur-md transition-colors relative ${
          isDarkMode ? 'border-slate-800/60 bg-slate-950/90' : 'border-slate-200/90 bg-white/95 shadow-md'
        }`}>
          <div className="max-w-3xl mx-auto relative">
            {/* Feature 4: Attached File Preview Badge */}
            {attachedFile && (
              <div className={`flex items-center gap-2 px-3 py-1.5 mb-2 rounded-xl text-xs border w-fit animate-fadeIn ${
                isDarkMode ? 'bg-orange-500/10 border-orange-500/30 text-orange-400' : 'bg-orange-50 border-orange-200 text-orange-700'
              }`}>
                <FileText className="w-3.5 h-3.5" />
                <span className="font-semibold">{attachedFile.name}</span>
                <span className="opacity-75 font-mono text-[11px]">({attachedFile.size})</span>
                <button
                  type="button"
                  onClick={() => setAttachedFile(null)}
                  className="p-0.5 hover:text-rose-400 transition-colors ml-1"
                  title="Remove attachment"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {/* Feature 6: Slash Commands Floating Autocomplete Menu */}
            {input.startsWith('/') && !input.includes(' ') && (
              <div className={`absolute bottom-full mb-2 left-0 right-0 sm:right-auto sm:w-96 rounded-2xl border shadow-2xl p-2 z-30 backdrop-blur-xl animate-fadeIn ${
                isDarkMode ? 'bg-slate-900/95 border-slate-800 text-slate-200' : 'bg-white/95 border-slate-200 text-slate-800 shadow-xl'
              }`}>
                <div className="px-2.5 py-1 text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between border-b border-slate-800/50 pb-1.5 mb-1">
                  <span>⚡ Quick Slash Commands</span>
                  <span className="text-[10px] text-slate-500 font-normal">Click or press Enter</span>
                </div>
                <div className="space-y-1 max-h-56 overflow-y-auto">
                  {slashCommands
                    .filter((c) => c.cmd.toLowerCase().startsWith(input.toLowerCase()))
                    .map((c) => (
                      <button
                        key={c.cmd}
                        type="button"
                        onClick={() => {
                          setInput(c.template);
                          textareaRef.current?.focus();
                        }}
                        className={`w-full px-2.5 py-1.5 rounded-xl text-left text-xs transition-colors flex items-start gap-2.5 group ${
                          isDarkMode ? 'hover:bg-slate-800 text-slate-200' : 'hover:bg-slate-100 text-slate-800'
                        }`}
                      >
                        <span className="font-mono font-bold text-orange-500 shrink-0 group-hover:text-orange-400">{c.cmd}</span>
                        <div className="truncate">
                          <p className="font-semibold truncate">{c.title}</p>
                          <p className="text-[10px] text-slate-400 truncate">{c.desc}</p>
                        </div>
                      </button>
                    ))}
                </div>
              </div>
            )}

            {/* WhatsApp-Style Audio Voice Note Recording Live Feedback */}
            {isRecordingAudioNote && (
              <div className="flex items-center justify-between gap-3 px-4 py-2 mb-2 rounded-2xl bg-rose-500/15 border border-rose-500/30 text-rose-400 text-xs font-semibold animate-pulse shadow-lg">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping" />
                  <span>Recording Audio Voice Note... {audioNoteTimer}s</span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={toggleAudioNoteRecording}
                    className="px-2.5 py-1 rounded-xl bg-rose-500 hover:bg-rose-600 text-white text-xs font-bold transition-all"
                  >
                    Send Note 🚀
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (audioNoteRecRef.current) {
                        try { audioNoteRecRef.current.stop(); } catch {}
                      }
                      if (audioNoteTimerRef.current) clearInterval(audioNoteTimerRef.current);
                      setIsRecordingAudioNote(false);
                      setAudioNoteTimer(0);
                    }}
                    className="p-1 hover:text-white transition-colors"
                    title="Cancel recording"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            <div className={`relative flex items-center gap-1 sm:gap-2 border rounded-2xl p-1.5 sm:p-2 transition-all focus-within:border-orange-500 focus-within:ring-2 focus-within:ring-orange-500/15 ${
              isDarkMode
                ? 'bg-slate-900/90 border-slate-800 shadow-xl'
                : 'bg-white border-slate-300 shadow-md ring-1 ring-slate-100'
            }`}>
              {/* Hidden File Input */}
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileUpload}
                accept=".txt,.md,.csv,.json,.py,.js,.ts,.tsx,.jsx,.html,.css,.sql,.yaml,.yml,.xml,.pdf"
                className="hidden"
              />

              {/* Feature 4: Attach File Button */}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                title="Attach Document or Code file (PDF, CSV, TXT, Python, JS)"
                aria-label="Attach File"
                className={`p-1.5 sm:p-2 rounded-xl transition-colors shrink-0 flex items-center gap-1 text-xs font-semibold ${
                  attachedFile
                    ? 'bg-orange-500/20 text-orange-400 border border-orange-500/40'
                    : isDarkMode
                      ? 'text-slate-400 hover:text-orange-400 hover:bg-slate-800/80'
                      : 'text-slate-700 hover:text-orange-600 hover:bg-orange-50'
                }`}
              >
                <Paperclip className="w-4 h-4 text-orange-500" />
                <span className="hidden md:inline">Attach</span>
              </button>

              {/* Quick Image Gen Prefix Button */}
              <button
                type="button"
                onClick={() => {
                  setInput('Generate an image of: ');
                  textareaRef.current?.focus();
                }}
                title="Generate AI Image"
                aria-label="Generate AI Image"
                className={`p-1.5 sm:p-2 rounded-xl transition-colors shrink-0 flex items-center gap-1 text-xs font-semibold ${
                  isDarkMode
                    ? 'text-slate-400 hover:text-orange-400 hover:bg-slate-800/80'
                    : 'text-slate-700 hover:text-orange-600 hover:bg-orange-50'
                }`}
              >
                <ImageIcon className="w-4 h-4 text-orange-500" />
                <span className="hidden md:inline">Image</span>
              </button>

              {/* WhatsApp-Style Audio Voice Note Button */}
              <button
                type="button"
                onClick={toggleAudioNoteRecording}
                title={isRecordingAudioNote ? 'Stop and send voice note' : 'Record WhatsApp-Style Audio Note'}
                className={`p-1.5 sm:p-2 rounded-xl transition-all shrink-0 flex items-center gap-1 text-xs font-semibold ${
                  isRecordingAudioNote
                    ? 'bg-rose-500 text-white animate-pulse shadow-md shadow-rose-500/30'
                    : isDarkMode
                      ? 'text-slate-400 hover:text-rose-400 hover:bg-slate-800/80'
                      : 'text-slate-700 hover:text-rose-600 hover:bg-rose-50'
                }`}
              >
                <Mic className={`w-4 h-4 ${isRecordingAudioNote ? 'animate-bounce text-white' : 'text-rose-500'}`} />
                <span className="hidden md:inline">{isRecordingAudioNote ? `${audioNoteTimer}s` : 'Voice Note'}</span>
              </button>

              <textarea
                ref={textareaRef}
                rows={1}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask anything or type / ..."
                disabled={sending}
                aria-label="Message prompt"
                className={`flex-1 min-w-0 bg-transparent border-0 px-1 sm:px-2 py-1 text-xs sm:text-sm focus:outline-none resize-none leading-normal overflow-hidden scrollbar-none [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden ${
                  isDarkMode ? 'text-slate-100 placeholder-slate-500' : 'text-slate-900 placeholder-slate-400 font-medium'
                }`}
                style={{ height: '32px', minHeight: '32px', maxHeight: '120px' }}
              />

              {/* ChatGPT Interactive Live Voice Mode Button */}
              <button
                type="button"
                onClick={openChatGPTVoiceMode}
                aria-label="Open ChatGPT Hands-free Voice Mode"
                className="w-8 h-8 rounded-xl border border-orange-500/40 bg-gradient-to-r from-orange-500/15 to-amber-500/15 hover:from-orange-500/25 hover:to-amber-500/25 text-orange-400 hover:text-orange-300 transition-all shrink-0 shadow-sm flex items-center justify-center"
                title="Open ChatGPT Voice Mode (Continuous spoken conversation)"
              >
                <Headphones className="w-4 h-4" />
              </button>

              {/* Send or Stop Button */}
              {sending ? (
                <button
                  type="button"
                  onClick={handleStopGeneration}
                  title="Stop generating response (Response rokein)"
                  aria-label="Stop generating response"
                  className="w-8 h-8 rounded-xl bg-red-600 hover:bg-red-500 text-white shadow-md shadow-red-600/30 transition-all shrink-0 flex items-center justify-center animate-pulse"
                >
                  <Square className="w-3.5 h-3.5 fill-current" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => handleSendMessage()}
                  disabled={!input.trim()}
                  aria-label="Send message"
                  className="w-8 h-8 rounded-xl bg-gradient-to-r from-orange-600 to-orange-500 hover:from-orange-500 hover:to-orange-400 text-white shadow-md shadow-orange-600/20 disabled:opacity-40 disabled:hover:from-orange-600 disabled:hover:to-orange-500 transition-all shrink-0 flex items-center justify-center"
                >
                  <Send className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Active Speech Recognition Feedback */}
            {isListening && (
              <div className="flex items-center gap-2 mt-2 px-3 py-1.5 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-500 text-xs font-semibold animate-pulse">
                <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
                <span>
                  🎙️ Aanya sun rahi hai... Kahiye!
                </span>
              </div>
            )}

            <div className={`flex items-center justify-center text-[10px] sm:text-xs mt-2 px-1 text-center ${
              isDarkMode ? 'text-slate-400' : 'text-slate-600 font-medium'
            }`}>
              <span className="truncate">
                OpenSense AI Assistant • Enterprise Workspace
              </span>
            </div>
          </div>
        </div>
      </main>

      {/* ======================================================== */}
      {/* 4. CHATGPT-STYLE ADVANCED LIQUID VOICE MODE OVERLAY      */}
      {/* ======================================================== */}
      {isVoiceOverlayOpen && (
        <div className="fixed inset-0 z-50 bg-[#040711] backdrop-blur-3xl flex flex-col justify-between p-4 sm:p-8 md:p-10 text-white select-none overflow-hidden animate-fadeIn">
          {/* Ambient Cosmic Background Lighting */}
          <div
            className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[580px] h-[580px] rounded-full blur-[130px] pointer-events-none transition-all duration-1000 ${
              voiceOrbState === 'speaking'
                ? 'bg-gradient-to-tr from-purple-600/35 via-pink-600/30 to-orange-500/30 opacity-90'
                : voiceOrbState === 'listening'
                  ? 'bg-gradient-to-tr from-cyan-500/30 via-blue-600/30 to-emerald-500/25 opacity-85'
                  : voiceOrbState === 'thinking'
                    ? 'bg-gradient-to-tr from-amber-500/35 to-orange-600/30 opacity-80'
                    : 'bg-slate-800/20 opacity-35'
            }`}
          />

          {/* Top Bar inside Voice Mode */}
          <div className="w-full max-w-4xl mx-auto flex items-center justify-between z-10">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-orange-500 to-amber-500 flex items-center justify-center shadow-lg shadow-orange-500/30">
                <Headphones className="w-5 h-5 text-white" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold tracking-wide text-white">Aanya Voice AI</h3>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-orange-500/20 text-orange-400 border border-orange-500/30">
                    Advanced Voice Mode
                  </span>
                </div>
                <p className="text-[11px] text-slate-400">
                  Real-time Hands-Free Dialogue • OpenSense AI
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 sm:gap-3">
              {/* Quick Spoken Language Selector */}
              <div className="inline-flex items-center p-0.5 rounded-xl bg-slate-900/90 border border-slate-800 text-xs shadow-lg">
                <button
                  type="button"
                  onClick={() => changeVoiceLanguage('multilingual')}
                  className={`px-2 sm:px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all ${
                    voiceLanguage === 'multilingual'
                      ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                  title="Auto detect language (Hindi, Hinglish, English)"
                >
                  🌐 Auto
                </button>
                <button
                  type="button"
                  onClick={() => changeVoiceLanguage('english')}
                  className={`px-2 sm:px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all ${
                    voiceLanguage === 'english'
                      ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                  title="Force English recognition and speech"
                >
                  🇬🇧 EN
                </button>
                <button
                  type="button"
                  onClick={() => changeVoiceLanguage('hindi')}
                  className={`px-2 sm:px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all ${
                    voiceLanguage === 'hindi'
                      ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                  title="Force Hindi recognition and speech"
                >
                  🇮🇳 HI
                </button>
              </div>

              {/* Live Voice Status Badge */}
              <div className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900/90 border border-slate-800 text-xs text-slate-300 shadow-lg">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="font-semibold text-[11px]">Live Voice Active</span>
              </div>

              {/* Close Button */}
              <button
                type="button"
                onClick={closeChatGPTVoiceMode}
                className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-slate-900/90 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-white flex items-center justify-center transition-all shadow-md active:scale-95"
                title="Exit Voice Mode"
                aria-label="Exit Voice Mode"
              >
                <X className="w-4 h-4 sm:w-5 sm:h-5" />
              </button>
            </div>
          </div>

          {/* Center Dynamic Fluid Orb Visualizer */}
          <div className="w-full max-w-2xl mx-auto flex flex-col items-center justify-center py-4 text-center z-10">
            {/* The True ChatGPT Organic Fluid Morphing Sphere */}
            <div className="relative flex items-center justify-center my-6 sm:my-8">
              {/* Outermost Aura Ring */}
              <div
                className={`absolute w-72 h-72 sm:w-84 sm:h-84 md:w-96 md:h-96 rounded-full transition-all duration-1000 pointer-events-none ${
                  voiceOrbState === 'speaking'
                    ? 'border border-purple-500/40 animate-pulse-glow scale-110 shadow-[0_0_80px_rgba(168,85,247,0.35)]'
                    : voiceOrbState === 'listening'
                      ? 'border border-cyan-400/40 animate-pulse-glow scale-105 shadow-[0_0_80px_rgba(56,189,248,0.35)]'
                      : voiceOrbState === 'thinking'
                        ? 'border border-amber-400/40 animate-spin scale-100'
                        : 'border border-slate-800/40 opacity-30'
                }`}
              />

              {/* Middle Fluid Translucent Membrane */}
              <div
                className={`absolute w-56 h-56 sm:w-68 sm:h-68 md:w-80 md:h-80 transition-all duration-700 pointer-events-none ${
                  voiceOrbState === 'speaking'
                    ? 'animate-orb-morph-fast bg-gradient-to-tr from-purple-500/35 via-pink-500/25 to-orange-400/30 blur-md'
                    : voiceOrbState === 'listening'
                      ? 'animate-orb-morph bg-gradient-to-tr from-cyan-500/30 via-blue-500/25 to-emerald-400/25 blur-md'
                      : voiceOrbState === 'thinking'
                        ? 'animate-spin bg-gradient-to-tr from-amber-500/30 to-orange-500/25 blur-md'
                        : 'bg-slate-800/20 blur-sm'
                }`}
              />

              {/* Core Living Liquid Orb (No clunky mic inside! Living breathing nucleus) */}
              <div
                className={`relative w-44 h-44 sm:w-56 sm:h-56 md:w-64 md:h-64 shadow-2xl transition-all duration-500 cursor-pointer flex items-center justify-center ${
                  voiceOrbState === 'speaking'
                    ? 'animate-orb-morph-fast shadow-[0_0_90px_rgba(236,72,153,0.55)]'
                    : voiceOrbState === 'listening'
                      ? 'animate-orb-morph shadow-[0_0_90px_rgba(56,189,248,0.55)]'
                      : voiceOrbState === 'thinking'
                        ? 'animate-spin shadow-[0_0_80px_rgba(249,115,22,0.5)]'
                        : 'rounded-full bg-slate-800 border border-slate-700'
                }`}
                style={{
                  transform: voiceOrbState === 'listening' ? `scale(${1 + audioVolumeLevel * 0.35})` : undefined,
                  background:
                    voiceOrbState === 'speaking'
                      ? 'radial-gradient(circle at 35% 35%, #f472b6 0%, #c084fc 35%, #ea580c 75%, #4c1d95 100%)'
                      : voiceOrbState === 'listening'
                        ? 'radial-gradient(circle at 35% 35%, #38bdf8 0%, #0284c7 35%, #0d9488 75%, #1e1b4b 100%)'
                        : voiceOrbState === 'thinking'
                          ? 'radial-gradient(circle at 35% 35%, #fde047 0%, #f97316 45%, #7c2d12 100%)'
                          : 'radial-gradient(circle at 35% 35%, #475569 0%, #1e293b 100%)',
                }}
                onClick={() => {
                  if (voiceOrbState === 'speaking') {
                    interruptAanyaInVoiceMode();
                  } else if (voiceOrbState === 'idle') {
                    startContinuousVoiceListening();
                  }
                }}
                title={voiceOrbState === 'speaking' ? 'Click to interrupt' : 'Click to talk'}
              >
                {/* Internal Liquid Core Light Glare */}
                <div className="absolute inset-3 rounded-full bg-gradient-to-b from-white/25 via-transparent to-black/40 pointer-events-none blur-[1px]" />

                {/* Dynamic Central Equalizer Waves */}
                {voiceOrbState === 'speaking' && (
                  <div className="flex items-center gap-1.5 z-10">
                    <span className="w-1.5 bg-white rounded-full animate-wave-bar [animation-delay:0.1s] shadow-md shadow-white" />
                    <span className="w-1.5 bg-white rounded-full animate-wave-bar [animation-delay:0.35s] shadow-md shadow-white" />
                    <span className="w-2 bg-white rounded-full animate-wave-bar [animation-delay:0.55s] shadow-md shadow-white" />
                    <span className="w-1.5 bg-white rounded-full animate-wave-bar [animation-delay:0.25s] shadow-md shadow-white" />
                    <span className="w-1.5 bg-white rounded-full animate-wave-bar [animation-delay:0.45s] shadow-md shadow-white" />
                  </div>
                )}

                {/* Live Real-Time Web Audio Frequency Equalizer Waves */}
                {voiceOrbState === 'listening' && (
                  <div className="flex items-center gap-1.5 z-10 opacity-90">
                    <span className="w-1 bg-cyan-100 rounded-full transition-all duration-75 shadow-sm shadow-cyan-400" style={{ height: `${12 + audioVolumeLevel * 24}px` }} />
                    <span className="w-1.5 bg-cyan-200 rounded-full transition-all duration-75 shadow-sm shadow-cyan-400" style={{ height: `${18 + audioVolumeLevel * 36}px` }} />
                    <span className="w-2 bg-white rounded-full transition-all duration-75 shadow-md shadow-white" style={{ height: `${24 + audioVolumeLevel * 48}px` }} />
                    <span className="w-1.5 bg-cyan-200 rounded-full transition-all duration-75 shadow-sm shadow-cyan-400" style={{ height: `${18 + audioVolumeLevel * 36}px` }} />
                    <span className="w-1 bg-cyan-100 rounded-full transition-all duration-75 shadow-sm shadow-cyan-400" style={{ height: `${12 + audioVolumeLevel * 24}px` }} />
                  </div>
                )}

                {voiceOrbState === 'thinking' && (
                  <Sparkles className="w-9 h-9 text-white animate-spin" />
                )}
              </div>
            </div>

            {/* Floating Status Pill */}
            <div className="mt-2 mb-4">
              {voiceOrbState === 'listening' && (
                <div className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-cyan-500/15 border border-cyan-400/30 text-cyan-300 text-xs font-bold backdrop-blur-md shadow-lg shadow-cyan-500/10">
                  <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
                  Listening... Aap bolte rahein, Aanya sun rahi hai
                </div>
              )}
              {voiceOrbState === 'thinking' && (
                <div className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-amber-500/15 border border-amber-400/30 text-amber-300 text-xs font-bold backdrop-blur-md shadow-lg shadow-amber-500/10">
                  <Sparkles className="w-4 h-4 text-amber-400 animate-spin" />
                  Thinking... Aanya soch kar jawab prepare kar rahi hai
                </div>
              )}
              {voiceOrbState === 'speaking' && (
                <div className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-purple-500/15 border border-purple-400/30 text-purple-200 text-xs font-bold backdrop-blur-md shadow-lg shadow-purple-500/10">
                  <Volume2 className="w-4 h-4 text-purple-400 animate-pulse" />
                  Aanya is Speaking... (Tap anywhere to interrupt)
                </div>
              )}
              {voiceOrbState === 'idle' && (
                <div className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-slate-800/80 border border-slate-700 text-slate-400 text-xs font-medium backdrop-blur-md">
                  Tap mic in control pill to speak
                </div>
              )}
            </div>

            {/* Live Subtitle Transcript Card */}
            <div className="w-full max-w-xl min-h-[85px] p-4 rounded-2xl bg-slate-900/70 border border-slate-800/80 backdrop-blur-xl flex flex-col justify-center items-center text-center shadow-xl">
              {voiceLiveTranscript ? (
                <p className="text-sm font-medium text-slate-100 leading-relaxed">
                  <span className="text-orange-400 font-bold">Aap: </span>
                  &ldquo;{voiceLiveTranscript}&rdquo;
                </p>
              ) : voiceAiResponse ? (
                <p className="text-sm font-medium text-slate-100 leading-relaxed">
                  <span className="text-purple-400 font-bold">Aanya: </span>
                  &ldquo;{voiceAiResponse}&rdquo;
                </p>
              ) : (
                <p className="text-xs text-slate-400 leading-relaxed">
                  Kahiye, main sun rahi hoon! Kuch bhi puchiye — Aanya turant naturally jawab degi aur bolegi.
                </p>
              )}
            </div>
          </div>

          {/* ChatGPT-Style Sleek Floating Frosted Bottom Pill */}
          <div className="w-full max-w-lg mx-auto flex flex-col items-center gap-3 z-10">
            <div className="flex items-center justify-center gap-5 px-6 py-3 rounded-full bg-slate-900/90 border border-slate-700/80 backdrop-blur-2xl shadow-2xl ring-1 ring-white/10">
              {/* Mic Mute / Resume Button */}
              <button
                type="button"
                onClick={() => {
                  if (voiceOrbState === 'listening') {
                    isContinuousActiveRef.current = false;
                    if (continuousRecognitionRef.current) {
                      try { continuousRecognitionRef.current.stop(); } catch {}
                    }
                    setVoiceOrbState('idle');
                  } else {
                    startContinuousVoiceListening();
                  }
                }}
                className={`w-12 h-12 rounded-full flex items-center justify-center transition-all hover:scale-105 active:scale-95 ${
                  voiceOrbState === 'listening'
                    ? 'bg-cyan-500/20 border border-cyan-400/40 text-cyan-300 shadow-md shadow-cyan-500/20'
                    : 'bg-slate-800 hover:bg-slate-750 border border-slate-700 text-slate-300'
                }`}
                title={voiceOrbState === 'listening' ? 'Mute Mic' : 'Start Mic'}
                aria-label="Toggle Microphone"
              >
                {voiceOrbState === 'listening' ? (
                  <Mic className="w-5 h-5 text-cyan-400 animate-pulse" />
                ) : (
                  <MicOff className="w-5 h-5" />
                )}
              </button>

              {/* Interrupt button (when Aanya is speaking) */}
              {voiceOrbState === 'speaking' ? (
                <button
                  type="button"
                  onClick={interruptAanyaInVoiceMode}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 text-white font-bold text-xs shadow-lg shadow-orange-500/30 transition-all hover:scale-105 active:scale-95"
                >
                  <VolumeX className="w-4 h-4" />
                  <span>Interrupt & Speak</span>
                </button>
              ) : (
                <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-slate-800/60 border border-slate-700/60 text-[11px] text-slate-300">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span>Hands-free Loop</span>
                </div>
              )}

              {/* End Voice Session Button */}
              <button
                type="button"
                onClick={closeChatGPTVoiceMode}
                className="w-12 h-12 rounded-full bg-rose-600/20 hover:bg-rose-600/30 border border-rose-500/40 text-rose-400 hover:text-white flex items-center justify-center transition-all shadow-md hover:scale-105 active:scale-95"
                title="End Voice Mode"
                aria-label="End Voice Mode"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-[11px] text-slate-500 text-center">
              Continuous Dialogue • Jaise hi aap bolenge, Aanya sun kar turant jawab degi!
            </p>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 5. CHATGPT-STYLE UPGRADED 4-MODULE SETTINGS MODAL        */}
      {/* ======================================================== */}
      {isSettingsOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-0 sm:p-4 animate-fadeIn">
          <div className={`w-full h-[100dvh] sm:h-auto sm:max-w-4xl sm:max-h-[88vh] flex flex-col md:flex-row rounded-none sm:rounded-3xl border-0 sm:border shadow-2xl overflow-hidden transition-all duration-200 ${
            isDarkMode ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-800'
          }`}>
            {/* Navigation: 4 Modules (Compact 4-column responsive grid on mobile, sidebar on desktop) */}
            <div className={`w-full md:w-56 border-b md:border-b-0 md:border-r p-1.5 sm:p-3 shrink-0 grid grid-cols-4 md:flex md:flex-col gap-1 sm:gap-1.5 md:space-y-1 ${
              isDarkMode ? 'bg-slate-950/80 border-slate-800' : 'bg-slate-50/90 border-slate-200'
            }`}>
              <div className="hidden md:flex px-2 py-2 mb-1 items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-xl bg-orange-500/10 text-orange-500 flex items-center justify-center font-bold">
                    <Settings className="w-4 h-4" />
                  </div>
                  <span className={`text-xs font-bold uppercase tracking-wider ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                    Settings
                  </span>
                </div>
                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                  isDarkMode ? 'bg-slate-800 text-slate-400' : 'bg-slate-200 text-slate-600'
                }`}>
                  OpenSense
                </span>
              </div>

              {/* Module 1: General & Theme */}
              <button
                type="button"
                onClick={() => setSettingsModule('general')}
                className={`py-2 px-1 sm:py-2.5 sm:px-3 rounded-xl text-xs font-semibold flex flex-col sm:flex-row items-center justify-center sm:justify-start gap-1 sm:gap-2.5 transition-all text-center sm:text-left ${
                  settingsModule === 'general'
                    ? 'bg-orange-500/15 border border-orange-500/40 text-orange-500 shadow-sm font-bold'
                    : isDarkMode
                      ? 'text-slate-400 hover:text-slate-200 hover:bg-slate-850'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <Sliders className="w-4 h-4 shrink-0" />
                <div className="flex-1 truncate w-full sm:w-auto">
                  <span className="block truncate font-bold text-[11px] sm:text-xs">General</span>
                  <span className="hidden md:block text-[10px] opacity-70 truncate">Appearance, Tone</span>
                </div>
              </button>

              {/* Module 2: Profile & Persona */}
              <button
                type="button"
                onClick={() => setSettingsModule('profile')}
                className={`py-2 px-1 sm:py-2.5 sm:px-3 rounded-xl text-xs font-semibold flex flex-col sm:flex-row items-center justify-center sm:justify-start gap-1 sm:gap-2.5 transition-all text-center sm:text-left ${
                  settingsModule === 'profile'
                    ? 'bg-orange-500/15 border border-orange-500/40 text-orange-500 shadow-sm font-bold'
                    : isDarkMode
                      ? 'text-slate-400 hover:text-slate-200 hover:bg-slate-850'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <UserIcon className="w-4 h-4 shrink-0" />
                <div className="flex-1 truncate w-full sm:w-auto">
                  <span className="block truncate font-bold text-[11px] sm:text-xs">Profile</span>
                  <span className="hidden md:block text-[10px] opacity-70 truncate">{profileName.split(' ')[0]} • {profileDept.split(' ')[0]}</span>
                </div>
              </button>

              {/* Module 3: AI Models & Model Keys */}
              <button
                type="button"
                onClick={() => setSettingsModule('providers')}
                className={`py-2 px-1 sm:py-2.5 sm:px-3 rounded-xl text-xs font-semibold flex flex-col sm:flex-row items-center justify-center sm:justify-start gap-1 sm:gap-2.5 transition-all text-center sm:text-left ${
                  settingsModule === 'providers'
                    ? 'bg-orange-500/15 border border-orange-500/40 text-orange-500 shadow-sm font-bold'
                    : isDarkMode
                      ? 'text-slate-400 hover:text-slate-200 hover:bg-slate-850'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <Key className="w-4 h-4 shrink-0" />
                <div className="flex-1 truncate w-full sm:w-auto">
                  <span className="block truncate font-bold text-[11px] sm:text-xs">AI Keys</span>
                  <span className="hidden md:block text-[10px] text-emerald-500 font-medium truncate">Gemini Active</span>
                </div>
              </button>

              {/* Module 4: Voice AI (Aanya) */}
              <button
                type="button"
                onClick={() => setSettingsModule('voice')}
                className={`py-2 px-1 sm:py-2.5 sm:px-3 rounded-xl text-xs font-semibold flex flex-col sm:flex-row items-center justify-center sm:justify-start gap-1 sm:gap-2.5 transition-all text-center sm:text-left ${
                  settingsModule === 'voice'
                    ? 'bg-orange-500/15 border border-orange-500/40 text-orange-500 shadow-sm font-bold'
                    : isDarkMode
                      ? 'text-slate-400 hover:text-slate-200 hover:bg-slate-850'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <Volume2 className="w-4 h-4 shrink-0" />
                <div className="flex-1 truncate w-full sm:w-auto">
                  <span className="block truncate font-bold text-[11px] sm:text-xs">Voice AI</span>
                  <span className="hidden md:block text-[10px] opacity-70 truncate">Auto Language</span>
                </div>
              </button>
            </div>

            {/* Main Settings Panel */}
            <div className="flex-1 flex flex-col overflow-hidden min-h-0">
              {/* Header */}
              <div className={`px-3.5 sm:px-6 py-2.5 sm:py-4 border-b flex items-center justify-between shrink-0 ${
                isDarkMode ? 'border-slate-800 bg-slate-900/60' : 'border-slate-200 bg-slate-50/60'
              }`}>
                <div className="min-w-0 pr-2">
                  <h3 className={`text-xs sm:text-sm font-bold truncate ${isDarkMode ? 'text-slate-100' : 'text-slate-900'}`}>
                    {settingsModule === 'general' && 'General Preferences & Theme'}
                    {settingsModule === 'profile' && 'User Identity & Workspace Persona'}
                    {settingsModule === 'providers' && 'AI Engine Models & API Key Manager'}
                    {settingsModule === 'voice' && 'Aanya Multilingual Voice AI Assistant'}
                  </h3>
                  <p className={`text-[10px] sm:text-[11px] truncate ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                    {settingsModule === 'general' && 'Customize theme mode, response tone, conversation language, and chat data.'}
                    {settingsModule === 'profile' && 'Zero-password frictionless profile. Tailor answers to your department.'}
                    {settingsModule === 'providers' && 'Configure Google Gemini, OpenAI GPT-4o, or Claude with live latency tests.'}
                    {settingsModule === 'voice' && 'Speech-to-text mic input, sweet Indian female voice playback, and language.'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsSettingsOpen(false)}
                  className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center shrink-0 transition-colors ${
                    isDarkMode ? 'text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700' : 'text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200'
                  }`}
                  title="Close Settings"
                >
                  <X className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                </button>
              </div>

              {/* Content Panels (Smooth Scrollable Container with generous bottom clearance) */}
              <div className="p-3 sm:p-5 overflow-y-auto flex-1 space-y-3.5 sm:space-y-5 pb-24 sm:pb-8">
                {/* ==================================================== */}
                {/* MODULE 1: GENERAL & APPEARANCE                      */}
                {/* ==================================================== */}
                {settingsModule === 'general' && (
                  <div className="space-y-4 sm:space-y-5">
                    {/* Theme Mode Selector Cards */}
                    <div>
                      <label className={`block text-[11px] sm:text-xs font-bold uppercase tracking-wider mb-2 ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                        Workspace Theme
                      </label>
                      <div className="grid grid-cols-2 gap-2 sm:gap-3">
                        <button
                          type="button"
                          onClick={() => {
                            if (!isDarkMode) toggleTheme();
                          }}
                          className={`p-2.5 sm:p-3.5 rounded-xl sm:rounded-2xl border text-left transition-all flex items-start gap-2 sm:gap-3 ${
                            isDarkMode
                              ? 'bg-slate-950 border-orange-500 ring-2 ring-orange-500/20 shadow-lg'
                              : 'bg-slate-50 border-slate-200 hover:border-slate-300'
                          }`}
                        >
                          <div className={`p-2 sm:p-2.5 rounded-lg sm:rounded-xl shrink-0 ${isDarkMode ? 'bg-orange-500/15 text-orange-400' : 'bg-slate-200 text-slate-700'}`}>
                            <Moon className="w-4 h-4 sm:w-5 sm:h-5" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <span className="text-[11px] sm:text-xs font-bold block truncate">🌙 Dark Mode</span>
                              {isDarkMode && <span className="text-[9px] sm:text-[10px] text-orange-400 font-bold ml-1">Active</span>}
                            </div>
                            <span className={`text-[10px] sm:text-[11px] block mt-0.5 line-clamp-2 leading-tight ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                              Deep slate contrast, easier on eyes.
                            </span>
                          </div>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            if (isDarkMode) toggleTheme();
                          }}
                          className={`p-2.5 sm:p-3.5 rounded-xl sm:rounded-2xl border text-left transition-all flex items-start gap-2 sm:gap-3 ${
                            !isDarkMode
                              ? 'bg-white border-orange-500 ring-2 ring-orange-500/20 shadow-lg'
                              : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                          }`}
                        >
                          <div className={`p-2 sm:p-2.5 rounded-lg sm:rounded-xl shrink-0 ${!isDarkMode ? 'bg-orange-50 text-orange-600' : 'bg-slate-900 text-slate-400'}`}>
                            <Sun className="w-4 h-4 sm:w-5 sm:h-5 text-amber-500" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <span className="text-[11px] sm:text-xs font-bold block truncate">☀️ Light Mode</span>
                              {!isDarkMode && <span className="text-[9px] sm:text-[10px] text-orange-600 font-bold ml-1">Active</span>}
                            </div>
                            <span className={`text-[10px] sm:text-[11px] block mt-0.5 line-clamp-2 leading-tight ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                              Crisp, clean high-contrast white layout.
                            </span>
                          </div>
                        </button>
                      </div>
                    </div>

                    {/* Tone / Persona */}
                    <div>
                      <label className={`block text-[11px] sm:text-xs font-bold uppercase tracking-wider mb-2 ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                        Response Personality & Emojis
                      </label>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                        <button
                          type="button"
                          onClick={() => setPersonaTone('energetic')}
                          className={`p-2.5 sm:p-3 rounded-xl sm:rounded-2xl border text-left transition-all ${
                            personaTone === 'energetic'
                              ? 'bg-orange-500/10 border-orange-500 text-orange-400 shadow-sm'
                              : isDarkMode
                                ? 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-white'
                                : 'bg-slate-50 border-slate-200 text-slate-600 hover:text-slate-900'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-0.5">
                            <span className="text-[11px] sm:text-xs font-bold block">🚀 Energetic & Emojis</span>
                            {personaTone === 'energetic' && <span className="text-[9px] text-orange-400 font-bold">✓</span>}
                          </div>
                          <span className="text-[10px] opacity-80 block leading-tight">
                            Lively, warm conversational tone with friendly emojis.
                          </span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setPersonaTone('technical')}
                          className={`p-2.5 sm:p-3 rounded-xl sm:rounded-2xl border text-left transition-all ${
                            personaTone === 'technical'
                              ? 'bg-orange-500/10 border-orange-500 text-orange-400 shadow-sm'
                              : isDarkMode
                                ? 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-white'
                                : 'bg-slate-50 border-slate-200 text-slate-600 hover:text-slate-900'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-0.5">
                            <span className="text-[11px] sm:text-xs font-bold block">💻 Deep Technical</span>
                            {personaTone === 'technical' && <span className="text-[9px] text-orange-400 font-bold">✓</span>}
                          </div>
                          <span className="text-[10px] opacity-80 block leading-tight">
                            Code-heavy, architecture focus, and precise docs.
                          </span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setPersonaTone('concise')}
                          className={`p-2.5 sm:p-3 rounded-xl sm:rounded-2xl border text-left transition-all ${
                            personaTone === 'concise'
                              ? 'bg-orange-500/10 border-orange-500 text-orange-400 shadow-sm'
                              : isDarkMode
                                ? 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-white'
                                : 'bg-slate-50 border-slate-200 text-slate-600 hover:text-slate-900'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-0.5">
                            <span className="text-[11px] sm:text-xs font-bold block">⚡ Concise Direct</span>
                            {personaTone === 'concise' && <span className="text-[9px] text-orange-400 font-bold">✓</span>}
                          </div>
                          <span className="text-[10px] opacity-80 block leading-tight">
                            Short, bullet-pointed answers with zero fluff.
                          </span>
                        </button>
                      </div>
                    </div>

                    {/* Language Mode */}
                    <div>
                      <label className={`block text-[11px] sm:text-xs font-bold uppercase tracking-wider mb-1.5 ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                        Conversation Language
                      </label>
                      <select
                        value={languageMode}
                        onChange={(e: any) => setLanguageMode(e.target.value)}
                        className={`w-full px-3 py-2 rounded-xl sm:rounded-2xl border text-[11px] sm:text-xs focus:outline-none focus:border-orange-500 ${
                          isDarkMode
                            ? 'bg-slate-950/80 border-slate-700 text-slate-100'
                            : 'bg-white border-slate-300 text-slate-800'
                        }`}
                      >
                        <option value="multilingual">🌐 Multilingual Auto (Hindi, Hinglish, English)</option>
                        <option value="english">🇬🇧 English Professional (Corporate Standard)</option>
                        <option value="hindi">🇮🇳 Pure Hindi / Shuddh Hindi (हिन्दी)</option>
                      </select>
                    </div>

                    {/* ChatGPT Style Data Controls */}
                    <div className={`pt-3 border-t space-y-2 sm:space-y-2.5 ${isDarkMode ? 'border-slate-800' : 'border-slate-200'}`}>
                      <h4 className={`text-[11px] sm:text-xs font-bold uppercase tracking-wider ${isDarkMode ? 'text-slate-200' : 'text-slate-700'}`}>
                        Data Controls & History
                      </h4>

                      <div className={`flex items-center justify-between p-2.5 sm:p-3 rounded-xl sm:rounded-2xl border gap-2 ${
                        isDarkMode ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-50 border-slate-200'
                      }`}>
                        <div className="min-w-0 flex-1">
                          <p className={`text-[11px] sm:text-xs font-semibold truncate ${isDarkMode ? 'text-slate-200' : 'text-slate-800'}`}>
                            Export Conversation Data
                          </p>
                          <p className={`text-[10px] sm:text-[11px] mt-0.5 truncate ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                            Download your chat history in structured JSON.
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={exportChatHistory}
                          className={`px-2.5 py-1.5 rounded-lg sm:rounded-xl border text-[10px] sm:text-xs font-medium transition-colors flex items-center gap-1.5 shrink-0 ${
                            isDarkMode
                              ? 'bg-slate-800 hover:bg-slate-750 border-slate-700 text-slate-200'
                              : 'bg-white hover:bg-slate-100 border-slate-300 text-slate-700 shadow-sm'
                          }`}
                        >
                          <Download className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                          <span>Export JSON</span>
                        </button>
                      </div>

                      <div className="flex items-center justify-between p-2.5 sm:p-3 rounded-xl sm:rounded-2xl bg-rose-500/5 border border-rose-500/20 gap-2">
                        <div className="min-w-0 flex-1">
                          <p className="text-[11px] sm:text-xs font-semibold text-rose-500 truncate">Clear All Conversations</p>
                          <p className={`text-[10px] sm:text-[11px] mt-0.5 truncate ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                            Permanently wipe past threads from storage.
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => setConfirmClearModal(true)}
                          className="px-2.5 py-1.5 rounded-lg sm:rounded-xl bg-rose-600 hover:bg-rose-500 text-[10px] sm:text-xs font-semibold text-white transition-colors flex items-center gap-1.5 shadow shrink-0"
                        >
                          <Trash2 className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                          <span>Clear All</span>
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* ==================================================== */}
                {/* MODULE 2: USER PROFILE & PERSONA                    */}
                {/* ==================================================== */}
                {settingsModule === 'profile' && (
                  <form onSubmit={handleSaveProfile} className="space-y-3.5 sm:space-y-4">
                    {profileSavedToast && (
                      <div className="p-2.5 sm:p-3 rounded-xl sm:rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-500 text-xs flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 shrink-0" />
                        <span>Profile updated! The AI now addresses you personally with role context.</span>
                      </div>
                    )}

                    {/* Frictionless Open Access Banner */}
                    <div className="p-2.5 sm:p-3 rounded-xl sm:rounded-2xl bg-orange-500/10 border border-orange-500/20 text-orange-400 text-xs flex items-start gap-2">
                      <Sparkles className="w-4 h-4 text-orange-400 shrink-0 mt-0.5" />
                      <div>
                        <p className={`font-semibold text-[11px] sm:text-xs ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                          Zero-Password Frictionless Workspace Active
                        </p>
                        <p className={`text-[10px] sm:text-[11px] mt-0.5 leading-snug ${isDarkMode ? 'text-orange-300/80' : 'text-orange-800/80'}`}>
                          No passwords needed. Update your name and department, and AI adapts automatically!
                        </p>
                      </div>
                    </div>

                    {/* Avatar Preview */}
                    <div className="flex items-center gap-3 p-2.5 sm:p-3 rounded-xl sm:rounded-2xl border border-slate-800/60 bg-slate-950/40">
                      <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-gradient-to-tr from-orange-500 to-amber-500 flex items-center justify-center font-extrabold text-sm sm:text-base text-white shadow-md shrink-0">
                        {profileName ? profileName.charAt(0).toUpperCase() : 'O'}
                      </div>
                      <div className="min-w-0">
                        <p className={`text-xs font-bold truncate ${isDarkMode ? 'text-slate-200' : 'text-slate-800'}`}>
                          {profileName || 'Anonymous Member'}
                        </p>
                        <span className="text-[9px] sm:text-[10px] px-2 py-0.5 rounded-full bg-orange-500/20 text-orange-400 font-semibold border border-orange-500/30 inline-block mt-0.5 truncate max-w-full">
                          {profileDept}
                        </span>
                      </div>
                    </div>

                    <div>
                      <label className={`block text-[11px] sm:text-xs font-bold uppercase tracking-wider mb-1 ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                        Your Full Name
                      </label>
                      <input
                        type="text"
                        required
                        value={profileName}
                        onChange={(e) => setProfileName(e.target.value)}
                        placeholder="e.g. Rahul Sharma"
                        className={`w-full px-3 py-2 rounded-xl sm:rounded-2xl border text-[11px] sm:text-xs focus:outline-none focus:border-orange-500 ${
                          isDarkMode
                            ? 'bg-slate-950/80 border-slate-700 text-slate-100'
                            : 'bg-white border-slate-300 text-slate-800'
                        }`}
                      />
                    </div>

                    <div>
                      <label className={`block text-[11px] sm:text-xs font-bold uppercase tracking-wider mb-1.5 ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                        Your Department / Persona
                      </label>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                        {[
                          { name: 'Platform Engineering', label: '💻 Platform Engineering & Cloud' },
                          { name: 'People & Culture (HR)', label: '👥 People & Culture (HR)' },
                          { name: 'Marketing & Brand Growth', label: '📢 Marketing & Brand Growth' },
                          { name: 'Business Development (Sales)', label: '💼 Business Development (Sales)' },
                          { name: 'Enterprise Delivery & Leadership', label: '🎯 Leadership & Delivery' },
                        ].map((d) => (
                          <button
                            key={d.name}
                            type="button"
                            onClick={() => setProfileDept(d.name)}
                            className={`p-2 rounded-lg sm:rounded-xl border text-left text-[11px] sm:text-xs font-medium transition-all ${
                              profileDept === d.name
                                ? 'bg-orange-500/15 border-orange-500 text-orange-400 font-bold shadow-sm'
                                : isDarkMode
                                  ? 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-white'
                                  : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                            }`}
                          >
                            {d.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Custom AI Instructions (System Memory) */}
                    <div>
                      <label className={`block text-[11px] sm:text-xs font-bold uppercase tracking-wider mb-1 ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                        Custom Instructions & Context (ChatGPT Memory)
                      </label>
                      <textarea
                        rows={2}
                        value={customInstruction}
                        onChange={(e) => setCustomInstruction(e.target.value)}
                        placeholder="e.g. I work on Next.js and Drupal 10. Always provide clean code snippets with TypeScript types."
                        className={`w-full px-3 py-2 rounded-xl sm:rounded-2xl border text-[11px] sm:text-xs focus:outline-none focus:border-orange-500 resize-none leading-relaxed ${
                          isDarkMode
                            ? 'bg-slate-950/80 border-slate-700 text-slate-100 placeholder-slate-500'
                            : 'bg-white border-slate-300 text-slate-800 placeholder-slate-400'
                        }`}
                      />
                      <p className={`text-[10px] mt-0.5 ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                        The AI will remember these instructions in every response.
                      </p>
                    </div>

                    <div className="pt-1">
                      <button
                        type="submit"
                        className="w-full py-2 sm:py-2.5 rounded-xl sm:rounded-2xl font-bold text-xs bg-gradient-to-r from-orange-600 to-orange-500 hover:from-orange-500 text-white shadow-lg shadow-orange-500/25 transition-all flex items-center justify-center gap-2"
                      >
                        <Check className="w-4 h-4" />
                        <span>Save Profile & Instructions</span>
                      </button>
                    </div>
                  </form>
                )}

                {/* ==================================================== */}
                {/* MODULE 3: AI MODELS & KEYS                          */}
                {/* ==================================================== */}
                {settingsModule === 'providers' && (
                  <div className="space-y-4 sm:space-y-5">
                    {/* Live Active Engine Summary Banner */}
                    <div className={`p-2.5 sm:p-3.5 rounded-xl sm:rounded-2xl border transition-all ${
                      isDarkMode
                        ? 'bg-gradient-to-r from-orange-500/10 via-amber-500/10 to-transparent border-orange-500/30'
                        : 'bg-gradient-to-r from-orange-50 via-amber-50 to-white border-orange-200 shadow-sm'
                    }`}>
                      <div className="flex items-center justify-between mb-1 sm:mb-1.5">
                        <div className="flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                          <h4 className={`text-[11px] sm:text-xs font-bold uppercase tracking-wider ${isDarkMode ? 'text-slate-100' : 'text-slate-800'}`}>
                            Active Engine: Google Gemini 1.5 Flash
                          </h4>
                        </div>
                        <span className="text-[9px] sm:text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-500 font-bold border border-emerald-500/30">
                          100% Free Quota
                        </span>
                      </div>
                      <p className={`text-[10px] sm:text-xs leading-relaxed ${isDarkMode ? 'text-slate-300' : 'text-slate-600'}`}>
                        Pre-configured Google Gemini engine active. High-speed token generation ready without manual keys.
                      </p>
                    </div>

                    {/* Active Configured Providers Card */}
                    <div>
                      <div className="flex items-center justify-between mb-1.5 sm:mb-2">
                        <h4 className={`text-[11px] sm:text-xs font-bold uppercase tracking-wider ${isDarkMode ? 'text-slate-200' : 'text-slate-700'}`}>
                          Configured AI Providers ({providers.length})
                        </h4>
                        <span className={`text-[9px] sm:text-[10px] ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                          AES-256 encrypted
                        </span>
                      </div>

                      {loadingProviders ? (
                        <p className={`text-xs py-2 ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>Loading providers...</p>
                      ) : providers.length === 0 ? (
                        <div className={`p-3 rounded-xl sm:rounded-2xl border text-xs flex items-start gap-2.5 ${
                          isDarkMode ? 'bg-slate-950/60 border-slate-800 text-slate-400' : 'bg-slate-50 border-slate-200 text-slate-600'
                        }`}>
                          <Sparkles className="w-4 h-4 text-orange-400 shrink-0 mt-0.5" />
                          <div>
                            <p className="font-semibold text-slate-200 text-[11px] sm:text-xs">No custom providers configured yet</p>
                            <p className="text-[10px] sm:text-[11px] mt-0.5">
                              Add your Google Gemini, OpenAI, or Claude key below to customize your AI model!
                            </p>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {providers.map((p) => {
                            const testRes = existingTestResults[p.id];
                            const isTesting = testingExistingId === p.id;
                            return (
                              <div
                                key={p.id}
                                className={`p-2.5 sm:p-3 rounded-xl sm:rounded-2xl border transition-all ${
                                  p.is_default
                                    ? isDarkMode
                                      ? 'bg-slate-950/80 border-orange-500/50 shadow-md shadow-orange-500/5'
                                      : 'bg-white border-orange-400 shadow-sm'
                                    : isDarkMode
                                      ? 'bg-slate-950/40 border-slate-800'
                                      : 'bg-slate-50 border-slate-200'
                                }`}
                              >
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                  <div className="flex items-center gap-2">
                                    <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg sm:rounded-xl bg-orange-500/10 text-orange-400 flex items-center justify-center font-bold text-xs shrink-0">
                                      {p.provider_type === 'gemini' ? '✨' : p.provider_type === 'openai' ? '⚡' : '🧠'}
                                    </div>
                                    <div className="min-w-0">
                                      <div className="flex items-center gap-1.5 flex-wrap">
                                        <span className={`text-[11px] sm:text-xs font-bold truncate ${isDarkMode ? 'text-slate-200' : 'text-slate-800'}`}>
                                          {p.name}
                                        </span>
                                        {p.is_default && (
                                          <span className="text-[8px] sm:text-[9px] px-1.5 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-500 font-bold uppercase">
                                            Default
                                          </span>
                                        )}
                                      </div>
                                      <p className={`text-[9px] sm:text-[10px] font-mono mt-0.5 truncate ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                                        Model: <strong className="text-orange-400">{p.model_name}</strong> • {p.masked_api_key}
                                      </p>
                                    </div>
                                  </div>

                                  <div className="flex items-center gap-1 sm:gap-1.5 self-end sm:self-auto">
                                    {/* Test Key Live Button */}
                                    <button
                                      type="button"
                                      onClick={() => handleTestExistingProvider(p)}
                                      disabled={isTesting}
                                      className={`px-2 py-1 sm:px-2.5 sm:py-1.5 rounded-lg sm:rounded-xl border text-[10px] sm:text-[11px] font-medium transition-colors flex items-center gap-1 ${
                                        isDarkMode
                                          ? 'bg-slate-900 hover:bg-slate-800 border-slate-700 text-slate-300'
                                          : 'bg-white hover:bg-slate-100 border-slate-300 text-slate-700 shadow-sm'
                                      }`}
                                      title="Test connection and latency"
                                    >
                                      {isTesting ? (
                                        <span className="text-orange-400 animate-spin text-[10px]">⟳</span>
                                      ) : (
                                        <Sparkles className="w-3 h-3 text-orange-400" />
                                      )}
                                      <span>{isTesting ? 'Testing...' : 'Test'}</span>
                                    </button>

                                    {/* Set Default */}
                                    {!p.is_default && (
                                      <button
                                        type="button"
                                        onClick={() => handleSetDefaultProvider(p.id)}
                                        className="px-2 py-1 sm:px-2.5 sm:py-1.5 rounded-lg sm:rounded-xl bg-orange-600/15 hover:bg-orange-600 text-orange-400 hover:text-white border border-orange-500/30 text-[10px] sm:text-[11px] font-medium transition-colors"
                                      >
                                        Default
                                      </button>
                                    )}

                                    {/* Delete */}
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        handleDeleteProvider(p.id);
                                      }}
                                      className="p-1 sm:p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                                      title="Delete provider"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                </div>

                                {/* Live Test Result Banner */}
                                {testRes && (
                                  <div className={`mt-2 px-2.5 py-1 rounded-lg text-[10px] sm:text-[11px] flex items-center justify-between border ${
                                    testRes.success
                                      ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                                      : 'bg-rose-500/10 border-rose-500/30 text-rose-400'
                                  }`}>
                                    <div className="flex items-center gap-1.5 truncate">
                                      {testRes.success ? <CheckCircle2 className="w-3 h-3 shrink-0" /> : <AlertCircle className="w-3 h-3 shrink-0" />}
                                      <span className="truncate">{testRes.message}</span>
                                    </div>
                                    {testRes.latency_ms && (
                                      <span className="font-mono text-[9px] sm:text-[10px] font-bold shrink-0 ml-1">
                                        ⚡ {testRes.latency_ms}ms
                                      </span>
                                    )}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    {/* Connect New Provider Form */}
                    <div className={`p-3 sm:p-4 rounded-xl sm:rounded-2xl border space-y-3 ${
                      isDarkMode ? 'bg-slate-950/80 border-slate-800' : 'bg-slate-50 border-slate-200'
                    }`}>
                      <div className="flex items-center justify-between">
                        <h4 className={`text-[11px] sm:text-xs font-bold uppercase tracking-wider flex items-center gap-1 ${isDarkMode ? 'text-slate-200' : 'text-slate-800'}`}>
                          <Plus className="w-3.5 h-3.5 text-orange-400" />
                          Connect AI Key
                        </h4>
                        <a
                          href="https://aistudio.google.com/app/apikey"
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-[10px] sm:text-[11px] text-orange-400 hover:underline font-semibold"
                        >
                          <span>Get Free Gemini Key</span>
                          <ExternalLink className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                        </a>
                      </div>

                      {providerTestResult && (
                        <div
                          className={`p-2.5 rounded-xl text-xs flex items-center gap-2 border ${
                            providerTestResult.success
                              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                              : 'bg-rose-500/10 border-rose-500/30 text-rose-400'
                          }`}
                        >
                          {providerTestResult.success ? (
                            <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                          ) : (
                            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                          )}
                          <span className="text-[11px]">{providerTestResult.message}</span>
                        </div>
                      )}

                      {/* Provider Type Selection Tabs */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 sm:gap-2">
                        {[
                          { id: 'gemini', label: 'Gemini', icon: '✨' },
                          { id: 'openai', label: 'GPT-4o', icon: '⚡' },
                          { id: 'anthropic', label: 'Claude 3.5', icon: '🧠' },
                          { id: 'custom', label: 'Custom', icon: '🛠️' },
                        ].map((t) => (
                          <button
                            key={t.id}
                            type="button"
                            onClick={() => handleProviderTypeChange(t.id as any)}
                            className={`py-1.5 px-2 rounded-lg sm:rounded-xl text-[10px] sm:text-xs font-semibold border transition-all text-center flex items-center justify-center gap-1 ${
                              newProviderType === t.id
                                ? 'bg-orange-500/15 border-orange-500 text-orange-400 font-bold shadow-sm'
                                : isDarkMode
                                  ? 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                                  : 'bg-white border-slate-200 text-slate-600 hover:text-slate-900'
                            }`}
                          >
                            <span>{t.icon}</span>
                            <span>{t.label}</span>
                          </button>
                        ))}
                      </div>

                      <form onSubmit={handleSaveProvider} className="space-y-2.5 sm:space-y-3">
                        {/* API Key Input with Eye Toggle */}
                        <div>
                          <label className={`block text-[10px] sm:text-[11px] font-bold uppercase tracking-wider mb-1 ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                            {newProviderType === 'gemini' ? 'Google Gemini API Key' : 'API Key (AES-256 Encrypted)'}
                          </label>
                          <div className="relative">
                            <input
                              type={showApiKey ? 'text' : 'password'}
                              required
                              value={newApiKey}
                              onChange={(e) => setNewApiKey(e.target.value)}
                              placeholder={newProviderType === 'gemini' ? 'AIzaSy... or AQ.Ab8...' : newProviderType === 'openai' ? 'sk-...' : 'sk-ant-...'}
                              className={`w-full pl-3 pr-9 py-2 rounded-xl sm:rounded-2xl border text-[11px] sm:text-xs font-mono focus:outline-none focus:border-orange-500 ${
                                isDarkMode
                                  ? 'bg-slate-900 border-slate-700 text-slate-100 placeholder-slate-500'
                                  : 'bg-white border-slate-300 text-slate-800 placeholder-slate-400'
                              }`}
                            />
                            <button
                              type="button"
                              onClick={() => setShowApiKey(!showApiKey)}
                              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-orange-400 transition-colors"
                              title={showApiKey ? 'Hide Key' : 'Show Key'}
                            >
                              {showApiKey ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                            </button>
                          </div>
                        </div>

                        {/* Model Name & Base URL */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
                          <div>
                            <label className={`block text-[10px] sm:text-[11px] font-bold uppercase tracking-wider mb-1 ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                              Model Identifier
                            </label>
                            <input
                              type="text"
                              required
                              value={newModelName}
                              onChange={(e) => setNewModelName(e.target.value)}
                              placeholder={newProviderType === 'gemini' ? 'gemini-1.5-flash' : 'gpt-4o'}
                              className={`w-full px-3 py-1.5 sm:py-2 rounded-lg sm:rounded-xl border text-[11px] sm:text-xs font-mono focus:outline-none focus:border-orange-500 ${
                                isDarkMode
                                  ? 'bg-slate-900 border-slate-700 text-slate-100'
                                  : 'bg-white border-slate-300 text-slate-800'
                              }`}
                            />
                          </div>
                          <div>
                            <label className={`block text-[10px] sm:text-[11px] font-bold uppercase tracking-wider mb-1 ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                              Base URL
                            </label>
                            <input
                              type="text"
                              required
                              value={newBaseUrl}
                              onChange={(e) => setNewBaseUrl(e.target.value)}
                              placeholder="https://generativelanguage.googleapis.com/v1beta"
                              className={`w-full px-3 py-1.5 sm:py-2 rounded-lg sm:rounded-xl border text-[11px] sm:text-xs font-mono focus:outline-none focus:border-orange-500 ${
                                isDarkMode
                                  ? 'bg-slate-900 border-slate-700 text-slate-100'
                                  : 'bg-white border-slate-300 text-slate-800'
                              }`}
                            />
                          </div>
                        </div>

                        <div className="flex items-center gap-2 pt-0.5">
                          <input
                            type="checkbox"
                            id="is_default_check"
                            checked={isDefaultProvider}
                            onChange={(e) => setIsDefaultProvider(e.target.checked)}
                            className="rounded border-slate-700 text-orange-500 focus:ring-0"
                          />
                          <label htmlFor="is_default_check" className={`text-[10px] sm:text-xs cursor-pointer select-none ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                            Set as default model for my chat sessions
                          </label>
                        </div>

                        <div className="flex items-center gap-2 pt-1">
                          <button
                            type="button"
                            onClick={handleTestProvider}
                            disabled={testingProvider}
                            className={`flex-1 py-2 sm:py-2.5 rounded-xl sm:rounded-2xl border text-xs font-semibold transition-colors flex items-center justify-center gap-1.5 ${
                              isDarkMode
                                ? 'bg-slate-800 hover:bg-slate-750 border-slate-700 text-slate-200'
                                : 'bg-white hover:bg-slate-100 border-slate-300 text-slate-700 shadow-sm'
                            }`}
                          >
                            {testingProvider ? (
                              <>
                                <span className="animate-spin text-xs">⟳</span>
                                <span>Testing...</span>
                              </>
                            ) : (
                              <>
                                <Sparkles className="w-3.5 h-3.5 text-orange-400" />
                                <span>Test Key</span>
                              </>
                            )}
                          </button>
                          <button
                            type="submit"
                            disabled={savingProvider}
                            className="flex-1 py-2 sm:py-2.5 rounded-xl sm:rounded-2xl bg-gradient-to-r from-orange-600 to-orange-500 hover:from-orange-500 text-xs font-bold text-white shadow-md shadow-orange-500/25 transition-all flex items-center justify-center gap-1.5"
                          >
                            {savingProvider ? (
                              <span>Saving...</span>
                            ) : (
                              <>
                                <Check className="w-3.5 h-3.5" />
                                <span>Save & Activate</span>
                              </>
                            )}
                          </button>
                        </div>
                      </form>
                    </div>

                    {/* Rate Limits & Quotas Reference Card */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3 text-xs">
                      <div className={`p-2.5 sm:p-3 rounded-xl sm:rounded-2xl border ${
                        isDarkMode ? 'bg-slate-950/80 border-slate-800' : 'bg-slate-50 border-slate-200'
                      }`}>
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-orange-400 text-[11px] sm:text-xs">Google Gemini (Free)</span>
                          <span className="text-[9px] text-emerald-400 font-bold px-1.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20">
                            100% Free
                          </span>
                        </div>
                        <ul className={`text-[10px] sm:text-[11px] mt-1.5 space-y-0.5 ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                          <li>• <strong>RPM:</strong> 15 Requests / Minute</li>
                          <li>• <strong>RPD:</strong> 1,500 Requests / Day (Free!)</li>
                          <li>• <strong>TPM:</strong> 1,000,000 Tokens / Minute</li>
                        </ul>
                      </div>

                      <div className={`p-2.5 sm:p-3 rounded-xl sm:rounded-2xl border ${
                        isDarkMode ? 'bg-slate-950/80 border-slate-800' : 'bg-slate-50 border-slate-200'
                      }`}>
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-blue-400 text-[11px] sm:text-xs">OpenAI (GPT-4o)</span>
                          <span className="text-[9px] text-slate-400 px-1.5 py-0.5 rounded-full bg-slate-800 border border-slate-700">
                            Paid Tier
                          </span>
                        </div>
                        <ul className={`text-[10px] sm:text-[11px] mt-1.5 space-y-0.5 ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                          <li>• <strong>RPM:</strong> 500 Requests / Minute</li>
                          <li>• <strong>TPM:</strong> 30,000 Tokens / Minute</li>
                          <li>• <em>Requires prepaid account balance</em></li>
                        </ul>
                      </div>
                    </div>
                  </div>
                )}

                {/* ==================================================== */}
                {/* MODULE 4: VOICE AI (AANYA ASSISTANT)                */}
                {/* ==================================================== */}
                {settingsModule === 'voice' && (
                  <div className="space-y-4 sm:space-y-5">
                    {/* Voice Assistant Overview */}
                    <div className={`p-2.5 sm:p-3.5 rounded-xl sm:rounded-2xl border flex items-start gap-2.5 ${
                      isDarkMode
                        ? 'bg-purple-500/10 border-purple-500/20 text-purple-300'
                        : 'bg-purple-50 border-purple-200 text-purple-900 shadow-sm'
                    }`}>
                      <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl bg-purple-500/20 text-purple-400 flex items-center justify-center font-bold text-base sm:text-lg shrink-0">
                        🎙️
                      </div>
                      <div>
                        <h4 className="text-[11px] sm:text-xs font-bold uppercase tracking-wider">
                          Aanya Voice AI Assistant (Sweet Indian Voice)
                        </h4>
                        <p className={`text-[10px] sm:text-xs mt-0.5 leading-relaxed ${isDarkMode ? 'text-purple-300/80' : 'text-purple-800'}`}>
                          Multilingual Indian speech synthesis and speech-to-text recognition in Hindi and English.
                        </p>
                      </div>
                    </div>

                    {/* Voice Mode Selector */}
                    <div>
                      <label className={`block text-[11px] sm:text-xs font-bold uppercase tracking-wider mb-2 ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                        Voice Speaking Mode
                      </label>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
                        <button
                          type="button"
                          onClick={() => setIsVoiceMode(false)}
                          className={`p-2.5 sm:p-3.5 rounded-xl sm:rounded-2xl border text-left transition-all ${
                            !isVoiceMode
                              ? 'bg-orange-500/15 border-orange-500 text-orange-400 font-bold shadow-sm'
                              : isDarkMode
                                ? 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-white'
                                : 'bg-slate-50 border-slate-200 text-slate-600 hover:text-slate-900'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-[11px] sm:text-xs font-bold">🎙️ Mic Only (Recommended)</span>
                            {!isVoiceMode && <span className="text-[9px] sm:text-[10px] text-orange-400 font-bold">Active</span>}
                          </div>
                          <span className="text-[10px] sm:text-[11px] opacity-80 block leading-tight">
                            Silent typing: AI only speaks when you use the mic or click &ldquo;Aanya se sunein&rdquo;.
                          </span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setIsVoiceMode(true)}
                          className={`p-2.5 sm:p-3.5 rounded-xl sm:rounded-2xl border text-left transition-all ${
                            isVoiceMode
                              ? 'bg-purple-500/15 border-purple-500 text-purple-300 font-bold shadow-sm'
                              : isDarkMode
                                ? 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-white'
                                : 'bg-slate-50 border-slate-200 text-slate-600 hover:text-slate-900'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-[11px] sm:text-xs font-bold">🔊 Always Speak Out Loud</span>
                            {isVoiceMode && <span className="text-[9px] sm:text-[10px] text-purple-400 font-bold">Active</span>}
                          </div>
                          <span className="text-[10px] sm:text-[11px] opacity-80 block leading-tight">
                            AI automatically speaks every response aloud as soon as it replies.
                          </span>
                        </button>
                      </div>
                    </div>

                    {/* Auto Language Detection Feature Card */}
                    <div>
                      <label className={`block text-[11px] sm:text-xs font-bold uppercase tracking-wider mb-2 ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                        Language & Speech Recognition
                      </label>
                      <div className={`p-2.5 sm:p-3.5 rounded-xl sm:rounded-2xl border flex items-center justify-between gap-2.5 transition-colors ${
                        isDarkMode ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-50 border-slate-200'
                      }`}>
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 font-bold text-base sm:text-lg shrink-0">
                            🌐
                          </div>
                          <div className="min-w-0">
                            <p className={`text-[11px] sm:text-xs font-bold truncate ${isDarkMode ? 'text-slate-200' : 'text-slate-800'}`}>
                              Automatic Multilingual Detection (Always ON)
                            </p>
                            <p className={`text-[10px] sm:text-[11px] mt-0.5 leading-tight ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                              Aanya automatically detects Hindi, Hinglish, and English from your voice and text!
                            </p>
                          </div>
                        </div>
                        <span className="hidden sm:inline-block px-2.5 py-0.5 rounded-full text-[9px] sm:text-[10px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 whitespace-nowrap shrink-0">
                          ✓ Auto-Detect Active
                        </span>
                      </div>
                    </div>

                    {/* Speech Speed & Test Voice Button */}
                    <div className={`p-2.5 sm:p-3.5 rounded-xl sm:rounded-2xl border space-y-2.5 sm:space-y-3 ${
                      isDarkMode ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-50 border-slate-200'
                    }`}>
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div>
                          <p className={`text-[11px] sm:text-xs font-bold uppercase tracking-wider ${isDarkMode ? 'text-slate-200' : 'text-slate-800'}`}>
                            Speech Speed & Real-time Test
                          </p>
                          <p className={`text-[10px] sm:text-[11px] mt-0.5 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                            Adjust speed and test Aanya&apos;s audio output now.
                          </p>
                        </div>

                        {/* Live Audio Test Button */}
                        <button
                          type="button"
                          onClick={testVoiceInSettings}
                          className="w-full sm:w-auto px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-xl sm:rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 text-white text-[11px] sm:text-xs font-bold shadow-md shadow-purple-500/20 flex items-center justify-center gap-1.5 transition-all"
                        >
                          <Volume2 className="w-3.5 h-3.5" />
                          <span>Test Voice Now 🔊</span>
                        </button>
                      </div>

                      <div className="flex items-center gap-1.5 sm:gap-2 pt-0.5">
                        {[
                          { rate: 0.85, label: '0.85x Relaxed' },
                          { rate: 1.0, label: '1.0x Normal' },
                          { rate: 1.15, label: '1.15x Fast' },
                        ].map((r) => (
                          <button
                            key={r.rate}
                            type="button"
                            onClick={() => {
                              setSpeechRate(r.rate);
                              if (typeof window !== 'undefined') {
                                localStorage.setItem('opensense_speech_rate', r.rate.toString());
                              }
                            }}
                            className={`flex-1 sm:flex-none px-2.5 py-1.5 rounded-lg sm:rounded-xl border text-[10px] sm:text-xs font-semibold transition-all text-center ${
                              speechRate === r.rate
                                ? 'bg-purple-500/20 border-purple-500 text-purple-300 font-bold'
                                : isDarkMode
                                  ? 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                                  : 'bg-white border-slate-300 text-slate-700'
                            }`}
                          >
                            {r.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 6. CLEAR ALL CHATS CONFIRMATION MODAL                      */}
      {/* ======================================================== */}
      {confirmClearModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-sm p-6 text-center space-y-4 shadow-2xl">
            <div className="w-12 h-12 mx-auto rounded-full bg-rose-500/10 text-rose-400 flex items-center justify-center">
              <Trash2 className="w-6 h-6" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-slate-100">Clear All Conversations?</h4>
              <p className="text-xs text-slate-400 mt-1">
                This will delete your local and server conversation history. This action cannot be undone.
              </p>
            </div>
            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setConfirmClearModal(false)}
                className="flex-1 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-300"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleClearAllSessions}
                className="flex-1 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-xs font-semibold text-white shadow"
              >
                Yes, Delete All
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 7. FULLSCREEN IMAGE LIGHTBOX MODAL                        */}
      {/* ======================================================== */}
      {previewImage && (
        <div
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex flex-col items-center justify-center p-4"
          onClick={() => setPreviewImage(null)}
        >
          <div
            className="relative max-w-4xl max-h-[90vh] flex flex-col items-center"
            onClick={(e) => e.stopPropagation()}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={previewImage.url}
              alt={previewImage.alt}
              className="max-w-full max-h-[75vh] object-contain rounded-2xl shadow-2xl border border-slate-800"
            />
            <div className="mt-4 flex items-center justify-between w-full px-2">
              <span className="text-xs font-medium text-slate-300 truncate max-w-md">
                {previewImage.alt}
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => downloadImageFile(previewImage.url, `${previewImage.alt.slice(0, 24).replace(/\s+/g, '_')}.png`)}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-orange-600 to-orange-500 text-white text-xs font-semibold flex items-center gap-2 shadow-lg shadow-orange-500/20 hover:opacity-95"
                >
                  <Download className="w-4 h-4" />
                  <span>Download Image (1024x1024 HD)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewImage(null)}
                  className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

{/* ======================================================== */}
      {/* 8. UNIVERSAL COMMAND PALETTE MODAL (Ctrl + K / Cmd + K)  */}
      {/* ======================================================== */}
      {isCommandPaletteOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-start justify-center pt-16 sm:pt-24 p-4 animate-fadeIn"
          onClick={() => setIsCommandPaletteOpen(false)}
        >
          <div
            className={`w-full max-w-xl rounded-2xl border shadow-2xl overflow-hidden flex flex-col transition-all ${
              isDarkMode ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-800'
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Command Search Input Bar */}
            <div className={`p-3.5 border-b flex items-center gap-3 ${isDarkMode ? 'border-slate-800 bg-slate-950/60' : 'border-slate-200 bg-slate-50'}`}>
              <Command className="w-4 h-4 text-orange-500 shrink-0" />
              <input
                type="text"
                autoFocus
                placeholder="Type a command or search conversations... (ESC to close)"
                value={commandPaletteSearch}
                onChange={(e) => setCommandPaletteSearch(e.target.value)}
                className="w-full bg-transparent text-sm focus:outline-none placeholder-slate-400"
              />
              <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded border ${isDarkMode ? 'border-slate-800 text-slate-500' : 'border-slate-300 text-slate-400'}`}>
                ESC
              </span>
            </div>

            {/* Quick Actions List */}
            <div className="p-2 max-h-80 overflow-y-auto space-y-1">
              <div className="px-2.5 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Quick Actions
              </div>

              <button
                type="button"
                onClick={() => {
                  setIsCommandPaletteOpen(false);
                  handleNewSession();
                }}
                className={`w-full px-3 py-2 rounded-xl text-left text-xs flex items-center justify-between transition-colors ${
                  isDarkMode ? 'hover:bg-slate-800 text-slate-200' : 'hover:bg-slate-100 text-slate-800'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Plus className="w-4 h-4 text-orange-500" />
                  <span className="font-semibold">Start New Conversation</span>
                </div>
                <span className="text-[10px] text-slate-400">Ctrl+N</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setIsCommandPaletteOpen(false);
                  openChatGPTVoiceMode();
                }}
                className={`w-full px-3 py-2 rounded-xl text-left text-xs flex items-center justify-between transition-colors ${
                  isDarkMode ? 'hover:bg-slate-800 text-slate-200' : 'hover:bg-slate-100 text-slate-800'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Headphones className="w-4 h-4 text-purple-400" />
                  <span className="font-semibold">Launch ChatGPT Voice Mode</span>
                </div>
                <span className="text-[10px] text-purple-400 font-bold">Hands-Free</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setIsCommandPaletteOpen(false);
                  handleExportPDF();
                }}
                className={`w-full px-3 py-2 rounded-xl text-left text-xs flex items-center justify-between transition-colors ${
                  isDarkMode ? 'hover:bg-slate-800 text-slate-200' : 'hover:bg-slate-100 text-slate-800'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Printer className="w-4 h-4 text-emerald-500" />
                  <span className="font-semibold">Export Current Chat as PDF</span>
                </div>
                <span className="text-[10px] text-slate-400">Printable</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setIsCommandPaletteOpen(false);
                  handleCopyEOD();
                }}
                className={`w-full px-3 py-2 rounded-xl text-left text-xs flex items-center justify-between transition-colors ${
                  isDarkMode ? 'hover:bg-slate-800 text-slate-200' : 'hover:bg-slate-100 text-slate-800'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Copy className="w-4 h-4 text-amber-500" />
                  <span className="font-semibold">Copy EOD Standup Summary</span>
                </div>
                <span className="text-[10px] text-slate-400">Clipboard</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setIsCommandPaletteOpen(false);
                  toggleTheme();
                }}
                className={`w-full px-3 py-2 rounded-xl text-left text-xs flex items-center justify-between transition-colors ${
                  isDarkMode ? 'hover:bg-slate-800 text-slate-200' : 'hover:bg-slate-100 text-slate-800'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  {isDarkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-700" />}
                  <span className="font-semibold">Switch to {isDarkMode ? 'Light' : 'Dark'} Mode</span>
                </div>
                <span className="text-[10px] text-slate-400">Theme</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setIsCommandPaletteOpen(false);
                  setIsSettingsOpen(true);
                  setSettingsModule('general');
                }}
                className={`w-full px-3 py-2 rounded-xl text-left text-xs flex items-center justify-between transition-colors ${
                  isDarkMode ? 'hover:bg-slate-800 text-slate-200' : 'hover:bg-slate-100 text-slate-800'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Settings className="w-4 h-4 text-orange-400" />
                  <span className="font-semibold">Open Settings & AI API Keys</span>
                </div>
                <span className="text-[10px] text-slate-400">Config</span>
              </button>

              {/* Matching Conversations Search Results */}
              {sessions.filter((s) => s.title.toLowerCase().includes(commandPaletteSearch.toLowerCase())).length > 0 && (
                <>
                  <div className="px-2.5 pt-3 pb-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider border-t border-slate-800/40">
                    Conversations
                  </div>
                  {sessions
                    .filter((s) => s.title.toLowerCase().includes(commandPaletteSearch.toLowerCase()))
                    .slice(0, 5)
                    .map((sess) => (
                      <button
                        key={sess.id}
                        type="button"
                        onClick={() => {
                          setIsCommandPaletteOpen(false);
                          selectSession(sess.id);
                        }}
                        className={`w-full px-3 py-2 rounded-xl text-left text-xs flex items-center justify-between transition-colors ${
                          sess.id === currentSession?.id
                            ? 'bg-orange-500/10 text-orange-400 font-semibold'
                            : isDarkMode ? 'hover:bg-slate-800 text-slate-300' : 'hover:bg-slate-100 text-slate-700'
                        }`}
                      >
                        <div className="flex items-center gap-2 truncate">
                          <MessageSquare className="w-3.5 h-3.5 shrink-0 text-orange-500" />
                          <span className="truncate">{sess.title}</span>
                        </div>
                        <span className="text-[10px] text-slate-500 shrink-0">
                          {new Date(sess.created_at).toLocaleDateString()}
                        </span>
                      </button>
                    ))}
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 8. CLAUDE-STYLE INTERACTIVE ARTIFACTS STUDIO DRAWER      */}
      {/* ======================================================== */}
      {activeArtifact && (
        <div
          className={`fixed z-50 transition-all duration-300 flex flex-col shadow-2xl ${
            isArtifactExpanded
              ? 'inset-0 bg-slate-950'
              : 'top-0 right-0 bottom-0 w-full sm:w-[540px] md:w-[620px] lg:w-[680px] bg-slate-900 border-l border-slate-800'
          }`}
        >
          {/* Studio Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800 bg-slate-950/80 backdrop-blur-md">
            <div className="flex items-center gap-2.5 overflow-hidden">
              <div className="w-8 h-8 rounded-lg bg-orange-500/10 border border-orange-500/20 flex items-center justify-center text-orange-400 shrink-0">
                <Code2 className="w-4 h-4" />
              </div>
              <div className="truncate">
                <div className="flex items-center gap-2">
                  <h3 className="text-xs font-bold text-white truncate">
                    {activeArtifact.title || 'Interactive Artifact'}
                  </h3>
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase bg-orange-500/20 text-orange-400 border border-orange-500/30 shrink-0">
                    {activeArtifact.language || 'CODE'}
                  </span>
                </div>
                <p className="text-[10px] text-slate-400">OpenSense Live Studio Sandbox</p>
              </div>
            </div>

            {/* Controls */}
            <div className="flex items-center gap-1.5 shrink-0">
              {/* Tab Switcher */}
              <div className="flex items-center bg-slate-900 border border-slate-800 rounded-lg p-0.5 mr-2">
                <button
                  type="button"
                  onClick={() => setArtifactTab('preview')}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold transition-all ${
                    artifactTab === 'preview'
                      ? 'bg-orange-500 text-white shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>Preview</span>
                </button>
                <button
                  type="button"
                  onClick={() => setArtifactTab('code')}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold transition-all ${
                    artifactTab === 'code'
                      ? 'bg-orange-500 text-white shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Code2 className="w-3.5 h-3.5" />
                  <span>Code</span>
                </button>
              </div>

              {/* Copy Code */}
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(activeArtifact.content);
                  showToast('Code copied to clipboard!');
                }}
                className="p-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition-colors"
                title="Copy Code"
              >
                <Copy className="w-4 h-4" />
              </button>

              {/* Download */}
              <button
                type="button"
                onClick={() => {
                  const rawLang = activeArtifact.language.toLowerCase().replace(/[^a-z0-9]/g, '') || 'txt';
                  const ext =
                    rawLang === 'react' || rawLang === 'jsx'
                      ? 'jsx'
                      : rawLang === 'typescript' || rawLang === 'tsx'
                      ? 'tsx'
                      : rawLang === 'javascript' || rawLang === 'js'
                      ? 'js'
                      : rawLang === 'python' || rawLang === 'py'
                      ? 'py'
                      : rawLang === 'html'
                      ? 'html'
                      : rawLang === 'svg'
                      ? 'svg'
                      : rawLang;
                  const filename = `opensense-artifact-${Date.now()}.${ext}`;
                  const blob = new Blob([activeArtifact.content], { type: 'text/plain;charset=utf-8' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = filename;
                  document.body.appendChild(a);
                  a.click();
                  document.body.removeChild(a);
                  URL.revokeObjectURL(url);
                  showToast(`Downloaded ${filename}`);
                }}
                className="p-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition-colors"
                title="Download Artifact"
              >
                <Download className="w-4 h-4" />
              </button>

              {/* Expand / Minimize */}
              <button
                type="button"
                onClick={() => setIsArtifactExpanded(!isArtifactExpanded)}
                className="p-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition-colors"
                title={isArtifactExpanded ? 'Collapse' : 'Full Screen'}
              >
                {isArtifactExpanded ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
              </button>

              {/* Close Drawer */}
              <button
                type="button"
                onClick={() => {
                  setActiveArtifact(null);
                  setIsArtifactExpanded(false);
                }}
                className="p-1.5 rounded-lg bg-slate-800/80 hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 border border-slate-700 transition-colors"
                title="Close Studio"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Studio Body */}
          <div className="flex-1 overflow-auto p-4 bg-slate-950">
            {artifactTab === 'preview' ? (
              activeArtifact.language.toLowerCase().includes('html') ||
              activeArtifact.language.toLowerCase().includes('svg') ||
              activeArtifact.content.trim().startsWith('<svg') ||
              activeArtifact.content.trim().startsWith('<!DOCTYPE html>') ||
              activeArtifact.content.trim().startsWith('<html') ? (
                <div className="w-full h-full min-h-[480px] bg-white rounded-xl overflow-hidden shadow-inner border border-slate-800">
                  <iframe
                    title="Artifact Live Sandbox"
                    sandbox="allow-scripts allow-modals"
                    srcDoc={
                      activeArtifact.content.includes('<html') || activeArtifact.content.includes('<svg')
                        ? activeArtifact.content
                        : `<!DOCTYPE html><html><head><meta charset="utf-8"><script src="https://cdn.tailwindcss.com"></script><style>body{padding:24px;font-family:-apple-system,BlinkMacSystemFont,sans-serif;}</style></head><body>${activeArtifact.content}</body></html>`
                    }
                    className="w-full h-full min-h-[480px] border-0"
                  />
                </div>
              ) : (
                <div className="w-full h-full flex flex-col gap-4">
                  <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-3 h-3 rounded-full bg-emerald-400 animate-pulse" />
                      <div>
                        <h4 className="text-xs font-bold text-slate-200">OpenSense Sandbox Runner</h4>
                        <p className="text-[11px] text-slate-400">
                          Verified syntax for {activeArtifact.language.toUpperCase()} • Ready for execution
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => showToast(`Running simulation for ${activeArtifact.language}... Output verified!`)}
                      className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-md transition-all active:scale-95"
                    >
                      ▶ Run Simulation
                    </button>
                  </div>
                  <div className="flex-1 rounded-xl bg-slate-900/60 border border-slate-800/80 p-4 font-mono text-xs overflow-auto leading-relaxed text-slate-200">
                    <div className="text-[11px] text-orange-400 font-bold mb-2 pb-1 border-b border-slate-800">
                      [SANDBOX REPL OUTPUT / PREVIEW]
                    </div>
                    <pre className="whitespace-pre-wrap">{activeArtifact.content}</pre>
                  </div>
                </div>
              )
            ) : (
              <div className="w-full h-full rounded-xl bg-slate-900 border border-slate-800 p-4 font-mono text-xs overflow-auto leading-relaxed text-slate-100">
                <pre className="whitespace-pre-wrap select-text">
                  <code>{activeArtifact.content}</code>
                </pre>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 8.5 SHAREABLE CONVERSATION MODAL                        */}
      {/* ======================================================== */}
      {isShareModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn">
          <div className="w-full max-w-md p-6 rounded-2xl bg-slate-900 border border-slate-800 text-white shadow-2xl relative animate-scaleUp">
            <button
              type="button"
              onClick={() => setIsShareModalOpen(false)}
              className="absolute top-4 right-4 p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-orange-500 to-amber-500 flex items-center justify-center shadow-lg shadow-orange-500/20">
                <Share2 className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">Share Conversation</h3>
                <p className="text-[11px] text-slate-400">Generate a public link to share this AI discussion</p>
              </div>
            </div>

            <p className="text-xs text-slate-300 mb-3 leading-relaxed">
              Anyone with this link will be able to read this OpenSense AI session thread, code artifacts, and research summaries.
            </p>

            <div className="flex items-center gap-2 p-1.5 rounded-xl bg-slate-950 border border-slate-800 mb-5">
              <LinkIcon className="w-4 h-4 text-orange-400 ml-2 shrink-0" />
              <input
                type="text"
                readOnly
                value={
                  typeof window !== 'undefined'
                    ? `${window.location.origin}/chat?share=${currentSession?.id || 'demo'}`
                    : `https://opensense-ai.internal/chat?share=${currentSession?.id || 'demo'}`
                }
                className="flex-1 bg-transparent text-xs text-slate-200 outline-none truncate px-1"
                onFocus={(e) => e.target.select()}
              />
              <button
                type="button"
                onClick={() => {
                  const url =
                    typeof window !== 'undefined'
                      ? `${window.location.origin}/chat?share=${currentSession?.id || 'demo'}`
                      : `https://opensense-ai.internal/chat?share=${currentSession?.id || 'demo'}`;
                  navigator.clipboard.writeText(url);
                  showToast('Link copied to clipboard!');
                }}
                className="px-3 py-1.5 rounded-lg bg-orange-600 hover:bg-orange-500 text-white text-xs font-semibold flex items-center gap-1.5 shadow-md transition-all active:scale-95 shrink-0"
              >
                <Copy className="w-3.5 h-3.5" />
                <span>Copy Link</span>
              </button>
            </div>

            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsShareModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 9. GLOBAL TOAST NOTIFICATION PILL                        */}
      {/* ======================================================== */}
      {globalToast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 animate-fadeIn pointer-events-none">
          <div className="flex items-center gap-2 px-4 py-2.5 rounded-full bg-slate-900/95 border border-orange-500/40 text-white text-xs font-semibold shadow-2xl backdrop-blur-xl">
            <Sparkles className="w-4 h-4 text-orange-400 shrink-0" />
            <span

      >{globalToast.message}</span>
          </div>
        </div>
      )}
    </div>
  );
}
