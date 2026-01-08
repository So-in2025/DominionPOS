
import type { Product, PromotionId } from './types';

export const MOCK_PRODUCTS: Product[] = [];

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
