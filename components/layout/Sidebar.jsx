// components/layout/Sidebar.jsx
// Zweck: Linke Spalte – Marke, Neuer-Chat-Button, Chat-Suche, Archivliste.
// Props: chats, activeChatId, onSelectChat, onNewChat, onRename, onToggleShare, onDelete, userEmail

import { useEffect, useState } from "react";
import C from "../../styles/tokens";
import ChatListItem from "../chats/ChatListItem";
import ChatSearchModal from "../chats/ChatSearchModal";

const SIDEBAR_W = 320;
export const sidebarWidth = SIDEBAR_W;

export default function Sidebar({
  chats = [],
  activeChatId,
  onSelectChat,
  onNewChat,
  onRename,
  onToggleShare,
  onDelete,
  userEmail,
}) {
  const [searchOpen, setSearchOpen] = useState(false);

  // ⌘K / Ctrl+K zum Öffnen, Esc zum Schließen
  useEffect(() => {
    const onDown = (e) => {
      const k = e.key.toLowerCase();
      if ((e.metaKey || e.ctrlKey) && k === "k") {
        e.preventDefault();
        setSearchOpen((v) => !v);
      }
      if (k === "escape") setSearchOpen(false);
    };
    window.addEventListener("keydown", onDown);
    return () => window.removeEventListener("keydown", onDown);
  }, []);

  return (
    <>
      <aside
        style={{
          width: SIDEBAR_W,
          background: C.panel,
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          padding: "22px 14px",
          borderRight: `1px solid ${C.border}`,
          position: "fixed",
          left: 0,
          top: 0,
          zIndex: 3,
          overflow: "hidden", // nur die Liste scrollt
        }}
      >
        {/* Brand */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: "6px 10px",
            marginBottom: 8,
            fontWeight: 700,
            fontSize: 14,
            color: C.text,
          }}
        >
          <span
            style={{
              width: 8,
              height: 8,
              borderRadius: 4,
              background: C.accent,
              display: "inline-block",
            }}
          />
          <span>Jiperia</span>
          <span style={{ color: C.muted, fontWeight: 600, marginLeft: 6 }}>
            MVP
          </span>
        </div>

        {/* Neuer Chat */}
        <button
          onClick={onNewChat}
          style={{
            background: C.panelHover,
            color: C.text,
            border: `1px solid ${C.border}`,
            padding: "12px 14px",
            borderRadius: 14,
            fontWeight: 600,
            fontSize: 14,
            textAlign: "left",
            cursor: "pointer",
          }}
        >
          Neuer Chat
        </button>

        {/* Chats suchen */}
        <button
          onClick={() => setSearchOpen(true)}
          title="Chats suchen (⌘K)"
          style={{
            marginTop: 8,
            display: "flex",
            alignItems: "center",
            gap: 8,
            width: "100%",
            background: "transparent",
            color: C.text,
            border: `1px solid ${C.border}`,
            padding: "12px 14px",
            borderRadius: 14,
            fontWeight: 600,
            fontSize: 14,
            textAlign: "left",
            cursor: "pointer",
          }}
        >
          <svg
            style={{ width: 16, height: 16, opacity: 0.9 }}
            viewBox="0 0 24 24"
            fill="none"
          >
            <path
              d="M21 21l-4.3-4.3M10.5 18a7.5 7.5 0 1 1 0-15 7.5 7.5 0 0 1 0 15z"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
          <span>Chats suchen</span>
          <span style={{ marginLeft: "auto", opacity: 0.6, fontSize: 12 }}>
            ⌘K
          </span>
        </button>

        {/* Abstand: ~40% der Höhe bis zur Liste */}
        <div style={{ height: "40vh" }} />

        {/* Section label */}
        <div
          style={{
            marginTop: 16,
            color: C.muted,
            fontWeight: 600,
            fontSize: 12,
            letterSpacing: ".06em",
            textTransform: "uppercase",
          }}
        >
          Chats
        </div>

        {/* Scroll-Liste */}
        <div
          style={{
            flex: 1,
            minHeight: 0,
            marginTop: 8,
            paddingRight: 4,
            display: "flex",
            flexDirection: "column",
            gap: 8,
            overflowY: "auto", // nur hier scrollen
          }}
        >
          {chats.map((chat) => (
            <ChatListItem
              key={chat.id}
              chat={chat}
              active={chat.id === activeChatId}
              onSelect={onSelectChat}
              onRename={onRename}
              onToggleShare={onToggleShare}
              onDelete={onDelete}
            />
          ))}
        </div>

        {/* Footer */}
        <div
          style={{
            borderTop: `1px solid ${C.border}`,
            paddingTop: 10,
            marginTop: 10,
            fontSize: 12,
            color: C.muted,
          }}
        >
          Eingeloggt als
          <br />
          <span style={{ fontWeight: 600, color: C.sub }}>
            {userEmail || "—"}
          </span>
        </div>
      </aside>

      {/* Modal (fixed, unabhängig vom Sidebar-Layout) */}
      <ChatSearchModal
        open={searchOpen}
        onClose={() => setSearchOpen(false)}
        chats={chats}
        onSelect={(id) => {
          setSearchOpen(false);
          onSelectChat?.(id) ??
            window.dispatchEvent(new CustomEvent("open-chat", { detail: { id } }));
        }}
      />
    </>
  );
}
