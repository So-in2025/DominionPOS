
import React, { useEffect, useState } from 'react';
import type { Transaction, BusinessSettings } from '../types';
import { getBusinessSettings } from '../services/settings';
import { PROMOTIONS } from '../constants';
import * as cloudService from '../services/cloud';
import { X, Printer } from 'lucide-react';

interface ReceiptModalProps {
  transaction: Transaction;
  onClose: () => void;
}

const ReceiptModal: React.FC<ReceiptModalProps> = ({ transaction, onClose }) => {
  const [businessSettings, setBusinessSettings] = useState<BusinessSettings | null>(null);
  const hasBranding = cloudService.hasAccess('custom_branding');

  useEffect(() => {
      setBusinessSettings(getBusinessSettings());
  }, []);

  const activePromotionDetails = transaction.activePromotion
    ? PROMOTIONS.find(p => p.id === transaction.activePromotion)
    : null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div
      className="fixed inset-0 bg-black/60 z-50 flex justify-center items-center backdrop-blur-sm"
      aria-modal="true"
      role="dialog"
      onClick={onClose}
    >
      <div 
        className="bg-dp-light dark:bg-dp-charcoal rounded-lg shadow-2xl p-6 w-full max-w-sm m-4 flex flex-col max-h-[90vh] animate-modal-in" 
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center no-print">
            <h2 className="text-lg font-bold">Recibo</h2>
            <div className="flex items-center gap-2">
                {!hasBranding && (
                    <span className="text-[10px] bg-gray-200 dark:bg-gray-800 text-gray-500 px-2 py-1 rounded font-bold uppercase tracking-tighter">Plan Básico</span>
                )}
                <button onClick={handlePrint} className="p-2 rounded-full text-dp-dark-gray dark:text-dp-light-gray hover:bg-dp-soft-gray dark:hover:bg-gray-700">
                    <Printer size={20} />
                </button>
                <button onClick={onClose} className="p-2 rounded-full text-dp-dark-gray dark:text-dp-light-gray hover:bg-dp-soft-gray dark:hover:bg-gray-700">
                    <X size={20} />
                </button>
            </div>
        </div>
        
        <div className="p-4 overflow-y-auto bg-gray-100 dark:bg-black/40 rounded-b-lg">
          <div className="printable-area font-mono text-[11px] text-black bg-white p-6 shadow-inner mx-auto max-w-[280px]">
            <header className="text-center mb-4 border-b border-dashed border-gray-300 pb-4">
              {hasBranding && businessSettings?.logoUrl && (
                  <div className="mb-3 flex justify-center">
                      <img src={businessSettings.logoUrl} alt="Logo" className="h-12 max-w-[80%] object-contain" />
                  </div>
              )}
              
              <h1 className="text-sm font-black uppercase tracking-tight">{businessSettings?.storeName || 'Dominion POS'}</h1>
              
              {hasBranding ? (
                  <div className="mt-1 space-y-0.5 opacity-80">
                    <p>{businessSettings?.address}</p>
                    <p>Tel: {businessSettings?.phone}</p>
                  </div>
              ) : (
                  <p className="mt-2 text-[9px] text-gray-400 italic">COMPROBANTE DE OPERACIÓN</p>
              )}
            </header>

            <div className="mb-4 space-y-1">
              <p className="flex justify-between"><span>Transacción:</span> <span>#{transaction.id.slice(-6)}</span></p>
              <p className="flex justify-between"><span>Fecha:</span> <span>{new Date(transaction.createdAt).toLocaleString('es-ES', { dateStyle: 'short', timeStyle: 'short' })}</span></p>
              {transaction.customerName && <p className="flex justify-between font-bold border-t border-gray-100 pt-1"><span>Cliente:</span> <span>{transaction.customerName}</span></p>}
            </div>

            <table className="w-full mb-4">
              <thead>
                <tr className="border-b-2 border-black">
                  <th className="text-left py-1">DESCRIPCIÓN</th>
                  <th className="text-right py-1">TOTAL</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-dashed divide-gray-200">
                {transaction.items.map(item => (
                  <tr key={item.id}>
                    <td className="py-2">
                        <div className="font-bold">{item.quantity}x {item.name}</div>
                        <div className="text-[9px] text-gray-500">${item.price.toFixed(2)} c/u</div>
                        {item.discount && (
                            <div className="text-[9px] font-bold text-red-600">
                                Dto: {item.discount.type === 'percentage' ? `${item.discount.value}%` : `$${item.discount.value.toFixed(2)}`}
                            </div>
                        )}
                    </td>
                    <td className="text-right align-top py-2 font-bold">${((item.overriddenPrice ?? item.price) * item.quantity).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="space-y-1.5 pt-2 border-t-2 border-black">
                <div className="flex justify-between">
                    <span>SUBTOTAL:</span>
                    <span>${transaction.subtotal.toFixed(2)}</span>
                </div>
                 {transaction.discountAmount > 0 && (
                     <div className="flex justify-between font-bold text-red-600">
                        <span>DESCUENTOS:</span>
                        <span>-${transaction.discountAmount.toFixed(2)}</span>
                    </div>
                 )}
                 {activePromotionDetails && (
                      <div className="flex justify-between text-[9px] italic text-green-700">
                        <span>PROMO: {activePromotionDetails.name}</span>
                        <span>APLICADA</span>
                    </div>
                 )}
                 <div className="flex justify-between font-black text-sm border-y border-black py-1 my-1">
                    <span>TOTAL:</span>
                    <span>${transaction.total.toFixed(2)}</span>
                </div>

                 <div className="flex justify-between pt-1">
                    <span>MÉTODO:</span>
                    <span className="uppercase">{transaction.paymentMethod}</span>
                </div>
                 {transaction.paymentMethod === 'Efectivo' && (
                     <>
                        <div className="flex justify-between">
                            <span>RECIBIDO:</span>
                            <span>${transaction.amountReceived?.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between font-bold">
                            <span>CAMBIO:</span>
                            <span>${transaction.change?.toFixed(2)}</span>
                        </div>
                     </>
                 )}
            </div>

            <footer className="text-center mt-8 pt-4 border-t border-dashed border-gray-300">
              <p className="text-[10px] font-bold">
                  {hasBranding 
                    ? (businessSettings?.receiptFooter || '¡Gracias por su compra!') 
                    : 'Gracias por su preferencia'}
              </p>
              {!hasBranding && (
                  <p className="text-[8px] text-gray-400 mt-4 tracking-widest">DOMINION POS - STARTER</p>
              )}
            </footer>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReceiptModal;
