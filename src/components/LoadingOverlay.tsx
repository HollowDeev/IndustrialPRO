import React from 'react';
import Image from 'next/image';

interface LoadingOverlayProps {
  message?: string;
}

export default function LoadingOverlay({ message }: LoadingOverlayProps) {
  return (
    <div className="flex flex-col items-center justify-center p-8 w-full h-full min-h-[300px] flex-1">
      <div className="relative w-64 h-20 mb-4 animate-pulse">
        {/* Logotipo Base Estático */}
        <Image
          src="/HelpeLife_Logotipo.png"
          alt="Carregando Base"
          fill
          className="object-contain"
          priority
        />
      </div>
      
      {message && (
        <p className="text-[#002046] font-semibold text-sm tracking-wide uppercase text-center mt-2">
          {message}
        </p>
      )}
    </div>
  );
}
