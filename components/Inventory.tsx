
import React, { useState, useMemo, useRef, useEffect } from 'react';
import type { Product } from '../types';
import { Search } from 'lucide-react';

interface InventoryProps {
  products: Product[];
  onUpdateStock: (productId: string, newStock: number) => void;
}

const Inventory: React.FC<InventoryProps> = ({ products, onUpdateStock }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const editInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editingProductId && editInputRef.current) {
        editInputRef.current.focus();
        editInputRef.current.select();
    }
  }, [editingProductId]);

  const categories = useMemo(() => {
    const allCategories = products.map(p => p.category).filter(Boolean);
    return ['all', ...Array.from(new Set(allCategories))];
  }, [products]);

  const filteredProducts = useMemo(() => {
    return products
      .filter(product => {
        const categoryMatch = selectedCategory === 'all' || product.category === selectedCategory;
        const searchMatch = product.name.toLowerCase().includes(searchTerm.toLowerCase());
        return categoryMatch && searchMatch;
      })
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [products, searchTerm, selectedCategory]);

  const handleEditStart = (product: Product) => {
    setEditingProductId(product.id);
    setEditValue(product.stock.toString());
  };

  const handleEditCancel = () => {
    setEditingProductId(null);
    setEditValue('');
  };

  const handleEditSave = () => {
    if (!editingProductId) return;
    const newStock = parseInt(editValue, 10);
    if (!isNaN(newStock) && newStock >= 0) {
      onUpdateStock(editingProductId, newStock);
    }
    handleEditCancel();
  };
  
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleEditSave();
    } else if (e.key === 'Escape') {
      handleEditCancel();
    }
  };
  
  const getStockRowColor = (stock: number, threshold?: number) => {
    if (stock <= 0) return 'bg-red-500/10 dark:bg-red-900/20';
    if (threshold !== undefined && stock <= threshold) return 'bg-yellow-500/10 dark:bg-yellow-900/20';
    return 'bg-dp-light dark:bg-dp-charcoal';
  };

  return (
    <div className="flex flex-col h-full">
        <div className="mb-4 flex-shrink-0">
            <div className="relative mb-3">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
              <input 
                type="text" 
                placeholder="Buscar por nombre de producto..." 
                value={searchTerm} 
                onChange={(e) => setSearchTerm(e.target.value)} 
                className="w-full pl-10 pr-4 py-2 rounded-lg border focus:ring-2 bg-dp-light dark:bg-dp-charcoal border-gray-300 dark:border-gray-600 focus:ring-dp-blue dark:focus:ring-dp-gold focus:border-transparent"
              />
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {categories.map(category => (
                <button 
                  key={category} 
                  onClick={() => setSelectedCategory(category)} 
                  className={`px-3 py-1 text-sm font-semibold rounded-full transition-colors ${selectedCategory === category ? 'bg-dp-blue text-dp-light dark:bg-dp-gold dark:text-dp-dark' : 'bg-dp-soft-gray text-dp-dark-gray hover:bg-gray-300 dark:bg-dp-charcoal dark:text-dp-light-gray dark:hover:bg-gray-700'}`}
                >
                  {category === 'all' ? 'Todos' : category}
                </button>
              ))}
            </div>
        </div>
        <div className="flex-grow overflow-y-auto rounded-lg border border-gray-200 dark:border-gray-700">
            <table className="w-full text-left">
                <thead className="sticky top-0 bg-dp-soft-gray dark:bg-black/50 backdrop-blur-sm">
                    <tr>
                        <th className="p-3 font-semibold text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider">Producto</th>
                        <th className="p-3 font-semibold text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider">Categoría</th>
                        <th className="p-3 font-semibold text-xs text-right text-gray-500 dark:text-gray-400 uppercase tracking-wider">Stock Actual</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                    {filteredProducts.map(product => (
                        <tr key={product.id} className={`transition-colors ${getStockRowColor(product.stock, product.lowStockThreshold)}`}>
                            <td className="p-3 font-medium text-dp-dark-gray dark:text-dp-light-gray">{product.name}</td>
                            <td className="p-3 text-gray-500 dark:text-gray-400 text-sm">{product.category || 'N/A'}</td>
                            <td 
                                className="p-3 text-right font-semibold cursor-pointer text-dp-dark-gray dark:text-dp-light-gray"
                                onClick={() => editingProductId !== product.id && handleEditStart(product)}
                            >
                                {editingProductId === product.id ? (
                                    <input
                                        ref={editInputRef}
                                        type="number"
                                        value={editValue}
                                        onChange={(e) => setEditValue(e.target.value)}
                                        onBlur={handleEditSave}
                                        onKeyDown={handleKeyDown}
                                        className="w-24 text-right px-2 py-1 rounded bg-white dark:bg-gray-800 border-dp-blue dark:border-dp-gold border-2 focus:outline-none"
                                    />
                                ) : (
                                    <span>{product.stock}</span>
                                )}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
            {filteredProducts.length === 0 && (
                 <div className="flex flex-col items-center justify-center h-full text-center py-10 text-gray-500 dark:text-gray-400">
                    <p className="font-semibold text-lg">No se encontraron productos</p>
                    <p className="text-sm">Intente ajustar los filtros o el término de búsqueda.</p>
                </div>
            )}
        </div>
    </div>
  );
};

export default Inventory;
