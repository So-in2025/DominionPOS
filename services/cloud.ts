import type { CloudNodeIdentity, PlanTier, FeatureFlag, TelemetryPacket } from '../types';
import * as dbService from './db';

// --- MOCK SERVER CONFIGURATION ---
const SERVER_LATENCY_MS = 800; 
const SERVER_DB_KEY = 'dominion_nexus_central_registry_v1'; 
const GLOBAL_CONFIG_KEY = 'dominion_nexus_global_config';

const PLAN_FEATURES: Record<PlanTier, FeatureFlag[]> = {
    starter: [], 
    pro: ['ai_scanner', 'voice_ingest', 'advanced_reports', 'custom_branding', 'inventory_alerts'], 
    enterprise: ['ai_scanner', 'voice_ingest', 'advanced_reports', 'custom_branding', 'remote_config', 'inventory_alerts'] 
};

// ==========================================
// SECCIÓN 1: LÓGICA DE SERVIDOR (SIMULADA)
// ==========================================

interface ServerLicenseRecord {
    key: string;
    plan: PlanTier;
    status: 'active' | 'revoked' | 'suspended';
    boundNodeIds: string[]; 
    maxDevices: number;     
    createdAt: number;
    lastCheckIn: number | null;
}

interface GlobalNexusConfig {
    vendorWhatsApp: string;
    systemVersion: string;
    maintenanceMode: boolean;
}

function _serverDB_getAll(): ServerLicenseRecord[] {
    try {
        const data = localStorage.getItem(SERVER_DB_KEY);
        return data ? JSON.parse(data) : [];
    } catch { return []; }
}

function _serverDB_save(records: ServerLicenseRecord[]) {
    localStorage.setItem(SERVER_DB_KEY, JSON.stringify(records));
}

export function getGlobalNexusConfig(): GlobalNexusConfig {
    const defaults = { vendorWhatsApp: '5491100000000', systemVersion: '2.5.0', maintenanceMode: false };
    try {
        const data = localStorage.getItem(GLOBAL_CONFIG_KEY);
        return data ? { ...defaults, ...JSON.parse(data) } : defaults;
    } catch { return defaults; }
}

export function saveGlobalNexusConfig(config: Partial<GlobalNexusConfig>) {
    const current = getGlobalNexusConfig();
    localStorage.setItem(GLOBAL_CONFIG_KEY, JSON.stringify({ ...current, ...config }));
    window.dispatchEvent(new Event('dominion_global_config_update'));
}

async function _server_activateLicense(licenseKey: string, nodeId: string): Promise<{ success: boolean; plan?: PlanTier; message: string }> {
    return new Promise(resolve => {
        setTimeout(() => {
            // --- TRIAL KEY VALIDATION ---
            if (licenseKey.startsWith('TRIAL-')) {
                try {
                    const parts = licenseKey.split('-');
                    const plan = parts[1] as PlanTier;
                    const expiryTimestamp = parseInt(parts[2], 10);
                    
                    if (Date.now() > expiryTimestamp) {
                        return resolve({ success: false, message: "Tu prueba PRO ha finalizado." });
                    }

                    return resolve({ 
                        success: true, 
                        plan: plan, 
                        message: `Prueba ${plan.toUpperCase()} activa.` 
                    });
                } catch (e) {
                    return resolve({ success: false, message: "Clave de prueba inválida." });
                }
            }

            // --- STANDARD LICENSE VALIDATION ---
            const db = _serverDB_getAll();
            const license = db.find(l => l.key === licenseKey);

            if (!license) {
                return resolve({ success: false, message: "Error 404: Licencia inexistente." });
            }

            if (license.status === 'revoked') {
                return resolve({ success: false, message: "Error 403: Licencia revocada." });
            }

            const isAlreadyBound = license.boundNodeIds.includes(nodeId);
            
            if (!isAlreadyBound) {
                if (license.boundNodeIds.length >= license.maxDevices) {
                    return resolve({ 
                        success: false, 
                        message: `BLOQUEADO: Límite de dispositivos alcanzado para este plan (${license.maxDevices}).` 
                    });
                }
                license.boundNodeIds.push(nodeId);
            }

            license.lastCheckIn = Date.now();
            _serverDB_save(db); 

            return resolve({ 
                success: true, 
                plan: license.plan, 
                message: `Licencia ${license.plan.toUpperCase()} activa.` 
            });

        }, SERVER_LATENCY_MS);
    });
}

export async function adminGenerateLicense(plan: PlanTier): Promise<string> {
    return new Promise(resolve => {
        setTimeout(() => {
            const db = _serverDB_getAll();
            let uniqueKey = '';
            let isUnique = false;
            
            while (!isUnique) {
                const seg1 = Math.random().toString(36).substring(2, 6).toUpperCase();
                const seg2 = Math.random().toString(36).substring(2, 6).toUpperCase();
                const prefix = plan === 'starter' ? 'BAS' : plan === 'pro' ? 'PRO' : 'ENT';
                uniqueKey = `${prefix}-${seg1}-${seg2}`;
                if (!db.find(r => r.key === uniqueKey)) isUnique = true;
            }

            const newRecord: ServerLicenseRecord = {
                key: uniqueKey,
                plan,
                status: 'active',
                boundNodeIds: [],
                maxDevices: plan === 'starter' ? 1 : plan === 'pro' ? 3 : 99, 
                createdAt: Date.now(),
                lastCheckIn: null
            };

            db.unshift(newRecord);
            _serverDB_save(db);
            resolve(uniqueKey);
        }, 500);
    });
}

export async function adminGetIssuedLicenses(): Promise<ServerLicenseRecord[]> {
    return new Promise(resolve => setTimeout(() => resolve(_serverDB_getAll()), 300));
}

export async function adminRevokeLicense(key: string): Promise<void> {
    const db = _serverDB_getAll();
    const license = db.find(r => r.key === key);
    if (license) {
        license.status = 'revoked';
        _serverDB_save(db);
    }
}

// ==========================================
// SECCIÓN 2: LÓGICA DE CLIENTE
// ==========================================

const CLIENT_IDENTITY_KEY = 'dominion_nexus_identity';

let clientIdentity: CloudNodeIdentity = {
    nodeId: '', 
    licenseKey: '', 
    lastSync: 0,
    plan: 'starter',
    status: 'active'
};

let pendingSyncCount = 0; 

try {
    const stored = localStorage.getItem(CLIENT_IDENTITY_KEY);
    if (stored) {
        clientIdentity = JSON.parse(stored);
    } else {
        clientIdentity = {
            nodeId: crypto.randomUUID(),
            licenseKey: '',
            plan: 'starter',
            status: 'active',
            lastSync: 0
        };
        localStorage.setItem(CLIENT_IDENTITY_KEY, JSON.stringify(clientIdentity));
    }
} catch (e) { console.error("Error init client identity", e); }

let listeners: ((isConnected: boolean, plan: PlanTier, pending: number) => void)[] = [];
let isNetworkOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;

if (typeof window !== 'undefined') {
    window.addEventListener('online', () => { isNetworkOnline = true; notifyListeners(); connectToNexus(); });
    window.addEventListener('offline', () => { isNetworkOnline = false; notifyListeners(); });
    window.addEventListener('storage', (e) => {
        if (e.key === CLIENT_IDENTITY_KEY) {
            try {
                const stored = localStorage.getItem(CLIENT_IDENTITY_KEY);
                if (stored) clientIdentity = JSON.parse(stored);
                notifyListeners();
            } catch {}
        }
    });
}

function notifyListeners() {
    listeners.forEach(l => l(isNetworkOnline, clientIdentity.plan, pendingSyncCount));
}

export const subscribeToNexusStatus = (callback: (isConnected: boolean, plan: PlanTier, pending: number) => void) => {
    listeners.push(callback);
    callback(isNetworkOnline, clientIdentity.plan, pendingSyncCount); 
    return () => { listeners = listeners.filter(l => l !== callback); };
};

export const getPlan = (): PlanTier => clientIdentity.plan;
export const getIdentity = (): CloudNodeIdentity => clientIdentity; 

export const hasAccess = (feature: FeatureFlag): boolean => {
    const allowedFeatures = PLAN_FEATURES[clientIdentity.plan];
    if (clientIdentity.status !== 'active') return false;
    return allowedFeatures.includes(feature);
};

export function setPendingSync(count: number) {
    pendingSyncCount = count;
    notifyListeners();
}

// Fix: Update function signature to include optional 'plan' property in return type.
export async function connectToNexus(licenseKeyInput?: string): Promise<{ success: boolean; message: string; plan?: PlanTier; }> {
    if (!navigator.onLine) return { success: false, message: "Sin conexión a internet." };
    
    const keyToSend = licenseKeyInput ? licenseKeyInput.trim() : clientIdentity.licenseKey;
    if (!keyToSend) return { success: false, message: "Sin clave." };

    const response = await _server_activateLicense(keyToSend, clientIdentity.nodeId);

    if (response.success && response.plan) {
        clientIdentity = {
            ...clientIdentity,
            licenseKey: keyToSend,
            plan: response.plan,
            status: 'active',
            lastSync: Date.now()
        };
    } else if (!response.success && response.message.includes("finalizado")) {
        // Handle trial expiration: Downgrade to starter
        clientIdentity = {
            ...clientIdentity,
            plan: 'starter',
            status: 'active'
        };
    }

    localStorage.setItem(CLIENT_IDENTITY_KEY, JSON.stringify(clientIdentity));
    notifyListeners();
    if (response.success) sendTelemetry();
    
    // Fix: Pass the 'plan' property from the server response back to the caller.
    return { success: response.success, message: response.message, plan: response.plan };
}

export function generateTelemetryPacket(): TelemetryPacket {
    const transactions = dbService.getTransactions();
    const totalSalesValue = transactions.reduce((acc, t) => acc + (t.type==='sale' ? t.total : 0), 0);
    return {
        nodeId: clientIdentity.nodeId,
        timestamp: Date.now(),
        version: '2.5.0', 
        metrics: {
            totalSales: totalSalesValue,
            transactionCount: transactions.length,
            aiUsageCount: 0,
            errors: 0
        }
    };
}

export async function sendTelemetry() {
    if (!navigator.onLine || !clientIdentity.licenseKey || clientIdentity.licenseKey.startsWith('TRIAL-')) return;
    const packet = generateTelemetryPacket();
    const db = _serverDB_getAll();
    const record = db.find(l => l.key === clientIdentity.licenseKey);
    if (record) {
        record.lastCheckIn = Date.now();
        _serverDB_save(db);
    }
}
