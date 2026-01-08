
// ... (Previous Imports)
import { openDB, IDBPDatabase } from 'idb';
import {eachDayOfInterval, format, differenceInDays, endOfDay } from 'date-fns';
import type { Product, SaleItem, Transaction, PurchaseOrder, PurchaseOrderItem, Customer, CustomerDetails, PromotionId, CashMovement, ShiftSummary, ParkedSale, User, AuditLogEntry, DominionInsight } from '../types';
import { MOCK_PRODUCTS } from '../constants';
import { getLoyaltySettings } from './settings';
import * as cloudService from './cloud';
import * as firebaseService from './firebase';

const DB_NAME = 'dominion-db';
// ... (Constants DB_VERSION, STORE names)
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

const MAX_AUDIT_LOGS = 500;

let db: IDBPDatabase;

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

// ... (Helper functions notifyChanges, setCurrentUserForAudit, initCloudSync, syncLocalData, rotateAuditLogs, performConsistencyCheck)

export function setChangeListener(listener: () => void) {
    changeListener = listener;
}

function notifyChanges() {
    if (changeListener) changeListener();
}

export function setCurrentUserForAudit(user: User | null) {
    currentUserRef = user;
}

async function initCloudSync() {
    const plan = cloudService.getPlan();
    const identity = cloudService.getIdentity();

    if ((plan === 'pro' || plan === 'enterprise') && identity.licenseKey) {
        await firebaseService.initFirebase(identity.licenseKey);
        
        firebaseService.subscribeToCollection('products', (remoteProducts) => {
            syncLocalData(PRODUCT_STORE, remoteProducts, memoryProducts);
        });
        
        firebaseService.subscribeToCollection('transactions', (remoteTransactions) => {
            syncLocalData(TRANSACTION_STORE, remoteTransactions, memoryTransactions);
        });

        firebaseService.subscribeToCollection('customers', (remoteCustomers) => {
            syncLocalData(CUSTOMER_STORE, remoteCustomers, memoryCustomers);
        });
    }
}

async function syncLocalData(storeName: string, remoteData: any[], memoryCache: any[]) {
    const tx = db.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);
    
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

export async function rotateAuditLogs() {
    try {
        const allLogs = await db.getAllFromIndex(AUDIT_LOG_STORE, 'timestamp');
        if (allLogs.length > MAX_AUDIT_LOGS) {
            const toDelete = allLogs.length - MAX_AUDIT_LOGS;
            const tx = db.transaction(AUDIT_LOG_STORE, 'readwrite');
            const store = tx.objectStore(AUDIT_LOG_STORE);
            for (let i = 0; i < toDelete; i++) {
                await store.delete(allLogs[i].id);
            }
            await tx.done;
        }
    } catch (e) {
        console.error("Log Rotation Failed:", e);
    }
}

export async function performConsistencyCheck() {
    try {
        const tx = db.transaction([PARKED_SALES_STORE, PRODUCT_STORE], 'readwrite');
        const parkedStore = tx.objectStore(PARKED_SALES_STORE);
        const productStore = tx.objectStore(PRODUCT_STORE);
        
        const allParked = await parkedStore.getAll();
        for (const sale of allParked) {
            for (const item of sale.items) {
                if (item.productId) {
                    const exists = await productStore.get(item.productId);
                    if (!exists) {
                        console.warn(`Consistency: Orfaned item in parked sale.`);
                    }
                }
            }
        }
        await tx.done;
    } catch (e) {}
}

export async function initDB() {
  db = await openDB(DB_NAME, DB_VERSION, {
    upgrade(db, oldVersion) {
      if (!db.objectStoreNames.contains(PRODUCT_STORE)) db.createObjectStore(PRODUCT_STORE, { keyPath: 'id' });
      if (!db.objectStoreNames.contains(TRANSACTION_STORE)) db.createObjectStore(TRANSACTION_STORE, { keyPath: 'id' });
      if (!db.objectStoreNames.contains(PURCHASE_ORDER_STORE)) db.createObjectStore(PURCHASE_ORDER_STORE, { keyPath: 'id' });
      if (!db.objectStoreNames.contains(CUSTOMER_STORE)) db.createObjectStore(CUSTOMER_STORE, { keyPath: 'id' });
      if (!db.objectStoreNames.contains(CASH_MOVEMENT_STORE)) db.createObjectStore(CASH_MOVEMENT_STORE, { keyPath: 'id' });
      if (!db.objectStoreNames.contains(SHIFT_SUMMARY_STORE)) db.createObjectStore(SHIFT_SUMMARY_STORE, { keyPath: 'id' });
      if (!db.objectStoreNames.contains(PARKED_SALES_STORE)) db.createObjectStore(PARKED_SALES_STORE, { keyPath: 'id' });
      if (!db.objectStoreNames.contains(USER_STORE)) db.createObjectStore(USER_STORE, { keyPath: 'id' });
      if (!db.objectStoreNames.contains(AUDIT_LOG_STORE)) {
        const store = db.createObjectStore(AUDIT_LOG_STORE, { keyPath: 'id' });
        store.createIndex('timestamp', 'timestamp');
      }
    },
  });

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
  
  await performConsistencyCheck();
  await rotateAuditLogs();
  initCloudSync();
}

export async function exportDatabase(): Promise<string> {
    const allData = {
        version: DB_VERSION,
        timestamp: Date.now(),
        products: await db.getAll(PRODUCT_STORE),
        transactions: await db.getAll(TRANSACTION_STORE),
        customers: await db.getAll(CUSTOMER_STORE),
        purchaseOrders: await db.getAll(PURCHASE_ORDER_STORE),
        cashMovements: await db.getAll(CASH_MOVEMENT_STORE),
        shiftSummaries: await db.getAll(SHIFT_SUMMARY_STORE),
        users: await db.getAll(USER_STORE)
    };
    return JSON.stringify(allData, null, 2);
}

export async function importDatabase(jsonString: string): Promise<void> {
    const data = JSON.parse(jsonString);
    if (data.version !== DB_VERSION) {
        throw new Error("Fragilidad de Versión: El backup es incompatible con la versión actual del motor.");
    }

    const tx = db.transaction([
        PRODUCT_STORE, TRANSACTION_STORE, CUSTOMER_STORE, 
        PURCHASE_ORDER_STORE, CASH_MOVEMENT_STORE, 
        SHIFT_SUMMARY_STORE, USER_STORE
    ], 'readwrite');

    const stores = [
        { name: PRODUCT_STORE, data: data.products },
        { name: TRANSACTION_STORE, data: data.transactions },
        { name: CUSTOMER_STORE, data: data.customers },
        { name: PURCHASE_ORDER_STORE, data: data.purchaseOrders },
        { name: CASH_MOVEMENT_STORE, data: data.cashMovements },
        { name: SHIFT_SUMMARY_STORE, data: data.shiftSummaries },
        { name: USER_STORE, data: data.users }
    ];

    for (const s of stores) {
        const store = tx.objectStore(s.name as any);
        await store.clear();
        for (const item of (s.data || [])) {
            await store.add(item);
        }
    }

    await tx.done;
    await initDB();
    await logAction('DB_RESTORED', 'Base de datos restaurada desde backup externo', 'warning');
}

export async function logAction(action: string, details?: string, severity: AuditLogEntry['severity'] = 'info', forcedUser?: User) {
    try {
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
        return entry;
    } catch (e: any) {
        console.error("Storage Fragility: Audit log failed (Quota?)", e.name);
        return null;
    }
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
    if (user && user.pin === pin) return user;
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
    await logAction('USER_UPDATED', `Usuario modificado: ${updatedUser.name} (${updatedUser.role})`, 'warning');
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

const isPro = () => {
    const plan = cloudService.getPlan();
    return plan === 'pro' || plan === 'enterprise';
};

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

// ... (Remainder of file functions: addTransaction, addRefundTransaction, addCashMovement, etc. - kept intact)
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

  const productsToUpdate = [];
  for (const item of saleItems) {
      if (item.productId) {
          const product = await productStore.get(item.productId);
          if (!product) continue;
          if (product.stock < item.quantity) {
              await tx.abort();
              throw new Error(`Fragilidad de Stock Detectada: "${item.name}" no tiene suficiente disponibilidad.`);
          }
          product.stock -= item.quantity;
          productsToUpdate.push(product);
      }
  }

  await Promise.all(productsToUpdate.map(p => {
      if(isPro()) firebaseService.pushToCloud('products', p);
      return productStore.put(p);
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

  productsToUpdate.forEach(updatedP => {
      const idx = memoryProducts.findIndex(p => p.id === updatedP.id);
      if (idx !== -1) memoryProducts[idx].stock = updatedP.stock;
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
        
        const idx = memoryProducts.findIndex(p => p.id === product.id);
        if (idx !== -1) memoryProducts[idx].stock = product.stock;
      }
    }
  }));

  await tx.objectStore(TRANSACTION_STORE).add(newTransaction);
  await tx.done;
  
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
        const idx = memoryProducts.findIndex(p => p.id === product.id);
        if (idx !== -1) memoryProducts[idx].stock = product.stock;
      }
    }));
  }

  await poStore.put(updatedPO);
  await tx.done;

  memoryPurchaseOrders[poIndex] = updatedPO;
  if(isPro()) firebaseService.pushToCloud('purchaseOrders', updatedPO);
  return updatedPO;
}

export async function addCustomer(customerData: Omit<Customer, 'id' | 'createdAt' | 'loyaltyPoints'>): Promise<Customer> {
  const newCustomer: Customer = { ...customerData, id: `cust-${Date.now()}`, createdAt: Date.now(), loyaltyPoints: 0 };
  memoryCustomers.unshift(newCustomer);
  await db.add(CUSTOMER_STORE, newCustomer);
  if(isPro()) firebaseService.pushToCloud('customers', newCustomer);
  return newCustomer;
}

export async function updateCustomer(updatedCustomer: Customer): Promise<Customer | undefined> {
  const index = memoryCustomers.findIndex(c => c.id === updatedCustomer.id);
  if (index === -1) return undefined;
  const originalCustomer = memoryCustomers[index];
  const finalCustomer = { ...originalCustomer, ...updatedCustomer };
  memoryCustomers[index] = finalCustomer;
  await db.put(CUSTOMER_STORE, finalCustomer);
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
  await db.delete(CUSTOMER_STORE, customerId);
  memoryCustomers = memoryCustomers.filter(c => c.id !== customerId);
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

export function getDashboardData(
    dateRange: { start: Date; end: Date },
    compareDateRange?: { start: Date; end: Date } | null
) {
    function _calculatePeriodMetrics(transactions: Transaction[], dateRange: { start: Date; end: Date }) {
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
        const salesByDayValues = daysInInterval.map(day => {
            const dayStart = new Date(day).setHours(0, 0, 0, 0);
            const dayEnd = endOfDay(day).getTime();
            return filteredTxs
                .filter(tx => tx.createdAt >= dayStart && tx.createdAt <= dayEnd)
                .reduce((sum, tx) => sum + tx.total, 0);
        });

        const categorySales: { [key: string]: number } = {};
        const productSales: { [key: string]: { name: string; quantity: number } } = {};
        const salesByHour = Array(24).fill(0);
        const paymentMethodSplit: { [key: string]: number } = { 'Efectivo': 0, 'Tarjeta': 0 };

        filteredTxs.forEach(tx => {
            const txDate = new Date(tx.createdAt);
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
        const labels = daysInInterval.map(day => format(day, 'MMM d'));

        return { 
            periodStats, 
            labels, 
            salesByDayValues, 
            categorySales: Object.entries(categorySales).sort((a,b) => b[1] - a[1]), 
            topProducts, 
            salesByHour, 
            paymentMethodSplit: Object.entries(paymentMethodSplit), 
            hasTransactions: filteredTxs.length > 0 
        };
    }

    const periodData = _calculatePeriodMetrics(memoryTransactions, dateRange);
    let comparePeriodData = null;
    if (compareDateRange) {
        comparePeriodData = _calculatePeriodMetrics(memoryTransactions, compareDateRange);
        const maxLength = Math.max(periodData.salesByDayValues.length, comparePeriodData.salesByDayValues.length);
        while(periodData.salesByDayValues.length < maxLength) periodData.salesByDayValues.push(0);
        while(comparePeriodData.salesByDayValues.length < maxLength) comparePeriodData.salesByDayValues.push(0);
    }
    return { periodData, comparePeriodData };
}

export function generateInsights(): DominionInsight[] {
    const insights: DominionInsight[] = [];
    const now = Date.now();

    const lowStock = memoryProducts.filter(p => p.lowStockThreshold && p.stock <= p.lowStockThreshold);
    if (lowStock.length > 0) {
        insights.push({
            id: 'insight-stock',
            type: 'stock',
            title: 'Reposición Crítica',
            message: `Tienes ${lowStock.length} productos con stock bajo. Considera generar una Orden de Compra.`,
            severity: 'high',
            timestamp: now,
            actionLabel: 'Ver Inventario',
            actionId: 'action-view-inventory'
        });
    }

    const productSales: { [key: string]: { name: string; quantity: number } } = {};
    memoryTransactions.filter(t => t.type === 'sale').forEach(tx => {
        tx.items.forEach(item => {
            if (item.productId) {
                if (!productSales[item.productId]) productSales[item.productId] = { name: item.name, quantity: 0 };
                productSales[item.productId].quantity += item.quantity;
            }
        });
    });

    const favorites = JSON.parse(localStorage.getItem('dominion-favorites') || '[]');
    const topNonFavorite = Object.entries(productSales)
        .filter(([id]) => !favorites.includes(id))
        .sort((a,b) => b[1].quantity - a[1].quantity)
        .slice(0, 1)[0];

    if (topNonFavorite) {
        insights.push({
            id: 'insight-fav',
            type: 'favorite',
            title: 'Sugerencia de Acceso Rápido',
            message: `"${topNonFavorite[1].name}" es muy vendido. Agrégalo a favoritos para cobrar más rápido.`,
            severity: 'medium',
            timestamp: now
        });
    }

    const lastSummary = memoryShiftSummaries[0];
    const openTransactions = getOpenTransactions();
    if (openTransactions.length > 0) {
        const firstTxInShift = openTransactions[openTransactions.length - 1];
        const shiftDurationHours = (now - firstTxInShift.createdAt) / (1000 * 60 * 60);
        if (shiftDurationHours > 12) {
            insights.push({
                id: 'insight-risk',
                type: 'risk',
                title: 'Turno Extendido',
                message: `Llevas más de 12 horas sin cerrar caja. Se recomienda realizar un arqueo.`,
                severity: 'medium',
                timestamp: now,
                actionLabel: 'Cerrar Caja',
                actionId: 'action-view-summary'
            });
        }
    }

    const inflationRisk = memoryProducts.filter(p => {
        if (!p.priceHistory || p.priceHistory.length < 2) return false;
        const last = p.priceHistory[p.priceHistory.length - 1];
        const prev = p.priceHistory[p.priceHistory.length - 2];
        return last.costPrice > prev.costPrice * 1.1; 
    });

    if (inflationRisk.length > 0) {
        insights.push({
            id: 'insight-inflation',
            type: 'inflation',
            title: 'Alerta de Inflación',
            message: `Se detectó un aumento de costo en ${inflationRisk.length} productos. Revisa tus márgenes.`,
            severity: 'high',
            timestamp: now
        });
    }

    return insights;
}
