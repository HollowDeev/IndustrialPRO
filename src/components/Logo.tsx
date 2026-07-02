import React from 'react';

interface LogoProps {
  className?: string;
  showText?: boolean;
}

export default function Logo({ className = '', showText = true }: LogoProps) {
  return (
    <div className={`flex items-center gap-3 select-none ${className}`} id="helpe-logo-container">
      <svg 
        viewBox="0 0 380 110" 
        className="h-12 w-auto" 
        fill="none" 
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          {/* Sphere Radial Gradient for a beautiful 3D gloss effect */}
          <radialGradient id="globeGloss" cx="35%" cy="30%" r="65%">
            <stop offset="0%" stopColor="#76bbf7" />
            <stop offset="50%" stopColor="#2575fc" />
            <stop offset="100%" stopColor="#0f3473" />
          </radialGradient>
          
          {/* Subtle drop shadow for the hand outline */}
          <filter id="shadow" x="-10%" y="-10%" width="130%" height="130%">
            <feDropShadow dx="1" dy="2" stdDeviation="1.5" floodColor="#083e5a" floodOpacity="0.25" />
          </filter>
        </defs>

        {/* ================= GLOBE & HAND ICON ================= */}
        <g transform="translate(5, 5)">
          {/* Globe Shadow / Base */}
          <circle cx="50" cy="50" r="42" fill="#0c2b5c" opacity="0.08" />

          {/* Globe Sphere */}
          <circle cx="50" cy="50" r="40" fill="url(#globeGloss)" />

          {/* White Grid Lines (Latitude & Longitude) */}
          {/* Vertical axis line */}
          <line x1="50" y1="10" x2="50" y2="90" stroke="#ffffff" strokeWidth="3.5" opacity="0.95" strokeLinecap="round" />
          
          {/* Vertical curved longitude curves */}
          <path d="M 50 10 C 35 30 35 70 50 90" stroke="#ffffff" strokeWidth="2.5" opacity="0.6" fill="none" />
          <path d="M 50 10 C 65 30 65 70 50 90" stroke="#ffffff" strokeWidth="2.5" opacity="0.6" fill="none" />
          
          {/* Horizontal latitude curves */}
          <path d="M 14 38 Q 50 50 86 38" stroke="#ffffff" strokeWidth="3.5" opacity="0.95" fill="none" />
          <path d="M 14 62 Q 50 74 86 62" stroke="#ffffff" strokeWidth="3.5" opacity="0.95" fill="none" />

          {/* Elegant Hand Cradling the Globe from underneath */}
          <path 
            d="M 5 68 
               C 5 68, 12 60, 20 68 
               C 24 72, 25 80, 32 85 
               C 38 89, 48 90, 56 88 
               C 62 86.5, 68 83, 75 83 
               L 95 83 
               C 102 83, 108 81, 114 86 
               C 117 89, 120 92, 122 95
               C 112 90, 102 85, 92 85
               L 65 85
               C 55 85, 48 87, 40 85
               C 35 83.5, 34 79, 38 76
               C 42 73.5, 52 75, 62 75
               C 54 71, 44 70, 36 71
               C 28 72, 25 76, 18 78
               C 12 80, 8 74, 5 68 Z" 
            fill="#d8dbdf" 
            stroke="#0b3852" 
            strokeWidth="3" 
            strokeLinejoin="round" 
            strokeLinecap="round"
            filter="url(#shadow)"
          />
        </g>

        {/* ================= BRAND TEXT ================= */}
        {showText && (
          <g transform="translate(140, 0)">
            {/* "Helpe" display typography */}
            <text 
              x="0" 
              y="60" 
              fontFamily="system-ui, -apple-system, sans-serif" 
              fontWeight="900" 
              fontSize="64" 
              fill="#06324a" 
              letterSpacing="-2px"
            >
              Helpe
            </text>
            
            {/* "Sustainable Solutions" subheading */}
            <text 
              x="2" 
              y="94" 
              fontFamily="system-ui, -apple-system, sans-serif" 
              fontWeight="800" 
              fontSize="16" 
              fill="#06324a" 
              letterSpacing="0.5px"
            >
              Sustainable Solutions
            </text>
          </g>
        )}
      </svg>
    </div>
  );
}
