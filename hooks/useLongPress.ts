

import React, { useCallback, useRef, useEffect } from 'react';

interface LongPressOptions {
  delay?: number;
  initialSpeed?: number;
  minSpeed?: number;
  speedRampFactor?: number;
}

const useLongPress = (
  callback: () => void,
  { delay = 350, initialSpeed = 150, minSpeed = 50, speedRampFactor = 0.9 }: LongPressOptions = {}
) => {
  const callbackRef = useRef(callback);
  // Fix: Explicitly provide undefined to useRef to satisfy the expected 1 argument in some TypeScript environments.
  const timeoutRef = useRef<number | undefined>(undefined);
  const isPressedRef = useRef(false);

  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  const stop = useCallback(() => {
    isPressedRef.current = false;
    if (timeoutRef.current) {
      window.clearTimeout(timeoutRef.current);
    }
  }, []);

  const start = useCallback((event: React.MouseEvent | React.TouchEvent) => {
    event.preventDefault();
    callbackRef.current(); // Llamada inicial inmediata
    isPressedRef.current = true;

    let currentSpeed = initialSpeed;

    const repeater = () => {
      if (!isPressedRef.current) {
        stop();
        return;
      }
      
      callbackRef.current();
      currentSpeed = Math.max(minSpeed, currentSpeed * speedRampFactor); // Acelera con un límite
      timeoutRef.current = window.setTimeout(repeater, currentSpeed);
    };

    timeoutRef.current = window.setTimeout(repeater, delay);
  }, [delay, initialSpeed, minSpeed, speedRampFactor, stop]);

  return {
    onMouseDown: start,
    onMouseUp: stop,
    onMouseLeave: stop,
    onTouchStart: start,
    onTouchEnd: stop,
  };
};

export default useLongPress;
