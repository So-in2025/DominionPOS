
import React, { useState, useEffect } from 'react';
import { Cloud, CloudOff, Wifi, WifiOff, Crown, ShieldCheck, RefreshCw, HardDrive, Clock } from 'lucide-react';
import * as cloudService from '../services/cloud';
import type { PlanTier, CloudNodeIdentity } from '../types';
import UpgradeModal from './UpgradeModal';

const NexusStatus: React.FC = () => {
  const [isConnected, setIsConnected] = useState(navigator.onLine);
  const [pendingSync, setPendingSync] = useState(0);
  const [isUpgradeOpen, setIsUpgradeOpen] = useState(false);
  const [trialDaysLeft, setTrialDaysLeft] = useState<number | null>(null);
  
  const [identity, setIdentity] = useState<CloudNodeIdentity>(cloudService.getIdentity());

  useEffect(() => {
    const unsubscribe = cloudService.subscribeToNexusStatus((online, _currentPlan, pending) => {
        setIsConnected(online);
        setPendingSync(pending);
        
        const currentIdentity = cloudService.getIdentity();
        setIdentity(currentIdentity); // Update local identity state as single source of truth

        if (currentIdentity.licenseKey.startsWith('TRIAL-')) {
            try {
                const expiryTimestamp = parseInt(currentIdentity.licenseKey.split('-')[2], 10);
                const days = Math.ceil((expiryTimestamp - Date.now()) / (1000 * 60 * 60 * 24));
                setTrialDaysLeft(Math.max(0, days));
            } catch {
                setTrialDaysLeft(0);
            }
        } else {
            setTrialDaysLeft(null);
        }
    });
    return unsubscribe;
  }, []);

  const isTrial = identity.licenseKey.startsWith('TRIAL-');
  const plan = identity.plan;

  // --- RENDER LOGIC ---

  // 1. Prioritize Trial Display
  if (isTrial) {
      const isEndingSoon = trialDaysLeft !== null && trialDaysLeft <= 7;
      return (
        <>
          <button 
              onClick={() => setIsUpgradeOpen(true)}
              className={`flex items-center gap-2 px-3 py-1 rounded-full text-[10px] font-black border uppercase tracking-widest transition-all ${
                  isEndingSoon 
                  ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300 border-orange-200 dark:border-orange-800 animate-pulse'
                  : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border-blue-200 dark:border-blue-800'
              }`}
          >
              <Clock size={12} />
              PRUEBA PRO: {trialDaysLeft !== null ? `${trialDaysLeft} DÍAS` : '...'}
          </button>
          {isUpgradeOpen && <UpgradeModal onClose={() => setIsUpgradeOpen(false)} />}
        </>
      );
  }

  // 2. Display Starter Plan
  if (plan === 'starter') {
      return (
        <>
            <button 
                onClick={() => setIsUpgradeOpen(true)}
                className="flex items-center gap-2 px-3 py-1 rounded-full text-[10px] font-black bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 border border-green-200 dark:border-green-800 uppercase tracking-widest transition-all hover:bg-green-200 dark:hover:bg-green-900/50"
            >
                <HardDrive size={12} />
                <span className="hidden sm:inline">PLAN BASE</span>
            </button>
            {isUpgradeOpen && <UpgradeModal onClose={() => setIsUpgradeOpen(false)} />}
        </>
      );
  }

  // 3. Display Full Pro/Enterprise Status for paid licenses.
  const getPlanIcon = () => {
      switch (plan) {
          case 'enterprise': return <Crown size={12} className="text-purple-200" />;
          case 'pro': return <ShieldCheck size={12} className="text-blue-200" />;
          default: return null;
      }
  };

  const getPlanLabel = () => {
      switch (plan) {
          case 'enterprise': return 'ENTERPRISE';
          case 'pro': return 'PRO';
          default: return '';
      }
  };

  const statusColor = isConnected 
    ? (plan === 'pro' ? 'bg-dp-blue text-white shadow-lg shadow-blue-500/20' 
      : 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-lg shadow-purple-500/20')
    : 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400 border border-red-200 dark:border-red-800';

  return (
    <div className={`flex items-center gap-2 px-2.5 py-1 rounded-full text-[10px] font-black transition-all duration-500 ${statusColor} uppercase tracking-widest`}>
        <div className="flex items-center gap-1.5">
            {isConnected ? (
                pendingSync > 0 ? (
                    <RefreshCw size={12} className="animate-spin text-white" />
                ) : (
                    <div className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 bg-white"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-white"></span>
                    </div>
                )
            ) : (
                <WifiOff size={12} />
            )}
            
            <span className="hidden sm:inline-block">
                {pendingSync > 0 ? `SYNC (${pendingSync})` : (isConnected ? 'NEXUS' : 'OFFLINE')}
            </span>
        </div>

        {isConnected && (
            <>
                <div className="w-px h-3 bg-white/20 mx-0.5"></div>
                <div className="flex items-center gap-1">
                    {getPlanIcon()}
                    <span>{getPlanLabel()}</span>
                </div>
            </>
        )}
    </div>
  );
};

export default NexusStatus;
