
import React from 'react';
import type { ParkedSale } from '../types';
import { X, Play, Trash2, ParkingSquare } from 'lucide-react';

interface ParkedSalesModalProps {
  parkedSales: ParkedSale[];
  onClose: () => void;
  onRestore: (sale: ParkedSale) => void;
  onDelete: (saleId: string) => void;
  getTotals: (items: ParkedSale['items'], discount: ParkedSale['globalDiscount'], promotion: ParkedSale['activePromotion']) => { finalTotal: number };
}

// A simplified version of getTotals for display purposes
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
    // Note: This simplified calculation doesn't re-evaluate promotions, it just uses stored discount state.
    // For a full, accurate total, the main `getTotals` logic would be needed.
    return Math.max(0, totalAfterItemDiscounts - reductionAmount);
}

const ParkedSalesModal: React.FC<ParkedSalesModalProps> = ({ parkedSales, onClose, onRestore, onDelete }) => {
  return (
    <div
      className="fixed inset-0 bg-black/60 z-50 flex justify-center items-center"
      aria-modal="true"
      role="dialog"
      onClick={onClose}
    >
      <div 
        className="bg-dp-light dark:bg-dp-charcoal rounded-lg shadow-2xl p-6 w-full max-w-2xl m-4 flex flex-col max-h-[80vh] animate-modal-in" 
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-bold text-dp-dark-gray dark:text-dp-light-gray flex items-center gap-2">
                <ParkingSquare /> Ventas Aparcadas
            </h2>
            <button
                onClick={onClose}
                className="p-2 rounded-full text-dp-dark-gray dark:text-dp-light-gray hover:bg-dp-soft-gray dark:hover:bg-gray-700"
                aria-label="Cerrar"
            >
                <X size={24} />
            </button>
        </div>
        
        <div className="flex-grow overflow-y-auto pr-2">
          {parkedSales.length === 0 ? (
            <p className="text-center text-gray-500 dark:text-gray-400 py-16">No hay ventas aparcadas.</p>
          ) : (
            <ul className="space-y-3">
              {parkedSales.map((sale) => (
                <li key={sale.id} className="rounded-lg bg-dp-soft-gray dark:bg-gray-800/50 p-3 flex justify-between items-center">
                    <div>
                        <p className="font-semibold text-gray-800 dark:text-gray-200">
                            Aparcada: {new Date(sale.createdAt).toLocaleTimeString()}
                        </p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                           {sale.items.length} artículo(s) por un total de ${calculateTotal(sale).toFixed(2)}
                           {sale.customer && ` | Cliente: ${sale.customer.name}`}
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        <button 
                            onClick={() => onRestore(sale)}
                            className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors bg-green-100 text-green-700 hover:bg-green-200 dark:bg-green-900/50 dark:text-green-300 dark:hover:bg-green-900/80"
                        >
                            <Play size={16} /> Reanudar
                        </button>
                        <button
                            onClick={() => onDelete(sale.id)}
                            className="p-2 rounded-full text-red-500 hover:bg-red-500/10 transition-colors"
                            aria-label="Eliminar venta aparcada"
                        >
                            <Trash2 size={18} />
                        </button>
                    </div>
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

export default ParkedSalesModal;