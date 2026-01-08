
import { useState, useCallback, useEffect } from 'react';
import type { Product, SaleItem, Customer, PromotionId } from '../types';

const SALE_STORAGE_KEY = 'dominion-current-sale';

interface StoredSale {
  items: SaleItem[];
  customer: Customer | null;
  globalDiscount: { type: 'percentage' | 'fixed'; value: number } | null;
  activePromotion: PromotionId | null;
}

const getInitialState = (): StoredSale => {
  try {
    const storedSale = localStorage.getItem(SALE_STORAGE_KEY);
    if (storedSale) {
      const parsed = JSON.parse(storedSale);
      return {
        items: parsed.items || [],
        customer: parsed.customer || null,
        globalDiscount: parsed.globalDiscount || null,
        activePromotion: parsed.activePromotion || null,
      };
    }
  } catch (error) {
    console.error("Failed to parse sale from localStorage", error);
  }
  return { items: [], customer: null, globalDiscount: null, activePromotion: null };
};

export const useSale = () => {
  const initialState = getInitialState();
  const [saleItems, setSaleItems] = useState<SaleItem[]>(initialState.items);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(initialState.customer);
  const [globalDiscount, setGlobalDiscount] = useState<{ type: 'percentage' | 'fixed'; value: number } | null>(initialState.globalDiscount);
  const [activePromotion, setActivePromotion] = useState<PromotionId | null>(initialState.activePromotion);
  const [loyaltyDiscount, setLoyaltyDiscount] = useState<number | null>(null);
  const [pointsToRedeem, setPointsToRedeem] = useState<number>(0);

  useEffect(() => {
    try {
      const stateToStore: StoredSale = {
        items: saleItems,
        customer: selectedCustomer,
        globalDiscount,
        activePromotion,
      };
      localStorage.setItem(SALE_STORAGE_KEY, JSON.stringify(stateToStore));
    } catch (error) {
      console.error("Failed to save sale to localStorage", error);
    }
  }, [saleItems, selectedCustomer, globalDiscount, activePromotion]);


  const addItem = useCallback((product: Product) => {
    setSaleItems(prevItems => {
      const existingItem = prevItems.find(item => item.productId === product.id && !item.discount && !item.overriddenPrice);
      if (existingItem) {
        return prevItems.map(item =>
          item.id === existingItem.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [...prevItems, { 
          id: `${product.id}-${Date.now()}`, 
          productId: product.id, 
          name: product.name, 
          price: product.price, 
          quantity: 1,
          category: product.category,
      }];
    });
  }, []);

  const addCustomItem = useCallback(({ name, price }: { name: string, price: number }) => {
    setSaleItems(prevItems => {
      const newCustomItem: SaleItem = {
        id: `custom-${Date.now()}`,
        name,
        price,
        quantity: 1,
        isCustom: true,
      };
      return [...prevItems, newCustomItem];
    });
  }, []);

  const incrementQuantity = useCallback((itemId: string) => {
    setSaleItems(prevItems => prevItems.map(item =>
      item.id === itemId
        ? { ...item, quantity: item.quantity + 1 }
        : item
    ));
  }, []);
  
  const decrementQuantity = useCallback((itemId: string) => {
    setSaleItems(prevItems => {
      const itemToDecrement = prevItems.find(item => item.id === itemId);
      if (itemToDecrement && itemToDecrement.quantity > 1) {
        return prevItems.map(item =>
          item.id === itemId
            ? { ...item, quantity: item.quantity - 1 }
            : item
        );
      }
      return prevItems.filter(item => item.id !== itemId);
    });
  }, []);

  const removeItemCompletely = useCallback((itemId: string) => {
    setSaleItems(prevItems => prevItems.filter(item => item.id !== itemId));
  }, []);

  const applyItemDiscount = useCallback((itemId: string, discount: { type: 'percentage' | 'fixed'; value: number } | null) => {
    setSaleItems(prevItems => prevItems.map(item => {
        if (item.id === itemId) {
            if (!discount || discount.value <= 0) {
                const { discount, ...rest } = item;
                return rest;
            }
            return { ...item, discount };
        }
        return item;
    }));
  }, []);
  
  const applyPriceOverride = useCallback((itemId: string, newPrice: number | null) => {
    setSaleItems(prevItems => prevItems.map(item => {
      if (item.id === itemId) {
        const { overriddenPrice, discount, ...rest } = item; 
        if (newPrice !== null && newPrice > 0) {
          return { ...rest, overriddenPrice: newPrice };
        }
        return rest;
      }
      return item;
    }));
  }, []);


  const applyGlobalDiscount = useCallback((discount: { type: 'percentage' | 'fixed'; value: number } | null) => {
    if (!discount || discount.value <= 0) {
        setGlobalDiscount(null);
    } else {
        setGlobalDiscount(discount);
        setActivePromotion(null);
        setLoyaltyDiscount(null);
        setPointsToRedeem(0);
    }
  }, []);

  const applyPromotion = useCallback((promotionId: PromotionId | null) => {
    setActivePromotion(promotionId);
    if (promotionId) {
        setGlobalDiscount(null);
        setLoyaltyDiscount(null);
        setPointsToRedeem(0);
    }
  }, []);

  const applyLoyaltyDiscount = useCallback((points: number, amount: number) => {
    setLoyaltyDiscount(amount);
    setPointsToRedeem(points);
    setGlobalDiscount(null);
    setActivePromotion(null);
  }, []);

  const clearSale = useCallback(() => {
    setSaleItems([]);
    setSelectedCustomer(null);
    setGlobalDiscount(null);
    setActivePromotion(null);
    setLoyaltyDiscount(null);
    setPointsToRedeem(0);
  }, []);
  
  const loadSale = useCallback((saleToLoad: StoredSale) => {
    setSaleItems(saleToLoad.items);
    setSelectedCustomer(saleToLoad.customer);
    setGlobalDiscount(saleToLoad.globalDiscount);
    setActivePromotion(saleToLoad.activePromotion);
    setLoyaltyDiscount(null);
    setPointsToRedeem(0);
  }, []);

  const getTotals = useCallback(() => {
    const subtotal = saleItems.reduce((acc, item) => acc + item.price * item.quantity, 0);
    const itemizedPromoDiscounts = new Map<string, number>();

    let totalAfterItemDiscounts = 0;
    saleItems.forEach(item => {
        const lineBaseTotal = (item.overriddenPrice ?? item.price) * item.quantity;
        let lineDiscountAmount = 0;
        if (item.discount) {
            if (item.discount.type === 'percentage') {
                lineDiscountAmount = lineBaseTotal * (item.discount.value / 100);
            } else {
                lineDiscountAmount = Math.min(item.discount.value, lineBaseTotal);
            }
        }
        totalAfterItemDiscounts += (lineBaseTotal - lineDiscountAmount);
    });
    
    let reductionAmount = 0;
    let finalTotalValue = totalAfterItemDiscounts;
    
    if (globalDiscount) {
        if (globalDiscount.type === 'percentage') {
            reductionAmount = totalAfterItemDiscounts * (globalDiscount.value / 100);
        } else {
            reductionAmount = Math.min(globalDiscount.value, totalAfterItemDiscounts);
        }
    } else if (activePromotion) {
        let promotionDiscount = 0;
        switch (activePromotion) {
            case 'PROMO_BEBIDAS': // Antes HAPPY_HOUR
                saleItems.forEach(item => {
                    if (item.category === 'Bebidas') {
                        const lineBaseTotal = (item.overriddenPrice ?? item.price) * item.quantity;
                        const discountForItem = lineBaseTotal * 0.10; // 10% descuento
                        promotionDiscount += discountForItem;
                        itemizedPromoDiscounts.set(item.id, (itemizedPromoDiscounts.get(item.id) || 0) + discountForItem);
                    }
                });
                break;
            case 'COMBO_KIOSCO': // Antes COMBO_DULCE
                const drinkItems = saleItems.filter(item => item.category === 'Bebidas');
                const candyItems = saleItems.filter(item => item.category === 'Golosinas');

                if (drinkItems.length > 0 && candyItems.length > 0) {
                    const cheapestCandy = candyItems.reduce((cheapest, current) => 
                        (current.overriddenPrice ?? current.price) < (cheapest.overriddenPrice ?? cheapest.price) ? current : cheapest
                    );
                    const cheapestCandyPrice = cheapestCandy.overriddenPrice ?? cheapestCandy.price;
                    const discountAmount = cheapestCandyPrice * 0.5; // 50% off
                    promotionDiscount = discountAmount;
                    itemizedPromoDiscounts.set(cheapestCandy.id, discountAmount);
                }
                break;
            case 'SNACKS_3X2':
                const snackItems = saleItems.filter(item => item.category === 'Snacks');
                const allSnacksUnits: {price: number, id: string}[] = [];
                snackItems.forEach(item => {
                    for (let i=0; i < item.quantity; i++) {
                        allSnacksUnits.push({ price: item.overriddenPrice ?? item.price, id: item.id });
                    }
                });

                if (allSnacksUnits.length >= 3) {
                    allSnacksUnits.sort((a,b) => a.price - b.price);
                    const freeItemsCount = Math.floor(allSnacksUnits.length / 3);
                    for (let i = 0; i < freeItemsCount; i++) {
                        const freeItem = allSnacksUnits[i];
                        promotionDiscount += freeItem.price;
                        itemizedPromoDiscounts.set(freeItem.id, (itemizedPromoDiscounts.get(freeItem.id) || 0) + freeItem.price);
                    }
                }
                break;
        }
        reductionAmount = promotionDiscount;
    }
    
    if (loyaltyDiscount) {
        reductionAmount += loyaltyDiscount;
    }

    finalTotalValue -= reductionAmount;
    const totalDiscount = subtotal - finalTotalValue;

    return {
        subtotal,
        totalDiscount: Math.max(0, totalDiscount),
        finalTotal: Math.max(0, finalTotalValue),
        itemizedPromoDiscounts,
    };
  }, [saleItems, globalDiscount, activePromotion, loyaltyDiscount]);

  const setCustomerForSale = useCallback((customer: Customer) => {
    setSelectedCustomer(customer);
  }, []);

  const clearCustomerFromSale = useCallback(() => {
    setSelectedCustomer(null);
  }, []);

  return { 
    saleItems, 
    selectedCustomer, 
    globalDiscount,
    activePromotion,
    loyaltyDiscount,
    pointsToRedeem,
    setCustomerForSale, 
    clearCustomerFromSale, 
    addItem, 
    addCustomItem,
    incrementQuantity, 
    decrementQuantity, 
    removeItemCompletely, 
    clearSale, 
    getTotals,
    applyItemDiscount,
    applyGlobalDiscount,
    applyPriceOverride,
    applyPromotion,
    applyLoyaltyDiscount,
    loadSale,
  };
};
