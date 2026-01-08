
let lastUtterance: SpeechSynthesisUtterance | null = null;
let isSpeaking = false;

export const speak = (text: string, priority: boolean = false) => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;

    const synth = window.speechSynthesis;

    if (priority || isSpeaking) {
        synth.cancel(); // Detener colas previas inmediatamente
    }

    try {
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'es-ES';
        utterance.rate = 1.2; // Aumentado ligeramente para mayor agilidad en caja
        utterance.pitch = 1.0;
        
        utterance.onstart = () => { isSpeaking = true; };
        utterance.onend = () => { isSpeaking = false; };
        utterance.onerror = () => { isSpeaking = false; };

        const voices = synth.getVoices();
        const preferredVoice = voices.find(v => 
            (v.lang.includes('es') || v.lang.includes('ES')) && 
            (v.name.includes('Google') || v.name.includes('Microsoft'))
        );

        if (preferredVoice) {
            utterance.voice = preferredVoice;
        }

        lastUtterance = utterance;
        synth.speak(utterance);
    } catch (e) {
        console.warn("TTS System Fragility:", e);
        isSpeaking = false;
    }
};

export const stopSpeaking = () => {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
        window.speechSynthesis.cancel();
        isSpeaking = false;
    }
};
