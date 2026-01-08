
import React from 'react';
import type { ParkedSale } from '../types';
import { X, Play, Trash2, ParkingSquare, Clock, User, Hash } from 'lucide-react';

interface ParkedSalesModalProps {
  parkedSales: ParkedSale[];
  onClose: () => void;
  onRestore: (sale: ParkedSale) => void;
  onDelete: (saleId: string) => void;
}

const calculateTotal = (sale: ParkedSale): number => {
    const subtotal = sale.items.reduce((acc, item) => acc + (item.overriddenPrice ?? item.price) * item.quantity, 0);
    let totalAfterItemDiscounts = 0;
    sale.items.forEach(item => {
        const lineBaseTotal = (item.overriddenPrice ?? item.price) * item.quantity;
        let lineDiscountAmount = 0;
        if (item.discount) {
            if (item.discount.type === 'percentage') {
                lineDiscountAmount = lineBaseTotal * (item.discount.value / 100);
            } else {
                lineDiscountAmount = Math.min(item.discount.value, lineBaseTotal);
            }
        }
        totalAfterItemDiscounts += (lineBaseTotal - lineDiscountAmount);
    });

    let reductionAmount = 0;
    if (sale.globalDiscount) {
        if (sale.globalDiscount.type === 'percentage') {
            reductionAmount = totalAfterItemDiscounts * (sale.globalDiscount.value / 100);
        } else {
            reductionAmount = Math.min(sale.globalDiscount.value, totalAfterItemDiscounts);
        }
    }
    return Math.max(0, totalAfterItemDiscounts - reductionAmount);
}

const ParkedSalesModal: React.FC<ParkedSalesModalProps> = ({ parkedSales, onClose, onRestore, onDelete }) => {
  return (
    <div className="fixed inset-0 bg-black/70 z-[60] flex justify-center items-end sm:items-center backdrop-blur-sm p-4 sm:p-4" onClick={onClose}>
      <div className="bg-white dark:bg-dp-dark rounded-t-2xl sm:rounded-2xl shadow-2xl w-full max-w-2xl flex flex-col animate-modal-in border border-gray-200 dark:border-gray-800 h-[85vh] sm:h-auto sm:max-h-[85vh]" onClick={e => e.stopPropagation()}>
        
        {/* Header - Fixed */}
        <div className="p-5 bg-dp-soft-gray dark:bg-black/40 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center flex-shrink-0 rounded-t-2xl">
            <div>
                <h2 className="text-xl sm:text-2xl font-black text-dp-dark-gray dark:text-dp-light-gray flex items-center gap-3">
                    <ParkingSquare className="text-dp-blue dark:text-dp-gold" /> Ventas Pausadas
                </h2>
                <p className="text-[10px] text-gray-500 uppercase font-black tracking-widest mt-1">Sesiones pausadas por retomar</p>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-gray-200 dark:hover:bg-white/10 rounded-full transition-colors"><X size={24} /></button>
        </div>
        
        {/* Body - Scrollable */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 min-h-0 custom-scrollbar bg-white dark:bg-dp-dark">
          {parkedSales.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center opacity-30 grayscale">
                <ParkingSquare size={64} className="mb-4" />
                <p className="text-xs font-black uppercase tracking-[0.2em]">No hay ventas pausadas</p>
            </div>
          ) : (
            <ul className="space-y-4 pb-4">
              {parkedSales.map((sale) => (
                <li key={sale.id} className="group relative bg-gray-50 dark:bg-dp-charcoal rounded-2xl border border-transparent hover:border-dp-blue/30 dark:hover:border-dp-gold/30 transition-all p-4 sm:p-5 shadow-sm">
                    <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
                        <div className="space-y-3 w-full sm:w-auto">
                            <div className="flex items-center justify-between sm:justify-start gap-4">
                                <div className="flex items-center gap-1.5 text-xs font-black text-gray-400 uppercase tracking-tighter">
                                    <Clock size={14}/> {new Date(sale.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                </div>
                                <div className="flex items-center gap-1.5 text-xs font-black text-gray-400 uppercase tracking-tighter">
                                    <Hash size={14}/> {sale.items.length} Items
                                </div>
                            </div>
                            
                            <div className="flex items-center gap-3">
                                <div className={`p-3 rounded-xl ${sale.customer ? 'bg-dp-blue/10 text-dp-blue dark:text-dp-gold dark:bg-dp-gold/10' : 'bg-gray-200 text-gray-500 dark:bg-black/30'}`}>
                                    <User size={20}/>
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-black text-dp-dark-gray dark:text-dp-light-gray truncate">{sale.customer?.name || 'Cliente Genérico'}</p>
                                    <p className="text-[10px] text-gray-500 font-bold uppercase truncate max-w-[200px]">
                                        {sale.items.map(i => i.name).join(', ')}
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="w-full sm:w-auto flex flex-row sm:flex-col justify-between items-end gap-3 mt-2 sm:mt-0 border-t sm:border-0 border-gray-200 dark:border-gray-700 pt-3 sm:pt-0">
                            <div className="text-left sm:text-right">
                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Total</p>
                                <p className="text-xl sm:text-2xl font-black text-dp-dark-gray dark:text-white">${calculateTotal(sale).toLocaleString()}</p>
                            </div>
                            <div className="flex gap-2">
                                <button 
                                    onClick={() => onRestore(sale)}
                                    className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black bg-dp-blue text-white hover:brightness-110 active:scale-95 transition-all shadow-md shadow-blue-500/20 uppercase tracking-widest"
                                >
                                    <Play size={14} /> <span className="hidden sm:inline">Reanudar</span>
                                </button>
                                <button
                                    onClick={() => onDelete(sale.id)}
                                    className="p-2 rounded-xl bg-red-100 text-red-600 hover:bg-red-200 transition-colors"
                                    aria-label="Eliminar"
                                >
                                    <Trash2 size={18} />
                                </button>
                            </div>
                        </div>
                    </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Footer - Fixed */}
        <div className="p-4 bg-gray-50 dark:bg-black/40 border-t border-gray-100 dark:border-gray-800 flex justify-end flex-shrink-0 rounded-b-none sm:rounded-b-2xl">
            <button onClick={onClose} className="w-full sm:w-auto px-6 py-3 sm:py-2 text-xs font-black text-gray-500 uppercase tracking-widest hover:text-dp-dark-gray dark:hover:text-white transition-colors bg-gray-200 dark:bg-gray-800 sm:bg-transparent rounded-xl sm:rounded-none">Cerrar Panel</button>
        </div>
      </div>
    </div>
  );
};

export default ParkedSalesModal;
