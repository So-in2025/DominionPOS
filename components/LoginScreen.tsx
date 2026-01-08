
import React, { useState, useEffect, useCallback } from 'react';
import type { User, BusinessSettings, BusinessType, PlanTier } from '../types';
import * as dbService from '../services/db';
import * as settingsService from '../services/settings';
import * as soundService from '../services/sound';
import * as cloudService from '../services/cloud';
import { BUSINESS_TEMPLATES } from '../services/templates';
import { LockKeyhole, Delete, ShieldCheck, PlayCircle, Store, Crown, User as UserIcon, Plus, LayoutGrid, Briefcase, MessageCircle, X, CheckCircle, Loader2 } from 'lucide-react';
import DeveloperPanel from './DeveloperPanel';

interface LoginScreenProps {
  onLoginSuccess: (user: User) => void;
}

const PinPadButton: React.FC<{ onClick: () => void, children: React.ReactNode, className?: string }> = ({ onClick, children, className }) => (
    <button onClick={() => { soundService.playSound('type'); onClick(); }} className={`flex items-center justify-center h-16 rounded-lg text-2xl font-semibold transition-colors bg-dp-soft-gray text-dp-dark-gray hover:bg-gray-300 dark:bg-dp-charcoal dark:text-dp-light-gray dark:hover:bg-gray-700 ${className || ''}`}>
        {children}
    </button>
);

const LoginScreen: React.FC<LoginScreenProps> = ({ onLoginSuccess }) => {
    const [users, setUsers] = useState<User[]>([]);
    const [selectedUser, setSelectedUser] = useState<User | null>(null);
    const [pin, setPin] = useState('');
    const [error, setError] = useState('');
    const [settings, setSettings] = useState<BusinessSettings | null>(null);
    const [isDevPanelOpen, setIsDevPanelOpen] = useState(false);
    
    // Security Pattern State
    const [tapSequence, setTapSequence] = useState<string[]>([]);
    
    // Setup Mode States
    const [storeName, setStoreName] = useState('');
    const [selectedIndustry, setSelectedIndustry] = useState<BusinessType | ''>('');
    const [selectedPlan, setSelectedPlan] = useState<PlanTier>('starter');
    const [validatedLicenseKey, setValidatedLicenseKey] = useState(''); // Stores the key to be saved
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    // License Verification State
    const [verifyingPlan, setVerifyingPlan] = useState<PlanTier | null>(null);
    const [licenseInput, setLicenseInput] = useState('');
    const [verificationStatus, setVerificationStatus] = useState<{loading: boolean, error: string, success: boolean}>({ loading: false, error: '', success: false });

    // Add Cashier State
    const [isAddingCashier, setIsAddingCashier] = useState(false);
    const [newCashierName, setNewCashierName] = useState('');

    useEffect(() => {
        const load = () => {
            setUsers(dbService.getUsers());
            setSettings(settingsService.getBusinessSettings());
        };
        load();
        
        // Auto-generate free key on mount for default selection
        if (!validatedLicenseKey) {
             setValidatedLicenseKey(`FREE-${Math.random().toString(36).substring(2, 10).toUpperCase()}`);
        }
    }, []);
    
    // Reset sequence if inactive for 5 seconds
    useEffect(() => {
        if (tapSequence.length > 0) {
            const timer = setTimeout(() => {
                setTapSequence([]);
            }, 5000);
            return () => clearTimeout(timer);
        }
    }, [tapSequence]);
    
    const handleRefreshData = () => {
        setUsers(dbService.getUsers());
        setSettings(settingsService.getBusinessSettings());
        setSelectedUser(null);
    };

    // --- LICENSE VERIFICATION LOGIC ---
    const handlePlanClick = (plan: PlanTier) => {
        if (plan === 'starter') {
            setSelectedPlan('starter');
            setValidatedLicenseKey(`FREE-${Math.random().toString(36).substring(2, 10).toUpperCase()}`);
            soundService.playSound('click');
        } else {
            // Open Modal for Pro/Enterprise
            setVerifyingPlan(plan);
            setLicenseInput('');
            setVerificationStatus({ loading: false, error: '', success: false });
            soundService.playSound('pop');
        }
    };

    const handleVerifyLicense = async () => {
        if (!licenseInput.trim()) {
            setVerificationStatus({ loading: false, error: 'Ingrese una clave válida.', success: false });
            soundService.playSound('error');
            return;
        }

        setVerificationStatus({ loading: true, error: '', success: false });
        
        // Simulate network check using existing service
        const result = await cloudService.connectToNexus(licenseInput);
        
        if (result.success && !result.message.includes("Gratuita")) {
            setVerificationStatus({ loading: false, error: '', success: true });
            soundService.playSound('success');
            
            // Wait a moment for visual feedback then close
            setTimeout(() => {
                if (verifyingPlan) setSelectedPlan(verifyingPlan);
                setValidatedLicenseKey(licenseInput);
                setVerifyingPlan(null);
            }, 1000);
        } else {
            setVerificationStatus({ loading: false, error: 'Licencia inválida o expirada.', success: false });
            soundService.playSound('error');
        }
    };

    const getWhatsAppLink = () => {
        const vendorNumber = settingsService.getVendorWhatsApp();
        const text = `Hola, me interesa adquirir una licencia ${verifyingPlan?.toUpperCase()} para DOMINION POS.`;
        return `https://wa.me/${vendorNumber}?text=${encodeURIComponent(text)}`;
    };

    // --- INITIALIZATION LOGIC ---
    const handleInitializeSystem = async () => {
        if (isSubmitting) return;
        
        if(!storeName.trim()) {
            setError("Ingrese el nombre del punto de venta.");
            soundService.playSound('error');
            return;
        }
        if(!selectedIndustry) {
            setError("Seleccione un rubro.");
            soundService.playSound('error');
            return;
        }

        setIsSubmitting(true);
        try {
            // 1. Guardar Configuración del Negocio
            const currentSettings = settingsService.getBusinessSettings();
            settingsService.saveBusinessSettings({ ...currentSettings, storeName: storeName.trim() });

            // 2. Aplicar Plantilla de Rubro (Productos)
            const template = BUSINESS_TEMPLATES[selectedIndustry];
            if (template) {
                // Limpiar productos existentes
                const existingProds = dbService.getProducts();
                for (const p of existingProds) await dbService.deleteProduct(p.id);
                // Añadir productos plantilla
                for (const p of template.products) await dbService.addProduct(p);
                settingsService.saveLoyaltySettings(template.loyalty);
            }

            // 3. Crear Usuario ADMIN (Siempre) - PIN Hardcoded 1234
            await dbService.addUser({
                name: 'Admin',
                pin: '1234',
                role: 'admin'
            });

            // 4. Crear Usuario CAJA (Solo si es Pro o Comercio)
            if (selectedPlan === 'pro' || selectedPlan === 'enterprise') {
                await dbService.addUser({
                    name: 'Caja 1',
                    pin: '', // Sin PIN
                    role: 'cashier'
                });
            }

            // 5. Guardar Identidad del Nodo (Con la clave validada)
            localStorage.setItem('dominion_nexus_identity', JSON.stringify({
                nodeId: crypto.randomUUID(),
                licenseKey: validatedLicenseKey, // Use the verified key
                plan: selectedPlan,
                status: 'active',
                lastSync: Date.now()
            }));
            window.dispatchEvent(new Event('storage'));

            soundService.playSound('hero');
            handleRefreshData();
        } catch (e) {
            console.error(e);
            setError("Error al inicializar.");
            setIsSubmitting(false);
        }
    };

    // --- QUICK ADD CASHIER ---
    const handleQuickAddCashier = async () => {
        if (!newCashierName.trim()) return;
        
        const storedPlan = localStorage.getItem('dominion_nexus_identity');
        const planData = storedPlan ? JSON.parse(storedPlan).plan : 'starter';
        const currentUsers = dbService.getUsers();
        const maxUsers = planData === 'pro' ? 2 : planData === 'enterprise' ? 6 : 1;

        if (currentUsers.length >= maxUsers) {
            alert("Límite de usuarios de su plan alcanzado.");
            setIsAddingCashier(false);
            setNewCashierName('');
            return;
        }

        await dbService.addUser({
            name: newCashierName.trim(),
            pin: '', // Sin PIN
            role: 'cashier'
        });
        setNewCashierName('');
        setIsAddingCashier(false);
        handleRefreshData();
        soundService.playSound('success');
    };

    const handlePinInput = (value: string) => {
        if (pin.length < 6) setPin(pin + value);
    };

    const handleBackspace = () => {
        setPin(pin.slice(0, -1));
    };
    
    const handleClear = () => {
        setPin('');
        setError('');
    }

    const handleLoginAttempt = useCallback(async () => {
        if (!selectedUser || pin.length === 0) return;

        // Admin verification
        const loggedInUser = await dbService.verifyPin(selectedUser.id, pin);
        if (loggedInUser) {
            onLoginSuccess(loggedInUser);
        } else {
            setError('PIN incorrecto.');
            soundService.playSound('error');
            setPin('');
        }
    }, [selectedUser, pin, onLoginSuccess]);

    useEffect(() => {
        if (selectedUser && pin.length > 0 && pin.length === selectedUser.pin.length) {
            const timer = setTimeout(handleLoginAttempt, 200);
            return () => clearTimeout(timer);
        }
    }, [pin, selectedUser, handleLoginAttempt]);
    
    const switchUser = () => {
        setSelectedUser(null);
        setPin('');
        setError('');
        soundService.playSound('pop');
    }

    const selectUser = (user: User) => {
        if (user.role === 'cashier') {
            // LOGIN DIRECTO PARA CAJEROS (Sin PIN)
            soundService.playSound('success');
            onLoginSuccess(user);
        } else {
            // ADMIN REQUIERE PIN
            setSelectedUser(user);
            soundService.playSound('click');
        }
    }
    
    // --- SECRET PATTERN ---
    const handleSecretZoneClick = (e: React.MouseEvent<HTMLDivElement>) => {
        const rect = e.currentTarget.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const width = rect.width;
        let zone = '';
        if (x < width * 0.33) zone = 'left';
        else if (x > width * 0.66) zone = 'right';
        else zone = 'center';

        const newSequence = [...tapSequence, zone];
        let isValidStep = false;
        if (newSequence.length === 1) isValidStep = zone === 'left';
        else if (newSequence.length === 2) isValidStep = zone === 'right' && tapSequence[0] === 'left';
        else if (newSequence.length === 3) isValidStep = zone === 'center' && tapSequence[0] === 'left' && tapSequence[1] === 'right';

        if (isValidStep) {
            setTapSequence(newSequence);
            soundService.playSound('type');
            if (newSequence.length === 3) {
                soundService.playSound('hero');
                setIsDevPanelOpen(true);
                setTapSequence([]);
            }
        } else {
            if (zone === 'left') { setTapSequence(['left']); soundService.playSound('type'); } 
            else { setTapSequence([]); }
        }
    };

    // --- SETUP MODE (First Run) ---
    if (users.length === 0) {
        return (
            <div className="dark font-sans relative">
                {isDevPanelOpen && <DeveloperPanel onClose={() => setIsDevPanelOpen(false)} onRefresh={handleRefreshData} />}
                
                {/* --- LICENSE VERIFICATION MODAL --- */}
                {verifyingPlan && (
                    <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/90 p-4 animate-modal-in backdrop-blur-sm">
                        <div className="bg-gray-900 border border-dp-gold rounded-xl w-full max-w-sm p-6 relative shadow-[0_0_50px_rgba(212,175,55,0.2)]">
                            <button onClick={() => setVerifyingPlan(null)} className="absolute top-4 right-4 text-gray-500 hover:text-white transition-colors">
                                <X size={20} />
                            </button>
                            <h3 className="text-xl font-bold text-dp-gold mb-1 flex items-center gap-2">
                                <Crown size={20}/> Activación {verifyingPlan.toUpperCase()}
                            </h3>
                            <p className="text-sm text-gray-400 mb-6">Ingrese su clave de licencia para desbloquear este plan.</p>
                            
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-xs font-bold uppercase tracking-wider mb-2 text-gray-500">Clave de Licencia</label>
                                    <div className="relative">
                                        <input 
                                            autoFocus
                                            type="text" 
                                            value={licenseInput}
                                            onChange={e => setLicenseInput(e.target.value)}
                                            placeholder="XXXX-XXXX-XXXX"
                                            className={`w-full bg-black border ${verificationStatus.error ? 'border-red-500' : verificationStatus.success ? 'border-green-500' : 'border-gray-700'} rounded-lg p-3 text-white font-mono text-center uppercase tracking-widest focus:outline-none focus:border-dp-gold transition-colors`}
                                        />
                                        {verificationStatus.success && <CheckCircle className="absolute right-3 top-1/2 -translate-y-1/2 text-green-500" size={20}/>}
                                    </div>
                                    {verificationStatus.error && <p className="text-red-500 text-xs mt-2 font-bold">{verificationStatus.error}</p>}
                                </div>

                                <button 
                                    onClick={handleVerifyLicense}
                                    disabled={verificationStatus.loading || verificationStatus.success}
                                    className={`w-full py-3 rounded-lg font-bold flex items-center justify-center gap-2 transition-all ${
                                        verificationStatus.success 
                                        ? 'bg-green-600 text-white' 
                                        : 'bg-dp-gold hover:bg-yellow-500 text-black'
                                    }`}
                                >
                                    {verificationStatus.loading ? <Loader2 className="animate-spin"/> : verificationStatus.success ? 'Validado' : 'Verificar Licencia'}
                                </button>

                                <div className="relative flex py-2 items-center">
                                    <div className="flex-grow border-t border-gray-700"></div>
                                    <span className="flex-shrink-0 mx-4 text-gray-500 text-xs">O</span>
                                    <div className="flex-grow border-t border-gray-700"></div>
                                </div>

                                <a 
                                    href={getWhatsAppLink()} 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="block w-full py-3 rounded-lg font-bold text-center bg-[#25D366] hover:bg-[#20bd5a] text-white transition-all hover:scale-[1.02] shadow-lg flex items-center justify-center gap-2 text-sm"
                                >
                                    <MessageCircle size={18} fill="white" />
                                    Adquirir Licencia (WhatsApp)
                                </a>
                            </div>
                        </div>
                    </div>
                )}

                <div className="flex h-screen w-full flex-col items-center justify-center bg-gray-900 text-gray-100 p-4">
                    <div className="max-w-xl w-full text-center space-y-6 animate-fade-in-out">
                        <div onClick={handleSecretZoneClick} className="cursor-pointer select-none inline-block p-4 rounded-full bg-dp-gold/10 mb-4 ring-1 ring-dp-gold/50 shadow-[0_0_30px_rgba(212,175,55,0.2)]">
                            <ShieldCheck size={64} className="text-dp-gold" />
                        </div>
                        <div>
                            <h1 className="text-3xl font-bold text-dp-gold mb-2">Bienvenido a Dominion</h1>
                            <p className="text-gray-400">Configuración Inicial del Sistema</p>
                        </div>
                        
                        <div className="bg-gray-800 p-6 rounded-xl border border-gray-700 text-left space-y-5 shadow-2xl relative overflow-hidden">
                            {/* Step 1: Store Name */}
                            <div>
                                <label className="block text-xs font-bold uppercase tracking-wider mb-2 text-gray-500 flex items-center gap-2"><Store size={14}/> Nombre del Punto</label>
                                <input 
                                    type="text" 
                                    className="w-full bg-gray-900 border border-gray-600 rounded-lg p-3 text-white focus:ring-2 focus:ring-dp-gold outline-none transition-all placeholder-gray-600"
                                    placeholder="Ej: Kiosco Central"
                                    value={storeName}
                                    onChange={e => setStoreName(e.target.value)}
                                />
                            </div>

                            {/* Step 2: Industry */}
                            <div>
                                <label className="block text-xs font-bold uppercase tracking-wider mb-2 text-gray-500 flex items-center gap-2"><LayoutGrid size={14}/> Rubro / Industria</label>
                                <div className="grid grid-cols-2 gap-2">
                                    {Object.entries(BUSINESS_TEMPLATES).map(([key, template]) => (
                                        <button 
                                            key={key}
                                            onClick={() => setSelectedIndustry(key as BusinessType)}
                                            className={`p-3 rounded-lg border text-sm text-left transition-all ${selectedIndustry === key ? 'bg-dp-gold text-black border-dp-gold font-bold shadow-[0_0_15px_rgba(212,175,55,0.4)]' : 'bg-gray-900 border-gray-600 text-gray-400 hover:border-gray-400'}`}
                                        >
                                            {template.name}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Step 3: Plan Selection (With Verification) */}
                            <div>
                                <label className="block text-xs font-bold uppercase tracking-wider mb-2 text-gray-500 flex items-center gap-2"><Briefcase size={14}/> Tipo de Licencia</label>
                                <div className="flex gap-2">
                                    <button onClick={() => handlePlanClick('starter')} className={`flex-1 py-2 rounded-lg border text-xs font-bold transition-all ${selectedPlan === 'starter' ? 'bg-blue-600 border-blue-500 text-white' : 'bg-gray-900 border-gray-600 text-gray-500'}`}>GRATUITO<br/><span className="text-[9px] opacity-70 font-normal">1 Usuario</span></button>
                                    <button onClick={() => handlePlanClick('pro')} className={`flex-1 py-2 rounded-lg border text-xs font-bold transition-all relative overflow-hidden ${selectedPlan === 'pro' ? 'bg-purple-600 border-purple-500 text-white ring-2 ring-purple-400' : 'bg-gray-900 border-gray-600 text-gray-500'}`}>
                                        PRO<br/><span className="text-[9px] opacity-70 font-normal">2 Usuarios</span>
                                        {selectedPlan !== 'pro' && <div className="absolute top-1 right-1"><LockKeyhole size={10}/></div>}
                                    </button>
                                    <button onClick={() => handlePlanClick('enterprise')} className={`flex-1 py-2 rounded-lg border text-xs font-bold transition-all relative overflow-hidden ${selectedPlan === 'enterprise' ? 'bg-yellow-600 border-yellow-500 text-white ring-2 ring-yellow-400' : 'bg-gray-900 border-gray-600 text-gray-500'}`}>
                                        COMERCIO<br/><span className="text-[9px] opacity-70 font-normal">Multi-Caja</span>
                                        {selectedPlan !== 'enterprise' && <div className="absolute top-1 right-1"><LockKeyhole size={10}/></div>}
                                    </button>
                                </div>
                            </div>

                            {error && <p className="text-red-400 text-sm font-bold text-center animate-pulse">{error}</p>}
                            
                            <button 
                                onClick={handleInitializeSystem}
                                disabled={isSubmitting}
                                className="w-full py-4 bg-gradient-to-r from-dp-gold to-yellow-600 hover:to-yellow-500 text-black font-bold rounded-lg flex items-center justify-center gap-2 transition-all hover:scale-[1.02] shadow-lg mt-2 disabled:opacity-50"
                            >
                                <PlayCircle size={20} />
                                Iniciar Sistema
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // --- PIN PAD MODE (Only for Admin) ---
    if (selectedUser) {
        return (
            <div className="dark font-sans">
                <div className="flex h-screen w-full flex-col items-center justify-center bg-dp-dark text-dp-light-gray p-4">
                    <div className="w-full max-w-sm">
                        <div className="text-center mb-8 animate-fade-in-out">
                            {settings?.logoUrl && <img src={settings.logoUrl} alt="Logo" className="h-16 mx-auto object-contain mb-4" />}
                            <h1 className="text-2xl font-bold tracking-tight text-dp-gold mb-2">Acceso Administrativo</h1>
                            <div className="flex items-center justify-center gap-2 mb-2">
                                <Crown size={14} className="text-yellow-500"/>
                                <span className="text-xs uppercase tracking-widest text-gray-500 font-bold">{selectedUser.name}</span>
                            </div>
                            <p className="text-gray-400 text-sm">Ingrese su PIN de seguridad (Default: 1234)</p>
                        </div>

                        <div className="flex justify-center items-center gap-4 mb-8 h-8">
                            {Array.from({ length: 4 }).map((_, index) => (
                                <div key={index} className={`w-3 h-3 rounded-full transition-all duration-200 ${index < pin.length ? 'bg-dp-gold scale-125 shadow-[0_0_10px_#D4AF37]' : 'bg-gray-700'}`}></div>
                            ))}
                        </div>
                        
                        {error ? (
                            <div className="bg-red-900/30 text-red-400 p-2 rounded mb-4 text-center text-sm font-bold border border-red-900 animate-shake">
                                {error}
                            </div>
                        ) : <div className="h-[38px] mb-4"></div>}

                        <div className="grid grid-cols-3 gap-3">
                            {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map(num => (
                                <PinPadButton key={num} onClick={() => handlePinInput(num)}>{num}</PinPadButton>
                            ))}
                             <PinPadButton onClick={handleClear} className="text-sm font-bold uppercase tracking-wider text-gray-500">Borrar</PinPadButton>
                            <PinPadButton onClick={() => handlePinInput('0')}>0</PinPadButton>
                            <PinPadButton onClick={handleBackspace}><Delete size={24} className="text-red-400"/></PinPadButton>
                        </div>

                        <div className="mt-8 text-center">
                            <button onClick={switchUser} className="text-sm text-gray-500 hover:text-white transition-colors underline decoration-gray-700 underline-offset-4">
                                Volver a Selección
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // --- USER SELECTION MODE ---
    const storedPlan = localStorage.getItem('dominion_nexus_identity');
    const planData = storedPlan ? JSON.parse(storedPlan).plan : 'starter';
    const canAddCashier = (planData === 'pro' || planData === 'enterprise');
    const currentUsers = users.length;
    const maxUsersAllowed = planData === 'pro' ? 2 : planData === 'enterprise' ? 6 : 1;

    return (
        <div className="dark font-sans relative">
            {isDevPanelOpen && <DeveloperPanel onClose={() => setIsDevPanelOpen(false)} onRefresh={handleRefreshData} />}
            <div className="flex h-screen w-full flex-col items-center justify-center bg-dp-dark text-dp-light-gray p-4">
                <div 
                    onClick={handleSecretZoneClick}
                    className="cursor-pointer select-none mb-8 flex flex-col items-center active:scale-95 transition-transform text-center relative w-full max-w-xs mx-auto py-2 rounded-lg hover:bg-white/5"
                >
                    {settings?.logoUrl ? (
                        <>
                            <img src={settings.logoUrl} alt="Logo" className="h-24 max-w-[80%] object-contain mb-4 drop-shadow-lg pointer-events-none" />
                            <h1 className="text-xl font-bold tracking-tight text-dp-gold uppercase pointer-events-none">{settings.storeName}</h1>
                        </>
                    ) : (
                        <h1 className="text-4xl font-black tracking-tight text-dp-gold mb-2 drop-shadow-[0_0_15px_rgba(212,175,55,0.3)] pointer-events-none">DOMINION</h1>
                    )}
                </div>
                
                <div className="w-full max-w-4xl">
                    <p className="text-center text-gray-500 mb-6 uppercase tracking-widest text-xs font-bold">Seleccione Usuario</p>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 sm:gap-6">
                        {users.map(user => {
                            const isAdmin = user.role === 'admin';
                            return (
                                <button 
                                    key={user.id} 
                                    onClick={() => selectUser(user)} 
                                    className={`group flex flex-col items-center justify-center gap-3 p-6 rounded-xl border transition-all hover:-translate-y-1 shadow-lg relative overflow-hidden h-40
                                        ${isAdmin 
                                            ? 'bg-gradient-to-b from-gray-800 to-gray-900 border-yellow-900/30 hover:border-dp-gold/50' 
                                            : 'bg-dp-charcoal border-gray-800 hover:border-gray-600'
                                        }`}
                                >
                                    <div className={`p-4 rounded-full transition-colors ${isAdmin ? 'bg-yellow-900/20 group-hover:bg-dp-gold/20' : 'bg-black/50 group-hover:bg-white/10'}`}>
                                        {isAdmin ? (
                                            <LockKeyhole size={32} className={`transition-colors ${isAdmin ? 'text-yellow-600 group-hover:text-dp-gold' : 'text-gray-400'}`}/>
                                        ) : (
                                            <UserIcon size={32} className="text-gray-400 group-hover:text-white"/>
                                        )}
                                    </div>
                                    <div className="text-center relative z-10">
                                        <span className={`block font-bold text-lg transition-colors ${isAdmin ? 'text-yellow-100 group-hover:text-dp-gold' : 'text-gray-300 group-hover:text-white'}`}>
                                            {user.name}
                                        </span>
                                    </div>
                                </button>
                            );
                        })}

                        {/* Botón Agregar Caja (Pro y Comercio) */}
                        {canAddCashier && currentUsers < maxUsersAllowed && (
                            <div className="relative h-40">
                                {isAddingCashier ? (
                                    <div className="absolute inset-0 bg-gray-800 border border-gray-600 rounded-xl p-4 flex flex-col justify-center gap-2 animate-modal-in">
                                        <input 
                                            autoFocus
                                            type="text" 
                                            placeholder="Nombre Caja" 
                                            value={newCashierName}
                                            onChange={e => setNewCashierName(e.target.value)}
                                            onKeyDown={e => e.key === 'Enter' && handleQuickAddCashier()}
                                            className="w-full bg-gray-900 border border-gray-700 rounded p-2 text-sm text-white focus:border-green-500 outline-none"
                                        />
                                        <div className="flex gap-2">
                                            <button onClick={() => setIsAddingCashier(false)} className="flex-1 bg-gray-700 hover:bg-gray-600 text-xs py-2 rounded text-gray-300">Cancelar</button>
                                            <button onClick={handleQuickAddCashier} className="flex-1 bg-green-700 hover:bg-green-600 text-xs py-2 rounded text-white font-bold">Crear</button>
                                        </div>
                                    </div>
                                ) : (
                                    <button 
                                        onClick={() => setIsAddingCashier(true)}
                                        className="w-full h-full flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-gray-700 hover:border-gray-500 hover:bg-white/5 transition-all text-gray-500 hover:text-gray-300"
                                    >
                                        <Plus size={32} />
                                        <span className="text-xs font-bold uppercase">Nueva Caja</span>
                                        <span className="text-[10px] opacity-50">({currentUsers}/{maxUsersAllowed})</span>
                                    </button>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default LoginScreen;
