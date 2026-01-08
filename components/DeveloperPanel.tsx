
import React, { useState, useEffect } from 'react';
import { X, Server, ShieldCheck, Key, AlertTriangle, Database, CheckCircle, Code, Activity, Globe, MessageCircle, Clipboard, Plus, RefreshCw, UserCheck, UserX, Loader2 } from 'lucide-react';
import { BUSINESS_TEMPLATES } from '../services/templates';
import * as dbService from '../services/db';
import * as settingsService from '../services/settings';
import * as cloudService from '../services/cloud';
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
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error', msg: string } | null>(null);
  
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
          dbService.logAction('DEV_ACCESS', 'Acceso a consola de desarrollador concedido', 'warning');
      } else {
          setFeedback({ type: 'error', msg: 'Acceso Denegado.' });
      }
  };

  const handleApplyTemplate = async () => {
      if (!selectedType || !window.confirm("CRÍTICO: Se borrarán todos los datos. ¿Está 100% seguro?")) {
          return;
      }

      const template = BUSINESS_TEMPLATES[selectedType as keyof typeof BUSINESS_TEMPLATES];
      if (!template) return;

      try {
          await dbService.logAction('SYSTEM_RESET', `Re-inicialización manual: Rubro ${template.name}`, 'critical');
          
          const currentProducts = dbService.getProducts();
          for (const p of currentProducts) {
              await dbService.deleteProduct(p.id);
          }
          for (const p of template.products) {
              await dbService.addProduct(p); 
          }
          settingsService.saveLoyaltySettings(template.loyalty);
          setFeedback({ type: 'success', msg: `Plantilla aplicada exitosamente.` });
          onRefresh();
      } catch (e) {
          setFeedback({ type: 'error', msg: 'Fallo sistémico al aplicar plantilla.' });
      }
  };

  const handleUpdateLicense = async () => {
      if (!licenseKeyInput.trim()) return;
      setFeedback({ type: 'success', msg: 'Conectando...' });
      
      const result = await cloudService.connectToNexus(licenseKeyInput.trim());
      
      if (result.success) {
          setFeedback({ type: 'success', msg: `Licencia Activa: ${result.message}` });
          dbService.logAction('LICENSE_UPGRADE', `Cambio de licencia a ${licenseKeyInput}`, 'warning');
      } else {
          setFeedback({ type: 'error', msg: `Fallo: ${result.message}` });
      }
      onRefresh();
  };
  
  const handleSaveVendorContact = () => {
      if(!vendorWhatsApp.trim()) return;
      settingsService.saveVendorWhatsApp(vendorWhatsApp);
      setFeedback({ type: 'success', msg: 'Contacto de ventas actualizado.' });
  }
  
  const handleGenerateLicense = async () => {
      setIsGenerating(true);
      try {
          await cloudService.adminGenerateLicense(targetPlan);
          await loadServerLicenses();
      } catch (e) {
          alert("Error de servidor simulado.");
      }
      setIsGenerating(false);
  };

  const handleRevoke = async (key: string) => {
      if(window.confirm("¿Revocar acceso permanentemente?")) {
          await cloudService.adminRevokeLicense(key);
          await loadServerLicenses();
          dbService.logAction('LICENSE_REVOKED', `Licencia ${key} revocada desde consola`, 'critical');
      }
  }

  const copyToClipboard = (text: string) => {
      navigator.clipboard.writeText(text);
      setFeedback({ type: 'success', msg: 'Copiado.' });
      setTimeout(() => setFeedback(null), 2000);
  };

  if (!isAuthenticated) {
      return (
        <div className="fixed inset-0 bg-black z-[100] flex justify-center items-center text-green-500 font-mono">
            <div className="w-full max-w-sm p-8 border border-green-800 bg-black rounded shadow-[0_0_20px_rgba(0,255,0,0.2)]">
                <h2 className="text-xl mb-4 flex items-center gap-2"><Code /> ROOT_ACCESS</h2>
                <input 
                    type="password" 
                    value={accessCode} 
                    onChange={e => setAccessCode(e.target.value)} 
                    placeholder="ENTER CODE"
                    className="w-full bg-black border-b border-green-700 text-center text-2xl py-2 focus:outline-none mb-4 tracking-widest text-green-500"
                />
                <div className="flex justify-between">
                    <button onClick={onClose} className="text-xs text-gray-500 hover:text-white">[SALIR]</button>
                    <button onClick={handleLogin} className="text-xs border border-green-700 px-4 py-2 hover:bg-green-900">[INGRESAR]</button>
                </div>
                {feedback && <p className="text-red-500 text-xs mt-4 text-center">{feedback.msg}</p>}
            </div>
        </div>
      );
  }

  return (
    <div className="fixed inset-0 bg-gray-900 z-[100] flex justify-center items-center font-sans">
        <div className="bg-gray-800 text-gray-200 w-full max-w-4xl rounded-lg shadow-2xl overflow-hidden border border-gray-700 flex flex-col max-h-[90vh]">
            
            <div className="bg-gray-900 p-4 border-b border-gray-700 flex justify-between items-center">
                <div className="flex items-center gap-4">
                    <h2 className="text-lg font-bold flex items-center gap-2 text-purple-400"><Server size={20}/> Dominion Core Dev</h2>
                    <div className="flex bg-gray-800 rounded p-1">
                        <button onClick={() => setActiveTab('setup')} className={`px-3 py-1 rounded text-xs font-bold ${activeTab === 'setup' ? 'bg-purple-600 text-white' : 'text-gray-400 hover:text-white'}`}>Setup</button>
                        <button onClick={() => setActiveTab('issuer')} className={`px-3 py-1 rounded text-xs font-bold ${activeTab === 'issuer' ? 'bg-yellow-600 text-black' : 'text-gray-400 hover:text-white'}`}>Issuer</button>
                        <button onClick={() => setActiveTab('cloud')} className={`px-3 py-1 rounded text-xs font-bold ${activeTab === 'cloud' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'}`}>Nexus</button>
                    </div>
                </div>
                <button onClick={onClose}><X className="text-gray-500 hover:text-white" /></button>
            </div>
            
            <div className="p-6 overflow-y-auto flex-1">
                
                {activeTab === 'setup' && (
                    <div className="space-y-8 animate-modal-in">
                        <div className="p-4 border border-gray-600 rounded bg-gray-800/50">
                            <h3 className="text-white font-bold mb-2 flex items-center gap-2"><Database size={18}/> Inyección de Datos</h3>
                            <div className="flex gap-2 mb-4">
                                <select 
                                    value={selectedType} 
                                    onChange={e => setSelectedType(e.target.value as BusinessType)}
                                    className="flex-1 bg-gray-900 border border-gray-600 rounded px-3 py-2 text-white focus:ring-1 focus:ring-purple-500 outline-none"
                                >
                                    <option value="">-- Seleccionar --</option>
                                    <option value="kiosco">Kiosco</option>
                                    <option value="cafe">Cafetería</option>
                                    <option value="ferreteria">Ferretería</option>
                                    <option value="ropa">Ropa</option>
                                </select>
                                <button onClick={handleApplyTemplate} disabled={!selectedType} className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded font-bold text-sm disabled:opacity-50">RESET & LOAD</button>
                            </div>
                        </div>

                        <div className="p-4 border border-blue-900/50 rounded bg-blue-900/10">
                            <h3 className="text-blue-300 font-bold mb-2 flex items-center gap-2"><ShieldCheck size={18}/> Activar Licencia</h3>
                            <div className="mb-4">
                                <div className="flex gap-2">
                                    <input 
                                        type="text"
                                        value={licenseKeyInput}
                                        onChange={e => setLicenseKeyInput(e.target.value)}
                                        className="flex-1 bg-gray-900 border border-gray-600 rounded px-3 py-2 text-sm font-mono text-green-400 outline-none"
                                        placeholder="Clave Nexus..."
                                    />
                                    <button onClick={handleUpdateLicense} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded font-bold text-sm flex items-center gap-2"><Key size={16} /> FORZAR</button>
                                </div>
                            </div>
                        </div>

                        <div className="p-4 border border-green-900/50 rounded bg-green-900/10">
                            <h3 className="text-green-400 font-bold mb-2 flex items-center gap-2"><MessageCircle size={18}/> Comercial</h3>
                            <div className="flex gap-2">
                                <input 
                                    type="text" 
                                    value={vendorWhatsApp} 
                                    onChange={e => setVendorWhatsApp(e.target.value)} 
                                    placeholder="WhatsApp Soporte..."
                                    className="flex-1 bg-gray-900 border border-gray-600 rounded px-3 py-2 text-white text-sm outline-none"
                                />
                                <button onClick={handleSaveVendorContact} className="bg-green-700 hover:bg-green-600 text-white px-4 py-2 rounded font-bold text-sm">SAVE</button>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'issuer' && (
                    <div className="space-y-6 animate-fade-in-out">
                        <div className="p-5 bg-black/40 border border-yellow-600/30 rounded-lg">
                            <div className="flex justify-between items-start">
                                <div>
                                    <h3 className="text-yellow-500 font-bold mb-2 flex items-center gap-2"><Key size={20}/> Servidor de Emisión</h3>
                                    <p className="text-sm text-gray-400 mb-4 max-w-md">Emite claves para entornos de prueba o producción.</p>
                                </div>
                                <div className="text-right">
                                    <span className="text-[10px] bg-yellow-900/30 text-yellow-500 border border-yellow-600 px-2 py-1 rounded">MASTER AUTHORITY</span>
                                </div>
                            </div>
                            
                            <div className="flex gap-4 items-end bg-gray-900 p-4 rounded border border-gray-700">
                                <div className="flex-1">
                                    <label className="text-xs font-bold text-gray-500 uppercase block mb-2">Plan</label>
                                    <div className="flex gap-2">
                                        <button onClick={() => setTargetPlan('pro')} className={`px-4 py-2 rounded text-sm font-bold border ${targetPlan === 'pro' ? 'bg-purple-600 border-purple-500 text-white' : 'bg-gray-800 border-gray-600 text-gray-500'}`}>PRO</button>
                                        <button onClick={() => setTargetPlan('enterprise')} className={`px-4 py-2 rounded text-sm font-bold border ${targetPlan === 'enterprise' ? 'bg-yellow-600 border-yellow-500 text-black' : 'bg-gray-800 border-gray-600 text-gray-500'}`}>ENT</button>
                                    </div>
                                </div>
                                <button onClick={handleGenerateLicense} disabled={isGenerating} className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded font-bold flex items-center gap-2 h-10 disabled:opacity-50">
                                    {isGenerating ? <Loader2 className="animate-spin" size={18}/> : <Plus size={18}/>} EMITIR
                                </button>
                            </div>
                        </div>

                        <div className="border border-gray-700 rounded-lg overflow-hidden flex flex-col h-80 bg-black/20">
                            <div className="bg-gray-800 p-3 border-b border-gray-700 flex justify-between items-center">
                                <h4 className="font-bold text-sm text-gray-300">Registro Global de Licencias</h4>
                                <button onClick={loadServerLicenses} className="text-xs text-blue-400 hover:text-blue-300"><RefreshCw size={12}/></button>
                            </div>
                            <div className="overflow-y-auto flex-1">
                                <table className="w-full text-sm text-left">
                                    <thead className="text-xs text-gray-500 uppercase bg-black/20 sticky top-0">
                                        <tr>
                                            <th className="px-4 py-2">Key</th>
                                            <th className="px-4 py-2">Owner</th>
                                            <th className="px-4 py-2 text-right">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-800">
                                        {issuedLicenses.map((license, idx) => (
                                            <tr key={idx} className={`hover:bg-white/5 ${license.status === 'revoked' ? 'opacity-30' : ''}`}>
                                                <td className="px-4 py-2 font-mono text-green-400 text-xs">{license.key}</td>
                                                <td className="px-4 py-2 text-[10px] font-mono text-gray-400">
                                                    {license.boundNodeId ? license.boundNodeId.substring(0,12) : 'Unassigned'}
                                                </td>
                                                <td className="px-4 py-2 text-right flex justify-end gap-2">
                                                    <button onClick={() => copyToClipboard(license.key)} className="text-gray-400 hover:text-white"><Clipboard size={14}/></button>
                                                    {license.status !== 'revoked' && <button onClick={() => handleRevoke(license.key)} className="text-red-500 hover:text-red-400"><UserX size={14}/></button>}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'cloud' && telemetryData && (
                    <div className="space-y-6 animate-fade-in-out">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="p-4 bg-black/40 rounded border border-gray-700">
                                <h3 className="text-blue-400 text-xs font-bold uppercase mb-2">Identity</h3>
                                <pre className="text-[10px] text-green-400 font-mono whitespace-pre-wrap">{JSON.stringify(cloudIdentity, null, 2)}</pre>
                            </div>
                            <div className="p-4 bg-black/40 rounded border border-gray-700">
                                <h3 className="text-purple-400 text-xs font-bold uppercase mb-2">Metrics</h3>
                                <pre className="text-[10px] text-yellow-400 font-mono whitespace-pre-wrap">{JSON.stringify(telemetryData.metrics, null, 2)}</pre>
                            </div>
                        </div>
                    </div>
                )}

                {feedback && (
                    <div className={`mt-6 p-3 rounded text-xs font-bold text-center flex items-center justify-center gap-2 ${feedback.type === 'success' ? 'bg-green-900/50 text-green-400 border border-green-700' : 'bg-red-900/50 text-red-400 border border-red-700'}`}>
                        {feedback.type === 'success' ? <CheckCircle size={14}/> : <AlertTriangle size={14}/>}
                        {feedback.msg}
                    </div>
                )}

            </div>
        </div>
    </div>
  );
};

export default DeveloperPanel;
