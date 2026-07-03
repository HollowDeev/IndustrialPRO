import React, { useState } from 'react';
import { Order, OrderLine } from '../types';
import PDFExportButtons from './pdf/PDFExportButtons';

interface PedidosDetailProps {
  order: Order;
  onUpdateOrder: (updatedOrder: Order) => void;
  onBack: () => void;
}

export default function PedidosDetail({ order, onUpdateOrder, onBack }: PedidosDetailProps) {
  // Line item adder form states
  const [newProduct, setNewProduct] = useState('');
  const [newMeasure, setNewMeasure] = useState('');
  const [newTotalQtd, setNewTotalQtd] = useState(2000);
  const [newTempoPeca, setNewTempoPeca] = useState(1.5);
  const [newExtruder, setNewExtruder] = useState('EXT-04');

  // Inline edit state
  const [editingItemNum, setEditingItemNum] = useState<string | null>(null);
  const [editProduced, setEditProduced] = useState(0);
  const [editTotalQtd, setEditTotalQtd] = useState(0);

  // Stats recalculations
  const computedTotalVolume = order.items.reduce((acc, i) => acc + i.totalQtd, 0);
  const computedTotalProduced = order.items.reduce((acc, i) => acc + i.produced, 0);
  const computedProgressPercent = computedTotalVolume > 0 ? Math.round((computedTotalProduced / computedTotalVolume) * 100) : 0;

  const handleAddLineItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProduct.trim()) {
      alert('Preencha a descrição do produto!');
      return;
    }

    const nextId = (order.items.length + 1).toString().padStart(2, '0');
    const newLine: OrderLine = {
      itemNum: nextId,
      product: newProduct,
      measure: newMeasure || 'Padrão',
      totalQtd: newTotalQtd,
      produced: 0,
      tempoPeca: newTempoPeca,
      extruder: newExtruder,
      eta: 'Aguardando',
      status: 'Aberto'
    };

    const updatedItems = [...order.items, newLine];
    onUpdateOrder({
      ...order,
      totalVolume: updatedItems.reduce((acc, i) => acc + i.totalQtd, 0),
      totalProduced: updatedItems.reduce((acc, i) => acc + i.produced, 0),
      items: updatedItems
    });

    // Reset Form
    setNewProduct('');
    setNewMeasure('');
    setNewTotalQtd(2000);
    setNewTempoPeca(1.5);
  };

  const handleRemoveLineItem = (itemNum: string) => {
    const updatedItems = order.items.filter(item => item.itemNum !== itemNum);
    onUpdateOrder({
      ...order,
      items: updatedItems,
      totalVolume: updatedItems.reduce((acc, i) => acc + i.totalQtd, 0),
      totalProduced: updatedItems.reduce((acc, i) => acc + i.produced, 0),
    });
  };

  const handleLineStatusChange = (itemNum: string, newStatus: 'Em Produção' | 'Finalizado' | 'Aberto') => {
    const updatedItems = order.items.map(item => {
      if (item.itemNum === itemNum) {
        let produced = item.produced;
        let eta = item.eta;
        if (newStatus === 'Finalizado') {
          produced = item.totalQtd;
          eta = 'Finalizado';
        } else if (newStatus === 'Em Produção') {
          eta = 'Hoje, 18:00';
        } else {
          eta = 'Aguardando';
        }
        return {
          ...item,
          status: newStatus,
          produced,
          eta
        };
      }
      return item;
    });

    onUpdateOrder({
      ...order,
      items: updatedItems,
      totalProduced: updatedItems.reduce((acc, i) => acc + i.produced, 0),
    });
  };

  const startInlineEdit = (item: OrderLine) => {
    setEditingItemNum(item.itemNum);
    setEditProduced(item.produced);
    setEditTotalQtd(item.totalQtd);
  };

  const saveInlineEdit = (itemNum: string) => {
    const updatedItems = order.items.map(item => {
      if (item.itemNum === itemNum) {
        const validatedProduced = Math.min(editProduced, editTotalQtd);
        const autoStatus = validatedProduced === editTotalQtd ? 'Finalizado' as const : validatedProduced > 0 ? 'Em Produção' as const : 'Aberto' as const;
        return {
          ...item,
          totalQtd: editTotalQtd,
          produced: validatedProduced,
          status: autoStatus,
          eta: autoStatus === 'Finalizado' ? 'Finalizado' : item.eta
        };
      }
      return item;
    });

    onUpdateOrder({
      ...order,
      items: updatedItems,
      totalVolume: updatedItems.reduce((acc, i) => acc + i.totalQtd, 0),
      totalProduced: updatedItems.reduce((acc, i) => acc + i.produced, 0),
    });
    setEditingItemNum(null);
  };

  return (
    <div className="space-y-6">
      
      {/* Header controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-2 text-xs font-bold text-outline hover:text-primary transition-colors cursor-pointer select-none bg-surface-container-low px-3 py-2 rounded-full border border-outline/10"
        >
          <span className="material-symbols-outlined text-[16px]">arrow_back</span>
          Voltar para Lista de Pedidos
        </button>

        <span className="text-xs text-outline font-medium">
          Código Único Ref: <strong className="text-primary font-mono">{order.id}</strong>
        </span>
      </div>

      {/* Main Order general stats dashboard */}
      <div className="bg-surface-container-lowest p-6 rounded-2xl border border-outline-variant shadow-xs space-y-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-surface-container">
          <div>
            <h3 className="text-base font-bold text-primary flex items-center gap-2">
              <span className="material-symbols-outlined text-secondary">factory</span>
              Ficha Técnica de Fabricação - OP Ativa
            </h3>
            <p className="text-xs text-outline mt-0.5">Lotes de fabricação alocados para o cliente <strong className="text-primary font-bold">{order.clientName}</strong></p>
          </div>

          <div className="flex items-center gap-2.5">
            <span className="text-xs text-outline font-bold uppercase">Estado:</span>
            <span className="bg-tertiary-fixed text-on-tertiary-fixed text-xs font-black px-3 py-1 rounded-sm uppercase tracking-wide">
              {computedProgressPercent === 100 ? 'CONCLUÍDO' : 'EM EXECUÇÃO'}
            </span>
          </div>
        </div>

        {/* Progress bar visual indicator */}
        <div className="space-y-1.5">
          <div className="flex justify-between items-center text-xs font-bold text-outline">
            <span>Volume de produção concluído ({computedTotalProduced.toLocaleString()} de {computedTotalVolume.toLocaleString()} peças)</span>
            <span className="text-secondary font-black">{computedProgressPercent}%</span>
          </div>
          <div className="w-full bg-surface-container-high h-3 rounded-full overflow-hidden">
            <div className="bg-primary h-full transition-all duration-300" style={{ width: `${computedProgressPercent}%` }} />
          </div>
        </div>

        {/* Three key stats cards inside */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-surface-container-low p-3.5 rounded-xl border border-outline-variant/30">
            <span className="text-[10px] uppercase text-outline font-bold">Cliente e Planta-Destino</span>
            <p className="text-sm font-bold text-primary mt-0.5 truncate">{order.clientName}</p>
            <p className="text-[10px] text-outline truncate">{order.location}</p>
          </div>

          <div className="bg-surface-container-low p-3.5 rounded-xl border border-outline-variant/30">
            <span className="text-[10px] uppercase text-outline font-bold">OEE / Eficiência Geral</span>
            <p className="text-sm font-extrabold text-on-tertiary-container mt-0.5">{order.efficiency}%</p>
            <p className="text-[10px] text-outline">Média geométrica tolerável</p>
          </div>

          <div className="bg-surface-container-low p-3.5 rounded-xl border border-outline-variant/30">
            <span className="text-[10px] uppercase text-outline font-bold">Tempo Ciclo Estimado</span>
            <p className="text-sm font-bold text-primary mt-0.5">{order.timeEstimated} Horas</p>
            <p className="text-[10px] text-outline">Extrusão e calibração</p>
          </div>

          <div className="bg-surface-container-low p-3.5 rounded-xl border border-outline-variant/30">
            <span className="text-[10px] uppercase text-outline font-bold">Emissão / Prazo</span>
            <p className="text-sm font-bold text-secondary mt-0.5">{order.emissionDate}</p>
            <p className="text-[10px] text-outline">Prazo: {order.deliveryDate}</p>
          </div>
        </div>
      </div>

      {/* PDF Export Section */}
      <PDFExportButtons order={order} />

      {/* Grid containing adding tool + items list table */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Adder panel */}
        <div className="lg:col-span-4 bg-surface-container-lowest p-6 rounded-2xl border border-outline-variant shadow-xs space-y-4">
          <div className="border-b border-surface-container pb-3">
            <h4 className="text-sm font-bold text-primary flex items-center gap-1.5">
              <span className="material-symbols-outlined text-secondary">playlist_add</span>
              Anexar Item Técnico à OP
            </h4>
            <p className="text-xs text-outline mt-0.5">Insira novos perfis PVC sob demanda nesta ordem</p>
          </div>

          <form onSubmit={handleAddLineItem} className="space-y-3.5">
            <div>
              <label className="block text-[11px] font-bold text-primary mb-1 uppercase tracking-wider">Descrição do Produto</label>
              <input
                type="text"
                placeholder="Ex ER: Perfil Adesivo Flexível..."
                value={newProduct}
                onChange={(e) => setNewProduct(e.target.value)}
                className="w-full bg-surface-container-low text-primary text-xs p-2.5 rounded-lg border border-outline/20 focus:border-secondary outline-hidden font-semibold"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-primary mb-1 uppercase tracking-wider">Bitola / Medidas</label>
              <input
                type="text"
                placeholder="Ex: 30x2.5mm ou d=12"
                value={newMeasure}
                onChange={(e) => setNewMeasure(e.target.value)}
                className="w-full bg-surface-container-low text-primary text-xs p-2.5 rounded-lg border border-outline/20 focus:border-secondary outline-hidden"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[11px] font-bold text-primary mb-1 uppercase tracking-wider">Qtd Total (un)</label>
                <input
                  type="number"
                  value={newTotalQtd}
                  onChange={(e) => setNewTotalQtd(Math.max(1, Number(e.target.value)))}
                  className="w-full bg-surface-container-low text-primary text-xs p-2.5 rounded-lg border border-outline/20 focus:border-secondary outline-hidden font-mono font-bold"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-primary mb-1 uppercase tracking-wider">Tempo/Pç (s)</label>
                <input
                  type="number"
                  step="0.1"
                  value={newTempoPeca}
                  onChange={(e) => setNewTempoPeca(Math.max(0.1, Number(e.target.value)))}
                  className="w-full bg-surface-container-low text-primary text-xs p-2.5 rounded-lg border border-outline/20 focus:border-secondary outline-hidden font-mono font-bold"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-primary mb-1 uppercase tracking-wider">Extrusora Alocada</label>
              <select
                value={newExtruder}
                onChange={(e) => setNewExtruder(e.target.value)}
                className="w-full bg-surface-container-low text-primary border border-outline/20 rounded-lg p-2 text-xs font-semibold focus:border-secondary outline-hidden"
              >
                <option value="EXT-01">EXT-01 - 75mm (Vazão Alta)</option>
                <option value="EXT-02">EXT-02 - 60mm (Rígidos)</option>
                <option value="EXT-04">EXT-04 - 90mm (Coextrusão)</option>
                <option value="EXT-07">EXT-07 - 50mm (Mangueiras)</option>
              </select>
            </div>

            <button
              type="submit"
              className="w-full bg-secondary-container hover:brightness-95 text-on-secondary-container font-bold py-2.5 rounded-lg text-xs transition-colors cursor-pointer select-none"
            >
              SALVAR ITEM NA GRADE
            </button>
          </form>
        </div>

        {/* Master details line list items */}
        <div className="lg:col-span-8 bg-surface-container-lowest p-6 rounded-2xl border border-outline-variant shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-black text-primary uppercase tracking-wider">Itens e Calandragem das Extrusoras</h4>
            <span className="text-[10px] text-outline">Controle direto de saldo real</span>
          </div>

          <div className="overflow-x-auto border border-outline-variant rounded-xl">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-surface-container-low text-primary font-bold text-[11px] border-b border-outline-variant uppercase tracking-wider">
                  <th className="p-3">Num</th>
                  <th className="p-3">Produto Técnico</th>
                  <th className="p-3">Bitola</th>
                  <th className="p-3 text-right">Planejado</th>
                  <th className="p-3 text-right">Produzido</th>
                  <th className="p-3 text-center">Extrusora</th>
                  <th className="p-3 text-center">Status</th>
                  <th className="p-3 text-right text-outline">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/30 text-xs text-primary">
                {order.items.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="p-6 text-center text-outline">Nenhum item adicionado a este lote de produção.</td>
                  </tr>
                ) : (
                  order.items.map(item => (
                    <tr key={item.itemNum} className="hover:bg-surface-container-low/40">
                      
                      <td className="p-3 font-mono text-outline">{item.itemNum}</td>
                      
                      <td className="p-3">
                        <p className="font-bold text-primary">{item.product}</p>
                        <p className="text-[10px] text-outline uppercase tracking-wider">ETA: {item.eta}</p>
                      </td>
                      
                      <td className="p-3 font-medium text-outline">{item.measure}</td>
                      
                      {/* Planejado Qtd */}
                      <td className="p-3 text-right font-mono font-semibold">
                        {editingItemNum === item.itemNum ? (
                          <input
                            type="number"
                            value={editTotalQtd}
                            onChange={(e) => setEditTotalQtd(Math.max(1, Number(e.target.value)))}
                            className="bg-surface-container-high border border-outline/20 text-center w-16 p-1 rounded-md max-w-[64px]"
                          />
                        ) : (
                          <span>{item.totalQtd.toLocaleString()}</span>
                        )}
                      </td>

                      {/* Real Produzido Qtd */}
                      <td className="p-3 text-right font-mono">
                        {editingItemNum === item.itemNum ? (
                          <input
                            type="number"
                            value={editProduced}
                            onChange={(e) => setEditProduced(Math.min(editTotalQtd, Number(e.target.value)))}
                            className="bg-surface-container-high border border-outline/20 text-center w-16 p-1 rounded-md max-w-[64px]"
                          />
                        ) : (
                          <span className={`${item.produced === item.totalQtd ? 'text-on-tertiary-container font-bold' : 'text-primary font-semibold'}`}>
                            {item.produced.toLocaleString()}
                          </span>
                        )}
                      </td>

                      <td className="p-3 text-center">
                        <span className="bg-surface-container-high text-primary px-2 py-1 rounded-sm font-mono text-[10px]">
                          {item.extruder}
                        </span>
                      </td>

                      {/* Status select dropdown */}
                      <td className="p-3 text-center">
                        <select
                          value={item.status}
                          onChange={(e) => handleLineStatusChange(item.itemNum, e.target.value as any)}
                          className="bg-surface-container-low text-primary border border-outline/10 text-[10px] font-bold p-1 px-1.5 rounded-sm outline-hidden focus:outline-hidden"
                        >
                          <option value="Aberto">Aberto</option>
                          <option value="Em Produção">Produção</option>
                          <option value="Finalizado">Concluído</option>
                        </select>
                      </td>

                      {/* Row actions */}
                      <td className="p-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {editingItemNum === item.itemNum ? (
                            <button
                              onClick={() => saveInlineEdit(item.itemNum)}
                              className="text-on-tertiary-container hover:bg-tertiary-container/30 px-1.5 py-1 rounded-md transition-colors cursor-pointer text-[10px] font-bold"
                            >
                              Salvar
                            </button>
                          ) : (
                            <button
                              onClick={() => startInlineEdit(item)}
                              className="p-1 text-outline hover:text-primary rounded-full hover:bg-surface-container-high transition-colors cursor-pointer"
                              title="Ajustar Volume"
                            >
                              <span className="material-symbols-outlined text-[15px]">edit</span>
                            </button>
                          )}

                          <button
                            onClick={() => handleRemoveLineItem(item.itemNum)}
                            className="p-1 text-outline hover:text-error rounded-full hover:bg-error-container/10 transition-colors cursor-pointer"
                            title="Remover"
                          >
                            <span className="material-symbols-outlined text-[15px]">close</span>
                          </button>
                        </div>
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
  );
}
