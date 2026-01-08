
import React, { useState, useRef } from 'react';
import { X, Camera, Upload, BrainCircuit, ArrowRight, AlertTriangle, CheckCircle, Loader2, Save, Layers } from 'lucide-react';
import * as aiService from '../services/ai';
import * as dbService from '../services/db';
import type { Product, PriceHistoryEntry } from '../types';

interface SmartScannerModalProps {
  onClose: () => void;
  onProductsUpdated: () => void;
}

interface ProcessedItem extends aiService.ScannedItem {
  matchId?: string; 
  currentStock?: number;
  currentCost?: number;
  currentPrice?: number;
  suggestedPrice?: number;
  inflationRate?: number; 
  isNew?: boolean;
}

const SmartScannerModal: React.FC<SmartScannerModalProps> = ({ onClose, onProductsUpdated }) => {
  const [step, setStep] = useState<'upload' | 'analyzing' | 'review'>('upload');
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [scannedItems, setScannedItems] = useState<ProcessedItem[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState('');
  const [isSaving, setIsSaving] = useState(false);

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
      const rawItems = await aiService.analyzeInvoiceImage(base64Image);
      const dbProducts = dbService.getProducts();
      
      const enrichedItems: ProcessedItem[] = rawItems.map(item => {
        const match = dbProducts.find(p => p.name.toLowerCase().includes(item.productName.toLowerCase()) || item.productName.toLowerCase().includes(p.name.toLowerCase()));
        
        let inflationRate = 0;
        let suggestedPrice = item.costPrice * (1 + TARGET_MARGIN); 
        let currentCost = 0;
        let currentPrice = 0;
        let isNew = true;

        if (match) {
            isNew = false;
            currentCost = match.costPrice || 0;
            currentPrice = match.price;
            if (currentCost > 0) inflationRate = ((item.costPrice - currentCost) / currentCost) * 100;
            if (item.costPrice > currentCost) {
                const currentMargin = (match.price - (match.costPrice || match.price * 0.7)) / match.price;
                const targetMarginToKeep = Math.max(currentMargin, TARGET_MARGIN);
                suggestedPrice = item.costPrice / (1 - targetMarginToKeep);
            } else {
                suggestedPrice = match.price; 
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
      setError(err.message || "Error al procesar. Intente una imagen más clara.");
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
      setIsSaving(true);
      try {
          for (const item of scannedItems) {
              if (item.matchId) {
                  const product = dbService.getProducts().find(p => p.id === item.matchId);
                  if (product) {
                      const newStock = product.stock + item.quantity;
                      const priceHistoryEntry: PriceHistoryEntry = {
                          date: Date.now(),
                          costPrice: item.costPrice,
                          sellingPrice: item.suggestedPrice || product.price
                      };
                      await dbService.updateProduct({
                          ...product,
                          stock: newStock,
                          price: item.suggestedPrice || product.price,
                          costPrice: item.costPrice,
                          priceHistory: [...(product.priceHistory || []), priceHistoryEntry]
                      });
                  }
              } else {
                  await dbService.addProduct({
                      name: item.productName,
                      price: item.suggestedPrice || 0,
                      costPrice: item.costPrice,
                      stock: item.quantity,
                      category: 'General',
                      priceHistory: [{ date: Date.now(), costPrice: item.costPrice, sellingPrice: item.suggestedPrice || 0 }]
                  });
              }
          }
          onProductsUpdated();
          onClose();
      } catch (e) {
          setError("Error al guardar algunos productos.");
      } finally {
          setIsSaving(false);
      }
  };

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex justify-center items-center backdrop-blur-sm p-4" onClick={onClose}>
      <div className="bg-dp-light dark:bg-dp-charcoal rounded-2xl shadow-2xl w-full max-w-5xl flex flex-col max-h-[90vh] overflow-hidden animate-modal-in border border-dp-blue/30 dark:border-dp-gold/30" onClick={e => e.stopPropagation()}>
        
        <div className="bg-dp-soft-gray dark:bg-black/40 p-5 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center flex-shrink-0">
            <div>
                <h2 className="text-xl font-black flex items-center gap-2 text-dp-blue dark:text-dp-gold uppercase tracking-tight">
                    <BrainCircuit size={24} /> 
                    Auditoría de Ingesta IA
                </h2>
                <p className="text-[10px] text-gray-500 font-black uppercase tracking-widest mt-1">Detección de Costos y Fragilidad de Margen</p>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-gray-200 dark:hover:bg-white/10 rounded-full transition-colors"><X size={20}/></button>
        </div>

        <div className="flex-grow overflow-y-auto p-6 custom-scrollbar">
            {step === 'upload' && (
                <div className="h-full flex flex-col items-center justify-center space-y-8 py-10">
                    <div className="text-center space-y-3">
                        <div className="bg-dp-blue/10 dark:bg-dp-gold/10 p-6 rounded-full inline-block animate-pulse">
                            <Layers size={48} className="text-dp-blue dark:text-dp-gold" />
                        </div>
                        <h3 className="text-2xl font-black text-dp-dark-gray dark:text-dp-light-gray uppercase">Ingreso Inteligente</h3>
                        <p className="text-sm text-gray-500 max-w-sm mx-auto font-medium">Capture una foto de su factura de proveedor. La IA detectará productos y calculará el <strong className="text-red-500">impacto inflacionario</strong> en sus márgenes.</p>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-4 w-full max-w-lg">
                        <button onClick={() => fileInputRef.current?.click()} className="flex-1 flex flex-col items-center justify-center p-8 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-2xl hover:border-dp-blue dark:hover:border-dp-gold hover:bg-blue-50 dark:hover:bg-yellow-900/10 transition-all group">
                            <Upload size={32} className="mb-3 text-gray-400 group-hover:text-dp-blue dark:group-hover:text-dp-gold" />
                            <span className="font-black text-xs uppercase tracking-widest">Someter Imagen</span>
                        </button>
                        <input type="file" ref={fileInputRef} accept="image/*" onChange={handleFileChange} className="hidden" />
                    </div>
                    {error && <p className="text-red-500 font-bold bg-red-50 dark:bg-red-900/20 px-4 py-2 rounded-lg border border-red-200 text-sm">{error}</p>}
                </div>
            )}

            {step === 'analyzing' && (
                <div className="h-full flex flex-col items-center justify-center text-center py-20">
                    <div className="relative mb-8">
                        <div className="absolute inset-0 bg-dp-blue dark:bg-dp-gold rounded-full opacity-20 animate-pulse blur-2xl"></div>
                        <BrainCircuit size={80} className="text-dp-blue dark:text-dp-gold relative z-10 animate-bounce" />
                    </div>
                    <h3 className="text-2xl font-black uppercase tracking-tighter text-dp-dark-gray dark:text-white">Procesando Neuronalmente...</h3>
                    <p className="text-gray-500 font-bold animate-pulse uppercase text-[10px] tracking-[0.3em] mt-2">Cruzando datos con inventario local</p>
                </div>
            )}

            {step === 'review' && (
                <div className="animate-modal-in">
                    <div className="flex justify-between items-end mb-6">
                        <div>
                            <h3 className="text-xs font-black text-gray-400 uppercase tracking-[0.2em] mb-1">Revisión de Factura</h3>
                            <p className="text-lg font-bold text-dp-dark-gray dark:text-white">Se detectaron {scannedItems.length} ítems operativos.</p>
                        </div>
                        <button onClick={handleConfirmUpdates} className="px-6 py-3 bg-dp-blue dark:bg-dp-gold text-white dark:text-dp-dark font-black uppercase text-xs tracking-widest rounded-xl hover:brightness-110 shadow-xl flex items-center gap-2">
                             Confirmar Todo e Integrar <ArrowRight size={16}/>
                        </button>
                    </div>

                    <div className="rounded-2xl border border-gray-200 dark:border-gray-800 overflow-hidden shadow-sm">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-gray-50 dark:bg-black/40 text-[10px] font-black text-gray-500 uppercase tracking-widest">
                                    <th className="px-4 py-4">Producto / Identificación</th>
                                    <th className="px-4 py-4 text-center">Qty</th>
                                    <th className="px-4 py-4 text-right">Nuevo Costo</th>
                                    <th className="px-4 py-4 text-center">Variación</th>
                                    <th className="px-4 py-4 text-right">PVP Sugerido</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                                {scannedItems.map((item, idx) => (
                                    <tr key={idx} className="bg-white dark:bg-dp-charcoal/50 hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors">
                                        <td className="px-4 py-3">
                                            <input 
                                                type="text" 
                                                value={item.productName} 
                                                onChange={(e) => handleUpdateItem(idx, 'productName', e.target.value)}
                                                className="bg-transparent border-none focus:ring-0 w-full font-bold text-sm text-dp-dark-gray dark:text-gray-200 p-0"
                                            />
                                            <span className={`text-[9px] font-black uppercase ${item.matchId ? 'text-green-500' : 'text-dp-blue dark:text-dp-gold'}`}>
                                                {item.matchId ? '✓ Vinculado a Inventario' : '+ Nuevo en Catálogo'}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-center">
                                            <input 
                                                type="number" 
                                                value={item.quantity} 
                                                onChange={(e) => handleUpdateItem(idx, 'quantity', parseInt(e.target.value))}
                                                className="w-12 text-center bg-gray-100 dark:bg-black/40 rounded-lg text-xs font-black py-1 border-none focus:ring-1 focus:ring-dp-blue"
                                            />
                                        </td>
                                        <td className="px-4 py-3 text-right font-mono font-black text-sm text-dp-dark-gray dark:text-white">
                                            ${item.costPrice.toLocaleString()}
                                        </td>
                                        <td className="px-4 py-3 text-center">
                                            {item.inflationRate !== undefined && item.inflationRate > 0 ? (
                                                <div className={`inline-flex items-center px-2 py-1 rounded-full text-[10px] font-black ${item.inflationRate > 10 ? 'bg-red-100 text-red-600' : 'bg-orange-100 text-orange-600'}`}>
                                                    <AlertTriangle size={10} className="mr-1"/> +{item.inflationRate.toFixed(1)}%
                                                </div>
                                            ) : (
                                                <span className="text-[10px] font-black text-gray-400 uppercase">Sin Alza</span>
                                            )}
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            <div className="relative inline-block">
                                                <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-xs">$</span>
                                                <input 
                                                    type="number" 
                                                    value={item.suggestedPrice} 
                                                    onChange={(e) => handleUpdateItem(idx, 'suggestedPrice', parseFloat(e.target.value))}
                                                    className={`w-24 pl-5 pr-2 py-1.5 rounded-xl font-black text-right text-sm focus:outline-none ring-2 ${
                                                        item.inflationRate && item.inflationRate > 0 
                                                        ? 'bg-yellow-50 text-yellow-800 ring-yellow-400' 
                                                        : 'bg-gray-50 dark:bg-black/40 dark:text-white ring-transparent focus:ring-dp-blue'
                                                    }`}
                                                />
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>

        {step === 'review' && (
            <div className="p-4 bg-white dark:bg-dp-charcoal border-t border-gray-200 dark:border-gray-700 flex justify-between items-center flex-shrink-0">
                <button onClick={() => setStep('upload')} className="px-4 py-2 text-gray-500 font-black uppercase text-[10px] tracking-widest hover:text-dp-dark-gray dark:hover:text-white transition-colors">Descartar y Reintentar</button>
                <div className="flex gap-4">
                     {isSaving && <Loader2 className="animate-spin text-dp-blue" />}
                     <p className="text-[10px] font-black text-gray-400 uppercase tracking-tighter self-center italic">Dominion AI Engine v2.1.0 • Latencia: 140ms</p>
                </div>
            </div>
        )}
      </div>
    </div>
  );
};

export default SmartScannerModal;
