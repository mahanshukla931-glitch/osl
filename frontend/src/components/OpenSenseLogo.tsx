import React from 'react';

interface LogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  showSubtitle?: boolean;
  orientation?: 'horizontal' | 'vertical';
  isDarkMode?: boolean;
}

export default function OpenSenseLogo({
  className = '',
  size = 'md',
  showSubtitle = true,
  orientation = 'horizontal',
  isDarkMode = true,
}: LogoProps) {
  const iconDimensions = {
    sm: { width: 84, height: 26 },
    md: { width: 112, height: 34 },
    lg: { width: 148, height: 44 },
  };

  const titleSizes = {
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-xl',
  };

  const currentDim = iconDimensions[size];

  return (
    <div className={`flex ${orientation === 'vertical' ? 'flex-col items-center text-center' : 'items-center'} gap-2.5 ${className}`}>
      {/* Official 3 Geometric Symbols: Blue Circle | Red Square with Slash | Yellow Triangle */}
      <div className="relative shrink-0 select-none flex items-center">
        <svg
          width={currentDim.width}
          height={currentDim.height}
          viewBox="0 0 148 44"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="drop-shadow-sm"
        >
          {/* 1. BLUE CIRCLE */}
          <circle cx="22" cy="22" r="19" fill="#2563EB" />

          {/* 2. RED SQUARE WITH WHITE DIAGONAL SLASH */}
          <rect x="52" y="3" width="38" height="38" rx="7" fill="#DC2626" />
          <line
            x1="62"
            y1="33"
            x2="80"
            y2="11"
            stroke="white"
            strokeWidth="4.5"
            strokeLinecap="round"
          />

          {/* 3. YELLOW RIGHT-ANGLED TRIANGLE */}
          <path
            d="M102 40 L102 6 C102 4 104 3 105.5 4.5 L144.5 39 C145.5 40.2 144.5 41 143 41 L104 41 C102.8 41 102 40.5 102 40 Z"
            fill="#F59E0B"
          />
        </svg>
      </div>

      <div>
        <div className="flex items-center gap-1.5 leading-none">
          <span className={`font-black tracking-tight ${isDarkMode ? 'text-white' : 'text-slate-900'} ${titleSizes[size]}`}>
            OpenSense<span className="text-orange-500 font-extrabold"> Labs</span>
          </span>
          <span className="px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded bg-orange-500/10 text-orange-400 border border-orange-500/20">
            AI
          </span>
        </div>
        {showSubtitle && (
          <p className="text-[10px] font-medium text-slate-400 tracking-wide mt-0.5">
            Internal Enterprise AI Workspace
          </p>
        )}
      </div>
    </div>
  );
}
