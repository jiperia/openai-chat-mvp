// components/chats/ChatSearchModal.jsx
import { useEffect, useRef } from "react";
import { useChatSearch } from "../../hooks/useChatSearch";
import C from "../../styles/tokens";

// --- Helpers ---
function formatWhen(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  const now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  if (sameDay) return "Heute";
  const diff = (now - d) / 86400000;
  if (diff < 2) return "Gestern";
  return d.toLocaleDateString();
}

function escapeReg(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); }

// schneidet einen 120 Zeichen-Snippet um das erste Vorkommen
function makeSnippet(text, query) {
  if (!text) return "";
  const terms = (query||"").trim().toLowerCase().split(/\s+/).filter(Boolean);
  const hay = text.toLowerCase();
  let i = -1;
  for (const t of terms) { const pos = hay.indexOf(t); if (pos !== -1) { i = pos; break; } }
  if (i === -1) i = 0;
  const start = Math.max(0, i - 40);
  const end = Math.min(text.length, i + 80);
  const prefix = start > 0 ? "…" : "";
  const suffix = end < text.length ? "…" : "";
  return prefix + text.slice(start, end) + suffix;
}

// ersetzt Treffer durch <mark>
function highlight(text, query) {
  if (!text || !query) return text;
  const terms = query.trim().split(/\s+/).filter(Boolean).map(escapeReg);
  if (!terms.length) return text;
  const re = new RegExp(`(${terms.join("|")})`, "gi");
  const parts = text.split(re);
  return parts.map((p, i) =>
    re.test(p) ? (
      <mark key={i} style={{ background: "#3a4e2d", color: "#d9ffd0", padding: "0 2px", borderRadius: 3 }}>
        {p}
      </mark>
    ) : (
      <span key={i}>{p}</span>
    )
  );
}

export default function ChatSearchModal({ open, onClose, chats = [], onSelect }) {
  const inputRef = useRef(null);
  const { query, setQuery, results } = useChatSearch(chats);

  useEffect(() => { if (open) setTimeout(() => inputRef.current?.focus(), 0); }, [open]);
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === "Escape" && onClose?.();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 9999 }} role="dialog" aria-modal>
      <div onClick={onClose} style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,.45)" }} />
      <div
        style={{
          position: "absolute",
          left: "50%", top: 80, transform: "translateX(-50%)",
          width: "min(760px, calc(100vw - 24px))",
          background: C.panel, color: C.text,
          border: `1px solid ${C.border}`, borderRadius: 16,
          boxShadow: "0 10px 40px rgba(0,0,0,.4)", overflow: "hidden"
        }}
      >
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 14px", borderBottom: `1px solid ${C.border}` }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" style={{ opacity: .85 }}>
            <path d="M21 21l-4.3-4.3M10.5 18a7.5 7.5 0 1 1 0-15 7.5 7.5 0 0 1 0 15z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
          <input
            ref={inputRef} value={query} onChange={(e) => setQuery(e.target.value)}
            placeholder="Chats suchen…" style={{ flex: 1, background: "transparent", border: 0, outline: "none", color: C.text, fontSize: 14 }}
          />
          <span style={{ fontSize: 12, background: C.panelHover, border: `1px solid ${C.border}`, borderRadius: 8, padding: "4px 8px", color: C.muted }}>
            Esc
          </span>
        </div>

        {/* Ergebnisse */}
        <ul style={{ maxHeight: 420, overflowY: "auto", margin: 0, padding: 6, listStyle: "none" }}>
          {results.length === 0 && (
            <li style={{ padding: "16px 12px", fontSize: 14, color: C.muted }}>Keine Ergebnisse</li>
          )}

          {results.map((r) => {
            const snippetSource = (r.searchText || `${r.title || ""} ${(r.messages||[]).slice(-8).map(m=>m?.text||"").join(" ")}`).trim();
            const snippet = makeSnippet(snippetSource, query);
            return (
              <li key={r.id}>
                <button
                  onClick={() => onSelect?.(r.id)}
                  style={{
                    display: "block", width: "100%", textAlign: "left",
                    padding: "12px 14px", background: "transparent", border: 0,
                    color: C.text, borderRadius: 12, cursor: "pointer"
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = C.panelHover)}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    {/* Icon */}
                    <div style={{
                      width: 26, height: 26, borderRadius: 13, border: `1px solid ${C.border}`,
                      display: "grid", placeItems: "center", opacity: .8
                    }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                        <path d="M8 9h8M8 13h5m7 4V8a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v9l3-2h12z"
                          stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </div>

                    {/* Titel + Last update */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", gap: 12, alignItems: "baseline" }}>
                        <div style={{ fontSize: 14, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                          {highlight(r.title || "Neuer Chat", query)}
                        </div>
                        <div style={{ marginLeft: "auto", fontSize: 12, color: C.muted }}>
                          {formatWhen(r.lastUpdatedAt || r.updated_at || r.created_at)}
                        </div>
                      </div>
                      <div style={{ fontSize: 12, opacity: .8, marginTop: 4, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {highlight(snippet, query)}
                      </div>
                    </div>
                  </div>
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
