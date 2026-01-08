
import { useState, useEffect } from 'react';
import { FeatureFlag } from '../types';
import * as cloudService from '../services/cloud';

export const useFeature = (feature: FeatureFlag) => {
    // En una app real, nos suscribiríamos a cambios en el estado del cloudService
    // Por ahora, chequeamos al montar
    const [enabled, setEnabled] = useState(cloudService.hasAccess(feature));

    useEffect(() => {
        // Simple polling o evento para detectar cambios de plan en tiempo real
        const check = () => setEnabled(cloudService.hasAccess(feature));
        window.addEventListener('focus', check); // Re-checkear al volver a la pestaña
        return () => window.removeEventListener('focus', check);
    }, [feature]);

    return enabled;
};
