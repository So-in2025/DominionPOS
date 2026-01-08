
import React, { useRef, useState, useEffect } from 'react';
/* Added Database to imports; removed Eye, EyeOff, ExternalLink, Sparkles, Copy as they were only used in the removed AI section */
import { X, Download, Upload, Store, Image as ImageIcon, BrainCircuit, CloudLightning, Signal, Lock, Smartphone, CheckCircle, Crown, Users, UserMinus, ShieldCheck, User as UserIcon, Plus, Info, Database } from 'lucide-react';
import * as dbService from '../services/db';
import * as settingsService from '../services/settings';
import * as cloudService from '../services/cloud';
import * as soundService from '../services/sound';
import type { LoyaltySettings, User, BusinessSettings, CloudNodeIdentity, PlanTier } from '../types';
import AuditLogModal from './AuditLogModal';
import FeatureGuard from './FeatureGuard';

interface SettingsModalProps {
  onClose: () => void;
  onImportSuccess: () => void;
  onSettingsSaved: () => void;
}

const SettingsModal: React.FC<SettingsModalProps> = ({ onClose, onImportSuccess, onSettingsSaved }) => {
  const logoInputRef = useRef<HTMLInputElement>(null);
  const [loyaltySettings, setLoyaltySettings] = useState<LoyaltySettings>(settingsService.getLoyaltySettings());
  const [businessSettings, setBusinessSettings] = useState<BusinessSettings>(settingsService.getBusinessSettings());
  const [isAuditModalOpen, setIsAuditModalOpen] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  
  // New User State
  const [isAddingUser, setIsAddingUser] = useState(false);
  const [newUserName, setNewUserName] = useState('');
  const [newUserRole, setNewUserRole] = useState<'admin' | 'cashier'>('cashier');
  
  // Nexus Cloud State
  const [nexusKey, setNexusKey] = useState('');
  const [currentIdentity, setCurrentIdentity] = useState<CloudNodeIdentity | null>(null);
  const [nexusStatus, setNexusStatus] = useState<{connecting: boolean, msg: string, type: 'success' | 'error' | 'neutral'}>({connecting: false, msg: '', type: 'neutral'});
  
  /* Removed API Key states as per Google GenAI guidelines */
  
  // User Management State
  const [users, setUsers] = useState<User[]>([]);

  useEffect(() => {
      refreshUsers();
      const identity = cloudService.getIdentity();
      setCurrentIdentity(identity);
      if (identity.licenseKey && !identity.licenseKey.startsWith('FREE-')) {
          setNexusKey(identity.licenseKey);
      }
      /* Removed loading of Gemini API key from local storage */
  }, []);

  const refreshUsers = () => {
      setUsers(dbService.getUsers());
  };

  const handleAddUser = async () => {
      if (!newUserName.trim()) return;
      
      const currentPlan = cloudService.getPlan();
      const maxUsers = currentPlan === 'pro' ? 2 : currentPlan === 'enterprise' ? 6 : 1;
      
      if (users.length >= maxUsers) {
          alert(`Límite del plan ${currentPlan.toUpperCase()} alcanzado (${maxUsers} usuarios).`);
          soundService.playSound('error');
          return;
      }

      await dbService.addUser({
          name: newUserName.trim(),
          pin: newUserRole === 'admin' ? '1234' : '', 
          role: newUserRole
      });

      setNewUserName('');
      setIsAddingUser(false);
      soundService.playSound('success');
      refreshUsers();
  };

  const handleDeleteUser = async (userId: string) => {
      try {
          if (window.confirm("¿Eliminar este operador?")) {
            const success = await dbService.deleteUser(userId);
            if (success) {
                soundService.playSound('trash');
                refreshUsers();
            }
          }
      } catch (e: any) {
          alert(e.message);
      }
  };

  const handleConnectNexus = async () => {
      if(!nexusKey.trim()) return;
      setNexusStatus({ connecting: true, msg: 'Validando...', type: 'neutral' });
      const result = await cloudService.connectToNexus(nexusKey);
      setCurrentIdentity(cloudService.getIdentity());
      setNexusStatus({ connecting: false, msg: result.message, type: result.success ? 'success' : 'error' });
  };

  const handleLogoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (e) => {
          const result = e.target?.result;
          if (typeof result === 'string') setBusinessSettings(prev => ({ ...prev, logoUrl: result }));
      };
      reader.readAsDataURL(file);
  };

  const handleRemoveLogo = () => {
      setBusinessSettings(prev => ({ ...prev, logoUrl: undefined }));
      if (logoInputRef.current) logoInputRef.current.value = '';
  };

  const handleBusinessSettingChange = (field: keyof BusinessSettings, value: string) => {
      setBusinessSettings(prev => ({ ...prev, [field]: value }));
  };

  const handleSaveAllSettings = () => {
      settingsService.saveLoyaltySettings(loyaltySettings);
      settingsService.saveBusinessSettings(businessSettings);
      /* Removed saving of Gemini API key to local storage */
      onSettingsSaved();
  };

  const currentPlan = cloudService.getPlan();
  const isFreeTier = currentPlan === 'starter';

  const TicketPreview = ({ plan }: { plan: 'starter' | 'pro' }) => (
    <div className="bg-white p-3 shadow-md rounded border border-gray-200 text-black font-mono text-[8px] flex flex-col items-center w-36 scale-90 origin-top">
        {plan === 'pro' && (
            <div className="w-8 h-8 bg-gray-200 rounded-full mb-1 flex items-center justify-center overflow-hidden">
                {businessSettings.logoUrl ? <img src={businessSettings.logoUrl} className="w-full h-full object-contain" /> : <ImageIcon size={10} />}
            </div>
        )}
        <p className="font-bold text-[10px] uppercase text-center">{businessSettings.storeName || 'MI NEGOCIO'}</p>
        {plan === 'pro' && (
            <>
                <p className="text-center opacity-60">{businessSettings.address || 'Dirección Pro'}</p>
                <p className="text-center opacity-60 mb-2">Tel: {businessSettings.phone || '000-0000'}</p>
            </>
        )}
        <div className="w-full border-b border-dashed border-gray-300 my-1"></div>
        <div className="w-full space-y-1">
            <div className="flex justify-between"><span>1x Producto A</span><span>$100</span></div>
            <div className="flex justify-between"><span>2x Producto B</span><span>$200</span></div>
        </div>
        <div className="w-full border-t border-black mt-1 pt-1 flex justify-between font-bold">
            <span>TOTAL</span><span>$300</span>
        </div>
        <p className="mt-2 text-center font-bold italic">
            {plan === 'pro' ? (businessSettings.receiptFooter || '¡Gracias!') : '¡Gracias!'}
        </p>
        {plan === 'starter' && <p className="text-[6px] text-gray-400 mt-1 uppercase tracking-tighter">Dominion POS - Starter</p>}
    </div>
  );

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex justify-center items-center backdrop-blur-sm" aria-modal="true" role="dialog" onClick={onClose}>
      <div className="bg-dp-soft-gray dark:bg-dp-dark rounded-2xl shadow-2xl p-0 w-full max-w-2xl m-4 animate-modal-in overflow-hidden max-h-[90vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        
        {/* Modern Header */}
        <div className="bg-white dark:bg-dp-charcoal px-6 py-4 flex justify-between items-center border-b border-gray-200 dark:border-gray-700">
            <div>
                <h2 className="text-2xl font-black text-dp-dark-gray dark:text-dp-light-gray tracking-tight">Panel de Control</h2>
                <p className="text-xs text-gray-500 uppercase font-bold tracking-widest">Configuración del Sistema</p>
            </div>
            <button onClick={onClose} className="p-2 rounded-full hover:bg-dp-soft-gray dark:hover:bg-gray-700 transition-colors"><X size={24} /></button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-8">
          
          {/* Tarjeta 1: NEXUS CONNECTION */}
          <div className="p-6 rounded-2xl bg-gradient-to-br from-dp-dark-gray to-black text-white shadow-xl relative group overflow-hidden border border-gray-700/50">
             <div className="absolute -top-10 -right-10 opacity-10 group-hover:scale-110 transition-transform duration-700"><CloudLightning size={200} /></div>
             <div className="flex justify-between items-start mb-6 relative z-10">
                 <div>
                    <h3 className="font-bold text-xl flex items-center gap-2"><CloudLightning className="text-dp-gold animate-pulse"/> Dominion Nexus</h3>
                    <p className="text-xs text-gray-400 font-medium">Sincronización y Licenciamiento Cloud</p>
                 </div>
                 <div className={`flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-black border tracking-widest ${isFreeTier ? 'bg-gray-800 border-gray-600 text-gray-400' : 'bg-green-500/10 border-green-500 text-green-400'}`}>
                    <Signal size={14}/> {currentPlan.toUpperCase()}
                 </div>
             </div>
             <div className="flex gap-2 relative z-10">
                 <input 
                    type="text" 
                    value={nexusKey} 
                    onChange={e => setNexusKey(e.target.value)} 
                    placeholder="Introducir Clave de Activación..." 
                    className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white font-mono text-sm focus:border-dp-gold focus:bg-white/10 outline-none transition-all placeholder:text-gray-600"
                />
                 <button onClick={handleConnectNexus} disabled={nexusStatus.connecting} className="bg-dp-gold text-black font-black px-6 py-3 rounded-xl hover:bg-yellow-400 disabled:opacity-50 text-sm transition-all shadow-lg active:scale-95">
                    {nexusStatus.connecting ? '...' : 'Activar'}
                 </button>
             </div>
             {nexusStatus.msg && <p className={`text-xs mt-3 font-bold px-1 flex items-center gap-1 ${nexusStatus.type === 'error' ? 'text-red-400' : 'text-green-400'}`}><Info size={12}/> {nexusStatus.msg}</p>}
          </div>

          {/* Tarjeta 2: TEAM MANAGEMENT */}
          <section className="p-6 rounded-2xl bg-white dark:bg-dp-charcoal border border-gray-200 dark:border-gray-700 shadow-sm">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h3 className="text-lg font-black flex items-center gap-2 text-dp-dark-gray dark:text-dp-light-gray"><Users size={20} className="text-dp-blue dark:text-dp-gold"/> Gestión de Operadores</h3>
                    <p className="text-xs text-gray-500">Control de acceso y roles de caja</p>
                </div>
                {!isFreeTier && <span className="text-[10px] bg-dp-soft-gray dark:bg-black/40 px-3 py-1 rounded-full font-black text-gray-500 uppercase tracking-tighter">{users.length} / {currentPlan === 'pro' ? '2' : '6'} Cupos</span>}
            </div>
            
            <div className="space-y-3">
                {users.map(user => (
                    <div key={user.id} className="flex items-center justify-between p-4 rounded-xl bg-dp-soft-gray dark:bg-black/20 border border-transparent hover:border-dp-blue/30 dark:hover:border-dp-gold/30 transition-all">
                        <div className="flex items-center gap-4">
                            <div className={`p-3 rounded-full shadow-inner ${user.role === 'admin' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'}`}>
                                {user.role === 'admin' ? <ShieldCheck size={20}/> : <UserIcon size={20}/>}
                            </div>
                            <div>
                                <p className="font-black text-sm text-dp-dark-gray dark:text-dp-light-gray">{user.name}</p>
                                <p className="text-[10px] uppercase font-black tracking-widest text-gray-400">{user.role}</p>
                            </div>
                        </div>
                        {users.length > 1 && (
                            <button 
                                onClick={() => handleDeleteUser(user.id)}
                                className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all"
                                title="Eliminar usuario"
                            >
                                <UserMinus size={18} />
                            </button>
                        )}
                    </div>
                ))}

                <FeatureGuard feature="advanced_reports" showLock={true}>
                    {isAddingUser ? (
                        <div className="mt-4 p-4 border-2 border-dp-blue/30 rounded-2xl bg-dp-blue/5 animate-modal-in">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                                <div>
                                    <label className="block text-[10px] font-black text-gray-500 uppercase mb-1.5 tracking-widest">Nombre Operador</label>
                                    <input 
                                        autoFocus
                                        type="text" 
                                        value={newUserName} 
                                        onChange={e => setNewUserName(e.target.value)} 
                                        placeholder="Ej: Juan Pérez"
                                        className="w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-dp-blue outline-none transition-all"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-gray-500 uppercase mb-1.5 tracking-widest">Rol de Usuario</label>
                                    <select 
                                        value={newUserRole} 
                                        onChange={e => setNewUserRole(e.target.value as any)}
                                        className="w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-dp-blue outline-none transition-all appearance-none"
                                    >
                                        <option value="cashier">Cajero (Sin PIN)</option>
                                        <option value="admin">Administrador (PIN 1234)</option>
                                    </select>
                                </div>
                            </div>
                            <div className="flex gap-3">
                                <button onClick={() => setIsAddingUser(false)} className="flex-1 py-2.5 text-xs font-black text-gray-500 hover:bg-gray-200 dark:hover:bg-white/10 rounded-xl transition-all">Cancelar</button>
                                <button onClick={handleAddUser} disabled={!newUserName.trim()} className="flex-1 py-2.5 bg-dp-blue text-white text-xs font-black rounded-xl hover:bg-blue-600 shadow-md active:scale-95 disabled:opacity-50 transition-all uppercase tracking-widest">Guardar</button>
                            </div>
                        </div>
                    ) : (
                        <button 
                            onClick={() => setIsAddingUser(true)}
                            className="w-full mt-3 py-4 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-2xl text-xs font-black text-gray-400 hover:text-dp-blue hover:border-dp-blue hover:bg-dp-blue/5 transition-all uppercase tracking-widest flex items-center justify-center gap-2"
                        >
                             <Plus size={18}/> Añadir Nuevo Operador
                        </button>
                    )}
                </FeatureGuard>
            </div>
          </section>

          {/* Tarjeta 3: BUSINESS SETTINGS */}
          <section className="p-6 rounded-2xl bg-white dark:bg-dp-charcoal border border-gray-200 dark:border-gray-700 shadow-sm">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h3 className="text-lg font-black flex items-center gap-2 text-dp-dark-gray dark:text-dp-light-gray"><Store size={20} className="text-dp-blue dark:text-dp-gold"/> Perfil del Comercio</h3>
                    <p className="text-xs text-gray-500">Datos para facturación y marca</p>
                </div>
                <button 
                    onClick={() => setShowPreview(!showPreview)} 
                    className="px-3 py-1 bg-dp-soft-gray dark:bg-black/40 rounded-full text-[10px] font-black text-dp-blue dark:text-dp-gold uppercase tracking-tighter hover:brightness-95 transition-all"
                >
                    {showPreview ? 'Ocultar Recibo' : 'Previsualizar Ticket'}
                </button>
            </div>
            
            {showPreview && (
                <div className="mb-6 p-6 bg-dp-soft-gray dark:bg-black/30 rounded-2xl flex flex-col sm:flex-row gap-8 items-center justify-center animate-modal-in border border-gray-200 dark:border-gray-700">
                    <div className="flex flex-col items-center">
                        <span className="text-[10px] font-black text-gray-400 mb-3 uppercase tracking-widest">Básico (Starter)</span>
                        <TicketPreview plan="starter" />
                    </div>
                    <div className="h-px w-full sm:h-40 sm:w-px bg-gray-300 dark:bg-gray-700"></div>
                    <div className="flex flex-col items-center relative group">
                        <span className="text-[10px] font-black text-dp-blue dark:text-dp-gold mb-3 uppercase tracking-widest flex items-center gap-1">
                            <Crown size={12} className="fill-current" /> Personalizado (PRO)
                        </span>
                        <div className="relative">
                            <TicketPreview plan="pro" />
                            {isFreeTier && (
                                <div className="absolute inset-0 bg-dp-blue/5 flex items-center justify-center pointer-events-none rounded rotate-3 border-2 border-dp-blue/20 backdrop-blur-[2px]">
                                    <span className="bg-dp-blue text-white text-[10px] font-black px-3 py-1.5 shadow-2xl transform -rotate-12 rounded-lg">PLAN PRO REQUERIDO</span>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            <div className="space-y-6">
                <FeatureGuard feature="custom_branding" showLock={true}>
                    <div className="p-4 bg-dp-soft-gray dark:bg-black/20 rounded-2xl flex items-center gap-6 border border-gray-100 dark:border-gray-800">
                        <div className="w-16 h-16 rounded-xl bg-white dark:bg-gray-700 flex items-center justify-center border-2 border-gray-200 dark:border-gray-600 overflow-hidden shadow-inner">
                            {businessSettings.logoUrl ? <img src={businessSettings.logoUrl} alt="Logo" className="w-full h-full object-contain" /> : <ImageIcon className="text-gray-300" size={28} />}
                        </div>
                        <div className="flex-1">
                            <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2">Imagen de Marca</p>
                            <div className="flex gap-2">
                                <button onClick={() => logoInputRef.current?.click()} className="px-4 py-1.5 text-[10px] bg-dp-blue text-white rounded-lg font-black uppercase tracking-wider shadow-sm hover:bg-blue-600 transition-all">Subir Logo</button>
                                {businessSettings.logoUrl && <button onClick={handleRemoveLogo} className="px-4 py-1.5 text-[10px] bg-red-100 text-red-700 rounded-lg font-black uppercase tracking-wider hover:bg-red-200 transition-all">Quitar</button>}
                            </div>
                            <input type="file" ref={logoInputRef} accept="image/*" onChange={handleLogoUpload} className="hidden" />
                        </div>
                    </div>
                </FeatureGuard>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div>
                        <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1.5">Nombre Comercial</label>
                        <input type="text" value={businessSettings.storeName} onChange={e => handleBusinessSettingChange('storeName', e.target.value)} className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 text-sm font-bold focus:ring-2 focus:ring-dp-blue outline-none transition-all"/>
                    </div>
                    <FeatureGuard feature="custom_branding" showLock={true}>
                        <div>
                            <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1.5">Teléfono Directo</label>
                            <input type="text" value={businessSettings.phone} onChange={e => handleBusinessSettingChange('phone', e.target.value)} className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 text-sm font-bold focus:ring-2 focus:ring-dp-blue outline-none transition-all"/>
                        </div>
                    </FeatureGuard>
                </div>
                <FeatureGuard feature="custom_branding" showLock={true}>
                    <div className="grid grid-cols-1 gap-6">
                        <div>
                            <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1.5">Dirección Física</label>
                            <input type="text" value={businessSettings.address} onChange={e => handleBusinessSettingChange('address', e.target.value)} className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 text-sm font-bold focus:ring-2 focus:ring-dp-blue outline-none transition-all"/>
                        </div>
                        <div>
                            <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1.5">Mensaje en Pie de Recibo</label>
                            <input type="text" value={businessSettings.receiptFooter} onChange={e => handleBusinessSettingChange('receiptFooter', e.target.value)} className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 text-sm font-bold focus:ring-2 focus:ring-dp-blue outline-none transition-all" placeholder="Ej: ¡Vuelva pronto!"/>
                        </div>
                    </div>
                </FeatureGuard>
            </div>
          </section>

          {/* Tarjeta 4: DATA MANAGEMENT */}
          <section className="p-6 rounded-2xl bg-white dark:bg-dp-charcoal border border-gray-200 dark:border-gray-700 shadow-sm">
              <h3 className="text-lg font-black flex items-center gap-2 text-dp-dark-gray dark:text-dp-light-gray mb-6"><Database size={20} className="text-dp-blue dark:text-dp-gold"/> Mantenimiento de Datos</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <button 
                    onClick={() => {}} 
                    className="p-4 border-2 border-gray-100 dark:border-gray-800 rounded-2xl flex flex-col items-center gap-3 hover:border-dp-blue dark:hover:border-dp-gold hover:bg-gray-50 dark:hover:bg-white/5 transition-all group"
                  >
                    <Download size={24} className="text-dp-blue group-hover:scale-110 transition-transform"/>
                    <span className="text-xs font-black text-dp-dark-gray dark:text-dp-light-gray uppercase tracking-widest">Exportar Base de Datos</span>
                  </button>
                  <button 
                    onClick={() => {}} 
                    className="p-4 border-2 border-gray-100 dark:border-gray-800 rounded-2xl flex flex-col items-center gap-3 hover:border-red-500 dark:hover:border-red-700 hover:bg-red-50 dark:hover:bg-red-900/10 transition-all group"
                  >
                    <Upload size={24} className="text-red-500 group-hover:scale-110 transition-transform"/>
                    <span className="text-xs font-black text-dp-dark-gray dark:text-dp-light-gray uppercase tracking-widest">Importar Backup</span>
                  </button>
              </div>
              <button onClick={() => setIsAuditModalOpen(true)} className="w-full mt-6 py-3 text-gray-400 text-[10px] uppercase font-black tracking-[0.2em] hover:text-dp-dark-gray dark:hover:text-white transition-all text-center border-t border-gray-100 dark:border-gray-800 pt-6">Ver Registro de Auditoría Local</button>
          </section>

        </div>

        {/* Action Bar Footer */}
        <div className="p-6 bg-white dark:bg-dp-charcoal border-t border-gray-200 dark:border-gray-700 flex gap-4">
            <button onClick={handleSaveAllSettings} className="flex-1 flex justify-center items-center gap-3 px-6 py-4 rounded-2xl text-lg font-black bg-green-600 text-white hover:bg-green-700 shadow-xl shadow-green-500/20 transition-all active:scale-[0.98] uppercase tracking-wider"><CheckCircle size={24} /> Guardar Configuración</button>
        </div>
      </div>
      {isAuditModalOpen && <AuditLogModal onClose={() => setIsAuditModalOpen(false)} />}
    </div>
  );
};

export default SettingsModal;
