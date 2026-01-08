
import React from 'react';
import type { Product } from '../types';
import { Star } from 'lucide-react';

interface FavoritesPanelProps {
  products: Product[];
  onProductClick: (product: Product) => void;
}

const FavoritesPanel: React.FC<FavoritesPanelProps> = ({ products, onProductClick }) => {
  return (
    <aside className="hidden lg:flex w-48 flex-shrink-0 flex-col gap-2 pr-4">
        <h3 className="font-semibold text-center text-gray-500 dark:text-gray-400 text-sm mb-2 uppercase tracking-wider">Favoritos</h3>
        <div className="flex-grow overflow-y-auto space-y-2">
            {products.length === 0 ? (
                <div className="text-center text-xs text-gray-400 dark:text-gray-500 pt-10 px-2">
                    <Star size={24} className="mx-auto mb-2 opacity-50" />
                    <p>Añade productos haciendo clic en la estrella <Star size={10} strokeWidth={1} className="inline-block" /> de un artículo.</p>
                </div>
            ) : (
                <>
                    {products.map(product => (
                        <button
                            key={product.id}
                            onClick={() => onProductClick(product)}
                            disabled={product.stock <= 0}
                            className={`w-full text-center p-2 rounded-lg shadow-sm transition-all transform hover:scale-105
                                        bg-dp-light dark:bg-dp-charcoal 
                                        border border-transparent hover:border-dp-blue dark:hover:border-dp-gold
                                        text-dp-dark-gray dark:text-dp-light-gray
                                        focus:outline-none focus:ring-2
                                        focus:ring-dp-blue dark:focus:ring-dp-gold
                                        disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:border-transparent`}
                            aria-label={`Añadir ${product.name} a la venta`}
                        >
                            <span className="font-semibold text-sm block truncate">{product.name}</span>
                            <span className="text-xs opacity-80">${product.price.toFixed(2)}</span>
                        </button>
                    ))}
                </>
            )}
        </div>
    </aside>
  );
};

export default FavoritesPanel;
