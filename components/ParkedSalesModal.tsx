
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
    <div className="fixed inset-0 bg-black/70 z-50 flex justify-center items-center backdrop-blur-sm p-4" onClick={onClose}>
      <div className="bg-white dark:bg-dp-dark rounded-2xl shadow-2xl p-0 w-full max-w-2xl overflow-hidden animate-modal-in border border-gray-200 dark:border-gray-800" onClick={e => e.stopPropagation()}>
        
        <div className="p-6 bg-dp-soft-gray dark:bg-black/40 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center">
            <div>
                <h2 className="text-2xl font-black text-dp-dark-gray dark:text-dp-light-gray flex items-center gap-3">
                    <ParkingSquare className="text-dp-blue dark:text-dp-gold" /> Ventas en Espera
                </h2>
                <p className="text-[10px] text-gray-500 uppercase font-black tracking-widest mt-1">Sesiones pausadas por retomar</p>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-gray-200 dark:hover:bg-white/10 rounded-full"><X size={24} /></button>
        </div>
        
        <div className="p-6 overflow-y-auto max-h-[60vh] space-y-4 custom-scrollbar">
          {parkedSales.length === 0 ? (
            <div className="py-16 text-center opacity-30 flex flex-col items-center grayscale">
                <ParkingSquare size={64} className="mb-4" />
                <p className="text-xs font-black uppercase tracking-[0.2em]">No hay ventas aparcadas</p>
            </div>
          ) : (
            <ul className="space-y-4">
              {parkedSales.map((sale) => (
                <li key={sale.id} className="group relative bg-gray-50 dark:bg-dp-charcoal rounded-2xl border border-transparent hover:border-dp-blue/30 dark:hover:border-dp-gold/30 transition-all p-5">
                    <div className="flex justify-between items-start">
                        <div className="space-y-3">
                            <div className="flex items-center gap-4">
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
                                <div>
                                    <p className="text-sm font-black text-dp-dark-gray dark:text-dp-light-gray">{sale.customer?.name || 'Cliente Genérico'}</p>
                                    <p className="text-[10px] text-gray-500 font-bold uppercase truncate max-w-[200px]">
                                        {sale.items.map(i => i.name).join(', ')}
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="text-right space-y-3">
                            <div>
                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Total Reservado</p>
                                <p className="text-2xl font-black text-dp-dark-gray dark:text-white">${calculateTotal(sale).toLocaleString()}</p>
                            </div>
                            <div className="flex gap-2 justify-end">
                                <button 
                                    onClick={() => onRestore(sale)}
                                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-black bg-dp-blue text-white hover:brightness-110 active:scale-95 transition-all shadow-md shadow-blue-500/20 uppercase tracking-widest"
                                >
                                    <Play size={14} /> Reanudar
                                </button>
                                <button
                                    onClick={() => onDelete(sale.id)}
                                    className="p-2.5 rounded-xl bg-red-100 text-red-600 hover:bg-red-200 transition-colors"
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

        <div className="p-4 bg-gray-50 dark:bg-black/40 border-t border-gray-100 dark:border-gray-800 flex justify-end">
            <button onClick={onClose} className="px-6 py-2 text-xs font-black text-gray-500 uppercase tracking-widest hover:text-dp-dark-gray dark:hover:text-white transition-colors">Cerrar</button>
        </div>
      </div>
    </div>
  );
};

export default ParkedSalesModal;
