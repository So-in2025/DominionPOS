
import React, { useState, useRef, useEffect } from 'react';
import { X, Mic, Square, Loader2, Save, RefreshCw, CheckCircle, Info, TrendingUp, AlertTriangle, Volume2, VolumeX } from 'lucide-react';
import * as aiService from '../services/ai';
import * as dbService from '../services/db';
import * as soundService from '../services/sound';
import * as ttsService from '../services/tts';
import type { Product, PriceHistoryEntry } from '../types';

interface VoiceIngestModalProps {
  onClose: () => void;
  onProductsUpdated: () => void;
}

interface ProcessedItem extends aiService.ScannedItem {
  matchId?: string;
  isNew?: boolean;
  currentCost?: number;
  inflationRate?: number;
  suggestedPrice?: number;
}

const VoiceIngestModal: React.FC<VoiceIngestModalProps> = ({ onClose, onProductsUpdated }) => {
  const [step, setStep] = useState<'instructions' | 'recording' | 'processing' | 'review'>('instructions');
  const [timeLeft, setTimeLeft] = useState(60);
  const [isRecording, setIsRecording] = useState(false);
  const [processedItems, setProcessedItems] = useState<ProcessedItem[]>([]);
  const [error, setError] = useState('');
  const [isMuted, setIsMuted] = useState(false);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);

  // 30% Margin Strategy by default
  const TARGET_MARGIN = 0.30;

  // Initial TTS Greeting
  useEffect(() => {
      try {
          if (!isMuted) {
              soundService.playSound('pop');
              ttsService.speak("Modo de voz activado. Menciona el costo de los productos para detectar inflación automáticamente.");
          }
      } catch (e) {
          console.warn("Error playing initial sound/tts", e);
      }
      return () => {
          try { ttsService.stopSpeaking(); } catch(e) {}
      };
  }, []); // Only run once on mount

  const toggleMute = () => {
      const newMuteState = !isMuted;
      setIsMuted(newMuteState);
      if(!newMuteState) ttsService.stopSpeaking();
  };

  // --- Recording Logic ---

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        processAudio(audioBlob);
        stream.getTracks().forEach(track => track.stop()); // Stop mic
      };

      mediaRecorder.start();
      setIsRecording(true);
      setStep('recording');
      
      if (!isMuted) {
          soundService.playSound('click');
          ttsService.speak("Escuchando. Dicta tus productos ahora.", true);
      }
      
      // Timer Logic
      setTimeLeft(60);
      timerRef.current = window.setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            stopRecording();
            return 0;
          }
          if (prev % 10 === 0 && prev < 60) {
              // Subtle tick every 10s to indicate life
              if(!isMuted) soundService.playSound('processing'); 
          }
          return prev - 1;
        });
      }, 1000);

    } catch (err) {
      console.error(err);
      setError("No se pudo acceder al micrófono.");
      if(!isMuted) soundService.playSound('error');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerRef.current) clearInterval(timerRef.current);
      if (!isMuted) soundService.playSound('pop');
    }
  };

  // --- Processing Logic ---

  const processAudio = (blob: Blob) => {
    setStep('processing');
    if (!isMuted) ttsService.speak("Procesando tu inventario. Un momento.", true);
    
    const reader = new FileReader();
    reader.readAsDataURL(blob);
    reader.onloadend = async () => {
      const base64Audio = reader.result as string;
      try {
        const rawItems = await aiService.processAudioInventory(base64Audio);
        
        // Match with DB & Calculate Economics
        const dbProducts = dbService.getProducts();
        let inflationCount = 0;
        
        const enrichedItems: ProcessedItem[] = rawItems.map(item => {
            const match = dbProducts.find(p => p.name.toLowerCase().includes(item.productName.toLowerCase()) || item.productName.toLowerCase().includes(p.name.toLowerCase()));
            
            let inflationRate = 0;
            let suggestedPrice = item.sellingPrice > 0 ? item.sellingPrice : 0;
            let currentCost = 0;
            
            if (!match && suggestedPrice === 0 && item.costPrice > 0) {
                suggestedPrice = item.costPrice * (1 + TARGET_MARGIN);
            }

            if (match) {
                currentCost = match.costPrice || 0;
                if (suggestedPrice === 0) suggestedPrice = match.price;

                if (item.costPrice > 0 && currentCost > 0) {
                    inflationRate = ((item.costPrice - currentCost) / currentCost) * 100;
                }

                if (item.costPrice > currentCost && item.costPrice > 0) {
                     const currentMargin = (match.price - (match.costPrice || match.price * 0.7)) / match.price;
                     const targetMarginToKeep = Math.max(currentMargin, TARGET_MARGIN);
                     if (item.sellingPrice === 0) {
                        suggestedPrice = item.costPrice / (1 - targetMarginToKeep);
                     }
                     if (inflationRate > 5) inflationCount++; // Flag significant inflation
                }
            }

            return {
                ...item,
                matchId: match?.id,
                isNew: !match,
                currentCost,
                inflationRate,
                sellingPrice: parseFloat(suggestedPrice.toFixed(2)),
                suggestedPrice: parseFloat(suggestedPrice.toFixed(2))
            };
        });

        setProcessedItems(enrichedItems);
        setStep('review');
        
        // Final Feedback
        if (!isMuted) {
            if (inflationCount > 0) {
                soundService.playSound('alert');
                ttsService.speak(`He detectado ${rawItems.length} productos. Alerta: ${inflationCount} productos presentan inflación considerable. Revisa los precios sugeridos.`, true);
            } else {
                soundService.playSound('success');
                ttsService.speak(`Procesado exitosamente. He detectado ${rawItems.length} productos.`, true);
            }
        }

      } catch (e: any) {
        setError(e.message);
        setStep('instructions');
        if(!isMuted) {
            soundService.playSound('error');
            ttsService.speak("Hubo un error al entender el audio. Por favor intenta de nuevo.", true);
        }
      }
    };
  };

  // --- Review & Save Logic ---

  const handleUpdateItem = (index: number, field: keyof ProcessedItem, value: any) => {
    setProcessedItems(prev => {
        const newItems = [...prev];
        newItems[index] = { ...newItems[index], [field]: value };
        return newItems;
    });
  };

  const handleSave = async () => {
      for (const item of processedItems) {
          const priceHistoryEntry: PriceHistoryEntry = {
              date: Date.now(),
              costPrice: item.costPrice,
              sellingPrice: item.sellingPrice
          };

          if (item.matchId) {
              const product = dbService.getProducts().find(p => p.id === item.matchId);
              if (product) {
                  const newStock = product.stock + item.quantity;
                  const updatedProduct: Product = {
                      ...product,
                      stock: newStock,
                      price: item.sellingPrice,
                      costPrice: item.costPrice > 0 ? item.costPrice : product.costPrice,
                      priceHistory: [...(product.priceHistory || []), priceHistoryEntry]
                  };
                  await dbService.updateProduct(updatedProduct);
              }
          } else {
              await dbService.addProduct({
                  name: item.productName,
                  price: item.sellingPrice || 0,
                  costPrice: item.costPrice || 0,
                  stock: item.quantity,
                  category: 'General',
                  priceHistory: [priceHistoryEntry]
              });
          }
      }
      if(!isMuted) {
          soundService.playSound('success');
          ttsService.speak("Inventario actualizado correctamente.", true);
      }
      onProductsUpdated();
      onClose();
  };

  const renderVisualizer = () => (
    <div className="flex items-center justify-center gap-1 h-12 mb-4">
        {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className="w-2 bg-dp-blue dark:bg-dp-gold rounded-full animate-pulse" 
                 style={{ height: `${Math.random() * 100}%`, animationDuration: `${0.5 + Math.random() * 0.5}s` }}></div>
        ))}
    </div>
  );

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex justify-center items-center backdrop-blur-sm" onClick={onClose}>
      <div className="bg-dp-light dark:bg-dp-charcoal rounded-xl shadow-2xl w-full max-w-4xl m-4 flex flex-col max-h-[90vh] overflow-hidden animate-modal-in border border-dp-blue/30 dark:border-dp-gold/30" onClick={e => e.stopPropagation()}>
        
        {/* Header */}
        <div className="bg-dp-soft-gray dark:bg-black/40 p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
            <h2 className="text-xl font-bold flex items-center gap-2 text-dp-blue dark:text-dp-gold">
                <Mic size={24} /> 
                Dominion Voice Intelligence
            </h2>
            <div className="flex items-center gap-2">
                <button onClick={toggleMute} className="p-2 hover:bg-gray-200 dark:hover:bg-white/10 rounded-full text-gray-500 dark:text-gray-400">
                    {isMuted ? <VolumeX size={20}/> : <Volume2 size={20}/>}
                </button>
                <button onClick={onClose} className="p-2 hover:bg-gray-200 dark:hover:bg-white/10 rounded-full text-gray-600 dark:text-gray-300"><X size={20}/></button>
            </div>
        </div>

        <div className="flex-grow p-6 overflow-y-auto">
            {error && <div className="bg-red-100 text-red-700 p-3 rounded mb-4 text-sm font-semibold animate-pulse">{error}</div>}

            {step === 'instructions' && (
                <div className="text-center space-y-6">
                    <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-100 dark:border-blue-900/50">
                        <h3 className="font-bold text-lg mb-2 flex items-center justify-center gap-2 text-gray-900 dark:text-white">
                            <Info size={20}/> Ingesta por Voz con Detección de Inflación
                        </h3>
                        <p className="text-gray-700 dark:text-gray-300 mb-4">
                            Menciona el <strong>COSTO</strong> para que la IA detecte aumentos y sugiera nuevos precios automáticamente.
                        </p>
                        <div className="text-left bg-white dark:bg-black/30 p-3 rounded text-sm space-y-2 font-mono text-gray-800 dark:text-gray-200 border border-gray-200 dark:border-gray-700">
                            <p className="text-gray-600 dark:text-gray-400 font-bold mb-1">Ejemplos para control de inflación:</p>
                            <div className="flex items-center gap-2">
                                <CheckCircle size={14} className="text-green-500"/> "10 cajas de leche, costo 5 dólares"
                            </div>
                            <div className="flex items-center gap-2">
                                <CheckCircle size={14} className="text-green-500"/> "Harina Pan, me costó 20, vender a 30"
                            </div>
                            <div className="flex items-center gap-2">
                                <CheckCircle size={14} className="text-green-500"/> "Coca Cola, reposición de 50, costo 1.50"
                            </div>
                        </div>
                    </div>
                    
                    <button 
                        onClick={startRecording}
                        className="w-24 h-24 rounded-full bg-red-500 hover:bg-red-600 shadow-lg flex items-center justify-center transition-transform hover:scale-110 mx-auto ring-4 ring-red-200 dark:ring-red-900/30"
                    >
                        <Mic size={40} className="text-white"/>
                    </button>
                    <p className="text-sm text-gray-600 dark:text-gray-400 font-semibold">Presiona para comenzar</p>
                </div>
            )}

            {step === 'recording' && (
                <div className="text-center py-10">
                    <h3 className="text-2xl font-bold mb-4 text-red-500 animate-pulse">Escuchando...</h3>
                    <div className="text-5xl font-mono font-bold mb-8 text-gray-900 dark:text-white">
                        00:{timeLeft < 10 ? `0${timeLeft}` : timeLeft}
                    </div>
                    
                    {renderVisualizer()}

                    <button 
                        onClick={stopRecording}
                        className="w-20 h-20 rounded-full bg-gray-800 dark:bg-gray-200 hover:opacity-80 flex items-center justify-center mx-auto mt-4 transition-colors"
                    >
                        <Square size={32} className="text-white dark:text-black fill-current"/>
                    </button>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-2 font-medium">Detener y Analizar</p>
                </div>
            )}

            {step === 'processing' && (
                <div className="text-center py-16">
                    <Loader2 size={64} className="animate-spin text-dp-blue dark:text-dp-gold mx-auto mb-4"/>
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white">Procesando Audio...</h3>
                    <p className="text-gray-600 dark:text-gray-400">Analizando costos e inflación.</p>
                </div>
            )}

            {step === 'review' && (
                <div>
                    <h3 className="text-lg font-bold mb-4 text-gray-900 dark:text-white">Revisión de Ingesta Inteligente</h3>
                    <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-gray-100 dark:bg-gray-800 text-xs uppercase text-gray-700 dark:text-gray-300">
                                <tr>
                                    <th className="px-3 py-2">Producto</th>
                                    <th className="px-3 py-2 text-center">Cant.</th>
                                    <th className="px-3 py-2 text-right">Costo (Nuevo)</th>
                                    <th className="px-3 py-2 text-center">Inflación</th>
                                    <th className="px-3 py-2 text-right">Precio Venta</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                                {processedItems.map((item, idx) => (
                                    <tr key={idx} className="bg-white dark:bg-dp-charcoal hover:bg-gray-50 dark:hover:bg-gray-800/50">
                                        <td className="px-3 py-2">
                                            <input 
                                                type="text" 
                                                value={item.productName} 
                                                onChange={(e) => handleUpdateItem(idx, 'productName', e.target.value)}
                                                className="w-full bg-transparent border-none focus:ring-0 font-medium text-gray-900 dark:text-white placeholder-gray-400"
                                            />
                                            {item.isNew ? (
                                                <span className="text-[10px] bg-blue-100 text-blue-800 px-1 rounded font-semibold">Nuevo</span>
                                            ) : (
                                                <span className="text-[10px] text-green-600 font-semibold">Stock Actual: {dbService.getProducts().find(p=>p.id===item.matchId)?.stock}</span>
                                            )}
                                        </td>
                                        <td className="px-3 py-2">
                                            <input 
                                                type="number" 
                                                value={item.quantity} 
                                                onChange={(e) => handleUpdateItem(idx, 'quantity', parseInt(e.target.value))}
                                                className="w-16 text-center bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white rounded border-none focus:ring-2 focus:ring-dp-blue"
                                            />
                                        </td>
                                        <td className="px-3 py-2 text-right font-mono">
                                            <div className="relative">
                                                <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-500 text-xs">C:</span>
                                                <input 
                                                    type="number" 
                                                    value={item.costPrice} 
                                                    onChange={(e) => handleUpdateItem(idx, 'costPrice', parseFloat(e.target.value))}
                                                    className="w-20 pl-6 py-1 text-right bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white rounded border-none focus:ring-2 focus:ring-dp-blue"
                                                />
                                            </div>
                                        </td>
                                        <td className="px-3 py-2 text-center">
                                            {item.inflationRate !== undefined && item.inflationRate > 0 ? (
                                                <div className="inline-flex items-center gap-1 text-xs font-bold text-red-600 bg-red-100 dark:bg-red-900/30 dark:text-red-300 px-2 py-1 rounded animate-pulse">
                                                    <TrendingUp size={12}/> +{item.inflationRate.toFixed(1)}%
                                                </div>
                                            ) : (
                                                <span className="text-gray-400">-</span>
                                            )}
                                        </td>
                                        <td className="px-3 py-2 text-right">
                                            <div className="relative">
                                                <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                                                <input 
                                                    type="number" 
                                                    value={item.sellingPrice} 
                                                    onChange={(e) => handleUpdateItem(idx, 'sellingPrice', parseFloat(e.target.value))}
                                                    className={`w-24 pl-5 py-1 text-right rounded border-none font-bold text-gray-900 dark:text-white ${
                                                        item.inflationRate && item.inflationRate > 0 
                                                        ? 'bg-yellow-100 text-yellow-900 ring-2 ring-yellow-400 dark:bg-yellow-900/50 dark:text-yellow-100' 
                                                        : 'bg-gray-100 dark:bg-gray-700'
                                                    }`}
                                                />
                                            </div>
                                            {item.inflationRate !== undefined && item.inflationRate > 0 && <p className="text-[9px] text-yellow-600 dark:text-yellow-400 mt-0.5 font-bold">Sugerido</p>}
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
        {step === 'review' && (
            <div className="p-4 bg-gray-50 dark:bg-black/20 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-3">
                <button onClick={() => { setStep('instructions'); if(!isMuted) soundService.playSound('click'); }} className="px-4 py-2 text-gray-700 dark:text-gray-300 font-semibold hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg flex items-center gap-2 transition-colors">
                    <RefreshCw size={16}/> Descartar
                </button>
                <button onClick={handleSave} className="flex items-center gap-2 px-6 py-2 bg-dp-blue dark:bg-dp-gold text-white dark:text-dp-dark font-bold rounded-lg hover:brightness-110 shadow-lg transition-all transform hover:scale-105">
                    <Save size={18}/> Confirmar Inventario
                </button>
            </div>
        )}
      </div>
    </div>
  );
};

export default VoiceIngestModal;
