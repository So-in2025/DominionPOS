
import React, { useState } from 'react';
import { X, CheckCircle, Crown, MessageCircle, Star, ShieldCheck, Zap, Server, Smartphone } from 'lucide-react';
import * as cloudService from '../services/cloud';
import * as settingsService from '../services/settings';

interface UpgradeModalProps {
  onClose: () => void;
}

const UpgradeModal: React.FC<UpgradeModalProps> = ({ onClose }) => {
  const identity = cloudService.getIdentity();
  const [selectedInterest, setSelectedInterest] = useState<'prepago' | 'abono' | 'anual'>('abono');
  
  const vendorNumber = settingsService.getVendorWhatsApp();
  
  const getMessage = () => {
      let planText = "ABONO PRO";
      if (selectedInterest === 'prepago') planText = "PLAN BASE";
      if (selectedInterest === 'anual') planText = "PRO ANUAL";
      
      return `Hola! Estoy interesado en el ${planText} para DOMINION POS.\n\nMi ID de Soporte es: *${identity.licenseKey}*\n\n(Enviado desde la App)`;
  };
  
  const whatsappUrl = `https://wa.me/${vendorNumber}?text=${encodeURIComponent(getMessage())}`;

  return (
    <div className="fixed inset-0 bg-black/80 z-[60] flex justify-center items-center backdrop-blur-sm p-4 animate-modal-in" onClick={onClose}>
      <div 
        className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-4xl border border-dp-gold/30 flex flex-col md:flex-row max-h-[90vh] overflow-y-auto md:overflow-hidden" 
        onClick={e => e.stopPropagation()}
      >
        
        {/* Left Side: Pitch */}
        <div className="w-full md:w-1/3 bg-gradient-to-br from-gray-900 to-black p-6 text-white relative overflow-hidden flex flex-col flex-shrink-0">
            <div className="absolute top-0 left-0 w-full h-full bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
            <div className="relative z-10">
                <div className="inline-flex p-3 rounded-full bg-dp-gold/20 mb-4 ring-1 ring-dp-gold/50 shadow-[0_0_20px_rgba(212,175,55,0.3)]">
                    <Crown size={32} className="text-dp-gold" />
                </div>
                <h2 className="text-2xl font-bold mb-2">Elegí tu Plan</h2>
                <p className="text-gray-400 text-sm mb-6">Potencia tu comercio con la tecnología de Dominion.</p>
                
                <div className="space-y-4">
                    <div className="flex gap-3 items-start">
                        <Smartphone size={20} className="text-green-400 mt-1"/>
                        <div>
                            <h4 className="font-bold text-sm">Plan Base (Único)</h4>
                            <p className="text-xs text-gray-400">1 Caja, Local, Sin vencimiento. Ideal para empezar.</p>
                        </div>
                    </div>
                    <div className="flex gap-3 items-start">
                        <Server size={20} className="text-blue-400 mt-1"/>
                        <div>
                            <h4 className="font-bold text-sm">Abono PRO (Mensual)</h4>
                            <p className="text-xs text-gray-400">Multi-Caja, Backup Nube, Soporte. El más elegido.</p>
                        </div>
                    </div>
                </div>
            </div>
            
            <div className="mt-6 md:mt-auto relative z-10 pt-6 border-t border-gray-800">
                <p className="text-xs text-gray-500 uppercase font-bold mb-1">Tu ID de Nodo</p>
                <p className="font-mono text-sm text-dp-gold">{identity.licenseKey || 'Sin licencia'}</p>
            </div>
        </div>

        {/* Right Side: Pricing Tables */}
        <div className="w-full md:w-2/3 p-6 bg-gray-50 dark:bg-gray-900 md:overflow-y-auto">
            <button onClick={onClose} className="absolute top-4 right-4 text-gray-500 hover:text-black dark:hover:text-white transition-colors z-10 bg-white/20 rounded-full p-1 md:bg-transparent">
                <X size={24} />
            </button>

            <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-4">Selecciona una opción:</h3>

            <div className="grid gap-4">
                {/* PREPAGO */}
                <div 
                    onClick={() => setSelectedInterest('prepago')}
                    className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${selectedInterest === 'prepago' ? 'border-green-500 bg-green-50 dark:bg-green-900/10' : 'border-gray-200 dark:border-gray-700 hover:border-green-300'}`}
                >
                    <div className="flex justify-between items-center mb-2">
                        <span className="font-bold text-green-700 dark:text-green-400 flex items-center gap-2"><Smartphone size={18}/> PLAN BASE</span>
                        <span className="text-xl font-black text-gray-900 dark:text-white">$14.999</span>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">Pago único de por vida. Funciona sin internet.</p>
                    <ul className="text-sm space-y-1">
                        <li className="flex gap-2"><CheckCircle size={14} className="text-green-500"/> 1 Caja (Dispositivo único)</li>
                        <li className="flex gap-2"><CheckCircle size={14} className="text-green-500"/> Inventario + Ventas</li>
                        <li className="flex gap-2"><CheckCircle size={14} className="text-green-500"/> Sin vencimiento</li>
                    </ul>
                </div>

                {/* ABONO PRO */}
                <div 
                    onClick={() => setSelectedInterest('abono')}
                    className={`p-4 rounded-xl border-2 cursor-pointer transition-all relative ${selectedInterest === 'abono' ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/10 shadow-lg' : 'border-gray-200 dark:border-gray-700 hover:border-blue-300'}`}
                >
                    <div className="absolute -top-3 right-4 bg-blue-600 text-white text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-wide shadow-md">Recomendado ⭐</div>
                    <div className="flex justify-between items-center mb-2">
                        <span className="font-bold text-blue-700 dark:text-blue-400 flex items-center gap-2"><Server size={18}/> ABONO PRO</span>
                        <div className="text-right">
                            <span className="text-xs line-through text-gray-400 block">$6.999 inicio</span>
                            <span className="text-xl font-black text-gray-900 dark:text-white">$7.499<span className="text-xs font-normal text-gray-500">/mes</span></span>
                        </div>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">Entrá barato y tené todo. Potencia total.</p>
                    <ul className="text-sm space-y-1">
                        <li className="flex gap-2"><CheckCircle size={14} className="text-blue-500"/> <strong>3 Usuarios</strong> (Dueño + 2 Operadores)</li>
                        <li className="flex gap-2"><CheckCircle size={14} className="text-blue-500"/> <strong>Backup Automático en Nube</strong></li>
                        <li className="flex gap-2"><CheckCircle size={14} className="text-blue-500"/> Reportes Avanzados + Soporte</li>
                    </ul>
                </div>

                {/* ANUAL */}
                <div 
                    onClick={() => setSelectedInterest('anual')}
                    className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${selectedInterest === 'anual' ? 'border-yellow-500 bg-yellow-50 dark:bg-yellow-900/10' : 'border-gray-200 dark:border-gray-700 hover:border-yellow-300'}`}
                >
                    <div className="flex justify-between items-center mb-2">
                        <span className="font-bold text-yellow-700 dark:text-yellow-400 flex items-center gap-2"><Crown size={18}/> PRO ANUAL</span>
                        <span className="text-xl font-black text-gray-900 dark:text-white">$79.999<span className="text-xs font-normal text-gray-500">/año</span></span>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">Mejor precio. Pagá menos y olvidate.</p>
                    <ul className="text-sm space-y-1">
                        <li className="flex gap-2"><CheckCircle size={14} className="text-yellow-500"/> Todo lo del Plan PRO</li>
                        <li className="flex gap-2"><CheckCircle size={14} className="text-yellow-500"/> Descuento vs Mensual</li>
                        <li className="flex gap-2"><CheckCircle size={14} className="text-yellow-500"/> Sin pagos mensuales</li>
                    </ul>
                </div>
            </div>

            <a 
                href={whatsappUrl} 
                target="_blank" 
                rel="noopener noreferrer"
                className="mt-6 flex items-center justify-center gap-3 w-full py-4 rounded-xl font-bold text-white bg-[#25D366] hover:bg-[#20bd5a] transition-all shadow-lg hover:shadow-green-500/30 hover:-translate-y-0.5 active:translate-y-0 mb-4 md:mb-0"
            >
                <MessageCircle size={24} fill="white" className="text-white" />
                Solicitar {selectedInterest === 'prepago' ? 'Plan Base' : selectedInterest === 'abono' ? 'Abono Pro' : 'Plan Anual'}
            </a>
        </div>
      </div>
    </div>
  );
};

export default UpgradeModal;
