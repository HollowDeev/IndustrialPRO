"use client";

import React, { useState, useEffect, useRef } from 'react';
import { PDFDownloadLink } from '@react-pdf/renderer';
import FichaAcompanhamentoProducaoPDF from './FichaAcompanhamentoProducaoPDF';
import ApontamentoDemandaPDF from './ApontamentoDemandaPDF';
import { Order } from '../../types';
import ButtonSpinner from '../ButtonSpinner';

interface PDFExportButtonsProps {
  order: Order;
}

export default function PDFExportButtons({ order }: PDFExportButtonsProps) {
  const [isClient, setIsClient] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setIsClient(true);
    
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  if (!isClient) return null;

  return (
    <div className="bg-surface-container-low p-4 rounded-xl border border-outline-variant/30 flex flex-col md:flex-row gap-4 mb-6">
      <div className="flex-1">
        <h4 className="text-sm font-bold text-primary flex items-center gap-1.5 mb-1">
          <span className="material-symbols-outlined notranslate text-secondary text-[18px]">picture_as_pdf</span>
          Documentos Oficiais
        </h4>
        <p className="text-xs text-outline">Geração Server-Side dos relatórios padronizados pela Engenharia</p>
      </div>
      
      <div className="relative flex items-center" ref={dropdownRef}>
        <button 
          onClick={() => setIsDropdownOpen(!isDropdownOpen)}
          className="bg-secondary hover:brightness-95 text-white px-5 py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider flex items-center gap-2 transition-all shadow-sm cursor-pointer"
        >
          <span className="material-symbols-outlined text-[18px] notranslate">picture_as_pdf</span>
          Exportar PDF
          <span className="material-symbols-outlined text-[18px] notranslate ml-1">{isDropdownOpen ? 'keyboard_arrow_up' : 'keyboard_arrow_down'}</span>
        </button>

        {isDropdownOpen && (
          <div className="absolute top-full right-0 mt-2 w-64 bg-surface-container-lowest border border-outline-variant rounded-xl shadow-lg z-50 overflow-hidden flex flex-col">
            <PDFDownloadLink 
              document={<FichaAcompanhamentoProducaoPDF order={order} />} 
              fileName={`Ficha_Producao_${order.id}.pdf`}
              className="w-full text-left"
            >
              {({ loading }) => (
                <button 
                  disabled={loading}
                  className={`w-full text-left px-4 py-3 text-xs font-bold transition-colors border-b border-outline-variant/50 flex items-center gap-2 ${loading ? 'opacity-50 cursor-not-allowed bg-surface-container' : 'hover:bg-surface-container-low cursor-pointer text-primary'}`}
                >
                  {loading ? <ButtonSpinner size={16} /> : <span className="material-symbols-outlined text-[18px] notranslate text-secondary">assignment</span>}
                  <span className="flex-1">{loading ? 'Gerando Ficha...' : 'Ficha de Produção'}</span>
                </button>
              )}
            </PDFDownloadLink>

            <PDFDownloadLink 
              document={<ApontamentoDemandaPDF order={order} />} 
              fileName={`Demanda_Aco_Blend_${order.id}.pdf`}
              className="w-full text-left"
            >
              {({ loading }) => (
                <button 
                  disabled={loading}
                  className={`w-full text-left px-4 py-3 text-xs font-bold transition-colors flex items-center gap-2 ${loading ? 'opacity-50 cursor-not-allowed bg-surface-container' : 'hover:bg-surface-container-low cursor-pointer text-primary'}`}
                >
                  {loading ? <ButtonSpinner size={16} /> : <span className="material-symbols-outlined text-[18px] notranslate text-secondary">inventory_2</span>}
                  <span className="flex-1">{loading ? 'Gerando Demanda...' : 'Demanda (Aço/Blend)'}</span>
                </button>
              )}
            </PDFDownloadLink>
          </div>
        )}
      </div>
    </div>
  );
}
