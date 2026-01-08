
import React, { useState, useRef } from 'react';
import { X, Camera, Upload, BrainCircuit, ArrowRight, AlertTriangle, CheckCircle, Loader2, Save } from 'lucide-react';
import * as aiService from '../services/ai';
import * as dbService from '../services/db';
import type { Product, PriceHistoryEntry } from '../types';

interface SmartScannerModalProps {
  onClose: () => void;
  onProductsUpdated: () => void;
}

interface ProcessedItem extends aiService.ScannedItem {
  matchId?: string; // ID of existing product if matched
  currentStock?: number;
  currentCost?: number;
  currentPrice?: number;
  suggestedPrice?: number;
  inflationRate?: number; // Percentage increase in cost
  isNew?: boolean;
}

const SmartScannerModal: React.FC<SmartScannerModalProps> = ({ onClose, onProductsUpdated }) => {
  const [step, setStep] = useState<'upload' | 'analyzing' | 'review'>('upload');
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [scannedItems, setScannedItems] = useState<ProcessedItem[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState('');

  // 30% Margin Strategy by default
  const TARGET_MARGIN = 0.30; 

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        setImagePreview(ev.target?.result as string);
        setStep('analyzing');
        processImage(ev.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const processImage = async (base64Image: string) => {
    try {
      setError('');
      // 1. Get raw data from Gemini
      const rawItems = await aiService.analyzeInvoiceImage(base64Image);
      
      // 2. Intelligence Layer: Match with DB & Calculate Economics
      const dbProducts = dbService.getProducts();
      
      const enrichedItems: ProcessedItem[] = rawItems.map(item => {
        // Fuzzyish matching by name (simple includes for now, could use Levenshtein)
        const match = dbProducts.find(p => p.name.toLowerCase().includes(item.productName.toLowerCase()) || item.productName.toLowerCase().includes(p.name.toLowerCase()));
        
        let inflationRate = 0;
        let suggestedPrice = item.costPrice * (1 + TARGET_MARGIN); // Default markup
        let currentCost = 0;
        let currentPrice = 0;
        let isNew = true;

        if (match) {
            isNew = false;
            currentCost = match.costPrice || 0;
            currentPrice = match.price;
            
            // Calculate Inflation
            if (currentCost > 0) {
                inflationRate = ((item.costPrice - currentCost) / currentCost) * 100;
            }

            // Smart Pricing Logic:
            // If cost increased, maintain the existing margin % or at least target margin
            if (item.costPrice > currentCost) {
                // Calculate current margin
                const currentMargin = (match.price - (match.costPrice || match.price * 0.7)) / match.price;
                const targetMarginToKeep = Math.max(currentMargin, TARGET_MARGIN);
                
                // Suggested Price = New Cost / (1 - Margin)
                suggestedPrice = item.costPrice / (1 - targetMarginToKeep);
            } else {
                suggestedPrice = match.price; // Keep price if cost is same or lower (more profit!)
            }
        }

        return {
            ...item,
            matchId: match?.id,
            currentStock: match?.stock,
            currentCost,
            currentPrice,
            suggestedPrice: parseFloat(suggestedPrice.toFixed(2)),
            inflationRate,
            isNew
        };
      });

      setScannedItems(enrichedItems);
      setStep('review');

    } catch (err: any) {
      console.error(err);
      setError(err.message || "Error al procesar la imagen.");
      setStep('upload');
    }
  };

  const handleUpdateItem = (index: number, field: keyof ProcessedItem, value: any) => {
      setScannedItems(prev => {
          const newItems = [...prev];
          newItems[index] = { ...newItems[index], [field]: value };
          return newItems;
      });
  };

  const handleConfirmUpdates = async () => {
      // Apply updates to DB
      for (const item of scannedItems) {
          if (item.matchId) {
              // Update existing product
              const product = dbService.getProducts().find(p => p.id === item.matchId);
              if (product) {
                  const newStock = product.stock + item.quantity;
                  const priceHistoryEntry: PriceHistoryEntry = {
                      date: Date.now(),
                      costPrice: item.costPrice,
                      sellingPrice: item.suggestedPrice || product.price
                  };
                  
                  const updatedProduct: Product = {
                      ...product,
                      stock: newStock,
                      price: item.suggestedPrice || product.price,
                      costPrice: item.costPrice,
                      priceHistory: [...(product.priceHistory || []), priceHistoryEntry]
                  };
                  await dbService.updateProduct(updatedProduct);
              }
          } else {
              // Create new product
              await dbService.addProduct({
                  name: item.productName,
                  price: item.suggestedPrice || 0,
                  costPrice: item.costPrice,
                  stock: item.quantity,
                  category: 'General', // Default
                  priceHistory: [{ date: Date.now(), costPrice: item.costPrice, sellingPrice: item.suggestedPrice || 0 }]
              });
          }
      }
      onProductsUpdated();
      onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex justify-center items-center backdrop-blur-sm" onClick={onClose}>
      <div className="bg-dp-light dark:bg-dp-charcoal rounded-xl shadow-2xl w-full max-w-4xl m-4 flex flex-col max-h-[90vh] overflow-hidden animate-modal-in border border-dp-blue/30 dark:border-dp-gold/30" onClick={e => e.stopPropagation()}>
        
        {/* Header */}
        <div className="bg-dp-soft-gray dark:bg-black/40 p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
            <h2 className="text-xl font-bold flex items-center gap-2 text-dp-blue dark:text-dp-gold">
                <BrainCircuit size={24} /> 
                Dominion Intelligence <span className="text-xs bg-dp-blue text-white dark:bg-dp-gold dark:text-black px-2 py-0.5 rounded-full uppercase">Beta</span>
            </h2>
            <button onClick={onClose} className="p-2 hover:bg-gray-200 dark:hover:bg-white/10 rounded-full"><X size={20}/></button>
        </div>

        {/* Content */}
        <div className="flex-grow overflow-y-auto p-6">
            {step === 'upload' && (
                <div className="h-full flex flex-col items-center justify-center space-y-6">
                    <div className="text-center space-y-2">
                        <h3 className="text-2xl font-bold text-gray-700 dark:text-gray-200">Escáner de Facturas Inteligente</h3>
                        <p className="text-gray-500 max-w-md mx-auto">
                            Sube una foto de tu factura, ticket o nota manuscrita. La IA detectará productos, actualizará el stock y <strong className="text-dp-blue dark:text-dp-gold">te alertará sobre aumentos de costos</strong> para ajustar tus precios.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full max-w-lg">
                        <button onClick={() => fileInputRef.current?.click()} className="flex flex-col items-center justify-center p-8 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl hover:border-dp-blue dark:hover:border-dp-gold hover:bg-blue-50 dark:hover:bg-yellow-900/10 transition-all group">
                            <Upload size={40} className="mb-2 text-gray-400 group-hover:text-dp-blue dark:group-hover:text-dp-gold" />
                            <span className="font-semibold">Subir Imagen</span>
                            <span className="text-xs text-gray-400">JPG, PNG, WEBP</span>
                        </button>
                        <button onClick={() => fileInputRef.current?.click()} className="flex flex-col items-center justify-center p-8 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl hover:border-dp-blue dark:hover:border-dp-gold hover:bg-blue-50 dark:hover:bg-yellow-900/10 transition-all group">
                            <Camera size={40} className="mb-2 text-gray-400 group-hover:text-dp-blue dark:group-hover:text-dp-gold" />
                            <span className="font-semibold">Tomar Foto</span>
                            <span className="text-xs text-gray-400">Usar cámara del disp.</span>
                        </button>
                        <input type="file" ref={fileInputRef} accept="image/*" onChange={handleFileChange} className="hidden" />
                    </div>
                    {error && <p className="text-red-500 font-semibold bg-red-100 dark:bg-red-900/30 p-2 rounded">{error}</p>}
                </div>
            )}

            {step === 'analyzing' && (
                <div className="h-full flex flex-col items-center justify-center text-center">
                    <div className="relative">
                        <div className="absolute inset-0 bg-dp-blue dark:bg-dp-gold rounded-full opacity-20 animate-pulse-glow blur-xl"></div>
                        <BrainCircuit size={64} className="text-dp-blue dark:text-dp-gold relative z-10 animate-bounce" />
                    </div>
                    <h3 className="mt-6 text-xl font-bold">Analizando Documento...</h3>
                    <p className="text-gray-500">Detectando productos, costos y calculando inflación.</p>
                    {imagePreview && <img src={imagePreview} alt="Preview" className="mt-6 max-h-48 rounded-lg shadow-lg opacity-50" />}
                </div>
            )}

            {step === 'review' && (
                <div>
                    <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                        <CheckCircle size={20} className="text-green-500"/> Resultados del Análisis
                    </h3>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="text-xs text-gray-500 uppercase bg-gray-100 dark:bg-gray-800">
                                <tr>
                                    <th className="px-4 py-3">Producto Detectado</th>
                                    <th className="px-4 py-3 text-center">Cantidad</th>
                                    <th className="px-4 py-3 text-right">Costo Nuevo</th>
                                    <th className="px-4 py-3 text-center">Estado</th>
                                    <th className="px-4 py-3 text-right">Precio Sugerido</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                                {scannedItems.map((item, idx) => (
                                    <tr key={idx} className="bg-white dark:bg-dp-charcoal hover:bg-gray-50 dark:hover:bg-gray-800/50">
                                        <td className="px-4 py-3">
                                            <input 
                                                type="text" 
                                                value={item.productName} 
                                                onChange={(e) => handleUpdateItem(idx, 'productName', e.target.value)}
                                                className="bg-transparent border-b border-transparent focus:border-dp-blue focus:outline-none w-full font-medium"
                                            />
                                            {item.matchId && <p className="text-xs text-green-600 dark:text-green-400">Coincide con inventario</p>}
                                            {!item.matchId && <p className="text-xs text-blue-500">Nuevo Producto</p>}
                                        </td>
                                        <td className="px-4 py-3 text-center">
                                            <input 
                                                type="number" 
                                                value={item.quantity} 
                                                onChange={(e) => handleUpdateItem(idx, 'quantity', parseInt(e.target.value))}
                                                className="w-16 text-center bg-gray-50 dark:bg-gray-700 rounded p-1"
                                            />
                                        </td>
                                        <td className="px-4 py-3 text-right font-mono">
                                            ${item.costPrice.toFixed(2)}
                                            {item.inflationRate !== undefined && item.inflationRate > 0 && (
                                                <div className="flex items-center justify-end text-red-500 text-xs font-bold mt-1">
                                                    <TrendingUp size={12} className="mr-1"/>
                                                    +{item.inflationRate.toFixed(1)}%
                                                </div>
                                            )}
                                        </td>
                                        <td className="px-4 py-3 text-center">
                                            {item.inflationRate && item.inflationRate > 5 ? (
                                                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-bold bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300">
                                                    <AlertTriangle size={12} className="mr-1"/> Inflación
                                                </span>
                                            ) : item.isNew ? (
                                                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-800">Nuevo</span>
                                            ) : (
                                                <span className="text-gray-400">-</span>
                                            )}
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                {item.inflationRate && item.inflationRate > 0 && (
                                                    <span className="text-xs text-gray-400 line-through">${item.currentPrice?.toFixed(2)}</span>
                                                )}
                                                <div className="relative">
                                                    <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                                                    <input 
                                                        type="number" 
                                                        value={item.suggestedPrice} 
                                                        onChange={(e) => handleUpdateItem(idx, 'suggestedPrice', parseFloat(e.target.value))}
                                                        className={`w-24 pl-5 py-1 rounded font-bold text-right focus:outline-none focus:ring-2 ${
                                                            item.inflationRate && item.inflationRate > 0 
                                                            ? 'bg-yellow-50 text-yellow-800 border border-yellow-300 focus:ring-yellow-500' 
                                                            : 'bg-gray-50 dark:bg-gray-700 dark:text-white border border-gray-300 dark:border-gray-600'
                                                        }`}
                                                    />
                                                </div>
                                            </div>
                                            {item.inflationRate && item.inflationRate > 0 && (
                                                <p className="text-[10px] text-yellow-600 dark:text-yellow-400 mt-1">Sugerido para mantener margen</p>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-gray-50 dark:bg-black/20 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-3">
            {step === 'review' && (
                <>
                    <button onClick={() => setStep('upload')} className="px-4 py-2 text-gray-600 dark:text-gray-300 font-semibold hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg">Cancelar</button>
                    <button onClick={handleConfirmUpdates} className="flex items-center gap-2 px-6 py-2 bg-dp-blue dark:bg-dp-gold text-white dark:text-dp-dark font-bold rounded-lg hover:brightness-110 shadow-lg">
                        <Save size={18}/> Confirmar y Actualizar Precios
                    </button>
                </>
            )}
        </div>
      </div>
    </div>
  );
};

// Icon helper
import { TrendingUp } from 'lucide-react';

export default SmartScannerModal;
