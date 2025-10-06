// components/layout/Sidebar.jsx
// Zweck: Linke Spalte – Marke, Neuer-Chat-Button, Archivliste.
// Props: chats, activeChatId, onSelectChat, onNewChat, onRename, onToggleShare, onDelete

import C from '../../styles/tokens';
import ChatListItem from '../chats/ChatListItem';

import { useEffect, useState } from "react";
import ChatSearchModal from "../chats/ChatSearchModal";
import useChats from "../../hooks/useChats"; // dein bestehender Hook


const SIDEBAR_W = 320;
export const sidebarWidth = SIDEBAR_W;

export default function Sidebar({
  chats, activeChatId, onSelectChat, onNewChat,
  onRename, onToggleShare, onDelete, userEmail
}) {
  return (
    <aside style={{
      width: SIDEBAR_W,
      background: C.panel,
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      padding: '22px 14px',
      borderRight: `1px solid ${C.border}`,
      position: 'fixed',
      left: 0, top: 0,
      zIndex: 3,
      overflow: 'hidden'            // <— wichtig: nur die Liste scrollt
    }}>
      {/* Brand */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '6px 10px', marginBottom: 8, fontWeight: 700, fontSize: 14, color: C.text
      }}>
        <span style={{ width: 8, height: 8, borderRadius: 4, background: C.accent, display: 'inline-block' }} />
        <span>Jiperia</span><span style={{ color: C.muted, fontWeight: 600, marginLeft: 6 }}>MVP</span>
      </div>

      {/* New chat */}
      <button
        style={{
          background: C.panelHover, color: C.text, border: `1px solid ${C.border}`,
          padding: '12px 14px', borderRadius: 14, fontWeight: 600, fontSize: 14,
          textAlign: 'left', cursor: 'pointer'
        }}
        onClick={onNewChat}
      >
        + Neuer Chat
      </button>
export default function Sidebar(props) {
  const [searchOpen, setSearchOpen] = useState(false);

  // Hole Chats + eine Methode zum Öffnen/Selektieren
  const chatsState = useChats(); // Struktur bei dir vorhanden
  const chats = chatsState?.chats || [];
  // Robust öffnen – wir probieren gängige Methoden und haben einen Fallback:
  const openChat = (id) => {
    if (typeof chatsState?.openChat === "function") return chatsState.openChat(id);
    if (typeof chatsState?.selectChatById === "function") return chatsState.selectChatById(id);
    if (typeof chatsState?.setActiveChatId === "function") return chatsState.setActiveChatId(id);
    // Fallback: gebe Event ab, falls du global lauschst
    window.dispatchEvent(new CustomEvent("open-chat", { detail: { id } }));
  };

  // Tastenkürzel ⌘K / Ctrl+K + ESC
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
    <aside className="w-64 bg-neutral-950 text-neutral-200 p-2 space-y-1">
      {/* dein bestehender Neuer-Chat-Button */}
      <button className="w-full px-3 py-2 rounded-lg bg-neutral-800 hover:bg-neutral-700">
        Neuer Chat
      </button>

      {/* NEU: Chats suchen */}
      <button
        onClick={() => setSearchOpen(true)}
        className="w-full flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-neutral-800"
        title="Chats suchen"
      >
        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none">
          <path d="M21 21l-4.3-4.3M10.5 18a7.5 7.5 0 1 1 0-15 7.5 7.5 0 0 1 0 15z" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
        </svg>
        <span>Chats suchen</span>
        <span className="ml-auto text-xs opacity-60">⌘K</span>
      </button>

      {/* …restliche Sidebar… */}

      {/* Modal einhängen */}
      <ChatSearchModal
        open={searchOpen}
        onClose={() => setSearchOpen(false)}
        chats={chats}
        onSelect={(id) => {
          setSearchOpen(false);
          openChat(id);
        }}
      />
    </aside>
  );
}


{/* Spacer: Abstand zwischen Button und Chatliste */}
<div style={{ flexGrow: 1, height: '40vh' }} />


      
      {/* Section label */}
      <div style={{ marginTop: 16, color: C.muted, fontWeight: 600, fontSize: 12, letterSpacing: '.06em', textTransform: 'uppercase' }}>
        Chats
      </div>

      {/* Scroll-Liste */}
      <div style={{
        flex: 1, minHeight: 0, marginTop: 8, paddingRight: 4,
        display: 'flex', flexDirection: 'column', gap: 8,
        overflowY: 'auto'           // <— nur hier scrollen
      }}>
        {chats.map(chat => (
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

      {/* Footer immer sichtbar */}
      <div style={{
        borderTop: `1px solid ${C.border}`,
        paddingTop: 10, marginTop: 10,
        fontSize: 12, color: C.muted
      }}>
        Eingeloggt als<br />
        <span style={{ fontWeight: 600, color: C.sub }}>{userEmail || '—'}</span>
      </div>
    </aside>
  );
}

