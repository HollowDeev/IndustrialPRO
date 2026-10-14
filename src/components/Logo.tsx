import React from 'react';
import Image from 'next/image';

interface LogoProps {
  className?: string;
  showText?: boolean;
}

export default function Logo({ className = '', showText = true }: LogoProps) {
  return (
    <div className={`flex items-center gap-3 select-none ${className}`} id="kore-logo-container">
      <div className={`relative ${showText ? 'w-44 h-12' : 'w-12 h-12'}`}>
        <Image 
          src="/kore-cor.png" 
          alt="Kore Industrial Logotipo" 
          fill 
          className="object-contain" 
        />
      </div>
    </div>
  );
}
