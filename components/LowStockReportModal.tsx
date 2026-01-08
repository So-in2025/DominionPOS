
import React, { useState, useEffect, useMemo } from 'react';
import type { Product } from '../types';
import * as dbService from '../services/db';
import { X, AlertTriangle, FilePlus } from 'lucide-react';

interface LowStockReportModalProps {
  onClose: () => void;
  onGeneratePO: (products: Product[]) => void;
}

const LowStockReportModal: React.FC<LowStockReportModalProps> = ({ onClose, onGeneratePO }) => {
  const [lowStockProducts, setLowStockProducts] = useState<Product[]>([]);

  useEffect(() => {
    const allProducts = dbService.getProducts();
    const filtered = allProducts.filter(p => 
        p.lowStockThreshold !== undefined && p.stock <= p.lowStockThreshold
    ).sort((a,b) => (a.stock / (a.lowStockThreshold || 1)) - (b.stock / (b.lowStockThreshold || 1))); // Sort by severity
    setLowStockProducts(filtered);
  }, []);

  const getStockRowColor = (stock: number, threshold?: number) => {
    if (stock <= 0) return 'bg-red-500/20 dark:bg-red-900/30';
    if (threshold && stock <= threshold) return 'bg-yellow-500/20 dark:bg-yellow-900/30';
    return '';
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
            <h2 className="text-2xl font-bold text-dp-dark-gray dark:text-dp-light-gray flex items-center gap-2">
                <AlertTriangle className="text-yellow-500" />
                Informe de Stock Bajo
            </h2>
            <button
                onClick={onClose}
                className="p-2 rounded-full text-dp-dark-gray dark:text-dp-light-gray hover:bg-dp-soft-gray dark:hover:bg-gray-700"
                aria-label="Cerrar"
            >
                <X size={24} />
            </button>
        </div>
        
        <div className="flex-grow overflow-y-auto pr-2 border-t border-b dark:border-gray-700">
          {lowStockProducts.length === 0 ? (
            <p className="text-center text-gray-500 dark:text-gray-400 py-16">No hay productos con niveles de stock bajos.</p>
          ) : (
            <table className="w-full text-left mt-2">
                <thead className="sticky top-0 bg-dp-light dark:bg-dp-charcoal">
                    <tr>
                        <th className="p-3 font-semibold text-sm">Producto</th>
                        <th className="p-3 font-semibold text-sm text-center">Stock Actual</th>
                        <th className="p-3 font-semibold text-sm text-center">Umbral</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                    {lowStockProducts.map(product => (
                        <tr key={product.id} className={`transition-colors ${getStockRowColor(product.stock, product.lowStockThreshold)}`}>
                            <td className="p-3 font-medium">{product.name}</td>
                            <td className="p-3 text-center font-bold">{product.stock}</td>
                            <td className="p-3 text-center text-gray-500 dark:text-gray-400">{product.lowStockThreshold}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
          )}
        </div>

        <div className="mt-6 flex justify-end gap-4">
             <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-md text-sm font-semibold transition-colors
                         bg-gray-200 text-gray-800 hover:bg-gray-300
                         dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600
                         focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500
                         dark:focus:ring-offset-dp-charcoal"
            >
              Cerrar
            </button>
            {lowStockProducts.length > 0 && (
                 <button
                  type="button"
                  onClick={() => onGeneratePO(lowStockProducts)}
                  className="flex items-center gap-2 px-4 py-2 rounded-md text-sm font-semibold transition-colors
                             text-dp-light bg-dp-blue hover:bg-blue-700
                             dark:text-dp-dark dark:bg-dp-gold dark:hover:bg-yellow-500
                             focus:outline-none focus:ring-2 focus:ring-offset-2 
                             dark:focus:ring-offset-dp-charcoal focus:ring-dp-blue dark:focus:ring-dp-gold"
                >
                  <FilePlus size={18} />
                  Generar Orden de Compra
                </button>
            )}
        </div>
      </div>
    </div>
  );
};

export default LowStockReportModal;
