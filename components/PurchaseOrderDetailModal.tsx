
import React from 'react';
import type { PurchaseOrder } from '../types';
import { X, CheckCircle, Package, Truck, Inbox } from 'lucide-react';

interface PurchaseOrderDetailModalProps {
  po: PurchaseOrder;
  onClose: () => void;
  onUpdateStatus: (po: PurchaseOrder, newStatus: PurchaseOrder['status']) => void;
}

const PurchaseOrderDetailModal: React.FC<PurchaseOrderDetailModalProps> = ({ po, onClose, onUpdateStatus }) => {
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
        <div className="flex justify-between items-start mb-4">
          <div>
            <h2 className="text-2xl font-bold text-dp-dark-gray dark:text-dp-light-gray">
              Detalles de la Orden de Compra
            </h2>
            <p className="text-sm font-semibold text-dp-blue dark:text-dp-gold">{po.id}</p>
          </div>
          <button
              onClick={onClose}
              className="p-2 rounded-full text-dp-dark-gray dark:text-dp-light-gray hover:bg-dp-soft-gray dark:hover:bg-gray-700"
              aria-label="Cerrar"
          >
              <X size={24} />
          </button>
        </div>

        <div className="grid grid-cols-3 gap-4 mb-4 text-sm text-center">
            <InfoBox label="Creada" value={new Date(po.createdAt).toLocaleDateString()} />
            <InfoBox label="Estado" value={po.status} />
            <InfoBox label="Recibida" value={po.receivedAt ? new Date(po.receivedAt).toLocaleDateString() : 'Pendiente'} />
        </div>
        
        <div className="flex-grow overflow-y-auto pr-2 border-t border-b dark:border-gray-700 py-2">
            <h3 className="font-semibold mb-2">Artículos a Ordenar:</h3>
            <table className="w-full text-left">
                <thead className="sticky top-0 bg-dp-light dark:bg-dp-charcoal">
                    <tr>
                        <th className="p-2 font-semibold text-sm">Producto</th>
                        <th className="p-2 font-semibold text-sm text-right">Cantidad</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                    {po.items.map(item => (
                        <tr key={item.productId}>
                            <td className="p-2 font-medium">{item.name}</td>
                            <td className="p-2 text-right font-bold">{item.quantity}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>

        <div className="mt-6 flex justify-between items-center">
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
            <div className="flex gap-4">
                {po.status === 'Borrador' && (
                    <button
                        onClick={() => onUpdateStatus(po, 'Ordenado')}
                        className="flex items-center gap-2 px-4 py-2 rounded-md text-sm font-semibold transition-colors text-dp-light bg-dp-blue hover:bg-blue-700 dark:text-dp-dark dark:bg-dp-gold dark:hover:bg-yellow-500"
                    >
                        <Truck size={18} /> Marcar como Ordenado
                    </button>
                )}
                 {po.status === 'Ordenado' && (
                    <button
                        onClick={() => onUpdateStatus(po, 'Recibido')}
                        className="flex items-center gap-2 px-4 py-2 rounded-md text-sm font-semibold transition-colors text-white bg-green-600 hover:bg-green-700"
                    >
                       <Inbox size={18} /> Recibir Stock
                    </button>
                )}
                 {po.status === 'Recibido' && (
                    <p className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-green-700 dark:text-green-300">
                       <CheckCircle size={18} /> Orden Completada
                    </p>
                )}
            </div>
        </div>
      </div>
    </div>
  );
};

const InfoBox: React.FC<{label: string, value: string}> = ({ label, value }) => (
    <div className="bg-dp-soft-gray dark:bg-black p-2 rounded-md">
        <p className="text-xs text-gray-500 dark:text-gray-400">{label}</p>
        <p className="font-semibold">{value}</p>
    </div>
);

export default PurchaseOrderDetailModal;
