
import React, { useState, useEffect, useCallback } from 'react';
import type { User, BusinessSettings, BusinessType, PlanTier } from '../types';
import * as dbService from '../services/db';
import * as settingsService from '../services/settings';
import * as soundService from '../services/sound';
import * as cloudService from '../services/cloud';
import { BUSINESS_TEMPLATES } from '../services/templates';
import { LockKeyhole, Delete, ShieldCheck, PlayCircle, Store, Crown, User as UserIcon, Plus, LayoutGrid, Briefcase, MessageCircle, X, CheckCircle, Loader2, HardDrive, Star } from 'lucide-react';
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
    
    const [tapSequence, setTapSequence] = useState<string[]>([]);
    
    const [storeName, setStoreName] = useState('');
    const [selectedIndustry, setSelectedIndustry] = useState<BusinessType | 'kiosco'>('kiosco');
    const [selectedPlan, setSelectedPlan] = useState<PlanTier>('pro');
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    const [verifyingPlan, setVerifyingPlan] = useState<PlanTier | null>(null);
    const [licenseInput, setLicenseInput] = useState('');
    const [verificationStatus, setVerificationStatus] = useState<{loading: boolean, error: string, success: boolean}>({ loading: false, error: '', success: false });

    const [isAddingCashier, setIsAddingCashier] = useState(false);
    const [newCashierName, setNewCashierName] = useState('');

    useEffect(() => {
        const load = () => {
            setUsers(dbService.getUsers());
            setSettings(settingsService.getBusinessSettings());
        };
        load();
    }, []);
    
    useEffect(() => {
        if (tapSequence.length > 0) {
            const timer = setTimeout(() => setTapSequence([]), 5000);
            return () => clearTimeout(timer);
        }
    }, [tapSequence]);
    
    const handleRefreshData = () => {
        setUsers(dbService.getUsers());
        setSettings(settingsService.getBusinessSettings());
        setSelectedUser(null);
    };
    
    const getWhatsAppLink = () => {
        const vendorNumber = settingsService.getVendorWhatsApp();
        const text = `Hola, me interesa adquirir una licencia ${verifyingPlan?.toUpperCase()} para DOMINION POS.`;
        return `https://wa.me/${vendorNumber}?text=${encodeURIComponent(text)}`;
    };
    
    const handleInitializeSystem = async (keyToUse: string, planToUse: PlanTier) => {
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
            const template = BUSINESS_TEMPLATES[selectedIndustry as keyof typeof BUSINESS_TEMPLATES];
            
            settingsService.saveBusinessSettings({ 
                ...settingsService.getBusinessSettings(), 
                storeName: storeName.trim(),
                customCategories: template ? template.categories : [] 
            });

            if (template) {
                const existingProds = dbService.getProducts();
                for (const p of existingProds) await dbService.deleteProduct(p.id);
                for (const p of template.products) await dbService.addProduct(p);
                settingsService.saveLoyaltySettings(template.loyalty);
            }

            await dbService.addUser({ name: 'Admin', pin: '1234', role: 'admin' });
            if (planToUse === 'pro' || planToUse === 'enterprise') {
                await dbService.addUser({ name: 'Caja 1', pin: '', role: 'cashier' });
            }

            localStorage.setItem('dominion_nexus_identity', JSON.stringify({
                nodeId: crypto.randomUUID(),
                licenseKey: keyToUse, 
                plan: planToUse,
                status: 'active',
                lastSync: Date.now()
            }));
            window.dispatchEvent(new Event('storage'));

            soundService.playSound('hero');
            handleRefreshData();
        } catch (e) {
            console.error(e);
            setError("Error al inicializar.");
        } finally {
            setIsSubmitting(false);
        }
    };
    
    const handleInitializeSystemProTrial = () => {
        soundService.playSound('hero');
        const expiryTimestamp = Date.now() + 30 * 24 * 60 * 60 * 1000;
        const trialKey = `TRIAL-pro-${expiryTimestamp}`;
        handleInitializeSystem(trialKey, 'pro');
    };
    
    const handleVerifyLicense = async () => {
        if (!licenseInput.trim() || !verifyingPlan) return;
        setVerificationStatus({ loading: true, error: '', success: false });
        const result = await cloudService.connectToNexus(licenseInput);
        if (result.success && result.plan === verifyingPlan) {
            setVerificationStatus({ loading: false, error: '', success: true });
            soundService.playSound('success');
            setTimeout(() => {
                handleInitializeSystem(licenseInput, verifyingPlan);
                setVerifyingPlan(null);
            }, 1000);
        } else {
            setVerificationStatus({ loading: false, error: result.message || 'Licencia inválida.', success: false });
            soundService.playSound('error');
        }
    };

    const handleQuickAddCashier = async () => {
        if (!newCashierName.trim()) return;
        
        const identity = cloudService.getIdentity();
        const currentUsers = dbService.getUsers();
        const maxUsers = identity.plan === 'pro' ? 3 : identity.plan === 'enterprise' ? 6 : 1;

        if (currentUsers.length >= maxUsers) {
            alert("Límite de usuarios de su plan alcanzado.");
            setIsAddingCashier(false); setNewCashierName('');
            return;
        }

        await dbService.addUser({ name: newCashierName.trim(), pin: '', role: 'cashier' });
        setNewCashierName(''); setIsAddingCashier(false);
        handleRefreshData();
        soundService.playSound('success');
    };

    const handlePinInput = (value: string) => {
        if (pin.length < 6) setPin(pin + value);
    };

    const handleBackspace = () => setPin(pin.slice(0, -1));
    const handleClear = () => { setPin(''); setError(''); };

    const handleLoginAttempt = useCallback(async () => {
        if (!selectedUser || pin.length === 0) return;
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
        if (selectedUser && pin.length > 0 && selectedUser.pin && pin.length === selectedUser.pin.length) {
            const timer = setTimeout(handleLoginAttempt, 200);
            return () => clearTimeout(timer);
        }
    }, [pin, selectedUser, handleLoginAttempt]);
    
    const switchUser = () => {
        setSelectedUser(null); setPin(''); setError('');
        soundService.playSound('pop');
    };

    const selectUser = (user: User) => {
        if (user.role === 'cashier') {
            soundService.playSound('success');
            onLoginSuccess(user);
        } else {
            setSelectedUser(user);
            soundService.playSound('click');
        }
    };
    
    const handleSecretZoneClick = (e: React.MouseEvent<HTMLDivElement>) => {
        const rect = e.currentTarget.getBoundingClientRect();
        const x = e.clientX - rect.left, width = rect.width;
        let zone = x < width * 0.33 ? 'left' : x > width * 0.66 ? 'right' : 'center';
        const newSequence = [...tapSequence, zone];
        
        const pattern = ['left', 'right', 'center'];
        const isValid = newSequence.every((step, i) => step === pattern[i]);

        if (isValid) {
            setTapSequence(newSequence);
            soundService.playSound('type');
            if (newSequence.length === 3) {
                soundService.playSound('hero');
                setIsDevPanelOpen(true);
                setTapSequence([]);
            }
        } else {
            setTapSequence(zone === 'left' ? ['left'] : []);
        }
    };

    if (users.length === 0) {
        return (
            <div className="dark font-sans relative">
                {isDevPanelOpen && <DeveloperPanel onClose={() => setIsDevPanelOpen(false)} onRefresh={handleRefreshData} />}
                
                {verifyingPlan && (
                    <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/90 p-4 animate-modal-in backdrop-blur-sm">
                        <div className="bg-gray-900 border border-dp-gold rounded-xl w-full max-w-sm p-6 relative shadow-[0_0_50px_rgba(212,175,55,0.2)]">
                            <button onClick={() => setVerifyingPlan(null)} className="absolute top-4 right-4 text-gray-500 hover:text-white transition-colors"><X size={20} /></button>
                            <h3 className="text-xl font-bold text-dp-gold mb-1 flex items-center gap-2"><Crown size={20}/> Activación {verifyingPlan.toUpperCase()}</h3>
                            <p className="text-sm text-gray-400 mb-6">Ingrese su clave de licencia para desbloquear este plan.</p>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-xs font-bold uppercase tracking-wider mb-2 text-gray-500">Clave de Licencia</label>
                                    <div className="relative">
                                        <input autoFocus type="text" value={licenseInput} onChange={e => setLicenseInput(e.target.value)} placeholder="XXXX-XXXX-XXXX" className={`w-full bg-black border ${verificationStatus.error ? 'border-red-500' : verificationStatus.success ? 'border-green-500' : 'border-gray-700'} rounded-lg p-3 text-white font-mono text-center uppercase tracking-widest focus:outline-none focus:border-dp-gold transition-colors`} />
                                        {verificationStatus.success && <CheckCircle className="absolute right-3 top-1/2 -translate-y-1/2 text-green-500" size={20}/>}
                                    </div>
                                    {verificationStatus.error && <p className="text-red-500 text-xs mt-2 font-bold">{verificationStatus.error}</p>}
                                </div>
                                <button onClick={handleVerifyLicense} disabled={verificationStatus.loading || verificationStatus.success} className={`w-full py-3 rounded-lg font-bold flex items-center justify-center gap-2 transition-all ${verificationStatus.success ? 'bg-green-600 text-white' : 'bg-dp-gold hover:bg-yellow-500 text-black'}`}>{verificationStatus.loading ? <Loader2 className="animate-spin"/> : verificationStatus.success ? 'Validado' : 'Verificar Licencia'}</button>
                                <div className="relative flex py-2 items-center"><div className="flex-grow border-t border-gray-700"></div><span className="flex-shrink-0 mx-4 text-gray-500 text-xs">O</span><div className="flex-grow border-t border-gray-700"></div></div>
                                <a href={getWhatsAppLink()} target="_blank" rel="noopener noreferrer" className="block w-full py-3 rounded-lg font-bold text-center bg-[#25D366] hover:bg-[#20bd5a] text-white transition-all hover:scale-[1.02] shadow-lg flex items-center justify-center gap-2 text-sm"><MessageCircle size={18} fill="white" /> Adquirir Licencia (WhatsApp)</a>
                            </div>
                        </div>
                    </div>
                )}

                <div className="flex min-h-screen w-full flex-col items-center justify-start sm:justify-center bg-gray-900 text-gray-100 p-4 overflow-y-auto">
                    <div className="max-w-xl w-full text-center space-y-6 animate-fade-in-out py-8">
                        <div onClick={handleSecretZoneClick} className="cursor-pointer select-none inline-block p-4 rounded-full bg-dp-gold/10 mb-4 ring-1 ring-dp-gold/50 shadow-[0_0_30px_rgba(212,175,55,0.2)]"><ShieldCheck size={64} className="text-dp-gold" /></div>
                        <div><h1 className="text-3xl font-bold text-dp-gold mb-2">Bienvenido a Dominion POS</h1><p className="text-gray-400">Configuración Inicial del Sistema</p></div>
                        
                        <div className="bg-gray-800 p-6 rounded-xl border border-gray-700 text-left space-y-5 shadow-2xl">
                            <div>
                                <label className="block text-xs font-bold uppercase tracking-wider mb-2 text-gray-500 flex items-center gap-2"><Store size={14}/> Nombre del Punto</label>
                                <input type="text" className="w-full bg-gray-900 border border-gray-600 rounded-lg p-3 text-white focus:ring-2 focus:ring-dp-gold outline-none transition-all placeholder-gray-600" placeholder="Ej: Kiosco Central" value={storeName} onChange={e => setStoreName(e.target.value)} />
                            </div>
                            <div>
                                <label className="block text-xs font-bold uppercase tracking-wider mb-2 text-gray-500 flex items-center gap-2"><LayoutGrid size={14}/> Rubro / Industria</label>
                                <div className="grid grid-cols-2 gap-2">
                                    {Object.entries(BUSINESS_TEMPLATES).map(([key, template]) => (
                                        <button key={key} onClick={() => setSelectedIndustry(key as BusinessType)} className={`p-3 rounded-lg border text-sm text-left transition-all ${selectedIndustry === key ? 'bg-dp-gold text-black border-dp-gold font-bold shadow-[0_0_15px_rgba(212,175,55,0.4)]' : 'bg-gray-900 border-gray-600 text-gray-400 hover:border-gray-400'}`}>{template.name}</button>
                                    ))}
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-bold uppercase tracking-wider mb-2 text-gray-500 flex items-center gap-2"><Briefcase size={14}/> Tipo de Licencia</label>
                                <div className="grid grid-cols-2 gap-2">
                                    <button onClick={() => { setSelectedPlan('starter'); soundService.playSound('click'); }} className={`p-3 rounded-lg border text-center text-sm transition-all ${selectedPlan === 'starter' ? 'bg-green-800 border-green-600 text-white ring-2 ring-green-500' : 'bg-gray-900 border-gray-600 text-gray-400 hover:border-gray-400'}`}><span className="font-bold">BASE</span><br/><span className="text-xs opacity-70">1 Usuario, Local</span></button>
                                    <button onClick={() => { setSelectedPlan('pro'); soundService.playSound('click'); }} className={`p-3 rounded-lg border text-center text-sm transition-all ${selectedPlan === 'pro' ? 'bg-purple-600 border-purple-500 text-white ring-2 ring-purple-400' : 'bg-gray-900 border-gray-600 text-gray-400 hover:border-gray-400'}`}><span className="font-bold">PRO</span><br/><span className="text-xs opacity-70">3 Usuarios, Nube</span></button>
                                </div>
                            </div>
                            {error && <p className="text-red-400 text-sm font-bold text-center animate-pulse">{error}</p>}
                            <div className="mt-6 pt-5 border-t border-gray-700 space-y-3">
                                {selectedPlan === 'starter' && <button onClick={() => setVerifyingPlan('starter')} disabled={isSubmitting} className="w-full py-4 bg-green-700 hover:bg-green-600 text-white font-bold rounded-lg flex items-center justify-center gap-2 transition-all disabled:opacity-50">{isSubmitting ? <Loader2 className="animate-spin"/> : <Crown size={20}/>} Activar Licencia Base</button>}
                                {selectedPlan === 'pro' && <>
                                    <button onClick={handleInitializeSystemProTrial} disabled={isSubmitting} className="w-full py-4 bg-gradient-to-r from-purple-500 to-indigo-500 text-white font-bold rounded-lg flex items-center justify-center gap-2 transition-all hover:scale-[1.02] shadow-lg disabled:opacity-50">{isSubmitting ? <Loader2 className="animate-spin"/> : <Star className="animate-pulse"/>} Iniciar Prueba Gratuita (30 Días)</button>
                                    <button onClick={() => setVerifyingPlan('pro')} className="w-full text-center text-xs text-gray-400 hover:text-white pt-2">o Activar con Licencia PRO</button>
                                </>}
                                {selectedPlan === 'enterprise' && <button onClick={() => setVerifyingPlan('enterprise')} className="w-full py-4 bg-dp-gold text-black font-bold rounded-lg flex items-center justify-center gap-2 transition-all disabled:opacity-50">{isSubmitting ? <Loader2 className="animate-spin"/> : <Crown size={20}/>} Activar Licencia Empresa</button>}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }
    
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
                            {Array.from({ length: selectedUser.pin?.length || 4 }).map((_, index) => (
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

    const identity = cloudService.getIdentity();
    const canAddCashier = (identity.plan === 'pro' || identity.plan === 'enterprise');
    const currentUsers = users.length;
    const maxUsersAllowed = identity.plan === 'pro' ? 3 : identity.plan === 'enterprise' ? 6 : 1;

    return (
        <div className="dark font-sans relative">
            {isDevPanelOpen && <DeveloperPanel onClose={() => setIsDevPanelOpen(false)} onRefresh={handleRefreshData} />}
            <div className="flex h-screen w-full flex-col items-center justify-center bg-dp-dark text-dp-light-gray p-4">
                <div onClick={handleSecretZoneClick} className="cursor-pointer select-none mb-8 flex flex-col items-center active:scale-95 transition-transform text-center relative w-full max-w-xs mx-auto py-2 rounded-lg hover:bg-white/5">
                    {settings?.logoUrl ? (<><img src={settings.logoUrl} alt="Logo" className="h-24 max-w-[80%] object-contain mb-4 drop-shadow-lg pointer-events-none" /><h1 className="text-xl font-bold tracking-tight text-dp-gold uppercase pointer-events-none">{settings.storeName}</h1></>) : (<h1 className="text-4xl font-black tracking-tight text-dp-gold mb-2 drop-shadow-[0_0_15px_rgba(212,175,55,0.3)] pointer-events-none">DOMINION</h1>)}
                </div>
                <div className="w-full max-w-4xl">
                    <p className="text-center text-gray-500 mb-6 uppercase tracking-widest text-xs font-bold">Seleccione Usuario</p>
                    <div className="flex flex-wrap justify-center gap-4 sm:gap-6">
                        {users.map(user => {
                            const isAdmin = user.role === 'admin';
                            return (<button key={user.id} onClick={() => selectUser(user)} className={`group flex flex-col items-center justify-center gap-3 p-6 rounded-xl border transition-all hover:-translate-y-1 shadow-lg relative overflow-hidden h-40 w-36 sm:w-48 ${isAdmin ? 'bg-gradient-to-b from-gray-800 to-gray-900 border-yellow-900/30 hover:border-dp-gold/50' : 'bg-dp-charcoal border-gray-800 hover:border-gray-600'}`}>
                                <div className={`p-4 rounded-full transition-colors ${isAdmin ? 'bg-yellow-900/20 group-hover:bg-dp-gold/20' : 'bg-black/50 group-hover:bg-white/10'}`}>
                                    {isAdmin ? <LockKeyhole size={32} className={`transition-colors ${isAdmin ? 'text-yellow-600 group-hover:text-dp-gold' : 'text-gray-400'}`}/> : <UserIcon size={32} className="text-gray-400 group-hover:text-white"/>}
                                </div>
                                <div className="text-center relative z-10 w-full"><span className={`block font-bold text-lg truncate transition-colors ${isAdmin ? 'text-yellow-100 group-hover:text-dp-gold' : 'text-gray-300 group-hover:text-white'}`}>{user.name}</span></div>
                            </button>);
                        })}
                        {canAddCashier && currentUsers < maxUsersAllowed && (
                            <div className="relative h-40 w-36 sm:w-48">
                                {isAddingCashier ? (
                                    <div className="absolute inset-0 bg-gray-800 border border-gray-600 rounded-xl p-4 flex flex-col justify-center gap-2 animate-modal-in">
                                        <input autoFocus type="text" placeholder="Nombre Caja" value={newCashierName} onChange={e => setNewCashierName(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleQuickAddCashier()} className="w-full bg-gray-900 border border-gray-700 rounded p-2 text-sm text-white focus:border-green-500 outline-none" />
                                        <div className="flex gap-2">
                                            <button onClick={() => setIsAddingCashier(false)} className="flex-1 bg-gray-700 hover:bg-gray-600 text-xs py-2 rounded text-gray-300">Cancelar</button>
                                            <button onClick={handleQuickAddCashier} className="flex-1 bg-green-700 hover:bg-green-600 text-xs py-2 rounded text-white font-bold">Crear</button>
                                        </div>
                                    </div>
                                ) : (
                                    <button onClick={() => setIsAddingCashier(true)} className="w-full h-full flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-gray-700 hover:border-gray-500 hover:bg-white/5 transition-all text-gray-500 hover:text-gray-300">
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