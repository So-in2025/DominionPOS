
import React, { useRef, useState, useEffect, useMemo } from 'react';
import { X, Download, Upload, Store, Image as ImageIcon, BrainCircuit, CloudLightning, Signal, Lock, Smartphone, CheckCircle, Crown, Users, UserMinus, ShieldCheck, User as UserIcon, Plus, Info, Database, Loader2, Tags, Edit3, Trash2, Save, Key } from 'lucide-react';
import * as dbService from '../services/db';
import * as settingsService from '../services/settings';
import * as cloudService from '../services/cloud';
import * as soundService from '../services/sound';
import type { LoyaltySettings, User, BusinessSettings, CloudNodeIdentity, PlanTier, Product } from '../types';
import AuditLogModal from './AuditLogModal';
import FeatureGuard from './FeatureGuard';
import UpgradeModal from './UpgradeModal';

interface SettingsModalProps {
  onClose: () => void;
  onImportSuccess: () => void;
  onSettingsSaved: () => void;
  products?: Product[];
}

const SettingsModal: React.FC<SettingsModalProps> = ({ onClose, onImportSuccess, onSettingsSaved, products = [] }) => {
  const logoInputRef = useRef<HTMLInputElement>(null);
  const importInputRef = useRef<HTMLInputElement>(null);
  
  const [loyaltySettings, setLoyaltySettings] = useState<LoyaltySettings>(settingsService.getLoyaltySettings());
  const [businessSettings, setBusinessSettings] = useState<BusinessSettings>(settingsService.getBusinessSettings());
  const [isAuditModalOpen, setIsAuditModalOpen] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [isProcessingFile, setIsProcessingFile] = useState(false);
  const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);
  
  // User Management State
  const [isAddingUser, setIsAddingUser] = useState(false);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [userNameInput, setUserNameInput] = useState('');
  const [userRoleInput, setUserRoleInput] = useState<'admin' | 'cashier'>('cashier');
  const [userPinInput, setUserPinInput] = useState('');
  
  const [nexusKey, setNexusKey] = useState('');
  const [currentIdentity, setCurrentIdentity] = useState<CloudNodeIdentity | null>(null);
  const [nexusStatus, setNexusStatus] = useState<{connecting: boolean, msg: string, type: 'success' | 'error' | 'neutral'}>({connecting: false, msg: '', type: 'neutral'});
  
  const [users, setUsers] = useState<User[]>([]);
  
  // Category Management
  const [categories, setCategories] = useState<string[]>([]);
  const [editingCategory, setEditingCategory] = useState<string | null>(null);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [createCategoryName, setCreateCategoryName] = useState('');

  useEffect(() => {
      refreshUsers();
      const identity = cloudService.getIdentity();
      setCurrentIdentity(identity);
      if (identity.licenseKey && !identity.licenseKey.startsWith('FREE-')) {
          setNexusKey(identity.licenseKey);
      }
      
      // Combine product categories with custom saved categories
      const productCats = new Set(products.map(p => p.category).filter(Boolean));
      const savedCats = businessSettings.customCategories || [];
      savedCats.forEach(c => productCats.add(c));
      
      setCategories(Array.from(productCats).sort());
  }, [products, businessSettings]);

  const refreshUsers = () => {
      setUsers(dbService.getUsers());
  };

  // ... (Export/Import logic)
  const handleExport = async () => {
      soundService.playSound('click');
      const data = await dbService.exportDatabase();
      const blob = new Blob([data], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `dominion-backup-${new Date().toISOString().split('T')[0]}.json`;
      link.click();
      URL.revokeObjectURL(url);
      dbService.logAction('DB_EXPORTED', 'Backup manual descargado por el usuario', 'info');
  };

  const handleImportClick = () => {
      importInputRef.current?.click();
  };

  const handleFileImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      if (!window.confirm("¿IMPORTAR BACKUP? Esta acción reemplazará TODOS los datos actuales. No se puede deshacer.")) {
          return;
      }

      setIsProcessingFile(true);
      const reader = new FileReader();
      reader.onload = async (ev) => {
          try {
              const content = ev.target?.result as string;
              await dbService.importDatabase(content);
              soundService.playSound('hero');
              onImportSuccess();
          } catch (err: any) {
              alert(`Error fatal de importación: ${err.message}`);
              soundService.playSound('error');
          } finally {
              setIsProcessingFile(false);
          }
      };
      reader.readAsText(file);
  };

  // --- USER MANAGEMENT ---
  const handleStartAddUser = () => {
      const currentPlan = cloudService.getPlan();
      const maxUsers = currentPlan === 'pro' ? 2 : currentPlan === 'enterprise' ? 6 : 1;
      
      if (users.length >= maxUsers) {
          soundService.playSound('pop');
          setIsUpgradeModalOpen(true); // Soft Gate
          return;
      }
      
      setEditingUserId(null);
      setUserNameInput('');
      setUserRoleInput('cashier');
      setUserPinInput('');
      setIsAddingUser(true);
  };

  const handleStartEditUser = (user: User) => {
      setEditingUserId(user.id);
      setUserNameInput(user.name);
      setUserRoleInput(user.role);
      setUserPinInput(user.pin);
      setIsAddingUser(true);
  }

  const handleSaveUser = async () => {
      if (!userNameInput.trim()) return;
      if (userRoleInput === 'admin' && userPinInput.length < 4) {
          alert("El PIN de administrador debe tener al menos 4 dígitos.");
          return;
      }

      if (editingUserId) {
          // Update
          await dbService.updateUser({
              id: editingUserId,
              name: userNameInput.trim(),
              role: userRoleInput,
              pin: userRoleInput === 'admin' ? userPinInput : ''
          });
          soundService.playSound('success');
      } else {
          // Create
          await dbService.addUser({
              name: userNameInput.trim(),
              role: userRoleInput,
              pin: userRoleInput === 'admin' ? userPinInput : ''
          });
          soundService.playSound('hero');
      }

      setUserNameInput('');
      setUserPinInput('');
      setIsAddingUser(false);
      setEditingUserId(null);
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

  // ... (Logo & Settings logic)
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
      onSettingsSaved();
  };
  
  // --- CATEGORY LOGIC ---
  const handleCreateCategory = () => {
      if(!createCategoryName.trim()) return;
      const newCat = createCategoryName.trim();
      const currentCustom = businessSettings.customCategories || [];
      
      if (!categories.includes(newCat)) {
          setBusinessSettings(prev => ({
              ...prev,
              customCategories: [...currentCustom, newCat]
          }));
          setCategories(prev => [...prev, newCat].sort());
          soundService.playSound('success');
      }
      setCreateCategoryName('');
      setIsAddingCategory(false);
  };

  const handleDeleteCategory = async (catName: string) => {
      if(!window.confirm(`¿Borrar categoría "${catName}"? Los productos pasarán a 'General'.`)) return;
      
      const prodsToUpdate = products.filter(p => p.category === catName);
      for(const prod of prodsToUpdate) {
          await dbService.updateProduct({ ...prod, category: 'General' });
      }
      
      const currentCustom = businessSettings.customCategories || [];
      setBusinessSettings(prev => ({
          ...prev,
          customCategories: currentCustom.filter(c => c !== catName)
      }));
      
      setCategories(prev => prev.filter(c => c !== catName));
      soundService.playSound('trash');
  };

  const handleRenameCategory = async (oldName: string) => {
      if(!newCategoryName.trim() || newCategoryName === oldName) {
          setEditingCategory(null);
          return;
      }
      
      const prodsToUpdate = products.filter(p => p.category === oldName);
      for(const prod of prodsToUpdate) {
          await dbService.updateProduct({ ...prod, category: newCategoryName.trim() });
      }
      
      const currentCustom = businessSettings.customCategories || [];
      if (currentCustom.includes(oldName)) {
          setBusinessSettings(prev => ({
              ...prev,
              customCategories: currentCustom.map(c => c === oldName ? newCategoryName.trim() : c)
          }));
      }

      soundService.playSound('success');
      setCategories(prev => prev.map(c => c === oldName ? newCategoryName.trim() : c));
      setEditingCategory(null);
      setNewCategoryName('');
  };

  const currentPlan = cloudService.getPlan();
  const isFreeTier = currentPlan === 'starter';

  // ... (TicketPreview)
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
        {plan === 'starter' && <p className="text-[6px] text-gray-400 mt-1 uppercase tracking-tighter">Dominion POS - Base</p>}
    </div>
  );

  return (
    <div className="fixed inset-0 bg-black/60 z-[60] flex justify-center items-center backdrop-blur-sm" aria-modal="true" role="dialog" onClick={onClose}>
      <div className="bg-dp-soft-gray dark:bg-dp-dark rounded-2xl shadow-2xl p-0 w-full max-w-2xl m-4 animate-modal-in overflow-hidden max-h-[90vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        
        {/* Header */}
        <div className="bg-white dark:bg-dp-charcoal px-6 py-4 flex justify-between items-center border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
            <div>
                <h2 className="text-2xl font-black text-dp-dark-gray dark:text-dp-light-gray tracking-tight">Panel de Control</h2>
                <p className="text-xs text-gray-500 uppercase font-bold tracking-widest">Configuración del Sistema</p>
            </div>
            <button onClick={onClose} className="p-2 rounded-full hover:bg-dp-soft-gray dark:hover:bg-gray-700 transition-colors"><X size={24} /></button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-8">
          
          {/* Nexus Cloud Banner */}
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

          {/* BYOK Section for PRO Users */}
          <FeatureGuard feature="ai_scanner" showLock={true}>
              <section className="p-6 rounded-2xl bg-white dark:bg-dp-charcoal border border-gray-200 dark:border-gray-700 shadow-sm border-l-4 border-l-purple-500">
                  <div className="flex items-start gap-4">
                      <div className="p-3 bg-purple-100 dark:bg-purple-900/30 rounded-xl text-purple-600 dark:text-purple-400">
                          <BrainCircuit size={24} />
                      </div>
                      <div className="flex-1">
                          <h3 className="text-lg font-black text-dp-dark-gray dark:text-dp-light-gray flex items-center gap-2">Inteligencia Artificial (BYOK)</h3>
                          <p className="text-xs text-gray-500 mb-4">Como usuario PRO, conecta tu propia API Key de Google Gemini para uso ilimitado.</p>
                          
                          <div>
                              <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1.5">Google Gemini API Key</label>
                              <div className="flex gap-2">
                                  <input 
                                      type="password" 
                                      value={businessSettings.googleApiKey || ''} 
                                      onChange={e => handleBusinessSettingChange('googleApiKey', e.target.value)} 
                                      placeholder="AIzaSy..." 
                                      className="flex-1 w-full px-4 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50 dark:bg-black/30 text-sm font-mono focus:ring-2 focus:ring-purple-500 outline-none transition-all"
                                  />
                                  <a 
                                      href="https://aistudio.google.com/app/apikey" 
                                      target="_blank" 
                                      rel="noreferrer"
                                      className="px-4 py-2 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 rounded-xl text-xs font-bold flex items-center gap-2 hover:bg-gray-200 dark:hover:bg-gray-700"
                                  >
                                      <Key size={14}/> Obtener Key
                                  </a>
                              </div>
                          </div>
                      </div>
                  </div>
              </section>
          </FeatureGuard>

          {/* Category Management Section */}
          <section className="p-6 rounded-2xl bg-white dark:bg-dp-charcoal border border-gray-200 dark:border-gray-700 shadow-sm">
              <div className="flex justify-between items-center mb-4">
                  <div>
                      <h3 className="text-lg font-black flex items-center gap-2 text-dp-dark-gray dark:text-dp-light-gray"><Tags size={20} className="text-dp-blue dark:text-dp-gold"/> Gestión de Categorías</h3>
                      <p className="text-xs text-gray-500">Organización del inventario</p>
                  </div>
                  {!isAddingCategory ? (
                      <button onClick={() => setIsAddingCategory(true)} className="text-[10px] font-bold uppercase tracking-widest text-dp-blue dark:text-dp-gold hover:underline flex items-center gap-1"><Plus size={12}/> Nueva</button>
                  ) : (
                      <div className="flex items-center gap-2 animate-slide-in-from-right">
                          <input autoFocus type="text" placeholder="Nombre..." value={createCategoryName} onChange={e => setCreateCategoryName(e.target.value)} className="w-32 text-xs p-1 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-black/20 outline-none"/>
                          <button onClick={handleCreateCategory} className="text-green-500"><CheckCircle size={16}/></button>
                          <button onClick={() => setIsAddingCategory(false)} className="text-red-500"><X size={16}/></button>
                      </div>
                  )}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-40 overflow-y-auto pr-2 custom-scrollbar">
                  {categories.map(cat => (
                      <div key={cat} className="flex items-center justify-between p-3 bg-dp-soft-gray dark:bg-black/20 rounded-xl group">
                          {editingCategory === cat ? (
                              <div className="flex items-center gap-2 flex-1">
                                  <input 
                                    autoFocus
                                    type="text" 
                                    value={newCategoryName}
                                    onChange={e => setNewCategoryName(e.target.value)}
                                    className="w-full text-xs font-bold bg-white dark:bg-gray-800 p-1.5 rounded border border-dp-blue outline-none"
                                  />
                                  <button onClick={() => handleRenameCategory(cat)} className="text-green-500"><CheckCircle size={16}/></button>
                                  <button onClick={() => setEditingCategory(null)} className="text-red-500"><X size={16}/></button>
                              </div>
                          ) : (
                              <>
                                <span className="text-xs font-bold text-gray-700 dark:text-gray-300 truncate">{cat}</span>
                                <div className="flex items-center gap-2 opacity-60 group-hover:opacity-100 transition-opacity">
                                    <button onClick={() => { setEditingCategory(cat); setNewCategoryName(cat); }} className="text-gray-400 hover:text-dp-blue dark:hover:text-dp-gold">
                                        <Edit3 size={14}/>
                                    </button>
                                    <button onClick={() => handleDeleteCategory(cat)} className="text-gray-400 hover:text-red-500">
                                        <Trash2 size={14}/>
                                    </button>
                                </div>
                              </>
                          )}
                      </div>
                  ))}
                  {categories.length === 0 && <p className="text-xs text-gray-400 italic">No hay categorías definidas aún.</p>}
              </div>
          </section>

          {/* User Management */}
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
                        <div className="flex gap-2">
                            <button onClick={() => handleStartEditUser(user)} className="p-2 text-gray-400 hover:text-dp-blue dark:hover:text-dp-gold hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-all" title="Editar"><Edit3 size={18}/></button>
                            {users.length > 1 && (
                                <button onClick={() => handleDeleteUser(user.id)} className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all" title="Eliminar"><UserMinus size={18}/></button>
                            )}
                        </div>
                    </div>
                ))}
                <FeatureGuard feature="advanced_reports" showLock={false}>
                    {isAddingUser ? (
                        <div className="mt-4 p-4 border-2 border-dp-blue/30 rounded-2xl bg-dp-blue/5 animate-modal-in">
                            <h4 className="text-xs font-black uppercase text-dp-blue mb-4">{editingUserId ? 'Editar Operador' : 'Nuevo Operador'}</h4>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                                <div>
                                    <label className="block text-[10px] font-black text-gray-500 uppercase mb-1.5 tracking-widest">Nombre</label>
                                    <input autoFocus type="text" value={userNameInput} onChange={e => setUserNameInput(e.target.value)} className="w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-dp-blue outline-none transition-all"/>
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-gray-500 uppercase mb-1.5 tracking-widest">Rol</label>
                                    <select value={userRoleInput} onChange={e => setUserRoleInput(e.target.value as any)} className="w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-dp-blue outline-none transition-all appearance-none">
                                        <option value="cashier">Cajero (Sin PIN)</option>
                                        <option value="admin">Administrador (Con PIN)</option>
                                    </select>
                                </div>
                                {userRoleInput === 'admin' && (
                                    <div className="col-span-1 sm:col-span-2">
                                        <label className="block text-[10px] font-black text-gray-500 uppercase mb-1.5 tracking-widest">PIN de Seguridad (4+ dígitos)</label>
                                        <input type="text" value={userPinInput} onChange={e => setUserPinInput(e.target.value.replace(/[^0-9]/g, ''))} placeholder="1234" maxLength={6} className="w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-dp-blue outline-none transition-all font-mono tracking-widest"/>
                                    </div>
                                )}
                            </div>
                            <div className="flex gap-3">
                                <button onClick={() => { setIsAddingUser(false); setEditingUserId(null); }} className="flex-1 py-2.5 text-xs font-black text-gray-500 hover:bg-gray-200 dark:hover:bg-white/10 rounded-xl transition-all">Cancelar</button>
                                <button onClick={handleSaveUser} disabled={!userNameInput.trim()} className="flex-1 py-2.5 bg-dp-blue text-white text-xs font-black rounded-xl hover:bg-blue-600 shadow-md active:scale-95 disabled:opacity-50 transition-all uppercase tracking-widest">Guardar</button>
                            </div>
                        </div>
                    ) : (
                        <button onClick={handleStartAddUser} className="w-full mt-3 py-4 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-2xl text-xs font-black text-gray-400 hover:text-dp-blue hover:border-dp-blue hover:bg-dp-blue/5 transition-all uppercase tracking-widest flex items-center justify-center gap-2"><Plus size={18}/> Añadir Nuevo Operador</button>
                    )}
                </FeatureGuard>
            </div>
          </section>

          {/* Branding & Data Maintenance */}
          <section className="p-6 rounded-2xl bg-white dark:bg-dp-charcoal border border-gray-200 dark:border-gray-700 shadow-sm">
            <div className="flex justify-between items-center mb-6">
                <div><h3 className="text-lg font-black flex items-center gap-2 text-dp-dark-gray dark:text-dp-light-gray"><Store size={20} className="text-dp-blue dark:text-dp-gold"/> Perfil del Comercio</h3><p className="text-xs text-gray-500">Datos para facturación y marca</p></div>
                <button onClick={() => setShowPreview(!showPreview)} className="px-3 py-1 bg-dp-soft-gray dark:bg-black/40 rounded-full text-[10px] font-black text-dp-blue dark:text-dp-gold uppercase tracking-tighter hover:brightness-95 transition-all">{showPreview ? 'Ocultar Recibo' : 'Previsualizar Ticket'}</button>
            </div>
            {showPreview && (<div className="mb-6 p-6 bg-dp-soft-gray dark:bg-black/30 rounded-2xl flex flex-col sm:flex-row gap-8 items-center justify-center animate-modal-in border border-gray-200 dark:border-gray-700"><div className="flex flex-col items-center"><span className="text-[10px] font-black text-gray-400 mb-3 uppercase tracking-widest">Plan Base</span><TicketPreview plan="starter" /></div><div className="h-px w-full sm:h-40 sm:w-px bg-gray-300 dark:bg-gray-700"></div><div className="flex flex-col items-center relative group"><span className="text-[10px] font-black text-dp-blue dark:text-dp-gold mb-3 uppercase tracking-widest flex items-center gap-1"><Crown size={12} className="fill-current" /> Personalizado (PRO)</span><div className="relative"><TicketPreview plan="pro" />{isFreeTier && (<div className="absolute inset-0 bg-dp-blue/5 flex items-center justify-center pointer-events-none rounded rotate-3 border-2 border-dp-blue/20 backdrop-blur-[2px]"><span className="bg-dp-blue text-white text-[10px] font-black px-3 py-1.5 shadow-2xl transform -rotate-12 rounded-lg">PLAN PRO REQUERIDO</span></div>)}</div></div></div>)}
            <div className="space-y-6">
                <FeatureGuard feature="custom_branding" showLock={true}><div className="p-4 bg-dp-soft-gray dark:bg-black/20 rounded-2xl flex items-center gap-6 border border-gray-100 dark:border-gray-800"><div className="w-16 h-16 rounded-xl bg-white dark:bg-gray-700 flex items-center justify-center border-2 border-gray-200 dark:border-gray-600 overflow-hidden shadow-inner">{businessSettings.logoUrl ? <img src={businessSettings.logoUrl} alt="Logo" className="w-full h-full object-contain" /> : <ImageIcon className="text-gray-300" size={28} />}</div><div className="flex-1"><p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2">Imagen de Marca</p><div className="flex gap-2"><button onClick={() => logoInputRef.current?.click()} className="px-4 py-1.5 text-[10px] bg-dp-blue text-white rounded-lg font-black uppercase tracking-wider shadow-sm hover:bg-blue-600 transition-all">Subir Logo</button>{businessSettings.logoUrl && <button onClick={handleRemoveLogo} className="px-4 py-1.5 text-[10px] bg-red-100 text-red-700 rounded-lg font-black uppercase tracking-wider hover:bg-red-200 transition-all">Quitar</button>}</div><input type="file" ref={logoInputRef} accept="image/*" onChange={handleLogoUpload} className="hidden" /></div></div></FeatureGuard>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6"><div><label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1.5">Nombre Comercial</label><input type="text" value={businessSettings.storeName} onChange={e => handleBusinessSettingChange('storeName', e.target.value)} className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 text-sm font-bold focus:ring-2 focus:ring-dp-blue outline-none transition-all"/></div><FeatureGuard feature="custom_branding" showLock={true}><div><label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1.5">Teléfono Directo</label><input type="text" value={businessSettings.phone} onChange={e => handleBusinessSettingChange('phone', e.target.value)} className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 text-sm font-bold focus:ring-2 focus:ring-dp-blue outline-none transition-all"/></div></FeatureGuard></div>
                <FeatureGuard feature="custom_branding" showLock={true}><div className="grid grid-cols-1 gap-6"><div><label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1.5">Dirección Física</label><input type="text" value={businessSettings.address} onChange={e => handleBusinessSettingChange('address', e.target.value)} className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 text-sm font-bold focus:ring-2 focus:ring-dp-blue outline-none transition-all"/></div><div><label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1.5">Mensaje en Pie de Recibo</label><input type="text" value={businessSettings.receiptFooter} onChange={e => handleBusinessSettingChange('receiptFooter', e.target.value)} className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 text-sm font-bold focus:ring-2 focus:ring-dp-blue outline-none transition-all" placeholder="Ej: ¡Vuelva pronto!"/></div></div></FeatureGuard>
            </div>
          </section>

          <section className="p-6 rounded-2xl bg-white dark:bg-dp-charcoal border border-gray-200 dark:border-gray-700 shadow-sm"><h3 className="text-lg font-black flex items-center gap-2 text-dp-dark-gray dark:text-dp-light-gray mb-6"><Database size={20} className="text-dp-blue dark:text-dp-gold"/> Mantenimiento de Datos</h3><div className="grid grid-cols-1 sm:grid-cols-2 gap-4"><button onClick={handleExport} className="p-4 border-2 border-gray-100 dark:border-gray-800 rounded-2xl flex flex-col items-center gap-3 hover:border-dp-blue dark:hover:border-dp-gold hover:bg-gray-50 dark:hover:bg-white/5 transition-all group"><Download size={24} className="text-dp-blue group-hover:scale-110 transition-transform"/><span className="text-xs font-black text-dp-dark-gray dark:text-dp-light-gray uppercase tracking-widest">Exportar Base de Datos</span></button><button onClick={handleImportClick} disabled={isProcessingFile} className="p-4 border-2 border-gray-100 dark:border-gray-800 rounded-2xl flex flex-col items-center gap-3 hover:border-red-500 dark:hover:border-red-700 hover:bg-red-50 dark:hover:bg-red-900/10 transition-all group disabled:opacity-50">{isProcessingFile ? <Loader2 className="animate-spin text-red-500" size={24}/> : <Upload size={24} className="text-red-500 group-hover:scale-110 transition-transform"/><span className="text-xs font-black text-dp-dark-gray dark:text-dp-light-gray uppercase tracking-widest">Importar Backup</span></button><input type="file" ref={importInputRef} accept=".json" onChange={handleFileImport} className="hidden" /></div><button onClick={() => setIsAuditModalOpen(true)} className="w-full mt-6 py-3 text-gray-400 text-[10px] uppercase font-black tracking-[0.2em] hover:text-dp-dark-gray dark:hover:text-white transition-all text-center border-t border-gray-100 dark:border-gray-800 pt-6">Ver Registro de Auditoría Local</button></section>

        </div>

        <div className="p-6 bg-white dark:bg-dp-charcoal border-t border-gray-200 dark:border-gray-700 flex gap-4 flex-shrink-0">
            <button onClick={handleSaveAllSettings} className="flex-1 flex justify-center items-center gap-3 px-6 py-4 rounded-2xl text-lg font-black bg-green-600 text-white hover:bg-green-700 shadow-xl shadow-green-500/20 transition-all active:scale-[0.98] uppercase tracking-wider"><Save size={24} /> Guardar Configuración</button>
        </div>
      </div>
      {isAuditModalOpen && <AuditLogModal onClose={() => setIsAuditModalOpen(false)} />}
      {isUpgradeModalOpen && <UpgradeModal onClose={() => setIsUpgradeModalOpen(false)} />}
    </div>
  );
};

export default SettingsModal;
