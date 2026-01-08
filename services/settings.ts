
import type { LoyaltySettings, BusinessSettings } from '../types';

const LOYALTY_SETTINGS_KEY = 'dominion-loyalty-settings';
const BUSINESS_SETTINGS_KEY = 'dominion-business-settings';
const GEMINI_API_KEY_STORAGE = 'dominion-gemini-api-key';
const VENDOR_WHATSAPP_KEY = 'dominion-vendor-wa'; // New key for dynamic sales number

const LOYALTY_DEFAULTS: LoyaltySettings = {
  pointsPerDollar: 1,
  pointsForRedemption: 100,
  redemptionValue: 5,
};

const BUSINESS_DEFAULTS: BusinessSettings = {
  storeName: 'DOMINION POS',
  address: 'Av. Principal 123, Ciudad',
  phone: '(123) 456-7890',
  receiptFooter: '¡Gracias por su compra!',
  logoUrl: undefined,
};

export function getLoyaltySettings(): LoyaltySettings {
  try {
    const storedSettings = localStorage.getItem(LOYALTY_SETTINGS_KEY);
    if (storedSettings) {
      const parsed = JSON.parse(storedSettings);
      return { ...LOYALTY_DEFAULTS, ...parsed };
    }
  } catch (error) {
    console.error("Failed to load loyalty settings from localStorage", error);
  }
  return LOYALTY_DEFAULTS;
}

export function saveLoyaltySettings(settings: LoyaltySettings) {
  try {
    localStorage.setItem(LOYALTY_SETTINGS_KEY, JSON.stringify(settings));
  } catch (error) {
    console.error("Failed to save loyalty settings to localStorage", error);
  }
}

export function getBusinessSettings(): BusinessSettings {
  try {
    const storedSettings = localStorage.getItem(BUSINESS_SETTINGS_KEY);
    if (storedSettings) {
      const parsed = JSON.parse(storedSettings);
      return { ...BUSINESS_DEFAULTS, ...parsed };
    }
  } catch (error) {
    console.error("Failed to load business settings from localStorage", error);
  }
  return BUSINESS_DEFAULTS;
}

export function saveBusinessSettings(settings: BusinessSettings) {
  try {
    localStorage.setItem(BUSINESS_SETTINGS_KEY, JSON.stringify(settings));
  } catch (error) {
    console.error("Failed to save business settings to localStorage", error);
  }
}

// --- BYOK Logic ---

export function getGeminiApiKey(): string | null {
  // Prioriza la clave guardada por el usuario (BYOK), fallback a env si existe para dev
  return localStorage.getItem(GEMINI_API_KEY_STORAGE) || (typeof process !== 'undefined' && process.env ? process.env.API_KEY : null) || null;
}

export function saveGeminiApiKey(key: string) {
  if (!key) {
    localStorage.removeItem(GEMINI_API_KEY_STORAGE);
  } else {
    localStorage.setItem(GEMINI_API_KEY_STORAGE, key.trim());
  }
}

// --- Vendor Configuration (Dynamic WhatsApp) ---

export function getVendorWhatsApp(): string {
    return localStorage.getItem(VENDOR_WHATSAPP_KEY) || '5491100000000'; // Default placeholder
}

export function saveVendorWhatsApp(number: string) {
    localStorage.setItem(VENDOR_WHATSAPP_KEY, number.replace(/[^0-9]/g, '')); // Store only digits
}
