
import React, { useState } from 'react';
import { X, CheckCircle, Crown, MessageCircle, Gem, Brain } from 'lucide-react';
import * as cloudService from '../services/cloud';
import * as settingsService from '../services/settings';

interface UpgradeModalProps {
  onClose: () => void;
}

const PlanButton = ({ label, price, freq, isSelected, onClick, color }: { label:string, price:number, freq:string, isSelected:boolean, onClick:()=>void, color:'blue'|'gold' }) => {
    const selectedClasses = color === 'blue' 
        ? 'bg-blue-600 border-blue-400 text-white' 
        : 'bg-dp-gold border-yellow-300 text-black';
    const idleClasses = 'bg-gray-800 border-gray-700 text-gray-300 hover:border-gray-500';

    return (
        <button
            onClick={onClick}
            className={`w-full p-3 rounded-lg border-2 transition-all flex justify-between items-center ${isSelected ? selectedClasses : idleClasses}`}
        >
            <div className="flex items-center gap-3">
                <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${isSelected ? 'border-current bg-current' : 'border-gray-500'}`}>
                    {isSelected && <CheckCircle size={12} className={color==='gold' ? "text-black" : "text-white"}/>}
                </div>
                <span className="font-bold text-sm">{label}</span>
            </div>
            <div className="text-right">
                <span className="font-black text-lg">${price.toLocaleString('es-AR')}</span>
                <span className={`text-xs ${isSelected ? (color==='gold' ? 'text-black/70' : 'text-white/70') : 'text-gray-500'}`}>{freq}</span>
            </div>
        </button>
    )
}

const UpgradeModal: React.FC<UpgradeModalProps> = ({ onClose }) => {
  const identity = cloudService.getIdentity();
  const [tier, setTier] = useState<'inteligente' | 'premium'>('premium');
  const [frequency, setFrequency] = useState<'mensual' | 'anual'>('mensual');
  
  const vendorNumber = settingsService.getVendorWhatsApp();
  
  const getMessage = () => {
      const tierText = tier === 'premium' ? "PREMIUM" : "INTELIGENTE";
      const freqText = frequency === 'anual' ? "ANUAL" : "MENSUAL";
      let planText = `PRO ${tierText} ${freqText}`;
      
      return `Hola! Estoy interesado en el plan ${planText} para DOMINION POS.\n\nMi ID de Soporte es: *${identity.licenseKey}*\n\n(Enviado desde la App)`;
  };
  
  const whatsappUrl = `https://wa.me/${vendorNumber}?text=${encodeURIComponent(getMessage())}`;

  const prices = {
      inteligente: {
          mensual: 7499,
          anual: 59999,
      },
      premium: {
          mensual: 10499,
          anual: 79999,
      }
  };

  return (
    <div className="fixed inset-0 bg-black/80 z-[100] flex justify-center items-center backdrop-blur-sm p-4 animate-modal-in" onClick={onClose}>
      <div 
        className="bg-gray-900 rounded-2xl shadow-2xl w-full max-w-4xl border border-dp-gold/30 flex flex-col max-h-[90vh] overflow-hidden" 
        onClick={e => e.stopPropagation()}
      >
        <div className="p-5 border-b border-gray-800 flex justify-between items-center bg-gray-900/50">
            <div className="flex items-center gap-3">
                <div className="p-2 rounded-full bg-dp-gold/10 ring-1 ring-dp-gold/30">
                    <Crown size={24} className="text-dp-gold" />
                </div>
                <div>
                    <h2 className="text-xl font-bold text-white">Evoluciona tu Comercio</h2>
                    <p className="text-xs text-gray-400">Desbloquea el potencial completo de Dominion POS.</p>
                </div>
            </div>
            <button onClick={onClose} className="p-2 text-gray-500 hover:text-white rounded-full transition-colors"><X size={24} /></button>
        </div>
        
        <div className="flex-1 overflow-y-auto custom-scrollbar">
            <div className="grid md:grid-cols-2 gap-px bg-gray-800">
                {/* PRO INTELIGENTE */}
                <div className="bg-gray-900 p-6 flex flex-col">
                    <div className="flex items-center gap-3 mb-3">
                        <Brain size={24} className="text-blue-400"/>
                        <h3 className="text-lg font-bold text-white">PRO Inteligente</h3>
                    </div>
                    <p className="text-xs text-gray-400 mb-4 font-medium flex-grow">
                        Ideal para quienes buscan el <strong className="text-white">máximo ahorro</strong>. Este plan te da acceso a todas las funciones PRO. Para potenciar la IA, usarás la cuota gratuita que Google ofrece a todos sus usuarios.
                        <br/><br/>
                        <strong className="text-gray-300">¿Qué implica?</strong> Una configuración simple de única vez donde vinculas tu cuenta. ¡Te guiamos en el proceso!
                    </p>
                    <div className="mt-4 space-y-2">
                        <PlanButton 
                            label="Mensual" 
                            price={prices.inteligente.mensual} 
                            freq="/mes" 
                            isSelected={tier === 'inteligente' && frequency === 'mensual'} 
                            onClick={() => { setTier('inteligente'); setFrequency('mensual'); }}
                            color="blue"
                        />
                        <PlanButton 
                            label="Anual" 
                            price={prices.inteligente.anual} 
                            freq="/año"
                            isSelected={tier === 'inteligente' && frequency === 'anual'} 
                            onClick={() => { setTier('inteligente'); setFrequency('anual'); }}
                            color="blue"
                        />
                    </div>
                    <ul className="text-xs text-gray-400 mt-4 space-y-1.5 pt-4 border-t border-gray-800">
                        <li className="flex gap-2"><CheckCircle size={14} className="text-green-500 mt-0.5"/> Precio más bajo garantizado.</li>
                        <li className="flex gap-2"><CheckCircle size={14} className="text-green-500 mt-0.5"/> Todas las funciones PRO: Multi-caja, Nube, etc.</li>
                        <li className="flex gap-2"><CheckCircle size={14} className="text-green-500 mt-0.5"/> Control total sobre tu consumo de IA.</li>
                    </ul>
                </div>
                
                {/* PRO PREMIUM */}
                <div className="bg-gradient-to-br from-gray-900 to-black p-6 flex flex-col border-l-4 border-dp-gold">
                    <div className="flex justify-between items-center mb-3">
                        <div className="flex items-center gap-3">
                            <Gem size={24} className="text-dp-gold"/>
                            <h3 className="text-lg font-bold text-white">PRO Premium</h3>
                        </div>
                        <span className="bg-dp-gold text-black text-[9px] font-bold px-2 py-0.5 rounded uppercase tracking-wider">Recomendado</span>
                    </div>
                    <p className="text-xs text-gray-400 mb-4 font-medium flex-grow">
                        La experiencia definitiva: <strong className="text-white">máxima comodidad</strong>. Olvídate de configuraciones. Nosotros nos encargamos de toda la infraestructura de IA para que tu sistema simplemente funcione, siempre.
                        <br/><br/>
                        <strong className="text-gray-300">¿Qué implica?</strong> Absolutamente nada para ti. Disfruta de todo desde el primer segundo, sin pasos adicionales.
                    </p>
                    <div className="mt-4 space-y-2">
                        <PlanButton 
                            label="Mensual" 
                            price={prices.premium.mensual} 
                            freq="/mes" 
                            isSelected={tier === 'premium' && frequency === 'mensual'} 
                            onClick={() => { setTier('premium'); setFrequency('mensual'); }}
                            color="gold"
                        />
                        <PlanButton 
                            label="Anual" 
                            price={prices.premium.anual} 
                            freq="/año" 
                            isSelected={tier === 'premium' && frequency === 'anual'} 
                            onClick={() => { setTier('premium'); setFrequency('anual'); }}
                            color="gold"
                        />
                    </div>
                    <ul className="text-xs text-gray-400 mt-4 space-y-1.5 pt-4 border-t border-gray-800">
                        <li className="flex gap-2"><CheckCircle size={14} className="text-green-500 mt-0.5"/> Cero configuración técnica.</li>
                        <li className="flex gap-2"><CheckCircle size={14} className="text-green-500 mt-0.5"/> Todas las funciones PRO, listas para usar.</li>
                        <li className="flex gap-2"><CheckCircle size={14} className="text-green-500 mt-0.5"/> Garantía de servicio y disponibilidad.</li>
                    </ul>
                </div>
            </div>
        </div>

        <div className="p-4 bg-gray-900/50 border-t border-gray-800 flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-xs text-gray-500">
                Tu ID de Soporte: <strong className="font-mono text-gray-400">{identity.licenseKey || 'Sin licencia'}</strong>
            </p>
            <a 
                href={whatsappUrl} 
                target="_blank" 
                rel="noopener noreferrer"
                className="w-full sm:w-auto flex items-center justify-center gap-3 px-6 py-3 rounded-xl font-bold text-white bg-[#25D366] hover:bg-[#20bd5a] transition-all shadow-lg hover:shadow-green-500/30 hover:-translate-y-0.5 active:translate-y-0 text-sm"
            >
                <MessageCircle size={20} fill="white" className="text-white" />
                Solicitar Plan {tier.charAt(0).toUpperCase() + tier.slice(1)} {frequency.charAt(0).toUpperCase() + frequency.slice(1)}
            </a>
        </div>
      </div>
    </div>
  );
};

export default UpgradeModal;
