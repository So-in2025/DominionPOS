
import React, { useState, useEffect } from 'react';
import type { Product } from '../types';

interface EditProductModalProps {
  product: Product;
  onClose: () => void;
  onSave: (product: Product) => void;
}

const EditProductModal: React.FC<EditProductModalProps> = ({ product, onClose, onSave }) => {
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [category, setCategory] = useState('');
  const [stock, setStock] = useState('');
  const [lowStockThreshold, setLowStockThreshold] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (product) {
      setName(product.name);
      setPrice(product.price.toString());
      setCategory(product.category);
      setStock(product.stock.toString());
      setLowStockThreshold(product.lowStockThreshold?.toString() ?? '');
    }
  }, [product]);

  const handleSave = () => {
    const parsedPrice = parseFloat(price);
    const parsedStock = parseInt(stock, 10);
    const parsedThreshold = lowStockThreshold ? parseInt(lowStockThreshold, 10) : undefined;

    if (!name.trim()) {
      setError('El nombre del producto no puede estar vacío.');
      return;
    }
    if (isNaN(parsedPrice) || parsedPrice <= 0) {
      setError('Por favor, ingrese un precio válido y mayor a cero.');
      return;
    }
    if (isNaN(parsedStock) || parsedStock < 0) {
      setError('Por favor, ingrese una cantidad de stock válida (0 o más).');
      return;
    }
    if (parsedThreshold !== undefined && (isNaN(parsedThreshold) || parsedThreshold < 0)) {
        setError('El umbral de stock bajo debe ser un número válido (0 o más).');
        return;
    }
    
    onSave({
      ...product,
      name: name.trim(),
      price: parsedPrice,
      category: category.trim() || 'General',
      stock: parsedStock,
      lowStockThreshold: parsedThreshold,
    });
  };

  return (
    <div 
      className="fixed inset-0 bg-black/60 z-50 flex justify-center items-center"
      aria-modal="true"
      role="dialog"
      onClick={onClose}
    >
      <div className="bg-dp-light dark:bg-dp-charcoal rounded-lg shadow-2xl p-6 w-full max-w-md m-4 animate-modal-in" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-2xl font-bold mb-4 text-dp-dark-gray dark:text-dp-light-gray">Editar Producto</h2>
        
        {error && <p className="text-red-500 text-sm mb-4">{error}</p>}

        <form onSubmit={(e) => { e.preventDefault(); handleSave(); }}>
          <div className="mb-4">
            <label htmlFor="product-name-edit" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nombre del Producto</label>
            <input
              type="text"
              id="product-name-edit"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 
                         bg-white dark:bg-gray-800 text-dp-dark-gray dark:text-dp-light-gray
                         border-gray-300 dark:border-gray-600 
                         focus:ring-dp-blue dark:focus:ring-dp-gold focus:border-transparent"
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label htmlFor="product-price-edit" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Precio</label>
              <input
                type="number"
                id="product-price-edit"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 
                           bg-white dark:bg-gray-800 text-dp-dark-gray dark:text-dp-light-gray
                           border-gray-300 dark:border-gray-600 
                           focus:ring-dp-blue dark:focus:ring-dp-gold focus:border-transparent"
                required
                min="0.01"
                step="0.01"
              />
            </div>
            <div>
              <label htmlFor="product-stock-edit" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Cantidad en Stock</label>
              <input
                type="number"
                id="product-stock-edit"
                value={stock}
                onChange={(e) => setStock(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 
                           bg-white dark:bg-gray-800 text-dp-dark-gray dark:text-dp-light-gray
                           border-gray-300 dark:border-gray-600 
                           focus:ring-dp-blue dark:focus:ring-dp-gold focus:border-transparent"
                required
                min="0"
                step="1"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4 mb-4">
             <div>
                <label htmlFor="product-category-edit" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Categoría</label>
                <input
                  type="text"
                  id="product-category-edit"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 
                             bg-white dark:bg-gray-800 text-dp-dark-gray dark:text-dp-light-gray
                             border-gray-300 dark:border-gray-600 
                             focus:ring-dp-blue dark:focus:ring-dp-gold focus:border-transparent"
                />
              </div>
              <div>
                <label htmlFor="product-low-stock-edit" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Umbral Stock Bajo</label>
                <input
                  type="number"
                  id="product-low-stock-edit"
                  placeholder="Opcional"
                  value={lowStockThreshold}
                  onChange={(e) => setLowStockThreshold(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 
                             bg-white dark:bg-gray-800 text-dp-dark-gray dark:text-dp-light-gray
                             border-gray-300 dark:border-gray-600 
                             focus:ring-dp-blue dark:focus:ring-dp-gold focus:border-transparent"
                  min="0"
                  step="1"
                />
              </div>
          </div>
          <div className="flex justify-end gap-4 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-md text-sm font-semibold transition-colors
                         bg-gray-200 text-gray-800 hover:bg-gray-300
                         dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600
                         focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500
                         dark:focus:ring-offset-dp-charcoal"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-md text-sm font-semibold transition-colors
                         text-dp-light bg-dp-blue hover:bg-blue-700
                         dark:text-dp-dark dark:bg-dp-gold dark:hover:bg-yellow-500
                         focus:outline-none focus:ring-2 focus:ring-offset-2 
                         dark:focus:ring-offset-dp-charcoal focus:ring-dp-blue dark:focus:ring-dp-gold"
            >
              Guardar Cambios
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditProductModal;
