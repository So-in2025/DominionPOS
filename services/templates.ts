
import type { Product, LoyaltySettings } from '../types';

export const BUSINESS_TEMPLATES = {
    kiosco: {
        name: 'Kiosco / Maxikiosco',
        products: [],
        categories: ['Bebidas', 'Golosinas', 'Cigarrillos', 'Snacks', 'Galletitas', 'Encendedores', 'Carga Virtual', 'Hielo', 'Librería'],
        loyalty: { pointsPerDollar: 1, pointsForRedemption: 1000, redemptionValue: 1000 }
    },
    despensa: {
        name: 'Despensa / Almacén',
        products: [],
        categories: ['Almacén', 'Lácteos', 'Fiambres', 'Panificados', 'Bebidas', 'Enlatados', 'Limpieza Hogar', 'Verdulería', 'Congelados'],
        loyalty: { pointsPerDollar: 1, pointsForRedemption: 2000, redemptionValue: 2500 }
    },
    cafeteria: {
        name: 'Cafetería',
        products: [],
        categories: ['Café de Especialidad', 'Infusiones', 'Bebidas Frías', 'Desayunos', 'Promociones', 'Café en Grano'],
        loyalty: { pointsPerDollar: 1, pointsForRedemption: 100, redemptionValue: 1800 }
    },
    pasteleria: {
        name: 'Pastelería / Panadería',
        products: [],
        categories: ['Panadería', 'Tortas', 'Tartas Dulces', 'Facturas', 'Masas Finas', 'Sandwiches de Miga', 'Postres', 'Velas y Adornos'],
        loyalty: { pointsPerDollar: 1, pointsForRedemption: 1500, redemptionValue: 2000 }
    },
    perfumeria: {
        name: 'Perfumería / Cosmética',
        products: [],
        categories: ['Fragancias', 'Maquillaje', 'Cuidado Facial', 'Cuidado Corporal', 'Higiene Personal', 'Capilar', 'Dermocosmética', 'Accesorios'],
        loyalty: { pointsPerDollar: 1, pointsForRedemption: 5000, redemptionValue: 6000 }
    },
    limpieza: {
        name: 'Artículos de Limpieza',
        products: [],
        categories: ['Ropa', 'Cocina', 'Baño', 'Pisos', 'Aromatizantes', 'Papelera', 'Insecticidas', 'Utensilios', 'Químicos Sueltos'],
        loyalty: { pointsPerDollar: 1, pointsForRedemption: 1000, redemptionValue: 1500 }
    },
    mascotas: {
        name: 'Tienda de Mascotas',
        products: [],
        categories: ['Alimento Perro', 'Alimento Gato', 'Snacks', 'Juguetes', 'Correas y Collares', 'Camas', 'Higiene Animal', 'Farmacia Vet'],
        loyalty: { pointsPerDollar: 1, pointsForRedemption: 3000, redemptionValue: 4000 }
    },
    comidas: {
        name: 'Comidas / Rotisería',
        products: [],
        categories: ['Minutas', 'Empanadas', 'Pizzas', 'Hamburguesas', 'Sandwiches', 'Bebidas', 'Postres', 'Ensaladas', 'Salsas'],
        loyalty: { pointsPerDollar: 1, pointsForRedemption: 1000, redemptionValue: 2000 }
    }
};
