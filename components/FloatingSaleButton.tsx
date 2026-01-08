
import React, { useEffect, useState } from 'react';
import { ShoppingCart } from 'lucide-react';

interface FloatingSaleButtonProps {
  itemCount: number;
  total: number;
  onClick: () => void;
}

const FloatingSaleButton: React.FC<FloatingSaleButtonProps> = ({ itemCount, total, onClick }) => {
  const [bump, setBump] = useState(false);

  useEffect(() => {
    if (itemCount === 0) return;
    setBump(true);
    const timer = setTimeout(() => {
      setBump(false);
    }, 300);
    return () => clearTimeout(timer);
  }, [itemCount, total]);

  return (
    <button
      onClick={onClick}
      className={`fixed bottom-6 right-6 z-30 flex items-center gap-4 pl-6 pr-4 py-3 rounded-full shadow-2xl transition-all transform 
                 bg-dp-blue text-dp-light dark:bg-dp-gold dark:text-dp-dark
                 ${bump ? 'scale-110 ring-4 ring-white/50 dark:ring-yellow-500/50' : 'hover:scale-105'}`}
      aria-label="Ver venta actual"
    >
      <div className="flex items-center gap-2">
        <ShoppingCart size={24} className={bump ? 'animate-bounce' : ''} />
        <span className="text-lg font-bold bg-white/20 dark:bg-black/20 rounded-full w-8 h-8 flex items-center justify-center">
            {itemCount}
        </span>
      </div>
      <div className="w-px h-8 bg-white/30 dark:bg-black/30"></div>
      <span className="text-xl font-bold min-w-[80px] text-right">${total.toFixed(2)}</span>
    </button>
  );
};

export default FloatingSaleButton;
