// components/chats/ChatSearchModal.jsx
// Kleines Command-Palette-Modal mit Live-Suche (ohne Tailwind, nur Inline-Styles)

import { useEffect, useRef } from "react";
import { useChatSearch } from "../../hooks/useChatSearch";
import C from "../../styles/tokens";

export default function ChatSearchModal({ open, onClose, chats = [], onSelect }) {
  const inputRef = useRef(null);
  const { query, setQuery, results } = useChatSearch(chats);

  // Auto-Focus beim Öffnen + ESC schließt
  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 0);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === "Escape") onClose?.();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
      }}
      aria-modal
      role="dialog"
    >
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: "absolute",
          inset: 0,
          background: "rgba(0,0,0,0.45)",
        }}
      />

      {/* Panel */}
      <div
        style={{
          position: "absolute",
          left: "50%",
          top: 80,
          transform: "translateX(-50%)",
          width: "min(720px, calc(100vw - 24px))",
          background: C.panel,
          color: C.text,
          border: `1px solid ${C.border}`,
          borderRadius: 16,
          boxShadow: "0 10px 40px rgba(0,0,0,0.4)",
          overflow: "hidden",
        }}
      >
        {/* Kopf */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: "12px 14px",
            borderBottom: `1px solid ${C.border}`,
          }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" style={{ opacity: 0.85 }}>
            <path
              d="M21 21l-4.3-4.3M10.5 18a7.5 7.5 0 1 1 0-15 7.5 7.5 0 0 1 0 15z"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Chats suchen…"
            style={{
              flex: 1,
              background: "transparent",
              border: 0,
              outline: "none",
              color: C.text,
              fontSize: 14,
            }}
          />
          <span
            style={{
              fontSize: 12,
              background: C.panelHover,
              border: `1px solid ${C.border}`,
              borderRadius: 8,
              padding: "4px 8px",
              color: C.muted,
            }}
          >
            Esc
          </span>
        </div>

        {/* Ergebnisse */}
        <ul
          style={{
            maxHeight: 360,
            overflowY: "auto",
            margin: 0,
            padding: 6,
            listStyle: "none",
          }}
        >
          {results.length === 0 && (
            <li
              style={{
                padding: "16px 12px",
                fontSize: 14,
                color: C.muted,
              }}
            >
              Keine Ergebnisse
            </li>
          )}

          {results.map((r) => (
            <li key={r.id}>
              <button
                onClick={() => onSelect?.(r.id)}
                style={{
                  display: "block",
                  width: "100%",
                  textAlign: "left",
                  padding: "10px 10px",
                  background: "transparent",
                  border: 0,
                  color: C.text,
                  borderRadius: 10,
                  cursor: "pointer",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = C.panelHover)}
                onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
              >
                <div style={{ fontSize: 14, fontWeight: 600 }}>{r.title}</div>
                {r.date && (
                  <div style={{ fontSize: 12, opacity: 0.65 }}>
                    {new Date(r.date).toLocaleString()}
                  </div>
                )}
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
