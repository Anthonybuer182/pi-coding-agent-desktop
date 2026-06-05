import { useEffect, useCallback } from 'react';

type KeyCombo = {
  key: string;
  ctrl?: boolean;
  meta?: boolean;
  shift?: boolean;
  alt?: boolean;
};

export function useKeyboardShortcut(
  combo: KeyCombo,
  handler: () => void,
  enabled = true,
) {
  const cb = useCallback(
    (e: KeyboardEvent) => {
      if (!enabled) return;
      if (
        e.key.toLowerCase() === combo.key.toLowerCase() &&
        (combo.ctrl ?? false) === (e.ctrlKey || e.metaKey) &&
        (combo.meta ?? false) === e.metaKey &&
        (combo.shift ?? false) === e.shiftKey &&
        (combo.alt ?? false) === e.altKey
      ) {
        e.preventDefault();
        handler();
      }
    },
    [combo, handler, enabled],
  );

  useEffect(() => {
    document.addEventListener('keydown', cb);
    return () => document.removeEventListener('keydown', cb);
  }, [cb]);
}
