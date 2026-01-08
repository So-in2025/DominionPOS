import React, { useState, useEffect } from 'react';
import { CreditCard, DollarSign, X, Delete, ChevronRight } from 'lucide-react';
import * as soundService from '../services/sound';

interface PaymentModalProps {
  total: number;
  onClose: () => void;
  onConfirm: (paymentDetails: { paymentMethod: 'Efectivo' | 'Tarjeta', amountReceived?: number, change?: number }) => void;
}

const NumpadButton: React.FC<{ onClick: () => void, children: React.ReactNode, className?: string, variant?: 'default' | 'action' }> = ({ onClick, children, className = '', variant = 'default' }) => (
    <button
        onClick={() => { soundService.playSound('type'); onClick(); }}
        className={`flex items-center justify-center h-14 sm:h-16 rounded-lg text-xl sm:text-2xl font-semibold transition-all active:scale-95
                   ${variant === 'default' 
                        ? 'bg-white border border-gray-200 text-dp-dark-gray hover:bg-gray-100 dark:bg-dp-charcoal dark:border-gray-600 dark:text-dp-light-gray dark:hover:bg-gray-700 shadow-sm' 
                        : 'bg-dp-blue/10 text-dp-blue border border-dp-blue/20 hover:bg-dp-blue/20 dark:bg-dp-gold/10 dark:text-dp-gold dark:border-dp-gold/20'}
                   ${className}`}
    >
        {children}
    </button>
);

const PaymentModal: React.FC<PaymentModalProps> = ({ total, onClose, onConfirm }) => {
  const [paymentMethod, setPaymentMethod] = useState<'Efectivo' | 'Tarjeta'>('Efectivo');
  const [amountReceived, setAmountReceived] = useState('');

  const parsedAmount = parseFloat(amountReceived);
  // Calculate change based on parsed amount, treating NaN as 0 for calculation safety
  const safeReceived = isNaN(parsedAmount) ? 0 : parsedAmount;
  const change = safeReceived >= total ? safeReceived - total : 0;
  
  const isConfirmDisabled = (paymentMethod === 'Efectivo' && (isNaN(parsedAmount) || parsedAmount < total));
  
  const handleNumpadInput = (value: string) => {
    if (value === '.') {
      if (!amountReceived.includes('.')) {
        // If empty, start with "0."
        setAmountReceived(amountReceived === '' ? '0.' : amountReceived + '.');
      }
    } else {
      // Prevent multiple leading zeros
      if (amountReceived === '0' && value === '0') return;
      if (amountReceived === '0' && value !== '.') {
          setAmountReceived(value);
      } else {
          setAmountReceived(amountReceived + value);
      }
    }
  };

  const handleBackspace = () => {
    setAmountReceived(prev => prev.slice(0, -1));
  };
  
  const handleSetExact = () => {
      setAmountReceived(total.toFixed(2));
  }

  const handleConfirm = () => {
    if (isConfirmDisabled && paymentMethod === 'Efectivo') {
        soundService.playSound('error');
        return;
    }
    
    if (paymentMethod === 'Efectivo') {
      onConfirm({
        paymentMethod: 'Efectivo',
        amountReceived: parsedAmount,
        change: change,
      });
    } else {
      onConfirm({
        paymentMethod: 'Tarjeta',
      });
    }
  };
  
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
        if (paymentMethod === 'Efectivo') {
            if (e.key >= '0' && e.key <= '9') { soundService.playSound('type'); handleNumpadInput(e.key); }
            if (e.key === '.' || e.key === ',') { soundService.playSound('type'); handleNumpadInput('.'); }
            if (e.key === 'Backspace') { soundService.playSound('type'); handleBackspace(); }
        }
        if (e.key === 'Enter') handleConfirm();
        if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [paymentMethod, amountReceived, total]);


  return (
    <div 
      className="fixed inset-0 bg-black/80 z-[60] flex justify-center items-end sm:items-center backdrop-blur-sm"
      aria-modal="true"
      role="dialog"
      onClick={onClose}
    >
      <div 
        className="bg-dp-soft-gray dark:bg-dp-charcoal w-full sm:rounded-xl shadow-2xl sm:max-w-4xl sm:m-4 flex flex-col max-h-[95vh] sm:max-h-[85vh] animate-modal-in overflow-hidden" 
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex justify-between items-center p-4 bg-white dark:bg-black/20 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
            <h2 className="text-xl font-bold text-dp-dark-gray dark:text-dp-light-gray">Procesar Pago</h2>
            <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700" aria-label="Cerrar"><X size={24} /></button>
        </div>
        
        {/* Scrollable Content */}
        <div className="flex-grow overflow-y-auto p-4 sm:p-6">
            <div className="flex flex-col lg:flex-row gap-6 h-full">
                
                {/* Left Side: Info & Method */}
                <div className="lg:w-1/2 flex flex-col gap-4">
                    
                    {/* Total Display */}
                    <div className="text-center p-6 bg-white dark:bg-black/40 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
                        <p className="text-sm uppercase tracking-wide text-gray-500 dark:text-gray-400 font-semibold mb-1">Total a Pagar</p>
                        <p className="text-5xl sm:text-6xl font-bold text-dp-blue dark:text-dp-gold tracking-tight">${total.toFixed(2)}</p>
                    </div>

                    {/* Method Selector */}
                    <div className="grid grid-cols-2 gap-3 p-1 bg-gray-200 dark:bg-gray-800 rounded-xl">
                        <button 
                            onClick={() => setPaymentMethod('Efectivo')}
                            className={`flex flex-col sm:flex-row items-center justify-center gap-2 py-3 rounded-lg transition-all ${
                                paymentMethod === 'Efectivo' 
                                ? 'bg-white dark:bg-dp-charcoal text-dp-blue dark:text-dp-gold shadow-md font-bold' 
                                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-300 dark:hover:bg-gray-700'
                            }`}
                        >
                            <DollarSign size={20} />
                            <span>Efectivo</span>
                        </button>
                        <button 
                            onClick={() => setPaymentMethod('Tarjeta')}
                            className={`flex flex-col sm:flex-row items-center justify-center gap-2 py-3 rounded-lg transition-all ${
                                paymentMethod === 'Tarjeta' 
                                ? 'bg-white dark:bg-dp-charcoal text-dp-blue dark:text-dp-gold shadow-md font-bold' 
                                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-300 dark:hover:bg-gray-700'
                            }`}
                        >
                            <CreditCard size={20} />
                            <span>Tarjeta</span>
                        </button>
                    </div>

                    {/* Cash Details (Only if Cash) */}
                    {paymentMethod === 'Efectivo' && (
                        <div className="space-y-3 mt-2">
                            <div className="flex justify-between items-center p-4 bg-white dark:bg-black/20 rounded-xl border border-gray-200 dark:border-gray-700">
                                <span className="font-medium text-gray-600 dark:text-gray-400 text-lg">Recibido:</span>
                                <div className={`text-2xl font-bold font-mono border-b-2 px-2 ${isConfirmDisabled ? 'text-gray-400 border-gray-300' : 'text-dp-dark-gray dark:text-white border-dp-blue dark:border-dp-gold'}`}>
                                    ${amountReceived === '' ? '0.00' : amountReceived}
                                    <span className="animate-pulse text-dp-blue dark:text-dp-gold">|</span>
                                </div>
                            </div>
                            <div className={`flex justify-between items-center p-4 rounded-xl border transition-colors ${
                                change >= 0 
                                ? 'bg-green-50 dark:bg-green-900/10 border-green-200 dark:border-green-900/30' 
                                : 'bg-red-50 dark:bg-red-900/10 border-red-200 dark:border-red-900/30'
                            }`}>
                                <span className={`font-medium text-lg ${change >= 0 ? 'text-green-700 dark:text-green-400' : 'text-red-700 dark:text-red-400'}`}>
                                    {change >= 0 ? 'Cambio:' : 'Faltante:'}
                                </span>
                                <span className={`text-3xl font-bold ${change >= 0 ? 'text-green-700 dark:text-green-400' : 'text-red-700 dark:text-red-400'}`}>
                                    ${Math.abs(change).toFixed(2)}
                                </span>
                            </div>
                        </div>
                    )}
                </div>

                {/* Right Side: Numpad (Only visible for Cash) */}
                {paymentMethod === 'Efectivo' && (
                    <div className="lg:w-1/2 flex flex-col justify-end">
                        <div className="grid grid-cols-3 gap-3 mb-3">
                            <NumpadButton onClick={handleSetExact} variant="action" className="text-sm sm:text-base">Exacto</NumpadButton>
                            {[5, 10, 20, 50, 100].map(val => (
                                total < val && (
                                    <NumpadButton key={val} onClick={() => setAmountReceived(val.toString())} variant="action" className="text-sm sm:text-base">
                                        ${val}
                                    </NumpadButton>
                                )
                            )).filter(Boolean).slice(0, 2)}
                        </div>
                        <div className="grid grid-cols-3 gap-3 bg-gray-200 dark:bg-black/30 p-3 rounded-2xl">
                            {['7', '8', '9', '4', '5', '6', '1', '2', '3'].map(num => (
                                <NumpadButton key={num} onClick={() => handleNumpadInput(num)}>{num}</NumpadButton>
                            ))}
                            <NumpadButton onClick={() => handleNumpadInput('.')}>.</NumpadButton>
                            <NumpadButton onClick={() => handleNumpadInput('0')}>0</NumpadButton>
                            <NumpadButton onClick={handleBackspace} className="text-red-500"><Delete size={28} /></NumpadButton>
                        </div>
                    </div>
                )}
            </div>
        </div>

        {/* Footer: Confirm Button */}
        <div className="p-4 bg-white dark:bg-black/20 border-t border-gray-200 dark:border-gray-700 flex-shrink-0">
             <button 
                type="button" 
                onClick={handleConfirm} 
                disabled={isConfirmDisabled} 
                className="w-full flex items-center justify-center gap-3 py-4 rounded-xl text-xl font-bold transition-all shadow-lg text-dp-light bg-dp-blue hover:bg-blue-700 active:scale-[0.98] dark:text-dp-dark dark:bg-dp-gold dark:hover:bg-yellow-500 disabled:bg-gray-300 dark:disabled:bg-gray-700 disabled:text-gray-500 disabled:shadow-none disabled:cursor-not-allowed"
            >
                Confirmar Pago <ChevronRight size={24} strokeWidth={3} />
            </button>
        </div>

      </div>
    </div>
  );
};

export default PaymentModal;