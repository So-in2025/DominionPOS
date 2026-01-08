
import type { CloudNodeIdentity, PlanTier, FeatureFlag, TelemetryPacket } from '../types';
import * as dbService from './db';

// --- MOCK SERVER CONFIGURATION ---
const SERVER_LATENCY_MS = 800; 
const SERVER_DB_KEY = 'dominion_nexus_central_registry_v1'; 

// --- CLIENT CONFIGURATION ---
const CLIENT_IDENTITY_KEY = 'dominion_local_identity';

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

function _serverDB_getAll(): ServerLicenseRecord[] {
    try {
        const data = localStorage.getItem(SERVER_DB_KEY);
        return data ? JSON.parse(data) : [];
    } catch { return []; }
}

function _serverDB_save(records: ServerLicenseRecord[]) {
    localStorage.setItem(SERVER_DB_KEY, JSON.stringify(records));
}

async function _server_activateLicense(licenseKey: string, nodeId: string): Promise<{ success: boolean; plan?: PlanTier; message: string }> {
    return new Promise(resolve => {
        setTimeout(() => {
            const db = _serverDB_getAll();
            const license = db.find(l => l.key === licenseKey);

            if (!license) {
                // Strict mode enabled: No implicit free keys anymore.
                return resolve({ success: false, message: "Error 404: Licencia inexistente." });
            }

            if (license.status === 'revoked') {
                return resolve({ success: false, message: "Error 403: Licencia revocada." });
            }

            const isAlreadyBound = license.boundNodeIds.includes(nodeId);
            
            if (!isAlreadyBound) {
                if (license.boundNodeIds.length >= license.maxDevices) {
                    if (license.plan === 'starter') {
                        return resolve({ 
                            success: false, 
                            message: "BLOQUEADO: El Plan Base es válido para 1 sola caja." 
                        });
                    } else {
                        return resolve({ 
                            success: false, 
                            message: `Límite de dispositivos alcanzado (${license.maxDevices}).` 
                        });
                    }
                }
                license.boundNodeIds.push(nodeId);
            }

            license.lastCheckIn = Date.now();
            _serverDB_save(db); 

            return resolve({ 
                success: true, 
                plan: license.plan, 
                message: `Licencia ${license.plan.toUpperCase()} activa. Sincronización habilitada.` 
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
                const prefix = plan === 'starter' ? 'BAS' : plan === 'pro' ? 'PRO' : 'ENT'; // Changed PRE to BAS
                uniqueKey = `${prefix}-${seg1}-${seg2}`;
                if (!db.find(r => r.key === uniqueKey)) isUnique = true;
            }

            const newRecord: ServerLicenseRecord = {
                key: uniqueKey,
                plan,
                status: 'active',
                boundNodeIds: [],
                maxDevices: plan === 'starter' ? 1 : 99, 
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
        // Initial state doesn't have a license key anymore
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

export async function connectToNexus(licenseKeyInput?: string): Promise<{ success: boolean; message: string }> {
    if (!navigator.onLine) return { success: false, message: "Sin conexión a internet." };
    
    const keyToSend = licenseKeyInput ? licenseKeyInput.trim() : clientIdentity.licenseKey;
    
    // Don't verify empty keys
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
        localStorage.setItem(CLIENT_IDENTITY_KEY, JSON.stringify(clientIdentity));
        notifyListeners();
        sendTelemetry();
    }
    
    return { success: response.success, message: response.message };
}

export function generateTelemetryPacket(): TelemetryPacket {
    const transactions = dbService.getTransactions();
    const totalSalesValue = transactions.reduce((acc, t) => acc + (t.type==='sale' ? t.total : 0), 0);
    return {
        nodeId: clientIdentity.nodeId,
        timestamp: Date.now(),
        version: '2.0.0', 
        metrics: {
            totalSales: totalSalesValue,
            transactionCount: transactions.length,
            aiUsageCount: 0,
            errors: 0
        }
    };
}

/**
 * IMPLEMENTACIÓN REAL: Envío de salud del nodo al servidor (Simulado)
 */
export async function sendTelemetry() {
    if (!navigator.onLine || clientIdentity.plan === 'starter' || !clientIdentity.licenseKey) return;
    
    const packet = generateTelemetryPacket();
    console.debug("📡 [Nexus Telemetry] Syncing node health...", packet);
    
    // Simular que el servidor actualiza el registro de 'lastCheckIn'
    const db = _serverDB_getAll();
    const record = db.find(l => l.key === clientIdentity.licenseKey);
    if (record) {
        record.lastCheckIn = Date.now();
        _serverDB_save(db);
    }
}
