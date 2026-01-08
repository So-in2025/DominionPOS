
import React, { useRef, useState, useEffect } from 'react';
import { X, Download, Upload, AlertTriangle, Award, CheckCircle, Users, Trash2, Pencil, Plus, ShieldAlert, Store, Image as ImageIcon, BrainCircuit, Eye, EyeOff, CloudLightning, Signal, Copy, Lock } from 'lucide-react';
import * as dbService from '../services/db';
import * as settingsService from '../services/settings';
import * as cloudService from '../services/cloud'; // NEXUS
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
  
  // Nexus Cloud State
  const [nexusKey, setNexusKey] = useState('');
  const [currentIdentity, setCurrentIdentity] = useState<CloudNodeIdentity | null>(null);
  const [nexusStatus, setNexusStatus] = useState<{connecting: boolean, msg: string, type: 'success' | 'error' | 'neutral'}>({connecting: false, msg: '', type: 'neutral'});
  
  // AI Key State
  const [apiKey, setApiKey] = useState('');
  const [showApiKey, setShowApiKey] = useState(false);
  
  // User Management State
  const [users, setUsers] = useState<User[]>([]);
  const [isEditingUser, setIsEditingUser] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [userName, setUserName] = useState('');
  const [userPin, setUserPin] = useState('');
  const [userRole, setUserRole] = useState<'admin' | 'cashier'>('cashier');
  const [userError, setUserError] = useState('');

  useEffect(() => {
      setUsers(dbService.getUsers());
      const identity = cloudService.getIdentity();
      setCurrentIdentity(identity);
      
      // Si la clave es la gratuita autogenerada, no la mostramos en el input para dejarlo limpio para escribir
      if (identity.licenseKey && !identity.licenseKey.startsWith('FREE-')) {
          setNexusKey(identity.licenseKey);
      }

      // Cargar API Key existente
      const currentKey = settingsService.getGeminiApiKey();
      if (currentKey) setApiKey(currentKey);
  }, []);

  const handleConnectNexus = async () => {
      if(!nexusKey.trim()) return;
      setNexusStatus({ connecting: true, msg: 'Validando licencia...', type: 'neutral' });
      
      const result = await cloudService.connectToNexus(nexusKey);
      
      setCurrentIdentity(cloudService.getIdentity()); // Update UI
      setNexusStatus({ 
          connecting: false, 
          msg: result.message,
          type: result.success ? 'success' : 'error'
      });
  };

  const copyNodeId = () => {
      if(currentIdentity) {
          navigator.clipboard.writeText(currentIdentity.licenseKey);
          setNexusStatus({ connecting: false, msg: 'ID copiado al portapapeles', type: 'success' });
          setTimeout(() => setNexusStatus({ connecting: false, msg: '', type: 'neutral' }), 2000);
      }
  }

  // ... (Export, Import, Logo logic remains same - omitting for brevity, kept existing handlers)
  const handleExport = async () => {
    const jsonData = await dbService.exportData();
    const blob = new Blob([jsonData], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    a.download = `dominion-backup-${timestamp}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleImportClick = () => { fileInputRef.current?.click(); };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (e) => {
      const content = e.target?.result;
      if (typeof content === 'string') {
        if (window.confirm("¿Reemplazar TODOS los datos con este backup?")) {
          const success = await dbService.importData(content);
          if (success) onImportSuccess();
          else alert("Error en archivo de respaldo.");
        }
      }
    };
    reader.readAsText(file);
    event.target.value = '';
  };

  const handleLogoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) return;
      if (file.size > 500000) { alert("Máx 500KB"); return; }
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

  const handleLoyaltySettingChange = (field: keyof LoyaltySettings, value: string) => {
      const numValue = parseFloat(value);
      if (!isNaN(numValue) && numValue >= 0) setLoyaltySettings(prev => ({ ...prev, [field]: numValue }));
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

  // User Handlers
  const handleAddUser = () => { setIsEditingUser(true); setEditingUser(null); setUserName(''); setUserPin(''); setUserRole('cashier'); setUserError(''); };
  const handleEditUser = (user: User) => { setIsEditingUser(true); setEditingUser(user); setUserName(user.name); setUserPin(user.pin); setUserRole(user.role); setUserError(''); };
  const handleCancelUserEdit = () => { setIsEditingUser(false); setEditingUser(null); };
  const handleSaveUser = async () => {
      if (!userName.trim() || !userPin.trim()) { setUserError("Datos incompletos"); return; }
      if (userPin.length < 4) { setUserError("PIN debe tener al menos 4 dígitos"); return; }
      if (editingUser) await dbService.updateUser({ ...editingUser, name: userName, pin: userPin, role: userRole });
      else await dbService.addUser({ name: userName, pin: userPin, role: userRole });
      setUsers(dbService.getUsers()); setIsEditingUser(false); setEditingUser(null);
  };
  const handleDeleteUser = async (userId: string) => { if(window.confirm("¿Eliminar?")) { try { await dbService.deleteUser(userId); setUsers(dbService.getUsers()); } catch (e: any) { alert(e.message); } } };

  const currentPlan = cloudService.getPlan();
  const isFreeTier = currentPlan === 'starter';
  
  // USER LIMIT LOGIC
  const getUserLimit = (plan: PlanTier) => {
      if (plan === 'starter') return 1;
      if (plan === 'pro') return 5;
      return 9999;
  };
  
  const userLimit = getUserLimit(currentPlan);
  const canAddUser = users.length < userLimit;

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex justify-center items-center" aria-modal="true" role="dialog" onClick={onClose}>
      <div className="bg-dp-light dark:bg-dp-charcoal rounded-lg shadow-2xl p-6 w-full max-w-2xl m-4 animate-modal-in overflow-y-auto max-h-[90vh]" onClick={(e) => e.stopPropagation()}>
        
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-dp-dark-gray dark:text-dp-light-gray">Panel de Control</h2>
            <button onClick={onClose} className="p-2 rounded-full hover:bg-dp-soft-gray dark:hover:bg-gray-700"><X size={24} /></button>
        </div>

        <div className="space-y-6">
          
          {/* NEXUS CONNECTION CARD */}
          <div className="p-5 border rounded-xl bg-gradient-to-r from-gray-900 to-gray-800 text-white shadow-lg overflow-hidden relative">
             {/* Background decorative elements */}
             <div className="absolute top-0 right-0 p-2 opacity-10"><CloudLightning size={100} /></div>

             <div className="flex justify-between items-start mb-4 relative z-10">
                 <div>
                    <h3 className="font-bold text-lg flex items-center gap-2"><CloudLightning className="text-yellow-400"/> Dominion Nexus</h3>
                    <p className="text-sm text-gray-400">Estado de conexión y licenciamiento.</p>
                 </div>
                 <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-xs font-mono border font-bold
                    ${isFreeTier ? 'bg-gray-700 border-gray-500 text-gray-300' : 'bg-green-900/50 border-green-500 text-green-400'}`}>
                    <Signal size={12}/>
                    {currentPlan.toUpperCase()} TIER
                 </div>
             </div>
             
             {/* Free Tier Info Display */}
             {isFreeTier && currentIdentity?.licenseKey && (
                 <div className="mb-4 bg-black/30 p-3 rounded-lg border border-gray-700 flex justify-between items-center">
                     <div>
                         <p className="text-xs text-gray-500 uppercase font-bold">Tu Identidad Gratuita (Support ID)</p>
                         <p className="font-mono text-yellow-500 text-sm tracking-wide">{currentIdentity.licenseKey}</p>
                     </div>
                     <button onClick={copyNodeId} className="p-2 hover:bg-white/10 rounded text-gray-400 hover:text-white" title="Copiar ID"><Copy size={16}/></button>
                 </div>
             )}

             <label className="text-xs font-bold text-gray-400 uppercase mb-1 block">Activar Licencia Pro / Enterprise</label>
             <div className="flex gap-2 relative z-10">
                 <input 
                    type="text" 
                    value={nexusKey} 
                    onChange={e => setNexusKey(e.target.value)} 
                    placeholder="Ej: PRO-XXXX-XXXX"
                    className="flex-1 bg-black/40 border border-gray-600 rounded px-3 py-2 text-white placeholder-gray-500 focus:border-yellow-500 focus:outline-none font-mono text-sm"
                 />
                 <button 
                    onClick={handleConnectNexus} 
                    disabled={nexusStatus.connecting}
                    className="bg-yellow-500 text-black font-bold px-4 py-2 rounded hover:bg-yellow-400 disabled:opacity-50 transition-colors text-sm"
                 >
                    {nexusStatus.connecting ? 'Verificando...' : 'Activar'}
                 </button>
             </div>
             {nexusStatus.msg && (
                 <p className={`text-xs mt-2 ${nexusStatus.type === 'error' ? 'text-red-400' : nexusStatus.type === 'success' ? 'text-green-400' : 'text-gray-400'}`}>
                     {nexusStatus.msg}
                 </p>
             )}
          </div>

          {/* Business Settings (Logo Protected in Free Tier) */}
          <div className="p-4 border rounded-lg dark:border-gray-700">
            <h3 className="text-lg font-semibold mb-2 flex items-center gap-2"><Store size={20} /> Datos de la Empresa</h3>
            
            <FeatureGuard feature="custom_branding" showLock={true}>
                <div className="mb-4 p-3 bg-dp-soft-gray dark:bg-black/20 rounded-lg flex items-center gap-4">
                    <div className="w-16 h-16 rounded-md bg-white dark:bg-gray-700 flex items-center justify-center border border-gray-300 dark:border-gray-600 overflow-hidden">
                        {businessSettings.logoUrl ? <img src={businessSettings.logoUrl} alt="Logo" className="w-full h-full object-contain" /> : <ImageIcon className="text-gray-400" />}
                    </div>
                    <div className="flex-1">
                        <p className="text-sm font-semibold mb-1">Logotipo (Requiere Plan Pro)</p>
                        <div className="flex gap-2">
                            <button onClick={() => logoInputRef.current?.click()} className="px-3 py-1 text-xs bg-dp-blue text-white rounded hover:bg-blue-600 dark:bg-dp-gold dark:text-dp-dark">Subir Imagen</button>
                            {businessSettings.logoUrl && <button onClick={handleRemoveLogo} className="px-3 py-1 text-xs bg-red-100 text-red-700 rounded">Eliminar</button>}
                        </div>
                        <input type="file" ref={logoInputRef} accept="image/*" onChange={handleLogoUpload} className="hidden" />
                    </div>
                </div>
            </FeatureGuard>

            <div className="space-y-4 mt-4">
                {/* Standard Inputs */}
                <div><label className="block text-sm font-medium">Nombre del Negocio</label><input type="text" value={businessSettings.storeName} onChange={e => handleBusinessSettingChange('storeName', e.target.value)} className="mt-1 w-full px-3 py-2 border rounded bg-transparent dark:border-gray-600"/></div>
                <div><label className="block text-sm font-medium">Dirección</label><input type="text" value={businessSettings.address} onChange={e => handleBusinessSettingChange('address', e.target.value)} className="mt-1 w-full px-3 py-2 border rounded bg-transparent dark:border-gray-600"/></div>
                <div><label className="block text-sm font-medium">Teléfono</label><input type="text" value={businessSettings.phone} onChange={e => handleBusinessSettingChange('phone', e.target.value)} className="mt-1 w-full px-3 py-2 border rounded bg-transparent dark:border-gray-600"/></div>
                <div><label className="block text-sm font-medium">Mensaje Pie Recibo</label><input type="text" value={businessSettings.receiptFooter} onChange={e => handleBusinessSettingChange('receiptFooter', e.target.value)} className="mt-1 w-full px-3 py-2 border rounded bg-transparent dark:border-gray-600"/></div>
            </div>
          </div>

          {/* AI Settings */}
          <FeatureGuard feature="ai_scanner" showLock={true}>
            <div className="p-4 border rounded-lg border-blue-500/30 bg-blue-50/50 dark:bg-blue-900/10">
                <h3 className="text-lg font-semibold mb-2 flex items-center gap-2 text-dp-blue dark:text-dp-gold"><BrainCircuit size={20} /> Configuración IA (Pro)</h3>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Google Gemini API Key</label>
                <div className="relative mt-1">
                    <input type={showApiKey ? "text" : "password"} value={apiKey} onChange={e => setApiKey(e.target.value)} placeholder="AIzaSy..." className="w-full px-3 py-2 pr-10 border rounded bg-white dark:bg-gray-800 dark:border-gray-600"/>
                    <button type="button" onClick={() => setShowApiKey(!showApiKey)} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400">{showApiKey ? <EyeOff size={18} /> : <Eye size={18} />}</button>
                </div>
            </div>
          </FeatureGuard>

          {/* User Management */}
          <div className="p-4 border rounded-lg dark:border-gray-700">
             <div className="flex justify-between items-center mb-4">
                 <h3 className="text-lg font-semibold flex items-center gap-2"><Users size={20} /> Gestión de Equipo</h3>
                 <span className={`text-xs font-bold px-2 py-1 rounded-full ${canAddUser ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                     {users.length} / {userLimit === 9999 ? '∞' : userLimit} Usuarios
                 </span>
             </div>
             
             {isEditingUser ? (
                <div className="bg-dp-soft-gray dark:bg-black/20 p-4 rounded-md">
                    <h4 className="font-bold mb-3">{editingUser ? 'Editar' : 'Nuevo'}</h4>
                    {userError && <p className="text-red-500 text-sm mb-2">{userError}</p>}
                    <input type="text" placeholder="Nombre" value={userName} onChange={e => setUserName(e.target.value)} className="w-full p-2 mb-2 rounded border bg-transparent dark:border-gray-600" />
                    <input type="text" placeholder="PIN" value={userPin} onChange={e => setUserPin(e.target.value)} className="w-full p-2 mb-2 rounded border bg-transparent dark:border-gray-600" />
                    <select value={userRole} onChange={e => setUserRole(e.target.value as any)} className="w-full p-2 mb-4 rounded border bg-transparent dark:border-gray-600"><option value="cashier">Cajero</option><option value="admin">Admin</option></select>
                    <div className="flex gap-2"><button onClick={handleCancelUserEdit} className="px-3 py-1 bg-gray-300 rounded text-black">Cancelar</button><button onClick={handleSaveUser} className="px-3 py-1 bg-blue-600 text-white rounded">Guardar</button></div>
                </div>
             ) : (
                <>
                    <ul className="space-y-2 mb-4">
                        {users.map(u => (
                            <li key={u.id} className="flex justify-between items-center p-2 rounded bg-gray-50 dark:bg-gray-800">
                                <span>{u.name} <span className="text-xs text-gray-500">({u.role})</span></span>
                                <div className="flex gap-2"><button onClick={() => handleEditUser(u)}><Pencil size={16}/></button><button onClick={() => handleDeleteUser(u.id)} className="text-red-500"><Trash2 size={16}/></button></div>
                            </li>
                        ))}
                    </ul>
                    {canAddUser ? (
                        <button onClick={handleAddUser} className="w-full p-2 border-2 border-dashed rounded flex justify-center items-center gap-2 hover:bg-gray-50 dark:hover:bg-gray-800"><Plus size={18}/> Añadir Usuario</button>
                    ) : (
                        <div className="flex items-center justify-between p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded border border-yellow-200 dark:border-yellow-800">
                            <span className="text-xs text-yellow-800 dark:text-yellow-200 font-semibold flex items-center gap-1"><Lock size={12}/> Límite de usuarios alcanzado ({userLimit}).</span>
                            <span className="text-xs font-bold uppercase tracking-wider text-yellow-600 dark:text-yellow-400">Requiere Upgrade</span>
                        </div>
                    )}
                </>
             )}
          </div>

          <button onClick={handleSaveAllSettings} className="w-full flex justify-center items-center gap-2 px-4 py-3 rounded-lg text-lg font-bold bg-green-600 text-white hover:bg-green-700 shadow-lg"><CheckCircle size={20} /> Guardar Configuración</button>

          {/* Data Management */}
          <div className="grid grid-cols-2 gap-4">
              <div className="p-4 border rounded-lg dark:border-gray-700">
                <h3 className="font-semibold mb-2 flex gap-2"><Download size={18}/> Exportar</h3>
                <button onClick={handleExport} className="w-full px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm">Crear Backup</button>
              </div>
              <div className="p-4 border rounded-lg dark:border-gray-700 border-red-500/20">
                <h3 className="font-semibold mb-2 flex gap-2 text-red-500"><Upload size={18}/> Importar</h3>
                <button onClick={handleImportClick} className="w-full px-3 py-2 bg-red-600 text-white rounded hover:bg-red-700 text-sm">Restaurar</button>
                <input type="file" ref={fileInputRef} accept=".json" onChange={handleFileChange} className="hidden" />
              </div>
          </div>
          
          <button onClick={() => setIsAuditModalOpen(true)} className="w-full py-2 text-gray-500 text-sm hover:underline">Ver Registro de Auditoría</button>

        </div>
      </div>
      {isAuditModalOpen && <AuditLogModal onClose={() => setIsAuditModalOpen(false)} />}
    </div>
  );
};

export default SettingsModal;
