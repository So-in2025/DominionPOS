
import React, { useState, useRef, useEffect } from 'react';
import { X, Mic, Square, Loader2, Save, RefreshCw, CheckCircle, Info, TrendingUp, AlertTriangle, Volume2, VolumeX, ShieldAlert } from 'lucide-react';
import * as aiService from '../services/ai';
import * as dbService from '../services/db';
import * as soundService from '../services/sound';
import * as settingsService from '../services/settings';
import * as cloudService from '../services/cloud';
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
  const [step, setStep] = useState<'instructions' | 'recording' | 'processing' | 'review' | 'error_perm'>('instructions');
  const [timeLeft, setTimeLeft] = useState(60);
  const [isRecording, setIsRecording] = useState(false);
  const [processedItems, setProcessedItems] = useState<ProcessedItem[]>([]);
  const [error, setError] = useState('');
  const [isMuted, setIsMuted] = useState(false);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);

  const TARGET_MARGIN = 0.30;

  useEffect(() => {
      try {
          if (!isMuted) {
              soundService.playSound('pop');
              ttsService.speak("Modo de voz activado. Menciona el costo de los productos para detectar inflación automáticamente.");
          }
      } catch (e) {
          console.warn("Error audio", e);
      }
      return () => {
          try { ttsService.stopSpeaking(); } catch(e) {}
      };
  }, []);

  const toggleMute = () => {
      setIsMuted(!isMuted);
      if(!isMuted) ttsService.stopSpeaking();
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) audioChunksRef.current.push(event.data);
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        processAudio(audioBlob);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setStep('recording');
      
      if (!isMuted) {
          soundService.playSound('click');
          ttsService.speak("Escuchando.");
      }
      
      setTimeLeft(60);
      timerRef.current = window.setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            stopRecording();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

    } catch (err) {
      setStep('error_perm');
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

  const processAudio = (blob: Blob) => {
    setStep('processing');
    if (!isMuted) ttsService.speak("Procesando tu inventario.");
    
    const reader = new FileReader();
    reader.readAsDataURL(blob);
    reader.onloadend = async () => {
      const base64Audio = reader.result as string;
      try {
        const rawItems = await aiService.processAudioInventory(base64Audio);
        const dbProducts = dbService.getProducts();
        
        const enrichedItems: ProcessedItem[] = rawItems.map(item => {
            const match = dbProducts.find(p => p.name.toLowerCase().includes(item.productName.toLowerCase()) || item.productName.toLowerCase().includes(p.name.toLowerCase()));
            
            let inflationRate = 0;
            let suggestedPrice = item.sellingPrice > 0 ? item.sellingPrice : 0;
            let currentCost = 0;
            
            if (match) {
                currentCost = match.costPrice || 0;
                if (suggestedPrice === 0) suggestedPrice = match.price;
                if (item.costPrice > 0 && currentCost > 0) {
                    inflationRate = ((item.costPrice - currentCost) / currentCost) * 100;
                }
                if (item.costPrice > currentCost && item.costPrice > 0) {
                     const currentMargin = (match.price - (match.costPrice || match.price * 0.7)) / match.price;
                     const targetMarginToKeep = Math.max(currentMargin, TARGET_MARGIN);
                     if (item.sellingPrice === 0) suggestedPrice = item.costPrice / (1 - targetMarginToKeep);
                }
            } else if (suggestedPrice === 0 && item.costPrice > 0) {
                suggestedPrice = item.costPrice * (1 + TARGET_MARGIN);
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
        if (!isMuted) {
            soundService.playSound('success');
            ttsService.speak(`Procesado exitosamente.`);
        }
      } catch (e: any) {
        setError("La IA no pudo decodificar el audio claramente.");
        setStep('instructions');
        if(!isMuted) soundService.playSound('error');
      }
    };
  };

  const handleSave = async () => {
      // --- CONSUME QUOTA HERE ON SUCCESSFUL SAVE ---
      const isPro = cloudService.hasAccess('voice_ingest');
      if (!isPro) {
          settingsService.incrementFreeQuota('voice');
      }

      for (const item of processedItems) {
          const priceHistoryEntry: PriceHistoryEntry = {
              date: Date.now(),
              costPrice: item.costPrice,
              sellingPrice: item.sellingPrice
          };
          if (item.matchId) {
              const product = dbService.getProducts().find(p => p.id === item.matchId);
              if (product) {
                  await dbService.updateProduct({
                      ...product,
                      stock: product.stock + item.quantity,
                      price: item.sellingPrice,
                      costPrice: item.costPrice > 0 ? item.costPrice : product.costPrice,
                      priceHistory: [...(product.priceHistory || []), priceHistoryEntry]
                  });
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
      if(!isMuted) soundService.playSound('success');
      onProductsUpdated();
      onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/80 z-[60] flex justify-center items-center backdrop-blur-sm p-4" onClick={onClose}>
      <div className="bg-white dark:bg-dp-charcoal rounded-2xl shadow-2xl w-full max-w-4xl flex flex-col max-h-[90vh] overflow-hidden animate-modal-in border border-dp-blue/30 dark:border-dp-gold/30" onClick={e => e.stopPropagation()}>
        
        <div className="bg-dp-soft-gray dark:bg-black/40 p-5 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
            <h2 className="text-xl font-black flex items-center gap-2 text-dp-blue dark:text-dp-gold uppercase">
                <Mic size={24} /> 
                Dominion Voice
            </h2>
            <div className="flex items-center gap-3">
                <button onClick={toggleMute} className="p-2 hover:bg-gray-200 dark:hover:bg-white/10 rounded-full text-gray-500">
                    {isMuted ? <VolumeX size={20}/> : <Volume2 size={20}/>}
                </button>
                <button onClick={onClose} className="p-2 hover:bg-gray-200 dark:hover:bg-white/10 rounded-full text-gray-600 dark:text-gray-300"><X size={20}/></button>
            </div>
        </div>

        <div className="flex-grow p-6 overflow-y-auto custom-scrollbar">
            {step === 'error_perm' && (
                <div className="h-full flex flex-col items-center justify-center text-center space-y-4">
                    <div className="p-6 bg-red-100 text-red-600 rounded-full animate-shake"><ShieldAlert size={64}/></div>
                    <h3 className="text-2xl font-black uppercase text-dp-dark-gray dark:text-white">Acceso Denegado</h3>
                    <p className="max-w-xs text-gray-500 text-sm font-bold">No tenemos permiso para usar el micrófono. Por favor habilítalo en la barra de direcciones y reintenta.</p>
                    <button onClick={() => setStep('instructions')} className="px-8 py-3 bg-dp-blue text-white font-black uppercase text-xs rounded-xl shadow-lg">Entendido</button>
                </div>
            )}

            {step === 'instructions' && (
                <div className="h-full flex flex-col items-center justify-center space-y-8 py-10">
                    <div className="text-center space-y-3">
                        <div className="inline-flex p-4 bg-blue-50 dark:bg-blue-900/20 rounded-2xl border border-blue-100 dark:border-blue-900/50 max-w-md">
                            <Info size={32} className="text-dp-blue dark:text-dp-gold flex-shrink-0 mr-4 mt-1"/>
                            <div className="text-left">
                                <p className="text-xs font-black text-dp-blue dark:text-dp-gold uppercase tracking-widest mb-1">Algoritmo de Detección de Inflación</p>
                                <p className="text-sm text-gray-700 dark:text-gray-300 font-medium">Dicta tus productos y menciona la palabra <strong className="text-dp-dark-gray dark:text-white underline">"Costo"</strong>. Nuestra IA detectará el alza de precios y te sugerirá el nuevo PVP para mantener tu rentabilidad.</p>
                            </div>
                        </div>
                    </div>
                    
                    <button onClick={startRecording} className="w-28 h-28 rounded-full bg-red-500 hover:bg-red-600 shadow-[0_0_40px_rgba(239,68,68,0.4)] flex items-center justify-center transition-all hover:scale-110 active:scale-95 group">
                        <Mic size={48} className="text-white group-hover:animate-pulse"/>
                    </button>
                    <p className="text-[10px] text-gray-400 font-black uppercase tracking-[0.4em] animate-pulse">Pulsar para Dictar</p>
                    {error && <p className="text-red-500 font-bold text-xs bg-red-50 px-3 py-1 rounded">{error}</p>}
                </div>
            )}

            {step === 'recording' && (
                <div className="h-full flex flex-col items-center justify-center text-center py-20">
                    <div className="text-6xl font-black font-mono mb-8 text-dp-dark-gray dark:text-white tabular-nums drop-shadow-sm">
                        00:{timeLeft < 10 ? `0${timeLeft}` : timeLeft}
                    </div>
                    <div className="flex items-center justify-center gap-1.5 h-16 mb-10 w-64">
                        {[1, 2, 3, 4, 5, 6, 7].map(i => (
                            <div key={i} className="w-2.5 bg-red-500 rounded-full animate-bounce" 
                                 style={{ height: `${20 + Math.random() * 80}%`, animationDelay: `${i * 0.1}s` }}></div>
                        ))}
                    </div>
                    <button onClick={stopRecording} className="px-10 py-4 bg-dp-dark-gray text-white dark:bg-white dark:text-black font-black uppercase text-xs tracking-[0.2em] rounded-2xl hover:brightness-110 shadow-2xl active:scale-95 transition-all flex items-center gap-3">
                        <Square size={16} className="fill-current"/> Finalizar Dictado
                    </button>
                </div>
            )}

            {step === 'processing' && (
                <div className="h-full flex flex-col items-center justify-center py-20">
                    <Loader2 size={80} className="animate-spin text-dp-blue dark:text-dp-gold mb-6"/>
                    <h3 className="text-xl font-black uppercase tracking-widest text-dp-dark-gray dark:text-white">Analizando Fonemas...</h3>
                    <p className="text-gray-500 text-[10px] font-black uppercase tracking-[0.3em] mt-2">Diferenciando Costo vs Venta</p>
                </div>
            )}

            {step === 'review' && (
                <div className="animate-modal-in">
                    <h3 className="text-xs font-black text-gray-400 uppercase tracking-[0.2em] mb-6">Revisión de Ingesta por Voz</h3>
                    <div className="overflow-x-auto rounded-2xl border border-gray-200 dark:border-gray-800">
                        <table className="w-full text-sm text-left border-collapse">
                            <thead className="bg-gray-50 dark:bg-black/40 text-[10px] font-black text-gray-500 uppercase tracking-widest">
                                <tr>
                                    <th className="px-4 py-4">Ítem Identificado</th>
                                    <th className="px-4 py-4 text-center">Cant.</th>
                                    <th className="px-4 py-4 text-right">Costo</th>
                                    <th className="px-4 py-4 text-center">Estado</th>
                                    <th className="px-4 py-4 text-right">PVP Actualizado</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                                {processedItems.map((item, idx) => (
                                    <tr key={idx} className="bg-white dark:bg-dp-charcoal/50 hover:bg-gray-50 dark:hover:bg-gray-800/30">
                                        <td className="px-4 py-3">
                                            <input type="text" value={item.productName} 
                                                   onChange={(e) => {
                                                        const newItems = [...processedItems];
                                                        newItems[idx].productName = e.target.value;
                                                        setProcessedItems(newItems);
                                                   }}
                                                   className="bg-transparent border-none focus:ring-0 w-full font-bold text-sm text-dp-dark-gray dark:text-gray-200 p-0" />
                                            <span className="text-[9px] font-black uppercase text-gray-400">{item.isNew ? 'Nuevo Registro' : 'Existente'}</span>
                                        </td>
                                        <td className="px-4 py-3 text-center font-black">${item.quantity}</td>
                                        <td className="px-4 py-3 text-right font-mono font-black text-sm">${item.costPrice.toLocaleString()}</td>
                                        <td className="px-4 py-3 text-center">
                                            {item.inflationRate && item.inflationRate > 0 ? (
                                                <span className="px-2 py-1 rounded-full bg-red-100 text-red-700 text-[9px] font-black uppercase animate-pulse">Inflación +{item.inflationRate.toFixed(0)}%</span>
                                            ) : <span className="text-gray-400 font-black uppercase text-[9px]">Ok</span>}
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            <input type="number" value={item.sellingPrice} 
                                                   onChange={(e) => {
                                                       const newItems = [...processedItems];
                                                       newItems[idx].sellingPrice = parseFloat(e.target.value);
                                                       setProcessedItems(newItems);
                                                   }}
                                                   className={`w-24 text-right font-black text-sm rounded-lg p-1.5 border-none focus:ring-1 ${item.inflationRate && item.inflationRate > 0 ? 'bg-yellow-50 text-yellow-800 ring-1 ring-yellow-400' : 'bg-gray-100 dark:bg-black/40 dark:text-white'}`} />
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
            <div className="p-5 bg-dp-soft-gray dark:bg-black/40 border-t border-gray-200 dark:border-gray-700 flex justify-between items-center flex-shrink-0">
                <button onClick={() => setStep('instructions')} className="px-6 py-2 text-gray-500 font-black uppercase text-[10px] tracking-widest hover:text-dp-dark-gray dark:hover:text-white transition-colors flex items-center gap-2"><RefreshCw size={14}/> Descartar</button>
                <button onClick={handleSave} className="px-8 py-3 bg-dp-blue dark:bg-dp-gold text-white dark:text-dp-dark font-black uppercase text-xs tracking-widest rounded-xl shadow-xl hover:brightness-110 flex items-center gap-2">
                    <Save size={18}/> Actualizar Inventario Real
                </button>
            </div>
        )}
      </div>
    </div>
  );
};

export default VoiceIngestModal;
