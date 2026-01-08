
import React, { useState, useEffect, useRef } from 'react';

interface PriceOverrideModalProps {
  onClose: () => void;
  onSave: (newPrice: number | null) => void;
  currentPrice: number;
  itemName: string;
}

const PriceOverrideModal: React.FC<PriceOverrideModalProps> = ({ onClose, onSave, currentPrice, itemName }) => {
  const [price, setPrice] = useState(currentPrice.toString());
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
    inputRef.current?.select();
  }, []);

  const handleSave = () => {
    const parsedPrice = parseFloat(price);
    if (price === '' || isNaN(parsedPrice) || parsedPrice <= 0) {
      onSave(null); // Passing null removes the override
      return;
    }
    onSave(parsedPrice);
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
        <h2 className="text-xl font-bold mb-2 text-dp-dark-gray dark:text-dp-light-gray">Anular Precio</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4 truncate">a: {itemName}</p>
        
        <form onSubmit={(e) => { e.preventDefault(); handleSave(); }}>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-2xl font-semibold text-gray-400">$</span>
            <input
              ref={inputRef}
              type="number"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              onKeyDown={handleKeyDown}
              className="w-full text-center text-3xl font-bold py-2 border-2 rounded-md shadow-sm focus:outline-none 
                         bg-white dark:bg-gray-800 text-dp-dark-gray dark:text-dp-light-gray
                         border-gray-300 dark:border-gray-600 
                         focus:ring-dp-blue dark:focus:ring-dp-gold focus:border-transparent pl-10 pr-4"
              placeholder="0.00"
              min="0"
              step="any"
            />
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
              Guardar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default PriceOverrideModal;
