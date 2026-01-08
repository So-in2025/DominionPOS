import { initializeApp } from 'firebase/app';
import { getFirestore, collection, doc, setDoc, onSnapshot, enableIndexedDbPersistence } from 'firebase/firestore';
import { getAuth, signInAnonymously } from 'firebase/auth';

// --- CONFIGURACIÓN DE FIREBASE (PRODUCCIÓN) ---
// Acceso seguro a variables de entorno para evitar crasheos si import.meta.env no está definido
const env = (import.meta as any).env || {};

const firebaseConfig = {
  apiKey: env.VITE_FIREBASE_API_KEY,
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: env.VITE_FIREBASE_APP_ID
};

let db: any = null;
let auth: any = null;
let storeId: string | null = null;
let isInitialized = false;

export async function initFirebase(licenseKey: string) {
    if (isInitialized) return;
    
    // Validación de seguridad para evitar crashes si no están las variables
    if (!firebaseConfig.apiKey || firebaseConfig.apiKey.includes("YOUR_API_KEY")) {
        console.warn("⚠️ [Firebase] Faltan variables de entorno. Modo Local.");
        return;
    }

    try {
        const app = initializeApp(firebaseConfig);
        db = getFirestore(app);
        auth = getAuth(app);
        
        try {
            await enableIndexedDbPersistence(db);
        } catch (err: any) {
            if (err.code == 'failed-precondition') {
                console.warn('Firebase persistencia falló (múltiples pestañas abiertas).');
            } else if (err.code == 'unimplemented') {
                console.warn('El navegador no soporta persistencia.');
            }
        }

        await signInAnonymously(auth);
        
        storeId = licenseKey;
        isInitialized = true;
        console.log("🔥 [Firebase] Conectado en Producción:", storeId);

    } catch (e) {
        console.error("Error inicializando Firebase:", e);
    }
}

// --- SYNC HELPERS ---

export function subscribeToCollection(
    collectionName: string, 
    onUpdate: (data: any[]) => void
) {
    if (!isInitialized || !db || !storeId) return () => {};

    const q = collection(db, 'stores', storeId, collectionName);
    
    return onSnapshot(q, (snapshot) => {
        const items: any[] = [];
        snapshot.forEach((doc) => {
            items.push({ ...doc.data(), id: doc.id });
        });
        const hasPendingWrites = snapshot.metadata.hasPendingWrites;
        if (!hasPendingWrites) {
            onUpdate(items);
        }
    });
}

export async function pushToCloud(collectionName: string, item: any) {
    if (!isInitialized || !db || !storeId) return;

    try {
        const ref = doc(db, 'stores', storeId, collectionName, item.id);
        await setDoc(ref, { ...item, _lastUpdated: Date.now() }, { merge: true });
    } catch (e) {
        console.error(`Error pushToCloud (${collectionName}):`, e);
    }
}

export async function deleteFromCloud(collectionName: string, itemId: string) {
    if (!isInitialized || !db || !storeId) return;
    
    try {
        const ref = doc(db, 'stores', storeId, collectionName, itemId);
        await setDoc(ref, { deleted: true, _lastUpdated: Date.now() }, { merge: true });
    } catch (e) {
        console.error(`Error deleteFromCloud (${collectionName}):`, e);
    }
}