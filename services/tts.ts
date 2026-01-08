
export const speak = (text: string, priority: boolean = false) => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;

    const synth = window.speechSynthesis;

    if (priority) {
        synth.cancel();
    }

    try {
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'es-ES';
        utterance.rate = 1.1;
        utterance.pitch = 1.0;

        const voices = synth.getVoices();
        const preferredVoice = voices.find(v => 
            (v.lang.includes('es') || v.lang.includes('ES')) && 
            (v.name.includes('Google') || v.name.includes('Microsoft'))
        );

        if (preferredVoice) {
            utterance.voice = preferredVoice;
        }

        synth.speak(utterance);
    } catch (e) {
        console.warn("TTS Error", e);
    }
};

export const stopSpeaking = () => {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
        window.speechSynthesis.cancel();
    }
};
