
import type { LoyaltySettings, BusinessSettings } from '../types';
import * as cloudService from './cloud';

const LOYALTY_SETTINGS_KEY = 'dominion-loyalty-settings';
const BUSINESS_SETTINGS_KEY = 'dominion-business-settings';
const AI_QUOTA_KEY = 'dominion-ai-quota';

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
  customCategories: []
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

// --- AI Quota Management (Monthly Free Usage) ---

interface AiQuota {
    month: string; 
    imageCount: number;
    voiceCount: number;
}

function getQuota(): AiQuota {
    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${now.getMonth() + 1}`;
    
    try {
        const stored = localStorage.getItem(AI_QUOTA_KEY);
        if (stored) {
            const parsed: AiQuota = JSON.parse(stored);
            if (parsed.month === currentMonth) {
                return parsed;
            }
        }
    } catch(e) {}

    return { month: currentMonth, imageCount: 0, voiceCount: 0 };
}

export function checkFreeQuota(type: 'image' | 'voice'): boolean {
    const quota = getQuota();
    const limit = 1; 
    if (type === 'image') return quota.imageCount < limit;
    if (type === 'voice') return quota.voiceCount < limit;
    return false;
}

export function incrementFreeQuota(type: 'image' | 'voice') {
    const quota = getQuota();
    if (type === 'image') quota.imageCount++;
    if (type === 'voice') quota.voiceCount++;
    localStorage.setItem(AI_QUOTA_KEY, JSON.stringify(quota));
}

// --- Vendor Configuration (Nexus Sync) ---

export function getVendorWhatsApp(): string {
    // Ahora obtenemos el número directamente del Nexus (Registro Global)
    return cloudService.getGlobalNexusConfig().vendorWhatsApp;
}

export function saveVendorWhatsApp(number: string) {
    // Ahora guardamos en el Nexus (Registro Global)
    cloudService.saveGlobalNexusConfig({ vendorWhatsApp: number.replace(/[^0-9]/g, '') });
}
