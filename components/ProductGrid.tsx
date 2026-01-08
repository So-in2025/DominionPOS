
import React from 'react';
import type { Product, User } from '../types';
import { Pencil, Trash2, Star } from 'lucide-react';

interface ProductGridProps {
  products: Product[];
  favorites: string[];
  userRole: User['role'];
  onProductClick: (product: Product) => void;
  onEditProduct: (product: Product) => void;
  onDeleteProduct: (productId: string) => void;
  onToggleFavorite: (productId: string) => void;
}

const ProductGrid: React.FC<ProductGridProps> = ({ products, favorites, userRole, onProductClick, onEditProduct, onDeleteProduct, onToggleFavorite }) => {
  if (products.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center py-10 text-gray-500 dark:text-gray-400">
        <p className="font-semibold text-lg">No se encontraron productos</p>
        <p className="text-sm">Intente ajustar los filtros o el término de búsqueda.</p>
      </div>
    );
  }

  const getStockBadgeColor = (stock: number) => {
    if (stock <= 0) {
      return 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300';
    }
    if (stock <= 10) {
      return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300';
    }
    return 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300';
  };

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
      {products.map((product) => {
        const isFavorite = favorites.includes(product.id);
        return (
          <div key={product.id} className="relative group">
            <button
              onClick={() => onProductClick(product)}
              disabled={product.stock <= 0}
              className={`w-full flex flex-col justify-center items-center text-center p-2 h-24 rounded-lg shadow-md transition
                        bg-dp-light dark:bg-dp-charcoal 
                        text-dp-dark-gray dark:text-dp-light-gray
                        focus:outline-none focus:ring-2
                        focus:ring-dp-blue dark:focus:ring-dp-gold
                        ${product.stock <= 0 
                          ? 'opacity-60 cursor-not-allowed' 
                          : 'transform hover:scale-105 hover:bg-dp-soft-gray dark:hover:bg-gray-700'
                        }`}
              aria-label={`Añadir ${product.name} a la venta`}
            >
              <span className="font-semibold text-sm">{product.name}</span>
              <span className="text-xs mt-1 opacity-80">${product.price.toFixed(2)}</span>
            </button>
            <div className={`absolute top-1 left-1 px-1.5 py-0.5 text-xs font-bold rounded-full ${getStockBadgeColor(product.stock)}`}>
              {product.stock > 0 ? `${product.stock} en stock` : 'Agotado'}
            </div>

            {userRole === 'admin' && (
              <>
                <button
                  onClick={(e) => { e.stopPropagation(); onToggleFavorite(product.id); }}
                  className="absolute top-1 right-1 p-1.5 rounded-full text-yellow-500 transition-transform transform hover:scale-125 z-10"
                  aria-label={isFavorite ? `Quitar ${product.name} de favoritos` : `Añadir ${product.name} a favoritos`}
                >
                  <Star size={16} fill={isFavorite ? 'currentColor' : 'none'} strokeWidth={isFavorite ? 0 : 2}/>
                </button>

                <div className="absolute bottom-1 right-1 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={(e) => { e.stopPropagation(); onEditProduct(product); }}
                    className="p-1 rounded-full bg-dp-soft-gray/80 hover:bg-dp-soft-gray dark:bg-dp-dark/80 dark:hover:bg-dp-dark"
                    aria-label={`Editar ${product.name}`}
                  >
                    <Pencil size={14} className="text-dp-blue dark:text-dp-gold" />
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); onDeleteProduct(product.id); }}
                    className="p-1 rounded-full bg-dp-soft-gray/80 hover:bg-dp-soft-gray dark:bg-dp-dark/80 dark:hover:bg-dp-dark"
                    aria-label={`Eliminar ${product.name}`}
                  >
                    <Trash2 size={14} className="text-red-500" />
                  </button>
                </div>
              </>
            )}
          </div>
        )
      })}
    </div>
  );
};

export default ProductGrid;