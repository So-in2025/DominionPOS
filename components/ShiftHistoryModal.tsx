
import React, { useState, useEffect } from 'react';
import type { ShiftSummary } from '../types';
import * as dbService from '../services/db';
import { X, ChevronDown, ChevronUp, TrendingUp, TrendingDown, ChevronsRight, Archive } from 'lucide-react';

interface ShiftHistoryModalProps {
  onClose: () => void;
}

const denominations = [
    { value: 100, label: '$100' }, { value: 50, label: '$50' },
    { value: 20, label: '$20' }, { value: 10, label: '$10' },
    { value: 5, label: '$5' }, { value: 1, label: '$1' },
    { value: 0.25, label: '25¢' }, { value: 0.10, label: '10¢' },
    { value: 0.05, label: '5¢' }, { value: 0.01, label: '1¢' },
];

const ShiftHistoryModal: React.FC<ShiftHistoryModalProps> = ({ onClose }) => {
  const [summaries, setSummaries] = useState<ShiftSummary[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    setSummaries(dbService.getShiftSummaries());
  }, []);

  const VarianceDisplay: React.FC<{variance: number}> = ({ variance }) => {
    if (variance === 0) {
        return <span className="font-bold text-green-600 dark:text-green-400">CUADRADO</span>
    }
    const color = variance > 0 ? 'text-blue-600 dark:text-blue-400' : 'text-red-600 dark:text-red-400';
    const prefix = variance > 0 ? '+' : '-';
    const label = variance > 0 ? 'Sobrante' : 'Faltante';
    return <span className={`font-bold ${color}`}>{prefix}${Math.abs(variance).toFixed(2)} ({label})</span>
  };

  return (
    <div
      className="fixed inset-0 bg-black/60 z-50 flex justify-center items-center"
      aria-modal="true"
      role="dialog"
      onClick={onClose}
    >
      <div 
        className="bg-dp-light dark:bg-dp-charcoal rounded-lg shadow-2xl p-6 w-full max-w-4xl m-4 flex flex-col max-h-[80vh] animate-modal-in" 
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-bold text-dp-dark-gray dark:text-dp-light-gray flex items-center gap-2"><Archive />Historial de Turnos</h2>
            <button
                onClick={onClose}
                className="p-2 rounded-full text-dp-dark-gray dark:text-dp-light-gray hover:bg-dp-soft-gray dark:hover:bg-gray-700"
                aria-label="Cerrar"
            >
                <X size={24} />
            </button>
        </div>
        
        <div className="flex-grow overflow-y-auto pr-2">
          {summaries.length === 0 ? (
            <p className="text-center text-gray-500 dark:text-gray-400 mt-10">No hay cierres de turno registrados.</p>
          ) : (
            <ul className="space-y-2">
              {summaries.map((s) => (
                <li key={s.id} className="rounded-md bg-dp-soft-gray dark:bg-gray-800/50 transition-shadow shadow-sm">
                  <button 
                    className="w-full flex justify-between items-center p-3 text-left"
                    onClick={() => setExpandedId(expandedId === s.id ? null : s.id)}
                  >
                    <div>
                        <p className="font-semibold text-gray-800 dark:text-gray-200">Cierre del: {new Date(s.createdAt).toLocaleString()}</p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">ID: {s.id}</p>
                    </div>
                    <div className="text-right mx-4">
                      <p className="font-bold text-lg text-dp-blue dark:text-dp-gold">${s.totalSales.toFixed(2)}</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Ventas Totales</p>
                    </div>
                     <div className="text-right mx-4">
                       <VarianceDisplay variance={s.variance}/>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Varianza</p>
                    </div>
                    <div className="text-gray-500 dark:text-gray-400 p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700">
                      {expandedId === s.id ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                    </div>
                  </button>
                  {expandedId === s.id && (
                    <div className="px-4 pb-4 border-t border-gray-200 dark:border-gray-700">
                      <div className="grid md:grid-cols-3 gap-4 pt-3">
                        {/* Flujo de Efectivo */}
                        <div className="p-3 rounded-lg bg-white dark:bg-black">
                           <h4 className="font-semibold mb-2">Resumen de Flujo</h4>
                           <ul className="space-y-1 text-sm">
                                <CashFlowItem label="Fondo Inicial" amount={s.initialAmount} icon={<ChevronsRight size={14}/>} />
                                <CashFlowItem label="Ventas Efectivo" amount={s.cashSales} icon={<TrendingUp size={14}/>} />
                                <CashFlowItem label="Entradas" amount={s.cashAdditions} icon={<TrendingUp size={14}/>} />
                                <CashFlowItem label="Salidas/Reembolsos" amount={-s.cashWithdrawals} icon={<TrendingDown size={14}/>} />
                           </ul>
                           <div className="border-t dark:border-gray-600 mt-2 pt-2 flex justify-between font-bold"><span>Esperado:</span><span>${s.expectedCash.toFixed(2)}</span></div>
                        </div>
                        {/* Conteo Físico */}
                         <div className="p-3 rounded-lg bg-white dark:bg-black">
                           <h4 className="font-semibold mb-2">Conteo Físico</h4>
                           <div className="flex justify-between font-bold"><span>Contado:</span><span>${s.countedCash.toFixed(2)}</span></div>
                           <div className="flex justify-between font-bold"><span className="mr-2">Varianza:</span><VarianceDisplay variance={s.variance} /></div>
                           {s.notes && <div className="mt-2 text-xs text-gray-500 italic border-t dark:border-gray-600 pt-1"><strong>Notas:</strong> {s.notes}</div>}
                        </div>
                        {/* Desglose Conteo */}
                        <div className="p-3 rounded-lg bg-white dark:bg-black">
                            <h4 className="font-semibold mb-2">Desglose de Conteo</h4>
                            <ul className="text-xs space-y-0.5 max-h-32 overflow-y-auto">
                               {denominations.map(den => (
                                   s.countedDenominations[den.value] && (
                                     <li key={den.value} className="flex justify-between">
                                        <span className="text-gray-500">{den.label}:</span>
                                        <span>x {s.countedDenominations[den.value]}</span>
                                    </li>
                                   )
                               ))}
                            </ul>
                        </div>
                      </div>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="mt-6 flex justify-end">
             <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-md text-sm font-semibold transition-colors
                         bg-gray-200 text-gray-800 hover:bg-gray-300
                         dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"
            >
              Cerrar
            </button>
        </div>
      </div>
    </div>
  );
};


const CashFlowItem: React.FC<{ label: string; amount: number; icon: React.ReactNode; }> = ({ label, amount, icon }) => (
  <li className="flex justify-between items-center text-gray-600 dark:text-gray-400">
    <span className="flex items-center gap-1">{icon}{label}</span>
    <span className="font-mono font-semibold">{amount < 0 && '-'}${Math.abs(amount).toFixed(2)}</span>
  </li>
);

export default ShiftHistoryModal;
