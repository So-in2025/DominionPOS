
import type { Product, PromotionId } from './types';

export const MOCK_PRODUCTS: Product[] = [
  { id: 'prod-001', name: 'Coca-Cola Sabor Original 600ml', price: 1200, category: 'Bebidas', stock: 100, lowStockThreshold: 24 },
  { id: 'prod-002', name: 'Agua Mineral Sin Gas 500ml', price: 800, category: 'Bebidas', stock: 80, lowStockThreshold: 24 },
  { id: 'prod-003', name: 'Alfajor Triple Chocolate', price: 950, category: 'Golosinas', stock: 50, lowStockThreshold: 10 },
  { id: 'prod-004', name: 'Papas Fritas Clásicas 80g', price: 1600, category: 'Snacks', stock: 30, lowStockThreshold: 10 },
  { id: 'prod-005', name: 'Galletitas Rellenas (Paquete)', price: 1400, category: 'Galletitas', stock: 40, lowStockThreshold: 10 },
  { id: 'prod-006', name: 'Chicles Mentolados (Caja)', price: 450, category: 'Golosinas', stock: 200, lowStockThreshold: 50 },
  { id: 'prod-007', name: 'Chocolate con Leche 100g', price: 2800, category: 'Golosinas', stock: 25, lowStockThreshold: 5 },
  { id: 'prod-008', name: 'Cerveza Rubia Lata 473ml', price: 1900, category: 'Bebidas', stock: 120, lowStockThreshold: 24 },
  { id: 'prod-009', name: 'Energizante 250ml', price: 1500, category: 'Bebidas', stock: 60, lowStockThreshold: 12 },
  { id: 'prod-010', name: 'Gomitas Frutales Paquete', price: 750, category: 'Golosinas', stock: 40, lowStockThreshold: 10 },
  { id: 'prod-011', name: 'Barra de Cereal', price: 600, category: 'Snacks', stock: 35, lowStockThreshold: 10 },
  { id: 'prod-012', name: 'Encendedor Grande', price: 900, category: 'Varios', stock: 50, lowStockThreshold: 10 },
];

export interface Promotion {
    id: PromotionId;
    name: string;
    description: string;
}

export const PROMOTIONS: Promotion[] = [
    {
        id: 'PROMO_BEBIDAS',
        name: 'Refrescante 10% OFF',
        description: '10% de descuento en todas las "Bebidas".'
    },
    {
        id: 'COMBO_KIOSCO',
        name: 'Combo Kiosco',
        description: 'Compra una "Bebida" y obtén 50% de descuento en una "Golosina".'
    },
    {
        id: 'SNACKS_3X2',
        name: '3x2 en Snacks',
        description: 'Compra 3 productos de "Snacks" y paga solo 2 (el de menor precio es gratis).'
    }
];
