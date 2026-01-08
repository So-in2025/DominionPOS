
import React, { useEffect, useState } from 'react';
import type { Transaction, BusinessSettings } from '../types';
import { getBusinessSettings } from '../services/settings';
import { PROMOTIONS } from '../constants';
import { X, Printer } from 'lucide-react';

interface ReceiptModalProps {
  transaction: Transaction;
  onClose: () => void;
}

const ReceiptModal: React.FC<ReceiptModalProps> = ({ transaction, onClose }) => {
  const [businessSettings, setBusinessSettings] = useState<BusinessSettings | null>(null);

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
      className="fixed inset-0 bg-black/60 z-50 flex justify-center items-center"
      aria-modal="true"
      role="dialog"
      onClick={onClose}
    >
      <div 
        className="bg-dp-light dark:bg-dp-charcoal rounded-lg shadow-2xl w-full max-w-sm m-4 flex flex-col max-h-[90vh] animate-modal-in" 
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center no-print">
            <h2 className="text-lg font-bold">Recibo de Venta</h2>
            <div className="flex items-center gap-2">
                <button onClick={handlePrint} className="p-2 rounded-full text-dp-dark-gray dark:text-dp-light-gray hover:bg-dp-soft-gray dark:hover:bg-gray-700">
                    <Printer size={20} />
                </button>
                <button onClick={onClose} className="p-2 rounded-full text-dp-dark-gray dark:text-dp-light-gray hover:bg-dp-soft-gray dark:hover:bg-gray-700">
                    <X size={20} />
                </button>
            </div>
        </div>
        
        <div className="p-4 overflow-y-auto">
          <div className="printable-area font-mono text-xs text-black bg-white p-2">
            <header className="text-center mb-4">
              {businessSettings?.logoUrl && (
                  <div className="mb-2 flex justify-center">
                      <img src={businessSettings.logoUrl} alt="Logo" className="h-16 max-w-[80%] object-contain" />
                  </div>
              )}
              <h1 className="text-lg font-bold">{businessSettings?.storeName || 'Dominion Point'}</h1>
              <p>{businessSettings?.address || 'Dirección no configurada'}</p>
              <p>Tel: {businessSettings?.phone || 'Sin teléfono'}</p>
            </header>

            <div className="border-b border-dashed border-black pb-2 mb-2 text-xs">
              <p>ID Venta: {transaction.id}</p>
              <p>Fecha: {new Date(transaction.createdAt).toLocaleString('es-ES')}</p>
              {transaction.customerName && <p>Cliente: {transaction.customerName}</p>}
            </div>

            <table className="w-full text-xs mb-2">
              <thead>
                <tr>
                  <th className="text-left font-normal">Cant.</th>
                  <th className="text-left font-normal">Artículo</th>
                  <th className="text-right font-normal">Total</th>
                </tr>
              </thead>
              <tbody className="border-t border-b border-dashed border-black">
                {transaction.items.map(item => (
                  <tr key={item.id}>
                    <td className="align-top py-1">{item.quantity}x</td>
                    <td className="py-1">
                        {item.name}
                        {item.discount && (
                            <div className="pl-2">
                                - Dto: {item.discount.type === 'percentage' ? `${item.discount.value}%` : `$${item.discount.value.toFixed(2)}`}
                            </div>
                        )}
                    </td>
                    <td className="text-right align-top py-1">${(item.price * item.quantity).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="text-xs space-y-1">
                <div className="flex justify-between">
                    <span>Subtotal:</span>
                    <span>${transaction.subtotal.toFixed(2)}</span>
                </div>
                 {transaction.discountAmount > 0 && (
                     <div className="flex justify-between">
                        <span>Descuentos:</span>
                        <span>-${transaction.discountAmount.toFixed(2)}</span>
                    </div>
                 )}
                 {activePromotionDetails && (
                      <div className="flex justify-between">
                        <span>Promo ({activePromotionDetails.name}):</span>
                        <span>Aplicada</span>
                    </div>
                 )}
                 <div className="border-t border-dashed border-black my-1"></div>
                 <div className="flex justify-between font-bold text-sm">
                    <span>TOTAL:</span>
                    <span>${transaction.total.toFixed(2)}</span>
                </div>
                <div className="border-t border-dashed border-black my-1"></div>

                 <div className="flex justify-between">
                    <span>Método Pago:</span>
                    <span>{transaction.paymentMethod}</span>
                </div>
                 {transaction.paymentMethod === 'Efectivo' && (
                     <>
                        <div className="flex justify-between">
                            <span>Recibido:</span>
                            <span>${transaction.amountReceived?.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between">
                            <span>Cambio:</span>
                            <span>${transaction.change?.toFixed(2)}</span>
                        </div>
                     </>
                 )}
            </div>

            <footer className="text-center mt-4 pt-2 border-t border-dashed border-black">
              <p>{businessSettings?.receiptFooter || '¡Gracias por su compra!'}</p>
            </footer>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReceiptModal;
