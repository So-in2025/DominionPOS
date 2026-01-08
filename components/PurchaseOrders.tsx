
import React from 'react';
import type { PurchaseOrder } from '../types';
import { Truck, ChevronRight } from 'lucide-react';

interface PurchaseOrdersProps {
  purchaseOrders: PurchaseOrder[];
  onViewDetails: (po: PurchaseOrder) => void;
}

const PurchaseOrders: React.FC<PurchaseOrdersProps> = ({ purchaseOrders, onViewDetails }) => {

  const getStatusBadgeColor = (status: PurchaseOrder['status']) => {
    switch (status) {
      case 'Borrador': return 'bg-gray-200 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
      case 'Ordenado': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300';
      case 'Recibido': return 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300';
    }
  };

  return (
    <div className="flex flex-col h-full">
      {purchaseOrders.length === 0 ? (
        <div className="flex-grow flex flex-col items-center justify-center text-center text-gray-500 dark:text-gray-400">
          <Truck size={48} className="mb-4 opacity-50" />
          <h3 className="font-semibold text-lg text-dp-dark-gray dark:text-dp-light-gray">No hay Órdenes de Compra</h3>
          <p>Genere una desde el informe de stock bajo en el Dashboard.</p>
        </div>
      ) : (
        <div className="flex-grow overflow-y-auto pr-2">
          <ul className="space-y-3">
            {purchaseOrders.map((po) => (
              <li key={po.id}>
                <button 
                  onClick={() => onViewDetails(po)}
                  className="w-full flex justify-between items-center p-4 text-left rounded-lg bg-dp-light dark:bg-dp-charcoal shadow-md hover:shadow-lg transition-shadow"
                >
                  <div className="flex-1">
                    <p className="font-bold text-dp-blue dark:text-dp-gold">{po.id}</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Creada: {new Date(po.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="mx-4 text-center">
                    <p className="text-sm text-gray-500 dark:text-gray-400">Items</p>
                    <p className="font-bold text-lg">{po.items.length}</p>
                  </div>
                   <div className="mx-4 text-center">
                    <span className={`px-3 py-1 text-sm font-bold rounded-full ${getStatusBadgeColor(po.status)}`}>
                      {po.status}
                    </span>
                  </div>
                  <ChevronRight size={24} className="text-gray-400" />
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default PurchaseOrders;
