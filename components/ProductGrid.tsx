
import React, { useRef, useEffect, useState } from 'react';
import type { Product, User } from '../types';
import { Pencil, Trash2, Star, LayoutGrid, List } from 'lucide-react';

interface ProductGridProps {
  products: Product[];
  favorites: string[];
  userRole: User['role'];
  onProductClick: (product: Product) => void;
  onEditProduct: (product: Product) => void;
  onDeleteProduct: (productId: string) => void;
  onToggleFavorite: (productId: string) => void;
  viewMode: 'grid' | 'list';
  favoriteProducts?: Product[];
}

const ProductGrid: React.FC<ProductGridProps> = ({ 
    products, favorites, userRole, onProductClick, onEditProduct, onDeleteProduct, onToggleFavorite, 
    viewMode, favoriteProducts 
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  // Check scroll position to toggle fade indicators
  const checkScroll = () => {
      if (scrollRef.current) {
          const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
          setCanScrollLeft(scrollLeft > 0);
          setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 5); // 5px tolerance
      }
  };

  useEffect(() => {
      checkScroll();
      window.addEventListener('resize', checkScroll);
      return () => window.removeEventListener('resize', checkScroll);
  }, [favoriteProducts]);

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
    <div className="flex flex-col h-full relative">
        
        {/* Mobile Favorites Strip */}
        <div className="lg:hidden mb-4">
            {favoriteProducts && favoriteProducts.length > 0 && (
                <div className="relative group w-full h-10">
                    {/* Left Fade */}
                    <div className={`absolute left-0 top-0 bottom-0 w-6 bg-gradient-to-r from-dp-soft-gray dark:from-dp-dark to-transparent z-10 pointer-events-none transition-opacity duration-300 ${canScrollLeft ? 'opacity-100' : 'opacity-0'}`}></div>
                    
                    {/* Right Fade */}
                    <div className={`absolute right-0 top-0 bottom-0 w-6 bg-gradient-to-l from-dp-soft-gray dark:from-dp-dark to-transparent z-10 pointer-events-none transition-opacity duration-300 ${canScrollRight ? 'opacity-100' : 'opacity-0'}`}></div>

                    <div 
                        ref={scrollRef}
                        onScroll={checkScroll}
                        className="flex gap-2 overflow-x-auto px-1 custom-scrollbar scroll-smooth items-center h-full no-scrollbar"
                    >
                        {favoriteProducts.map(prod => (
                            <button
                                key={`fav-${prod.id}`}
                                onClick={() => onProductClick(prod)}
                                className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-dp-charcoal border border-gray-200 dark:border-gray-700 text-dp-dark-gray dark:text-gray-200 rounded-full shadow-sm text-xs font-bold whitespace-nowrap active:scale-95 transition-transform"
                            >
                                <Star size={10} className="fill-yellow-400 text-yellow-400"/> {prod.name}
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </div>

      {viewMode === 'grid' ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 pb-20 lg:pb-0">
            {products.map((product) => {
                const isFavorite = favorites.includes(product.id);
                return (
                <div key={product.id} className="relative group animate-fade-in-out">
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
                    <span className="font-semibold text-sm line-clamp-2">{product.name}</span>
                    <span className="text-xs mt-1 opacity-80 font-bold text-dp-blue dark:text-dp-gold">${product.price.toFixed(2)}</span>
                    </button>
                    <div className={`absolute top-1 left-1 px-1.5 py-0.5 text-[10px] font-bold rounded-full ${getStockBadgeColor(product.stock)}`}>
                    {product.stock > 0 ? `${product.stock}` : 'X'}
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
      ) : (
          <div className="space-y-2 pb-20 lg:pb-0">
              {products.map((product) => {
                  const isFavorite = favorites.includes(product.id);
                  return (
                      <div key={product.id} 
                           className="group flex items-center justify-between p-3 rounded-lg bg-dp-light dark:bg-dp-charcoal shadow-sm hover:shadow-md transition-all cursor-pointer border border-transparent hover:border-dp-blue/30 dark:hover:border-dp-gold/30 animate-list-item-in"
                           onClick={() => onProductClick(product)}
                      >
                          <div className="flex-1 min-w-0 pr-4">
                              <div className="flex items-center gap-2">
                                  <span className="font-bold text-sm text-dp-dark-gray dark:text-dp-light-gray truncate">{product.name}</span>
                                  <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${getStockBadgeColor(product.stock)}`}>{product.stock}</span>
                              </div>
                              <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 flex gap-2">
                                  <span>{product.category}</span>
                              </div>
                          </div>
                          
                          <div className="text-right flex items-center gap-4">
                              <span className="text-lg font-bold text-dp-blue dark:text-dp-gold">${product.price.toFixed(2)}</span>
                              
                              {userRole === 'admin' && (
                                  <div className="flex items-center gap-2 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity" onClick={e => e.stopPropagation()}>
                                      <button onClick={() => onToggleFavorite(product.id)} className="text-yellow-500 p-1"><Star size={16} fill={isFavorite ? 'currentColor' : 'none'}/></button>
                                      <button onClick={() => onEditProduct(product)} className="text-gray-400 hover:text-dp-blue dark:hover:text-dp-gold p-1"><Pencil size={16}/></button>
                                      <button onClick={() => onDeleteProduct(product.id)} className="text-gray-400 hover:text-red-500 p-1"><Trash2 size={16}/></button>
                                  </div>
                              )}
                          </div>
                      </div>
                  );
              })}
          </div>
      )}
    </div>
  );
};

export default ProductGrid;
