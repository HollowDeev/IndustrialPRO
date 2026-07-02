import React, { useState } from 'react';
import { RESCHEDULING_ORDERS } from '../data';
import { ReschedulingDetail } from '../types';

export default function ReprogramacaoTecnica() {
  const [targetBatchSize, setTargetBatchSize] = useState(6000);
  const [cycleTime, setCycleTime] = useState(1.8); // in seconds per item
  const [extruderProfile, setExtruderProfile] = useState<'Standard' | 'Turbo' | 'Precision'>('Standard');
  const [customLoss, setCustomLoss] = useState(5); // % expected startup scrap losses
  const [simulatedResults, setSimulatedResults] = useState<ReschedulingDetail[]>(RESCHEDULING_ORDERS);
  const [simAlert, setSimAlert] = useState('');

  // Computations
  const getSpeedMultiplier = () => {
    switch (extruderProfile) {
      case 'Turbo': return 1.25; // 25% faster
      case 'Precision': return 0.85; // 15% slower
      default: return 1.0;
    }
  };

  const calculatedBaseHours = (targetBatchSize * cycleTime) / 3600;
  const efficientHours = calculatedBaseHours / getSpeedMultiplier();
  const scrapUnitsLoss = Math.round(targetBatchSize * (customLoss / 100));
  const finalNeededHours = Number((efficientHours * (1 + customLoss / 100)).toFixed(2));

  // Before optimizing placeholder baseline (always slightly higher or lower)
  const baselineHours = Number((calculatedBaseHours * 1.22).toFixed(2));
  const savedHours = Number((baselineHours - finalNeededHours).toFixed(2));

  const handleApplySimulation = () => {
    // Generate new simulated rows with slight modifications based on calculation
    const updated = simulatedResults.map((order, index) => {
      if (index === 0) {
        return {
          ...order,
          recalculated: Math.round(targetBatchSize * 0.95),
          deltaTime: savedHours > 0 ? `-${Math.round(savedHours * 60)}min` : `+${Math.round(Math.abs(savedHours) * 60)}min`,
          status: 'Reprogramado' as const
        };
      }
      return order;
    });

    setSimulatedResults(updated);
    setSimAlert('✔️ Parâmetros de calandra de matriz atualizados! A nova grade técnica foi distribuída para o cronograma de paradas.');
    setTimeout(() => setSimAlert(''), 4500);
  };

  return (
    <div className="space-y-6">
      {/* Alert banner */}
      {simAlert && (
        <div className="bg-primary-container text-on-primary-container p-4 rounded-xl flex items-center gap-3 border border-secondary shadow-sm">
          <span className="material-symbols-outlined text-[24px]">verified_user</span>
          <p className="text-xs font-bold leading-none">{simAlert}</p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Simulator Column */}
        <div className="lg:col-span-5 bg-surface-container-lowest p-6 rounded-2xl border border-outline-variant shadow-xs space-y-6">
          <div className="border-b border-surface-container pb-4">
            <h3 className="text-base font-bold text-primary flex items-center gap-2">
              <span className="material-symbols-outlined text-secondary">calculate</span>
              Simular Otimização de Ciclo
            </h3>
            <p className="text-xs text-outline mt-1">Ajuste o batch e velocidades para recalcular a linha de tempo</p>
          </div>

          <div className="space-y-4">
            {/* Batch Size Input */}
            <div>
              <label className="block text-xs font-bold text-primary mb-1.5 uppercase tracking-wider">
                Volume do Lote (Lances de Peças)
              </label>
              <div className="flex gap-2">
                <input
                  type="number"
                  value={targetBatchSize}
                  onChange={(e) => setTargetBatchSize(Math.max(1, Number(e.target.value)))}
                  className="flex-1 bg-surface-container-low text-primary text-sm p-2.5 rounded-lg border border-outline/20 outline-hidden focus:border-secondary font-semibold"
                />
                <span className="bg-surface-container-high text-primary font-bold px-3 py-2.5 rounded-lg text-xs flex items-center">
                  unidades
                </span>
              </div>
            </div>

            {/* Cycle Time / Tempo de Peça (secs) */}
            <div>
              <label className="block text-xs font-bold text-primary mb-1.5 uppercase tracking-wider">
                Tempo do Ciclo / Peça (Segundos)
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="range"
                  min="0.2"
                  max="8.0"
                  step="0.1"
                  value={cycleTime}
                  onChange={(e) => setCycleTime(Number(e.target.value))}
                  className="flex-1 accent-secondary"
                />
                <span className="bg-primary text-white font-mono font-bold px-2.5 py-1 rounded-sm text-xs w-16 text-center select-none">
                  {cycleTime}s
                </span>
              </div>
            </div>

            {/* Extruder Performance Multiplier dropdown */}
            <div>
              <label className="block text-xs font-bold text-primary mb-1.5 uppercase tracking-wider">
                Perfil Técnico da Extrusora
              </label>
              <div className="grid grid-cols-3 gap-2">
                {(['Standard', 'Turbo', 'Precision'] as const).map(p => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setExtruderProfile(p)}
                    className={`p-2.5 rounded-lg text-xs font-bold transition-all border text-center cursor-pointer select-none ${
                      extruderProfile === p
                        ? 'bg-primary border-primary text-white'
                        : 'bg-surface-bright border-outline-variant text-outline hover:bg-surface-container-low'
                    }`}
                  >
                    {p === 'Standard' ? 'Standard (1.0x)' : p === 'Turbo' ? 'Turbo (1.25x)' : 'Válvula (0.85x)'}
                  </button>
                ))}
              </div>
            </div>

            {/* Startup Scrap Loss Estimation */}
            <div>
              <label className="block text-xs font-bold text-primary mb-1.5 uppercase tracking-wider">
                Refugo Estimado de Setup ({customLoss}%)
              </label>
              <input
                type="range"
                min="1"
                max="15"
                value={customLoss}
                onChange={(e) => setCustomLoss(Number(e.target.value))}
                className="w-full accent-secondary"
              />
              <p className="text-[11px] text-outline mt-1.5">
                Perda inicial estimada em ceras e ajustes: <strong className="text-secondary">{scrapUnitsLoss} peças</strong>
              </p>
            </div>

            {/* Submit Simulation */}
            <button
              onClick={handleApplySimulation}
              className="w-full bg-secondary-container hover:brightness-95 text-on-secondary-container font-black py-3 rounded-xl text-xs transition-all tracking-wider select-none shadow-sm cursor-pointer"
            >
              SALVAR E RECALCULAR CRONOGRAMA
            </button>
          </div>
        </div>

        {/* Results Panel */}
        <div className="lg:col-span-7 bg-surface-container-lowest p-6 rounded-2xl border border-outline-variant shadow-xs space-y-6">
          <div className="border-b border-surface-container pb-4">
            <h3 className="text-base font-bold text-primary flex items-center gap-2">
              <span className="material-symbols-outlined text-secondary">query_stats</span>
              Impacto do Recálculo na Grade Técnica
            </h3>
            <p className="text-xs text-outline mt-1">Comparativo de tempo estimado de execução da extrusão</p>
          </div>

          {/* Side by side comparison dashboard */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            <div className="bg-surface-container-low p-4 rounded-xl border border-outline-variant/30 flex items-center gap-4">
              <div className="p-2.5 rounded-full bg-surface-container-high text-outline shrink-0">
                <span className="material-symbols-outlined text-[28px]">schedule</span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-outline">Estimativa Inicial</span>
                <p className="text-2xl font-extrabold text-primary">{baselineHours} h</p>
                <p className="text-[10px] text-outline">Sem recalcular setup técnico</p>
              </div>
            </div>

            <div className="bg-tertiary-container/10 p-4 rounded-xl border border-tertiary-container flex items-center gap-4">
              <div className="p-2.5 rounded-full bg-tertiary-fixed text-primary shrink-0">
                <span className="material-symbols-outlined text-[28px]">speed</span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-outline">Tempo Reprogramado</span>
                <p className="text-2xl font-extrabold text-primary">{finalNeededHours} h</p>
                <p className="text-[10px] text-on-tertiary-container font-bold">
                  {savedHours > 0 ? `Economia de ${savedHours}h` : `Acréscimo de ${Math.abs(savedHours)}h`}
                </p>
              </div>
            </div>

          </div>

          {/* Table display of Rescheduled Orders */}
          <div className="space-y-3">
            <h4 className="text-xs font-black text-primary uppercase tracking-wider">Lotes Reprogramados Ativos</h4>
            
            <div className="overflow-x-auto border border-outline-variant rounded-xl">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-surface-container-low text-primary font-bold text-[11px] border-b border-outline-variant uppercase tracking-wider">
                    <th className="p-3">Ordem / OP</th>
                    <th className="p-3">Cliente</th>
                    <th className="p-3 text-right">Saldo Previsto</th>
                    <th className="p-3 text-right">Recalculado</th>
                    <th className="p-3 text-center">Variação</th>
                    <th className="p-3 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant/30 text-xs text-primary">
                  {simulatedResults.map(order => (
                    <tr key={order.orderId} className="hover:bg-surface-container-low/40">
                      <td className="p-3 font-mono font-bold text-primary">{order.orderId}</td>
                      <td className="p-3 font-semibold truncate max-w-[150px]">{order.client}</td>
                      <td className="p-3 text-right font-mono text-outline">{order.previousBalance.toLocaleString()} pçs</td>
                      <td className="p-3 text-right font-mono text-primary font-bold">{order.recalculated.toLocaleString()} pçs</td>
                      <td className="p-3 text-center font-mono">
                        <span className={`px-2 py-0.5 rounded-sm font-bold text-[10px] ${
                          order.deltaTime.startsWith('-') 
                            ? 'bg-tertiary-fixed text-on-tertiary-fixed' 
                            : order.deltaTime === '0min' 
                              ? 'bg-surface-container-high text-outline' 
                              : 'bg-secondary-container text-on-secondary-container'
                        }`}>
                          {order.deltaTime}
                        </span>
                      </td>
                      <td className="p-3 text-right">
                        <span className={`inline-block w-2.5 h-2.5 rounded-full mr-1.5 ${
                          order.status === 'Em Produção' 
                            ? 'bg-primary' 
                            : order.status === 'Reprogramado' 
                              ? 'bg-secondary' 
                              : 'bg-outline'
                        }`} />
                        <span className="font-semibold text-[11px]">{order.status}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
