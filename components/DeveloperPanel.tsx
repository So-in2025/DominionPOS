
import React, { useState, useEffect } from 'react';
import { X, Server, ShieldCheck, Key, AlertTriangle, Database, CheckCircle, Code, Activity, Globe, Lock, MessageCircle, Clipboard, Plus, RefreshCw, UserCheck, UserX, Loader2 } from 'lucide-react';
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
      } else {
          setFeedback({ type: 'error', msg: 'Código de acceso denegado.' });
      }
  };

  const handleApplyTemplate = async () => {
      if (!selectedType || !window.confirm("PELIGRO: Esto BORRARÁ todos los productos actuales y reiniciará la base de datos con la plantilla seleccionada. ¿Continuar?")) {
          return;
      }

      const template = BUSINESS_TEMPLATES[selectedType as keyof typeof BUSINESS_TEMPLATES];
      if (!template) return;

      try {
          const currentProducts = dbService.getProducts();
          for (const p of currentProducts) {
              await dbService.deleteProduct(p.id);
          }
          for (const p of template.products) {
              await dbService.addProduct(p); 
          }
          settingsService.saveLoyaltySettings(template.loyalty);
          setFeedback({ type: 'success', msg: `Plantilla ${template.name} aplicada correctamente.` });
          onRefresh();
      } catch (e) {
          setFeedback({ type: 'error', msg: 'Error al aplicar plantilla.' });
      }
  };

  const handleUpdateLicense = async () => {
      if (!licenseKeyInput.trim()) return;
      setFeedback({ type: 'success', msg: 'Contactando servidor Nexus...' });
      
      const result = await cloudService.connectToNexus(licenseKeyInput.trim());
      
      if (result.success) {
          setFeedback({ type: 'success', msg: `ÉXITO: ${result.message}` });
      } else {
          setFeedback({ type: 'error', msg: `FALLO: ${result.message}` });
      }
      onRefresh();
  };
  
  const handleSaveVendorContact = () => {
      if(!vendorWhatsApp.trim()) return;
      settingsService.saveVendorWhatsApp(vendorWhatsApp);
      setFeedback({ type: 'success', msg: 'Número de Ventas actualizado globalmente.' });
  }
  
  // --- REAL LICENSE GENERATOR ---
  const handleGenerateLicense = async () => {
      setIsGenerating(true);
      try {
          await cloudService.adminGenerateLicense(targetPlan);
          await loadServerLicenses();
      } catch (e) {
          alert("Error generando licencia");
      }
      setIsGenerating(false);
  };

  const handleRevoke = async (key: string) => {
      if(window.confirm("¿Revocar acceso a esta licencia permanentemente?")) {
          await cloudService.adminRevokeLicense(key);
          await loadServerLicenses();
      }
  }

  const copyToClipboard = (text: string) => {
      navigator.clipboard.writeText(text);
      setFeedback({ type: 'success', msg: 'Copiado al portapapeles' });
      setTimeout(() => setFeedback(null), 2000);
  };

  if (!isAuthenticated) {
      return (
        <div className="fixed inset-0 bg-black z-[100] flex justify-center items-center text-green-500 font-mono">
            <div className="w-full max-w-sm p-8 border border-green-800 bg-black rounded shadow-[0_0_20px_rgba(0,255,0,0.2)]">
                <h2 className="text-xl mb-4 flex items-center gap-2"><Code /> SYSTEM_OVERRIDE</h2>
                <input 
                    type="password" 
                    value={accessCode} 
                    onChange={e => setAccessCode(e.target.value)} 
                    placeholder="ENTER ACCESS SEQUENCE"
                    className="w-full bg-black border-b border-green-700 text-center text-2xl py-2 focus:outline-none mb-4 tracking-widest text-green-500"
                />
                <div className="flex justify-between">
                    <button onClick={onClose} className="text-xs text-gray-500 hover:text-white">[ABORT]</button>
                    <button onClick={handleLogin} className="text-xs border border-green-700 px-4 py-2 hover:bg-green-900">[EXECUTE]</button>
                </div>
                {feedback && <p className="text-red-500 text-xs mt-4 text-center">{feedback.msg}</p>}
            </div>
        </div>
      );
  }

  return (
    <div className="fixed inset-0 bg-gray-900 z-[100] flex justify-center items-center font-sans">
        <div className="bg-gray-800 text-gray-200 w-full max-w-4xl rounded-lg shadow-2xl overflow-hidden border border-gray-700 flex flex-col max-h-[90vh]">
            
            {/* Navbar */}
            <div className="bg-gray-900 p-4 border-b border-gray-700 flex justify-between items-center">
                <div className="flex items-center gap-4">
                    <h2 className="text-lg font-bold flex items-center gap-2 text-purple-400"><Server size={20}/> Developer Console</h2>
                    <div className="flex bg-gray-800 rounded p-1">
                        <button onClick={() => setActiveTab('setup')} className={`px-3 py-1 rounded text-xs font-bold ${activeTab === 'setup' ? 'bg-purple-600 text-white' : 'text-gray-400 hover:text-white'}`}>Setup Local</button>
                        <button onClick={() => setActiveTab('issuer')} className={`px-3 py-1 rounded text-xs font-bold ${activeTab === 'issuer' ? 'bg-yellow-600 text-black' : 'text-gray-400 hover:text-white'}`}>Servidor Licencias</button>
                        <button onClick={() => setActiveTab('cloud')} className={`px-3 py-1 rounded text-xs font-bold ${activeTab === 'cloud' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'}`}>Nexus Cloud</button>
                    </div>
                </div>
                <button onClick={onClose}><X className="text-gray-500 hover:text-white" /></button>
            </div>
            
            <div className="p-6 overflow-y-auto flex-1">
                
                {activeTab === 'setup' && (
                    <div className="space-y-8">
                        {/* Section 1: Business Templates */}
                        <div className="p-4 border border-gray-600 rounded bg-gray-800/50">
                            <h3 className="text-white font-bold mb-2 flex items-center gap-2"><Database size={18}/> Inicialización de Rubro</h3>
                            <div className="flex gap-2 mb-4">
                                <select 
                                    value={selectedType} 
                                    onChange={e => setSelectedType(e.target.value as BusinessType)}
                                    className="flex-1 bg-gray-900 border border-gray-600 rounded px-3 py-2 text-white focus:ring-1 focus:ring-purple-500 outline-none"
                                >
                                    <option value="">-- Seleccionar Rubro --</option>
                                    <option value="kiosco">Kiosco / Despensa</option>
                                    <option value="cafe">Cafetería / Panadería</option>
                                    <option value="ferreteria">Ferretería</option>
                                    <option value="ropa">Tienda de Ropa</option>
                                </select>
                                <button onClick={handleApplyTemplate} disabled={!selectedType} className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded font-bold text-sm disabled:opacity-50">APLICAR</button>
                            </div>
                        </div>

                        {/* Section 2: License Management */}
                        <div className="p-4 border border-blue-900/50 rounded bg-blue-900/10">
                            <h3 className="text-blue-300 font-bold mb-2 flex items-center gap-2"><ShieldCheck size={18}/> Provisionamiento de Licencia (Lado Cliente)</h3>
                            <div className="mb-4">
                                <div className="flex gap-2">
                                    <input 
                                        type="text"
                                        value={licenseKeyInput}
                                        onChange={e => setLicenseKeyInput(e.target.value)}
                                        className="flex-1 bg-gray-900 border border-gray-600 rounded px-3 py-2 text-sm font-mono text-green-400 outline-none"
                                        placeholder="Ingresar Clave para Activar..."
                                    />
                                    <button onClick={handleUpdateLicense} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded font-bold text-sm flex items-center gap-2"><Key size={16} /> ACTIVAR</button>
                                </div>
                                <p className="text-[10px] text-gray-400 mt-2">
                                    Nota: Al activar, el servidor vinculará esta clave al NodeID de este navegador ({cloudIdentity?.nodeId?.substring(0,8)}...).
                                </p>
                            </div>
                        </div>

                        {/* Section 3: Commercial Config (Dynamic WA) */}
                        <div className="p-4 border border-green-900/50 rounded bg-green-900/10">
                            <h3 className="text-green-400 font-bold mb-2 flex items-center gap-2"><MessageCircle size={18}/> Configuración de Ventas (Vendor)</h3>
                            <div className="flex gap-2">
                                <input 
                                    type="text" 
                                    value={vendorWhatsApp} 
                                    onChange={e => setVendorWhatsApp(e.target.value)} 
                                    placeholder="Ej: 5491133334444"
                                    className="flex-1 bg-gray-900 border border-gray-600 rounded px-3 py-2 text-white text-sm outline-none focus:border-green-500"
                                />
                                <button onClick={handleSaveVendorContact} className="bg-green-700 hover:bg-green-600 text-white px-4 py-2 rounded font-bold text-sm">GUARDAR</button>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'issuer' && (
                    <div className="space-y-6 animate-fade-in-out">
                        <div className="p-5 bg-black/40 border border-yellow-600/30 rounded-lg">
                            <div className="flex justify-between items-start">
                                <div>
                                    <h3 className="text-yellow-500 font-bold mb-2 flex items-center gap-2"><Key size={20}/> Generador de Licencias (Server Authority)</h3>
                                    <p className="text-sm text-gray-400 mb-4 max-w-md">
                                        Genera claves que se almacenan en la "Base de Datos Central Simulada". 
                                        Estas claves son únicas y se vincularán al primer dispositivo que las use.
                                    </p>
                                </div>
                                <div className="text-right">
                                    <span className="text-[10px] bg-yellow-900/30 text-yellow-500 border border-yellow-600 px-2 py-1 rounded">SERVER SIMULATION MODE</span>
                                </div>
                            </div>
                            
                            <div className="flex gap-4 items-end bg-gray-900 p-4 rounded border border-gray-700">
                                <div className="flex-1">
                                    <label className="text-xs font-bold text-gray-500 uppercase block mb-2">Plan Target</label>
                                    <div className="flex gap-2">
                                        <button onClick={() => setTargetPlan('pro')} className={`px-4 py-2 rounded text-sm font-bold border ${targetPlan === 'pro' ? 'bg-purple-600 border-purple-500 text-white' : 'bg-gray-800 border-gray-600 text-gray-500'}`}>PRO</button>
                                        <button onClick={() => setTargetPlan('enterprise')} className={`px-4 py-2 rounded text-sm font-bold border ${targetPlan === 'enterprise' ? 'bg-yellow-600 border-yellow-500 text-black' : 'bg-gray-800 border-gray-600 text-gray-500'}`}>ENTERPRISE</button>
                                    </div>
                                </div>
                                <button onClick={handleGenerateLicense} disabled={isGenerating} className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded font-bold flex items-center gap-2 h-10 disabled:opacity-50 min-w-[140px] justify-center">
                                    {isGenerating ? <Loader2 className="animate-spin" size={18}/> : <><Plus size={18}/> EMITIR</>}
                                </button>
                            </div>
                        </div>

                        <div className="border border-gray-700 rounded-lg overflow-hidden flex flex-col h-80">
                            <div className="bg-gray-800 p-3 border-b border-gray-700 flex justify-between items-center">
                                <h4 className="font-bold text-sm text-gray-300">Global License Registry ({issuedLicenses.length})</h4>
                                <button onClick={loadServerLicenses} className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1"><RefreshCw size={12}/> Actualizar Lista</button>
                            </div>
                            <div className="overflow-y-auto flex-1">
                                <table className="w-full text-sm text-left">
                                    <thead className="text-xs text-gray-500 uppercase bg-black/20 sticky top-0">
                                        <tr>
                                            <th className="px-4 py-2">Clave</th>
                                            <th className="px-4 py-2">Plan</th>
                                            <th className="px-4 py-2">Dispositivo Vinculado (Owner)</th>
                                            <th className="px-4 py-2 text-right">Estado</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-800">
                                        {issuedLicenses.map((license, idx) => (
                                            <tr key={idx} className={`hover:bg-white/5 ${license.status === 'revoked' ? 'opacity-50 grayscale' : ''}`}>
                                                <td className="px-4 py-2 font-mono text-green-400 select-all">{license.key}</td>
                                                <td className="px-4 py-2">
                                                    <span className={`text-[10px] px-2 py-0.5 rounded font-bold ${license.plan === 'pro' ? 'bg-purple-900/50 text-purple-300' : 'bg-yellow-900/50 text-yellow-300'}`}>
                                                        {license.plan.toUpperCase()}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-2 text-xs">
                                                    {license.boundNodeId ? (
                                                        <span className="flex items-center gap-1 text-blue-400 font-mono" title={license.boundNodeId}>
                                                            <UserCheck size={12}/> {license.boundNodeId.substring(0,12)}...
                                                        </span>
                                                    ) : (
                                                        <span className="text-gray-500 italic">-- Disponible --</span>
                                                    )}
                                                </td>
                                                <td className="px-4 py-2 text-right flex justify-end gap-2 items-center">
                                                    <button onClick={() => copyToClipboard(license.key)} className="text-gray-400 hover:text-white p-1" title="Copiar">
                                                        <Clipboard size={14}/>
                                                    </button>
                                                    {license.status !== 'revoked' && (
                                                        <button onClick={() => handleRevoke(license.key)} className="text-red-500 hover:text-red-400 p-1" title="Revocar">
                                                            <UserX size={14}/>
                                                        </button>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                        {issuedLicenses.length === 0 && (
                                            <tr><td colSpan={4} className="p-8 text-center text-gray-500 text-xs">Base de datos de licencias vacía.</td></tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'cloud' && (
                    <div className="space-y-6 animate-fade-in-out">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="p-4 bg-black/40 rounded border border-gray-700">
                                <h3 className="text-blue-400 text-sm font-bold flex items-center gap-2 mb-2"><Globe size={16}/> Identidad Local (Client)</h3>
                                <pre className="text-[10px] text-green-400 font-mono overflow-x-auto">
                                    {JSON.stringify(cloudIdentity, null, 2)}
                                </pre>
                            </div>
                            <div className="p-4 bg-black/40 rounded border border-gray-700">
                                <h3 className="text-purple-400 text-sm font-bold flex items-center gap-2 mb-2"><Activity size={16}/> Telemetría Enviada</h3>
                                <pre className="text-[10px] text-yellow-400 font-mono overflow-x-auto h-40 scrollbar-thin">
                                    {JSON.stringify(telemetryData, null, 2)}
                                </pre>
                            </div>
                        </div>
                        <div className="p-3 bg-gray-900 rounded border border-gray-700 text-center">
                            <p className="text-xs text-gray-500">Estado de Red Simulado</p>
                            <div className="flex items-center justify-center gap-2 mt-2">
                                <div className="w-3 h-3 rounded-full bg-green-500 animate-pulse"></div>
                                <span className="font-bold text-green-500">ONLINE</span>
                            </div>
                        </div>
                    </div>
                )}

                {feedback && (
                    <div className={`mt-6 p-3 rounded text-sm font-bold text-center flex items-center justify-center gap-2 ${feedback.type === 'success' ? 'bg-green-900/50 text-green-400 border border-green-700' : 'bg-red-900/50 text-red-400 border border-red-700'}`}>
                        {feedback.type === 'success' ? <CheckCircle size={18}/> : <AlertTriangle size={18}/>}
                        {feedback.msg}
                    </div>
                )}

            </div>
        </div>
    </div>
  );
};

export default DeveloperPanel;
