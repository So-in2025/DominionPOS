
import React, { useState, useMemo, useRef, useEffect } from 'react';
import type { Product, User } from '../types';
import { Search, Edit3, CheckCircle, X } from 'lucide-react';
import * as soundService from '../services/sound';

interface InventoryProps {
  products: Product[];
  categories: string[];
  currentUser: User;
  onUpdateStock: (productId: string, newStock: number) => void;
  onUpdateProduct: (product: Product) => void;
}

const Inventory: React.FC<InventoryProps> = ({ products, categories, currentUser, onUpdateStock, onUpdateProduct }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  
  // Inline Editing States
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editField, setEditField] = useState<'name' | 'stock' | 'category' | null>(null);
  const [editValue, setEditValue] = useState<string | number>('');
  
  const editInputRef = useRef<HTMLInputElement>(null);
  const editSelectRef = useRef<HTMLSelectElement>(null);

  const isAdmin = currentUser.role === 'admin';

  useEffect(() => {
    if (editingId && editInputRef.current) {
        editInputRef.current.focus();
        if (editField !== 'category') editInputRef.current.select();
    }
    if (editingId && editSelectRef.current && editField === 'category') {
        editSelectRef.current.focus();
    }
  }, [editingId, editField]);

  const filteredProducts = useMemo(() => {
    return products
      .filter(product => {
        const categoryMatch = selectedCategory === 'all' || product.category === selectedCategory;
        const searchMatch = product.name.toLowerCase().includes(searchTerm.toLowerCase());
        return categoryMatch && searchMatch;
      })
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [products, searchTerm, selectedCategory]);

  const handleEditStart = (product: Product, field: 'name' | 'stock' | 'category') => {
    // SECURITY UPDATE: Only Admin can edit inventory directly.
    if (!isAdmin) {
        soundService.playSound('error');
        return;
    }

    setEditingId(product.id);
    setEditField(field);
    setEditValue(field === 'name' ? product.name : field === 'category' ? product.category : product.stock);
    soundService.playSound('click');
  };

  const handleEditCancel = () => {
    setEditingId(null);
    setEditField(null);
    setEditValue('');
  };

  const handleEditSave = () => {
    if (!editingId || !editField) return;
    
    const product = products.find(p => p.id === editingId);
    if (!product) return;

    let updated = false;

    if (editField === 'stock') {
        const newStock = parseInt(editValue.toString(), 10);
        if (!isNaN(newStock) && newStock >= 0 && newStock !== product.stock) {
            onUpdateStock(editingId, newStock);
            updated = true;
        }
    } else if (editField === 'name') {
        const newName = editValue.toString().trim();
        if (newName && newName !== product.name) {
            onUpdateProduct({ ...product, name: newName });
            updated = true;
        }
    } else if (editField === 'category') {
        const newCat = editValue.toString().trim();
        if (newCat && newCat !== product.category) {
            onUpdateProduct({ ...product, category: newCat });
            updated = true;
        }
    }

    if (updated) soundService.playSound('beep');
    handleEditCancel();
  };
  
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement | HTMLSelectElement>) => {
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
              {['all', ...categories].map(category => (
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
                <thead className="sticky top-0 bg-dp-soft-gray dark:bg-black/50 backdrop-blur-sm z-10">
                    <tr>
                        <th className="p-3 font-semibold text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider">Producto</th>
                        <th className="p-3 font-semibold text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider">Categoría</th>
                        <th className="p-3 font-semibold text-xs text-right text-gray-500 dark:text-gray-400 uppercase tracking-wider">Stock</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                    {filteredProducts.map(product => (
                        <tr key={product.id} className={`transition-colors hover:bg-black/5 dark:hover:bg-white/5 ${getStockRowColor(product.stock, product.lowStockThreshold)}`}>
                            {/* NAME COLUMN */}
                            <td className="p-3 font-medium text-dp-dark-gray dark:text-dp-light-gray relative group">
                                {editingId === product.id && editField === 'name' ? (
                                    <div className="flex items-center gap-2">
                                        <input
                                            ref={editInputRef}
                                            type="text"
                                            value={editValue}
                                            onChange={(e) => setEditValue(e.target.value)}
                                            onBlur={handleEditSave}
                                            onKeyDown={handleKeyDown}
                                            className="w-full px-2 py-1 rounded bg-white dark:bg-gray-800 border-dp-blue dark:border-dp-gold border-2 focus:outline-none text-sm"
                                        />
                                        <button onMouseDown={handleEditSave} className="text-green-500"><CheckCircle size={16}/></button>
                                    </div>
                                ) : (
                                    <div 
                                        className={`flex items-center gap-2 ${isAdmin ? 'cursor-pointer' : ''}`}
                                        onClick={() => handleEditStart(product, 'name')}
                                    >
                                        <span>{product.name}</span>
                                        {isAdmin && <Edit3 size={12} className="opacity-0 group-hover:opacity-50 text-gray-400" />}
                                    </div>
                                )}
                            </td>

                            {/* CATEGORY COLUMN */}
                            <td className="p-3 text-gray-500 dark:text-gray-400 text-sm group">
                                {editingId === product.id && editField === 'category' ? (
                                    <select
                                        ref={editSelectRef}
                                        value={editValue}
                                        onChange={(e) => setEditValue(e.target.value)}
                                        onBlur={handleEditSave}
                                        onKeyDown={handleKeyDown}
                                        className="w-full px-2 py-1 rounded bg-white dark:bg-gray-800 border-dp-blue dark:border-dp-gold border-2 focus:outline-none text-sm appearance-none"
                                    >
                                        {categories.map(cat => (
                                            <option key={cat} value={cat}>{cat}</option>
                                        ))}
                                    </select>
                                ) : (
                                    <div 
                                        className={`flex items-center gap-2 ${isAdmin ? 'cursor-pointer' : ''}`}
                                        onClick={() => handleEditStart(product, 'category')}
                                    >
                                        <span>{product.category || 'N/A'}</span>
                                        {isAdmin && <Edit3 size={12} className="opacity-0 group-hover:opacity-50 text-gray-400" />}
                                    </div>
                                )}
                            </td>

                            {/* STOCK COLUMN */}
                            <td 
                                className="p-3 text-right font-semibold cursor-pointer text-dp-dark-gray dark:text-dp-light-gray"
                                onClick={() => handleEditStart(product, 'stock')}
                            >
                                {editingId === product.id && editField === 'stock' ? (
                                    <input
                                        ref={editInputRef}
                                        type="number"
                                        value={editValue}
                                        onChange={(e) => setEditValue(e.target.value)}
                                        onBlur={handleEditSave}
                                        onKeyDown={handleKeyDown}
                                        className="w-20 text-right px-2 py-1 rounded bg-white dark:bg-gray-800 border-dp-blue dark:border-dp-gold border-2 focus:outline-none text-sm"
                                    />
                                ) : (
                                    <span className={isAdmin ? "hover:underline" : ""}>{product.stock}</span>
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
