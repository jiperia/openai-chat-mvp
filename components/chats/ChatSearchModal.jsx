import { useEffect, useRef } from "react";
import { useChatSearch } from "../../hooks/useChatSearch"; // <- passt zu deiner Struktur

export default function ChatSearchModal({
  open,
  onClose,
  chats,
  onSelect,
}) {
  const inputRef = useRef(null);
  const { query, setQuery, results } = useChatSearch(chats || []);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 0);
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100]">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="absolute left-1/2 top-20 -translate-x-1/2 w-full max-w-xl rounded-2xl bg-neutral-900 shadow-xl border border-neutral-800">
        {/* Kopf mit Suche */}
        <div className="flex items-center gap-2 px-4 py-3 border-b border-neutral-800">
          <svg className="h-5 w-5 opacity-70" viewBox="0 0 24 24" fill="none">
            <path d="M21 21l-4.3-4.3M10.5 18a7.5 7.5 0 1 1 0-15 7.5 7.5 0 0 1 0 15z" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          </svg>
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Chats suchen…"
            className="w-full bg-transparent outline-none text-sm placeholder-neutral-400"
          />
          <kbd className="text-xs bg-neutral-800 px-2 py-1 rounded">Esc</kbd>
        </div>

        {/* Ergebnisse */}
        <ul className="max-h-80 overflow-auto py-1">
          {results.map((r) => (
            <li key={r.id}>
              <button
                onClick={() => onSelect?.(r.id)}
                className="w-full text-left px-4 py-2 hover:bg-neutral-800 focus:bg-neutral-800"
              >
                <div className="text-sm">{r.title}</div>
                {r.date && (
                  <div className="text-xs opacity-60">
                    {new Date(r.date).toLocaleString()}
                  </div>
                )}
              </button>
            </li>
          ))}
          {results.length === 0 && (
            <li className="px-4 py-6 text-sm opacity-70">Keine Ergebnisse</li>
          )}
        </ul>
      </div>
    </div>
  );
}
