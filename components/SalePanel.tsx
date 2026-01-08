
import React, { useEffect, useRef, useState } from 'react';
import type { SaleItem, Customer, PromotionId } from '../types';
import { Plus, Minus, Trash2, ShoppingCart, X, UserPlus, User, Percent, Gift, Tag, PauseCircle, Award } from 'lucide-react';
import useLongPress from '../hooks/useLongPress';
import DiscountModal from './DiscountModal';
import PriceOverrideModal from './PriceOverrideModal';
import PromotionsModal from './PromotionsModal';
import { PROMOTIONS } from '../constants';
import { getLoyaltySettings } from '../services/settings';
import * as soundService from '../services/sound';

interface SalePanelProps {
  items: SaleItem[];
  getTotals: () => {
    subtotal: number;
    totalDiscount: number;
    finalTotal: number;
    itemizedPromoDiscounts: Map<string, number>;
  };
  globalDiscount: { type: 'percentage' | 'fixed'; value: number } | null;
  selectedCustomer: Customer | null;
  activePromotion: PromotionId | null;
  loyaltyDiscount: number | null;
  onClearSale: () => void;
  onCompleteSale: () => void;
  onIncrement: (itemId: string) => void;
  onDecrement: (itemId: string) => void;
  onRemove: (itemId: string) => void;
  onAssociateCustomer: () => void;
  onClearCustomer: () => void;
  onAddCustomItem: () => void;
  onParkSale: () => void;
  onApplyItemDiscount: (itemId: string, discount: { type: 'percentage' | 'fixed'; value: number } | null) => void;
  onApplyGlobalDiscount: (discount: { type: 'percentage' | 'fixed'; value: number } | null) => void;
  onApplyPriceOverride: (itemId: string, newPrice: number | null) => void;
  onApplyPromotion: (promotionId: PromotionId | null) => void;
  onApplyLoyaltyDiscount: (points: number, amount: number) => void;
  onClose?: () => void;
}

const SaleListItem: React.FC<{
  item: SaleItem;
  promoDiscount?: number;
  onIncrement: (id: string) => void;
  onDecrement: (id: string) => void;
  onRemove: (id: string) => void;
  onSetDiscount: (item: SaleItem) => void;
  onSetPrice: (item: SaleItem) => void;
}> = ({ item, promoDiscount = 0, onIncrement, onDecrement, onRemove, onSetDiscount, onSetPrice }) => {

  const handleIncrement = (id: string) => {
      soundService.playSound('click');
      onIncrement(id);
  }
  
  const handleDecrement = (id: string) => {
      soundService.playSound('click');
      onDecrement(id);
  }
  
  const handleRemove = (id: string) => {
      soundService.playSound('trash');
      onRemove(id);
  }

  const incrementPressProps = useLongPress(() => handleIncrement(item.id));
  const decrementPressProps = useLongPress(() => handleDecrement(item.id));
  
  const effectivePrice = item.overriddenPrice ?? item.price;
  const originalTotal = item.price * item.quantity;
  const effectiveTotal = effectivePrice * item.quantity;

  let discountedTotal = effectiveTotal;
  if (item.discount) {
      if (item.discount.type === 'percentage') {
          discountedTotal = effectiveTotal * (1 - item.discount.value / 100);
      } else {
          discountedTotal = Math.max(0, effectiveTotal - item.discount.value);
      }
  }
  
  const finalLineTotal = Math.max(0, discountedTotal - promoDiscount);
  const isFree = finalLineTotal <= 0 && (promoDiscount > 0 || (item.discount && discountedTotal <=0));


  return (
    <li className="flex justify-between items-center py-3 border-b border-dp-soft-gray dark:border-dp-charcoal animate-list-item-in">
      <div className="flex-grow pr-2">
        <p className="font-semibold leading-tight flex items-center gap-1.5">
            {item.name} 
            {item.isCustom && <Tag size={12} className="opacity-60 text-dp-blue dark:text-dp-gold"/>}
        </p>
        {promoDiscount > 0 && (
          <div className="flex items-center gap-1.5 text-xs text-green-700 dark:text-green-400 font-bold mt-0.5">
            <Gift size={12} />
            { isFree 
                ? <span>Promo: Gratis!</span>
                : <span>Promo (-${promoDiscount.toFixed(2)})</span>
            }
          </div>
        )}
        <div className="flex items-center gap-3 mt-1">
            <button onClick={() => onSetPrice(item)} disabled={item.isCustom} className="text-sm text-gray-500 dark:text-gray-400 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700 p-0.5 -ml-0.5 disabled:cursor-not-allowed disabled:hover:bg-transparent">
                {item.overriddenPrice !== undefined ? (
                    <>
                        <span>${item.overriddenPrice.toFixed(2)}</span>
                        <s className="ml-1 text-gray-400/80">${item.price.toFixed(2)}</s>
                    </>
                ) : (
                    <span>${item.price.toFixed(2)}</span>
                )}
            </button>
            <button onClick={() => onSetDiscount(item)} disabled={item.isCustom} className="flex items-center gap-1.5 p-0.5 rounded-md text-dp-blue dark:text-dp-gold hover:bg-blue-100/50 dark:hover:bg-yellow-900/20 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:opacity-50">
              <Percent size={14} />
              {item.discount && item.discount.value > 0 && (
                  <span className="text-xs font-bold text-red-700 dark:text-red-300">
                      -{item.discount.type === 'percentage' ? `${item.discount.value}%` : `$${item.discount.value.toFixed(2)}`}
                  </span>
              )}
            </button>
        </div>
      </div>
      <div className="flex items-center gap-3">
         <div className="flex items-center gap-1 bg-dp-soft-gray dark:bg-dp-dark rounded-full">
             <button {...decrementPressProps} className="p-1 text-dp-dark-gray dark:text-dp-light-gray hover:bg-gray-300 dark:hover:bg-gray-700 rounded-full select-none"><Minus size={14} /></button>
             <span className="font-bold text-sm w-6 text-center select-none">{item.quantity}</span>
             <button {...incrementPressProps} className="p-1 text-dp-dark-gray dark:text-dp-light-gray hover:bg-gray-300 dark:hover:bg-gray-700 rounded-full select-none"><Plus size={14} /></button>
         </div>
        <div className="font-bold w-16 text-right select-none">
          { (item.discount || item.overriddenPrice !== undefined || promoDiscount > 0) ? (
            <div>
              <span>${finalLineTotal.toFixed(2)}</span>
              <s className="text-xs text-gray-400/80 font-normal block">${originalTotal.toFixed(2)}</s>
            </div>
          ) : (
            <span>${originalTotal.toFixed(2)}</span>
          )}
        </div>
        <button onClick={() => handleRemove(item.id)} className="text-red-500 hover:text-red-400 p-2 -mr-2 rounded-full hover:bg-red-500/10">
            <Trash2 size={16} />
        </button>
      </div>
    </li>
  );
};

const SalePanel: React.FC<SalePanelProps> = (props) => {
  const { items, getTotals, globalDiscount, selectedCustomer, activePromotion, loyaltyDiscount, onClearSale, onCompleteSale, onIncrement, onDecrement, onRemove, onAssociateCustomer, onClearCustomer, onAddCustomItem, onParkSale, onApplyItemDiscount, onApplyGlobalDiscount, onApplyPriceOverride, onApplyPromotion, onApplyLoyaltyDiscount, onClose } = props;
  
  const [isDiscountModalOpen, setIsDiscountModalOpen] = useState(false);
  const [isPriceModalOpen, setIsPriceModalOpen] = useState(false);
  const [isPromotionsModalOpen, setIsPromotionsModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<SaleItem | null>(null);

  const [totalFlashKey, setTotalFlashKey] = useState(0);
  const listEndRef = useRef<HTMLDivElement>(null);
  
  const totals = getTotals();
  const prevTotalRef = useRef<number>(totals.finalTotal);
  const activePromotionDetails = activePromotion ? PROMOTIONS.find(p => p.id === activePromotion) : null;
  const loyaltySettings = getLoyaltySettings();

  const canRedeemPoints = selectedCustomer && (selectedCustomer.loyaltyPoints || 0) >= loyaltySettings.pointsForRedemption;
  const isAnyDiscountActive = !!globalDiscount || !!activePromotion || !!loyaltyDiscount;

  useEffect(() => {
    if (totals.finalTotal !== prevTotalRef.current) {
      setTotalFlashKey(prev => prev + 1);
      prevTotalRef.current = totals.finalTotal;
    }
  }, [totals.finalTotal]);

  useEffect(() => {
    listEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [items.length]);

  const handleSetItemDiscount = (item: SaleItem) => {
    setSelectedItem(item);
    setIsDiscountModalOpen(true);
  };

  const handleSetGlobalDiscount = () => {
    setSelectedItem(null);
    setIsDiscountModalOpen(true);
  };
  
  const handleSetItemPrice = (item: SaleItem) => {
    setSelectedItem(item);
    setIsPriceModalOpen(true);
  }

  const handleSaveDiscount = (discount: { type: 'percentage' | 'fixed'; value: number } | null) => {
    if (selectedItem) {
        onApplyItemDiscount(selectedItem.id, discount);
    } else {
        onApplyGlobalDiscount(discount);
    }
    setIsDiscountModalOpen(false);
    setSelectedItem(null);
  };

  const handleSavePrice = (newPrice: number | null) => {
    if (selectedItem) {
        onApplyPriceOverride(selectedItem.id, newPrice);
    }
    setIsPriceModalOpen(false);
    setSelectedItem(null);
  }
  
  const handleClearSaleWithSound = () => {
      soundService.playSound('trash');
      onClearSale();
  }

  return (
    <div className="flex flex-col h-full text-dp-dark-gray dark:text-dp-light-gray">
      {isDiscountModalOpen && (
        <DiscountModal
            onClose={() => setIsDiscountModalOpen(false)}
            onSave={handleSaveDiscount}
            currentDiscount={selectedItem ? selectedItem.discount : globalDiscount || undefined}
            itemName={selectedItem ? selectedItem.name : 'Venta Global'}
        />
      )}
      {isPriceModalOpen && selectedItem && (
        <PriceOverrideModal
            onClose={() => setIsPriceModalOpen(false)}
            onSave={handleSavePrice}
            currentPrice={selectedItem.overriddenPrice ?? selectedItem.price}
            itemName={selectedItem.name}
        />
      )}
      {isPromotionsModalOpen && (
        <PromotionsModal
            onClose={() => setIsPromotionsModalOpen(false)}
            onSave={onApplyPromotion}
            activePromotionId={activePromotion}
        />
      )}

      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold">Venta Actual</h2>
        <div className="flex items-center gap-4">
            {items.length > 0 && (
              <button onClick={handleClearSaleWithSound} className="text-sm text-red-500 hover:text-red-700 dark:hover:text-red-400">Limpiar</button>
            )}
            {onClose && (
                <button onClick={onClose} className="p-1 rounded-full text-dp-dark-gray dark:text-dp-light-gray hover:bg-dp-soft-gray dark:hover:bg-gray-700"><X size={24} /></button>
            )}
        </div>
      </div>
      
      <div className="flex-grow overflow-y-auto pr-2 -mr-2">
        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center text-gray-500 dark:text-gray-400 px-4">
            <ShoppingCart size={48} className="mb-4 opacity-50" />
            <h3 className="font-semibold text-lg text-dp-dark-gray dark:text-dp-light-gray">Panel de Venta Vacío</h3>
            <p>Haga clic en un producto del catálogo para comenzar una nueva venta.</p>
          </div>
        ) : (
          <ul>
            {items.map((item) => (
              <SaleListItem 
                key={item.id} 
                item={item} 
                promoDiscount={totals.itemizedPromoDiscounts.get(item.id)}
                onIncrement={onIncrement} 
                onDecrement={onDecrement} 
                onRemove={onRemove} 
                onSetDiscount={handleSetItemDiscount} 
                onSetPrice={handleSetItemPrice} />
            ))}
            <div ref={listEndRef} />
          </ul>
        )}
      </div>

      <div className="mt-auto pt-4 border-t-2 border-dp-dark-gray dark:border-dp-charcoal">
        <div className="grid grid-cols-2 gap-2 mb-2">
            {selectedCustomer ? (
                <div className="col-span-2 flex items-center justify-between p-2 rounded-lg bg-blue-50 dark:bg-yellow-500/10">
                    <div className="flex items-center gap-2 text-sm text-dp-blue dark:text-dp-gold">
                        <User size={16} />
                        <span className="font-semibold">{selectedCustomer.name}</span>
                        <div className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-400 font-semibold">
                          <Award size={12}/>
                          <span>{selectedCustomer.loyaltyPoints || 0} pts</span>
                        </div>
                    </div>
                    <button onClick={onClearCustomer} className="p-1 rounded-full hover:bg-black/10 dark:hover:bg-white/10 text-dp-blue dark:text-dp-gold"><X size={16} /></button>
                </div>
            ) : (
                <button onClick={onAssociateCustomer} className="w-full flex items-center justify-center gap-2 p-2 rounded-lg text-sm font-semibold transition-colors bg-dp-soft-gray hover:bg-gray-300 dark:bg-dp-charcoal dark:hover:bg-gray-700"><UserPlus size={16} />Asociar Cliente</button>
            )}
             <button onClick={() => onAddCustomItem()} className="w-full flex items-center justify-center gap-2 p-2 rounded-lg text-sm font-semibold transition-colors bg-dp-soft-gray hover:bg-gray-300 dark:bg-dp-charcoal dark:hover:bg-gray-700"><Tag size={16} />Artículo Rápido</button>
        </div>
        {canRedeemPoints && (
            <div className="mb-2">
                <button 
                  onClick={() => onApplyLoyaltyDiscount(loyaltySettings.pointsForRedemption, loyaltySettings.redemptionValue)}
                  disabled={isAnyDiscountActive}
                  className="w-full flex items-center justify-center gap-2 p-2 rounded-lg text-sm font-semibold transition-colors bg-yellow-100 text-yellow-800 hover:bg-yellow-200 dark:bg-yellow-900/50 dark:text-yellow-300 dark:hover:bg-yellow-900/80 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    <Award size={16} /> Redimir {loyaltySettings.pointsForRedemption} pts por ${loyaltySettings.redemptionValue.toFixed(2)}
                </button>
            </div>
        )}
        <div className="grid grid-cols-2 gap-2 mb-4">
            <button onClick={() => onParkSale()} disabled={items.length === 0} className="w-full flex items-center justify-center gap-2 p-2 rounded-lg text-sm font-semibold transition-colors bg-dp-soft-gray hover:bg-gray-300 dark:bg-dp-charcoal dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"><PauseCircle size={16} />Pausar Venta</button>
            <button onClick={() => setIsPromotionsModalOpen(true)} disabled={isAnyDiscountActive} className="w-full flex items-center justify-center gap-2 p-2 rounded-lg text-sm font-semibold transition-colors bg-dp-soft-gray hover:bg-gray-300 dark:bg-dp-charcoal dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"><Gift size={16} />Promociones</button>
        </div>
        <div className="space-y-1 text-sm mb-4 font-medium">
            <div className="flex justify-between items-center text-gray-600 dark:text-gray-400">
                <span>Subtotal</span>
                <span>${totals.subtotal.toFixed(2)}</span>
            </div>
            {totals.totalDiscount > 0 && !loyaltyDiscount && (
              <div className="flex justify-between items-center text-red-600 dark:text-red-400">
                  <button onClick={handleSetGlobalDiscount} className="flex items-center gap-1 hover:underline disabled:no-underline disabled:cursor-not-allowed" disabled={isAnyDiscountActive}>
                      <Percent size={14} /> Descuentos {globalDiscount && `(${globalDiscount.value}${globalDiscount.type === 'percentage' ? '%' : '$'})`}
                  </button>
                  <span>-${(totals.totalDiscount).toFixed(2)}</span>
              </div>
            )}
             {activePromotionDetails && (
              <div className="flex justify-between items-center text-sm text-green-700 dark:text-green-400 font-semibold">
                  <span>Promoción Activa:</span>
                  <span>{activePromotionDetails.name}</span>
              </div>
            )}
            {loyaltyDiscount && (
                <div className="flex justify-between items-center text-red-600 dark:text-red-400">
                    <span className="flex items-center gap-1">
                        <Award size={14} /> Puntos Canjeados
                    </span>
                    <span>-${loyaltyDiscount.toFixed(2)}</span>
                </div>
            )}
        </div>
        <div className="flex justify-between items-center text-2xl font-bold mb-4 pt-2 border-t border-gray-300 dark:border-gray-600">
          <span>TOTAL</span>
          <span key={totalFlashKey} className="animate-flash-total-price origin-right">${totals.finalTotal.toFixed(2)}</span>
        </div>
        <button 
          disabled={items.length === 0}
          onClick={onCompleteSale}
          className="w-full py-4 text-xl font-bold rounded-lg transition-colors text-dp-light bg-dp-blue dark:text-dp-dark dark:bg-dp-gold hover:bg-blue-700 dark:hover:bg-yellow-500 disabled:bg-gray-400 dark:disabled:bg-gray-600 disabled:cursor-not-allowed">
          PAGAR (F1)
        </button>
      </div>
    </div>
  );
};

export default SalePanel;
