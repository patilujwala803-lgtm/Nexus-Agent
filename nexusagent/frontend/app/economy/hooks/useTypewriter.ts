import { useState, useEffect, useCallback, useRef } from 'react';

export function useTypewriter(text: string | null, isActive: boolean) {
  const [typedText, setTypedText] = useState<string>('');
  const [isTyping, setIsTyping] = useState<boolean>(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const reset = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setTypedText('');
    setIsTyping(false);
  }, []);

  useEffect(() => {
    // If not active or text is null/empty
    if (!isActive || !text) {
      if (!isActive) {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
        setIsTyping(false);
      }
      return;
    }

    // Start typewriter interval
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    setTypedText('');
    setIsTyping(true);
    let index = 0;

    intervalRef.current = setInterval(() => {
      index++;
      if (index <= text.length) {
        setTypedText(text.slice(0, index));
      } else {
        setIsTyping(false);
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
      }
    }, 18); // 18ms per character speed

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [text, isActive]);

  return { typedText, isTyping, reset };
}
