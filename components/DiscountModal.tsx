
import React, { useState, useEffect, useRef } from 'react';

type Discount = { type: 'percentage' | 'fixed'; value: number };

interface DiscountModalProps {
  onClose: () => void;
  onSave: (discount: Discount | null) => void;
  currentDiscount?: Discount;
  itemName?: string;
}

const DiscountModal: React.FC<DiscountModalProps> = ({ onClose, onSave, currentDiscount, itemName }) => {
  const [discountType, setDiscountType] = useState<'percentage' | 'fixed'>(currentDiscount?.type || 'percentage');
  const [discountValue, setDiscountValue] = useState(currentDiscount?.value.toString() || '');
  const inputRef = useRef<HTMLInputElement>(null);
  
  useEffect(() => {
    inputRef.current?.focus();
    inputRef.current?.select();
  }, []);

  const handleSave = () => {
    const parsedDiscount = parseFloat(discountValue);
    if (discountValue === '' || parsedDiscount === 0) {
      onSave(null);
      return;
    }

    if (!isNaN(parsedDiscount) && parsedDiscount > 0) {
      if (discountType === 'percentage' && parsedDiscount > 100) {
        onSave({ type: 'percentage', value: 100 });
      } else {
        onSave({ type: discountType, value: parsedDiscount });
      }
    } else {
      onClose(); // Close if invalid input
    }
  };
  
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') handleSave();
    if (e.key === 'Escape') onClose();
  };

  return (
    <div 
      className="fixed inset-0 bg-black/60 z-50 flex justify-center items-center"
      aria-modal="true"
      role="dialog"
      onClick={onClose}
    >
      <div className="bg-dp-light dark:bg-dp-charcoal rounded-lg shadow-2xl p-6 w-full max-w-sm m-4 animate-modal-in" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-xl font-bold mb-2 text-dp-dark-gray dark:text-dp-light-gray">Aplicar Descuento</h2>
        {itemName && <p className="text-sm text-gray-500 dark:text-gray-400 mb-4 truncate">a: {itemName}</p>}
        
        <div className="flex justify-center mb-4">
            <div className="bg-dp-soft-gray dark:bg-dp-dark p-1 rounded-full flex items-center">
                <button onClick={() => setDiscountType('percentage')} className={`px-4 py-1 text-sm font-bold rounded-full ${discountType === 'percentage' ? 'bg-dp-light dark:bg-black shadow' : 'text-gray-500'}`}>%</button>
                <button onClick={() => setDiscountType('fixed')} className={`px-4 py-1 text-sm font-bold rounded-full ${discountType === 'fixed' ? 'bg-dp-light dark:bg-black shadow' : 'text-gray-500'}`}>$</button>
            </div>
        </div>

        <form onSubmit={(e) => { e.preventDefault(); handleSave(); }}>
          <div className="relative">
            {discountType === 'fixed' && <span className="absolute left-4 top-1/2 -translate-y-1/2 text-2xl font-semibold text-gray-400">$</span>}
            <input
              ref={inputRef}
              type="number"
              value={discountValue}
              onChange={(e) => setDiscountValue(e.target.value)}
              onKeyDown={handleKeyDown}
              className={`w-full text-center text-3xl font-bold py-2 border-2 rounded-md shadow-sm focus:outline-none 
                         bg-white dark:bg-gray-800 text-dp-dark-gray dark:text-dp-light-gray
                         border-gray-300 dark:border-gray-600 
                         focus:ring-dp-blue dark:focus:ring-dp-gold focus:border-transparent
                         ${discountType === 'fixed' ? 'pl-10 pr-4' : 'pl-4 pr-10'}`}
              placeholder="0.00"
              min="0"
              step="any"
            />
            {discountType === 'percentage' && <span className="absolute right-4 top-1/2 -translate-y-1/2 text-2xl font-semibold text-gray-400">%</span>}
          </div>
          
          <div className="flex justify-end gap-4 mt-6">
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
              type="submit"
              className="px-4 py-2 rounded-md text-sm font-semibold transition-colors
                         text-dp-light bg-dp-blue hover:bg-blue-700
                         dark:text-dp-dark dark:bg-dp-gold dark:hover:bg-yellow-500"
            >
              Aplicar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default DiscountModal;
