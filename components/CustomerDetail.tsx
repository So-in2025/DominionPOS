
import React, { useState, useEffect } from 'react';
import type { Customer, CustomerDetails, Transaction } from '../types';
import * as dbService from '../services/db';
import { ArrowLeft, Mail, Phone, DollarSign, Hash, Calendar, ShoppingBag, ChevronDown, ChevronUp, Pencil, Trash2, Award } from 'lucide-react';

interface CustomerDetailProps {
  customer: Customer;
  onBack: () => void;
  onEdit: (customer: Customer) => void;
  onDelete: (customerId: string) => void;
}

const StatCard: React.FC<{ title: string; value: string; icon: React.ReactNode; }> = ({ title, value, icon }) => (
    <div className="bg-dp-light dark:bg-dp-charcoal p-4 rounded-lg shadow-md flex items-center gap-4">
        <div className="p-3 rounded-full bg-dp-blue/10 dark:bg-dp-gold/10 text-dp-blue dark:text-dp-gold">
            {icon}
        </div>
        <div>
            <p className="text-sm text-gray-500 dark:text-gray-400">{title}</p>
            <p className="text-xl font-bold text-dp-dark-gray dark:text-dp-light-gray">{value}</p>
        </div>
    </div>
);

const TransactionItem: React.FC<{ tx: Transaction }> = ({ tx }) => {
    const [isExpanded, setIsExpanded] = useState(false);
    return (
        <li className="rounded-md bg-dp-soft-gray dark:bg-gray-800/50 transition-shadow shadow-sm">
            <button 
                className="w-full flex justify-between items-center p-3 text-left"
                onClick={() => setIsExpanded(!isExpanded)}
            >
                <div className="flex-1">
                    <p className="font-semibold text-gray-800 dark:text-gray-200">{new Date(tx.createdAt).toLocaleString()}</p>
                </div>
                <div className="text-right mx-4">
                    <p className="font-bold text-lg text-dp-blue dark:text-dp-gold">${tx.total.toFixed(2)}</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">{tx.items.length} {tx.items.length === 1 ? 'artículo' : 'artículos'}</p>
                </div>
                <div className="text-gray-500 dark:text-gray-400">
                    {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                </div>
            </button>
            {isExpanded && (
                <div className="px-4 pb-3 border-t border-gray-200 dark:border-gray-700">
                    <h4 className="font-semibold text-md my-2 text-dp-dark-gray dark:text-dp-light-gray">Artículos:</h4>
                    <ul className="space-y-1 text-sm">
                        {tx.items.map(item => (
                            <li key={item.id} className="flex justify-between items-center text-gray-700 dark:text-gray-300">
                            <span>{item.name} <span className="text-gray-500 dark:text-gray-400">x{item.quantity}</span></span>
                            <span>${(item.price * item.quantity).toFixed(2)}</span>
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </li>
    );
};

const CustomerDetail: React.FC<CustomerDetailProps> = ({ customer, onBack, onEdit, onDelete }) => {
  const [details, setDetails] = useState<CustomerDetails | null>(null);

  useEffect(() => {
    const customerDetails = dbService.getCustomerDetails(customer.id);
    setDetails(customerDetails);
  }, [customer]);

  if (!details) {
    return <div>Cargando...</div>;
  }

  const { stats, transactions } = details;

  return (
    <div className="flex flex-col h-full animate-list-item-in">
      <div className="mb-4 flex-shrink-0">
        <button onClick={onBack} className="flex items-center gap-2 text-sm font-semibold text-dp-blue dark:text-dp-gold hover:underline">
          <ArrowLeft size={18} />
          Volver a la lista de clientes
        </button>
      </div>

      <div className="mb-6 p-4 rounded-lg bg-dp-light dark:bg-dp-charcoal shadow-md">
          <div className="flex justify-between items-start">
            <div>
                <h3 className="text-xl font-bold text-dp-dark-gray dark:text-dp-light-gray">{customer.name}</h3>
                <div className="mt-2 flex flex-col sm:flex-row sm:items-center gap-x-4 gap-y-1 text-sm">
                    {customer.email && <span className="flex items-center gap-2 text-gray-600 dark:text-gray-300"><Mail size={14}/> {customer.email}</span>}
                    {customer.phone && <span className="flex items-center gap-2 text-gray-600 dark:text-gray-300"><Phone size={14}/> {customer.phone}</span>}
                </div>
            </div>
            <div className="flex items-center gap-2">
                <button onClick={() => onEdit(customer)} className="p-2 rounded-full text-dp-dark-gray dark:text-dp-light-gray hover:bg-dp-soft-gray dark:hover:bg-gray-700">
                    <Pencil size={18} />
                </button>
                 <button onClick={() => onDelete(customer.id)} className="p-2 rounded-full text-red-500 hover:bg-red-500/10">
                    <Trash2 size={18} />
                </button>
            </div>
          </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard title="Total Gastado" value={`$${stats.totalSpent.toFixed(2)}`} icon={<DollarSign />} />
        <StatCard title="Puntos de Lealtad" value={details.customer.loyaltyPoints?.toString() || '0'} icon={<Award />} />
        <StatCard title="Total de Visitas" value={stats.transactionCount.toString()} icon={<Hash />} />
        <StatCard title="Última Visita" value={new Date(stats.lastVisit).toLocaleDateString()} icon={<ShoppingBag />} />
      </div>

      <h3 className="text-lg font-semibold mb-2">Historial de Compras</h3>
      <div className="flex-grow overflow-y-auto pr-2 border-t border-gray-200 dark:border-gray-700 pt-2">
         {transactions.length === 0 ? (
            <div className="text-center py-10 text-gray-500 dark:text-gray-400">
                <p>Este cliente aún no ha realizado ninguna compra.</p>
            </div>
         ) : (
            <ul className="space-y-2">
                {transactions.map(tx => <TransactionItem key={tx.id} tx={tx} />)}
            </ul>
         )}
      </div>
    </div>
  );
};

export default CustomerDetail;