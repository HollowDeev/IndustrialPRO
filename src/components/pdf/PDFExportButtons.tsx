"use client";

import React, { useState, useEffect } from 'react';
import { PDFDownloadLink } from '@react-pdf/renderer';
import FichaAcompanhamentoProducaoPDF from './FichaAcompanhamentoProducaoPDF';
import ApontamentoDemandaPDF from './ApontamentoDemandaPDF';
import { Order } from '../../types';

interface PDFExportButtonsProps {
  order: Order;
}

export default function PDFExportButtons({ order }: PDFExportButtonsProps) {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  if (!isClient) return null;

  return (
    <div className="bg-surface-container-low p-4 rounded-xl border border-outline-variant/30 flex flex-col md:flex-row gap-4 mb-6">
      <div className="flex-1">
        <h4 className="text-sm font-bold text-primary flex items-center gap-1.5 mb-1">
          <span className="material-symbols-outlined text-secondary text-[18px]">picture_as_pdf</span>
          Documentos Oficiais
        </h4>
        <p className="text-xs text-outline">Geração Server-Side dos relatórios padronizados pela Engenharia</p>
      </div>
      
      <div className="flex flex-col sm:flex-row items-center gap-3">
        <PDFDownloadLink 
          document={<FichaAcompanhamentoProducaoPDF order={order} />} 
          fileName={`Ficha_Producao_${order.id}.pdf`}
          className="w-full sm:w-auto"
        >
          {({ loading }) => (
            <button 
              disabled={loading}
              className={`w-full bg-primary text-on-primary px-4 py-2.5 rounded-lg text-[11px] font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-colors ${loading ? 'opacity-50 cursor-not-allowed' : 'hover:bg-primary/90 cursor-pointer'}`}
            >
              <span className="material-symbols-outlined text-[16px]">{loading ? 'hourglass_empty' : 'download'}</span>
              {loading ? 'Gerando Ficha...' : 'Ficha de Produção'}
            </button>
          )}
        </PDFDownloadLink>

        <PDFDownloadLink 
          document={<ApontamentoDemandaPDF order={order} />} 
          fileName={`Demanda_Aco_Blend_${order.id}.pdf`}
          className="w-full sm:w-auto"
        >
          {({ loading }) => (
            <button 
              disabled={loading}
              className={`w-full bg-secondary text-on-secondary px-4 py-2.5 rounded-lg text-[11px] font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-colors ${loading ? 'opacity-50 cursor-not-allowed' : 'hover:bg-secondary/90 cursor-pointer'}`}
            >
              <span className="material-symbols-outlined text-[16px]">{loading ? 'hourglass_empty' : 'download'}</span>
              {loading ? 'Gerando Demanda...' : 'Demanda (Aço/Blend)'}
            </button>
          )}
        </PDFDownloadLink>
      </div>
    </div>
  );
}
