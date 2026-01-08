
import React, { useState, useEffect } from 'react';
import type { AuditLogEntry } from '../types';
import * as dbService from '../services/db';
import { X, Search, ShieldAlert, Info, AlertTriangle } from 'lucide-react';

interface AuditLogModalProps {
  onClose: () => void;
}

const AuditLogModal: React.FC<AuditLogModalProps> = ({ onClose }) => {
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const fetchLogs = async () => {
        const allLogs = await dbService.getAuditLogs();
        setLogs(allLogs);
    };
    fetchLogs();
  }, []);

  const filteredLogs = logs.filter(log => 
    log.userName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
    log.details?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getSeverityIcon = (severity: AuditLogEntry['severity']) => {
      switch(severity) {
          case 'critical': return <ShieldAlert size={16} className="text-red-500" />;
          case 'warning': return <AlertTriangle size={16} className="text-orange-500" />;
          default: return <Info size={16} className="text-blue-500" />;
      }
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex justify-center items-center" aria-modal="true" role="dialog" onClick={onClose}>
      <div className="bg-dp-light dark:bg-dp-charcoal rounded-lg shadow-2xl p-6 w-full max-w-4xl m-4 flex flex-col max-h-[85vh] animate-modal-in" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-bold text-dp-dark-gray dark:text-dp-light-gray flex items-center gap-2">
                <ShieldAlert /> Registro de Auditoría
            </h2>
            <button onClick={onClose} className="p-2 rounded-full hover:bg-dp-soft-gray dark:hover:bg-gray-700"><X size={24} /></button>
        </div>

        <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            <input 
                type="text" 
                placeholder="Buscar por usuario, acción o detalles..." 
                value={searchTerm} 
                onChange={(e) => setSearchTerm(e.target.value)} 
                className="w-full pl-10 pr-4 py-2 rounded-lg border focus:ring-2 bg-dp-light dark:bg-dp-charcoal border-gray-300 dark:border-gray-600 focus:ring-dp-blue dark:focus:ring-dp-gold focus:border-transparent"
            />
        </div>

        <div className="flex-grow overflow-y-auto border rounded-lg dark:border-gray-700">
            <table className="w-full text-left text-sm">
                <thead className="bg-dp-soft-gray dark:bg-black/30 sticky top-0">
                    <tr>
                        <th className="p-3 font-semibold">Fecha/Hora</th>
                        <th className="p-3 font-semibold">Usuario</th>
                        <th className="p-3 font-semibold">Acción</th>
                        <th className="p-3 font-semibold">Detalles</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                    {filteredLogs.map(log => (
                        <tr key={log.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                            <td className="p-3 whitespace-nowrap text-gray-500 dark:text-gray-400">{new Date(log.timestamp).toLocaleString()}</td>
                            <td className="p-3 font-medium">{log.userName}</td>
                            <td className="p-3">
                                <div className="flex items-center gap-2">
                                    {getSeverityIcon(log.severity)}
                                    <span className={`px-2 py-0.5 rounded-full text-xs font-bold 
                                        ${log.severity === 'critical' ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300' : 
                                          log.severity === 'warning' ? 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300' : 
                                          'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300'}`}>
                                        {log.action}
                                    </span>
                                </div>
                            </td>
                            <td className="p-3 text-gray-600 dark:text-gray-300 break-all">{log.details}</td>
                        </tr>
                    ))}
                    {filteredLogs.length === 0 && (
                        <tr>
                            <td colSpan={4} className="p-8 text-center text-gray-500">No se encontraron registros.</td>
                        </tr>
                    )}
                </tbody>
            </table>
        </div>
        
        <div className="mt-4 flex justify-end">
             <button onClick={onClose} className="px-4 py-2 rounded-md bg-gray-200 text-gray-800 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-200 hover:dark:bg-gray-600">Cerrar</button>
        </div>
      </div>
    </div>
  );
};

export default AuditLogModal;
