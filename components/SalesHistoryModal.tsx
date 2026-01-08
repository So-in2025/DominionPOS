
import React, { useState, useEffect } from 'react';
import type { Transaction } from '../types';
import * as dbService from '../services/db';
import { X, ChevronDown, ChevronUp, DollarSign, CreditCard, User, RotateCcw, TrendingUp, Gift, Printer } from 'lucide-react';
import { PROMOTIONS } from '../constants';

interface SalesHistoryModalProps {
  onClose: () => void;
  onReturn: (transaction: Transaction) => void;
  onPrintReceipt: (transaction: Transaction) => void;
}

const SalesHistoryModal: React.FC<SalesHistoryModalProps> = ({ onClose, onReturn, onPrintReceipt }) => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [expandedTxId, setExpandedTxId] = useState<string | null>(null);

  useEffect(() => {
    setTransactions(dbService.getTransactions());
  }, []);

  return (
    <div
      className="fixed inset-0 bg-black/60 z-50 flex justify-center items-center"
      aria-modal="true"
      role="dialog"
      onClick={onClose}
    >
      <div 
        className="bg-dp-light dark:bg-dp-charcoal rounded-lg shadow-2xl p-6 w-full max-w-2xl m-4 flex flex-col max-h-[80vh] animate-modal-in" 
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-bold text-dp-dark-gray dark:text-dp-light-gray">Historial de Ventas</h2>
            <button
                onClick={onClose}
                className="p-2 rounded-full text-dp-dark-gray dark:text-dp-light-gray hover:bg-dp-soft-gray dark:hover:bg-gray-700"
                aria-label="Cerrar"
            >
                <X size={24} />
            </button>
        </div>
        
        <div className="flex-grow overflow-y-auto pr-2">
          {transactions.length === 0 ? (
            <p className="text-center text-gray-500 dark:text-gray-400 mt-10">No hay ventas registradas.</p>
          ) : (
            <ul className="space-y-2">
              {transactions.map((tx) => (
                <li key={tx.id} className="rounded-md bg-dp-soft-gray dark:bg-gray-800/50 transition-shadow shadow-sm">
                  <div className="flex justify-between items-center p-3 text-left">
                    <div className="flex items-center gap-3">
                        {tx.type === 'refund' 
                            ? <div className="p-2 rounded-full bg-orange-500/10 text-orange-500"><RotateCcw size={20}/></div>
                            : <div className="p-2 rounded-full bg-green-500/10 text-green-500"><TrendingUp size={20}/></div>
                        }
                        <div className="flex-1">
                          <p className={`font-semibold text-sm ${tx.type === 'refund' ? 'text-orange-500' : 'text-gray-500 dark:text-gray-400'}`}>
                            {tx.type === 'refund' ? 'Reembolso a Venta' : 'ID:'} {tx.type === 'refund' ? tx.originalTransactionId : tx.id}
                          </p>
                          <p className="text-gray-800 dark:text-gray-200">{new Date(tx.createdAt).toLocaleString()}</p>
                        </div>
                    </div>
                    <div className="text-right mx-4">
                      <p className={`font-bold text-lg ${tx.type === 'refund' ? 'text-orange-400' : 'text-dp-blue dark:text-dp-gold'}`}>
                        {tx.total < 0 && '-'}${Math.abs(tx.total).toFixed(2)}
                      </p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">{tx.items.length} {tx.items.length === 1 ? 'artículo' : 'artículos'}</p>
                    </div>
                    <button 
                        className="text-gray-500 dark:text-gray-400 p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700"
                        onClick={() => setExpandedTxId(expandedTxId === tx.id ? null : tx.id)}
                    >
                      {expandedTxId === tx.id ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                    </button>
                  </div>
                  {expandedTxId === tx.id && (
                    <div id={`tx-details-${tx.id}`} className="px-4 pb-3 border-t border-gray-200 dark:border-gray-700">
                      <div className="flex justify-between items-center">
                        <h4 className="font-semibold text-md my-2 text-dp-dark-gray dark:text-dp-light-gray">Detalles de la Transacción:</h4>
                        {tx.type === 'sale' && (
                            <div className="flex items-center gap-2">
                                <button onClick={() => onPrintReceipt(tx)} className="flex items-center gap-2 px-3 py-1 rounded-lg text-sm font-semibold transition-colors bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-900/50 dark:text-gray-300 dark:hover:bg-gray-900/80">
                                    <Printer size={14} />
                                </button>
                                <button onClick={() => onReturn(tx)} className="flex items-center gap-2 px-3 py-1 rounded-lg text-sm font-semibold transition-colors bg-orange-100 text-orange-700 hover:bg-orange-200 dark:bg-orange-900/50 dark:text-orange-300 dark:hover:bg-orange-900/80">
                                    <RotateCcw size={14} /> Reembolsar
                                </button>
                            </div>
                        )}
                      </div>
                      <ul className="space-y-1 mb-3 text-sm">
                        {tx.items.map(item => {
                           const effectivePrice = item.overriddenPrice ?? item.price;
                           const lineTotal = effectivePrice * item.quantity;
                           let discountedTotal = lineTotal;
                            if(item.discount && tx.type === 'sale') { // Discounts only apply to sales
                                if(item.discount.type === 'percentage') {
                                    discountedTotal = lineTotal * (1 - item.discount.value / 100);
                                } else {
                                    discountedTotal = Math.max(0, lineTotal - item.discount.value);
                                }
                            }
                          return (
                          <li key={item.id} className="flex justify-between items-center text-gray-700 dark:text-gray-300">
                            <span>{item.name} <span className="text-gray-500 dark:text-gray-400">x{item.quantity}</span> 
                            {item.overriddenPrice && <s className="ml-1 text-gray-400">(${item.price.toFixed(2)})</s>}
                            {item.discount && <span className="text-red-500 font-semibold ml-1">({item.discount.type === 'percentage' ? `${item.discount.value}%` : `-$${item.discount.value.toFixed(2)}`})</span>}
                            </span>
                            <span>${discountedTotal.toFixed(2)}</span>
                          </li>
                        )})}
                      </ul>
                      {tx.type === 'sale' && (
                       <div className="border-t border-gray-300 dark:border-gray-600 pt-2 text-sm font-medium space-y-1">
                          <div className="flex justify-between text-gray-600 dark:text-gray-400"><span>Subtotal:</span><span>${tx.subtotal.toFixed(2)}</span></div>
                          {tx.discountAmount > 0 && <div className="flex justify-between text-red-600 dark:text-red-400"><span>Descuento Total {tx.globalDiscount && `(${tx.globalDiscount.type === 'percentage' ? `${tx.globalDiscount.value}%` : `-$${tx.globalDiscount.value.toFixed(2)}`})`}:</span><span>-${tx.discountAmount.toFixed(2)}</span></div>}
                          {tx.activePromotion && <div className="flex justify-between text-green-600 dark:text-green-400"><span><Gift size={14} className="inline mr-1"/>Promoción:</span><span className="font-semibold">{PROMOTIONS.find(p=>p.id === tx.activePromotion)?.name}</span></div>}
                          <div className="flex justify-between font-bold text-base text-dp-dark-gray dark:text-dp-light-gray pt-1 border-t border-gray-300 dark:border-gray-600 mt-1"><span>Total:</span><span>${tx.total.toFixed(2)}</span></div>
                      </div>
                      )}
                      <div className="border-t border-gray-300 dark:border-gray-600 pt-2 text-sm mt-2">
                         {tx.customerName && (
                           <div className="flex items-center justify-between mb-1">
                             <span className="flex items-center gap-2 text-gray-600 dark:text-gray-400"><User size={16} />Cliente:</span>
                             <span className="font-semibold">{tx.customerName}</span>
                           </div>
                         )}
                         <div className="flex items-center justify-between">
                           <span className="flex items-center gap-2 text-gray-600 dark:text-gray-400">{tx.paymentMethod === 'Efectivo' ? <DollarSign size={16} /> : tx.paymentMethod === 'Tarjeta' ? <CreditCard size={16} /> : <RotateCcw size={16}/>}Método:</span>
                           <span className="font-semibold">{tx.paymentMethod}</span>
                         </div>
                         {tx.paymentMethod === 'Efectivo' && (
                           <>
                            <div className="flex items-center justify-between mt-1"><span className="text-gray-600 dark:text-gray-400">Recibido:</span><span className="font-semibold">${tx.amountReceived?.toFixed(2) ?? 'N/A'}</span></div>
                            <div className="flex items-center justify-between mt-1"><span className="text-gray-600 dark:text-gray-400">Cambio:</span><span className="font-semibold">${tx.change?.toFixed(2) ?? 'N/A'}</span></div>
                           </>
                         )}
                      </div>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="mt-6 flex justify-end">
             <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-md text-sm font-semibold transition-colors
                         bg-gray-200 text-gray-800 hover:bg-gray-300
                         dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600
                         focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500
                         dark:focus:ring-offset-dp-charcoal"
            >
              Cerrar
            </button>
        </div>
      </div>
    </div>
  );
};

export default SalesHistoryModal;
