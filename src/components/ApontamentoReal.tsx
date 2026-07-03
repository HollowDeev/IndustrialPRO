import React, { useState, useEffect } from 'react';
import { DowntimeLog } from '../types';

export default function ApontamentoReal() {
  const [selectedExtruder, setSelectedExtruder] = useState('EXT-04');
  const [machineStatus, setMachineStatus] = useState<'Running' | 'Stopped'>('Running');
  const [seconds, setSeconds] = useState(0);

  // Stop Form State
  const [stopCode, setStopCode] = useState('AJU-05');
  const [obs, setObs] = useState('');
  const [logs, setLogs] = useState<DowntimeLog[]>([
    { id: "1", name: "AJU-05: Ajuste Calandra / Setup Térmico", start: "08:15", end: "08:35", duration: 20 },
    { id: "2", name: "MAT-03: Falha Alimentação Polímero", start: "09:40", end: "09:52", duration: 12 },
    { id: "3", name: "FMT-01: Troca de Filtro de Tela Obstruído", start: "11:10", end: "11:35", duration: 25 },
  ]);

  const STOP_CODES = [
    { code: 'AJU-05', desc: 'Setup / Troca de Matriz / Calandra', cat: 'Operacional' },
    { code: 'MAT-03', desc: 'Falha no Fluxo de Matéria-Prima', cat: 'Abastecimento' },
    { code: 'FMT-01', desc: 'Fadiga de Filtros de Tela / Mecânica', cat: 'Engenharia' },
    { code: 'ELE-02', desc: 'Queda de Tensão / Painel de Comando', cat: 'Elétrica' },
    { code: 'OPE-06', desc: 'Intervalo Fisiológico / Troca Turno', cat: 'Humano' },
    { code: 'MNT-04', desc: 'Manutenção Preditiva Sob-Demanda', cat: 'Preventiva' },
  ];

  // Active duration ticker
  useEffect(() => {
    let interval: any = null;
    interval = setInterval(() => {
      setSeconds(prev => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const formatSecs = (totalSecs: number) => {
    const hrs = Math.floor(totalSecs / 3600);
    const mins = Math.floor((totalSecs % 3600) / 60);
    const secs = totalSecs % 60;
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const totalDowntimeMin = logs.reduce((acc, log) => acc + log.duration, 0);
  const totalActiveTimeMin = 480 - totalDowntimeMin; // out of an 8-hour shift (480 min)
  const oeeEfficiency = Math.round((totalActiveTimeMin / 480) * 100);

  const handleToggleState = () => {
    if (machineStatus === 'Running') {
      setMachineStatus('Stopped');
    } else {
      setMachineStatus('Running');
    }
    setSeconds(0);
  };

  const handleAddStop = (e: React.FormEvent) => {
    e.preventDefault();
    const codeObj = STOP_CODES.find(s => s.code === stopCode);
    const label = codeObj ? `${codeObj.code}: ${codeObj.desc}` : stopCode;

    // Simulate start 15 min ago, ending now
    const now = new Date();
    const startObj = new Date(now.getTime() - 15 * 60 * 1000);
    const startStr = `${startObj.getHours().toString().padStart(2, '0')}:${startObj.getMinutes().toString().padStart(2, '0')}`;
    const endStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;

    const newLog: DowntimeLog = {
      id: (logs.length + 1).toString(),
      name: label + (obs ? ` (${obs})` : ''),
      start: startStr,
      end: endStr,
      duration: 15
    };

    setLogs([newLog, ...logs]);
    setObs('');
    setMachineStatus('Running');
    setSeconds(0);
  };

  const handleRemoveLog = (id: string) => {
    setLogs(logs.filter(log => log.id !== id));
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left column: Active Status & Controls */}
        <div className="lg:col-span-4 space-y-6">
          
          {/* Main Status Display Card */}
          <div className="bg-surface-container-lowest p-6 rounded-2xl border border-outline-variant shadow-xs text-center relative overflow-hidden">
            <div className={`absolute top-0 left-0 w-full h-1.5 ${machineStatus === 'Running' ? 'bg-tertiary-fixed-dim' : 'bg-secondary'}`} />
            
            <div className="flex justify-between items-center mb-4">
              <span className="text-xs font-bold text-outline uppercase tracking-wider">Monitor da Linha</span>
              <select
                value={selectedExtruder}
                onChange={(e) => setSelectedExtruder(e.target.value)}
                className="bg-surface-container-low text-primary border border-outline/10 text-xs font-bold p-1 px-2.5 rounded-full select-none focus:outline-hidden"
              >
                <option value="EXT-01">EXT-01</option>
                <option value="EXT-02">EXT-02</option>
                <option value="EXT-04">EXT-04</option>
                <option value="EXT-07">EXT-07</option>
                <option value="EXT-09">EXT-09</option>
              </select>
            </div>

            {/* Huge Timer display */}
            <div className="my-6">
              <span className="text-[11px] uppercase font-semibold text-outline tracking-widest block mb-1">
                Tempo do Estado Atual
              </span>
              <p className="text-4xl font-extrabold text-primary font-mono select-all tracking-wider">
                {formatSecs(seconds)}
              </p>
            </div>

            {/* Dynamic Status Badges */}
            <div className="flex justify-center mb-6">
              {machineStatus === 'Running' ? (
                <span className="inline-flex items-center gap-1.5 bg-tertiary-fixed text-on-tertiary-fixed text-xs font-black px-4 py-2 rounded-full shadow-xs animate-pulse">
                  <span className="w-2.5 h-2.5 rounded-full bg-on-tertiary-fixed-dim inline-block"></span>
                  OPERANDO NORMAL
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 bg-secondary-container text-on-secondary-container text-xs font-black px-4 py-2 rounded-full shadow-xs">
                  <span className="w-2.5 h-2.5 rounded-full bg-secondary inline-block"></span>
                  MÁQUINA PARADA!
                </span>
              )}
            </div>

            {/* Quick action button to toggle status */}
            <button
              onClick={handleToggleState}
              className={`w-full py-3 px-4 rounded-xl font-bold text-xs tracking-wider flex items-center justify-center gap-2 select-none cursor-pointer transition-transform duration-200 active:scale-[0.98] ${
                machineStatus === 'Running'
                  ? 'bg-secondary text-white hover:bg-secondary/90'
                  : 'bg-primary text-white hover:bg-primary-container'
              }`}
            >
              <span className="material-symbols-outlined notranslate text-[18px]">
                {machineStatus === 'Running' ? 'warning' : 'play_arrow'}
              </span>
              {machineStatus === 'Running' ? 'SOLICITAR PARADA DE MÁQUINA' : 'RETOMAR PRODUÇÃO'}
            </button>
          </div>

          {/* Quick stats on OEE and losses */}
          <div className="bg-surface-container-lowest p-6 rounded-2xl border border-outline-variant shadow-xs space-y-4">
            <h4 className="text-sm font-bold text-primary">Indicadores de Paradas (Turno)</h4>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-surface-container-low p-3 rounded-xl border border-outline-variant/30 text-center">
                <span className="text-[10px] uppercase text-outline font-bold">Paradas Totais</span>
                <p className="text-xl font-extrabold text-primary mt-1">{totalDowntimeMin} min</p>
              </div>
              <div className="bg-surface-container-low p-3 rounded-xl border border-outline-variant/30 text-center">
                <span className="text-[10px] uppercase text-outline font-bold">OEE Estimado</span>
                <p className={`text-xl font-extrabold mt-1 ${oeeEfficiency > 85 ? 'text-on-tertiary-container' : 'text-secondary'}`}>
                  {oeeEfficiency}%
                </p>
              </div>
            </div>

            {/* Little progress bar representation */}
            <div className="space-y-1">
              <div className="flex justify-between text-[11px] font-bold text-outline">
                <span>Operacional ({totalActiveTimeMin} min)</span>
                <span>Paradas ({totalDowntimeMin} min)</span>
              </div>
              <div className="w-full bg-surface-container-high h-2.5 rounded-full flex overflow-hidden">
                <div className="bg-primary h-full" style={{ width: `${(totalActiveTimeMin / 480) * 100}%` }} />
                <div className="bg-secondary h-full" style={{ width: `${(totalDowntimeMin / 480) * 100}%` }} />
              </div>
            </div>
          </div>
        </div>

        {/* Right column: Form to register stopping & past table logs */}
        <div className="lg:col-span-8 bg-surface-container-lowest p-6 rounded-2xl border border-outline-variant shadow-xs space-y-6">
          
          {/* Section title & Header */}
          <div className="border-b border-surface-container pb-4">
            <h3 className="text-lg font-bold text-primary flex items-center gap-2">
              <span className="material-symbols-outlined notranslate text-secondary">assignment_late</span>
              Registrar Incidente de Parada
            </h3>
            <p className="text-xs text-outline mt-1">
              Apontamentos reais são sincronizados com a planilha técnica e impactam na reprogramação automática
            </p>
          </div>

          {/* Incident Registration form */}
          <form onSubmit={handleAddStop} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-primary mb-1.5 uppercase tracking-wider">
                Código / Motivo da Parada
              </label>
              <select
                value={stopCode}
                onChange={(e) => setStopCode(e.target.value)}
                className="w-full bg-surface-container-low text-primary border border-outline/20 rounded-lg p-2.5 text-xs font-semibold focus:border-secondary outline-hidden"
              >
                {STOP_CODES.map(sc => (
                  <option key={sc.code} value={sc.code}>
                    [{sc.code}] - {sc.desc} ({sc.cat})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-primary mb-1.5 uppercase tracking-wider">
                Observações Adicionais / Ações no Painel
              </label>
              <input
                type="text"
                placeholder="Ex: Troca rápida de matriz devido a alteração do item..."
                value={obs}
                onChange={(e) => setObs(e.target.value)}
                className="w-full bg-surface-container-low text-primary border border-outline/20 rounded-lg p-2.5 text-xs focus:border-secondary outline-hidden"
              />
            </div>

            <div className="md:col-span-2 flex justify-end">
              <button
                type="submit"
                className="bg-primary hover:bg-primary-container text-white px-5 py-2.5 rounded-lg text-xs font-bold flex items-center gap-2 shadow-xs cursor-pointer select-none"
              >
                <span className="material-symbols-outlined notranslate text-[18px]">add_task</span>
                LANÇAR APONTAMENTO
              </button>
            </div>
          </form>

          {/* Stop events history table list */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-black text-primary uppercase tracking-wider">Linha do Tempo de Paradas (Turno Corrente)</h4>
              <span className="text-[10px] text-outline bg-surface-container-high px-2 py-1 rounded-sm">Histórico Local</span>
            </div>

            <div className="overflow-x-auto border border-outline-variant rounded-xl">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-surface-container-low text-primary font-bold text-[11px] border-b border-outline-variant uppercase tracking-wider">
                    <th className="p-3.5">Código de Falha / Descrição</th>
                    <th className="p-3.5">Período</th>
                    <th className="p-3.5 text-center">Duração</th>
                    <th className="p-3.5 text-right">Ação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant/30 text-xs text-primary">
                  {logs.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="p-6 text-center text-outline font-medium">
                        Nenhum incidente registrado até o momento. Turno sem paradas!
                      </td>
                    </tr>
                  ) : (
                    logs.map(log => (
                      <tr key={log.id} className="hover:bg-surface-container-low/40">
                        <td className="p-3.5">
                          <p className="font-bold text-primary">{log.name.split(':')[0]}</p>
                          <p className="text-[11px] text-outline">{log.name.split(':').slice(1).join(':')}</p>
                        </td>
                        <td className="p-3.5 font-mono text-outline">
                          {log.start} às {log.end}
                        </td>
                        <td className="p-3.5 font-mono text-center">
                          <span className="bg-error-container/20 text-on-error-container px-2 py-1 rounded-md font-bold">
                            {log.duration} min
                          </span>
                        </td>
                        <td className="p-3.5 text-right">
                          <button
                            onClick={() => handleRemoveLog(log.id)}
                            className="p-1 text-outline hover:text-error rounded-full hover:bg-error-container/10 transition-colors cursor-pointer"
                            title="Remover Registro"
                          >
                            <span className="material-symbols-outlined notranslate text-[16px]">delete</span>
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
