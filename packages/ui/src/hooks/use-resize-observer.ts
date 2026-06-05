import { useEffect, useRef, useState, useCallback } from 'react';

interface ResizeObserverEntry {
  width: number;
  height: number;
}

export function useResizeObserver<T extends HTMLElement>(): [
  React.RefCallback<T>,
  ResizeObserverEntry | null,
] {
  const [entry, setEntry] = useState<ResizeObserverEntry | null>(null);
  const observerRef = useRef<ResizeObserver | null>(null);
  const elementRef = useRef<T | null>(null);

  const ref = useCallback((node: T | null) => {
    if (observerRef.current) {
      observerRef.current.disconnect();
      observerRef.current = null;
    }

    if (node) {
      observerRef.current = new ResizeObserver(([obsEntry]) => {
        if (obsEntry) {
          setEntry({
            width: obsEntry.contentRect.width,
            height: obsEntry.contentRect.height,
          });
        }
      });
      observerRef.current.observe(node);
    }

    elementRef.current = node;
  }, []);

  useEffect(() => {
    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, []);

  return [ref, entry];
}
