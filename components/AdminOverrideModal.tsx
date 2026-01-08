
import React, { useState, useEffect } from 'react';
import { ShieldAlert, X, Delete, LockKeyhole } from 'lucide-react';
import * as dbService from '../services/db';
import * as soundService from '../services/sound';
import type { User } from '../types';

interface AdminOverrideModalProps {
  actionName: string;
  onClose: () => void;
  onSuccess: (adminUser: User) => void;
}

const PinPadButton: React.FC<{ onClick: () => void, children: React.ReactNode, className?: string }> = ({ onClick, children, className }) => (
    <button onClick={() => { soundService.playSound('type'); onClick(); }} className={`flex items-center justify-center h-14 rounded-lg text-xl font-bold transition-colors bg-gray-200 text-gray-800 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600 ${className || ''}`}>
        {children}
    </button>
);

const AdminOverrideModal: React.FC<AdminOverrideModalProps> = ({ actionName, onClose, onSuccess }) => {
    const [pin, setPin] = useState('');
    const [error, setError] = useState('');
    const [admins, setAdmins] = useState<User[]>([]);

    useEffect(() => {
        const users = dbService.getUsers();
        setAdmins(users.filter(u => u.role === 'admin'));
    }, []);

    const handlePinInput = (value: string) => {
        if (pin.length < 6) {
            setPin(pin + value);
            setError('');
        }
    };

    const handleBackspace = () => {
        setPin(pin.slice(0, -1));
        setError('');
    };
    
    const handleSubmit = async () => {
        // Check against all admins
        const validAdmin = admins.find(admin => admin.pin === pin);
        
        if (validAdmin) {
            onSuccess(validAdmin);
        } else {
            setError('PIN de administrador incorrecto');
            soundService.playSound('error');
            setPin('');
        }
    };

    useEffect(() => {
        if (pin.length >= 4) {
             // Auto-submit attempt if generic length is met, 
             // but strictly we wait for user or specific length match if we knew it.
             // For now, let's auto-submit if it matches any admin pin length exactly
             const match = admins.some(a => a.pin.length === pin.length);
             if(match) handleSubmit();
        }
    }, [pin, admins]);

    return (
        <div className="fixed inset-0 bg-black/80 z-[60] flex justify-center items-center backdrop-blur-sm" aria-modal="true" role="dialog">
            <div className="bg-white dark:bg-dp-charcoal rounded-xl shadow-2xl w-full max-w-sm m-4 overflow-hidden border-2 border-red-500 animate-modal-in">
                <div className="bg-red-600 p-4 text-white flex justify-between items-center">
                    <h3 className="font-bold text-lg flex items-center gap-2">
                        <ShieldAlert size={24} />
                        Autorización Requerida
                    </h3>
                    <button onClick={onClose} className="p-1 hover:bg-white/20 rounded-full transition-colors"><X size={20}/></button>
                </div>
                
                <div className="p-6">
                    <p className="text-center text-gray-600 dark:text-gray-300 mb-2">
                        La acción <span className="font-bold text-dp-dark-gray dark:text-white">"{actionName}"</span> requiere permisos de supervisor.
                    </p>
                    <p className="text-center text-sm text-gray-500 mb-6">Ingrese PIN de Administrador</p>

                    <div className="flex justify-center items-center gap-3 mb-6 h-8">
                        {Array.from({ length: 4 }).map((_, index) => (
                            <div key={index} className={`w-4 h-4 rounded-full transition-all duration-200 ${index < pin.length ? 'bg-red-500 scale-110' : 'bg-gray-300 dark:bg-gray-600'}`}></div>
                        ))}
                    </div>
                    
                    {error && <p className="text-red-500 text-center text-sm font-bold mb-4 animate-pulse">{error}</p>}

                    <div className="grid grid-cols-3 gap-3">
                        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => (
                            <PinPadButton key={num} onClick={() => handlePinInput(num.toString())}>{num}</PinPadButton>
                        ))}
                        <div className="flex items-center justify-center"><LockKeyhole className="text-gray-400"/></div>
                        <PinPadButton onClick={() => handlePinInput('0')}>0</PinPadButton>
                        <PinPadButton onClick={handleBackspace}><Delete size={24}/></PinPadButton>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AdminOverrideModal;
