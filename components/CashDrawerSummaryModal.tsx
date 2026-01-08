import React, { useState, useEffect, useMemo, useCallback } from 'react';
import type { ShiftSummary } from '../types';
import * as dbService from '../services/db';
import { X, DollarSign, CreditCard, Hash, TrendingUp, TrendingDown, ChevronsRight, Lock } from 'lucide-react';

interface CashDrawerSummaryModalProps {
  onClose: () => void;
  onFinalizeShift: (summary: Omit<ShiftSummary, 'id' | 'createdAt'>) => void;
}

interface SummaryData {
  startAt: number;
  totalSales: number;
  transactionCount: number;
  cashSales: number;
  cardSales: number;
  initialAmount: number;
  cashAdditions: number;
  cashWithdrawals: number;
  expectedCash: number;
}

const denominations = [
    { value: 100, label: '$100' }, { value: 50, label: '$50' },
    { value: 20, label: '$20' }, { value: 10, label: '$10' },
    { value: 5, label: '$5' }, { value: 1, label: '$1' },
    { value: 0.25, label: '25¢' }, { value: 0.10, label: '10¢' },
    { value: 0.05, label: '5¢' }, { value: 0.01, label: '1¢' },
];

const CashDrawerSummaryModal: React.FC<CashDrawerSummaryModalProps> = ({ onClose, onFinalizeShift }) => {
  const [summary, setSummary] = useState<SummaryData | null>(null);
  const [counts, setCounts] = useState<{ [key: string]: string }>({});
  const [notes, setNotes] = useState('');

  useEffect(() => {
    const openTxs = dbService.getOpenTransactions();
    const openCashMovements = dbService.getOpenCashMovements();
    
    const summaryData = openTxs.reduce<SummaryData>((acc, tx) => {
      if(tx.type === 'sale') {
          acc.totalSales += tx.total;
          acc.transactionCount += 1;
          if (tx.paymentMethod === 'Efectivo') {
            acc.cashSales += tx.total;
          } else {
            acc.cardSales += tx.total;
          }
      }
      // Refunds are also cash movements, effectively.
      if (tx.type === 'refund' && tx.paymentMethod === 'Reembolso') {
          acc.cashWithdrawals += -tx.total;
      }
      return acc;
    }, { 
        startAt: 0, totalSales: 0, transactionCount: 0, cashSales: 0, cardSales: 0, 
        initialAmount: 0, cashAdditions: 0, cashWithdrawals: 0, expectedCash: 0 
    });
    
    let earliestTimestamp = openTxs.length > 0 ? openTxs[openTxs.length - 1].createdAt : Date.now();
    
    openCashMovements.forEach(cm => {
        if (cm.createdAt < earliestTimestamp) earliestTimestamp = cm.createdAt;
        if (cm.type === 'initial') summaryData.initialAmount += cm.amount;
        if (cm.type === 'addition') summaryData.cashAdditions += cm.amount;
        if (cm.type === 'withdrawal') summaryData.cashWithdrawals += cm.amount;
    });

    summaryData.startAt = earliestTimestamp;
    summaryData.expectedCash = summaryData.initialAmount + summaryData.cashSales + summaryData.cashAdditions - summaryData.cashWithdrawals;

    setSummary(summaryData);
  }, []);

  const countedTotal = useMemo(() => {
    return denominations.reduce((acc, den) => {
        const count = parseInt(counts[den.value.toString()] || '0');
        return acc + (count * den.value);
    }, 0);
  }, [counts]);

  const variance = useMemo(() => {
    if (!summary) return 0;
    return countedTotal - summary.expectedCash;
  }, [countedTotal, summary]);

  const handleFinalize = () => {
    if (!summary) return;
    
    // FIX: Switched from Object.entries to Object.keys and explicitly typed the accumulator and key in reduce.
    // This makes the type inference more robust and resolves potential issues with key types.
    const countedDenominations = Object.keys(counts).reduce((acc: {[key: string]: number}, key) => {
        const numValue = parseInt(counts[key], 10);
        if(!isNaN(numValue) && numValue > 0) {
            acc[key] = numValue;
        }
        return acc;
    }, {});

    onFinalizeShift({
        ...summary,
        countedCash: countedTotal,
        variance,
        countedDenominations,
        notes: notes.trim()
    });
  };

  const hasOperations = summary && (summary.transactionCount > 0 || summary.initialAmount > 0 || summary.cashAdditions > 0 || summary.cashWithdrawals > 0);

  return (
    <div
      className="fixed inset-0 bg-black/60 z-50 flex justify-center items-center"
      aria-modal="true" role="dialog" onClick={onClose}
    >
      <div 
        className="bg-dp-light dark:bg-dp-charcoal rounded-lg shadow-2xl p-6 w-full max-w-4xl m-4 flex flex-col max-h-[90vh] animate-modal-in" 
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-4 flex-shrink-0">
          <div>
            <h2 className="text-2xl font-bold text-dp-dark-gray dark:text-dp-light-gray">Cierre de Turno</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">Reconciliación de caja para el turno actual.</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-dp-soft-gray dark:hover:bg-gray-700" aria-label="Cerrar"><X size={24} /></button>
        </div>
        
        {!hasOperations ? (
          <div className="flex-grow flex items-center justify-center">
            <p className="text-center text-gray-500 dark:text-gray-400 mt-10">No hay operaciones registradas para el turno actual.</p>
          </div>
        ) : (
          <div className="flex flex-col md:flex-row gap-6 flex-grow overflow-hidden">
            {/* Left Panel: Summary */}
            <div className="md:w-1/3 flex flex-col gap-4">
                <SummaryCard title="Ventas Totales" value={`$${summary.totalSales.toFixed(2)}`} icon={<Hash />} />
                <div className="p-4 rounded-lg bg-dp-soft-gray dark:bg-black flex-grow">
                  <h3 className="font-semibold mb-3 text-lg">Resumen de Flujo de Efectivo</h3>
                  <ul className="space-y-2 text-sm">
                    <CashFlowItem label="Fondo de Caja Inicial" amount={summary.initialAmount} icon={<ChevronsRight size={16}/>} color="text-gray-500 dark:text-gray-400" />
                    <CashFlowItem label="Ventas en Efectivo" amount={summary.cashSales} icon={<TrendingUp size={16}/>} color="text-green-600 dark:text-green-400" />
                    <CashFlowItem label="Entradas de Efectivo" amount={summary.cashAdditions} icon={<TrendingUp size={16}/>} color="text-green-600 dark:text-green-400" />
                    <CashFlowItem label="Salidas/Reembolsos" amount={-summary.cashWithdrawals} icon={<TrendingDown size={16}/>} color="text-red-600 dark:text-red-400" />
                  </ul>
                  <div className="border-t border-gray-300 dark:border-gray-600 mt-3 pt-3 flex justify-between items-center">
                    <span className="font-bold text-base">Efectivo Esperado</span>
                    <span className="font-bold text-xl text-dp-blue dark:text-dp-gold">${summary.expectedCash.toFixed(2)}</span>
                  </div>
                </div>
            </div>

            {/* Right Panel: Physical Count */}
            <div className="md:w-2/3 flex flex-col border-t-2 md:border-t-0 md:border-l-2 pt-4 md:pt-0 md:pl-6 border-dashed border-gray-300 dark:border-gray-700">
              <h3 className="text-lg font-semibold mb-2">Conteo de Efectivo Físico</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 overflow-y-auto pr-2 pb-2">
                {denominations.map(den => (
                  <div key={den.value}>
                    <label className="text-sm font-medium">{den.label}</label>
                    <div className="flex items-center gap-1">
                      <span className="text-gray-400 text-sm">x</span>
                      <input type="number" min="0" value={counts[den.value.toString()] || ''}
                             onChange={e => setCounts(prev => ({...prev, [den.value.toString()]: e.target.value}))}
                             className="w-full p-1 rounded-md border bg-dp-light dark:bg-gray-800 border-gray-300 dark:border-gray-600 focus:ring-1 focus:ring-dp-blue dark:focus:ring-dp-gold focus:outline-none" />
                    </div>
                  </div>
                ))}
              </div>
               <textarea value={notes} onChange={e => setNotes(e.target.value)}
                         className="w-full mt-3 p-2 rounded-md border bg-dp-light dark:bg-gray-800 border-gray-300 dark:border-gray-600 focus:ring-1 focus:ring-dp-blue dark:focus:ring-dp-gold focus:outline-none text-sm"
                         placeholder="Notas adicionales (ej: diferencia por error de cambio)..." rows={2}></textarea>
              <div className="mt-auto pt-4 space-y-2">
                 <div className="flex justify-between items-center text-lg font-bold">
                    <span>Total Contado:</span>
                    <span>${countedTotal.toFixed(2)}</span>
                 </div>
                 <div className={`flex justify-between items-center text-xl font-bold p-2 rounded-md
                    ${variance === 0 && countedTotal > 0 ? 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-300' : ''}
                    ${variance > 0 ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-300' : ''}
                    ${variance < 0 ? 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-300' : ''}
                 `}>
                    <span>Varianza:</span>
                    <span>{variance < 0 ? '-' : variance > 0 ? '+' : ''}${Math.abs(variance).toFixed(2)} {variance !== 0 && `(${variance < 0 ? 'Faltante' : 'Sobrante'})`}</span>
                 </div>
              </div>
            </div>
          </div>
        )}
        
        <div className="mt-6 flex justify-between items-center flex-shrink-0">
             <button type="button" onClick={onClose}
                className="px-4 py-2 rounded-md text-sm font-semibold transition-colors bg-gray-200 text-gray-800 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600">
              Cancelar
            </button>
             <button type="button" onClick={handleFinalize} disabled={!hasOperations || countedTotal === 0}
                className="flex items-center gap-2 px-6 py-3 rounded-lg text-sm font-bold transition-colors text-white bg-green-600 hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed">
              <Lock size={16}/> Finalizar Turno
            </button>
        </div>
      </div>
    </div>
  );
};

const SummaryCard: React.FC<{ title: string; value: string; icon: React.ReactNode; }> = ({ title, value, icon }) => (
    <div className="bg-dp-soft-gray dark:bg-black p-4 rounded-lg shadow">
        <div className="flex items-center gap-3">
            <div className="text-gray-500 dark:text-gray-400">{icon}</div>
            <div><p className="text-sm text-gray-600 dark:text-gray-400">{title}</p><p className="text-xl font-bold text-dp-dark-gray dark:text-dp-light-gray">{value}</p></div>
        </div>
    </div>
);

const CashFlowItem: React.FC<{ label: string; amount: number; icon: React.ReactNode; color: string; }> = ({ label, amount, icon, color }) => (
  <li className={`flex justify-between items-center ${color}`}>
    <span className="flex items-center gap-2">{icon}{label}</span>
    <span className="font-mono font-semibold">{amount < 0 && '-'}${Math.abs(amount).toFixed(2)}</span>
  </li>
);

export default CashDrawerSummaryModal;