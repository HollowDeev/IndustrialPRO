import React, { useState } from 'react';
import { DailyProductionSetup, Order } from '../types';

interface AberturaProducaoProps {
  orders: Order[];
  onStartProduction: (setup: DailyProductionSetup) => void;
}

export default function AberturaProducao({ orders, onStartProduction }: AberturaProducaoProps) {
  const [selectedOrderId, setSelectedOrderId] = useState(orders[0]?.id || '');
  const [teamMembers, setTeamMembers] = useState<string[]>(['Fabrício Rodrigues', 'Ronaldo Sales', 'Marcio Souza']);
  const [newMember, setNewMember] = useState('');
  const [extruder, setExtruder] = useState('EXT-04');
  const [hoursAvailable, setHoursAvailable] = useState(12);
  const [successMsg, setSuccessMsg] = useState('');

  // Checklist state
  const [checks, setChecks] = useState({
    limpeza: false,
    residualAnterior: false,
    temperaturas: false,
    rotacaoRosca: false,
    alimentacaoMaquina: false,
    bagPosicionado: false,
    operadorOk: false,
  });

  const selectedOrder = orders.find(o => o.id === selectedOrderId);

  const toggleCheck = (key: keyof typeof checks) => {
    setChecks(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const handleAddMember = (e: React.FormEvent) => {
    e.preventDefault();
    if (newMember.trim() && !teamMembers.includes(newMember)) {
      setTeamMembers([...teamMembers, newMember.trim()]);
      setNewMember('');
    }
  };

  const handleRemoveMember = (name: string) => {
    setTeamMembers(teamMembers.filter(m => m !== name));
  };

  const allChecked = Object.values(checks).every(val => val === true);

  const handleSubmit = () => {
    if (!selectedOrder) return;
    
    const setup: DailyProductionSetup = {
      date: new Date().toLocaleDateString('pt-BR'),
      orderId: selectedOrder.id,
      clientName: selectedOrder.clientName,
      team: teamMembers,
      deadline: selectedOrder.deliveryDate,
      hoursAvailable,
      checklists: checks
    };

    onStartProduction(setup);
    setSuccessMsg(`🚀 OP ${selectedOrder.id} iniciada com sucesso na linha ${extruder}! Checklist de inspeção auditado e arquivado.`);
    
    // Clear success message after 4s
    setTimeout(() => {
      setSuccessMsg('');
    }, 4000);
  };

  return (
    <div className="space-y-6">
      {/* Success Banner */}
      {successMsg && (
        <div className="bg-tertiary-fixed text-on-tertiary-fixed p-4 rounded-xl flex items-center gap-3 shadow-sm border border-tertiary-fixed-dim animate-bounce">
          <span className="material-symbols-outlined text-[28px]">verified</span>
          <span className="text-sm font-bold">{successMsg}</span>
        </div>
      )}

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Step 1: Configuration Form */}
        <div className="bg-surface-container-lowest p-6 rounded-2xl border border-outline-variant shadow-xs lg:col-span-5 space-y-5">
          <div className="border-b border-surface-container pb-4">
            <h3 className="text-lg font-bold text-primary flex items-center gap-2">
              <span className="material-symbols-outlined text-secondary">tune</span>
              1. Setup Operacional e Linha
            </h3>
            <p className="text-xs text-outline mt-1">Insira os dados iniciais do turno de fabricação</p>
          </div>

          <div className="space-y-4">
            {/* Linha/Extrusora Dropdown */}
            <div>
              <label className="block text-xs font-bold text-primary mb-1.5 uppercase tracking-wider">
                Extrusora de Destino
              </label>
              <select
                value={extruder}
                onChange={(e) => setExtruder(e.target.value)}
                className="w-full bg-surface-container-low text-primary border border-outline/20 rounded-lg p-2.5 text-sm font-semibold focus:border-secondary outline-hidden"
              >
                <option value="EXT-01">EXT-01 - 75mm (Alta Velocidade)</option>
                <option value="EXT-02">EXT-02 - 60mm (Perfis Rígidos)</option>
                <option value="EXT-04">EXT-04 - 90mm (PVC Coextrusão)</option>
                <option value="EXT-07">EXT-07 - 50mm (Mangueiras)</option>
                <option value="EXT-09">EXT-09 - 45mm (Alta Precisão)</option>
                <option value="EXT-12">EXT-12 - 120mm (Grande Porte)</option>
              </select>
            </div>

            {/* Pedidos / OPs dropdown */}
            <div>
              <label className="block text-xs font-bold text-primary mb-1.5 uppercase tracking-wider">
                Ordem de Produção Ativa
              </label>
              <select
                value={selectedOrderId}
                onChange={(e) => setSelectedOrderId(e.target.value)}
                className="w-full bg-surface-container-low text-primary border border-outline/20 rounded-lg p-2.5 text-sm font-semibold focus:border-secondary outline-hidden"
              >
                {orders.map(o => (
                  <option key={o.id} value={o.id}>
                    {o.id} - {o.clientName} ({o.items.length} itens)
                  </option>
                ))}
              </select>
            </div>

            {/* Selected order visual preview card */}
            {selectedOrder && (
              <div className="bg-surface-container-low rounded-xl p-4 border border-outline-variant/50 space-y-2">
                <p className="text-xs font-bold text-outline uppercase tracking-wider">Info do Pedido Selecionado</p>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-outline">Cliente:</span>
                    <p className="font-bold text-primary truncate">{selectedOrder.clientName}</p>
                  </div>
                  <div>
                    <span className="text-outline">Prioridade:</span>
                    <p className={`font-semibold ${selectedOrder.priority === 'Alta' ? 'text-secondary font-bold' : 'text-primary'}`}>
                      {selectedOrder.priority}
                    </p>
                  </div>
                  <div>
                    <span className="text-outline">Meta Volume:</span>
                    <p className="font-semibold text-primary">{selectedOrder.totalVolume.toLocaleString()} peças</p>
                  </div>
                  <div>
                    <span className="text-outline">Data Trâmite:</span>
                    <p className="font-semibold text-primary">{selectedOrder.deliveryDate}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Hours input */}
            <div>
              <label className="block text-xs font-bold text-primary mb-1.5 uppercase tracking-wider">
                Duração Prevista do Turno (Horas)
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="range"
                  min="4"
                  max="24"
                  step="2"
                  value={hoursAvailable}
                  onChange={(e) => setHoursAvailable(Number(e.target.value))}
                  className="flex-1 accent-secondary"
                />
                <span className="bg-primary text-white font-bold px-3 py-1.5 rounded-lg text-sm w-16 text-center select-none">
                  {hoursAvailable}h
                </span>
              </div>
            </div>

            {/* Operator Team Management */}
            <div>
              <label className="block text-xs font-bold text-primary mb-1.5 uppercase tracking-wider">
                Operadores Escalados ({teamMembers.length})
              </label>
              <form onSubmit={handleAddMember} className="flex gap-2 mb-3">
                <input
                  type="text"
                  placeholder="Nome do Operador..."
                  value={newMember}
                  onChange={(e) => setNewMember(e.target.value)}
                  className="flex-1 bg-surface-container-low text-primary text-xs px-3 py-2.5 rounded-lg border border-outline/20 outline-hidden"
                />
                <button
                  type="submit"
                  className="bg-primary text-white px-4 py-2.5 rounded-lg text-xs font-bold hover:bg-primary-container transition-colors cursor-pointer"
                >
                  Adicionar
                </button>
              </form>

              {/* Team list tags */}
              <div className="flex flex-wrap gap-2">
                {teamMembers.map(member => (
                  <span
                    key={member}
                    className="inline-flex items-center gap-1.5 bg-surface-container-high text-primary px-3 py-1.5 rounded-md text-xs font-semibold"
                  >
                    {member}
                    <button
                      type="button"
                      onClick={() => handleRemoveMember(member)}
                      className="text-outline hover:text-error cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-[14px]">close</span>
                    </button>
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Step 2: Quality Inspection Checklist */}
        <div className="bg-surface-container-lowest p-6 rounded-2xl border border-outline-variant shadow-xs lg:col-span-7 space-y-5">
          <div className="border-b border-surface-container pb-4 flex justify-between items-center">
            <div>
              <h3 className="text-lg font-bold text-primary flex items-center gap-2">
                <span className="material-symbols-outlined text-secondary">checklist_rtl</span>
                2. Inspeção de Pré-Requisitos e Setup
              </h3>
              <p className="text-xs text-outline mt-1">Instruções regulamentares de qualidade antes do start da máquina</p>
            </div>
            {/* Meta indicator */}
            <span className="text-xs font-black px-2.5 py-1.5 bg-secondary-container text-on-secondary-container rounded-sm">
              MANDATÓRIO
            </span>
          </div>

          <p className="text-xs text-outline leading-relaxed bg-surface-container-low p-3 rounded-lg border border-outline-variant/30">
            A auditoria dos pontos abaixo garante o índice máximo de eficiência produtiva (OEE) e afasta riscos de quebra e refugo por resíduos térmicos.
          </p>

          <div className="space-y-3">
            {/* Audit Checklist Items */}
            <div
              onClick={() => toggleCheck('limpeza')}
              className={`flex items-start gap-4 p-3.5 rounded-xl border transition-all cursor-pointer select-none ${
                checks.limpeza
                  ? 'bg-tertiary-container/10 border-tertiary-container text-primary font-medium'
                  : 'bg-surface-bright border-outline/10 text-on-surface-variant hover:bg-surface-container-low'
              }`}
            >
              <span className={`material-symbols-outlined text-[22px] shrink-0 ${checks.limpeza ? 'text-on-tertiary-container' : 'text-outline'}`}>
                {checks.limpeza ? 'task_alt' : 'radio_button_unchecked'}
              </span>
              <div>
                <p className="text-sm font-bold">Limpeza e Higienização do Cilindro</p>
                <p className="text-xs text-outline">Garante que não haja poeira ou resíduos secos de polímero nas roscas.</p>
              </div>
            </div>

            <div
              onClick={() => toggleCheck('residualAnterior')}
              className={`flex items-start gap-4 p-3.5 rounded-xl border transition-all cursor-pointer select-none ${
                checks.residualAnterior
                  ? 'bg-tertiary-container/10 border-tertiary-container text-primary font-medium'
                  : 'bg-surface-bright border-outline/10 text-on-surface-variant hover:bg-surface-container-low'
              }`}
            >
              <span className={`material-symbols-outlined text-[22px] shrink-0 ${checks.residualAnterior ? 'text-on-tertiary-container' : 'text-outline'}`}>
                {checks.residualAnterior ? 'task_alt' : 'radio_button_unchecked'}
              </span>
              <div>
                <p className="text-sm font-bold">Ausência de Material Residual do Lote Anterior</p>
                <p className="text-xs text-outline">Evita misturas impróprias e perda de transparência ou pigmentação no PVC.</p>
              </div>
            </div>

            <div
              onClick={() => toggleCheck('temperaturas')}
              className={`flex items-start gap-4 p-3.5 rounded-xl border transition-all cursor-pointer select-none ${
                checks.temperaturas
                  ? 'bg-tertiary-container/10 border-tertiary-container text-primary font-medium'
                  : 'bg-surface-bright border-outline/10 text-on-surface-variant hover:bg-surface-container-low'
              }`}
            >
              <span className={`material-symbols-outlined text-[22px] shrink-0 ${checks.temperaturas ? 'text-on-tertiary-container' : 'text-outline'}`}>
                {checks.temperaturas ? 'task_alt' : 'radio_button_unchecked'}
              </span>
              <div>
                <p className="text-sm font-bold">Zonas de Temperatura Estabilizadas</p>
                <p className="text-xs text-outline">Matriz, zonas de aquecimento 1, 2, 3 e câmara de compressão de acordo com a ficha do PVC.</p>
              </div>
            </div>

            <div
              onClick={() => toggleCheck('rotacaoRosca')}
              className={`flex items-start gap-4 p-3.5 rounded-xl border transition-all cursor-pointer select-none ${
                checks.rotacaoRosca
                  ? 'bg-tertiary-container/10 border-tertiary-container text-primary font-medium'
                  : 'bg-surface-bright border-outline/10 text-on-surface-variant hover:bg-surface-container-low'
              }`}
            >
              <span className={`material-symbols-outlined text-[22px] shrink-0 ${checks.rotacaoRosca ? 'text-on-tertiary-container' : 'text-outline'}`}>
                {checks.rotacaoRosca ? 'task_alt' : 'radio_button_unchecked'}
              </span>
              <div>
                <p className="text-sm font-bold">Controle Eletrônico de Rotação e Torque da Rosca</p>
                <p className="text-xs text-outline">Teste prévio na botoeira de emergência e modulação contínua do motor elétrico.</p>
              </div>
            </div>

            <div
              onClick={() => toggleCheck('alimentacaoMaquina')}
              className={`flex items-start gap-4 p-3.5 rounded-xl border transition-all cursor-pointer select-none ${
                checks.alimentacaoMaquina
                  ? 'bg-tertiary-container/10 border-tertiary-container text-primary font-medium'
                  : 'bg-surface-bright border-outline/10 text-on-surface-variant hover:bg-surface-container-low'
              }`}
            >
              <span className={`material-symbols-outlined text-[22px] shrink-0 ${checks.alimentacaoMaquina ? 'text-on-tertiary-container' : 'text-outline'}`}>
                {checks.alimentacaoMaquina ? 'task_alt' : 'radio_button_unchecked'}
              </span>
              <div>
                <p className="text-sm font-bold">Alimentador de Funil e Dosador Homologado</p>
                <p className="text-xs text-outline">Vazão regulada para evitar sobrecarga ou vácuo residual no parafuso principal.</p>
              </div>
            </div>

            <div
              onClick={() => toggleCheck('bagPosicionado')}
              className={`flex items-start gap-4 p-3.5 rounded-xl border transition-all cursor-pointer select-none ${
                checks.bagPosicionado
                  ? 'bg-tertiary-container/10 border-tertiary-container text-primary font-medium'
                  : 'bg-surface-bright border-outline/10 text-on-surface-variant hover:bg-surface-container-low'
              }`}
            >
              <span className={`material-symbols-outlined text-[22px] shrink-0 ${checks.bagPosicionado ? 'text-on-tertiary-container' : 'text-outline'}`}>
                {checks.bagPosicionado ? 'task_alt' : 'radio_button_unchecked'}
              </span>
              <div>
                <p className="text-sm font-bold">Bag de Refugo e Descarte Posicionado e Identificado</p>
                <p className="text-xs text-outline">Instalado sob o bico de purga para depositar as sobras iniciais de ajuste calandra.</p>
              </div>
            </div>

            <div
              onClick={() => toggleCheck('operadorOk')}
              className={`flex items-start gap-4 p-3.5 rounded-xl border transition-all cursor-pointer select-none ${
                checks.operadorOk
                  ? 'bg-tertiary-container/10 border-tertiary-container text-primary font-medium'
                  : 'bg-surface-bright border-outline/10 text-on-surface-variant hover:bg-surface-container-low'
              }`}
            >
              <span className={`material-symbols-outlined text-[22px] shrink-0 ${checks.operadorOk ? 'text-on-tertiary-container' : 'text-outline'}`}>
                {checks.operadorOk ? 'task_alt' : 'radio_button_unchecked'}
              </span>
              <div>
                <p className="text-sm font-bold">EPI e Avaliação de Segurança Física do Operador</p>
                <p className="text-xs text-outline">Uso integral de luvas térmicas raspa de couro, protetor auricular e óculos contra fagulhas.</p>
              </div>
            </div>
          </div>

          {/* Action Footer */}
          <div className="pt-4 border-t border-surface-container flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="text-xs text-outline">
              {!allChecked ? (
                <span className="text-secondary font-bold flex items-center gap-1">
                  <span className="material-symbols-outlined text-[16px]">info</span>
                  Ative todos os pré-requisitos para liberar o start.
                </span>
              ) : (
                <span className="text-on-tertiary-container font-semibold flex items-center gap-1">
                  <span className="material-symbols-outlined text-[16px]">check_circle</span>
                  Pronto! Equipamento e equipe inspecionados.
                </span>
              )}
            </div>

            <button
              onClick={handleSubmit}
              disabled={!allChecked}
              className={`px-6 py-3 rounded-xl font-bold text-sm tracking-wide shadow-sm transition-all flex items-center gap-2 select-none justify-center ${
                allChecked
                  ? 'bg-primary hover:bg-primary-container text-white cursor-pointer active:scale-95'
                  : 'bg-surface-container-highest text-outline cursor-not-allowed'
              }`}
            >
              <span className="material-symbols-outlined text-[20px]">power_settings_new</span>
              INICIAR TURNO DE PRODUÇÃO
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
