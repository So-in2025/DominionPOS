
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import ProductGrid from './components/ProductGrid';
import SalePanel from './components/SalePanel';
import ThemeToggle from './components/ThemeToggle';
import AddProductModal from './components/AddProductModal';
import EditProductModal from './components/EditProductModal';
import SalesHistoryModal from './components/SalesHistoryModal';
import CashDrawerSummaryModal from './components/CashDrawerSummaryModal';
import SettingsModal from './components/SettingsModal';
import PaymentModal from './components/PaymentModal';
import SkeletonGrid from './components/SkeletonGrid';
import CommandPaletteModal from './components/CommandPaletteModal';
import FloatingSaleButton from './components/FloatingSaleButton';
import Dashboard from './components/Dashboard';
import Inventory from './components/Inventory';
import PurchaseOrders from './components/PurchaseOrders';
import PurchaseOrderDetailModal from './components/PurchaseOrderDetailModal';
import Customers from './components/Customers';
import CustomerDetail from './components/CustomerDetail';
import AddCustomerModal from './components/AddCustomerModal';
import EditCustomerModal from './components/EditCustomerModal';
import CustomerSelectionModal from './components/CustomerSelectionModal';
import ReturnModal from './components/ReturnModal';
import PostSaleConfirmationModal from './components/PostSaleConfirmationModal';
import ReceiptModal from './components/ReceiptModal';
import CashManagementModal from './components/CashManagementModal';
import ShiftHistoryModal from './components/ShiftHistoryModal';
import CustomItemModal from './components/CustomItemModal';
import ParkedSalesModal from './components/ParkedSalesModal';
import FavoritesPanel from './components/FavoritesPanel';
import Toast from './components/Toast';
import LoginScreen from './components/LoginScreen';
import AdminOverrideModal from './components/AdminOverrideModal';
import SmartScannerModal from './components/SmartScannerModal'; 
import VoiceIngestModal from './components/VoiceIngestModal';
import NexusStatus from './components/NexusStatus'; 
import UpgradeModal from './components/UpgradeModal';
import { useSale } from './hooks/useSale';
import { useTheme } from './hooks/useTheme';
import type { Product, Transaction, PurchaseOrder, PurchaseOrderItem, Customer, SaleItem, CashMovement, ShiftSummary, ParkedSale, User, BusinessSettings } from './types';
import * as dbService from './services/db';
import * as settingsService from './services/settings';
import * as cloudService from './services/cloud';
import * as soundService from './services/sound';
import * as ttsService from './services/tts';
import { PlusCircle, History, Search, BookCheck, Settings, Command, LayoutDashboard, List, Package, Truck, Users, DollarSign, Archive, ParkingSquare, LogOut, Crown, LayoutGrid, Sparkles, PauseCircle } from 'lucide-react';

const App: React.FC = () => {
  const { theme, toggleTheme } = useTheme();
  const { 
    saleItems, selectedCustomer, globalDiscount, activePromotion, loyaltyDiscount, pointsToRedeem,
    setCustomerForSale, clearCustomerFromSale, 
    addItem, addCustomItem, decrementQuantity, incrementQuantity, removeItemCompletely, 
    clearSale, getTotals, applyItemDiscount, applyGlobalDiscount, applyPriceOverride, applyPromotion,
    applyLoyaltyDiscount, loadSale
  } = useSale();
  
  // State
  const [products, setProducts] = useState<Product[]>([]);
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [parkedSales, setParkedSales] = useState<ParkedSale[]>([]);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentView, setCurrentView] = useState<'catalog' | 'dashboard' | 'inventory' | 'purchaseOrders' | 'customers'>('catalog');
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [businessSettings, setBusinessSettings] = useState<BusinessSettings>(settingsService.getBusinessSettings());
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  
  // Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isSummaryModalOpen, setIsSummaryModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [isSalePanelModalOpen, setIsSalePanelModalOpen] = useState(false);
  const [isPODetailOpen, setIsPODetailOpen] = useState(false);
  const [isAddCustomerModalOpen, setIsAddCustomerModalOpen] = useState(false);
  const [isEditCustomerModalOpen, setIsEditCustomerModalOpen] = useState(false);
  const [isCustomerSelectModalOpen, setIsCustomerSelectModalOpen] = useState(false);
  const [isReturnModalOpen, setIsReturnModalOpen] = useState(false);
  const [isPostSaleModalOpen, setIsPostSaleModalOpen] = useState(false);
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);
  const [isCashManagementModalOpen, setIsCashManagementModalOpen] = useState(false);
  const [isShiftHistoryModalOpen, setIsShiftHistoryModalOpen] = useState(false);
  const [isCustomItemModalOpen, setIsCustomItemModalOpen] = useState(false);
  const [isParkedSalesModalOpen, setIsParkedSalesModalOpen] = useState(false);
  const [isSmartScannerOpen, setIsSmartScannerOpen] = useState(false);
  const [isVoiceIngestOpen, setIsVoiceIngestOpen] = useState(false);
  const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);
  
  // Admin Override State
  const [isAdminOverrideOpen, setIsAdminOverrideOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState<{ 
      type: 'priceOverride' | 'refund' | 'itemDiscount' | 'globalDiscount', 
      payload: any 
  } | null>(null);

  // Data State
  const [productToEdit, setProductToEdit] = useState<Product | null>(null);
  const [selectedPO, setSelectedPO] = useState<PurchaseOrder | null>(null);
  const [viewingCustomer, setViewingCustomer] = useState<Customer | null>(null);
  const [customerToEdit, setCustomerToEdit] = useState<Customer | null>(null);
  const [transactionToReturn, setTransactionToReturn] = useState<Transaction | null>(null);
  const [completedTransaction, setCompletedTransaction] = useState<Transaction | null>(null);
  const [transactionForReceipt, setTransactionForReceipt] = useState<Transaction | null>(null);

  // UI State
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [toast, setToast] = useState<{message: string, type: 'success' | 'error'} | null>(null);
  
  // Refs for background listeners
  const barcodeBufferRef = useRef('');
  const barcodeTimerRef = useRef<number | null>(null);

  // Data Fetching & Caching
  const refreshData = useCallback(() => {
    setProducts(dbService.getProducts());
    setPurchaseOrders(dbService.getPurchaseOrders());
    setCustomers(dbService.getCustomers());
    setParkedSales(dbService.getParkedSales());
    setBusinessSettings(settingsService.getBusinessSettings());
  }, []);

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      await dbService.initDB();
      refreshData();
      
      dbService.setChangeListener(() => {
          refreshData();
      });
      
      cloudService.connectToNexus().then(res => {
          if(res.success && res.message.includes("PRO")) {
              showToast(res.message, "success");
          }
      });

      setIsLoading(false);
    };
    loadData();
  }, [refreshData]);

  // --- Audio Context Warming Strategy ---
  useEffect(() => {
      const warmUpAudio = () => {
          soundService.resumeAudioContext();
          window.removeEventListener('click', warmUpAudio);
          window.removeEventListener('touchstart', warmUpAudio);
          window.removeEventListener('keydown', warmUpAudio);
      };
      
      window.addEventListener('click', warmUpAudio);
      window.addEventListener('touchstart', warmUpAudio);
      window.addEventListener('keydown', warmUpAudio);
      
      return () => {
          window.removeEventListener('click', warmUpAudio);
          window.removeEventListener('touchstart', warmUpAudio);
          window.removeEventListener('keydown', warmUpAudio);
      };
  }, []);

  // --- Monthly Free Sample Notification Logic ---
  useEffect(() => {
      if (!isLoading && currentUser) {
          const plan = cloudService.getPlan();
          if (plan === 'starter') {
              const now = new Date();
              const currentMonthKey = `dominion-free-sample-notified-${now.getFullYear()}-${now.getMonth()}`;
              const alreadyNotified = sessionStorage.getItem(currentMonthKey);
              
              if (!alreadyNotified) {
                  const hasImageQuota = settingsService.checkFreeQuota('image');
                  const hasVoiceQuota = settingsService.checkFreeQuota('voice');
                  
                  if (hasImageQuota || hasVoiceQuota) {
                      setTimeout(() => {
                          soundService.playSound('hero');
                          showToast("🎁 Regalo Mensual: Tienes 1 Escaneo IA disponible.", "success");
                          sessionStorage.setItem(currentMonthKey, 'true');
                      }, 2000);
                  }
              }
          }
      }
  }, [isLoading, currentUser]);

  // Favorites state management
  useEffect(() => {
    try {
        const storedFavorites = localStorage.getItem('dominion-favorites');
        if (storedFavorites) {
            setFavorites(JSON.parse(storedFavorites));
        }
    } catch (error) {
        console.error("Failed to load favorites from localStorage", error);
        setFavorites([]);
    }
  }, []);

  useEffect(() => {
      try {
          localStorage.setItem('dominion-favorites', JSON.stringify(favorites));
      } catch (error) {
          console.error("Failed to save favorites to localStorage", error);
      }
  }, [favorites]);
  
  useEffect(() => {
      if (currentView !== 'customers') {
          setViewingCustomer(null);
      }
  }, [currentView]);

  const categories = useMemo(() => {
      const productCats = new Set(products.map(p => p.category).filter(Boolean));
      const savedCats = businessSettings.customCategories || [];
      savedCats.forEach(c => productCats.add(c));
      return Array.from(productCats).sort();
  }, [products, businessSettings]);

  const filteredProducts = useMemo(() => {
    return products.filter(product => 
      (selectedCategory === 'all' || !product.category || product.category === selectedCategory) &&
      product.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [products, searchTerm, selectedCategory]);
  
  const favoriteProducts = useMemo(() => {
    return favorites.map(favId => products.find(p => p.id === favId)).filter((p): p is Product => !!p);
  }, [favorites, products]);

  const showToast = useCallback((message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
  }, []);

  // Handlers (Login, Logout, Favorites, Clicks... omitted for brevity if unchanged)
  
  const handleLoginSuccess = async (user: User) => {
    setCurrentUser(user);
    dbService.setCurrentUserForAudit(user);
    await dbService.logAction('LOGIN', `Inicio de sesión exitoso`, 'info');
    soundService.playSound('hero'); // Hero sound
    ttsService.speak(`Bienvenido, ${user.name}. Sistema listo.`, true);

    if(user.role === 'cashier'){
        setCurrentView('catalog');
    }
  };
  const handleLogout = async () => {
    if (currentUser) {
        await dbService.logAction('LOGOUT', `Cierre de sesión`, 'info');
    }
    setCurrentUser(null);
    dbService.setCurrentUserForAudit(null);
    clearSale();
    ttsService.stopSpeaking();
  };

  const handleToggleFavorite = (productId: string) => {
      setFavorites(prev => {
          if (prev.includes(productId)) {
              showToast("Eliminado de favoritos");
              return prev.filter(id => id !== productId);
          } else {
              soundService.playSound('pop');
              showToast("Añadido a favoritos");
              return [...prev, productId];
          }
      });
  };

  const handleProductClick = useCallback((product: Product) => {
    const totalQuantityInCart = saleItems
        .filter(item => item.productId === product.id)
        .reduce((sum, item) => sum + item.quantity, 0);

    if (product.stock > totalQuantityInCart) {
        addItem(product);
        soundService.playSound('beep'); // Beep Sound
    } else {
        soundService.playSound('error');
        showToast("Stock insuficiente para añadir más unidades.", "error");
    }
  }, [addItem, saleItems, showToast]);

  // ... (Other handlers unchanged)
  
  // Handlers for App Actions
  const handleParkSale = async () => {
      if (saleItems.length === 0) return;
      await dbService.addParkedSale({
          items: saleItems,
          customer: selectedCustomer,
          globalDiscount,
          activePromotion,
      });
      clearSale();
      refreshData();
      showToast("Venta pausada con éxito");
      soundService.playSound('pop');
  };

  const handleRestoreSale = async (saleToRestore: ParkedSale) => {
    if (saleItems.length > 0) {
        const confirmed = window.confirm("Hay una venta activa. ¿Desea pausar la venta actual antes de continuar?");
        if (confirmed) {
            await handleParkSale();
        } else {
            return;
        }
    }
    loadSale(saleToRestore);
    await dbService.deleteParkedSale(saleToRestore.id);
    refreshData();
    setIsParkedSalesModalOpen(false);
    showToast("Venta reanudada");
    soundService.playSound('success');
  };

  const handleDeleteParkedSale = async (saleId: string) => {
    if (window.confirm("¿Está seguro de que desea eliminar esta venta pausada? Esta acción no se puede deshacer.")) {
        await dbService.deleteParkedSale(saleId);
        refreshData();
        showToast("Venta pausada eliminada");
        soundService.playSound('trash');
    }
  };

  const handleSaveNewProduct = async (productData: Omit<Product, 'id'>) => {
    await dbService.addProduct(productData);
    refreshData();
    setIsAddModalOpen(false);
    showToast("Producto añadido con éxito");
    soundService.playSound('success');
  };

  const handleEditProduct = (product: Product) => {
    setProductToEdit(product);
    setIsEditModalOpen(true);
  };

  const handleUpdateProduct = async (product: Product) => {
    await dbService.updateProduct(product);
    refreshData();
    setIsEditModalOpen(false);
    setProductToEdit(null);
    showToast("Producto actualizado con éxito");
    soundService.playSound('success');
  };

  const handleStockUpdate = async (productId: string, newStock: number) => {
    const product = products.find(p => p.id === productId);
    if (product && product.stock !== newStock) {
      await dbService.updateProduct({ ...product, stock: newStock });
      refreshData();
      showToast("Stock actualizado con éxito");
    }
  };

  const handleDeleteProduct = async (productId: string) => {
    if (window.confirm('¿Está seguro de que desea eliminar este producto? Esta acción no se puede deshacer.')) {
      await dbService.deleteProduct(productId);
      refreshData();
      showToast("Producto eliminado", "success");
      soundService.playSound('trash');
    }
  };
  
  const handleOpenPaymentModal = useCallback(() => {
    if (saleItems.length > 0) {
      const totals = getTotals();
      setIsSalePanelModalOpen(false);
      setIsCommandPaletteOpen(false);
      setIsPaymentModalOpen(true);
      ttsService.speak(`Total a pagar: ${totals.finalTotal.toFixed(2)} pesos.`);
    }
  }, [saleItems.length, getTotals]);

  const handleConfirmPayment = useCallback(async (paymentDetails: { paymentMethod: 'Efectivo' | 'Tarjeta', amountReceived?: number, change?: number }) => {
    const totals = getTotals();
    
    if (pointsToRedeem > 0 && selectedCustomer) {
        await dbService.redeemCustomerPoints(selectedCustomer.id, pointsToRedeem);
    }

    const newTransaction = await dbService.addTransaction(
        saleItems, 
        totals.finalTotal, 
        paymentDetails.paymentMethod, 
        paymentDetails.amountReceived, 
        paymentDetails.change, 
        selectedCustomer?.id, 
        selectedCustomer?.name, 
        totals.subtotal,
        globalDiscount || undefined,
        totals.totalDiscount,
        activePromotion || undefined
    );
    clearSale();
    setIsPaymentModalOpen(false);
    setCompletedTransaction(newTransaction);
    setIsPostSaleModalOpen(true);
    refreshData();
    
    soundService.playSound('cash');
    setTimeout(() => {
        ttsService.speak("Transacción aprobada. Gracias.");
    }, 500);

  }, [saleItems, getTotals, clearSale, refreshData, selectedCustomer, globalDiscount, activePromotion, pointsToRedeem]);

  const handleConfirmRefund = async (originalTx: Transaction, itemsToReturn: SaleItem[], refundTotal: number) => {
    await dbService.addRefundTransaction(originalTx, itemsToReturn, refundTotal);
    refreshData();
    setIsReturnModalOpen(false);
    setTransactionToReturn(null);
    showToast("Reembolso procesado con éxito.");
    soundService.playSound('success');
  };

  const handleSaveCashMovement = async (movement: Omit<CashMovement, 'id'|'createdAt'>) => {
    await dbService.addCashMovement(movement);
    showToast('Movimiento de caja registrado.');
    soundService.playSound('success');
  };

  const handleFinalizeShift = async (summaryData: Omit<ShiftSummary, 'id'|'createdAt'>) => {
    await dbService.addShiftSummary(summaryData);
    setIsSummaryModalOpen(false);
    showToast('Turno finalizado y guardado con éxito.');
    soundService.playSound('hero');
  };

  const handlePrintReceipt = (transaction: Transaction) => {
    setTransactionForReceipt(transaction);
    setIsReceiptModalOpen(true);
  };

  const handleGeneratePO = async (productsToOrder: Product[]) => {
      const items: PurchaseOrderItem[] = productsToOrder.map(p => ({
          productId: p.id,
          name: p.name,
          quantity: Math.max(10, ((p.lowStockThreshold || 10) * 2) - p.stock)
      }));
      await dbService.addPurchaseOrder(items);
      refreshData();
      setCurrentView('purchaseOrders');
      showToast('Orden de Compra generada como borrador.');
      soundService.playSound('success');
  };
  
  const handleViewPODetails = (po: PurchaseOrder) => {
      setSelectedPO(po);
      setIsPODetailOpen(true);
  };
  
  const handleUpdatePOStatus = async (po: PurchaseOrder, status: PurchaseOrder['status']) => {
    await dbService.updatePurchaseOrder(po.id, status);
    refreshData();
    if (status === 'Recibido') {
        showToast(`Stock recibido para la OC: ${po.id}`);
        soundService.playSound('success');
    } else {
        showToast(`OC: ${po.id} marcada como ${status}`);
    }
    setIsPODetailOpen(false);
    setSelectedPO(null);
  };

  const handleSaveNewCustomer = async (customerData: Omit<Customer, 'id' | 'createdAt' | 'loyaltyPoints'>) => {
    await dbService.addCustomer(customerData);
    refreshData();
    setIsAddCustomerModalOpen(false);
    showToast("Cliente añadido con éxito");
    soundService.playSound('success');
  };

  const handleOpenEditCustomerModal = (customer: Customer) => {
    setCustomerToEdit(customer);
    setIsEditCustomerModalOpen(true);
  };

  const handleUpdateCustomer = async (customer: Customer) => {
    await dbService.updateCustomer(customer);
    refreshData();
    if (viewingCustomer && viewingCustomer.id === customer.id) {
        setViewingCustomer(customer);
    }
    setIsEditCustomerModalOpen(false);
    setCustomerToEdit(null);
    showToast("Cliente actualizado con éxito");
  };

  const handleDeleteCustomer = async (customerId: string) => {
    if (window.confirm('¿Está seguro de que desea eliminar este cliente?')) {
      await dbService.deleteCustomer(customerId);
      refreshData();
      setViewingCustomer(null);
      showToast("Cliente eliminado con éxito");
      soundService.playSound('trash');
    }
  };

  const handleSelectCustomerForSale = (customer: Customer) => {
    setCustomerForSale(customer);
    setIsCustomerSelectModalOpen(false);
    soundService.playSound('pop');
  };
  
  const handleSaveCustomItem = (item: { name: string; price: number }) => {
    addCustomItem(item);
    setIsCustomItemModalOpen(false);
    soundService.playSound('beep');
  };

  const handleImportSuccess = () => {
    setIsLoading(true);
    setTimeout(() => {
        refreshData();
        clearSale();
        setIsLoading(false);
        setIsSettingsModalOpen(false);
        showToast("Datos importados correctamente");
        soundService.playSound('hero');
    }, 250);
  }
  
  const handleSettingsSaved = () => {
      setIsSettingsModalOpen(false);
      refreshData(); // Updates categories etc
      showToast("Configuración guardada.");
  };
  
  const handleSmartScanSuccess = () => {
      refreshData();
      showToast("Inventario y precios actualizados exitosamente.");
      soundService.playSound('success');
  };

  const handleCommandSelect = (item: Product | { id: string }) => {
    if ('price' in item) handleProductClick(item);
    else {
      switch (item.id) {
        case 'action-add-product': setIsAddModalOpen(true); break;
        case 'action-view-history': setIsHistoryModalOpen(true); break;
        case 'action-view-summary': setIsSummaryModalOpen(true); break;
        case 'action-go-to-settings': setIsSettingsModalOpen(true); break;
        case 'action-toggle-theme': toggleTheme(); break;
        case 'action-complete-sale': handleOpenPaymentModal(); break;
        case 'action-view-dashboard': setCurrentView('dashboard'); break;
        case 'action-view-inventory': setCurrentView('inventory'); break;
        case 'action-view-pos': setCurrentView('purchaseOrders'); break;
      }
    }
    setIsCommandPaletteOpen(false);
  };

  // Protected Actions Handlers
  const executeProtectedAction = (action: { type: 'priceOverride' | 'refund' | 'itemDiscount' | 'globalDiscount', payload: any }) => {
      if (action.type === 'priceOverride') {
          applyPriceOverride(action.payload.itemId, action.payload.newPrice);
          showToast("Precio modificado autorizadamente.");
          soundService.playSound('success');
      } else if (action.type === 'refund') {
          setTransactionToReturn(action.payload);
          setIsHistoryModalOpen(false);
          setIsReturnModalOpen(true);
      } else if (action.type === 'itemDiscount') {
          applyItemDiscount(action.payload.itemId, action.payload.discount);
          showToast("Descuento aplicado.");
          soundService.playSound('success');
      } else if (action.type === 'globalDiscount') {
          applyGlobalDiscount(action.payload.discount);
          showToast("Descuento global aplicado.");
          soundService.playSound('success');
      }
  };

  const handleOverrideSuccess = async (adminUser: User) => {
      setIsAdminOverrideOpen(false);
      if (pendingAction) {
          await dbService.logAction('ADMIN_OVERRIDE', `Acción autorizada por ${adminUser.name}: ${pendingAction.type}`, 'warning', adminUser);
          executeProtectedAction(pendingAction);
          setPendingAction(null);
      }
  };

  const requestProtectedAction = (type: 'priceOverride' | 'refund' | 'itemDiscount' | 'globalDiscount', payload: any, actionName: string) => {
      if (currentUser?.role === 'admin') {
          executeProtectedAction({ type, payload });
      } else {
          setPendingAction({ type, payload });
          setIsAdminOverrideOpen(true);
      }
  };

  const handleRequestPriceOverride = (itemId: string, newPrice: number | null) => {
      requestProtectedAction('priceOverride', { itemId, newPrice }, 'Anular Precio');
  };

  const handleRequestItemDiscount = (itemId: string, discount: { type: 'percentage' | 'fixed'; value: number } | null) => {
      if (discount === null || discount.value <= 0) {
          applyItemDiscount(itemId, discount); // Removing discount doesn't require permission
      } else {
          requestProtectedAction('itemDiscount', { itemId, discount }, 'Aplicar Descuento Item');
      }
  };

  const handleRequestGlobalDiscount = (discount: { type: 'percentage' | 'fixed'; value: number } | null) => {
      if (discount === null || discount.value <= 0) {
          applyGlobalDiscount(discount); // Removing discount doesn't require permission
      } else {
          requestProtectedAction('globalDiscount', { discount }, 'Aplicar Descuento Global');
      }
  };

  const handleOpenReturnModal = (transaction: Transaction) => {
      requestProtectedAction('refund', transaction, 'Iniciar Reembolso');
  };

  // Shortcuts & Barcode Listener
  useEffect(() => {
    if (!currentUser) return; 

    const handleKeyDown = (event: KeyboardEvent) => {
      const activeElement = document.activeElement;
      const isInputFocused = activeElement && (activeElement.tagName === 'INPUT' || activeElement.tagName === 'TEXTAREA' || activeElement.tagName === 'SELECT');
      
      if (!isInputFocused && !document.querySelector('[role="dialog"]')) {
        if (barcodeTimerRef.current) clearTimeout(barcodeTimerRef.current);

        if (event.key === 'Enter') {
          if (barcodeBufferRef.current.length > 2) {
            const scannedCode = barcodeBufferRef.current;
            const foundProduct = products.find(p => p.id === scannedCode);
            if (foundProduct && currentView === 'catalog') {
              handleProductClick(foundProduct);
            } else if (currentView === 'catalog') {
              showToast(`Producto no encontrado: ${scannedCode}`, 'error');
              soundService.playSound('error');
            }
          }
          barcodeBufferRef.current = '';
          return;
        }

        if (event.key.length === 1) {
          barcodeBufferRef.current += event.key;
        }

        barcodeTimerRef.current = window.setTimeout(() => {
          barcodeBufferRef.current = '';
        }, 100);
      }

      if ((event.metaKey || event.ctrlKey) && event.key === 'k') {
        event.preventDefault();
        setIsCommandPaletteOpen(p => !p);
      } else if (event.key === 'F1') {
        event.preventDefault();
        handleOpenPaymentModal();
      } else if (event.key === 'Escape') {
        event.preventDefault();
        setIsCommandPaletteOpen(false);
        setIsAddModalOpen(false);
        setIsEditModalOpen(false);
        setIsHistoryModalOpen(false);
        setIsPaymentModalOpen(false);
        setIsSummaryModalOpen(false);
        setIsSettingsModalOpen(false);
        setIsSalePanelModalOpen(false);
        setIsPODetailOpen(false);
        setIsAddCustomerModalOpen(false);
        setIsEditCustomerModalOpen(false);
        setIsCustomerSelectModalOpen(false);
        setIsReturnModalOpen(false);
        setIsPostSaleModalOpen(false);
        setIsReceiptModalOpen(false);
        setIsCashManagementModalOpen(false);
        setIsShiftHistoryModalOpen(false);
        setIsCustomItemModalOpen(false);
        setIsParkedSalesModalOpen(false);
        setIsSmartScannerOpen(false);
        setIsVoiceIngestOpen(false);
        setIsAdminOverrideOpen(false);
        setIsUpgradeModalOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      if (barcodeTimerRef.current) clearTimeout(barcodeTimerRef.current);
    };
  }, [
      currentUser, products, currentView, handleProductClick, showToast, handleOpenPaymentModal
  ]);
  
  if (isLoading) {
      return (
        <div className="dark"><div className="flex h-screen w-full flex-col items-center justify-center bg-dp-dark text-dp-light-gray"><h1 className="text-3xl font-bold tracking-tight text-dp-gold mb-2">DOMINION POS</h1><p>Cargando sistema...</p></div></div>
      );
  }

  if (!currentUser) {
    return <LoginScreen onLoginSuccess={handleLoginSuccess} />;
  }

  const salePanelComponent = (onClose?: () => void) => 
    <SalePanel 
      items={saleItems} 
      getTotals={getTotals}
      globalDiscount={globalDiscount}
      selectedCustomer={selectedCustomer} 
      activePromotion={activePromotion}
      loyaltyDiscount={loyaltyDiscount}
      onClearSale={clearSale} 
      onCompleteSale={handleOpenPaymentModal} 
      onDecrement={decrementQuantity} 
      onIncrement={incrementQuantity} 
      onRemove={removeItemCompletely} 
      onAssociateCustomer={() => setIsCustomerSelectModalOpen(true)} 
      onClearCustomer={clearCustomerFromSale} 
      onAddCustomItem={() => setIsCustomItemModalOpen(true)}
      onParkSale={handleParkSale}
      onApplyItemDiscount={handleRequestItemDiscount} // Security applied here
      onApplyGlobalDiscount={handleRequestGlobalDiscount} // Security applied here
      onApplyPriceOverride={handleRequestPriceOverride} // Protected
      onApplyPromotion={applyPromotion}
      onApplyLoyaltyDiscount={applyLoyaltyDiscount}
      onClose={onClose} 
    />;
  
  const NavTab: React.FC<{view: typeof currentView, label: string, icon: React.ReactNode}> = ({ view, label, icon }) => {
      const isActive = currentView === view;
      return (
        <button 
            onClick={() => { setCurrentView(view); soundService.playSound('click'); }} 
            title={label}
            className={`flex items-center px-4 py-2 text-sm font-bold rounded-t-lg transition-all duration-300 border-b-2 
                ${isActive 
                    ? 'bg-dp-soft-gray dark:bg-dp-charcoal text-dp-blue dark:text-dp-gold border-dp-blue dark:border-dp-gold' 
                    : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 border-transparent hover:bg-black/5 dark:hover:bg-white/5'
                }`}
        >
            {icon}
            <span className={`overflow-hidden whitespace-nowrap transition-all duration-300 ease-in-out ${isActive ? 'max-w-[150px] opacity-100 ml-2' : 'max-w-0 opacity-0'}`}>
                {label}
            </span>
        </button>
      );
  };

  const isFreeTier = cloudService.getPlan() === 'starter';

  return (
    <div className={`${theme} font-sans`}>
      <div className="flex h-screen flex-col bg-dp-soft-gray dark:bg-dp-dark text-dp-dark-gray dark:text-dp-light-gray">
        {/* Header */}
        <header className="flex flex-col border-b border-dp-soft-gray-dark/10 bg-dp-light dark:bg-dp-dark shadow-md flex-shrink-0 z-10">
            <div className="flex h-16 w-full items-center justify-between px-6">
                <div className="flex items-center gap-3">
                    {businessSettings.logoUrl ? (
                        <img src={businessSettings.logoUrl} alt="Logo" className="h-10 w-auto object-contain" />
                    ) : (
                        <h1 className="text-2xl font-bold tracking-tight text-dp-blue dark:text-dp-gold uppercase">{businessSettings.storeName}</h1>
                    )}
                    <NexusStatus />
                </div>
                <div className="flex items-center gap-4">
                    {isFreeTier && (
                        <button 
                            onClick={() => setIsUpgradeModalOpen(true)}
                            className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-gradient-to-r from-yellow-400 to-orange-500 text-white font-bold text-xs shadow-lg animate-pulse hover:animate-none hover:scale-105 transition-transform"
                        >
                            <Crown size={14} />
                            ACTUALIZAR A PRO
                        </button>
                    )}
                    <div className="text-right hidden sm:block">
                        <p className="font-semibold text-sm">{currentUser.name}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 capitalize">{currentUser.role}</p>
                    </div>
                    <button onClick={handleLogout} className="p-2 rounded-full transition-colors text-dp-dark-gray dark:text-dp-light-gray hover:bg-dp-soft-gray dark:hover:bg-dp-charcoal focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-dp-blue dark:focus:ring-dp-gold dark:focus:ring-offset-dp-dark" aria-label="Bloquear sesión">
                        <LogOut size={18} />
                    </button>
                    <ThemeToggle theme={theme} toggleTheme={toggleTheme} />
                </div>
            </div>
            {/* Quick Access Tabs */}
            <div className="flex px-4 overflow-x-auto gap-1 no-scrollbar">
                <NavTab view="catalog" label="Catálogo" icon={<List size={16}/>} />
                {currentUser.role === 'admin' && (
                    <>
                        <NavTab view="inventory" label="Inventario" icon={<Package size={16}/>} />
                        <NavTab view="customers" label="Clientes" icon={<Users size={16}/>} />
                        <NavTab view="purchaseOrders" label="Órdenes" icon={<Truck size={16}/>} />
                        <NavTab view="dashboard" label="Panel" icon={<LayoutDashboard size={16}/>} />
                    </>
                )}
            </div>
        </header>
        <main className="flex flex-1 overflow-hidden">
          <div className="flex-1 p-4 sm:p-6 flex flex-col overflow-hidden">
            {/* Action Bar */}
            <div className="flex justify-between items-center mb-4 gap-4 flex-shrink-0 flex-wrap min-h-[40px]">
              <h2 className="text-xl font-semibold hidden sm:block">{viewingCustomer ? `Perfil de ${viewingCustomer.name}` : ''}</h2> 
              
              <div className="flex flex-col sm:flex-row items-center gap-2 w-full sm:w-auto justify-end">
                  {currentView === 'catalog' && (
                    <>
                    {/* Line 1 (Mobile) / Left (Desktop): Operations Group */}
                    <div className="flex items-center gap-2 p-1 rounded-lg bg-dp-soft-gray dark:bg-dp-charcoal overflow-x-auto max-w-full w-full sm:w-auto justify-center sm:justify-start order-1">
                      <button onClick={() => setIsCashManagementModalOpen(true)} className="flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-semibold transition-colors bg-dp-light dark:bg-black shadow hover:bg-gray-200 dark:hover:bg-gray-800 whitespace-nowrap"><DollarSign size={16} /><span>Caja</span></button>
                      <button onClick={() => setIsSummaryModalOpen(true)} className="flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-semibold transition-colors bg-dp-light dark:bg-black shadow hover:bg-gray-200 dark:hover:bg-gray-800 whitespace-nowrap"><BookCheck size={16} /><span>Cierre</span></button>
                      <button onClick={() => setIsShiftHistoryModalOpen(true)} className="flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-semibold transition-colors bg-dp-light dark:bg-black shadow hover:bg-gray-200 dark:hover:bg-gray-800 whitespace-nowrap"><Archive size={16} /><span>Turnos</span></button>
                    </div>
                    
                    {/* Line 2 (Mobile) / Right (Desktop): Actions Group */}
                    <div className="flex items-center gap-2 w-full sm:w-auto justify-end overflow-x-auto order-2">
                        <button onClick={() => setIsHistoryModalOpen(true)} className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-colors bg-gray-600 text-dp-light hover:bg-gray-700 dark:bg-dp-charcoal dark:text-dp-light-gray dark:hover:bg-gray-700 whitespace-nowrap"><History size={18} /><span>Ventas</span></button>
                        <button onClick={() => setIsParkedSalesModalOpen(true)} className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-colors bg-gray-600 text-dp-light hover:bg-gray-700 dark:bg-dp-charcoal dark:text-dp-light-gray dark:hover:bg-gray-700 relative whitespace-nowrap"><PauseCircle size={18} /><span>Pausadas</span>{parkedSales.length > 0 && <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs font-bold text-white">{parkedSales.length}</span>}</button>
                        
                        {currentUser.role === 'admin' && (
                            <>
                                <button onClick={() => setIsAddModalOpen(true)} className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-colors bg-dp-blue text-dp-light hover:bg-blue-700 dark:bg-dp-gold dark:text-dp-dark dark:hover:bg-yellow-500 whitespace-nowrap"><PlusCircle size={18} /><span>Producto</span></button>
                                <button onClick={() => setIsSettingsModalOpen(true)} className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-semibold transition-colors bg-gray-500 text-dp-light hover:bg-gray-600 dark:bg-gray-600 dark:text-dp-light-gray dark:hover:bg-gray-700"><Settings size={18} /></button>
                            </>
                        )}
                    </div>
                    </>
                  )}
              </div>
            </div>
            <div className="flex flex-1 overflow-hidden">
                {currentUser.role === 'admin' && currentView === 'catalog' && <FavoritesPanel products={favoriteProducts} onProductClick={handleProductClick} />}
                <div className="flex-1 flex flex-col overflow-hidden">
                    {currentView === 'catalog' ? (
                    <>
                        <div className="mb-4 flex-shrink-0">
                            <div className="flex gap-2 items-center mb-3">
                                <div className="relative flex-grow">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                                    <input 
                                        type="text" 
                                        placeholder="Buscar producto... (o escanear código)" 
                                        value={searchTerm} 
                                        onChange={(e) => setSearchTerm(e.target.value)} 
                                        className="w-full pl-10 pr-12 py-2 rounded-lg border focus:ring-2 bg-dp-light dark:bg-dp-charcoal border-gray-300 dark:border-gray-600 focus:ring-dp-blue dark:focus:ring-dp-gold focus:border-transparent"
                                    />
                                    <button onClick={() => setIsCommandPaletteOpen(true)} className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-md text-gray-500 hover:bg-dp-soft-gray dark:hover:bg-gray-700" title="Búsqueda Rápida (Ctrl+K)" aria-label="Abrir paleta de comandos (Ctrl+K)">
                                        <Command size={18} />
                                    </button>
                                </div>
                                <div className="flex bg-gray-200 dark:bg-gray-800 rounded-lg p-1 flex-shrink-0">
                                     <button 
                                        onClick={() => { setViewMode('grid'); soundService.playSound('click'); }} 
                                        className={`p-2 rounded-md transition-all ${viewMode === 'grid' ? 'bg-white dark:bg-dp-charcoal shadow text-dp-blue dark:text-dp-gold' : 'text-gray-500'}`}
                                        title="Vista Cuadrícula"
                                     >
                                         <LayoutGrid size={20} />
                                     </button>
                                     <button 
                                        onClick={() => { setViewMode('list'); soundService.playSound('click'); }} 
                                        className={`p-2 rounded-md transition-all ${viewMode === 'list' ? 'bg-white dark:bg-dp-charcoal shadow text-dp-blue dark:text-dp-gold' : 'text-gray-500'}`}
                                        title="Vista Lista"
                                     >
                                         <List size={20} />
                                     </button>
                                 </div>
                            </div>
                            <div className="flex flex-wrap items-center gap-2">
                                {['all', ...categories].map(category => (
                                    <button key={category} onClick={() => setSelectedCategory(category)} className={`px-3 py-1 text-sm font-semibold rounded-full transition-colors ${selectedCategory === category ? 'bg-dp-blue text-dp-light dark:bg-dp-gold dark:text-dp-dark' : 'bg-dp-soft-gray text-dp-dark-gray hover:bg-gray-300 dark:bg-dp-charcoal dark:text-dp-light-gray dark:hover:bg-gray-700'}`}>{category === 'all' ? 'Todos' : category}</button>
                                ))}
                            </div>
                        </div>
                        <div className="flex-grow overflow-y-auto pr-1">
                            <ProductGrid 
                                products={filteredProducts} 
                                favorites={favorites} 
                                userRole={currentUser.role} 
                                onToggleFavorite={handleToggleFavorite} 
                                onProductClick={handleProductClick} 
                                onEditProduct={handleEditProduct} 
                                onDeleteProduct={handleDeleteProduct} 
                                viewMode={viewMode} 
                                favoriteProducts={favoriteProducts} 
                            />
                        </div>
                    </>
                    )
                    : currentView === 'dashboard' ? <Dashboard onGeneratePO={handleGeneratePO} />
                    : currentView === 'inventory' ? <Inventory products={products} categories={categories} currentUser={currentUser} onUpdateStock={handleStockUpdate} onUpdateProduct={handleUpdateProduct} />
                    : currentView === 'customers' ? (viewingCustomer ? <CustomerDetail customer={viewingCustomer} onBack={() => setViewingCustomer(null)} onEdit={handleOpenEditCustomerModal} onDelete={handleDeleteCustomer} /> : <Customers customers={customers} onAddCustomer={() => setIsAddCustomerModalOpen(true)} onViewCustomer={setViewingCustomer} />)
                    : <PurchaseOrders purchaseOrders={purchaseOrders} onViewDetails={handleViewPODetails} />}
                </div>
            </div>
          </div>
          {currentView === 'catalog' && (<aside className="hidden lg:flex w-[400px] flex-shrink-0 border-l border-dp-soft-gray-dark/10 bg-dp-light p-4 shadow-lg dark:border-dp-charcoal/50 dark:bg-black">{salePanelComponent()}</aside>)}
        </main>
      </div>
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      
      {isAdminOverrideOpen && pendingAction && (
          <AdminOverrideModal 
            actionName={
                pendingAction.type === 'priceOverride' ? 'Cambiar Precio' : 
                pendingAction.type === 'refund' ? 'Autorizar Reembolso' :
                pendingAction.type === 'itemDiscount' ? 'Aplicar Descuento Item' :
                'Aplicar Descuento Global'
            }
            onClose={() => { setIsAdminOverrideOpen(false); setPendingAction(null); }}
            onSuccess={handleOverrideSuccess}
          />
      )}

      {isUpgradeModalOpen && <UpgradeModal onClose={() => setIsUpgradeModalOpen(false)} />}

      {isAddModalOpen && <AddProductModal onClose={() => setIsAddModalOpen(false)} onSave={handleSaveNewProduct} onOpenSmartScanner={() => { setIsAddModalOpen(false); setIsSmartScannerOpen(true); }} onOpenVoiceIngest={() => { setIsAddModalOpen(false); setIsVoiceIngestOpen(true); }} onRequestUpgrade={() => setIsUpgradeModalOpen(true)} existingCategories={categories} />}
      {isEditModalOpen && productToEdit && <EditProductModal product={productToEdit} onClose={() => { setIsEditModalOpen(false); setProductToEdit(null); }} onSave={handleUpdateProduct} />}
      {isHistoryModalOpen && <SalesHistoryModal onClose={() => setIsHistoryModalOpen(false)} onReturn={handleOpenReturnModal} onPrintReceipt={handlePrintReceipt}/>}
      {isSummaryModalOpen && <CashDrawerSummaryModal onClose={() => setIsSummaryModalOpen(false)} onFinalizeShift={handleFinalizeShift} />}
      {isShiftHistoryModalOpen && <ShiftHistoryModal onClose={() => setIsShiftHistoryModalOpen(false)} />}
      {isSettingsModalOpen && <SettingsModal onClose={() => setIsSettingsModalOpen(false)} onImportSuccess={handleImportSuccess} onSettingsSaved={handleSettingsSaved} products={products} />}
      {isPaymentModalOpen && <PaymentModal total={getTotals().finalTotal} onClose={() => setIsPaymentModalOpen(false)} onConfirm={handleConfirmPayment} />}
      {isPostSaleModalOpen && completedTransaction && <PostSaleConfirmationModal transaction={completedTransaction} onClose={() => setIsPostSaleModalOpen(false)} onPrintReceipt={() => handlePrintReceipt(completedTransaction)}/>}
      {isReceiptModalOpen && transactionForReceipt && <ReceiptModal transaction={transactionForReceipt} onClose={() => setIsReceiptModalOpen(false)} />}
      {isCommandPaletteOpen && <CommandPaletteModal products={products} currentUser={currentUser} onClose={() => setIsCommandPaletteOpen(false)} onSelect={handleCommandSelect} />}
      {isPODetailOpen && selectedPO && <PurchaseOrderDetailModal po={selectedPO} onClose={() => setIsPODetailOpen(false)} onUpdateStatus={handleUpdatePOStatus} />}
      {isAddCustomerModalOpen && <AddCustomerModal onClose={() => setIsAddCustomerModalOpen(false)} onSave={handleSaveNewProduct} />}
      {isEditCustomerModalOpen && customerToEdit && <EditCustomerModal customer={customerToEdit} onClose={() => setIsEditCustomerModalOpen(false)} onSave={handleUpdateCustomer} />}
      {isCustomerSelectModalOpen && <CustomerSelectionModal customers={customers} onClose={() => setIsCustomerSelectModalOpen(false)} onSelect={handleSelectCustomerForSale} />}
      {isReturnModalOpen && transactionToReturn && <ReturnModal transaction={transactionToReturn} onClose={() => setIsReturnModalOpen(false)} onConfirmRefund={handleConfirmRefund} />}
      {isCashManagementModalOpen && <CashManagementModal onClose={() => setIsCashManagementModalOpen(false)} onSave={handleSaveCashMovement} />}
      {isCustomItemModalOpen && <CustomItemModal onClose={() => setIsCustomItemModalOpen(false)} onSave={handleSaveCustomItem} />}
      {isParkedSalesModalOpen && <ParkedSalesModal parkedSales={parkedSales} onClose={() => setIsParkedSalesModalOpen(false)} onRestore={handleRestoreSale} onDelete={handleDeleteParkedSale} />}
      {isSmartScannerOpen && <SmartScannerModal onClose={() => setIsSmartScannerOpen(false)} onProductsUpdated={handleSmartScanSuccess} />}
      {isVoiceIngestOpen && <VoiceIngestModal onClose={() => setIsVoiceIngestOpen(false)} onProductsUpdated={handleSmartScanSuccess} />}
      {currentView === 'catalog' && (
        <div className="lg:hidden">
          {saleItems.length > 0 && (
            <FloatingSaleButton 
              itemCount={saleItems.length} 
              total={getTotals().finalTotal} 
              onClick={() => setIsSalePanelModalOpen(true)} 
            />
          )}
          {isSalePanelModalOpen && (
            <>
              <div className="fixed inset-0 bg-black/60 z-40" onClick={() => setIsSalePanelModalOpen(false)}></div>
              <div className="fixed top-0 right-0 bottom-0 w-full max-w-md bg-dp-light dark:bg-black z-50 shadow-lg animate-slide-in-from-right p-4">
                {salePanelComponent(() => setIsSalePanelModalOpen(false))}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
};
export default App;
