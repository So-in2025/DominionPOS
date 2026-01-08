import React, { useState, useEffect } from 'react';
import type { CashMovement } from '../types';
import * as dbService from '../services/db';
import { X, DollarSign, ArrowUpCircle, ArrowDownCircle } from 'lucide-react';

interface CashManagementModalProps {
  onClose: () => void;
  onSave: (movement: Omit<CashMovement, 'id' | 'createdAt'>) => void;
}

const CashManagementModal: React.FC<CashManagementModalProps> = ({ onClose, onSave }) => {
  const [activeTab, setActiveTab] = useState<'addition' | 'withdrawal'>('addition');
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');
  const [todaysMovements, setTodaysMovements] = useState<CashMovement[]>([]);
  const [initialAmountSet, setInitialAmountSet] = useState(false);

  useEffect(() => {
    // FIX: Changed getCashMovementsForToday to getOpenCashMovements to align with shift-based logic.
    const movements = dbService.getOpenCashMovements();
    setTodaysMovements(movements);
    if(movements.some(m => m.type === 'initial')) {
        setInitialAmountSet(true);
    }
  }, []);
  
  const handleSave = () => {
    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      setError('Por favor, ingrese un monto válido mayor a cero.');
      return;
    }
    setError('');

    onSave({ type: activeTab, amount: parsedAmount, reason: reason.trim() });
    setAmount('');
    setReason('');
    
    // Optimistic update
    const newMovement: CashMovement = { id: `temp-${Date.now()}`, createdAt: Date.now(), type: activeTab, amount: parsedAmount, reason: reason.trim() };
    setTodaysMovements(prev => [newMovement, ...prev]);
  };
  
  const handleSetInitial = () => {
    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount < 0) {
      setError('Por favor, ingrese un fondo inicial válido.');
      return;
    }
    setError('');
    onSave({ type: 'initial', amount: parsedAmount, reason: 'Fondo de caja inicial' });
    setInitialAmountSet(true);
    setAmount('');
  }

  return (
    <div 
      className="fixed inset-0 bg-black/60 z-50 flex justify-center items-center"
      aria-modal="true" role="dialog" onClick={onClose}
    >
      <div className="bg-dp-light dark:bg-dp-charcoal rounded-lg shadow-2xl p-6 w-full max-w-2xl m-4 animate-modal-in" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold text-dp-dark-gray dark:text-dp-light-gray flex items-center gap-2"><DollarSign />Gestión de Caja</h2>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-dp-soft-gray dark:hover:bg-gray-700"><X size={24} /></button>
        </div>
        
        <div className="flex gap-4">
            <div className="w-1/2 border-r dark:border-gray-700 pr-4">
                <h3 className="font-semibold mb-2">{initialAmountSet ? 'Registrar Movimiento' : '1. Establecer Fondo Inicial'}</h3>
                {!initialAmountSet ? (
                    <form onSubmit={(e) => { e.preventDefault(); handleSetInitial(); }} className="space-y-3 p-3 bg-dp-soft-gray dark:bg-black rounded-md">
                        <label htmlFor="initial-amount" className="block text-sm font-medium">Monto Inicial en Caja</label>
                        <input id="initial-amount" type="number" value={amount} onChange={(e) => setAmount(e.target.value)}
                           className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 focus:ring-dp-blue dark:focus:ring-dp-gold"
                           placeholder="0.00" required min="0" step="0.01" />
                        <button type="submit" className="w-full py-2 rounded-md font-semibold text-white bg-dp-blue dark:bg-dp-gold dark:text-dp-dark hover:bg-blue-700 dark:hover:bg-yellow-500">Guardar Fondo Inicial</button>
                    </form>
                ) : (
                    <form onSubmit={(e) => { e.preventDefault(); handleSave(); }} className="space-y-4">
                        <div className="bg-dp-soft-gray dark:bg-dp-dark p-1 rounded-full flex">
                            <button type="button" onClick={() => setActiveTab('addition')} className={`w-1/2 py-1 text-sm font-bold rounded-full flex justify-center items-center gap-2 ${activeTab === 'addition' ? 'bg-dp-light dark:bg-black shadow' : 'text-gray-500'}`}><ArrowUpCircle size={16}/> Entrada</button>
                            <button type="button" onClick={() => setActiveTab('withdrawal')} className={`w-1/2 py-1 text-sm font-bold rounded-full flex justify-center items-center gap-2 ${activeTab === 'withdrawal' ? 'bg-dp-light dark:bg-black shadow' : 'text-gray-500'}`}><ArrowDownCircle size={16}/> Salida</button>
                        </div>
                        <div>
                            <label htmlFor="amount" className="block text-sm font-medium mb-1">Monto</label>
                            <input id="amount" type="number" value={amount} onChange={(e) => setAmount(e.target.value)}
                                className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 focus:ring-dp-blue dark:focus:ring-dp-gold"
                                placeholder="0.00" required min="0.01" step="0.01" />
                        </div>
                        <div>
                            <label htmlFor="reason" className="block text-sm font-medium mb-1">Motivo <span className="text-xs text-gray-400">(Opcional)</span></label>
                            <input id="reason" type="text" value={reason} onChange={(e) => setReason(e.target.value)}
                                className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 focus:ring-dp-blue dark:focus:ring-dp-gold"
                                placeholder={activeTab === 'addition' ? 'Ej: Ingreso de cambio' : 'Ej: Retiro para depósito'}/>
                        </div>
                        {error && <p className="text-red-500 text-sm">{error}</p>}
                        <button type="submit" className={`w-full py-2 rounded-md font-semibold text-white ${activeTab === 'addition' ? 'bg-green-600 hover:bg-green-700' : 'bg-orange-600 hover:bg-orange-700'}`}>
                            Registrar {activeTab === 'addition' ? 'Entrada' : 'Salida'}
                        </button>
                    </form>
                )}
            </div>
            <div className="w-1/2">
                <h3 className="font-semibold mb-2">Movimientos de Hoy</h3>
                <div className="h-64 overflow-y-auto pr-2">
                    {todaysMovements.length === 0 ? (
                        <p className="text-center text-gray-500 pt-10 text-sm">No hay movimientos registrados.</p>
                    ) : (
                        <ul className="space-y-2 text-sm">
                            {todaysMovements.map(m => (
                                <li key={m.id} className="p-2 rounded-md bg-dp-soft-gray dark:bg-gray-800/50 flex justify-between items-start">
                                    <div>
                                        <p className={`font-bold ${m.type === 'withdrawal' ? 'text-orange-500' : 'text-green-500'}`}>
                                            {m.type === 'initial' ? 'FONDO INICIAL' : m.type === 'addition' ? 'ENTRADA' : 'SALIDA'}
                                        </p>
                                        <p className="text-xs text-gray-500 dark:text-gray-400">{m.reason}</p>
                                        <p className="text-xs text-gray-400">{new Date(m.createdAt).toLocaleTimeString()}</p>
                                    </div>
                                    <p className="font-semibold font-mono">${m.amount.toFixed(2)}</p>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            </div>
        </div>

      </div>
    </div>
  );
};

export default CashManagementModal;