
import React, { useState, useMemo } from 'react';
import type { Transaction, SaleItem } from '../types';
import { X, RotateCcw, Plus, Minus } from 'lucide-react';

interface ReturnModalProps {
  transaction: Transaction;
  onClose: () => void;
  onConfirmRefund: (originalTx: Transaction, itemsToReturn: SaleItem[], refundTotal: number) => void;
}

const ReturnModal: React.FC<ReturnModalProps> = ({ transaction, onClose, onConfirmRefund }) => {
  const [itemsToReturn, setItemsToReturn] = useState<{[key: string]: number}>({});

  const handleQuantityChange = (item: SaleItem, delta: number) => {
    setItemsToReturn(prev => {
      const currentQty = prev[item.id] || 0;
      const newQty = Math.max(0, Math.min(item.quantity, currentQty + delta));
      if (newQty === 0) {
        const { [item.id]: _, ...rest } = prev;
        return rest;
      }
      return { ...prev, [item.id]: newQty };
    });
  };
  
  const refundTotal = useMemo(() => {
    if (!transaction || transaction.type !== 'sale') return 0;

    // 1. Calculate the total value of the original cart AFTER item-specific discounts were applied.
    const totalAfterItemDiscounts = transaction.items.reduce((acc, item) => {
        const lineBaseTotal = (item.overriddenPrice ?? item.price) * item.quantity;
        if (item.discount) {
            if (item.discount.type === 'percentage') {
                return acc + (lineBaseTotal * (1 - item.discount.value / 100));
            }
            return acc + Math.max(0, lineBaseTotal - item.discount.value);
        }
        return acc + lineBaseTotal;
    }, 0);

    // 2. Determine the discount from a global discount or a promotion.
    const globalOrPromoDiscountAmount = totalAfterItemDiscounts - transaction.total;

    // 3. Calculate the ratio of this global discount relative to the value it was applied to.
    const globalOrPromoRatio = totalAfterItemDiscounts > 0 ? globalOrPromoDiscountAmount / totalAfterItemDiscounts : 0;
    
    // 4. Calculate the refund total for the selected items.
    let totalRefund = 0;
    for (const itemId in itemsToReturn) {
        const originalItem = transaction.items.find(i => i.id === itemId);
        if (!originalItem) continue;

        const quantityToReturn = itemsToReturn[itemId];
        
        // Calculate the base value of the items being returned (considering price overrides)
        const lineBaseValue = (originalItem.overriddenPrice ?? originalItem.price) * quantityToReturn;
        
        // Calculate the value after applying any item-specific discount
        let valueAfterItemDiscount = lineBaseValue;
        if (originalItem.discount) {
            if (originalItem.discount.type === 'percentage') {
                valueAfterItemDiscount *= (1 - originalItem.discount.value / 100);
            } else {
                // Prorate the fixed discount for the quantity being returned
                const proportionalFixedDiscount = (originalItem.discount.value / originalItem.quantity) * quantityToReturn;
                valueAfterItemDiscount = Math.max(0, valueAfterItemDiscount - proportionalFixedDiscount);
            }
        }
        
        // Apply the proportional global/promo discount
        const finalValue = valueAfterItemDiscount * (1 - globalOrPromoRatio);
        
        totalRefund += finalValue;
    }

    return Math.max(0, totalRefund); // Ensure refund is not negative
  }, [itemsToReturn, transaction]);
  
  const handleConfirm = () => {
    const finalItems: SaleItem[] = [];
    for (const itemId in itemsToReturn) {
        const originalItem = transaction.items.find(i => i.id === itemId);
        if(originalItem) {
            finalItems.push({
                ...originalItem,
                quantity: itemsToReturn[itemId]
            });
        }
    }
    if (finalItems.length > 0) {
        onConfirmRefund(transaction, finalItems, refundTotal);
    }
  };

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
            <h2 className="text-2xl font-bold text-dp-dark-gray dark:text-dp-light-gray">Procesar Reembolso</h2>
            <button
                onClick={onClose}
                className="p-2 rounded-full text-dp-dark-gray dark:text-dp-light-gray hover:bg-dp-soft-gray dark:hover:bg-gray-700"
                aria-label="Cerrar"
            >
                <X size={24} />
            </button>
        </div>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
            Seleccione los artículos y cantidades a devolver de la venta <strong>{transaction.id}</strong>.
        </p>

        <div className="flex-grow overflow-y-auto pr-2 border-t border-b dark:border-gray-700 py-2">
           <ul className="divide-y divide-gray-200 dark:divide-gray-700">
                {transaction.items.map(item => (
                    <li key={item.id} className="flex justify-between items-center py-3">
                        <div>
                            <p className="font-semibold">{item.name}</p>
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                                {item.quantity} {item.quantity > 1 ? 'unidades compradas' : 'unidad comprada'}
                            </p>
                        </div>
                         <div className="flex items-center gap-3">
                            <span className="font-semibold text-gray-600 dark:text-gray-300">Devolver:</span>
                             <div className="flex items-center gap-2 bg-dp-soft-gray dark:bg-dp-dark rounded-full p-1">
                                <button onClick={() => handleQuantityChange(item, -1)} className="p-1 text-dp-dark-gray dark:text-dp-light-gray hover:bg-gray-300 dark:hover:bg-gray-700 rounded-full"><Minus size={14} /></button>
                                <span className="font-bold text-sm w-8 text-center">{itemsToReturn[item.id] || 0}</span>
                                <button onClick={() => handleQuantityChange(item, 1)} className="p-1 text-dp-dark-gray dark:text-dp-light-gray hover:bg-gray-300 dark:hover:bg-gray-700 rounded-full"><Plus size={14} /></button>
                            </div>
                        </div>
                    </li>
                ))}
           </ul>
        </div>
        
        <div className="mt-6">
            <div className="flex justify-between items-center text-2xl font-bold mb-4">
                <span className="text-gray-600 dark:text-gray-400">Total a Reembolsar</span>
                <span className="text-orange-500">${refundTotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-end gap-4">
                <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-md text-sm font-semibold transition-colors
                            bg-gray-200 text-gray-800 hover:bg-gray-300
                            dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"
                >
                Cancelar
                </button>
                <button
                    type="button"
                    onClick={handleConfirm}
                    disabled={refundTotal <= 0}
                    className="flex items-center gap-2 px-4 py-2 rounded-md text-sm font-semibold transition-colors
                                bg-orange-500 text-white hover:bg-orange-600
                                disabled:bg-gray-400 dark:disabled:bg-gray-600 disabled:cursor-not-allowed"
                    >
                    <RotateCcw size={16} /> Confirmar Reembolso
                </button>
            </div>
        </div>
      </div>
    </div>
  );
};

export default ReturnModal;
