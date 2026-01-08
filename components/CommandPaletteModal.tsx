
import React, { useState, useEffect, useMemo, useRef } from 'react';
import type { Product, User } from '../types';
import { Search, PlusCircle, History, BookCheck, Settings, SunMoon, ShoppingCart, Package } from 'lucide-react';

type Command = {
  id: string;
  name: string;
  section: string;
  icon: React.ReactNode;
  adminOnly?: boolean;
};

type SearchableItem = (Product & { type: 'product' }) | (Command & { type: 'command' });

interface CommandPaletteModalProps {
  products: Product[];
  currentUser: User;
  onClose: () => void;
  onSelect: (item: Product | { id: string }) => void;
}

const CommandPaletteModal: React.FC<CommandPaletteModalProps> = ({ products, currentUser, onClose, onSelect }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const resultsRef = useRef<HTMLUListElement>(null);

  const commands: Command[] = useMemo(() => [
    { id: 'action-add-product', name: 'Añadir Nuevo Producto', section: 'Acciones', icon: <PlusCircle size={18} />, adminOnly: true },
    { id: 'action-view-history', name: 'Ver Historial de Ventas', section: 'Acciones', icon: <History size={18} /> },
    { id: 'action-view-summary', name: 'Ver Cierre de Caja', section: 'Acciones', icon: <BookCheck size={18} /> },
    { id: 'action-complete-sale', name: 'Completar Venta Actual (Pagar)', section: 'Acciones', icon: <ShoppingCart size={18} /> },
    { id: 'action-view-dashboard', name: 'Ir al Dashboard', section: 'Navegación', icon: <Settings size={18} />, adminOnly: true },
    { id: 'action-view-inventory', name: 'Ir a Inventario', section: 'Navegación', icon: <Package size={18} />, adminOnly: true },
    { id: 'action-go-to-settings', name: 'Configuración y Datos', section: 'Sistema', icon: <Settings size={18} />, adminOnly: true },
    { id: 'action-toggle-theme', name: 'Cambiar Tema (Claro/Oscuro)', section: 'Sistema', icon: <SunMoon size={18} /> },
  ], []);

  const filteredItems = useMemo((): SearchableItem[] => {
    const lowercasedTerm = searchTerm.toLowerCase();
    const isAdmin = currentUser.role === 'admin';

    // Filter available commands based on role
    const availableCommands = commands.filter(cmd => !cmd.adminOnly || isAdmin);

    if (!lowercasedTerm) {
      return [
        ...availableCommands.map(cmd => ({ ...cmd, type: 'command' as const })),
        ...products.map(p => ({ ...p, type: 'product' as const })),
      ];
    }
    
    const filteredCommands = availableCommands
      .filter(cmd => cmd.name.toLowerCase().includes(lowercasedTerm))
      .map(cmd => ({ ...cmd, type: 'command' as const }));

    const filteredProducts = products
      .filter(p => p.name.toLowerCase().includes(lowercasedTerm) || p.category.toLowerCase().includes(lowercasedTerm))
      .map(p => ({ ...p, type: 'product' as const }));

    return [...filteredCommands, ...filteredProducts];
  }, [searchTerm, products, commands, currentUser.role]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);
  
  useEffect(() => {
    setActiveIndex(0);
  }, [searchTerm]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setActiveIndex(prev => (prev + 1) % filteredItems.length);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setActiveIndex(prev => (prev - 1 + filteredItems.length) % filteredItems.length);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        const selectedItem = filteredItems[activeIndex];
        if (selectedItem) {
           if(selectedItem.type === 'product') {
             onSelect(selectedItem);
           } else {
             onSelect({ id: selectedItem.id });
           }
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeIndex, filteredItems, onSelect]);

  useEffect(() => {
    resultsRef.current?.children[activeIndex]?.scrollIntoView({
        block: 'nearest',
    });
  }, [activeIndex]);

  return (
    <div
      className="fixed inset-0 bg-black/70 z-[60] flex justify-center items-start pt-20"
      aria-modal="true"
      role="dialog"
      onClick={onClose}
    >
      <div 
        className="bg-dp-light dark:bg-dp-charcoal rounded-lg shadow-2xl w-full max-w-2xl m-4 animate-modal-in flex flex-col max-h-[60vh]" 
        onClick={(e) => e.stopPropagation()}
      >
        <div className="relative p-3 border-b border-gray-200 dark:border-gray-700">
            <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            <input
                ref={inputRef}
                type="text"
                placeholder="Buscar productos o ejecutar comandos..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 text-lg bg-transparent focus:outline-none dark:text-white"
            />
        </div>
        <ul ref={resultsRef} className="flex-grow overflow-y-auto p-2 custom-scrollbar">
            {filteredItems.length === 0 ? (
                <p className="text-center text-gray-500 py-4">No se encontraron resultados.</p>
            ) : (
                filteredItems.map((item, index) => (
                    <li key={item.id}
                        onMouseEnter={() => setActiveIndex(index)}
                        onClick={() => item.type === 'product' ? onSelect(item) : onSelect({ id: item.id })}
                        className={`flex justify-between items-center p-3 rounded-md cursor-pointer ${
                            activeIndex === index ? 'bg-dp-blue/10 dark:bg-dp-gold/10 text-dp-blue dark:text-dp-gold' : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                        }`}
                    >
                        <div className="flex items-center gap-3">
                           <span className="text-gray-500 dark:text-gray-400">{item.type === 'product' ? <Package size={18} /> : item.icon}</span>
                           <span>{item.name}</span>
                        </div>
                        {item.type === 'product' && <span className="text-sm font-semibold">${item.price.toFixed(2)}</span>}
                        {item.type === 'command' && <span className="text-xs px-2 py-0.5 rounded-full bg-dp-soft-gray dark:bg-gray-700 text-gray-500 dark:text-gray-400">{item.section}</span>}
                    </li>
                ))
            )}
        </ul>
      </div>
    </div>
  );
};

export default CommandPaletteModal;
