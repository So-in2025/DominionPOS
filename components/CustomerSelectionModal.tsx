
import React, { useState, useMemo } from 'react';
import type { Customer } from '../types';
import { X, Search, User } from 'lucide-react';

interface CustomerSelectionModalProps {
  customers: Customer[];
  onClose: () => void;
  onSelect: (customer: Customer) => void;
}

const CustomerSelectionModal: React.FC<CustomerSelectionModalProps> = ({ customers, onClose, onSelect }) => {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredCustomers = useMemo(() => {
    return customers.filter(c => 
      c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.email?.toLowerCase().includes(searchTerm.toLowerCase())
    ).sort((a,b) => a.name.localeCompare(b.name));
  }, [customers, searchTerm]);

  return (
    <div
      className="fixed inset-0 bg-black/60 z-50 flex justify-center items-center"
      aria-modal="true"
      role="dialog"
      onClick={onClose}
    >
      <div 
        className="bg-dp-light dark:bg-dp-charcoal rounded-lg shadow-2xl p-6 w-full max-w-xl m-4 flex flex-col max-h-[70vh] animate-modal-in" 
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-bold text-dp-dark-gray dark:text-dp-light-gray">Seleccionar Cliente</h2>
            <button
                onClick={onClose}
                className="p-2 rounded-full text-dp-dark-gray dark:text-dp-light-gray hover:bg-dp-soft-gray dark:hover:bg-gray-700"
                aria-label="Cerrar"
            >
                <X size={24} />
            </button>
        </div>

        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
          <input 
            type="text" 
            placeholder="Buscar por nombre o email..." 
            value={searchTerm} 
            onChange={(e) => setSearchTerm(e.target.value)} 
            className="w-full pl-10 pr-4 py-2 rounded-lg border focus:ring-2 bg-dp-light dark:bg-dp-charcoal border-gray-300 dark:border-gray-600 focus:ring-dp-blue dark:focus:ring-dp-gold focus:border-transparent"
          />
        </div>
        
        <div className="flex-grow overflow-y-auto pr-2 border-t border-b dark:border-gray-700 py-2">
          {filteredCustomers.length === 0 ? (
            <p className="text-center text-gray-500 dark:text-gray-400 py-10">
              {searchTerm ? 'No se encontraron clientes.' : 'No hay clientes registrados.'}
            </p>
          ) : (
            <ul className="space-y-2">
                {filteredCustomers.map(customer => (
                    <li key={customer.id}>
                        <button 
                            onClick={() => onSelect(customer)}
                            className="w-full text-left flex items-center gap-3 p-3 rounded-md hover:bg-dp-soft-gray dark:hover:bg-gray-700 transition-colors"
                        >
                            <div className="p-2 bg-dp-blue/10 dark:bg-dp-gold/10 rounded-full text-dp-blue dark:text-dp-gold">
                                <User size={20} />
                            </div>
                            <div>
                                <p className="font-semibold text-dp-dark-gray dark:text-dp-light-gray">{customer.name}</p>
                                <p className="text-sm text-gray-500 dark:text-gray-400">{customer.email}</p>
                            </div>
                        </button>
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
              Vender a Cliente Genérico
            </button>
        </div>
      </div>
    </div>
  );
};

export default CustomerSelectionModal;
