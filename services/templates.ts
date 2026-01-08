
import type { Product, LoyaltySettings } from '../types';

export const BUSINESS_TEMPLATES = {
    kiosco: {
        name: 'Kiosco / Despensa',
        products: [
            { id: 'k-01', name: 'Coca-Cola 600ml', price: 1200, category: 'Bebidas', stock: 50 },
            { id: 'k-02', name: 'Agua Mineral 500ml', price: 800, category: 'Bebidas', stock: 40 },
            { id: 'k-03', name: 'Alfajor Triple', price: 950, category: 'Golosinas', stock: 60 },
            { id: 'k-04', name: 'Chicles Mentolados', price: 450, category: 'Golosinas', stock: 100 },
            { id: 'k-05', name: 'Cigarrillos 20u', price: 2500, category: 'Cigarrillos', stock: 30 },
            { id: 'k-06', name: 'Encendedor', price: 900, category: 'Varios', stock: 50 },
            { id: 'k-07', name: 'Papas Fritas 80g', price: 1600, category: 'Snacks', stock: 20 },
        ],
        loyalty: { pointsPerDollar: 0.1, pointsForRedemption: 500, redemptionValue: 1000 } // Kioscos dan pocos puntos por el margen bajo
    },
    cafe: {
        name: 'Cafetería / Panadería',
        products: [
            { id: 'c-01', name: 'Café Espresso', price: 1800, category: 'Cafetería', stock: 1000 },
            { id: 'c-02', name: 'Café con Leche', price: 2200, category: 'Cafetería', stock: 1000 },
            { id: 'c-03', name: 'Medialuna Manteca', price: 600, category: 'Panadería', stock: 100 },
            { id: 'c-04', name: 'Tostado Jamón y Queso', price: 3500, category: 'Cocina', stock: 30 },
            { id: 'c-05', name: 'Jugo de Naranja', price: 2000, category: 'Bebidas', stock: 50 },
            { id: 'c-06', name: 'Porción Torta Chocolate', price: 2800, category: 'Pastelería', stock: 15 },
        ],
        loyalty: { pointsPerDollar: 1, pointsForRedemption: 100, redemptionValue: 1800 } // 1 café gratis cada 10000 gastados aprox
    },
    ferreteria: {
        name: 'Ferretería',
        products: [
            { id: 'f-01', name: 'Tornillo T1 (x100)', price: 1500, category: 'Fijaciones', stock: 50 },
            { id: 'f-02', name: 'Cinta Aisladora', price: 1200, category: 'Electricidad', stock: 100 },
            { id: 'f-03', name: 'Lámpara LED 9W', price: 1800, category: 'Iluminación', stock: 200 },
            { id: 'f-04', name: 'Destornillador Phillips', price: 3500, category: 'Herramientas', stock: 20 },
            { id: 'f-05', name: 'Llave Inglesa', price: 8000, category: 'Herramientas', stock: 10 },
            { id: 'f-06', name: 'Cemento Contacto', price: 2200, category: 'Adhesivos', stock: 30 },
        ],
        loyalty: { pointsPerDollar: 0.5, pointsForRedemption: 2000, redemptionValue: 5000 }
    },
    ropa: {
        name: 'Tienda de Ropa',
        products: [
            { id: 'r-01', name: 'Remera Básica Algodón', price: 8000, category: 'Indumentaria', stock: 50 },
            { id: 'r-02', name: 'Jean Clásico', price: 25000, category: 'Indumentaria', stock: 30 },
            { id: 'r-03', name: 'Medias (Par)', price: 2000, category: 'Accesorios', stock: 100 },
            { id: 'r-04', name: 'Campera Abrigo', price: 45000, category: 'Abrigo', stock: 15 },
        ],
        loyalty: { pointsPerDollar: 1, pointsForRedemption: 5000, redemptionValue: 10000 }
    }
};
