
import { openDB, IDBPDatabase } from 'idb';
import { eachDayOfInterval, format, differenceInDays } from 'date-fns';
import type { Product, SaleItem, Transaction, PurchaseOrder, PurchaseOrderItem, Customer, CustomerDetails, PromotionId, CashMovement, ShiftSummary, ParkedSale, User, AuditLogEntry } from '../types';
import { MOCK_PRODUCTS } from '../constants';
import { getLoyaltySettings } from './settings';
import * as cloudService from './cloud';
import * as firebaseService from './firebase';

const DB_NAME = 'dominion-db';
const DB_VERSION = 6; 
const PRODUCT_STORE = 'products';
const TRANSACTION_STORE = 'transactions';
const PURCHASE_ORDER_STORE = 'purchaseOrders';
const CUSTOMER_STORE = 'customers';
const CASH_MOVEMENT_STORE = 'cashMovements';
const SHIFT_SUMMARY_STORE = 'shiftSummaries';
const PARKED_SALES_STORE = 'parkedSales';
const USER_STORE = 'users';
const AUDIT_LOG_STORE = 'auditLogs';

// ... (Legacy keys omitidos por brevedad, no cambian) ...
const LEGACY_PRODUCT_KEY = 'dominion-products';
const LEGACY_TRANSACTION_KEY = 'dominion-transactions';

let db: IDBPDatabase;

// In-memory cache
let memoryProducts: Product[] = [];
let memoryTransactions: Transaction[] = [];
let memoryPurchaseOrders: PurchaseOrder[] = [];
let memoryCustomers: Customer[] = [];
let memoryCashMovements: CashMovement[] = [];
let memoryShiftSummaries: ShiftSummary[] = [];
let memoryParkedSales: ParkedSale[] = [];
let memoryUsers: User[] = [];

let currentUserRef: User | null = null;
let changeListener: (() => void) | null = null;

export function setChangeListener(listener: () => void) {
    changeListener = listener;
}

function notifyChanges() {
    if (changeListener) changeListener();
}

export function setCurrentUserForAudit(user: User | null) {
    currentUserRef = user;
}

// --- CLOUD SYNC LOGIC (SOLO PARA PRO/ENTERPRISE) ---
async function initCloudSync() {
    const plan = cloudService.getPlan();
    const identity = cloudService.getIdentity();

    // Solo activamos sync si es PRO o ENTERPRISE
    if ((plan === 'pro' || plan === 'enterprise') && identity.licenseKey) {
        await firebaseService.initFirebase(identity.licenseKey);
        
        // Listener de Productos (Bi-direccional)
        firebaseService.subscribeToCollection('products', (remoteProducts) => {
            syncLocalData(PRODUCT_STORE, remoteProducts, memoryProducts);
        });
        
        // Listener de Transacciones
        firebaseService.subscribeToCollection('transactions', (remoteTransactions) => {
            syncLocalData(TRANSACTION_STORE, remoteTransactions, memoryTransactions);
        });

        // Listener de Clientes
        firebaseService.subscribeToCollection('customers', (remoteCustomers) => {
            syncLocalData(CUSTOMER_STORE, remoteCustomers, memoryCustomers);
        });
        
        console.log("☁️ Nube Activada: Sincronizando datos...");
    } else {
        console.log("🔒 Modo Local Activado (Plan Starter)");
    }
}

async function syncLocalData(storeName: string, remoteData: any[], memoryCache: any[]) {
    // Cuando llegan datos de la nube, actualizamos la DB local y la memoria
    const tx = db.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);
    
    // Check for deletions (remote items marked as deleted)
    // En este diseño simple, asumimos que 'remoteData' es el estado completo o delta
    for (const item of remoteData) {
        if (item.deleted) {
            await store.delete(item.id);
            const idx = memoryCache.findIndex(local => local.id === item.id);
            if (idx !== -1) memoryCache.splice(idx, 1);
        } else {
            await store.put(item);
            const idx = memoryCache.findIndex(local => local.id === item.id);
            if (idx !== -1) {
                memoryCache[idx] = item;
            } else {
                memoryCache.push(item);
            }
        }
    }
    
    await tx.done;
    
    if (storeName === TRANSACTION_STORE) {
        memoryTransactions.sort((a, b) => b.createdAt - a.createdAt);
    }
    
    notifyChanges(); 
}

export async function initDB() {
  db = await openDB(DB_NAME, DB_VERSION, {
    upgrade(db, oldVersion) {
      if (!db.objectStoreNames.contains(PRODUCT_STORE)) db.createObjectStore(PRODUCT_STORE, { keyPath: 'id' });
      if (!db.objectStoreNames.contains(TRANSACTION_STORE)) db.createObjectStore(TRANSACTION_STORE, { keyPath: 'id' });
      if (!db.objectStoreNames.contains(PURCHASE_ORDER_STORE)) db.createObjectStore(PURCHASE_ORDER_STORE, { keyPath: 'id' });
      if (!db.objectStoreNames.contains(CUSTOMER_STORE)) db.createObjectStore(CUSTOMER_STORE, { keyPath: 'id' });
      if (oldVersion < 2 && !db.objectStoreNames.contains(CASH_MOVEMENT_STORE)) db.createObjectStore(CASH_MOVEMENT_STORE, { keyPath: 'id' });
      if (oldVersion < 3 && !db.objectStoreNames.contains(SHIFT_SUMMARY_STORE)) db.createObjectStore(SHIFT_SUMMARY_STORE, { keyPath: 'id' });
      if (oldVersion < 4 && !db.objectStoreNames.contains(PARKED_SALES_STORE)) db.createObjectStore(PARKED_SALES_STORE, { keyPath: 'id' });
      if (oldVersion < 5 && !db.objectStoreNames.contains(USER_STORE)) db.createObjectStore(USER_STORE, { keyPath: 'id' });
      if (oldVersion < 6 && !db.objectStoreNames.contains(AUDIT_LOG_STORE)) {
        const store = db.createObjectStore(AUDIT_LOG_STORE, { keyPath: 'id' });
        store.createIndex('timestamp', 'timestamp');
      }
    },
  });

  await migrateFromLocalStorage();

  memoryProducts = await db.getAll(PRODUCT_STORE);
  memoryTransactions = (await db.getAll(TRANSACTION_STORE)).sort((a, b) => b.createdAt - a.createdAt);
  memoryPurchaseOrders = (await db.getAll(PURCHASE_ORDER_STORE)).sort((a, b) => b.createdAt - a.createdAt);
  memoryCustomers = (await db.getAll(CUSTOMER_STORE)).sort((a, b) => b.createdAt - a.createdAt);
  memoryCashMovements = (await db.getAll(CASH_MOVEMENT_STORE)).sort((a, b) => b.createdAt - a.createdAt);
  memoryShiftSummaries = (await db.getAll(SHIFT_SUMMARY_STORE)).sort((a,b) => b.createdAt - a.createdAt);
  memoryParkedSales = (await db.getAll(PARKED_SALES_STORE)).sort((a,b) => b.createdAt - a.createdAt);
  memoryUsers = await db.getAll(USER_STORE);

  if (memoryProducts.length === 0) {
      const tx = db.transaction(PRODUCT_STORE, 'readwrite');
      await Promise.all(MOCK_PRODUCTS.map(p => tx.store.add(p)));
      await tx.done;
      memoryProducts = await db.getAll(PRODUCT_STORE);
  }
  
  // INICIAR SYNC SI ES PRO
  initCloudSync();
}

async function migrateFromLocalStorage() {
    try {
    const legacyProductsJSON = localStorage.getItem(LEGACY_PRODUCT_KEY);
    const legacyTransactionsJSON = localStorage.getItem(LEGACY_TRANSACTION_KEY);

    if (!legacyProductsJSON && !legacyTransactionsJSON) return;
    
    const productCount = await db.count(PRODUCT_STORE);
    if (productCount > 0) {
      localStorage.removeItem(LEGACY_PRODUCT_KEY);
      localStorage.removeItem(LEGACY_TRANSACTION_KEY);
      return;
    }

    const tx = db.transaction([PRODUCT_STORE, TRANSACTION_STORE], 'readwrite');
    
    if (legacyProductsJSON) {
      const legacyProducts: Product[] = JSON.parse(legacyProductsJSON);
      if (legacyProducts.length > 0 && !('stock' in legacyProducts[0])) {
          legacyProducts.forEach(p => (p as any).stock = 50); 
      }
      await Promise.all(legacyProducts.map(p => tx.objectStore(PRODUCT_STORE).add(p)));
    }

    if (legacyTransactionsJSON) {
      const legacyTransactions: Transaction[] = JSON.parse(legacyTransactionsJSON);
      const migratedTransactions = legacyTransactions.map(t => ({...t, type: 'sale'}) as Transaction);
      await Promise.all(migratedTransactions.map(t => tx.objectStore(TRANSACTION_STORE).add(t)));
    }

    await tx.done;
    localStorage.removeItem(LEGACY_PRODUCT_KEY);
    localStorage.removeItem(LEGACY_TRANSACTION_KEY);
  } catch (error) {
    console.error("Error migration:", error);
  }
}

export async function logAction(action: string, details?: string, severity: AuditLogEntry['severity'] = 'info', forcedUser?: User) {
    const user = forcedUser || currentUserRef;
    const entry: AuditLogEntry = {
        id: `audit-${Date.now()}-${Math.random().toString(36).substr(2,9)}`,
        timestamp: Date.now(),
        userId: user ? user.id : 'system',
        userName: user ? user.name : 'Sistema',
        action,
        details,
        severity
    };
    await db.add(AUDIT_LOG_STORE, entry);
    // Podríamos sincronizar logs también si quisiéramos
    return entry;
}

export async function getAuditLogs(): Promise<AuditLogEntry[]> {
    const logs = await db.getAllFromIndex(AUDIT_LOG_STORE, 'timestamp');
    return logs.reverse();
}

export const getProducts = (): Product[] => memoryProducts;
export const getTransactions = (): Transaction[] => memoryTransactions;
export const getPurchaseOrders = (): PurchaseOrder[] => memoryPurchaseOrders;
export const getCustomers = (): Customer[] => memoryCustomers;
export const getShiftSummaries = (): ShiftSummary[] => memoryShiftSummaries;
export const getParkedSales = (): ParkedSale[] => memoryParkedSales;
export const getUsers = (): User[] => memoryUsers;

const getLastShiftCloseTime = (): number => {
    return memoryShiftSummaries.length > 0 ? memoryShiftSummaries[0].createdAt : 0;
};

export const getOpenCashMovements = (): CashMovement[] => {
    const lastClose = getLastShiftCloseTime();
    return memoryCashMovements.filter(cm => cm.createdAt > lastClose);
};
export const getOpenTransactions = (): Transaction[] => {
    const lastClose = getLastShiftCloseTime();
    return memoryTransactions.filter(tx => tx.createdAt > lastClose);
};

export async function verifyPin(userId: string, pin: string): Promise<User | null> {
    const user = memoryUsers.find(u => u.id === userId);
    if (user && user.pin === pin) {
        return user;
    }
    return null;
}

export async function addUser(userData: Omit<User, 'id'>): Promise<User> {
    const newUser: User = { ...userData, id: `user-${Date.now()}` };
    memoryUsers.push(newUser);
    await db.add(USER_STORE, newUser);
    await logAction('USER_CREATED', `Usuario creado: ${newUser.name}`, 'warning');
    return newUser;
}

export async function updateUser(updatedUser: User): Promise<User | undefined> {
    const index = memoryUsers.findIndex(u => u.id === updatedUser.id);
    if (index === -1) return undefined;
    memoryUsers[index] = updatedUser;
    await db.put(USER_STORE, updatedUser);
    await logAction('USER_UPDATED', `Usuario modificado: ${updatedUser.name}`, 'warning');
    return updatedUser;
}

export async function deleteUser(userId: string): Promise<boolean> {
    const userToDelete = memoryUsers.find(u => u.id === userId);
    if (!userToDelete) return false;
    if (userToDelete.role === 'admin') {
        const adminCount = memoryUsers.filter(u => u.role === 'admin').length;
        if (adminCount <= 1) throw new Error("No se puede eliminar al último administrador.");
    }
    memoryUsers = memoryUsers.filter(u => u.id !== userId);
    await db.delete(USER_STORE, userId);
    await logAction('USER_DELETED', `Usuario eliminado: ${userToDelete.name}`, 'critical');
    return true;
}

// --- SYNC HELPERS (Wrappers) ---
const isPro = () => {
    const plan = cloudService.getPlan();
    return plan === 'pro' || plan === 'enterprise';
};

// --- ASYNC MUTATORS ---

export async function addProduct(productData: Omit<Product, 'id'>): Promise<Product> {
  const newProduct: Product = {
    ...productData,
    id: `prod-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
  };
  memoryProducts.push(newProduct);
  await db.add(PRODUCT_STORE, newProduct);
  await logAction('PRODUCT_ADDED', `Producto creado: ${newProduct.name}`, 'info');
  
  if(isPro()) firebaseService.pushToCloud('products', newProduct);
  
  return newProduct;
}

export async function updateProduct(updatedProduct: Product): Promise<Product | undefined> {
  const index = memoryProducts.findIndex(p => p.id === updatedProduct.id);
  if (index === -1) return undefined;
  
  memoryProducts[index] = updatedProduct;
  await db.put(PRODUCT_STORE, updatedProduct);
  await logAction('PRODUCT_UPDATED', `Producto editado: ${updatedProduct.name}`, 'info');
  
  if(isPro()) firebaseService.pushToCloud('products', updatedProduct);

  return updatedProduct;
}

export async function deleteProduct(productId: string): Promise<void> {
  const p = memoryProducts.find(p => p.id === productId);
  memoryProducts = memoryProducts.filter(p => p.id !== productId);
  await db.delete(PRODUCT_STORE, productId);
  if(p) await logAction('PRODUCT_DELETED', `Producto eliminado: ${p.name}`, 'warning');
  if(isPro()) firebaseService.deleteFromCloud('products', productId);
}

export async function addTransaction(
  saleItems: SaleItem[],
  total: number,
  paymentMethod: 'Efectivo' | 'Tarjeta',
  amountReceived: number | undefined,
  change: number | undefined,
  customerId: string | undefined,
  customerName: string | undefined,
  subtotal: number,
  globalDiscount: { type: 'percentage' | 'fixed'; value: number } | undefined,
  discountAmount: number,
  activePromotion: PromotionId | undefined,
): Promise<Transaction> {
  const newTransaction: Transaction = {
    id: `sale-${Date.now()}`,
    createdAt: Date.now(),
    items: saleItems,
    total,
    paymentMethod,
    amountReceived,
    change,
    customerId,
    customerName,
    subtotal,
    globalDiscount,
    discountAmount,
    type: 'sale',
    activePromotion,
  };
  
  const tx = db.transaction([PRODUCT_STORE, TRANSACTION_STORE, CUSTOMER_STORE], 'readwrite');
  const productStore = tx.objectStore(PRODUCT_STORE);
  const customerStore = tx.objectStore(CUSTOMER_STORE);

  await Promise.all(saleItems.map(async (item) => {
    if (item.productId) {
      const product = await productStore.get(item.productId);
      if (product) {
        product.stock -= item.quantity;
        if (product.stock < 0) product.stock = 0;
        await productStore.put(product);
        if(isPro()) firebaseService.pushToCloud('products', product);
      }
    }
  }));

  if (customerId && total > 0) {
      const customer = await customerStore.get(customerId);
      if (customer) {
          const settings = getLoyaltySettings();
          const pointsEarned = Math.floor(total * settings.pointsPerDollar);
          customer.loyaltyPoints = (customer.loyaltyPoints || 0) + pointsEarned;
          await customerStore.put(customer);
          if(isPro()) firebaseService.pushToCloud('customers', customer);
      }
  }

  await tx.objectStore(TRANSACTION_STORE).add(newTransaction);
  await tx.done;

  // Update memory
  saleItems.forEach(item => {
    if (item.productId) {
      const productIndex = memoryProducts.findIndex(p => p.id === item.productId);
      if (productIndex !== -1) {
        memoryProducts[productIndex].stock -= item.quantity;
        if (memoryProducts[productIndex].stock < 0) memoryProducts[productIndex].stock = 0;
      }
    }
  });
  
  if (customerId && total > 0) {
      const custIndex = memoryCustomers.findIndex(c => c.id === customerId);
      if (custIndex !== -1) {
          const settings = getLoyaltySettings();
          const pointsEarned = Math.floor(total * settings.pointsPerDollar);
          memoryCustomers[custIndex].loyaltyPoints = (memoryCustomers[custIndex].loyaltyPoints || 0) + pointsEarned;
      }
  }

  memoryTransactions.unshift(newTransaction);
  await logAction('SALE_COMPLETED', `Venta completada: $${total.toFixed(2)}`, 'info');
  
  if(isPro()) firebaseService.pushToCloud('transactions', newTransaction);

  return newTransaction;
}

export async function addRefundTransaction(
  originalTx: Transaction,
  refundItems: SaleItem[],
  refundTotal: number
): Promise<Transaction> {
  const newTransaction: Transaction = {
    id: `refund-${Date.now()}`,
    createdAt: Date.now(),
    items: refundItems,
    total: -refundTotal,
    paymentMethod: 'Reembolso',
    customerId: originalTx.customerId,
    customerName: originalTx.customerName,
    subtotal: 0,
    discountAmount: 0,
    type: 'refund',
    originalTransactionId: originalTx.id,
  };

  const tx = db.transaction([PRODUCT_STORE, TRANSACTION_STORE], 'readwrite');
  const productStore = tx.objectStore(PRODUCT_STORE);
  
  await Promise.all(refundItems.map(async (item) => {
    if (item.productId) {
      const product = await productStore.get(item.productId);
      if (product) {
        product.stock += item.quantity;
        await productStore.put(product);
        if(isPro()) firebaseService.pushToCloud('products', product);
      }
    }
  }));

  await tx.objectStore(TRANSACTION_STORE).add(newTransaction);
  await tx.done;

  refundItems.forEach(item => {
    if (item.productId) {
      const productIndex = memoryProducts.findIndex(p => p.id === item.productId);
      if (productIndex !== -1) memoryProducts[productIndex].stock += item.quantity;
    }
  });
  
  memoryTransactions.unshift(newTransaction);
  await logAction('REFUND_PROCESSED', `Reembolso procesado: -$${refundTotal.toFixed(2)}`, 'warning');
  if(isPro()) firebaseService.pushToCloud('transactions', newTransaction);
  
  return newTransaction;
}

export async function addCashMovement(movement: Omit<CashMovement, 'id' | 'createdAt'>): Promise<CashMovement> {
    const newMovement: CashMovement = { ...movement, id: `cm-${Date.now()}`, createdAt: Date.now() };
    memoryCashMovements.unshift(newMovement);
    memoryCashMovements.sort((a,b) => b.createdAt - a.createdAt);
    await db.add(CASH_MOVEMENT_STORE, newMovement);
    await logAction('CASH_MOVEMENT', `${movement.type.toUpperCase()}: $${movement.amount}`, 'info');
    return newMovement;
}

export async function addShiftSummary(summary: Omit<ShiftSummary, 'id' | 'createdAt'>): Promise<ShiftSummary> {
    const newSummary: ShiftSummary = { ...summary, id: `shift-${Date.now()}`, createdAt: Date.now() };
    memoryShiftSummaries.unshift(newSummary);
    await db.add(SHIFT_SUMMARY_STORE, newSummary);
    await logAction('SHIFT_CLOSED', `Cierre de turno`, 'info');
    return newSummary;
}

export async function addPurchaseOrder(items: PurchaseOrderItem[]): Promise<PurchaseOrder> {
    const newPO: PurchaseOrder = { id: `po-${Date.now()}`, createdAt: Date.now(), items, status: 'Borrador' };
    memoryPurchaseOrders.unshift(newPO);
    await db.add(PURCHASE_ORDER_STORE, newPO);
    await logAction('PO_CREATED', `Orden de Compra creada`, 'info');
    if(isPro()) firebaseService.pushToCloud('purchaseOrders', newPO);
    return newPO;
}

export async function updatePurchaseOrder(poId: string, newStatus: PurchaseOrder['status']): Promise<PurchaseOrder | undefined> {
  const poIndex = memoryPurchaseOrders.findIndex(p => p.id === poId);
  if (poIndex === -1) return undefined;
  const originalPO = memoryPurchaseOrders[poIndex];
  if (originalPO.status === newStatus) return originalPO;

  const updatedPO: PurchaseOrder = { ...originalPO, status: newStatus };
  const stores: (typeof PRODUCT_STORE | typeof PURCHASE_ORDER_STORE)[] = [PURCHASE_ORDER_STORE];
  if (newStatus === 'Recibido' && originalPO.status !== 'Recibido') {
    updatedPO.receivedAt = Date.now();
    stores.push(PRODUCT_STORE);
  }

  const tx = db.transaction(stores, 'readwrite');
  const poStore = tx.objectStore(PURCHASE_ORDER_STORE);

  if (newStatus === 'Recibido' && originalPO.status !== 'Recibido') {
    const productStore = tx.objectStore(PRODUCT_STORE);
    await Promise.all(updatedPO.items.map(async item => {
      const product = await productStore.get(item.productId);
      if (product) {
        product.stock += item.quantity;
        await productStore.put(product);
        if(isPro()) firebaseService.pushToCloud('products', product);
      }
    }));
  }

  await poStore.put(updatedPO);
  await tx.done;

  memoryPurchaseOrders[poIndex] = updatedPO;
  if (newStatus === 'Recibido' && originalPO.status !== 'Recibido') {
    updatedPO.items.forEach(item => {
      const productIndex = memoryProducts.findIndex(p => p.id === item.productId);
      if (productIndex !== -1) memoryProducts[productIndex].stock += item.quantity;
    });
  }
  await logAction('PO_UPDATED', `OC ${poId} marcada como ${newStatus}`, 'info');
  if(isPro()) firebaseService.pushToCloud('purchaseOrders', updatedPO);
  
  return updatedPO;
}

export async function addCustomer(customerData: Omit<Customer, 'id' | 'createdAt' | 'loyaltyPoints'>): Promise<Customer> {
  const newCustomer: Customer = { ...customerData, id: `cust-${Date.now()}`, createdAt: Date.now(), loyaltyPoints: 0 };
  memoryCustomers.unshift(newCustomer);
  await db.add(CUSTOMER_STORE, newCustomer);
  await logAction('CUSTOMER_CREATED', `Cliente creado: ${newCustomer.name}`, 'info');
  if(isPro()) firebaseService.pushToCloud('customers', newCustomer);
  return newCustomer;
}

export async function updateCustomer(updatedCustomer: Customer): Promise<Customer | undefined> {
  const index = memoryCustomers.findIndex(c => c.id === updatedCustomer.id);
  if (index === -1) return undefined;
  const originalCustomer = memoryCustomers[index];
  const finalCustomer = { ...originalCustomer, ...updatedCustomer };
  
  memoryCustomers[index] = finalCustomer;
  memoryCustomers.sort((a, b) => b.createdAt - a.createdAt);
  await db.put(CUSTOMER_STORE, finalCustomer);

  if (originalCustomer.name !== finalCustomer.name) {
    const tx = db.transaction(TRANSACTION_STORE, 'readwrite');
    for (const memTx of memoryTransactions) {
      if (memTx.customerId === finalCustomer.id) {
        memTx.customerName = finalCustomer.name;
        tx.store.put(memTx);
      }
    }
    await tx.done;
  }
  
  await logAction('CUSTOMER_UPDATED', `Cliente actualizado: ${finalCustomer.name}`, 'info');
  if(isPro()) firebaseService.pushToCloud('customers', finalCustomer);
  return finalCustomer;
}

export async function redeemCustomerPoints(customerId: string, pointsToRedeem: number): Promise<Customer | undefined> {
  const index = memoryCustomers.findIndex(c => c.id === customerId);
  if (index === -1) return undefined;
  const customer = memoryCustomers[index];
  customer.loyaltyPoints = (customer.loyaltyPoints || 0) - pointsToRedeem;
  if (customer.loyaltyPoints < 0) customer.loyaltyPoints = 0;
  memoryCustomers[index] = customer;
  await db.put(CUSTOMER_STORE, customer);
  if(isPro()) firebaseService.pushToCloud('customers', customer);
  return customer;
}

export async function deleteCustomer(customerId: string): Promise<void> {
  const tx = db.transaction([CUSTOMER_STORE, TRANSACTION_STORE], 'readwrite');
  const customerStore = tx.objectStore(CUSTOMER_STORE);
  const transactionStore = tx.objectStore(TRANSACTION_STORE);
  await customerStore.delete(customerId);
  let cursor = await transactionStore.openCursor();
  while (cursor) {
    if (cursor.value.customerId === customerId) {
      const updatedTx = { ...cursor.value };
      delete updatedTx.customerId;
      delete updatedTx.customerName;
      cursor.update(updatedTx);
    }
    cursor = await cursor.continue();
  }
  await tx.done;
  const c = memoryCustomers.find(c => c.id === customerId);
  memoryCustomers = memoryCustomers.filter(c => c.id !== customerId);
  memoryTransactions.forEach(memTx => {
    if (memTx.customerId === customerId) {
      delete memTx.customerId;
      delete memTx.customerName;
    }
  });
  if(c) await logAction('CUSTOMER_DELETED', `Cliente eliminado: ${c.name}`, 'warning');
  if(isPro()) firebaseService.deleteFromCloud('customers', customerId);
}

export async function addParkedSale(sale: Omit<ParkedSale, 'id' | 'createdAt'>): Promise<ParkedSale> {
    const newParkedSale: ParkedSale = { ...sale, id: `parked-${Date.now()}`, createdAt: Date.now() };
    memoryParkedSales.unshift(newParkedSale);
    await db.add(PARKED_SALES_STORE, newParkedSale);
    return newParkedSale;
}

export async function deleteParkedSale(saleId: string): Promise<void> {
    memoryParkedSales = memoryParkedSales.filter(ps => ps.id !== saleId);
    await db.delete(PARKED_SALES_STORE, saleId);
}

export function getCustomerDetails(customerId: string): CustomerDetails | null {
    const customer = memoryCustomers.find(c => c.id === customerId);
    if (!customer) return null;
    const transactions = memoryTransactions.filter(tx => tx.customerId === customerId);
    const stats = transactions.reduce((acc, tx) => {
        if (tx.type === 'sale') acc.totalSpent += tx.total;
        if (tx.createdAt > acc.lastVisit) acc.lastVisit = tx.createdAt;
        if (tx.createdAt < acc.firstVisit) acc.firstVisit = tx.createdAt;
        return acc;
    }, {
        totalSpent: 0,
        transactionCount: transactions.filter(tx => tx.type === 'sale').length,
        firstVisit: transactions.length > 0 ? transactions[transactions.length - 1].createdAt : customer.createdAt,
        lastVisit: transactions.length > 0 ? transactions[0].createdAt : customer.createdAt,
    });
    return { customer, transactions, stats };
}

export async function exportData(): Promise<string> {
  const data = {
    products: await db.getAll(PRODUCT_STORE),
    transactions: await db.getAll(TRANSACTION_STORE),
    purchaseOrders: await db.getAll(PURCHASE_ORDER_STORE),
    customers: await db.getAll(CUSTOMER_STORE),
    cashMovements: await db.getAll(CASH_MOVEMENT_STORE),
    shiftSummaries: await db.getAll(SHIFT_SUMMARY_STORE),
    parkedSales: await db.getAll(PARKED_SALES_STORE),
    users: await db.getAll(USER_STORE),
    auditLogs: await db.getAll(AUDIT_LOG_STORE),
  };
  return JSON.stringify(data, null, 2);
}

export async function importData(jsonData: string): Promise<boolean> {
  try {
    const data = JSON.parse(jsonData);
    if (!Array.isArray(data.products) || !Array.isArray(data.transactions)) throw new Error("Invalid data format");

    const storesToClear: any[] = [PRODUCT_STORE, TRANSACTION_STORE, PURCHASE_ORDER_STORE, CUSTOMER_STORE, CASH_MOVEMENT_STORE, SHIFT_SUMMARY_STORE, PARKED_SALES_STORE, USER_STORE, AUDIT_LOG_STORE];
    const tx = db.transaction(storesToClear, 'readwrite');
    await Promise.all(storesToClear.map(store => tx.objectStore(store).clear()));
    
    await Promise.all(data.products.map((p: Product) => tx.objectStore(PRODUCT_STORE).add(p)));
    await Promise.all(data.transactions.map((t: Transaction) => tx.objectStore(TRANSACTION_STORE).add(t)));
    if (data.purchaseOrders) await Promise.all(data.purchaseOrders.map((po: PurchaseOrder) => tx.objectStore(PURCHASE_ORDER_STORE).add(po)));
    if (data.customers) await Promise.all(data.customers.map((c: Customer) => tx.objectStore(CUSTOMER_STORE).add(c)));
    if (data.cashMovements) await Promise.all(data.cashMovements.map((cm: CashMovement) => tx.objectStore(CASH_MOVEMENT_STORE).add(cm)));
    if (data.shiftSummaries) await Promise.all(data.shiftSummaries.map((ss: ShiftSummary) => tx.objectStore(SHIFT_SUMMARY_STORE).add(ss)));
    if (data.parkedSales) await Promise.all(data.parkedSales.map((ps: ParkedSale) => tx.objectStore(PARKED_SALES_STORE).add(ps)));
    if (data.users) await Promise.all(data.users.map((u: User) => tx.objectStore(USER_STORE).add(u)));
    if (data.auditLogs) await Promise.all(data.auditLogs.map((log: AuditLogEntry) => tx.objectStore(AUDIT_LOG_STORE).add(log)));
    
    await tx.done;

    memoryProducts = data.products;
    memoryTransactions = data.transactions.sort((a: Transaction, b: Transaction) => b.createdAt - a.createdAt);
    memoryPurchaseOrders = (data.purchaseOrders || []).sort((a: PurchaseOrder, b: PurchaseOrder) => b.createdAt - a.createdAt);
    memoryCustomers = (data.customers || []).sort((a: Customer, b: Customer) => b.createdAt - a.createdAt);
    memoryCashMovements = (data.cashMovements || []).sort((a: CashMovement, b: CashMovement) => b.createdAt - a.createdAt);
    memoryShiftSummaries = (data.shiftSummaries || []).sort((a: ShiftSummary, b: ShiftSummary) => b.createdAt - a.createdAt);
    memoryParkedSales = (data.parkedSales || []).sort((a: ParkedSale, b: ParkedSale) => b.createdAt - a.createdAt);
    memoryUsers = data.users || [];
    
    await logAction('SYSTEM_RESTORE', 'Base de datos restaurada desde backup', 'critical');
    notifyChanges();

    return true;
  } catch (error) {
    console.error("Failed to import data:", error);
    return false;
  }
}

export function getDashboardData(
    dateRange: { start: Date; end: Date },
    compareDateRange?: { start: Date; end: Date } | null
) {
    // Reutilizar la lógica existente de dashboard (copiada del original para mantener consistencia)
    
    function _calculatePeriodMetrics(transactions: Transaction[], dateRange: { start: Date; end: Date }, allProducts: Product[]) {
        const { start, end } = dateRange;
        const filteredTxs = transactions.filter(tx => {
            const txDate = tx.createdAt;
            return txDate >= start.getTime() && txDate <= end.getTime() && tx.type === 'sale';
        });

        const periodStats = {
            totalSales: filteredTxs.reduce((sum, tx) => sum + tx.total, 0),
            transactionCount: filteredTxs.length,
            avgTicket: filteredTxs.length > 0 ? filteredTxs.reduce((sum, tx) => sum + tx.total, 0) / filteredTxs.length : 0,
        };

        const daysInInterval = eachDayOfInterval({ start, end });
        const salesByDayData: { [key: string]: number } = {};
        daysInInterval.forEach(day => {
            const key = format(day, 'yyyy-MM-dd');
            salesByDayData[key] = 0;
        });

        const categorySales: { [key: string]: number } = {};
        const productSales: { [key: string]: { name: string; quantity: number } } = {};
        const salesByHour = Array(24).fill(0);
        const paymentMethodSplit: { [key: string]: number } = { 'Efectivo': 0, 'Tarjeta': 0 };

        filteredTxs.forEach(tx => {
            const txDate = new Date(tx.createdAt);
            const dayKey = format(txDate, 'yyyy-MM-dd');
            if (salesByDayData[dayKey] !== undefined) salesByDayData[dayKey] += tx.total;
            salesByHour[txDate.getHours()] += tx.total;
            paymentMethodSplit[tx.paymentMethod] += tx.total;

            tx.items.forEach(item => {
                const category = item.category || 'General';
                categorySales[category] = (categorySales[category] || 0) + (item.overriddenPrice ?? item.price * item.quantity);
                if (item.productId) {
                  if (!productSales[item.productId]) productSales[item.productId] = { name: item.name, quantity: 0 };
                  productSales[item.productId].quantity += item.quantity;
                }
            });
        });

        const topProducts = Object.values(productSales).sort((a, b) => b.quantity - a.quantity).slice(0, 5);
        const salesByDayValues = daysInInterval.map(day => salesByDayData[format(day, 'yyyy-MM-dd')] || 0);

        return { periodStats, salesByDay: Object.entries(salesByDayData), salesByDayValues, categorySales: Object.entries(categorySales).sort((a,b) => b[1] - a[1]), topProducts, salesByHour, paymentMethodSplit: Object.entries(paymentMethodSplit), hasTransactions: filteredTxs.length > 0 };
    }

    const periodData = _calculatePeriodMetrics(memoryTransactions, dateRange, memoryProducts);
    let comparePeriodData = null;
    if (compareDateRange) {
        const rawCompareData = _calculatePeriodMetrics(memoryTransactions, compareDateRange, memoryProducts);
        const primaryLength = periodData.salesByDayValues.length;
        let compareValues = rawCompareData.salesByDayValues;
        if (compareValues.length > primaryLength) compareValues = compareValues.slice(0, primaryLength);
        else if (compareValues.length < primaryLength) compareValues = compareValues.concat(Array(primaryLength - compareValues.length).fill(0));
        comparePeriodData = { ...rawCompareData, salesByDayValues: compareValues };
    }
    return { periodData, comparePeriodData };
}
