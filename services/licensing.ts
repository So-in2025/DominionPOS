
import { LicenseStatus } from '../types';

const LICENSE_STORAGE_KEY = 'dominion-license-key';

// En un entorno real, esto usaría criptografía asimétrica (firma con clave privada en servidor, verificar con pública aquí).
// Para este demo "Local-First", usaremos un esquema de ofuscación Base64 simple.
// Formato: PLAN|TIMESTAMP_EXPIRACION|FIRMA_SIMPLE

export function getLicenseKey(): string | null {
    return localStorage.getItem(LICENSE_STORAGE_KEY);
}

export function setLicenseKey(key: string) {
    localStorage.setItem(LICENSE_STORAGE_KEY, key);
}

export function validateLicense(): LicenseStatus {
    const key = getLicenseKey();
    
    // Default Free Tier
    if (!key) {
        return {
            isValid: true,
            plan: 'free',
            expiryDate: null,
            message: 'Plan Gratuito (Limitado)'
        };
    }

    try {
        // Decodificar
        const decoded = atob(key);
        const [plan, expiryStr, signature] = decoded.split('|');

        if (!plan || !expiryStr || !signature) {
            throw new Error('Formato inválido');
        }

        const expiry = parseInt(expiryStr, 10);
        
        // Validación de firma muy básica (en real usar RSA/ECDSA)
        // Aquí asumimos que la firma debe contener la palabra "DOMINION" para ser válida
        if (!signature.includes('DOMINION')) {
             return { isValid: false, plan: 'free', expiryDate: null, message: 'Licencia corrupta o inválida.' };
        }

        // Chequeo de fecha (Time-Bomb)
        if (Date.now() > expiry) {
            return {
                isValid: false,
                plan: 'free', // Downgrade automático
                expiryDate: expiry,
                message: 'Tu licencia PRO ha expirado. Funcionalidad reducida.'
            };
        }

        return {
            isValid: true,
            plan: plan as any,
            expiryDate: expiry,
            message: 'Licencia Activa'
        };

    } catch (e) {
        return {
            isValid: false,
            plan: 'free',
            expiryDate: null,
            message: 'Error al verificar licencia.'
        };
    }
}

// Función auxiliar para que TÚ (el desarrollador) generes claves manualmente desde la consola del navegador si lo necesitas
export function generateLicenseKey(plan: 'pro' | 'enterprise', daysValid: number): string {
    const expiry = Date.now() + (daysValid * 24 * 60 * 60 * 1000);
    const raw = `${plan}|${expiry}|DOMINION_SECURE_${Math.floor(Math.random() * 1000)}`;
    return btoa(raw);
}
