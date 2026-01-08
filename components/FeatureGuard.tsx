
import React from 'react';
import { Lock } from 'lucide-react';
import { FeatureFlag } from '../types';
import * as cloudService from '../services/cloud';

interface FeatureGuardProps {
    feature: FeatureFlag;
    children: React.ReactNode;
    fallback?: React.ReactNode; // Optional custom fallback
    showLock?: boolean; // Show lock overlay instead of hiding completely
}

const FeatureGuard: React.FC<FeatureGuardProps> = ({ feature, children, fallback, showLock = true }) => {
    const hasAccess = cloudService.hasAccess(feature);

    if (hasAccess) {
        return <>{children}</>;
    }

    if (!showLock) {
        return <>{fallback || null}</>;
    }

    // Lock Overlay Mode (Blur effect)
    return (
        <div className="relative group overflow-hidden rounded-lg">
            <div className="filter blur-sm select-none pointer-events-none opacity-50 grayscale">
                {children}
            </div>
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-100/60 dark:bg-black/60 z-10">
                <div className="bg-white dark:bg-gray-800 p-3 rounded-full shadow-lg mb-2">
                    <Lock size={24} className="text-yellow-500" />
                </div>
                <span className="text-xs font-bold text-gray-800 dark:text-white bg-white/80 dark:bg-black/80 px-2 py-1 rounded">
                    Plan {feature === 'remote_config' ? 'Enterprise' : 'Pro'} Requerido
                </span>
            </div>
        </div>
    );
};

export default FeatureGuard;
