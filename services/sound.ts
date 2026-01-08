
let audioCtx: AudioContext | null = null;

type SoundType = 'click' | 'success' | 'error' | 'alert' | 'pop' | 'processing' | 'beep' | 'cash' | 'trash' | 'hero' | 'type';

/**
 * Asegura que el contexto de audio esté activo tras una interacción del usuario.
 * Debe llamarse en el primer clic/toque global de la app.
 */
export const resumeAudioContext = async () => {
    if (!audioCtx) {
        // @ts-ignore
        const AudioContextClass = window.AudioContext || window.webkitAudioContext;
        if (AudioContextClass) {
            audioCtx = new AudioContextClass();
        }
    }
    if (audioCtx && audioCtx.state === 'suspended') {
        await audioCtx.resume();
    }
};

export const playSound = (type: SoundType) => {
  if (typeof window === 'undefined') return;

  // --- Haptic Feedback ---
  if (typeof navigator !== 'undefined' && navigator.vibrate) {
      try {
          switch (type) {
              case 'type':
              case 'click':
                  navigator.vibrate(5);
                  break;
              case 'beep':
                  navigator.vibrate(10);
                  break;
              case 'trash':
                  navigator.vibrate(15);
                  break;
              case 'success':
              case 'hero':
              case 'cash':
                  navigator.vibrate([10, 30, 10]);
                  break;
              case 'error':
              case 'alert':
                  navigator.vibrate([50, 50, 50]);
                  break;
          }
      } catch (e) {}
  }

  // --- Audio Synthesis ---
  try {
    if (!audioCtx) {
        // @ts-ignore
        const AudioContextClass = window.AudioContext || window.webkitAudioContext;
        if (AudioContextClass) {
            audioCtx = new AudioContextClass();
        }
    }

    if (!audioCtx) return;

    if (audioCtx.state === 'suspended') {
      // No intentamos resumir aquí para evitar promesas pendientes en cada sonido
      return; 
    }

    const osc = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();

    osc.connect(gainNode);
    gainNode.connect(audioCtx.destination);

    const now = audioCtx.currentTime;

    switch (type) {
      case 'click':
        osc.type = 'sine';
        osc.frequency.setValueAtTime(800, now);
        osc.frequency.exponentialRampToValueAtTime(1200, now + 0.05);
        gainNode.gain.setValueAtTime(0.05, now);
        gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
        osc.start(now);
        osc.stop(now + 0.05);
        break;
      
      case 'type':
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(600, now);
        osc.frequency.exponentialRampToValueAtTime(300, now + 0.03);
        gainNode.gain.setValueAtTime(0.08, now);
        gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.03);
        osc.start(now);
        osc.stop(now + 0.03);
        break;

      case 'beep':
        osc.type = 'square';
        osc.frequency.setValueAtTime(1800, now);
        gainNode.gain.setValueAtTime(0.05, now);
        gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
        osc.start(now);
        osc.stop(now + 0.08);
        break;

      case 'pop':
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(400, now);
        osc.frequency.linearRampToValueAtTime(600, now + 0.1);
        gainNode.gain.setValueAtTime(0.1, now);
        gainNode.gain.linearRampToValueAtTime(0.01, now + 0.1);
        osc.start(now);
        osc.stop(now + 0.1);
        break;
        
      case 'trash':
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(150, now);
        osc.frequency.exponentialRampToValueAtTime(50, now + 0.15);
        gainNode.gain.setValueAtTime(0.1, now);
        gainNode.gain.linearRampToValueAtTime(0.01, now + 0.15);
        osc.start(now);
        osc.stop(now + 0.15);
        break;

      case 'success':
        const notes = [523.25, 659.25, 783.99, 1046.50]; 
        notes.forEach((freq, i) => {
            if(!audioCtx) return;
            const o = audioCtx.createOscillator();
            const g = audioCtx.createGain();
            o.connect(g);
            g.connect(audioCtx.destination);
            o.type = 'sine';
            o.frequency.value = freq;
            const startTime = now + (i * 0.08);
            g.gain.setValueAtTime(0, startTime);
            g.gain.linearRampToValueAtTime(0.1, startTime + 0.02);
            g.gain.exponentialRampToValueAtTime(0.001, startTime + 0.4);
            o.start(startTime);
            o.stop(startTime + 0.4);
        });
        break;
        
      case 'cash':
        const coins = [1200, 1600, 2000];
        coins.forEach((freq, i) => {
            if(!audioCtx) return;
            const o = audioCtx.createOscillator();
            const g = audioCtx.createGain();
            o.connect(g);
            g.connect(audioCtx.destination);
            o.type = 'sine';
            o.frequency.setValueAtTime(freq, now + (i*0.05));
            g.gain.setValueAtTime(0, now + (i*0.05));
            g.gain.linearRampToValueAtTime(0.1, now + (i*0.05) + 0.02);
            g.gain.exponentialRampToValueAtTime(0.001, now + (i*0.05) + 0.3);
            o.start(now + (i*0.05));
            o.stop(now + (i*0.05) + 0.3);
        });
        break;
        
      case 'hero':
        const chord = [261.63, 329.63, 392.00, 523.25];
        chord.forEach((freq) => {
            if(!audioCtx) return;
            const o = audioCtx.createOscillator();
            const g = audioCtx.createGain();
            o.connect(g);
            g.connect(audioCtx.destination);
            o.type = 'triangle';
            o.frequency.value = freq;
            g.gain.setValueAtTime(0, now);
            g.gain.linearRampToValueAtTime(0.08, now + 0.1);
            g.gain.exponentialRampToValueAtTime(0.001, now + 1.5);
            o.start(now);
            o.stop(now + 1.5);
        });
        break;

      case 'error':
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(150, now);
        osc.frequency.linearRampToValueAtTime(100, now + 0.3);
        gainNode.gain.setValueAtTime(0.2, now);
        gainNode.gain.linearRampToValueAtTime(0.01, now + 0.3);
        osc.start(now);
        osc.stop(now + 0.3);
        break;

      case 'alert':
        osc.type = 'square';
        osc.frequency.setValueAtTime(600, now);
        osc.frequency.setValueAtTime(800, now + 0.15);
        osc.frequency.setValueAtTime(600, now + 0.3);
        gainNode.gain.setValueAtTime(0.1, now);
        gainNode.gain.linearRampToValueAtTime(0.01, now + 0.45);
        osc.start(now);
        osc.stop(now + 0.45);
        break;
        
      case 'processing':
         osc.type = 'sine';
         osc.frequency.setValueAtTime(800, now);
         gainNode.gain.setValueAtTime(0.05, now);
         gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
         osc.start(now);
         osc.stop(now + 0.1);
         break;
    }
  } catch (e) {}
};
