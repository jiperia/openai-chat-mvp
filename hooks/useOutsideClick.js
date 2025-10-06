// hooks/useOutsideClick.js
// Zweck: Klicks außerhalb eines Elements abfangen (z.B. für Popover).
// Nutzung: const ref = useOutsideClick(() => setOpen(false), open)

import { useEffect, useRef } from 'react';

export default function useOutsideClick(onOutside, enabled = true) {
  const ref = useRef(null);
  useEffect(() => {
    if (!enabled) return;
    function onDocClick(e) {
      if (!ref.current) return;
      if (!ref.current.contains(e.target)) onOutside?.(e);
    }
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, [enabled, onOutside]);
  return ref;
}
