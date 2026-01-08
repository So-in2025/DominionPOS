
import React from 'react';
import type { Transaction } from '../types';
import { CheckCircle, Printer, X, ShoppingBag } from 'lucide-react';

interface PostSaleConfirmationModalProps {
  transaction: Transaction;
  onClose: () => void;
  onPrintReceipt: () => void;
}

const PostSaleConfirmationModal: React.FC<PostSaleConfirmationModalProps> = ({ transaction, onClose, onPrintReceipt }) => {
  return (
    <div 
      className="fixed inset-0 bg-black/60 z-50 flex justify-center items-center"
      aria-modal="true"
      role="dialog"
    >
      <div 
        className="bg-dp-light dark:bg-dp-charcoal rounded-lg shadow-2xl p-6 w-full max-w-md m-4 animate-modal-in" 
        onClick={(e) => e.stopPropagation()}
      >
        <div className="text-center">
            <CheckCircle size={48} className="mx-auto text-green-500 mb-4" />
            <h2 className="text-2xl font-bold text-dp-dark-gray dark:text-dp-light-gray">Venta Completada</h2>
            
            <div className="my-6">
                <p className="text-lg text-gray-600 dark:text-gray-400">Total Pagado</p>
                <p className="text-5xl font-bold text-dp-blue dark:text-dp-gold">${transaction.total.toFixed(2)}</p>
            </div>

            {transaction.paymentMethod === 'Efectivo' && transaction.change !== undefined && transaction.change > 0 && (
                <div className="p-4 bg-dp-soft-gray dark:bg-black rounded-lg">
                    <p className="text-lg font-medium text-gray-700 dark:text-gray-300">Cambio a Entregar</p>
                    <p className="text-3xl font-bold text-green-600 dark:text-green-400">${transaction.change.toFixed(2)}</p>
                </div>
            )}
        </div>
        
        <div className="mt-8 flex flex-col sm:flex-row gap-4">
            <button
                type="button"
                onClick={onPrintReceipt}
                className="w-full flex justify-center items-center gap-2 px-6 py-3 rounded-lg text-sm font-semibold transition-colors
                           bg-gray-200 text-gray-800 hover:bg-gray-300
                           dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"
            >
                <Printer size={18} /> Imprimir Recibo
            </button>
            <button
                type="button"
                onClick={onClose}
                className="w-full flex justify-center items-center gap-2 px-6 py-3 rounded-lg text-sm font-bold transition-colors
                           text-dp-light bg-dp-blue hover:bg-blue-700
                           dark:text-dp-dark dark:bg-dp-gold dark:hover:bg-yellow-500"
            >
                <ShoppingBag size={18} /> Nueva Venta
            </button>
        </div>

      </div>
    </div>
  );
};

export default PostSaleConfirmationModal;
