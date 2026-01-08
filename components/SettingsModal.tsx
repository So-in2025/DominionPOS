
import React, { useRef, useState, useEffect } from 'react';
import { X, Download, Upload, Store, Image as ImageIcon, BrainCircuit, Eye, EyeOff, CloudLightning, Signal, Copy, Lock, Smartphone, CheckCircle, Crown, Users, UserMinus, ShieldCheck, User as UserIcon } from 'lucide-react';
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
  const fileInputRef = useRef<HTMLInputElement>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const [loyaltySettings, setLoyaltySettings] = useState<LoyaltySettings>(settingsService.getLoyaltySettings());
  const [businessSettings, setBusinessSettings] = useState<BusinessSettings>(settingsService.getBusinessSettings());
  const [isAuditModalOpen, setIsAuditModalOpen] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  
  // Nexus Cloud State
  const [nexusKey, setNexusKey] = useState('');
  const [currentIdentity, setCurrentIdentity] = useState<CloudNodeIdentity | null>(null);
  const [nexusStatus, setNexusStatus] = useState<{connecting: boolean, msg: string, type: 'success' | 'error' | 'neutral'}>({connecting: false, msg: '', type: 'neutral'});
  
  // AI Key State
  const [apiKey, setApiKey] = useState('');
  const [showApiKey, setShowApiKey] = useState(false);
  
  // User Management State
  const [users, setUsers] = useState<User[]>([]);

  useEffect(() => {
      refreshUsers();
      const identity = cloudService.getIdentity();
      setCurrentIdentity(identity);
      if (identity.licenseKey && !identity.licenseKey.startsWith('FREE-')) {
          setNexusKey(identity.licenseKey);
      }
      const currentKey = settingsService.getGeminiApiKey();
      if (currentKey) setApiKey(currentKey);
  }, []);

  const refreshUsers = () => {
      setUsers(dbService.getUsers());
  };

  const handleDeleteUser = async (userId: string) => {
      try {
          const success = await dbService.deleteUser(userId);
          if (success) {
              soundService.playSound('trash');
              refreshUsers();
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
      settingsService.saveGeminiApiKey(apiKey);
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
    <div className="fixed inset-0 bg-black/60 z-50 flex justify-center items-center" aria-modal="true" role="dialog" onClick={onClose}>
      <div className="bg-dp-light dark:bg-dp-charcoal rounded-lg shadow-2xl p-6 w-full max-w-2xl m-4 animate-modal-in overflow-y-auto max-h-[90vh]" onClick={(e) => e.stopPropagation()}>
        
        <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-dp-dark-gray dark:text-dp-light-gray">Configuración</h2>
            <button onClick={onClose} className="p-2 rounded-full hover:bg-dp-soft-gray dark:hover:bg-gray-700"><X size={24} /></button>
        </div>

        <div className="space-y-6">
          
          {/* NEXUS CONNECTION CARD */}
          <div className="p-5 border rounded-xl bg-gradient-to-r from-gray-900 to-gray-800 text-white shadow-lg overflow-hidden relative">
             <div className="absolute top-0 right-0 p-2 opacity-10"><CloudLightning size={100} /></div>
             <div className="flex justify-between items-start mb-4 relative z-10">
                 <div>
                    <h3 className="font-bold text-lg flex items-center gap-2"><CloudLightning className="text-yellow-400"/> Dominion Nexus</h3>
                    <p className="text-sm text-gray-400">Licenciamiento y Nube.</p>
                 </div>
                 <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-xs font-mono border font-bold ${isFreeTier ? 'bg-gray-700 border-gray-500 text-gray-300' : 'bg-green-900/50 border-green-500 text-green-400'}`}>
                    <Signal size={12}/> {currentPlan.toUpperCase()}
                 </div>
             </div>
             <div className="flex gap-2 relative z-10">
                 <input type="text" value={nexusKey} onChange={e => setNexusKey(e.target.value)} placeholder="Ingresar Clave PRO..." className="flex-1 bg-black/40 border border-gray-600 rounded px-3 py-2 text-white font-mono text-sm focus:border-dp-gold outline-none"/>
                 <button onClick={handleConnectNexus} disabled={nexusStatus.connecting} className="bg-yellow-500 text-black font-bold px-4 py-2 rounded hover:bg-yellow-400 disabled:opacity-50 text-sm transition-colors">
                    {nexusStatus.connecting ? '...' : 'Activar'}
                 </button>
             </div>
             {nexusStatus.msg && <p className={`text-xs mt-2 font-bold ${nexusStatus.type === 'error' ? 'text-red-400' : 'text-green-400'}`}>{nexusStatus.msg}</p>}
          </div>

          {/* TEAM MANAGEMENT SECTION (NEW POSITION: TOP) */}
          <div className="p-4 border rounded-lg dark:border-gray-700 bg-white dark:bg-black/10">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2"><Users size={20} /> Gestión de Equipo</h3>
            <div className="space-y-2">
                {users.map(user => (
                    <div key={user.id} className="flex items-center justify-between p-3 rounded-lg bg-dp-soft-gray dark:bg-white/5 border border-transparent hover:border-gray-200 dark:hover:border-gray-700 transition-colors">
                        <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-full ${user.role === 'admin' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'}`}>
                                {user.role === 'admin' ? <ShieldCheck size={18}/> : <UserIcon size={18}/>}
                            </div>
                            <div>
                                <p className="font-bold text-sm">{user.name}</p>
                                <p className="text-[10px] uppercase tracking-widest text-gray-500">{user.role}</p>
                            </div>
                        </div>
                        {users.length > 1 && (
                            <button 
                                onClick={() => handleDeleteUser(user.id)}
                                className="p-2 text-gray-400 hover:text-red-500 transition-colors"
                                title="Eliminar usuario"
                            >
                                <UserMinus size={18} />
                            </button>
                        )}
                    </div>
                ))}
                <FeatureGuard feature="remote_config" showLock={false}>
                    <button className="w-full mt-2 py-2 border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-lg text-xs font-bold text-gray-400 hover:text-dp-blue hover:border-dp-blue transition-all uppercase tracking-widest flex items-center justify-center gap-2">
                         Añadir Operador
                    </button>
                </FeatureGuard>
            </div>
          </div>

          {/* Business Settings (MOVED DOWN) */}
          <div className="p-4 border rounded-lg dark:border-gray-700 bg-white dark:bg-black/10">
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold flex items-center gap-2"><Store size={20} /> Datos del Negocio</h3>
                <button 
                    onClick={() => setShowPreview(!showPreview)} 
                    className="text-xs flex items-center gap-1 font-bold text-dp-blue dark:text-dp-gold hover:underline"
                >
                    {showPreview ? 'Ocultar Previsualización' : 'Ver Vista Previa Ticket'}
                </button>
            </div>
            
            {showPreview && (
                <div className="mb-6 p-4 bg-gray-200 dark:bg-gray-900 rounded-lg flex flex-col sm:flex-row gap-8 items-center justify-center animate-modal-in overflow-hidden border-2 border-dashed border-gray-300 dark:border-gray-700">
                    <div className="flex flex-col items-center">
                        <span className="text-[10px] font-bold text-gray-500 mb-2 uppercase tracking-widest">Ticket Actual (Starter)</span>
                        <TicketPreview plan="starter" />
                    </div>
                    <div className="h-px w-full sm:h-32 sm:w-px bg-gray-300 dark:bg-gray-700"></div>
                    <div className="flex flex-col items-center relative group">
                        <span className="text-[10px] font-bold text-dp-blue dark:text-dp-gold mb-2 uppercase tracking-widest flex items-center gap-1">
                            <Crown size={10} /> Ticket Personalizado (PRO)
                        </span>
                        <div className="relative">
                            <TicketPreview plan="pro" />
                            {isFreeTier && (
                                <div className="absolute inset-0 bg-dp-blue/10 flex items-center justify-center pointer-events-none rounded rotate-3 border-2 border-dp-blue/20 backdrop-blur-[1px]">
                                    <span className="bg-dp-blue text-white text-[8px] font-bold px-2 py-1 shadow-lg transform -rotate-12">REQUERIDO UPGRADE</span>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            <div className="space-y-4">
                <FeatureGuard feature="custom_branding" showLock={true}>
                    <div className="p-3 bg-dp-soft-gray dark:bg-black/20 rounded-lg flex items-center gap-4">
                        <div className="w-12 h-12 rounded bg-white dark:bg-gray-700 flex items-center justify-center border border-gray-300 dark:border-gray-600 overflow-hidden">
                            {businessSettings.logoUrl ? <img src={businessSettings.logoUrl} alt="Logo" className="w-full h-full object-contain" /> : <ImageIcon className="text-gray-400" size={20} />}
                        </div>
                        <div className="flex-1">
                            <p className="text-xs font-bold mb-1">Logo del Negocio</p>
                            <div className="flex gap-2">
                                <button onClick={() => logoInputRef.current?.click()} className="px-2 py-1 text-[10px] bg-dp-blue text-white rounded font-bold">Subir</button>
                                {businessSettings.logoUrl && <button onClick={handleRemoveLogo} className="px-2 py-1 text-[10px] bg-red-100 text-red-700 rounded font-bold">Eliminar</button>}
                            </div>
                            <input type="file" ref={logoInputRef} accept="image/*" onChange={handleLogoUpload} className="hidden" />
                        </div>
                    </div>
                </FeatureGuard>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div><label className="block text-xs font-bold text-gray-500 uppercase">Nombre del Comercio</label><input type="text" value={businessSettings.storeName} onChange={e => handleBusinessSettingChange('storeName', e.target.value)} className="mt-1 w-full px-3 py-2 border rounded bg-transparent dark:border-gray-600 text-sm focus:ring-1 focus:ring-dp-blue outline-none"/></div>
                    <FeatureGuard feature="custom_branding" showLock={true}>
                        <div><label className="block text-xs font-bold text-gray-500 uppercase">Teléfono de Contacto</label><input type="text" value={businessSettings.phone} onChange={e => handleBusinessSettingChange('phone', e.target.value)} className="mt-1 w-full px-3 py-2 border rounded bg-transparent dark:border-gray-600 text-sm focus:ring-1 focus:ring-dp-blue outline-none"/></div>
                    </FeatureGuard>
                </div>
                <FeatureGuard feature="custom_branding" showLock={true}>
                    <div><label className="block text-xs font-bold text-gray-500 uppercase">Dirección Física</label><input type="text" value={businessSettings.address} onChange={e => handleBusinessSettingChange('address', e.target.value)} className="mt-1 w-full px-3 py-2 border rounded bg-transparent dark:border-gray-600 text-sm focus:ring-1 focus:ring-dp-blue outline-none"/></div>
                    <div><label className="block text-xs font-bold text-gray-500 uppercase">Pie de Recibo (Mensaje)</label><input type="text" value={businessSettings.receiptFooter} onChange={e => handleBusinessSettingChange('receiptFooter', e.target.value)} className="mt-1 w-full px-3 py-2 border rounded bg-transparent dark:border-gray-600 text-sm focus:ring-1 focus:ring-dp-blue outline-none" placeholder="Ej: ¡Gracias por su compra!"/></div>
                </FeatureGuard>
            </div>
          </div>

          {/* AI Settings */}
          <FeatureGuard feature="ai_scanner" showLock={true}>
            <div className="p-4 border rounded-lg border-blue-500/30 bg-blue-50/50 dark:bg-blue-900/10">
                <h3 className="text-lg font-semibold mb-2 flex items-center gap-2 text-dp-blue dark:text-dp-gold"><BrainCircuit size={20} /> Inteligencia Artificial</h3>
                <label className="block text-xs font-bold text-gray-500 uppercase">Google Gemini API Key (BYOK)</label>
                <div className="relative mt-1">
                    <input type={showApiKey ? "text" : "password"} value={apiKey} onChange={e => setApiKey(e.target.value)} placeholder="AIzaSy..." className="w-full px-3 py-2 pr-10 border rounded bg-white dark:bg-gray-800 dark:border-gray-600 text-sm focus:ring-1 focus:ring-dp-blue outline-none"/>
                    <button type="button" onClick={() => setShowApiKey(!showApiKey)} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400">{showApiKey ? <EyeOff size={18} /> : <Eye size={18} />}</button>
                </div>
            </div>
          </FeatureGuard>

          <button onClick={handleSaveAllSettings} className="w-full flex justify-center items-center gap-2 px-4 py-3 rounded-lg text-lg font-bold bg-green-600 text-white hover:bg-green-700 shadow-lg transition-transform active:scale-[0.98]"><CheckCircle size={20} /> Guardar Cambios</button>

          {/* Data Management */}
          <div className="grid grid-cols-2 gap-4 opacity-70">
              <div className="p-3 border rounded-lg dark:border-gray-700 flex flex-col items-center gap-2 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors cursor-pointer" onClick={() => {}}>
                <Download size={20} className="text-dp-blue"/>
                <button className="text-xs font-bold text-dp-blue uppercase">Exportar Datos</button>
              </div>
              <div className="p-3 border rounded-lg dark:border-gray-700 flex flex-col items-center gap-2 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors cursor-pointer" onClick={() => {}}>
                <Upload size={20} className="text-red-600"/>
                <button className="text-xs font-bold text-red-600 uppercase">Importar Backup</button>
              </div>
          </div>
          
          <button onClick={() => setIsAuditModalOpen(true)} className="w-full py-2 text-gray-500 text-[10px] uppercase font-bold tracking-widest hover:underline text-center">Registro de Auditoría de Sistema</button>

        </div>
      </div>
      {isAuditModalOpen && <AuditLogModal onClose={() => setIsAuditModalOpen(false)} />}
    </div>
  );
};

export default SettingsModal;
