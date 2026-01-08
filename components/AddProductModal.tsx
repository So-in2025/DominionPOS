
import React, { useState } from 'react';
import type { Product } from '../types';
import { BrainCircuit, Mic, Lock, Crown, Zap, CheckCircle } from 'lucide-react';
import * as cloudService from '../services/cloud';
import * as settingsService from '../services/settings';

interface AddProductModalProps {
  onClose: () => void;
  onSave: (product: Omit<Product, 'id'>) => void;
  onOpenSmartScanner: () => void;
  onOpenVoiceIngest: () => void;
  onRequestUpgrade: () => void;
  existingCategories?: string[];
}

const AddProductModal: React.FC<AddProductModalProps> = ({ onClose, onSave, onOpenSmartScanner, onOpenVoiceIngest, onRequestUpgrade, existingCategories = [] }) => {
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [category, setCategory] = useState('');
  const [stock, setStock] = useState('');
  const [lowStockThreshold, setLowStockThreshold] = useState('');
  const [error, setError] = useState('');

  const hasAiAccess = cloudService.hasAccess('ai_scanner');
  
  // Check free quota availability (Peek only, do not consume)
  const hasFreeImage = settingsService.checkFreeQuota('image');
  const hasFreeVoice = settingsService.checkFreeQuota('voice');

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
    
    onSave({
      name: name.trim(),
      price: parsedPrice,
      category: category.trim() || 'General', 
      stock: parsedStock,
      lowStockThreshold: parsedThreshold,
    });
  };

  const handleSmartScan = () => {
      // Logic: If Pro OR has free quota left, allow open. 
      // Consumption happens inside the modal ON SUCCESS.
      if (hasAiAccess || hasFreeImage) {
          onOpenSmartScanner();
      } else {
          onRequestUpgrade();
      }
  };

  const handleVoiceIngest = () => {
      // Logic: If Pro OR has free quota left, allow open. 
      // Consumption happens inside the modal ON SUCCESS.
      if (hasAiAccess || hasFreeVoice) {
          onOpenVoiceIngest();
      } else {
          onRequestUpgrade();
      }
  };

  return (
    <div 
      className="fixed inset-0 bg-black/60 z-[60] flex justify-center items-center"
      aria-modal="true"
      role="dialog"
      onClick={onClose}
    >
      <div className="bg-dp-light dark:bg-dp-charcoal rounded-lg shadow-2xl p-6 w-full max-w-md m-4 animate-modal-in max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-2xl font-bold mb-4 text-dp-dark-gray dark:text-dp-light-gray">Añadir Nuevo Producto</h2>
        
        {/* AI Methods Section */}
        <div className={`mb-6 p-4 rounded-lg border ${hasAiAccess ? 'bg-dp-soft-gray dark:bg-black/20 border-gray-200 dark:border-gray-700' : 'bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-900 border-yellow-500/30'}`}>
            <h3 className="text-sm font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3 flex items-center justify-between">
                Ingreso Inteligente (IA)
                {!hasAiAccess && <span className="text-[10px] bg-yellow-500 text-black px-2 py-0.5 rounded-full font-extrabold flex items-center gap-1"><Crown size={10}/> PRO</span>}
            </h3>
            <div className="grid grid-cols-2 gap-3">
                <button 
                    onClick={handleSmartScan}
                    className={`relative flex flex-col items-center justify-center p-3 rounded-lg border transition-all group w-full h-full overflow-hidden ${
                        hasAiAccess || hasFreeImage
                        ? 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 hover:border-dp-blue dark:hover:border-dp-gold hover:shadow-md' 
                        : 'bg-white/50 dark:bg-black/40 border-gray-300 dark:border-gray-700 hover:border-yellow-500 dark:hover:border-yellow-500'
                    }`}
                >
                    {!hasAiAccess && !hasFreeImage && (
                        <div className="absolute inset-0 bg-gray-200/20 dark:bg-black/20 backdrop-blur-[1px] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-10">
                            <span className="bg-yellow-500 text-black text-xs font-bold px-2 py-1 rounded shadow-lg flex items-center gap-1">
                                <Lock size={12}/> Desbloquear
                            </span>
                        </div>
                    )}
                    <div className={`p-2 rounded-full mb-2 transition-transform group-hover:scale-110 ${
                        hasAiAccess || hasFreeImage ? 'bg-blue-100 dark:bg-blue-900/30 text-dp-blue dark:text-blue-300' : 'bg-gray-200 dark:bg-gray-700 text-gray-500'
                    }`}>
                        <BrainCircuit size={24} />
                    </div>
                    <span className={`text-sm font-semibold ${hasAiAccess || hasFreeImage ? 'text-gray-700 dark:text-gray-200' : 'text-gray-500'}`}>
                        Escáner Foto
                    </span>
                    {!hasAiAccess && hasFreeImage && (
                        <div className="absolute top-2 right-2 text-green-600 bg-green-100 dark:bg-green-900 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase">
                            1 Gratis
                        </div>
                    )}
                    {!hasAiAccess && !hasFreeImage && (
                        <div className="absolute top-2 right-2 text-gray-400 dark:text-gray-600">
                            <Lock size={14} />
                        </div>
                    )}
                </button>
                
                <button 
                    onClick={handleVoiceIngest}
                    className={`relative flex flex-col items-center justify-center p-3 rounded-lg border transition-all group w-full h-full overflow-hidden ${
                        hasAiAccess || hasFreeVoice
                        ? 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 hover:border-dp-blue dark:hover:border-dp-gold hover:shadow-md' 
                        : 'bg-white/50 dark:bg-black/40 border-gray-300 dark:border-gray-700 hover:border-yellow-500 dark:hover:border-yellow-500'
                    }`}
                >
                    {!hasAiAccess && !hasFreeVoice && (
                        <div className="absolute inset-0 bg-gray-200/20 dark:bg-black/20 backdrop-blur-[1px] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-10">
                            <span className="bg-yellow-500 text-black text-xs font-bold px-2 py-1 rounded shadow-lg flex items-center gap-1">
                                <Lock size={12}/> Desbloquear
                            </span>
                        </div>
                    )}
                    <div className={`p-2 rounded-full mb-2 transition-transform group-hover:scale-110 ${
                        hasAiAccess || hasFreeVoice ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-300' : 'bg-gray-200 dark:bg-gray-700 text-gray-500'
                    }`}>
                        <Mic size={24} />
                    </div>
                    <span className={`text-sm font-semibold ${hasAiAccess || hasFreeVoice ? 'text-gray-700 dark:text-gray-200' : 'text-gray-500'}`}>
                        Dictado Voz
                    </span>
                    {!hasAiAccess && hasFreeVoice && (
                        <div className="absolute top-2 right-2 text-green-600 bg-green-100 dark:bg-green-900 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase">
                            1 Gratis
                        </div>
                    )}
                    {!hasAiAccess && !hasFreeVoice && (
                        <div className="absolute top-2 right-2 text-gray-400 dark:text-gray-600">
                            <Lock size={14} />
                        </div>
                    )}
                </button>
            </div>
            
            {!hasAiAccess && (
                <div className="mt-3 text-center">
                    <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center justify-center gap-1">
                        <Zap size={12} className="text-yellow-500"/>
                        Prueba la IA gratis una vez al mes.
                    </p>
                </div>
            )}
        </div>

        <div className="border-t border-gray-200 dark:border-gray-700 my-4 pt-4 relative">
             <span className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-dp-light dark:bg-dp-charcoal px-2 text-xs font-semibold text-gray-400">O MANUALMENTE</span>
        </div>

        {error && <p className="text-red-500 text-sm mb-4">{error}</p>}

        <form onSubmit={(e) => { e.preventDefault(); handleSave(); }}>
          <div className="mb-4">
            <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Nombre</label>
            <input 
              type="text" 
              value={name} 
              onChange={(e) => setName(e.target.value)} 
              className="w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-white border-gray-300 dark:border-gray-600 focus:ring-dp-blue dark:focus:ring-dp-gold" 
              required 
            />
          </div>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
                <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Precio</label>
                <input 
                    type="number" 
                    value={price} 
                    onChange={(e) => setPrice(e.target.value)} 
                    className="w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-white border-gray-300 dark:border-gray-600 focus:ring-dp-blue dark:focus:ring-dp-gold" 
                    required min="0.01" step="0.01" 
                />
            </div>
            <div>
                <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Stock</label>
                <input 
                    type="number" 
                    value={stock} 
                    onChange={(e) => setStock(e.target.value)} 
                    className="w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-white border-gray-300 dark:border-gray-600 focus:ring-dp-blue dark:focus:ring-dp-gold" 
                    required min="0" 
                />
            </div>
          </div>
           <div className="grid grid-cols-2 gap-4 mb-4">
             <div>
                <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Categoría</label>
                <input 
                    type="text" 
                    list="category-list"
                    value={category} 
                    onChange={(e) => setCategory(e.target.value)} 
                    className="w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-white border-gray-300 dark:border-gray-600 focus:ring-dp-blue dark:focus:ring-dp-gold" 
                />
                <datalist id="category-list">
                    {existingCategories.map(cat => <option key={cat} value={cat} />)}
                </datalist>
             </div>
              <div>
                <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Stock Bajo</label>
                <input 
                    type="number" 
                    placeholder="Opcional" 
                    value={lowStockThreshold} 
                    onChange={(e) => setLowStockThreshold(e.target.value)} 
                    className="w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-white border-gray-300 dark:border-gray-600 focus:ring-dp-blue dark:focus:ring-dp-gold" 
                    min="0" 
                />
              </div>
          </div>
          <div className="flex justify-end gap-4 mt-6">
            <button type="button" onClick={onClose} className="px-4 py-2 rounded-md bg-gray-200 text-gray-800 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600 transition-colors">Cancelar</button>
            <button type="submit" className="px-4 py-2 rounded-md bg-dp-blue text-white hover:bg-blue-700 dark:bg-dp-gold dark:text-black dark:hover:bg-yellow-500 transition-colors font-bold shadow-md">Guardar</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddProductModal;
