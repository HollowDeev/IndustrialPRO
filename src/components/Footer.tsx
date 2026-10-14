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
      <p className="text-[10px] text-[#002046] font-bold tracking-widest uppercase text-center px-4">
        Helpe Life ERP © 2026. Licenciado para Helpe Gestão Industrial.
      </p>

    </footer>
  );
}
