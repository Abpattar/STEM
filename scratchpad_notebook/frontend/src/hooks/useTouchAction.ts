import { useEffect, useRef } from 'react';

export function useTouchAction(elementRef: React.RefObject<HTMLElement>, enabled = true) {
  const previousTouchAction = useRef<string>('');

  useEffect(() => {
    if (!enabled || !elementRef.current) return;

    const element = elementRef.current;
    previousTouchAction.current = element.style.touchAction || '';
    element.style.touchAction = 'none';

    return () => {
      element.style.touchAction = previousTouchAction.current;
    };
  }, [elementRef, enabled]);
}

export function usePreventScroll(enabled = true) {
  useEffect(() => {
    if (!enabled) return;

    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length > 1) {
        e.preventDefault();
      }
    };

    document.addEventListener('touchmove', handleTouchMove, { passive: false });
    return () => document.removeEventListener('touchmove', handleTouchMove);
  }, [enabled]);
}