import React from 'react';
import Image from 'next/image';

export default function Footer() {
  return (
    <footer 
      className="w-full py-6 border-t border-[#e7e8e9] relative z-10 flex flex-col items-center justify-center gap-4 bg-white/80 backdrop-blur-sm"
      style={{
        backgroundImage: "url('/bg-quadriculado.jpg')",
        backgroundRepeat: "repeat",
        backgroundSize: "300px",
        backgroundBlendMode: "overlay"
      }}
    >
      <div className="flex items-center gap-6">
        <div className="relative w-24 h-8">
          <Image src="/kore-cor.png" alt="Kore Industrial ERP" fill className="object-contain" />
        </div>
        <span className="w-[1px] h-6 bg-outline-variant"></span>
        <div className="relative w-32 h-8">
          <Image src="/assinatura.png" alt="Agência Karamello" fill className="object-contain" />
        </div>
      </div>
      <p className="text-[10px] text-[#002046] font-bold tracking-widest uppercase text-center px-4">
        Kore Industrial ERP © 2026. Licenciado para Helpe Gestão Industrial. Tecnologia por Agência Karamello
      </p>
    </footer>
  );
}
