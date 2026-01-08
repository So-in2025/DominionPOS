import React, { useState, useRef, useEffect } from 'react';
import { Tag } from 'lucide-react';

interface CustomItemModalProps {
  onClose: () => void;
  onSave: (item: { name: string, price: number }) => void;
}

const CustomItemModal: React.FC<CustomItemModalProps> = ({ onClose, onSave }) => {
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [error, setError] = useState('');
  const nameInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    nameInputRef.current?.focus();
  }, []);

  const handleSave = () => {
    const parsedPrice = parseFloat(price);
    if (!name.trim()) {
      setError('El nombre del artículo es obligatorio.');
      return;
    }
    if (isNaN(parsedPrice) || parsedPrice <= 0) {
      setError('El precio debe ser un número positivo.');
      return;
    }
    onSave({ name: name.trim(), price: parsedPrice });
  };

  return (
    <div 
      className="fixed inset-0 bg-black/60 z-[60] flex justify-center items-center"
      aria-modal="true"
      role="dialog"
      onClick={onClose}
    >
      <div className="bg-dp-light dark:bg-dp-charcoal rounded-lg shadow-2xl p-6 w-full max-w-sm m-4 animate-modal-in" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-xl font-bold mb-4 text-dp-dark-gray dark:text-dp-light-gray flex items-center gap-2">
            <Tag />Añadir Artículo Rápido
        </h2>
        {error && <p className="text-red-500 text-sm mb-4">{error}</p>}
        <form onSubmit={(e) => { e.preventDefault(); handleSave(); }}>
          <div className="mb-4">
            <label htmlFor="item-name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nombre del Artículo</label>
            <input
              ref={nameInputRef}
              type="text"
              id="item-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 
                         bg-white dark:bg-gray-800 text-dp-dark-gray dark:text-dp-light-gray
                         border-gray-300 dark:border-gray-600 
                         focus:ring-dp-blue dark:focus:ring-dp-gold focus:border-transparent"
              required
            />
          </div>
          <div className="mb-4">
            <label htmlFor="item-price" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Precio</label>
            <input
              type="number"
              id="item-price"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
               className="w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 
                         bg-white dark:bg-gray-800 text-dp-dark-gray dark:text-dp-light-gray
                         border-gray-300 dark:border-gray-600 
                         focus:ring-dp-blue dark:focus:ring-dp-gold focus:border-transparent"
              required
              min="0.01"
              step="0.01"
              placeholder="0.00"
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
              Añadir a la Venta
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CustomItemModal;