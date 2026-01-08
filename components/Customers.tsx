
import React, { useState, useMemo } from 'react';
import type { Customer } from '../types';
import { Users, PlusCircle, Search, Mail, Phone, ChevronRight, Award } from 'lucide-react';

interface CustomersProps {
  customers: Customer[];
  onAddCustomer: () => void;
  onViewCustomer: (customer: Customer) => void;
}

const Customers: React.FC<CustomersProps> = ({ customers, onAddCustomer, onViewCustomer }) => {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredCustomers = useMemo(() => {
    return customers.filter(c => 
      c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.phone?.includes(searchTerm)
    );
  }, [customers, searchTerm]);

  return (
    <div className="flex flex-col h-full">
      <div className="flex justify-between items-center mb-4 flex-shrink-0 gap-4 flex-wrap">
        <div className="relative w-full sm:w-auto sm:flex-grow max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
          <input 
            type="text" 
            placeholder="Buscar cliente..." 
            value={searchTerm} 
            onChange={(e) => setSearchTerm(e.target.value)} 
            className="w-full pl-10 pr-4 py-2 rounded-lg border focus:ring-2 bg-dp-light dark:bg-dp-charcoal border-gray-300 dark:border-gray-600 focus:ring-dp-blue dark:focus:ring-dp-gold focus:border-transparent"
          />
        </div>
        <button onClick={onAddCustomer} className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-colors bg-dp-blue text-dp-light hover:bg-blue-700 dark:bg-dp-gold dark:text-dp-dark dark:hover:bg-yellow-500 focus:outline-none focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-dp-dark focus:ring-dp-blue dark:focus:ring-dp-gold">
          <PlusCircle size={18} />
          <span>Nuevo Cliente</span>
        </button>
      </div>

      {filteredCustomers.length === 0 ? (
        <div className="flex-grow flex flex-col items-center justify-center text-center text-gray-500 dark:text-gray-400">
          <Users size={48} className="mb-4 opacity-50" />
          <h3 className="font-semibold text-lg text-dp-dark-gray dark:text-dp-light-gray">No hay clientes registrados</h3>
          <p>{searchTerm ? 'Intente con otro término de búsqueda.' : 'Haga clic en "Nuevo Cliente" para añadir el primero.'}</p>
        </div>
      ) : (
        <div className="flex-grow overflow-y-auto pr-2">
          <ul className="space-y-3">
            {filteredCustomers.map((customer) => (
              <li key={customer.id}>
                <button 
                  onClick={() => onViewCustomer(customer)}
                  className="w-full text-left p-4 rounded-lg bg-dp-light dark:bg-dp-charcoal shadow-md hover:shadow-lg hover:ring-2 hover:ring-dp-blue dark:hover:ring-dp-gold transition-all"
                >
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="font-bold text-lg text-dp-dark-gray dark:text-dp-light-gray">{customer.name}</p>
                      <div className="flex items-center gap-4">
                        <p className="text-sm text-gray-500 dark:text-gray-400">Cliente desde: {new Date(customer.createdAt).toLocaleDateString()}</p>
                        <div className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-400 font-semibold">
                          <Award size={12}/>
                          <span>{customer.loyaltyPoints || 0} pts</span>
                        </div>
                      </div>
                    </div>
                    <ChevronRight size={24} className="text-gray-400" />
                  </div>
                  <div className="mt-2 pt-2 border-t border-gray-200 dark:border-gray-700/50 flex flex-col sm:flex-row sm:items-center gap-x-4 gap-y-1 text-sm">
                    {customer.email && <span className="flex items-center gap-2 text-gray-600 dark:text-gray-300"><Mail size={14}/> {customer.email}</span>}
                    {customer.phone && <span className="flex items-center gap-2 text-gray-600 dark:text-gray-300"><Phone size={14}/> {customer.phone}</span>}
                  </div>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default Customers;