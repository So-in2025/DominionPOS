
import React, { useState, useEffect } from 'react';
import type { Transaction } from '../types';
import * as dbService from '../services/db';
import { X, ChevronDown, ChevronUp, DollarSign, CreditCard, User, RotateCcw, TrendingUp, Gift, Printer, Search, Calendar } from 'lucide-react';
import { PROMOTIONS } from '../constants';

interface SalesHistoryModalProps {
  onClose: () => void;
  onReturn: (transaction: Transaction) => void;
  onPrintReceipt: (transaction: Transaction) => void;
}

const SalesHistoryModal: React.FC<SalesHistoryModalProps> = ({ onClose, onReturn, onPrintReceipt }) => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [expandedTxId, setExpandedTxId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    setTransactions(dbService.getTransactions());
  }, []);

  const filteredTxs = transactions.filter(tx => 
      tx.id.toLowerCase().includes(searchTerm.toLowerCase()) || 
      tx.customerName?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex justify-center items-center backdrop-blur-sm p-4" onClick={onClose}>
      <div className="bg-white dark:bg-dp-dark rounded-2xl shadow-2xl w-full max-w-4xl overflow-hidden animate-modal-in flex flex-col max-h-[90vh] border border-gray-200 dark:border-gray-800" onClick={e => e.stopPropagation()}>
        
        {/* Header Section */}
        <div className="p-6 bg-dp-soft-gray dark:bg-black/40 border-b border-gray-100 dark:border-gray-800 flex justify-between items-start">
            <div>
                <h2 className="text-2xl font-black text-dp-dark-gray dark:text-dp-light-gray flex items-center gap-3">
                   <TrendingUp className="text-dp-blue dark:text-dp-gold"/> Auditoría de Ventas
                </h2>
                <p className="text-[10px] text-gray-500 uppercase font-black tracking-[0.2em] mt-1">Registro histórico de transacciones</p>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-gray-200 dark:hover:bg-white/10 rounded-full transition-colors"><X size={24} /></button>
        </div>

        {/* Filter Bar */}
        <div className="px-6 py-4 bg-white dark:bg-dp-dark border-b border-gray-100 dark:border-gray-800">
            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input 
                    type="text" 
                    placeholder="Buscar por ID de venta o nombre de cliente..." 
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-black/40 outline-none focus:ring-2 focus:ring-dp-blue transition-all text-sm"
                />
            </div>
        </div>
        
        {/* List Section */}
        <div className="flex-1 overflow-y-auto p-6 space-y-3 custom-scrollbar">
          {filteredTxs.length === 0 ? (
            <div className="h-64 flex flex-col items-center justify-center opacity-30 grayscale">
                <Search size={48} className="mb-2"/>
                <p className="text-xs font-black uppercase tracking-widest">Sin resultados</p>
            </div>
          ) : (
            filteredTxs.map((tx) => (
                <div key={tx.id} className="bg-white dark:bg-dp-charcoal rounded-2xl shadow-sm border border-transparent hover:border-gray-200 dark:hover:border-gray-700 transition-all overflow-hidden">
                    <button 
                        onClick={() => setExpandedTxId(expandedTxId === tx.id ? null : tx.id)}
                        className="w-full p-4 flex items-center justify-between group"
                    >
                        <div className="flex items-center gap-4">
                            <div className={`p-3 rounded-xl ${tx.type === 'refund' ? 'bg-red-50 text-red-500 dark:bg-red-900/30' : 'bg-blue-50 text-blue-600 dark:bg-blue-900/30'}`}>
                                {tx.type === 'refund' ? <RotateCcw size={20}/> : <DollarSign size={20}/>}
                            </div>
                            <div className="text-left">
                                <div className="flex items-center gap-2">
                                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">#{tx.id.slice(-6)}</span>
                                    {tx.customerName && <span className="px-2 py-0.5 rounded-full bg-dp-blue/10 text-dp-blue dark:text-dp-gold dark:bg-dp-gold/10 text-[9px] font-black uppercase">{tx.customerName}</span>}
                                </div>
                                <p className="text-xs font-bold text-gray-800 dark:text-gray-200 mt-0.5">{new Date(tx.createdAt).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-6">
                            <div className="text-right">
                                <p className={`text-lg font-black ${tx.type === 'refund' ? 'text-red-500' : 'text-dp-blue dark:text-dp-gold'}`}>
                                    {tx.total < 0 ? '-' : ''}${Math.abs(tx.total).toLocaleString()}
                                </p>
                                <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">{tx.items.length} Artículos • {tx.paymentMethod}</p>
                            </div>
                            <div className={`p-1.5 rounded-lg bg-gray-100 dark:bg-black/30 text-gray-400 group-hover:text-dp-blue transition-colors ${expandedTxId === tx.id ? 'rotate-180' : ''}`}>
                                <ChevronDown size={18} />
                            </div>
                        </div>
                    </button>
                    
                    {expandedTxId === tx.id && (
                        <div className="px-6 pb-6 pt-2 animate-modal-in border-t border-gray-50 dark:border-gray-800">
                            <div className="flex justify-between items-center mb-4">
                                <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Desglose de Operación</h4>
                                <div className="flex gap-2">
                                    <button onClick={() => onPrintReceipt(tx)} className="p-2 rounded-lg bg-gray-100 dark:bg-black/40 text-gray-500 hover:text-dp-blue transition-colors" title="Reimprimir Ticket"><Printer size={16}/></button>
                                    {tx.type === 'sale' && (
                                        <button onClick={() => onReturn(tx)} className="px-3 py-1.5 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 text-[10px] font-black uppercase tracking-widest transition-all">Reembolsar</button>
                                    )}
                                </div>
                            </div>
                            
                            <ul className="space-y-2 mb-6">
                                {tx.items.map(item => (
                                    <li key={item.id} className="flex justify-between items-center text-xs">
                                        <div className="flex-1">
                                            <p className="font-bold text-gray-700 dark:text-gray-300">{item.name}</p>
                                            <p className="text-[10px] text-gray-500">x{item.quantity} @ ${item.price.toLocaleString()}</p>
                                        </div>
                                        <p className="font-mono font-bold text-gray-600 dark:text-gray-400">${((item.overriddenPrice ?? item.price) * item.quantity).toLocaleString()}</p>
                                    </li>
                                ))}
                            </ul>

                            <div className="bg-gray-50 dark:bg-black/30 p-4 rounded-xl space-y-2">
                                <div className="flex justify-between text-[10px] font-bold text-gray-500 uppercase"><span>Subtotal:</span><span>${tx.subtotal.toLocaleString()}</span></div>
                                {tx.discountAmount > 0 && <div className="flex justify-between text-[10px] font-bold text-red-500 uppercase"><span>Descuentos:</span><span>-${tx.discountAmount.toLocaleString()}</span></div>}
                                <div className="flex justify-between text-base font-black text-dp-dark-gray dark:text-white pt-2 border-t border-gray-200 dark:border-gray-800"><span>TOTAL NETO:</span><span>${tx.total.toLocaleString()}</span></div>
                            </div>
                        </div>
                    )}
                </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default SalesHistoryModal;
