
import React, { useState, useEffect } from 'react';
import { X, Server, ShieldCheck, Key, AlertTriangle, Database, CheckCircle, Code, Activity, Globe, MessageCircle, Clipboard, Plus, RefreshCw, UserCheck, UserX, Loader2, Trash2, Zap, Smartphone, Cpu } from 'lucide-react';
import { BUSINESS_TEMPLATES } from '../services/templates';
import * as dbService from '../services/db';
import * as settingsService from '../services/settings';
import * as cloudService from '../services/cloud';
import * as soundService from '../services/sound';
import type { BusinessType, TelemetryPacket, PlanTier } from '../types';

interface DeveloperPanelProps {
  onClose: () => void;
  onRefresh: () => void;
}

const DeveloperPanel: React.FC<DeveloperPanelProps> = ({ onClose, onRefresh }) => {
  const [accessCode, setAccessCode] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [activeTab, setActiveTab] = useState<'setup' | 'cloud' | 'issuer'>('setup');
  
  // Setup Tab State
  const [selectedType, setSelectedType] = useState<BusinessType | ''>('');
  const [licenseKeyInput, setLicenseKeyInput] = useState('');
  const [vendorWhatsApp, setVendorWhatsApp] = useState(''); 
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error' | 'neutral', msg: string } | null>(null);
  
  // Issuer Tab State
  const [issuedLicenses, setIssuedLicenses] = useState<any[]>([]);
  const [targetPlan, setTargetPlan] = useState<PlanTier>('pro');
  const [isGenerating, setIsGenerating] = useState(false);

  // Cloud Tab State
  const [telemetryData, setTelemetryData] = useState<TelemetryPacket | null>(null);
  const [cloudIdentity, setCloudIdentity] = useState<any>(null);

  const DEV_CODE = '3698'; 

  useEffect(() => {
      if(activeTab === 'cloud') {
          setTelemetryData(cloudService.generateTelemetryPacket());
          setCloudIdentity(cloudService.getIdentity());
      }
      if(activeTab === 'issuer') {
          loadServerLicenses();
      }
      setVendorWhatsApp(settingsService.getVendorWhatsApp());
  }, [activeTab]);

  const loadServerLicenses = async () => {
      const licenses = await cloudService.adminGetIssuedLicenses();
      setIssuedLicenses(licenses);
  };

  const handleLogin = () => {
      if (accessCode === DEV_CODE) {
          setIsAuthenticated(true);
          soundService.playSound('hero');
          dbService.logAction('DEV_ACCESS', 'Acceso a consola de desarrollador concedido', 'warning');
      } else {
          soundService.playSound('error');
          setFeedback({ type: 'error', msg: 'Acceso Denegado.' });
      }
  };

  const handleApplyTemplate = async () => {
      if (!selectedType || !window.confirm("CRÍTICO: Se borrarán productos y categorías para cargar la plantilla. ¿Continuar?")) {
          return;
      }

      const template = BUSINESS_TEMPLATES[selectedType as keyof typeof BUSINESS_TEMPLATES];
      if (!template) return;

      try {
          await dbService.logAction('SYSTEM_RESET', `Re-inicialización manual: Rubro ${template.name}`, 'critical');
          
          const currentProducts = dbService.getProducts();
          for (const p of currentProducts) await dbService.deleteProduct(p.id);
          for (const p of template.products) await dbService.addProduct(p);
          
          settingsService.saveLoyaltySettings(template.loyalty);
          soundService.playSound('success');
          setFeedback({ type: 'success', msg: `Plantilla "${template.name}" aplicada.` });
          onRefresh();
      } catch (e) {
          setFeedback({ type: 'error', msg: 'Error al aplicar plantilla.' });
      }
  };

  const handleUpdateLicense = async () => {
      if (!licenseKeyInput.trim()) return;
      setFeedback({ type: 'neutral', msg: 'Validando contra Nexus...' });
      
      const result = await cloudService.connectToNexus(licenseKeyInput.trim());
      
      if (result.success) {
          soundService.playSound('success');
          setFeedback({ type: 'success', msg: `Licencia Activa: ${result.message}` });
          dbService.logAction('LICENSE_UPGRADE', `Cambio de licencia a ${licenseKeyInput}`, 'warning');
      } else {
          soundService.playSound('error');
          setFeedback({ type: 'error', msg: `Nexus: ${result.message}` });
      }
      onRefresh();
  };
  
  const handleResetQuota = () => {
      localStorage.removeItem('dominion-ai-quota');
      soundService.playSound('hero');
      setFeedback({ type: 'success', msg: 'Cuotas de IA reiniciadas (1 uso gratis disponible).' });
  };

  const handleNuclearReset = () => {
      if(window.confirm("PELIGRO: Esto borrará ABSOLUTAMENTE TODO (Ventas, Productos, Clientes, Configuración). El sistema volverá al estado de fábrica. ¿Proceder?")) {
          localStorage.clear();
          indexedDB.deleteDatabase('dominion-db');
          window.location.reload();
      }
  };
  
  const handleSaveVendorContact = () => {
      if(!vendorWhatsApp.trim()) return;
      settingsService.saveVendorWhatsApp(vendorWhatsApp);
      setFeedback({ type: 'success', msg: 'Contacto de ventas actualizado.' });
      soundService.playSound('click');
  }
  
  const handleGenerateLicense = async () => {
      setIsGenerating(true);
      try {
          await cloudService.adminGenerateLicense(targetPlan);
          await loadServerLicenses();
          soundService.playSound('success');
      } catch (e) {
          alert("Error de servidor simulado.");
      }
      setIsGenerating(false);
  };

  const handleRevoke = async (key: string) => {
      if(window.confirm("¿Revocar acceso permanentemente a este Nodo?")) {
          await cloudService.adminRevokeLicense(key);
          await loadServerLicenses();
          dbService.logAction('LICENSE_REVOKED', `Licencia ${key} revocada`, 'critical');
          soundService.playSound('trash');
      }
  }

  const copyToClipboard = (text: string) => {
      navigator.clipboard.writeText(text);
      soundService.playSound('click');
      setFeedback({ type: 'success', msg: 'Clave copiada al portapapeles.' });
      setTimeout(() => setFeedback(null), 2000);
  };

  if (!isAuthenticated) {
      return (
        <div className="fixed inset-0 bg-black z-[100] flex justify-center items-center text-dp-gold font-mono backdrop-blur-md">
            <div className="w-full max-w-sm p-8 border border-dp-gold/30 bg-dp-dark rounded-2xl shadow-[0_0_50px_rgba(212,175,55,0.15)] animate-modal-in">
                <div className="flex flex-col items-center mb-6">
                    <div className="p-4 bg-dp-gold/10 rounded-full mb-4">
                        <Cpu size={32} className="text-dp-gold animate-pulse" />
                    </div>
                    <h2 className="text-xl font-black tracking-tighter uppercase">Nexus Root Access</h2>
                    <p className="text-[10px] text-gray-500 uppercase tracking-widest mt-1">Dominion POS Kernel v2.5</p>
                </div>
                <input 
                    autoFocus
                    type="password" 
                    value={accessCode} 
                    onChange={e => setAccessCode(e.target.value)} 
                    onKeyDown={e => e.key === 'Enter' && handleLogin()}
                    placeholder="ENTER ACCESS KEY"
                    className="w-full bg-black border-2 border-dp-gold/20 rounded-xl text-center text-3xl py-3 focus:border-dp-gold focus:outline-none mb-6 tracking-widest text-dp-gold shadow-inner"
                />
                <div className="flex gap-3">
                    <button onClick={onClose} className="flex-1 py-3 text-xs font-black text-gray-500 hover:text-white uppercase tracking-widest transition-colors border border-transparent hover:border-gray-800 rounded-xl">Cerrar</button>
                    <button onClick={handleLogin} className="flex-1 py-3 bg-dp-gold text-black font-black text-xs uppercase tracking-widest rounded-xl shadow-lg shadow-dp-gold/20 hover:brightness-110 active:scale-95 transition-all">Autenticar</button>
                </div>
                {feedback?.type === 'error' && <p className="text-red-500 text-[10px] mt-4 text-center font-bold uppercase tracking-widest animate-shake">{feedback.msg}</p>}
            </div>
        </div>
      );
  }

  return (
    <div className="fixed inset-0 bg-black/90 z-[100] flex justify-center items-center font-sans backdrop-blur-sm p-4">
        <div className="bg-dp-dark text-gray-200 w-full max-w-5xl rounded-2xl shadow-[0_0_80px_rgba(0,0,0,0.5)] overflow-hidden border border-gray-800 flex flex-col max-h-[90vh] animate-modal-in">
            
            <div className="bg-dp-charcoal p-5 border-b border-gray-800 flex justify-between items-center">
                <div className="flex items-center gap-6">
                    <div>
                        <h2 className="text-lg font-black flex items-center gap-2 text-dp-gold uppercase tracking-tighter">
                            <Server size={20} className="text-dp-gold"/> 
                            Dominion Core Console
                        </h2>
                        <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">Environment: Production // Mode: Root</p>
                    </div>
                    <div className="flex bg-black/40 rounded-xl p-1 border border-gray-700">
                        <button onClick={() => setActiveTab('setup')} className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'setup' ? 'bg-dp-gold text-black shadow-lg shadow-dp-gold/20' : 'text-gray-500 hover:text-gray-300'}`}>Kernel</button>
                        <button onClick={() => setActiveTab('issuer')} className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'issuer' ? 'bg-dp-gold text-black shadow-lg shadow-dp-gold/20' : 'text-gray-500 hover:text-gray-300'}`}>Issuer</button>
                        <button onClick={() => setActiveTab('cloud')} className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'cloud' ? 'bg-dp-gold text-black shadow-lg shadow-dp-gold/20' : 'text-gray-500 hover:text-gray-300'}`}>Nexus</button>
                    </div>
                </div>
                <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors"><X className="text-gray-500 hover:text-white" /></button>
            </div>
            
            <div className="p-8 overflow-y-auto flex-1 custom-scrollbar">
                
                {activeTab === 'setup' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-modal-in">
                        <div className="p-6 border border-gray-800 rounded-2xl bg-dp-charcoal/30 space-y-6">
                            <div>
                                <h3 className="text-white font-black text-xs uppercase tracking-widest mb-4 flex items-center gap-2"><Database size={16} className="text-blue-400"/> Inyección de Esquemas</h3>
                                <div className="flex flex-col gap-3">
                                    <select 
                                        value={selectedType} 
                                        onChange={e => setSelectedType(e.target.value as BusinessType)}
                                        className="w-full bg-black border border-gray-700 rounded-xl px-4 py-3 text-sm text-white focus:ring-1 focus:ring-dp-gold outline-none appearance-none"
                                    >
                                        <option value="">-- Seleccionar Rubro --</option>
                                        {Object.entries(BUSINESS_TEMPLATES).map(([key, template]) => (
                                            <option key={key} value={key}>{template.name}</option>
                                        ))}
                                    </select>
                                    <button onClick={handleApplyTemplate} disabled={!selectedType} className="w-full bg-blue-600 hover:bg-blue-500 text-white py-3 rounded-xl font-black text-xs uppercase tracking-[0.2em] disabled:opacity-30 transition-all shadow-lg shadow-blue-900/20">Cargar Plantilla</button>
                                </div>
                            </div>

                            <div className="pt-6 border-t border-gray-800">
                                <h3 className="text-white font-black text-xs uppercase tracking-widest mb-4 flex items-center gap-2"><Zap size={16} className="text-yellow-400"/> Pruebas IA</h3>
                                <button onClick={handleResetQuota} className="w-full bg-gray-800 hover:bg-gray-700 text-dp-gold py-3 rounded-xl font-black text-xs uppercase tracking-[0.2em] transition-all border border-dp-gold/20">Reiniciar Cuotas IA</button>
                            </div>
                        </div>

                        <div className="p-6 border border-gray-800 rounded-2xl bg-dp-charcoal/30 space-y-6">
                            <div>
                                <h3 className="text-white font-black text-xs uppercase tracking-widest mb-4 flex items-center gap-2"><ShieldCheck size={16} className="text-green-400"/> Overdrive de Licencia</h3>
                                <div className="flex gap-2">
                                    <input 
                                        type="text"
                                        value={licenseKeyInput}
                                        onChange={e => setLicenseKeyInput(e.target.value)}
                                        className="flex-1 bg-black border border-gray-700 rounded-xl px-4 py-3 text-xs font-mono text-green-400 outline-none focus:border-green-500"
                                        placeholder="FORCE NEXUS KEY..."
                                    />
                                    <button onClick={handleUpdateLicense} className="bg-green-700 hover:bg-green-600 text-white px-4 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all">Forzar</button>
                                </div>
                            </div>

                            <div className="pt-6 border-t border-gray-800">
                                <h3 className="text-white font-black text-xs uppercase tracking-widest mb-4 flex items-center gap-2"><MessageCircle size={16} className="text-purple-400"/> Vendor Config</h3>
                                <div className="flex gap-2">
                                    <input 
                                        type="text" 
                                        value={vendorWhatsApp} 
                                        onChange={e => setVendorWhatsApp(e.target.value)} 
                                        placeholder="WhatsApp Soporte..."
                                        className="flex-1 bg-black border border-gray-700 rounded-xl px-4 py-3 text-xs outline-none focus:border-purple-500"
                                    />
                                    <button onClick={handleSaveVendorContact} className="bg-purple-700 hover:bg-purple-600 text-white px-4 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all">Set</button>
                                </div>
                            </div>

                            <div className="pt-6 border-t border-gray-800">
                                <h3 className="text-red-500 font-black text-xs uppercase tracking-widest mb-4 flex items-center gap-2"><Trash2 size={16} /> Nuclear Option</h3>
                                <button onClick={handleNuclearReset} className="w-full bg-red-950/30 hover:bg-red-900/50 text-red-500 py-3 rounded-xl font-black text-[10px] uppercase tracking-[0.3em] transition-all border border-red-900/50">Factory Reset System</button>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'issuer' && (
                    <div className="space-y-6 animate-fade-in-out">
                        <div className="p-6 bg-black/40 border border-dp-gold/20 rounded-2xl">
                            <div className="flex justify-between items-start mb-6">
                                <div>
                                    <h3 className="text-dp-gold font-black text-xs uppercase tracking-widest flex items-center gap-2"><Key size={20}/> Servidor de Emisión</h3>
                                    <p className="text-[11px] text-gray-500 font-bold uppercase mt-1">Generación de tokens criptográficos para Dominion Nexus.</p>
                                </div>
                                <span className="text-[9px] bg-dp-gold/10 text-dp-gold border border-dp-gold/40 px-3 py-1 rounded-full font-black uppercase tracking-widest shadow-lg shadow-dp-gold/5">Authority Level: 10</span>
                            </div>
                            
                            <div className="grid grid-cols-1 gap-6 bg-dp-dark p-6 rounded-2xl border border-gray-800">
                                <div>
                                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest block mb-3">Seleccionar Plan para Emisión</label>
                                    <div className="flex flex-wrap gap-2">
                                        <button onClick={() => setTargetPlan('starter')} className={`flex-1 min-w-[120px] py-3 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all ${targetPlan === 'starter' ? 'bg-green-700 border-green-500 text-white shadow-xl' : 'bg-dp-charcoal border-gray-700 text-gray-500 hover:text-gray-300'}`}>Base (1 User)</button>
                                        <button onClick={() => setTargetPlan('pro')} className={`flex-1 min-w-[120px] py-3 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all ${targetPlan === 'pro' ? 'bg-blue-600 border-blue-500 text-white shadow-xl' : 'bg-dp-charcoal border-gray-700 text-gray-500 hover:text-gray-300'}`}>Pro (3 Users)</button>
                                        <button onClick={() => setTargetPlan('enterprise')} className={`flex-1 min-w-[120px] py-3 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all ${targetPlan === 'enterprise' ? 'bg-dp-gold border-dp-gold text-black shadow-xl' : 'bg-dp-charcoal border-gray-700 text-gray-500 hover:text-gray-300'}`}>Empresa</button>
                                    </div>
                                </div>
                                <div className="flex items-end">
                                    <button onClick={handleGenerateLicense} disabled={isGenerating} className="w-full bg-green-600 hover:bg-green-500 text-white py-3 rounded-xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-3 h-12 shadow-xl shadow-green-900/20 disabled:opacity-50 transition-all active:scale-95">
                                        {isGenerating ? <Loader2 className="animate-spin" size={18}/> : <Plus size={18}/>} Generar Nueva Licencia
                                    </button>
                                </div>
                            </div>
                        </div>

                        <div className="border border-gray-800 rounded-2xl overflow-hidden flex flex-col h-80 bg-dp-charcoal/10 shadow-inner">
                            <div className="bg-dp-charcoal/50 p-4 border-b border-gray-800 flex justify-between items-center">
                                <h4 className="font-black text-[10px] uppercase tracking-widest text-gray-400">Registro Global de Licencias</h4>
                                <button onClick={loadServerLicenses} className="p-1.5 hover:bg-white/10 rounded-lg transition-colors"><RefreshCw size={14} className="text-dp-gold"/></button>
                            </div>
                            <div className="overflow-y-auto flex-1">
                                <table className="w-full text-left">
                                    <thead className="text-[9px] font-black text-gray-500 uppercase bg-black/40 sticky top-0">
                                        <tr>
                                            <th className="px-6 py-3">Key (Nexus ID)</th>
                                            <th className="px-6 py-3">Plan</th>
                                            <th className="px-6 py-3">Nodo Vinculado</th>
                                            <th className="px-6 py-3 text-right">Acciones</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-800/50">
                                        {issuedLicenses.map((license, idx) => (
                                            <tr key={idx} className={`hover:bg-white/5 transition-colors ${license.status === 'revoked' ? 'opacity-30' : ''}`}>
                                                <td className="px-6 py-3 font-mono text-green-400 text-[11px] font-bold tracking-widest">{license.key}</td>
                                                <td className="px-6 py-3">
                                                    <span className={`text-[9px] font-black px-2 py-0.5 rounded-full ${
                                                        license.plan === 'starter' ? 'bg-green-900/30 text-green-400' : 
                                                        license.plan === 'pro' ? 'bg-blue-900/30 text-blue-400' : 
                                                        'bg-dp-gold/10 text-dp-gold'
                                                    }`}>{license.plan.toUpperCase()}</span>
                                                </td>
                                                <td className="px-6 py-3 text-[10px] font-mono text-gray-500">
                                                    {license.boundNodeIds && license.boundNodeIds.length > 0 ? license.boundNodeIds[0].substring(0,16) + '...' : 'Esperando Vinculación...'}
                                                </td>
                                                <td className="px-6 py-3 text-right flex justify-end gap-3">
                                                    <button onClick={() => copyToClipboard(license.key)} className="p-1.5 bg-dp-charcoal hover:bg-gray-700 rounded-lg text-gray-400 transition-all shadow-sm" title="Copiar"><Clipboard size={14}/></button>
                                                    {license.status !== 'revoked' && (
                                                        <button onClick={() => handleRevoke(license.key)} className="p-1.5 bg-red-900/20 hover:bg-red-900/40 rounded-lg text-red-500 transition-all border border-red-900/30" title="Revocar"><UserX size={14}/></button>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                        {issuedLicenses.length === 0 && (
                                            <tr><td colSpan={4} className="p-20 text-center text-gray-600 font-black uppercase text-[10px] tracking-widest">Sin datos en el servidor Nexus</td></tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'cloud' && telemetryData && (
                    <div className="space-y-6 animate-fade-in-out">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                            <div className="p-6 bg-black/40 rounded-2xl border border-gray-800">
                                <h3 className="text-blue-400 text-[10px] font-black uppercase tracking-widest mb-4 flex items-center gap-2"><Smartphone size={14}/> Client Identity</h3>
                                <pre className="text-[11px] text-green-400 font-mono whitespace-pre-wrap bg-dp-dark p-4 rounded-xl shadow-inner border border-gray-800">{JSON.stringify(cloudIdentity, null, 2)}</pre>
                            </div>
                            <div className="p-6 bg-black/40 rounded-2xl border border-gray-800">
                                <h3 className="text-dp-gold text-[10px] font-black uppercase tracking-widest mb-4 flex items-center gap-2"><Activity size={14}/> Node Metrics</h3>
                                <pre className="text-[11px] text-yellow-400 font-mono whitespace-pre-wrap bg-dp-dark p-4 rounded-xl shadow-inner border border-gray-800">{JSON.stringify(telemetryData.metrics, null, 2)}</pre>
                            </div>
                        </div>
                        <div className="p-6 bg-black/40 rounded-2xl border border-gray-800 flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-green-900/20 rounded-full border border-green-500/30">
                                    <Globe size={24} className="text-green-500" />
                                </div>
                                <div>
                                    <p className="text-sm font-black text-white uppercase tracking-tighter">Nexus Connectivity</p>
                                    <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">Heartbeat: Active // Latency: 22ms</p>
                                </div>
                            </div>
                            <span className="px-4 py-1.5 bg-green-500 text-black text-[10px] font-black rounded-full shadow-lg shadow-green-500/20">ESTABLE</span>
                        </div>
                    </div>
                )}

                {feedback && (
                    <div className={`mt-8 p-4 rounded-xl text-xs font-black text-center flex items-center justify-center gap-3 animate-modal-in ${
                        feedback.type === 'success' ? 'bg-green-900/30 text-green-400 border border-green-700/50 shadow-lg shadow-green-900/10' : 
                        feedback.type === 'error' ? 'bg-red-900/30 text-red-400 border border-red-700/50 animate-shake' : 
                        'bg-blue-900/30 text-blue-400 border border-blue-700/50'
                    }`}>
                        {feedback.type === 'success' ? <CheckCircle size={16}/> : feedback.type === 'error' ? <AlertTriangle size={16}/> : <RefreshCw size={16} className="animate-spin"/>}
                        <span className="uppercase tracking-widest">{feedback.msg}</span>
                    </div>
                )}

            </div>
            <div className="bg-dp-charcoal/50 p-4 border-t border-gray-800 text-center">
                 <p className="text-[9px] font-black text-gray-600 uppercase tracking-[0.5em]">Dominion POS // Nexus Kernel System // Unauthorized access is prohibited</p>
            </div>
        </div>
    </div>
  );
};

export default DeveloperPanel;
