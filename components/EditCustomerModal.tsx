import React, { useState, useEffect } from 'react';
import type { Customer } from '../types';

interface EditCustomerModalProps {
  customer: Customer;
  onClose: () => void;
  onSave: (customer: Customer) => void;
}

const EditCustomerModal: React.FC<EditCustomerModalProps> = ({ customer, onClose, onSave }) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (customer) {
      setName(customer.name);
      setEmail(customer.email || '');
      setPhone(customer.phone || '');
    }
  }, [customer]);

  const handleSave = () => {
    if (!name.trim()) {
      setError('El nombre del cliente es obligatorio.');
      return;
    }
    onSave({
      ...customer,
      name: name.trim(),
      email: email.trim() || undefined,
      phone: phone.trim() || undefined,
    });
  };

  return (
    <div 
      className="fixed inset-0 bg-black/60 z-[60] flex justify-center items-center"
      aria-modal="true"
      role="dialog"
      onClick={onClose}
    >
      <div className="bg-dp-light dark:bg-dp-charcoal rounded-lg shadow-2xl p-6 w-full max-w-md m-4 animate-modal-in" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-2xl font-bold mb-4 text-dp-dark-gray dark:text-dp-light-gray">Editar Cliente</h2>
        
        {error && <p className="text-red-500 text-sm mb-4">{error}</p>}

        <form onSubmit={(e) => { e.preventDefault(); handleSave(); }}>
          <div className="mb-4">
            <label htmlFor="customer-name-edit" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nombre Completo</label>
            <input
              type="text"
              id="customer-name-edit"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 
                         bg-white dark:bg-gray-800 text-dp-dark-gray dark:text-dp-light-gray
                         border-gray-300 dark:border-gray-600 
                         focus:ring-dp-blue dark:focus:ring-dp-gold focus:border-transparent"
              required
            />
          </div>
          <div className="mb-4">
            <label htmlFor="customer-email-edit" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Correo Electrónico <span className="text-xs text-gray-400">(Opcional)</span></label>
            <input
              type="email"
              id="customer-email-edit"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 
                         bg-white dark:bg-gray-800 text-dp-dark-gray dark:text-dp-light-gray
                         border-gray-300 dark:border-gray-600 
                         focus:ring-dp-blue dark:focus:ring-dp-gold focus:border-transparent"
            />
          </div>
          <div className="mb-4">
            <label htmlFor="customer-phone-edit" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Teléfono <span className="text-xs text-gray-400">(Opcional)</span></label>
            <input
              type="tel"
              id="customer-phone-edit"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 
                         bg-white dark:bg-gray-800 text-dp-dark-gray dark:text-dp-light-gray
                         border-gray-300 dark:border-gray-600 
                         focus:ring-dp-blue dark:focus:ring-dp-gold focus:border-transparent"
            />
          </div>
          
          <div className="flex justify-end gap-4 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-md text-sm font-semibold transition-colors
                         bg-gray-200 text-gray-800 hover:bg-gray-300
                         dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-md text-sm font-semibold transition-colors
                         text-dp-light bg-dp-blue hover:bg-blue-700
                         dark:text-dp-dark dark:bg-dp-gold dark:hover:bg-yellow-500"
            >
              Guardar Cambios
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditCustomerModal;