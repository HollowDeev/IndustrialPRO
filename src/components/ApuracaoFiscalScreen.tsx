"use client";

import React, { useState, useEffect } from 'react';
import { createClient } from '../utils/supabase/client';
import LoadingOverlay from './LoadingOverlay';
import { useToast } from '../contexts/ToastContext';

interface ApuracaoFiscalScreenProps {
  empresaId: string;
  selectedMonth: string;
}

export default function ApuracaoFiscalScreen({ empresaId, selectedMonth }: ApuracaoFiscalScreenProps) {
  const supabase = createClient();
  const { addToast } = useToast();
  
  const [loading, setLoading] = useState(true);
  
  const [apuracao, setApuracao] = useState({
    creditoIcms: 0,
    creditoIpi: 0,
    debitoIcms: 0,
    debitoIpi: 0,
    saldoIcms: 0,
    saldoIpi: 0,
  });

  const formatCurrency = (val: number) => {
    return val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  const loadApuracao = async () => {
    try {
      setLoading(true);
      
      const [year, month] = selectedMonth.split('-').map(Number);
      const startDate = new Date(year, month - 1, 1).toISOString();
      const endDate = new Date(year, month, 0, 23, 59, 59).toISOString();

      // 1. Créditos (Entradas de Estoque no mês selecionado)
      // Baseado na data_entrega pois o crédito ocorre quando a mercadoria entra
      const { data: entradasData, error: entradasError } = await supabase
        .from('entradas_estoque')
        .select('valor_icms_nota, valor_ipi_nota')
        .eq('empresa_id', empresaId)
        .eq('status', 'ENTREGUE')
        .gte('data_entrega', startDate)
        .lte('data_entrega', endDate);

      if (entradasError) throw entradasError;

      let creditoIcms = 0;
      let creditoIpi = 0;
      
      entradasData?.forEach(e => {
        creditoIcms += Number(e.valor_icms_nota) || 0;
        creditoIpi += Number(e.valor_ipi_nota) || 0;
      });

      // 2. Débitos (Pedidos realizados no mês selecionado)
      const { data: pedidosData, error: pedidosError } = await supabase
        .from('pedidos')
        .select('total_icms_estimado, total_ipi_estimado')
        .eq('empresa_id', empresaId)
        .neq('status', 'CANCELADO')
        .gte('created_at', startDate)
        .lte('created_at', endDate);

      if (pedidosError) throw pedidosError;

      let debitoIcms = 0;
      let debitoIpi = 0;

      pedidosData?.forEach(p => {
        debitoIcms += Number(p.total_icms_estimado) || 0;
        debitoIpi += Number(p.total_ipi_estimado) || 0;
      });

      setApuracao({
        creditoIcms,
        creditoIpi,
        debitoIcms,
        debitoIpi,
        saldoIcms: debitoIcms - creditoIcms, // Saldo devedor = Débitos - Créditos
        saldoIpi: debitoIpi - creditoIpi,
      });

    } catch (err: any) {
      console.error(err);
      addToast('Erro ao carregar apuração fiscal: ' + err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadApuracao();
  }, [selectedMonth, empresaId]);

  if (loading) return <LoadingOverlay message="Calculando Apuração..." />;

  const mesAtualNome = new Date(selectedMonth + '-01T00:00:00').toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl border border-outline-variant p-6 shadow-sm">
        <div className="mb-6">
          <h2 className="text-xl font-black text-primary uppercase">Apuração de Impostos (ICMS/IPI)</h2>
          <p className="text-xs text-outline mt-1 font-medium">
            Resumo dos débitos pelas vendas geradas e créditos pelas compras de insumo no mês de <strong className="capitalize">{mesAtualNome}</strong>.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* APURAÇÃO ICMS */}
          <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-5 shadow-xs">
            <div className="flex items-center gap-2 mb-4 border-b border-outline-variant/50 pb-2">
              <span className="material-symbols-outlined notranslate text-secondary text-[20px]">account_balance</span>
              <h3 className="text-sm font-black text-[#002046] uppercase tracking-wider">Conta Corrente ICMS</h3>
            </div>
            <div className="space-y-3 text-xs font-semibold text-outline">
              <div className="flex justify-between text-green-700">
                <span>(+) Créditos de Entradas:</span>
                <span className="font-black">{formatCurrency(apuracao.creditoIcms)}</span>
              </div>
              <div className="flex justify-between text-red-600">
                <span>(-) Débitos de Saídas:</span>
                <span className="font-black">{formatCurrency(apuracao.debitoIcms)}</span>
              </div>
              <div className="border-t border-outline-variant/40 pt-3 flex justify-between items-center text-sm">
                <span className="font-bold uppercase text-[#002046]">Saldo a Recolher (ICMS):</span>
                <span className={`font-black ${apuracao.saldoIcms > 0 ? 'text-red-700' : 'text-green-700'}`}>
                  {formatCurrency(Math.max(0, apuracao.saldoIcms))}
                </span>
              </div>
              {apuracao.saldoIcms < 0 && (
                <div className="text-right text-[10px] text-green-600 font-bold uppercase tracking-wider">
                  Saldo Credor p/ Mês Seguinte: {formatCurrency(Math.abs(apuracao.saldoIcms))}
                </div>
              )}
            </div>
          </div>

          {/* APURAÇÃO IPI */}
          <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-5 shadow-xs">
            <div className="flex items-center gap-2 mb-4 border-b border-outline-variant/50 pb-2">
              <span className="material-symbols-outlined notranslate text-primary text-[20px]">request_quote</span>
              <h3 className="text-sm font-black text-[#002046] uppercase tracking-wider">Conta Corrente IPI</h3>
            </div>
            <div className="space-y-3 text-xs font-semibold text-outline">
              <div className="flex justify-between text-green-700">
                <span>(+) Créditos de Entradas:</span>
                <span className="font-black">{formatCurrency(apuracao.creditoIpi)}</span>
              </div>
              <div className="flex justify-between text-red-600">
                <span>(-) Débitos de Saídas:</span>
                <span className="font-black">{formatCurrency(apuracao.debitoIpi)}</span>
              </div>
              <div className="border-t border-outline-variant/40 pt-3 flex justify-between items-center text-sm">
                <span className="font-bold uppercase text-[#002046]">Saldo a Recolher (IPI):</span>
                <span className={`font-black ${apuracao.saldoIpi > 0 ? 'text-red-700' : 'text-green-700'}`}>
                  {formatCurrency(Math.max(0, apuracao.saldoIpi))}
                </span>
              </div>
              {apuracao.saldoIpi < 0 && (
                <div className="text-right text-[10px] text-green-600 font-bold uppercase tracking-wider">
                  Saldo Credor p/ Mês Seguinte: {formatCurrency(Math.abs(apuracao.saldoIpi))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
