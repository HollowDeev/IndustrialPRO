import React from 'react';
import Image from 'next/image';

interface ButtonSpinnerProps {
  size?: number; // Tamanho base
  className?: string;
}

export default function ButtonSpinner({ size = 28, className = '' }: ButtonSpinnerProps) {
  // Forçamos um tamanho generoso nos botões (mínimo 24)
  const actualSize = Math.max(size, 24);
  
  return (
    <div 
      className={`inline-block animate-[spin_3s_linear_infinite] relative ${className}`} 
      style={{ width: actualSize, height: actualSize }}
    >
      <Image
        src="/logotipo-carregamento-engrenagem.png"
        alt="Carregando..."
        fill
        className="object-contain"
        priority
      />
    </div>
  );
}
