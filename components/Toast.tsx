
import React, { useEffect } from 'react';
import { CheckCircle, AlertCircle, X } from 'lucide-react';

interface ToastProps {
  message: string;
  type: 'success' | 'error';
  onClose: () => void;
}

const Toast: React.FC<ToastProps> = ({ message, type, onClose }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, 3000);

    return () => {
      clearTimeout(timer);
    };
  }, [onClose]);

  const toastStyles = {
    success: {
      bg: 'bg-dp-blue text-dp-light dark:bg-dp-gold dark:text-dp-dark',
      icon: <CheckCircle size={20} />,
    },
    error: {
      bg: 'bg-red-600 text-white dark:bg-red-500',
      icon: <AlertCircle size={20} />,
    },
  };

  return (
    <div
      className={`fixed top-20 right-6 z-50 flex items-center gap-3 pl-4 pr-2 py-2 rounded-lg shadow-lg animate-slide-in-from-right ${toastStyles[type].bg}`}
      role="alert"
      aria-live="assertive"
    >
      {toastStyles[type].icon}
      <span className="font-semibold text-sm">{message}</span>
      <button onClick={onClose} className="p-1 rounded-full hover:bg-white/10 dark:hover:bg-black/10">
        <X size={16} />
      </button>
    </div>
  );
};

export default Toast;
