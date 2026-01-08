
export interface PriceHistoryEntry {
  date: number;
  costPrice: number;
  sellingPrice: number;
}

export interface Product {
  id: string;
  name: string;
  price: number; 
  costPrice?: number; 
  category: string;
  stock: number;
  lowStockThreshold?: number;
  priceHistory?: PriceHistoryEntry[]; 
}

export interface SaleItem {
  id: string; 
  productId?: string;
  name: string;
  price: number;
  category?: string;
  quantity: number;
  overriddenPrice?: number;
  discount?: {
    type: 'percentage' | 'fixed';
    value: number;
  };
  isCustom?: boolean;
}

export type PromotionId = 'PROMO_BEBIDAS' | 'COMBO_KIOSCO' | 'SNACKS_3X2';

export interface Transaction {
  id: string;
  createdAt: number; 
  items: SaleItem[];
  total: number;
  paymentMethod: 'Efectivo' | 'Tarjeta' | 'Reembolso';
  amountReceived?: number;
  change?: number;
  customerId?: string;
  customerName?: string;
  subtotal: number;
  globalDiscount?: {
    type: 'percentage' | 'fixed';
    value: number;
  };
  discountAmount: number;
  type: 'sale' | 'refund';
  originalTransactionId?: string;
  activePromotion?: PromotionId;
}

export interface ParkedSale {
  id: string;
  createdAt: number;
  items: SaleItem[];
  customer: Customer | null;
  globalDiscount: { type: 'percentage' | 'fixed'; value: number } | null;
  activePromotion: PromotionId | null;
}

export interface CashMovement {
    id: string;
    createdAt: number;
    type: 'initial' | 'addition' | 'withdrawal';
    amount: number;
    reason?: string;
}

export interface ShiftSummary {
    id: string;
    createdAt: number;
    startAt: number;
    totalSales: number;
    cashSales: number;
    cardSales: number;
    transactionCount: number;
    initialAmount: number;
    cashAdditions: number;
    cashWithdrawals: number;
    expectedCash: number;
    countedCash: number;
    variance: number;
    countedDenominations: { [key: string]: number };
    notes?: string;
}

export interface PurchaseOrderItem {
  productId: string;
  name: string;
  quantity: number;
}

export interface PurchaseOrder {
  id: string;
  createdAt: number;
  receivedAt?: number;
  items: PurchaseOrderItem[];
  status: 'Borrador' | 'Ordenado' | 'Recibido';
}

export interface Customer {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  createdAt: number;
  loyaltyPoints?: number;
}

export interface CustomerDetails {
    customer: Customer;
    transactions: Transaction[];
    stats: {
        totalSpent: number;
        transactionCount: number;
        firstVisit: number;
        lastVisit: number;
    };
}

export interface LoyaltySettings {
  pointsPerDollar: number;
  pointsForRedemption: number;
  redemptionValue: number;
}

export interface BusinessSettings {
  storeName: string;
  address: string;
  phone: string;
  receiptFooter: string;
  logoUrl?: string; 
}

export interface User {
  id: string;
  name: string;
  pin: string; 
  role: 'admin' | 'cashier';
}

export interface AuditLogEntry {
  id: string;
  timestamp: number;
  userId: string;
  userName: string;
  action: string; 
  details?: string;
  severity: 'info' | 'warning' | 'critical';
}

export interface DominionInsight {
  id: string;
  type: 'stock' | 'inflation' | 'sales' | 'risk' | 'favorite';
  title: string;
  message: string;
  severity: 'low' | 'medium' | 'high';
  timestamp: number;
  actionLabel?: string;
  actionId?: string;
}

export type PlanTier = 'starter' | 'pro' | 'enterprise';
export type FeatureFlag = 'ai_scanner' | 'voice_ingest' | 'advanced_reports' | 'custom_branding' | 'remote_config' | 'inventory_alerts';

export interface CloudNodeIdentity {
    nodeId: string;
    licenseKey: string;
    lastSync: number;
    plan: PlanTier;
    status: 'active' | 'suspended' | 'banned';
    messages?: string[];
}

export interface TelemetryPacket {
    nodeId: string;
    timestamp: number;
    version: string;
    metrics: {
        totalSales: number;
        transactionCount: number;
        aiUsageCount: number;
        errors: number;
    }
}

export type Theme = 'light' | 'dark';

export interface LicenseStatus {
    isValid: boolean;
    plan: PlanTier | 'free';
    expiryDate: number | null;
    message: string;
}

export type BusinessType = 'kiosco' | 'cafe' | 'ferreteria' | 'ropa';
