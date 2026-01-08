import React from 'react';
import type { PromotionId } from '../types';
import { PROMOTIONS } from '../constants';
import { X, CheckCircle, Gift } from 'lucide-react';

interface PromotionsModalProps {
  onClose: () => void;
  onSave: (promotionId: PromotionId | null) => void;
  activePromotionId: PromotionId | null;
}

const PromotionsModal: React.FC<PromotionsModalProps> = ({ onClose, onSave, activePromotionId }) => {

  const handleSelect = (promotionId: PromotionId) => {
    if (activePromotionId === promotionId) {
        onSave(null); // Deselect if already active
    } else {
        onSave(promotionId);
    }
    onClose();
  };

  return (
    <div 
      className="fixed inset-0 bg-black/60 z-[60] flex justify-center items-center"
      aria-modal="true"
      role="dialog"
      onClick={onClose}
    >
      <div className="bg-dp-light dark:bg-dp-charcoal rounded-lg shadow-2xl p-6 w-full max-w-lg m-4 animate-modal-in" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold mb-2 text-dp-dark-gray dark:text-dp-light-gray flex items-center gap-2">
                <Gift size={22}/>
                Aplicar Promoción
            </h2>
             <button
                onClick={onClose}
                className="p-2 rounded-full text-dp-dark-gray dark:text-dp-light-gray hover:bg-dp-soft-gray dark:hover:bg-gray-700"
                aria-label="Cerrar"
            >
                <X size={24} />
            </button>
        </div>
        
        <ul className="space-y-3">
            {PROMOTIONS.map(promo => (
                <li key={promo.id}>
                    <button 
                        onClick={() => handleSelect(promo.id)}
                        className={`w-full text-left p-4 rounded-lg border-2 transition-all flex justify-between items-center ${
                            activePromotionId === promo.id
                            ? 'border-dp-blue dark:border-dp-gold bg-blue-50 dark:bg-yellow-900/20'
                            : 'border-transparent bg-dp-soft-gray dark:bg-gray-800/50 hover:border-gray-300 dark:hover:border-gray-600'
                        }`}
                    >
                        <div>
                            <p className="font-bold">{promo.name}</p>
                            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{promo.description}</p>
                        </div>
                        {activePromotionId === promo.id && (
                             <CheckCircle size={24} className="text-dp-blue dark:text-dp-gold flex-shrink-0 ml-4" />
                        )}
                    </button>
                </li>
            ))}
        </ul>

         <div className="mt-6 flex justify-between items-center">
            <button
                type="button"
                disabled={!activePromotionId}
                onClick={() => { onSave(null); onClose(); }}
                className="px-4 py-2 rounded-md text-sm font-semibold transition-colors
                           text-red-600 hover:bg-red-100/50
                           dark:text-red-400 dark:hover:bg-red-900/20
                           disabled:text-gray-400 dark:disabled:text-gray-500 disabled:hover:bg-transparent disabled:cursor-not-allowed"
            >
              Limpiar Promoción
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-md text-sm font-semibold transition-colors
                         bg-gray-200 text-gray-800 hover:bg-gray-300
                         dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"
            >
              Cerrar
            </button>
          </div>
      </div>
    </div>
  );
};

export default PromotionsModal;