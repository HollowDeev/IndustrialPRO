import React from 'react';
import Image from 'next/image';

interface LogoProps {
  className?: string;
  showText?: boolean;
}

export default function Logo({ className = '', showText = true }: LogoProps) {
  return (
    <div className={`flex items-center gap-3 select-none ${className}`} id="helpe-logo-container">
      <div className={`relative ${showText ? 'w-40 h-12' : 'w-12 h-12'}`}>
        <Image 
          src="/HelpeLife_Logotipo.png" 
          alt="Helpe Life Logotipo" 
          fill 
          className="object-contain" 
        />
      </div>
    </div>
  );
}
