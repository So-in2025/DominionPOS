import React, { useState, useEffect } from 'react';
import type { CashMovement } from '../types';
import * as dbService from '../services/db';
import { X, DollarSign, ArrowUpCircle, ArrowDownCircle, Info, History } from 'lucide-react';

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
    const movements = dbService.getOpenCashMovements();
    setTodaysMovements(movements);
    if(movements.some(m => m.type === 'initial')) {
        setInitialAmountSet(true);
    }
  }, []);
  
  const handleSave = () => {
    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      setError('Monto inválido.');
      return;
    }
    setError('');
    onSave({ type: activeTab, amount: parsedAmount, reason: reason.trim() });
    setAmount('');
    setReason('');
    const newMovement: CashMovement = { id: `temp-${Date.now()}`, createdAt: Date.now(), type: activeTab, amount: parsedAmount, reason: reason.trim() };
    setTodaysMovements(prev => [newMovement, ...prev]);
  };
  
  const handleSetInitial = () => {
    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount < 0) {
      setError('Fondo inicial inválido.');
      return;
    }
    setError('');
    onSave({ type: 'initial', amount: parsedAmount, reason: 'Fondo de caja inicial' });
    setInitialAmountSet(true);
    setAmount('');
  }

  return (
    <div className="fixed inset-0 bg-black/60 z-[60] flex justify-center items-center backdrop-blur-sm p-4" onClick={onClose}>
      <div className="bg-white dark:bg-dp-dark rounded-2xl shadow-2xl w-full max-w-4xl animate-modal-in flex flex-col md:flex-row border border-gray-200 dark:border-gray-800 max-h-[90vh] overflow-y-auto md:overflow-hidden custom-scrollbar" onClick={e => e.stopPropagation()}>
        
        {/* Left: Input Section */}
        <div className="md:w-1/2 p-8 border-b md:border-b-0 md:border-r border-gray-100 dark:border-gray-800">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h2 className="text-2xl font-black text-dp-dark-gray dark:text-dp-light-gray flex items-center gap-2">
                        <DollarSign className="text-dp-blue dark:text-dp-gold" /> Gestión de Caja
                    </h2>
                    <p className="text-xs text-gray-500 uppercase font-bold tracking-widest mt-1">Efectivo en Punto de Venta</p>
                </div>
                <button onClick={onClose} className="md:hidden p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full"><X size={20}/></button>
            </div>

            {!initialAmountSet ? (
                <div className="bg-blue-50 dark:bg-blue-900/20 p-6 rounded-2xl border border-blue-100 dark:border-blue-900/50">
                    <h3 className="text-blue-700 dark:text-blue-400 font-black text-sm uppercase tracking-widest mb-4 flex items-center gap-2">
                        <Info size={16}/> Paso 1: Fondo Inicial
                    </h3>
                    <div className="space-y-4">
                        <input type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0.00" className="w-full text-center text-4xl font-black bg-white dark:bg-black/40 border-2 border-blue-200 dark:border-blue-900 rounded-xl py-4 focus:border-dp-blue outline-none transition-all dark:text-white" />
                        <button onClick={handleSetInitial} className="w-full py-4 bg-dp-blue text-white rounded-xl font-black uppercase tracking-widest shadow-lg shadow-blue-500/30 hover:brightness-110 active:scale-[0.98] transition-all">Abrir Caja Hoy</button>
                    </div>
                </div>
            ) : (
                <div className="space-y-6">
                    <div className="flex bg-gray-100 dark:bg-black/40 p-1 rounded-xl">
                        <button onClick={() => setActiveTab('addition')} className={`flex-1 py-3 rounded-lg text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all ${activeTab === 'addition' ? 'bg-white dark:bg-gray-800 text-green-600 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}><ArrowUpCircle size={16}/> Entrada</button>
                        <button onClick={() => setActiveTab('withdrawal')} className={`flex-1 py-3 rounded-lg text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all ${activeTab === 'withdrawal' ? 'bg-white dark:bg-gray-800 text-red-600 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}><ArrowDownCircle size={16}/> Salida</button>
                    </div>
                    
                    <div className="space-y-4">
                        <div>
                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Monto a {activeTab === 'addition' ? 'Ingresar' : 'Retirar'}</label>
                            <input type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0.00" className="w-full text-3xl font-black bg-gray-50 dark:bg-black/40 border border-gray-200 dark:border-gray-800 rounded-xl px-4 py-4 outline-none focus:ring-2 focus:ring-dp-blue dark:focus:ring-dp-gold transition-all dark:text-white" />
                        </div>
                        <div>
                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Motivo / Justificación</label>
                            <input type="text" value={reason} onChange={e => setReason(e.target.value)} placeholder="Ej: Cambio de turno, depósito..." className="w-full bg-gray-50 dark:bg-black/40 border border-gray-200 dark:border-gray-800 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-dp-blue transition-all text-sm" />
                        </div>
                        {error && <p className="text-red-500 text-xs font-bold text-center">{error}</p>}
                        <button onClick={handleSave} className={`w-full py-4 text-white rounded-xl font-black uppercase tracking-widest shadow-lg transition-all active:scale-[0.98] ${activeTab === 'addition' ? 'bg-green-600 shadow-green-500/20 hover:bg-green-700' : 'bg-red-600 shadow-red-500/20 hover:bg-red-700'}`}>Registrar Movimiento</button>
                    </div>
                </div>
            )}
        </div>

        {/* Right: History Section */}
        <div className="md:w-1/2 bg-dp-soft-gray dark:bg-black/20 p-8 flex flex-col">
            <div className="flex justify-between items-center mb-6">
                <h3 className="text-sm font-black text-gray-500 uppercase tracking-widest flex items-center gap-2">
                    <History size={16}/> Historial del Turno
                </h3>
                <button onClick={onClose} className="hidden md:block p-2 hover:bg-gray-200 dark:hover:bg-white/10 rounded-full"><X size={20}/></button>
            </div>
            
            <div className="flex-1 overflow-y-auto space-y-3 pr-2 custom-scrollbar">
                {todaysMovements.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-center opacity-40 grayscale">
                        <DollarSign size={48} className="mb-2"/>
                        <p className="text-xs font-bold uppercase tracking-tighter">Sin movimientos</p>
                    </div>
                ) : (
                    todaysMovements.map(m => (
                        <div key={m.id} className="bg-white dark:bg-dp-charcoal p-4 rounded-2xl shadow-sm border border-transparent hover:border-gray-200 dark:hover:border-gray-700 transition-all flex justify-between items-center group">
                            <div className="flex items-center gap-4">
                                <div className={`p-2 rounded-lg ${m.type === 'withdrawal' ? 'bg-red-100 text-red-600 dark:bg-red-900/30' : m.type === 'initial' ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/30' : 'bg-green-100 text-green-600 dark:bg-green-900/30'}`}>
                                    {m.type === 'withdrawal' ? <ArrowDownCircle size={20}/> : m.type === 'initial' ? <DollarSign size={20}/> : <ArrowUpCircle size={20}/>}
                                </div>
                                <div>
                                    <p className="text-xs font-black text-dp-dark-gray dark:text-dp-light-gray uppercase tracking-tighter">
                                        {m.type === 'initial' ? 'Fondo Inicial' : m.type === 'addition' ? 'Entrada' : 'Retiro'}
                                    </p>
                                    <p className="text-[10px] text-gray-500 font-bold max-w-[150px] truncate">{m.reason || 'Sin motivo'}</p>
                                </div>
                            </div>
                            <div className="text-right">
                                <p className={`font-mono font-black ${m.type === 'withdrawal' ? 'text-red-500' : 'text-green-500'}`}>
                                    {m.type === 'withdrawal' ? '-' : '+'}${m.amount.toLocaleString()}
                                </p>
                                <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">{new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>

      </div>
    </div>
  );
};

export default CashManagementModal;
